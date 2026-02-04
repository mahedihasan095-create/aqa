
import React, { useState, useEffect, useRef } from 'react';
import { Student, Result, TeacherSubView, SubjectMarks, Notice } from '../types';
import * as XLSX from 'https://esm.sh/xlsx';

interface TeacherPanelProps {
  students: Student[];
  results: Result[];
  subjects: Record<string, string[]>;
  notices: Notice[];
  onSetSubjectsForClass: (className: string, classSubjects: string[]) => Promise<boolean>;
  onAddStudent: (s: Student) => Promise<boolean>;
  onAddStudents?: (list: Student[]) => Promise<boolean>;
  onUpdateStudent: (s: Student) => Promise<boolean>;
  onDeleteStudent: (id: string) => Promise<boolean>;
  onSaveResult: (r: Result) => Promise<boolean>;
  onSaveResults: (results: Result[]) => Promise<boolean>;
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
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const downloadSampleTemplate = () => {
    const sample = [
      { 'নাম': 'আব্দুল্লাহ', 'রোল': '১০১', 'পিতার নাম': 'আলী হোসেন', 'মাতার নাম': 'ফাতেমা', 'শ্রেণী': 'প্রথম', 'সাল': '২০২৬', 'গ্রাম': 'পাহাড়তলী', 'মোবাইল': '01700000000' },
      { 'নাম': 'মারিয়া', 'রোল': '১০২', 'পিতার নাম': 'ইব্রাহিম', 'মাতার নাম': 'আয়েশা', 'শ্রেণী': 'প্রথম', 'সাল': '২০২৬', 'গ্রাম': 'চকবাজার', 'মোবাইল': '01800000000' }
    ];
    downloadExcel(sample, 'Admission_Sample_Template');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) throw new Error("ফাইলটি খালি!");

        const importedStudents: Student[] = data.map((row, index) => ({
          id: (Date.now() + index).toString(),
          name: row['নাম'] || row['Name'] || '',
          roll: (row['রোল'] || row['Roll'] || '').toString(),
          fatherName: row['পিতার নাম'] || row['Father Name'] || '',
          motherName: row['মাতার নাম'] || row['Mother Name'] || '',
          studentClass: row['শ্রেণী'] || row['Class'] || 'প্রথম',
          year: (row['সাল'] || row['Year'] || '২০২৬').toString(),
          village: row['গ্রাম'] || row['Village'] || '',
          mobile: (row['মোবাইল'] || row['Mobile'] || '').toString()
        })).filter(s => s.name && s.roll);

