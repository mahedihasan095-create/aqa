
import React, { useState, useEffect, useRef } from 'react';
import { Student, Result, TeacherSubView, SubjectMarks, Notice } from '../types';

interface TeacherPanelProps {
  students: Student[];
  results: Result[];
  subjects: Record<string, string[]>;
  notices: Notice[];
  onSetSubjectsForClass: (className: string, classSubjects: string[]) => Promise<boolean>;
  onAddStudent: (s: Student) => Promise<boolean>;
  onAddStudents: (sList: Student[]) => Promise<boolean>;
  onUpdateStudent: (s: Student) => Promise<boolean>;
  onDeleteStudent: (id: string) => Promise<boolean>;
  onSaveResult: (r: Result) => Promise<boolean>;
  onSaveResults: (results: Result[]) => Promise<boolean>; // Bulk save support
  onDeleteResult: (id: string) => Promise<boolean>;
  onUpdateNotices: (n: Notice[]) => Promise<boolean>;
  onClearAllData?: () => Promise<boolean>;
  currentPassword: string;
  onUpdatePassword: (newPass: string) => void;
}

const CLASSES = ['প্লে', 'নার্সারী', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম'];
const YEARS = ['২০২৬', '২০২৭', '২০২৮', '২০২৯', '২০৩০'];
const EXAMS = ['প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'বার্ষিক পরীক্ষা'];

const TeacherPanel: React.FC<TeacherPanelProps> = ({ 
  students, results, subjects, notices, onSetSubjectsForClass, onAddStudent, onAddStudents,
  onUpdateStudent, onDeleteStudent, onSaveResult, onSaveResults, onDeleteResult, 
  onUpdateNotices, onClearAllData, currentPassword, onUpdatePassword 
}) => {
  const [activeSubView, setActiveSubView] = useState<TeacherSubView>('RESULT_ENTRY');
  const [isSaving, setIsSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  
  const [filter, setFilter] = useState({ class: 'প্রথম', year: '২০২৬', exam: 'বার্ষিক পরীক্ষা' });
  const [manageFilter, setManageFilter] = useState({ class: 'প্রথম', year: '২০২৬', exam: 'বার্ষিক পরীক্ষা', search: '' });
  const [listSearch, setListSearch] = useState('');
  
  const [formData, setFormData] = useState({ 
    name: '', fatherName: '', motherName: '', village: '', mobile: '', studentClass: 'প্রথম', year: '২০২৬', roll: '' 
  });

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [tempMarks, setTempMarks] = useState<Record<string, Record<string, number>>>({});
  const [newSubject, setNewSubject] = useState('');
  const [newNotice, setNewNotice] = useState('');
  const [editingResult, setEditingResult] = useState<Result | null>(null);
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const entryClassSubjects = subjects[filter.class] || [];

  useEffect(() => {
    const newTemp: Record<string, Record<string, number>> = {};
    const filteredStudents = students.filter(s => s.studentClass === filter.class && s.year === filter.year);
    
    filteredStudents.forEach(s => {
      const savedRes = results.find(r => 
        r.studentId === s.id && 
        r.examName === filter.exam && 
        r.class === filter.class && 
        r.year === filter.year
      );
      if (savedRes) {
        const sm: Record<string, number> = {};
        savedRes.marks.forEach(m => sm[m.subjectName] = m.marks);
        newTemp[s.id] = sm;
      } else {
        newTemp[s.id] = {};
      }
    });
    setTempMarks(newTemp);
  }, [filter, results, students]);

  const downloadExcel = (data: any[], fileName: string) => {
    if (data.length === 0) return alert('ডাউনলোড করার জন্য কোনো ডাটা নেই!');
    const headers = Object.keys(data[0]);
    const tsvContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(header => (row[header] || '').toString()).join('\t'))
    ].join('\r\n');
    const buffer = new ArrayBuffer(tsvContent.length * 2);
    const view = new Uint16Array(buffer);
    for (let i = 0; i < tsvContent.length; i++) {
      view[i] = tsvContent.charCodeAt(i);
    }
    const bom = new Uint8Array([0xFF, 0xFE]);
    const blob = new Blob([bom, buffer], { type: 'application/vnd.ms-excel;charset=utf-16le' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${fileName}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportStudentList = () => {
    const data = filteredStudentList.map(s => ({
      'রোল': s.roll,
      'নাম': s.name,
      'পিতার নাম': s.fatherName,
      'মাতার নাম': s.motherName,
      'গ্রাম': s.village,
      'মোবাইল': s.mobile,
      'শ্রেণী': s.studentClass,
      'সাল': s.year
    }));
    downloadExcel(data, `Student_List_${filter.class}_${filter.year}`);
  };

  const downloadImportTemplate = () => {
    const template = [{
      'নাম': 'আরিফ হোসেন',
      'পিতার নাম': 'কামাল হোসেন',
      'মাতার নাম': 'ফাতেমা বেগম',
      'শ্রেণী': 'প্রথম',
      'রোল নম্বর': '101',
      'শিক্ষাবর্ষ': '2026',
      'গ্রাম': 'নূরনগর',
      'মোবাইল নম্বর': '01700000000'
    }];
    downloadExcel(template, 'Student_Import_Template');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const decoder = new TextDecoder('utf-16le');
        let content = decoder.decode(new Uint16Array(arrayBuffer));
        
        if (content.length < 10) {
          content = new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer));
        }

        const rows = content.split(/\r?\n/).filter(row => row.trim() !== '');
        if (rows.length < 2) return alert('ফাইলটি খালি অথবা ভুল ফরম্যাটে আছে!');

        const headers = rows[0].split('\t').map(h => h.trim().replace(/^"|"$/g, ''));
        const newStudents: Student[] = [];

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < headers.length) continue;

          const studentData: any = {};
          headers.forEach((h, idx) => {
            if (h === 'নাম') studentData.name = cols[idx];
            if (h === 'পিতার নাম') studentData.fatherName = cols[idx];
            if (h === 'মাতার নাম') studentData.motherName = cols[idx];
            if (h === 'শ্রেণী') studentData.studentClass = cols[idx];
            if (h === 'রোল নম্বর') studentData.roll = cols[idx];
            if (h === 'শিক্ষাবর্ষ') studentData.year = cols[idx];
            if (h === 'গ্রাম') studentData.village = cols[idx];
            if (h === 'মোবাইল নম্বর') studentData.mobile = cols[idx];
          });

          if (studentData.name && studentData.roll) {
            newStudents.push({
              ...studentData,
              id: `std_${Date.now()}_${i}`,
              studentClass: studentData.studentClass || 'প্রথম',
              year: studentData.year || '২০২৬'
            });
          }
        }

        if (newStudents.length > 0) {
          if (window.confirm(`মোট ${newStudents.length} জন শিক্ষার্থীর তথ্য পাওয়া গেছে। ইম্পোর্ট করতে চান?`)) {
            setIsSaving(true);
            const ok = await onAddStudents(newStudents);
            if (ok) alert('সাফল্যের সাথে ইম্পোর্ট করা হয়েছে!');
            setIsSaving(false);
            setShowImport(false);
          }
        } else {
          alert('কোন বৈধ শিক্ষার্থীর তথ্য পাওয়া যায়নি। অনুগ্রহ করে টেমপ্লেটটি অনুসরণ করুন।');
        }
      } catch (err) {
        console.error(err);
        alert('ফাইলটি প্রসেস করতে সমস্যা হয়েছে।');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportResultList = () => {
    const data = filteredManaged.map(r => {
      const s = students.find(st => st.id === r.studentId);
      const row: any = {
        'রোল': s?.roll || '',
        'নাম': s?.name || '',
        'মোট নম্বর': r.totalMarks,
        'গ্রেড': r.grade,
        'স্ট্যাটাস': r.isPublished ? 'পাবলিশড' : 'বন্ধ'
      };
      r.marks.forEach(m => {
        row[m.subjectName] = m.marks;
      });
      return row;
    });
    downloadExcel(data, `Result_Sheet_${manageFilter.class}_${manageFilter.exam}_${manageFilter.year}`);
  };

  const addSubject = async () => {
    const trimmed = newSubject.trim();
    if (trimmed && !entryClassSubjects.includes(trimmed)) {
      setIsSaving(true);
      const updated = [...entryClassSubjects, trimmed];
      await onSetSubjectsForClass(filter.class, updated);
      setNewSubject('');
      setIsSaving(false);
    }
  };

  const removeSubject = async (sub: string) => {
    if (window.confirm(`${sub} মুছে ফেলতে চান?`)) {
      const updated = entryClassSubjects.filter(s => s !== sub);
      await onSetSubjectsForClass(filter.class, updated);
    }
  };

  const calculateGrade = (total: number, count: number) => {
    if (count === 0) return '-';
    const avg = total / count;
    if (avg >= 80) return 'A+';
    if (avg >= 70) return 'A';
    if (avg >= 60) return 'A-';
    if (avg >= 50) return 'B';
    if (avg >= 40) return 'C';
    if (avg >= 33) return 'D';
    return 'F';
  };

  const studentsToEnter = students
    .filter(s => s.studentClass === filter.class && s.year === filter.year)
    .sort((a,b) => parseInt(a.roll) - parseInt(b.roll));

  const prepareResultPayload = (student: Student) => {
    const marksForStudent = tempMarks[student.id] || {};
    const subjectMarks: SubjectMarks[] = entryClassSubjects.map(name => ({ 
      subjectName: name, 
      marks: marksForStudent[name] || 0 
    }));
    
    const total = subjectMarks.reduce((acc, curr) => acc + curr.marks, 0);
    const existing = results.find(r => r.studentId === student.id && r.examName === filter.exam && r.class === filter.class && r.year === filter.year);
    const resultId = existing?.id || `res_${student.id}_${filter.class}_${filter.exam.replace(/\s+/g, '_')}_${filter.year}`;

    return {
      id: resultId,
      studentId: student.id,
      examName: filter.exam,
      class: filter.class,
      year: filter.year,
      marks: subjectMarks,
      totalMarks: total,
      grade: calculateGrade(total, entryClassSubjects.length),
      isPublished: existing?.isPublished ?? false
    };
  };

  const handleSaveResult = async (student: Student) => {
    if (entryClassSubjects.length === 0) return alert('প্রথমে বিষয় যোগ করুন!');
    setIsSaving(true);
    const payload = prepareResultPayload(student);
    const ok = await onSaveResult(payload);
    if (ok) alert(`${student.name}-এর ফলাফল সংরক্ষিত হয়েছে।`);
    setIsSaving(false);
  };

  const handleSaveAllResults = async () => {
    if (studentsToEnter.length === 0) return;
    if (entryClassSubjects.length === 0) return alert('প্রথমে বিষয় যোগ করুন!');

    setIsSaving(true);
    const payloads = studentsToEnter.map(student => prepareResultPayload(student));
    const ok = await onSaveResults(payloads);
    if (ok) alert('সকল শিক্ষার্থীর ফলাফল সফলভাবে সেভ করা হয়েছে।');
    setIsSaving(false);
  };

  const handlePublishToggle = async (result: Result) => {
    setPublishingId(result.id);
    const updatedResult = { ...result, isPublished: !result.isPublished };
    await onSaveResult(updatedResult);
    setPublishingId(null);
  };

  const handleBulkPublish = async (publish: boolean) => {
    const filtered = filteredManaged;
    if (filtered.length === 0) return;

    const actionText = publish ? 'পাবলিশ' : 'আনপাবলিশ';
    if (!window.confirm(`আপনি কি এই তালিকার সকল (${filtered.length}) রেজাল্ট একসাথে ${actionText} করতে চান?`)) return;

    setIsSaving(true);
    const updatedResults = filtered.map(res => ({ ...res, isPublished: publish }));
    const ok = await onSaveResults(updatedResults);
    if (ok) alert(`সকল ফলাফল সফলভাবে ${actionText} করা হয়েছে।`);
    setIsSaving(false);
  };

  const handleAddNotice = async () => {
    if (!newNotice.trim()) return;
    setIsSaving(true);
    const updated = [
      { id: Date.now().toString(), text: newNotice, date: new Date().toLocaleDateString('bn-BD') },
      ...notices
    ];
    await onUpdateNotices(updated);
    setNewNotice('');
    setIsSaving(false);
  };

  const handleDeleteNotice = async (id: string) => {
    if (window.confirm('নোটিশটি মুছে ফেলতে চান?')) {
      const updated = notices.filter(n => n.id !== id);
      await onUpdateNotices(updated);
    }
  };

  const handleUpdateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSaving(true);
    if (await onUpdateStudent(editingStudent)) {
      alert('তথ্য আপডেট হয়েছে।');
      setEditingStudent(null);
    }
    setIsSaving(false);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.current !== currentPassword) return alert('বর্তমান পাসওয়ার্ড ভুল!');
    if (passwordForm.new.length < 4) return alert('নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
    if (passwordForm.new !== passwordForm.confirm) return alert('কনফার্ম পাসওয়ার্ড মিলছে না!');
    
    if (window.confirm('পাসওয়ার্ড পরিবর্তন করতে চান?')) {
      onUpdatePassword(passwordForm.new);
      alert('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।');
    }
  };

  const handleResetSystem = async () => {
    if (!onClearAllData) return;
    if (window.confirm('নিশ্চিতভাবে সকল ডাটা মুছতে চান? "RESET" লিখে কনফার্ম করুন।')) {
      const input = window.prompt('RESET লিখুন:');
      if (input === 'RESET' && await onClearAllData()) alert('সিস্টেম রিসেট হয়েছে।');
    }
  };

  const filteredManaged = results.filter(r => {
    const s = students.find(st => st.id === r.studentId);
    if (!s) return false;
    const matchesFilter = r.class === manageFilter.class && r.year === manageFilter.year && r.examName === manageFilter.exam;
    const matchesSearch = s.name.toLowerCase().includes(manageFilter.search.toLowerCase()) || s.roll.includes(manageFilter.search);
    return matchesFilter && matchesSearch;
  }).sort((a,b) => parseInt(students.find(s=>s.id===a.studentId)?.roll||'0') - parseInt(students.find(s=>s.id===b.studentId)?.roll||'0'));

  const filteredStudentList = students.filter(s => {
    const matchesClass = s.studentClass === filter.class;
    const matchesYear = s.year === filter.year;
    const matchesSearch = s.name.toLowerCase().includes(listSearch.toLowerCase()) || s.roll.includes(listSearch);
    return matchesClass && matchesYear && matchesSearch;
  }).sort((a,b) => parseInt(a.roll) - parseInt(b.roll));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Sub Menu */}
      <div className="flex flex-wrap gap-2 border-b dark:border-gray-700 pb-2 no-print overflow-x-auto scrollbar-hide">
        {[
          { id: 'RESULT_ENTRY', label: 'ফলাফল এন্ট্রি', icon: 'fa-edit' },
          { id: 'MANAGE_RESULTS', label: 'পাবলিশ ও এডিট', icon: 'fa-bullhorn' },
          { id: 'ENROLL', label: 'নতুন ভর্তি', icon: 'fa-user-plus' },
          { id: 'STUDENT_LIST', label: 'শিক্ষার্থী তালিকা', icon: 'fa-list-ul' },
          { id: 'NOTICES', label: 'নোটিশ বোর্ড', icon: 'fa-bell' },
          { id: 'SETTINGS', label: 'সেটিংস', icon: 'fa-cog' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveSubView(tab.id as TeacherSubView)} 
            className={`px-5 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${activeSubView === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {activeSubView === 'ENROLL' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-xl max-w-5xl mx-auto border dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 dark:bg-indigo-900/30 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <i className="fas fa-user-plus text-xl text-indigo-700 dark:text-indigo-400"></i>
                </div>
                <div>
                  <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-400">শিক্ষার্থী ভর্তি ফরম</h2>
                  <p className="text-xs text-gray-500">নিচে তথ্য দিন অথবা এক্সেল ফাইল ইম্পোর্ট করুন</p>
                </div>
              </div>
              <div className="flex gap-2">
                 <button 
                  onClick={() => setShowImport(!showImport)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2"
                >
                  <i className={`fas ${showImport ? 'fa-keyboard' : 'fa-file-excel'}`}></i>
                  {showImport ? 'ম্যানুয়াল এন্ট্রি' : 'এক্সেল ইম্পোর্ট'}
                </button>
              </div>
            </div>

            {showImport ? (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 text-center space-y-4">
                <i className="fas fa-cloud-upload-alt text-5xl text-indigo-400 mb-2"></i>
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">এক্সেল ফাইল ইম্পোর্ট করুন</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">প্রথমে নিচের বাটন থেকে টেমপ্লেটটি ডাউনলোড করে নিন।</p>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  <button onClick={downloadImportTemplate} className="bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2"><i className="fas fa-download"></i> টেমপ্লেট ডাউনলোড</button>
                  <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black shadow-lg cursor-pointer transition-all flex items-center gap-2">
                    <i className="fas fa-file-upload"></i> ফাইল সিলেক্ট করুন
                    <input type="file" ref={fileInputRef} accept=".xls,.csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSaving(true);
                const s: Student = { ...formData, id: Date.now().toString() };
                if(await onAddStudent(s)) {
                  alert('শিক্ষার্থী সফলভাবে ভর্তি করা হয়েছে!');
                  setFormData({ ...formData, name: '', roll: '', mobile: '', fatherName: '', motherName: '', village: '' });
                }
                setIsSaving(false);
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  <div className="lg:col-span-2">
                    <label className="text-[11px] font-bold mb-1 block uppercase text-gray-400">শিক্ষার্থীর নাম</label>
                    <input required placeholder="পুরো নাম লিখুন" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold mb-1 block uppercase text-gray-400">পিতার নাম</label>
                    <input required placeholder="পিতার নাম" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold mb-1 block uppercase text-gray-400">মাতার নাম</label>
                    <input required placeholder="মাতার নাম" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold mb-1 block uppercase text-gray-400">শ্রেণী</label>
                    <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={formData.studentClass} onChange={e => setFormData({...formData, studentClass: e.target.value})}>
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold mb-1 block uppercase text-gray-400 font-sans">রোল নম্বর (ENG)</label>
                    <input required type="text" placeholder="রোল নম্বর ইংরেজিতে" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-sans" value={formData.roll} onChange={e => setFormData({...formData, roll: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold mb-1 block uppercase text-gray-400 font-sans">শিক্ষাবর্ষ (সাল)</label>
                    <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none font-sans" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold mb-1 block uppercase text-gray-400">গ্রাম</label>
                    <input required placeholder="গ্রামের নাম" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.village} onChange={e => setFormData({...formData, village: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold mb-1 block uppercase text-gray-400 font-sans">মোবাইল নম্বর (ENG)</label>
                    <input required type="tel" placeholder="017XXXXXXXX" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-sans" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-2xl shadow-xl transform active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    {isSaving ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-check-circle"></i>}
                    ভর্তি নিশ্চিত করুন
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Other Views Remain Similar but with font-sans on roll numbers */}
      {activeSubView === 'RESULT_ENTRY' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-fade-in">
            <div>
              <label className="text-xs font-bold block mb-1 uppercase text-gray-400">শ্রেণী নির্বাচন</label>
              <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={filter.class} onChange={e => setFilter({...filter, class: e.target.value})}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 uppercase text-gray-400 font-sans">সাল</label>
              <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-sans" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 uppercase text-gray-400">পরীক্ষা</label>
              <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={filter.exam} onChange={e => setFilter({...filter, exam: e.target.value})}>
                {EXAMS.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 uppercase text-gray-400">নতুন বিষয় ({filter.class})</label>
              <div className="flex gap-2">
                <input placeholder="নাম" className="flex-1 p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyPress={e => e.key === 'Enter' && addSubject()} />
                <button onClick={addSubject} className="bg-indigo-600 text-white px-4 rounded-lg shadow-md transition-all"><i className="fas fa-plus"></i></button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4 font-sans">
            <div className="flex flex-wrap gap-2">
              {entryClassSubjects.map(sub => (
                <span key={sub} className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-800 flex items-center gap-2 font-hind">
                  {sub} <i onClick={() => removeSubject(sub)} className="fas fa-times-circle cursor-pointer hover:text-red-500"></i>
                </span>
              ))}
            </div>
            {studentsToEnter.length > 0 && (
              <button onClick={handleSaveAllResults} disabled={isSaving || entryClassSubjects.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-save"></i>}
                সব সেভ করুন
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-left min-w-[600px] font-sans">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs font-bold text-gray-400 uppercase border-b dark:border-gray-600">
                <tr><th className="px-6 py-4">রোল</th><th className="px-6 py-4 font-hind">নাম</th>{entryClassSubjects.map(s => <th key={s} className="px-4 py-4 text-center font-hind">{s}</th>) }<th className="px-6 py-4 text-center">অ্যাকশন</th></tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {studentsToEnter.length > 0 ? studentsToEnter.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-bold">{student.roll}</td>
                    <td className="px-6 py-4 font-hind">{student.name}</td>
                    {entryClassSubjects.map(sub => (
                      <td key={sub} className="px-4 py-4 text-center">
                        <input type="number" className="w-16 p-1.5 border dark:bg-gray-700 dark:border-gray-600 text-center rounded-lg" value={tempMarks[student.id]?.[sub] || ''} onChange={e => setTempMarks({...tempMarks, [student.id]: {...(tempMarks[student.id] || {}), [sub]: parseInt(e.target.value) || 0 }})} />
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center font-hind">
                      <button onClick={() => handleSaveResult(student)} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-md transition-all">সেভ</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={entryClassSubjects.length + 3} className="px-6 py-10 text-center text-gray-400 font-hind">শিক্ষার্থী পাওয়া যায়নি।</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Managed Result View */}
      {activeSubView === 'MANAGE_RESULTS' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">শ্রেণী</label>
              <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={manageFilter.class} onChange={e => setManageFilter({...manageFilter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400 font-sans">সাল</label>
              <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-sans" value={manageFilter.year} onChange={e => setManageFilter({...manageFilter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">পরীক্ষা</label>
              <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={manageFilter.exam} onChange={e => setManageFilter({...manageFilter, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">নাম বা রোল</label>
              <input placeholder="খুঁজুন..." className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none" value={manageFilter.search} onChange={e => setManageFilter({...manageFilter, search: e.target.value})} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-hidden font-sans">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 font-bold text-xs uppercase border-b dark:border-gray-600">
                <tr><th className="px-6 py-4">রোল</th><th className="px-6 py-4 font-hind">নাম</th><th className="px-6 py-4 text-center">মোট</th><th className="px-6 py-4 text-center">গ্রেড</th><th className="px-6 py-4 text-center font-hind">পাবলিশ</th><th className="px-6 py-4 text-center font-hind">অ্যাকশন</th></tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredManaged.length > 0 ? filteredManaged.map(r => {
                  const s = students.find(st => st.id === r.studentId);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-bold">{s?.roll}</td>
                      <td className="px-6 py-4 font-hind">{s?.name}</td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600">{r.totalMarks}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-600">{r.grade}</td>
                      <td className="px-6 py-4 text-center font-hind">
                        <button onClick={() => handlePublishToggle(r)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${r.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {r.isPublished ? 'পাবলিশড' : 'বন্ধ'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center font-hind">
                         <div className="flex justify-center gap-3">
                          <button onClick={() => setEditingResult(r)} className="text-indigo-500 hover:text-indigo-700 transition-colors"><i className="fas fa-edit"></i></button>
                          <button onClick={() => onDeleteResult(r.id)} className="text-red-500 hover:text-red-700 transition-colors"><i className="fas fa-trash-alt"></i></button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENT_LIST View */}
      {activeSubView === 'STUDENT_LIST' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div><label className="text-xs font-bold mb-1 block uppercase text-gray-400">শ্রেণী</label><select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={filter.class} onChange={e => setFilter({...filter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-xs font-bold mb-1 block uppercase text-gray-400 font-sans">সাল</label><select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-sans" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-bold mb-1 block uppercase text-gray-400">নাম বা রোল</label><input placeholder="খুঁজুন..." className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={listSearch} onChange={e => setListSearch(e.target.value)} /></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-x-auto">
             <table className="w-full text-left min-w-[800px] font-sans">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase font-bold text-gray-500 border-b dark:border-gray-600">
                  <tr><th className="px-6 py-4">রোল</th><th className="px-6 py-4 font-hind">নাম</th><th className="px-6 py-4 font-hind">পিতা</th><th className="px-6 py-4 font-hind">গ্রাম</th><th className="px-6 py-4 font-hind text-center">অ্যাকশন</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredStudentList.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">{s.roll}</td>
                      <td className="px-6 py-4 font-bold font-hind">{s.name}</td>
                      <td className="px-6 py-4 font-hind">{s.fatherName}</td>
                      <td className="px-6 py-4 font-hind">{s.village}</td>
                      <td className="px-6 py-4 text-center font-hind">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => setEditingStudent(s)} className="text-indigo-600 p-2"><i className="fas fa-edit"></i></button>
                          <button onClick={() => onDeleteStudent(s.id)} className="text-red-600 p-2"><i className="fas fa-trash-alt"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Editing Modal with font-sans */}
      {editingStudent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl p-8 animate-fade-in shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">শিক্ষার্থীর তথ্য পরিবর্তন</h2>
            <form onSubmit={handleUpdateStudentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="text-xs font-bold uppercase text-gray-400">নাম</label><input required className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} /></div>
                <div><label className="text-xs font-bold uppercase text-gray-400 font-sans">রোল নম্বর (ENG)</label><input required className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-sans" value={editingStudent.roll} onChange={e => setEditingStudent({...editingStudent, roll: e.target.value})} /></div>
                <div><label className="text-xs font-bold uppercase text-gray-400 font-sans">মোবাইল (ENG)</label><input required className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 font-sans" value={editingStudent.mobile} onChange={e => setEditingStudent({...editingStudent, mobile: e.target.value})} /></div>
              </div>
              <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold">বাতিল</button>
                <button type="submit" disabled={isSaving} className="flex-2 bg-indigo-600 text-white font-bold py-3 px-8 rounded-2xl shadow-xl">আপডেট করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPanel;
