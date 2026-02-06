
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Student, Result, TeacherSubView, SubjectMarks, Notice } from '../types';
import * as XLSX from 'https://esm.sh/xlsx';

interface TeacherPanelProps {
  students: Student[];
  results: Result[];
  subjects: Record<string, string[]>;
  notices: Notice[];
  principalSignature?: string;
  onSetSubjectsForClass: (className: string, classSubjects: string[]) => Promise<boolean>;
  onAddStudent: (s: Student) => Promise<boolean>;
  onAddStudents?: (list: Student[]) => Promise<boolean>;
  onUpdateStudent: (s: Student) => Promise<boolean>;
  onDeleteStudent: (id: string) => Promise<boolean>;
  onSaveResult: (r: Result) => Promise<boolean>;
  onSaveResults: (results: Result[]) => Promise<boolean>;
  onDeleteResult: (id: string) => Promise<boolean>;
  onUpdateNotices: (n: Notice[]) => Promise<boolean>;
  onUpdatePassword: (newPass: string) => void;
  onUpdatePrincipalSignature: (signatureBase64: string) => Promise<boolean>;
  currentPassword: string;
}

const CLASSES = ['প্লে', 'নার্সারী', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম'];
const YEARS = ['২০২৬', '২০২৭', '২০২৮', '২০২৯', '২০৩০'];
const EXAMS = ['প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'বার্ষিক পরীক্ষা'];

const TeacherPanel: React.FC<TeacherPanelProps> = ({ 
  students, results, subjects, notices, principalSignature, onSetSubjectsForClass, onAddStudent, onAddStudents,
  onUpdateStudent, onDeleteStudent, onSaveResult, onSaveResults, onDeleteResult, 
  onUpdateNotices, onUpdatePassword, onUpdatePrincipalSignature, currentPassword 
}) => {
  const [activeSubView, setActiveSubView] = useState<TeacherSubView>('STUDENT_LIST');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultExcelRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  
  const [newPass, setNewPass] = useState('');
  const [subjectClass, setSubjectClass] = useState('প্রথম');
  const [subjectInput, setSubjectInput] = useState('');
  const [noticeInput, setNoticeInput] = useState('');
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);

  const [filter, setFilter] = useState({ class: 'প্রথম', year: '২০২৬' });
  const [entryConfig, setEntryConfig] = useState({ class: 'প্রথম', year: '২০২৬', exam: 'প্রথম সাময়িক' });
  const [bulkMarks, setBulkMarks] = useState<Record<string, Record<string, string>>>({});

  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [formData, setFormData] = useState({ 
    name: '', fatherName: '', motherName: '', village: '', mobile: '', studentClass: 'প্রথম', year: '২০২৬', roll: '' 
  });

  useEffect(() => {
    const initialMarks: Record<string, Record<string, string>> = {};
    const relevantResults = results.filter(r => 
      r.class === entryConfig.class && 
      r.year === entryConfig.year && 
      r.examName === entryConfig.exam
    );

    relevantResults.forEach(res => {
      const studentMarks: Record<string, string> = {};
      res.marks.forEach(m => {
        studentMarks[m.subjectName] = m.marks.toString();
      });
      initialMarks[res.studentId] = studentMarks;
    });

    setBulkMarks(initialMarks);
  }, [entryConfig.class, entryConfig.year, entryConfig.exam, results, activeSubView]);

  const calculateGrade = (total: number, subjectCount: number) => {
    if (subjectCount === 0) return 'F';
    const average = total / subjectCount;
    if (average >= 80) return 'A+';
    if (average >= 70) return 'A';
    if (average >= 60) return 'A-';
    if (average >= 50) return 'B';
    if (average >= 40) return 'C';
    if (average >= 33) return 'D';
    return 'F';
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.roll) {
        alert('অনুগ্রহ করে নাম এবং রোল প্রদান করুন।');
        return;
    }
    setIsProcessing(true);
    const newStudent: Student = { ...formData, id: Date.now().toString() };
    const success = await onAddStudent(newStudent);
    if (success) {
      alert('শিক্ষার্থী সফলভাবে ভর্তি করা হয়েছে!');
      setFormData({ ...formData, name: '', roll: '', fatherName: '', motherName: '', mobile: '', village: '' });
      setActiveSubView('STUDENT_LIST');
    }
    setIsProcessing(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsProcessing(true);
    const success = await onUpdateStudent(editingStudent);
    if (success) {
      alert('তথ্য সফলভাবে আপডেট করা হয়েছে!');
      setEditingStudent(null);
    } else {
      alert('আপডেট করতে সমস্যা হয়েছে।');
    }
    setIsProcessing(false);
  };

  const handleDownloadSample = () => {
    const sampleData = [{ 'Name': 'আঃ রহমান', 'Roll': '1', 'Father Name': 'আব্দুল্লাহ', 'Mother Name': 'আয়েশা', 'Mobile': '01700', 'Village': 'মধুপুর', 'Class': 'প্রথম', 'Year': '২০২৬' }];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "Student_Enroll_Sample.xlsx");
  };

  const handleDownloadResultSample = () => {
    const classSubjects = subjects[entryConfig.class] || [];
    if (classSubjects.length === 0) {
      alert('এই ক্লাসের জন্য কোনো বিষয় সেট করা নেই। সেটিংস থেকে বিষয় সেট করুন।');
      return;
    }

    const filteredStudents = students.filter(s => s.studentClass === entryConfig.class && s.year === entryConfig.year).sort((a,b) => parseInt(a.roll) - parseInt(b.roll));
    
    const sampleData = filteredStudents.map(s => {
      const row: any = { 'রোল': s.roll, 'নাম': s.name };
      classSubjects.forEach(sub => {
        row[sub] = ''; // Empty for data entry
      });
      return row;
    });

    if (sampleData.length === 0) {
      // If no students, just headers
      const row: any = { 'রোল': '', 'নাম': '' };
      classSubjects.forEach(sub => row[sub] = '');
      sampleData.push(row);
    }

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Result_Entry");
    XLSX.writeFile(wb, `Result_Sample_${entryConfig.class}_${entryConfig.exam}.xlsx`);
  };

  const handleResultFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        
        const newBulkMarks = { ...bulkMarks };
        const classSubjects = subjects[entryConfig.class] || [];
        
        data.forEach(row => {
          const roll = (row['রোল'] || row['Roll'] || '').toString();
          const student = students.find(s => s.roll.toString() === roll && s.studentClass === entryConfig.class && s.year === entryConfig.year);
          
          if (student) {
            const studentMarks: Record<string, string> = newBulkMarks[student.id] || {};
            classSubjects.forEach(sub => {
              if (row[sub] !== undefined) {
                studentMarks[sub] = row[sub].toString();
              }
            });
            newBulkMarks[student.id] = studentMarks;
          }
        });

        setBulkMarks(newBulkMarks);
        alert('এক্সেল ফাইল থেকে নম্বরগুলো সফলভাবে ইমপোর্ট করা হয়েছে। এখন "সংরক্ষণ করুন" বাটনে ক্লিক করুন।');
      } catch (err) {
        alert('ফাইলটি প্রসেস করতে সমস্যা হয়েছে। সঠিক ফরম্যাটের ফাইল ব্যবহার করুন।');
      } finally {
        if (resultExcelRef.current) resultExcelRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsProcessing(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const newStudents: Student[] = data.map((item: any, index: number) => ({
          id: (Date.now() + index).toString(),
          name: item['Name'] || item['নাম'] || '',
          roll: (item['Roll'] || item['রোল'] || '').toString(),
          fatherName: item['Father Name'] || item['পিতার নাম'] || '',
          motherName: item['Mother Name'] || item['মাতার নাম'] || '',
          village: item['Village'] || item['গ্রাম'] || '',
          mobile: (item['Mobile'] || item['মোবাইল'] || '').toString(),
          studentClass: item['Class'] || item['শ্রেণী'] || formData.studentClass,
          year: (item['Year'] || item['সাল'] || formData.year).toString(),
        })).filter(s => s.name && s.roll);

        if (newStudents.length > 0) {
          const success = onAddStudents ? await onAddStudents(newStudents) : true;
          if (success) { alert(`${newStudents.length} জন ইমপোর্ট করা হয়েছে!`); setActiveSubView('STUDENT_LIST'); }
        }
      } catch (err) { alert('ভুল ফাইল ফরম্যাট!'); }
      finally { setIsProcessing(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      setIsProcessing(true);
      const success = await onUpdatePrincipalSignature(base64);
      if (success) alert('স্বাক্ষর আপডেট করা হয়েছে।');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadStudents = () => {
    const filtered = students.filter(s => s.studentClass === filter.class && s.year === filter.year).sort((a,b) => parseInt(a.roll) - parseInt(b.roll));
    const ws = XLSX.utils.json_to_sheet(filtered.map(s => ({ 'রোল': s.roll, 'নাম': s.name, 'পিতার নাম': s.fatherName, 'মাতার নাম': s.motherName, 'মোবাইল': s.mobile, 'শ্রেণী': s.studentClass, 'গ্রাম': s.village, 'সাল': s.year })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Student_List_${filter.class}.xlsx`);
  };

  const handleDownloadResults = () => {
    const filtered = results.filter(r => r.class === filter.class && r.year === filter.year);
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => {
      const s = students.find(st => st.id === r.studentId);
      const mObj: any = {}; r.marks.forEach(m => mObj[m.subjectName] = m.marks);
      return { 'রোল': s?.roll, 'নাম': s?.name, 'পরীক্ষা': r.examName, ...mObj, 'মোট': r.totalMarks, 'গ্রেড': r.grade, 'পাবলিশড': r.isPublished ? 'হ্যাঁ' : 'না' };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, `Results_${filter.class}.xlsx`);
  };

  const handleUpdatePassword = () => {
    if (newPass.length < 6) { alert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'); return; }
    onUpdatePassword(newPass);
  };

  const handleSaveSubjects = async () => {
    const existing = subjects[subjectClass] || [];
    const newOnes = subjectInput.split(',').map(s => s.trim()).filter(s => s !== '');
    if (newOnes.length === 0) return;
    
    // Merge without duplicates
    const merged = Array.from(new Set([...existing, ...newOnes]));
    
    setIsProcessing(true);
    const success = await onSetSubjectsForClass(subjectClass, merged);
    if (success) { alert('সংরক্ষণ করা হয়েছে।'); setSubjectInput(''); }
    setIsProcessing(false);
  };

  const handleDeleteSubject = async (className: string, subName: string) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে "${subName}" বিষয়টিকে মুছে ফেলতে চান?`)) return;
    
    const current = subjects[className] || [];
    const filtered = current.filter(s => s !== subName);
    
    setIsProcessing(true);
    const success = await onSetSubjectsForClass(className, filtered);
    if (success) alert('বিষয়টি মুছে ফেলা হয়েছে।');
    setIsProcessing(false);
  };

  const handleAddNotice = async () => {
    if (!noticeInput.trim()) return;
    setIsProcessing(true);
    
    let updatedNotices;
    if (editingNoticeId) {
      updatedNotices = notices.map(n => n.id === editingNoticeId ? { ...n, text: noticeInput } : n);
    } else {
      const newNotice = { id: Date.now().toString(), text: noticeInput, date: new Date().toLocaleDateString('bn-BD') };
      updatedNotices = [newNotice, ...notices];
    }
    
    const success = await onUpdateNotices(updatedNotices);
    if (success) { 
      alert(editingNoticeId ? 'নোটিশ আপডেট করা হয়েছে!' : 'নোটিশ প্রকাশিত হয়েছে!'); 
      setNoticeInput(''); 
      setEditingNoticeId(null);
    }
    setIsProcessing(false);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('আপনি কি এই নোটিশটি মুছে ফেলতে চান?')) return;
    setIsProcessing(true);
    const updatedNotices = notices.filter(n => n.id !== id);
    const success = await onUpdateNotices(updatedNotices);
    if (success) alert('নোটিশটি মুছে ফেলা হয়েছে।');
    setIsProcessing(false);
  };

  const handleEditNotice = (notice: Notice) => {
    setNoticeInput(notice.text);
    setEditingNoticeId(notice.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveBulkResults = async () => {
    const studentIds = Object.keys(bulkMarks);
    if (studentIds.length === 0) return;
    setIsProcessing(true);
    const classSubjects = subjects[entryConfig.class] || [];
    const resultsToSave: Result[] = studentIds.map(studentId => {
      const marksList = classSubjects.map(sub => ({ subjectName: sub, marks: parseInt(bulkMarks[studentId][sub] || '0') }));
      const total = marksList.reduce((acc, curr) => acc + curr.marks, 0);
      const existingRes = results.find(r => r.id === `${studentId}-${entryConfig.exam}-${entryConfig.year}`);
      
      return {
        id: `${studentId}-${entryConfig.exam}-${entryConfig.year}`,
        studentId, examName: entryConfig.exam, class: entryConfig.class, year: entryConfig.year,
        marks: marksList, totalMarks: total, grade: calculateGrade(total, classSubjects.length), 
        isPublished: existingRes ? existingRes.isPublished : false
      };
    });
    const success = await onSaveResults(resultsToSave);
    if (success) { alert('সংরক্ষিত হয়েছে!'); setActiveSubView('MANAGE_RESULTS'); }
    setIsProcessing(false);
  };

  const handleTogglePublish = async (res: Result) => {
    setIsProcessing(true);
    const updatedResult = { ...res, isPublished: !res.isPublished };
    const success = await onSaveResult(updatedResult);
    setIsProcessing(false);
  };

  const handlePublishAll = async () => {
    const filteredResults = results.filter(r => r.class === filter.class && r.year === filter.year && !r.isPublished);
    if (filteredResults.length === 0) {
      alert('পাবলিশ করার মতো কোনো নতুন রেজাল্ট পাওয়া যায়নি।');
      return;
    }
    if (!confirm(`${filter.class} শ্রেণীর (${filter.year}) সকল রেজাল্ট একসাথে পাবলিশ করতে চান?`)) return;

    setIsProcessing(true);
    const resultsToUpdate = filteredResults.map(r => ({ ...r, isPublished: true }));
    const success = await onSaveResults(resultsToUpdate);
    if (success) {
      alert('সকল রেজাল্ট সফলভাবে পাবলিশ করা হয়েছে!');
    }
    setIsProcessing(false);
  };

  const filteredStudentsForResults = useMemo(() => {
    return students.filter(s => s.studentClass === entryConfig.class && s.year === entryConfig.year).sort((a, b) => parseInt(a.roll) - parseInt(b.roll));
  }, [students, entryConfig.class, entryConfig.year]);

  // Keyboard navigation logic
  const handleKeyDown = (e: React.KeyboardEvent, studentIdx: number, subIdx: number) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.getElementById(`input-${studentIdx + 1}-${subIdx}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`input-${studentIdx - 1}-${subIdx}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 no-print bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border dark:border-gray-700">
        {[
          { id: 'STUDENT_LIST', label: 'ছাত্র তালিকা', icon: 'fa-users' },
          { id: 'ENROLL', label: 'নতুন ভর্তি', icon: 'fa-user-plus' },
          { id: 'RESULT_ENTRY', label: 'রেজাল্ট এন্ট্রি', icon: 'fa-file-signature' },
          { id: 'MANAGE_RESULTS', label: 'রেজাল্ট ম্যানেজ', icon: 'fa-tasks' },
          { id: 'NOTICES', label: 'নোটিশ', icon: 'fa-bullhorn' },
          { id: 'SETTINGS', label: 'সেটিংস', icon: 'fa-cog' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSubView(tab.id as TeacherSubView)} className={`flex-1 min-w-[100px] py-2.5 px-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 text-[12px] ${activeSubView === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <i className={`fas ${tab.icon} text-base`}></i> {tab.label}
          </button>
        ))}
      </div>

      {activeSubView === 'RESULT_ENTRY' && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <i className="fas fa-edit"></i> রেজাল্ট এন্ট্রি ও এডিট
              </h2>
              <div className="flex gap-2">
                <button onClick={handleDownloadResultSample} className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <i className="fas fa-file-download"></i> নমুনা ফাইল
                </button>
                <button onClick={() => resultExcelRef.current?.click()} className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-2 rounded-xl text-xs font-bold border border-green-200 dark:border-green-800 flex items-center gap-1">
                  <i className="fas fa-file-excel"></i> এক্সেল ইমপোর্ট
                </button>
                <input type="file" ref={resultExcelRef} className="hidden" accept=".xlsx, .xls" onChange={handleResultFileUpload} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
              <select className="p-2.5 rounded-xl border-none outline-none font-bold text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={entryConfig.class} onChange={e => setEntryConfig({...entryConfig, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select className="p-2.5 rounded-xl border-none outline-none font-bold text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={entryConfig.year} onChange={e => setEntryConfig({...entryConfig, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
              <select className="p-2.5 rounded-xl border-none outline-none font-bold text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value={entryConfig.exam} onChange={e => setEntryConfig({...entryConfig, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black uppercase text-gray-500 dark:text-gray-300">
                  <tr>
                    <th className="p-3 text-left border-b dark:border-gray-600">রোল ও নাম</th>
                    {(subjects[entryConfig.class] || []).map(sub => <th key={sub} className="p-3 text-center border-b dark:border-gray-600">{sub}</th>)}
                    <th className="p-3 text-center border-b dark:border-gray-600">মোট ও গ্রেড</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredStudentsForResults.map((student, studentIdx) => {
                    const currentMarks = bulkMarks[student.id] || {};
                    const classSubjects = subjects[entryConfig.class] || [];
                    const total = classSubjects.reduce((acc, sub) => acc + parseInt(currentMarks[sub] || '0'), 0);
                    const grade = calculateGrade(total, classSubjects.length);
                    return (
                      <tr key={student.id} className="text-gray-800 dark:text-gray-200">
                        <td className="p-3 min-w-[150px]"><div className="font-black text-indigo-600 dark:text-indigo-400 text-xs">#{student.roll}</div><div className="text-sm font-bold truncate">{student.name}</div></td>
                        {classSubjects.map((sub, subIdx) => (
                          <td key={sub} className="p-1.5 text-center">
                            <input 
                              id={`input-${studentIdx}-${subIdx}`}
                              type="number" 
                              className="w-16 p-2 text-center bg-gray-50 dark:bg-gray-900 text-indigo-700 dark:text-indigo-400 rounded-lg outline-none font-black text-sm border-2 border-gray-200 dark:border-gray-600 focus:border-indigo-500 shadow-inner no-spinner" 
                              value={currentMarks[sub] || ''} 
                              placeholder="0" 
                              onChange={e => setBulkMarks(prev => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), [sub]: e.target.value } }))} 
                              onKeyDown={e => handleKeyDown(e, studentIdx, subIdx)}
                            />
                          </td>
                        ))}
                        <td className="p-3 text-center min-w-[80px]"><div className="font-black text-sm text-gray-900 dark:text-gray-100">{total}</div><div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block ${grade === 'F' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{grade}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleSaveBulkResults} disabled={isProcessing} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>} সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubView === 'ENROLL' && (
        <div className="animate-fade-in max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-xl border dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b dark:border-gray-700 pb-4">
              <div>
                <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-300">নতুন শিক্ষার্থী ভর্তি</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">নির্ভুলভাবে তথ্য পূরণ করুন</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDownloadSample} className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800"><i className="fas fa-download mr-1"></i> নমুনা</button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-2 rounded-xl text-xs font-bold border border-green-200 dark:border-green-800"><i className="fas fa-file-excel mr-1"></i> ইমপোর্ট</button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              </div>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'শিক্ষার্থীর নাম', key: 'name', icon: 'fa-user' },
                  { label: 'পিতার নাম', key: 'fatherName', icon: 'fa-male' },
                  { label: 'মাতার নাম', key: 'motherName', icon: 'fa-female' },
                  { label: 'রোল নম্বর', key: 'roll', icon: 'fa-id-badge', type: 'number' },
                  { label: 'মোবাইল', key: 'mobile', icon: 'fa-phone' },
                ].map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">{field.label}</label>
                    <div className="relative">
                      <i className={`fas ${field.icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-500 text-xs`}></i>
                      <input 
                        type={field.type || 'text'}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none text-gray-900 dark:text-gray-100 font-bold text-sm" 
                        placeholder={field.label}
                        value={(formData as any)[field.key]} 
                        onChange={e => setFormData({...formData, [field.key]: e.target.value})} 
                        required={field.key === 'name' || field.key === 'roll'} 
                      />
                    </div>
                  </div>
                ))}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">শ্রেণী</label>
                  <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl text-gray-900 dark:text-gray-100 font-bold text-sm" value={formData.studentClass} onChange={e => setFormData({...formData, studentClass: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">শিক্ষাবর্ষ</label>
                  <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl text-gray-900 dark:text-gray-100 font-bold text-sm" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">ঠিকানা (গ্রাম)</label>
                  <input className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl text-gray-900 dark:text-gray-100 font-bold text-sm" placeholder="গ্রামের নাম" value={formData.village} onChange={e => setFormData({...formData, village: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-black shadow-xl">ভর্তি সম্পন্ন করুন</button>
            </form>
          </div>
        </div>
      )}

      {activeSubView === 'STUDENT_LIST' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border dark:border-gray-700 overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2">
              <select className="p-2 bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl border-none shadow-sm font-bold text-sm" value={filter.class} onChange={e => setFilter({...filter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select className="p-2 bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl border-none shadow-sm font-bold text-sm" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
              <button onClick={handleDownloadStudents} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800">ডাউনলোড</button>
            </div>
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">মোট: {students.filter(s => s.studentClass === filter.class && s.year === filter.year).length} জন</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black uppercase text-gray-500 dark:text-gray-300 tracking-wider">
                <tr>
                  <th className="px-4 py-3">রোল</th>
                  <th className="px-4 py-3">নাম</th>
                  <th className="px-4 py-3">পিতার নাম</th>
                  <th className="px-4 py-3">মাতার নাম</th>
                  <th className="px-4 py-3 text-center">শ্রেণী</th>
                  <th className="px-4 py-3">মোবাইল</th>
                  <th className="px-4 py-3">গ্রাম</th>
                  <th className="px-4 py-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                {students.filter(s => s.studentClass === filter.class && s.year === filter.year).sort((a,b) => parseInt(a.roll) - parseInt(b.roll)).map(s => (
                  <tr key={s.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10">
                    <td className="px-4 py-3 font-black text-indigo-600 dark:text-indigo-400 text-sm">{s.roll}</td>
                    <td className="px-4 py-3 font-bold text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-xs">{s.fatherName}</td>
                    <td className="px-4 py-3 text-xs">{s.motherName}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold">{s.studentClass}</td>
                    <td className="px-4 py-3 text-xs">{s.mobile || '-'}</td>
                    <td className="px-4 py-3 text-xs">{s.village || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => setEditingStudent(s)} className="text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform"><i className="fas fa-edit"></i></button>
                        <button onClick={() => { if(confirm(`${s.name} ডিলিট?`)) onDeleteStudent(s.id); }} className="text-red-500 dark:text-red-400 hover:scale-110 transition-transform"><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubView === 'MANAGE_RESULTS' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-300">রেজাল্ট ম্যানেজ ও পাবলিশ</h2>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handlePublishAll} 
                disabled={isProcessing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
              >
                {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-bullhorn"></i>} সব পাবলিশ করুন
              </button>
              <button onClick={handleDownloadResults} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
                <i className="fas fa-file-excel"></i> এক্সেল ডাউনলোড
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <select className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold text-sm" value={filter.class} onChange={e => setFilter({...filter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold text-sm" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black uppercase text-gray-500 dark:text-gray-300 tracking-wider">
                <tr>
                  <th className="p-3">ছাত্র</th>
                  <th className="p-3">পরীক্ষা</th>
                  <th className="p-3 text-center">মোট</th>
                  <th className="p-3 text-center">গ্রেড</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700 text-sm text-gray-800 dark:text-gray-200">
                {results.filter(r => r.class === filter.class && r.year === filter.year).map(res => {
                  const s = students.find(st => st.id === res.studentId);
                  return (
                    <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                      <td className="p-3 font-bold">{s?.name} <span className="text-indigo-600 dark:text-indigo-400 text-xs">#{s?.roll}</span></td>
                      <td className="p-3 text-xs">{res.examName}</td>
                      <td className="p-3 text-center font-black">{res.totalMarks}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${res.grade === 'F' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>{res.grade}</span></td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${res.isPublished ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                          {res.isPublished ? 'পাবলিশড' : 'ড্রাফট'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleTogglePublish(res)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${res.isPublished ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}><i className={`fas ${res.isPublished ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                          <button onClick={() => { if(confirm('ডিলিট?')) onDeleteResult(res.id); }} className="w-8 h-8 rounded-lg bg-red-50 text-red-500"><i className="fas fa-trash-alt"></i></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubView === 'SETTINGS' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-xl font-black mb-4 text-gray-900 dark:text-gray-100">পাসওয়ার্ড পরিবর্তন</h2>
            <div className="flex gap-2">
              <input type="password" placeholder="নতুন পাসওয়ার্ড" className="flex-grow p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none text-sm border border-transparent focus:border-indigo-500" value={newPass} onChange={e => setNewPass(e.target.value)} />
              <button onClick={handleUpdatePassword} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm">আপডেট</button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-xl font-black mb-4 text-gray-900 dark:text-gray-100">অধ্যক্ষর স্বাক্ষর</h2>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-48 h-24 bg-gray-50 dark:bg-gray-700 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                {principalSignature ? (
                  <img src={principalSignature} alt="Principal Signature" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-400 font-bold uppercase">স্বাক্ষর নেই</span>
                )}
              </div>
              <div className="flex-grow space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">মার্কশিটে প্রদর্শনের জন্য অধ্যক্ষের স্বাক্ষর আপলোড করুন (PNG/JPG)। ব্যাকগ্রাউন্ড ছাড়া স্বাক্ষর দিলে ভালো দেখাবে।</p>
                <button onClick={() => sigInputRef.current?.click()} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2">
                  <i className="fas fa-upload"></i> স্বাক্ষর আপলোড করুন
                </button>
                <input type="file" ref={sigInputRef} className="hidden" accept="image/*" onChange={handleSigUpload} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-xl font-black mb-4 text-gray-900 dark:text-gray-100">বিষয় ম্যানেজমেন্ট</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <select className="p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm" value={subjectClass} onChange={e => setSubjectClass(e.target.value)}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <input placeholder="নতুন বিষয়ের নাম (একাধিক হলে কমা দিন)" className="md:col-span-2 p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm border border-transparent focus:border-indigo-500" value={subjectInput} onChange={e => setSubjectInput(e.target.value)} />
              <button onClick={handleSaveSubjects} className="bg-green-600 text-white p-2.5 rounded-xl font-bold text-sm">যোগ করুন</button>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl">
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-3 tracking-widest">{subjectClass} শ্রেণীর বর্তমান বিষয়সমূহ:</p>
              <div className="flex flex-wrap gap-2">
                {(subjects[subjectClass] || []).length > 0 ? (subjects[subjectClass] || []).map(s => (
                  <div key={s} className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-full text-xs font-bold border dark:border-gray-600 flex items-center gap-2 group hover:border-indigo-500 transition-colors shadow-sm">
                    <span className="cursor-pointer hover:text-indigo-600" onClick={() => setSubjectInput(s)} title="এডিট করতে ক্লিক করুন">{s}</span>
                    <button onClick={() => handleDeleteSubject(subjectClass, s)} className="text-red-400 hover:text-red-600 transition-colors"><i className="fas fa-times-circle"></i></button>
                  </div>
                )) : (
                  <span className="text-xs text-gray-400 italic">কোন বিষয় যোগ করা হয়নি</span>
                )}
              </div>
              <p className="mt-3 text-[9px] text-gray-400 font-bold italic">* বিষয়ের নামে ক্লিক করলে ইনপুট বক্সে চলে আসবে।</p>
            </div>
          </div>
        </div>
      )}

      {activeSubView === 'NOTICES' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-xl font-black mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <i className="fas fa-bullhorn text-amber-500"></i> {editingNoticeId ? 'নোটিশ সংশোধন' : 'নতুন নোটিশ বোর্ড'}
            </h2>
            <textarea 
              placeholder="নোটিশের লেখাটি এখানে লিখুন..." 
              className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl outline-none mb-4 text-sm border-2 border-transparent focus:border-indigo-500 transition-all shadow-inner" 
              value={noticeInput} 
              onChange={e => setNoticeInput(e.target.value)} 
            />
            <div className="flex gap-2">
              <button 
                onClick={handleAddNotice} 
                disabled={isProcessing}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-paper-plane"></i>}
                {editingNoticeId ? 'আপডেট করুন' : 'পাবলিশ করুন'}
              </button>
              {editingNoticeId && (
                <button 
                  onClick={() => { setEditingNoticeId(null); setNoticeInput(''); }} 
                  className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-6 py-3 rounded-xl font-bold text-sm"
                >
                  বাতিল
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
            <h3 className="text-lg font-black mb-6 text-gray-900 dark:text-gray-100">প্রকাশিত নোটিশসমূহ ({notices.length})</h3>
            <div className="space-y-4">
              {notices.length > 0 ? notices.map(notice => (
                <div key={notice.id} className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border dark:border-gray-600 group transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{notice.date}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditNotice(notice)} 
                        className="text-indigo-600 dark:text-indigo-400 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title="এডিট"
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                      <button 
                        onClick={() => handleDeleteNotice(notice.id)} 
                        className="text-red-500 dark:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="ডিলিট"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{notice.text}</p>
                </div>
              )) : (
                <div className="text-center py-10 text-gray-400">
                  <i className="fas fa-inbox text-4xl mb-3 block opacity-20"></i>
                  <p className="text-sm font-bold">এখনো কোনো নোটিশ নেই</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <i className="fas fa-user-edit text-xl"></i>
                <h3 className="font-black text-lg">শিক্ষার্থীর তথ্য সংশোধন</h3>
              </div>
              <button onClick={() => setEditingStudent(null)} className="bg-white/20 hover:bg-white/30 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">শিক্ষার্থীর নাম</label>
                  <input className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">রোল নম্বর</label>
                  <input type="number" className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm" value={editingStudent.roll} onChange={e => setEditingStudent({...editingStudent, roll: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">পিতার নাম</label>
                  <input className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm" value={editingStudent.fatherName} onChange={e => setEditingStudent({...editingStudent, fatherName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">মাতার নাম</label>
                  <input className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm" value={editingStudent.motherName} onChange={e => setEditingStudent({...editingStudent, motherName: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">মোবাইল নম্বর</label>
                  <input className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm" value={editingStudent.mobile} onChange={e => setEditingStudent({...editingStudent, mobile: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">গ্রাম/ঠিকানা</label>
                  <input className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm" value={editingStudent.village} onChange={e => setEditingStudent({...editingStudent, village: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">শ্রেণী</label>
                  <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm" value={editingStudent.studentClass} onChange={e => setEditingStudent({...editingStudent, studentClass: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">শিক্ষাবর্ষ</label>
                  <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-sm" value={editingStudent.year} onChange={e => setEditingStudent({...editingStudent, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3.5 rounded-2xl font-bold">বাতিল</button>
                <button type="submit" disabled={isProcessing} className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2">
                  {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-check-circle"></i>} আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPanel;