        if (importedStudents.length > 0 && onAddStudents) {
          const ok = await onAddStudents(importedStudents);
          if (ok) alert(`${importedStudents.length} জন শিক্ষার্থীর তথ্য ইনপোর্ট হয়েছে।`);
          else alert('ইনপোর্ট ব্যর্থ হয়েছে।');
        }
      } catch (err) {
        alert('ফাইল প্রসেস করতে ত্রুটি হয়েছে।');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const exportStudentList = () => {
    const data = filteredStudentList.map(s => ({
      'রোল': s.roll, 'নাম': s.name, 'পিতার নাম': s.fatherName, 'মাতার নাম': s.motherName, 'গ্রাম': s.village, 'মোবাইল': s.mobile, 'শ্রেণী': s.studentClass, 'সাল': s.year
    }));
    downloadExcel(data, `Student_List_${filter.class}_${filter.year}`);
  };

  const exportResultList = () => {
    const data = filteredManaged.map(r => {
      const s = students.find(st => st.id === r.studentId);
      const row: any = { 'রোল': s?.roll || '', 'নাম': s?.name || '', 'মোট নম্বর': r.totalMarks, 'গ্রেড': r.grade };
      r.marks.forEach(m => { row[m.subjectName] = m.marks; });
      return row;
    });
    downloadExcel(data, `Results_${manageFilter.class}_${manageFilter.exam}`);
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
    if (ok) alert('সব সেভ হয়েছে।');
    setIsSaving(false);
  };

  const handlePublishToggle = async (result: Result) => {
    const updatedResult = { ...result, isPublished: !result.isPublished };
    await onSaveResult(updatedResult);
  };

  const handleBulkPublish = async (publish: boolean) => {
    const filtered = filteredManaged;
    if (filtered.length === 0) return;
    setIsSaving(true);
    const updatedResults = filtered.map(res => ({ ...res, isPublished: publish }));
    await onSaveResults(updatedResults);
    setIsSaving(false);
  };

  const handleAddNotice = async () => {
    if (!newNotice.trim()) return;
    setIsSaving(true);
    const updated = [
      { id: Date.now().toString(), text: newNotice, date: new Date().toLocaleDateString('bn-BD') },
      ...notices
    ];
    if (await onUpdateNotices(updated)) {
      alert('নোটিশ পাবলিশ হয়েছে।');
      setNewNotice('');
    }
    setIsSaving(false);
  };

  const handleDeleteNotice = async (id: string) => {
    if (window.confirm('মুছে ফেলতে চান?')) {
      setIsSaving(true);
      const updated = notices.filter(n => n.id !== id);
      await onUpdateNotices(updated);
      setIsSaving(false);
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
    if (passwordForm.current !== currentPassword) return alert('ভুল পাসওয়ার্ড!');
    if (passwordForm.new !== passwordForm.confirm) return alert('মিলছে না!');
    onUpdatePassword(passwordForm.new);
    alert('পাসওয়ার্ড আপডেট হয়েছে।');
  };

  const handleResetSystem = async () => {
    if (window.confirm('সব ডাটা মুছে যাবে। নিশ্চিত?')) {
      const input = window.prompt('RESET লিখুন:');
      if (input === 'RESET' && await onClearAllData!()) alert('রিসেট হয়েছে।');
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

      {/* Enroll View */}
      {activeSubView === 'ENROLL' && (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
          {/* Compact Excel Actions */}
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center gap-3">
              <i className="fas fa-file-excel text-green-600 text-xl"></i>
              <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300">এক্সেল থেকে বাল্ক ইনপোর্ট</span>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadSampleTemplate} className="text-[11px] font-bold text-indigo-600 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50">নমুনা ফাইল</button>
              <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-bold text-white bg-indigo-600 px-4 py-1.5 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                {isImporting ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-upload"></i>}
                ফাইল আপলোড
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-400 mb-6 flex items-center gap-2">
              <i className="fas fa-user-plus text-indigo-600"></i> নতুন ভর্তি ফরম
            </h2>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              const s: Student = { ...formData, id: Date.now().toString() };
              if(await onAddStudent(s)) {
                alert('ভর্তি সম্পন্ন হয়েছে!');
                setFormData({ ...formData, name: '', roll: '', mobile: '', fatherName: '', motherName: '', village: '' });
              }
              setIsSaving(false);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold mb-1 block uppercase text-gray-400">শিক্ষার্থীর নাম</label>
                  <input required placeholder="নাম" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block uppercase text-gray-400">রোল</label>
                  <input required type="number" placeholder="রোল" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={formData.roll} onChange={e => setFormData({...formData, roll: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block uppercase text-gray-400">পিতার নাম</label>
                  <input required placeholder="পিতা" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block uppercase text-gray-400">মাতার নাম</label>
                  <input required placeholder="মাতা" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block uppercase text-gray-400">শ্রেণী</label>
                  <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.studentClass} onChange={e => setFormData({...formData, studentClass: e.target.value})}>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block uppercase text-gray-400">শিক্ষাবর্ষ</label>
                  <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block uppercase text-gray-400">গ্রাম</label>
                  <input required placeholder="গ্রাম" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.village} onChange={e => setFormData({...formData, village: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block uppercase text-gray-400">মোবাইল</label>
                  <input required type="tel" placeholder="০১৭.." className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                {isSaving ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-check"></i>}
                ভর্তি নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESULT_ENTRY View */}
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
              <label className="text-xs font-bold block mb-1 uppercase text-gray-400">সাল</label>
              <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>
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
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {entryClassSubjects.map(sub => (
                <span key={sub} className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-800 flex items-center gap-2">
                  {sub} <i onClick={() => removeSubject(sub)} className="fas fa-times-circle cursor-pointer hover:text-red-500"></i>
                </span>
              ))}
            </div>
            {studentsToEnter.length > 0 && (
              <button 
                onClick={handleSaveAllResults} 
                disabled={isSaving || entryClassSubjects.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-save"></i>}
                সব সেভ করুন
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs font-bold text-gray-400 uppercase border-b dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4">রোল</th>
                  <th className="px-6 py-4">নাম</th>
                  {entryClassSubjects.map(s => <th key={s} className="px-4 py-4 text-center">{s}</th>) }
                  <th className="px-6 py-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {studentsToEnter.length > 0 ? studentsToEnter.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-bold">{student.roll}</td>
                    <td className="px-6 py-4">{student.name}</td>
                    {entryClassSubjects.map(sub => (
                      <td key={sub} className="px-4 py-4 text-center">
                        <input type="number" className="w-16 p-1.5 border dark:bg-gray-700 dark:border-gray-600 text-center rounded-lg" value={tempMarks[student.id]?.[sub] || ''} onChange={e => setTempMarks({...tempMarks, [student.id]: {...(tempMarks[student.id] || {}), [sub]: parseInt(e.target.value) || 0 }})} />
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleSaveResult(student)} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-md transition-all">
                        সেভ
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={entryClassSubjects.length + 3} className="px-6 py-10 text-center text-gray-400">শিক্ষার্থী পাওয়া যায়নি।</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANAGE_RESULTS View */}
      {activeSubView === 'MANAGE_RESULTS' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">শ্রেণী</label>
              <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={manageFilter.class} onChange={e => setManageFilter({...manageFilter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">সাল</label>
              <select className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={manageFilter.year} onChange={e => setManageFilter({...manageFilter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
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

          <div className="flex justify-between items-center px-2">
            <button onClick={exportResultList} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all">এক্সেল ডাউনলোড</button>
            <div className="flex gap-2">
              <button onClick={() => handleBulkPublish(false)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold border border-red-100">সব বন্ধ</button>
              <button onClick={() => handleBulkPublish(true)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">সব পাবলিশ</button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 font-bold text-xs uppercase">
                <tr><th className="px-6 py-4">রোল</th><th className="px-6 py-4">নাম</th><th className="px-6 py-4 text-center">মোট</th><th className="px-6 py-4 text-center">গ্রেড</th><th className="px-6 py-4 text-center">স্ট্যাটাস</th><th className="px-6 py-4 text-center">অ্যাকশন</th></tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredManaged.map(r => {
                  const s = students.find(st => st.id === r.studentId);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-bold">{s?.roll}</td>
                      <td className="px-6 py-4">{s?.name}</td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600">{r.totalMarks}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-600">{r.grade}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handlePublishToggle(r)} className={`text-[10px] font-bold px-3 py-1 rounded-full ${r.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.isPublished ? 'পাবলিশড' : 'বন্ধ'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={async () => { if(window.confirm('নিশ্চিত?')) await onDeleteResult(r.id); }} className="text-red-500"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NOTICES View */}
      {activeSubView === 'NOTICES' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border dark:border-gray-700">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><i className="fas fa-bullhorn"></i> নোটিশ পাবলিশ</h2>
             <textarea rows={4} placeholder="নোটিশ লিখুন..." className="w-full p-4 border rounded-2xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500 mb-4" value={newNotice} onChange={(e) => setNewNotice(e.target.value)}></textarea>
             <button onClick={handleAddNotice} disabled={isSaving || !newNotice.trim()} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg">পাবলিশ করুন</button>
          </div>
          <div className="space-y-3">
             {notices.map(n => (
               <div key={n.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md mb-2 inline-block">{n.date}</span>
                    <p className="text-sm">{n.text}</p>
                  </div>
                  <button onClick={() => handleDeleteNotice(n.id)} className="text-red-400 hover:text-red-600"><i className="fas fa-trash"></i></button>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* STUDENT_LIST View */}
      {activeSubView === 'STUDENT_LIST' && (
        <div className="space-y-4">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">শ্রেণী</label>
              <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={filter.class} onChange={e => setFilter({...filter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">সাল</label>
              <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">খুঁজুন</label>
              <input placeholder="নাম বা রোল" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={listSearch} onChange={e => setListSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end"><button onClick={exportStudentList} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">এক্সেল ডাউনলোড</button></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-x-auto">
             <table className="w-full text-left min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs font-bold">
                  <tr><th className="px-6 py-4">রোল</th><th className="px-6 py-4">নাম</th><th className="px-6 py-4">পিতা</th><th className="px-6 py-4">মোবাইল</th><th className="px-6 py-4 text-center">অ্যাকশন</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredStudentList.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-indigo-600">{s.roll}</td>
                      <td className="px-6 py-4 font-bold">{s.name}</td>
                      <td className="px-6 py-4">{s.fatherName}</td>
                      <td className="px-6 py-4">{s.mobile}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => setEditingStudent(s)} className="text-indigo-600 mr-4"><i className="fas fa-edit"></i></button>
                        <button onClick={async () => { if(window.confirm('নিশ্চিত?')) await onDeleteStudent(s.id); }} className="text-red-500"><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {/* SETTINGS View */}
      {activeSubView === 'SETTINGS' && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><i className="fas fa-key text-indigo-600"></i> পাসওয়ার্ড পরিবর্তন</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <input type="password" required placeholder="বর্তমান পাসওয়ার্ড" className="w-full p-3 border rounded-xl dark:bg-gray-700" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} />
              <input type="password" required placeholder="নতুন পাসওয়ার্ড" className="w-full p-3 border rounded-xl dark:bg-gray-700" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} />
              <input type="password" required placeholder="কনফার্ম করুন" className="w-full p-3 border rounded-xl dark:bg-gray-700" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">আপডেট করুন</button>
            </form>
          </div>
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
            <h3 className="text-red-700 font-bold mb-3">বিপজ্জনক জোন</h3>
            <button onClick={handleResetSystem} className="bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-bold">সিস্টেম রিসেট</button>
          </div>
        </div>
      )}

      {/* Modals for editing remain same... */}
      {editingStudent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">শিক্ষার্থীর তথ্য এডিট</h2>
              <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-red-500"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleUpdateStudentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <input className="w-full p-3 border rounded-xl dark:bg-gray-700" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} />
                 <input className="w-full p-3 border rounded-xl dark:bg-gray-700" value={editingStudent.roll} onChange={e => setEditingStudent({...editingStudent, roll: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">সংরক্ষণ করুন</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPanel;
