
import React, { useState, useRef, useMemo } from 'react';
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
  onUpdatePassword: (newPass: string) => void;
  currentPassword: string;
}

const CLASSES = ['প্লে', 'নার্সারী', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম'];
const YEARS = ['২০২৬', '২০২৭', '২০২৮', '২০২৯', '২০৩০'];
const EXAMS = ['প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'বার্ষিক পরীক্ষা'];

const TeacherPanel: React.FC<TeacherPanelProps> = ({ 
  students, results, subjects, notices, onSetSubjectsForClass, onAddStudent, onAddStudents,
  onUpdateStudent, onDeleteStudent, onSaveResult, onSaveResults, onDeleteResult, 
  onUpdateNotices, onUpdatePassword, currentPassword 
}) => {
  const [activeSubView, setActiveSubView] = useState<TeacherSubView>('STUDENT_LIST');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings/Notice States
  const [newPass, setNewPass] = useState('');
  const [subjectClass, setSubjectClass] = useState('প্রথম');
  const [subjectInput, setSubjectInput] = useState('');
  const [noticeInput, setNoticeInput] = useState('');

  // Filter and Entry States
  const [filter, setFilter] = useState({ class: 'প্রথম', year: '২০২৬' });
  const [entryConfig, setEntryConfig] = useState({ class: 'প্রথম', year: '২০২৬', exam: 'প্রথম সাময়িক' });
  const [bulkMarks, setBulkMarks] = useState<Record<string, Record<string, string>>>({});

  const [formData, setFormData] = useState({ 
    name: '', fatherName: '', motherName: '', village: '', mobile: '', studentClass: 'প্রথম', year: '২০২৬', roll: '' 
  });

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

  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Name': 'আব্দুর রহমান',
        'Roll': '1',
        'Father Name': 'আব্দুল্লাহ',
        'Mother Name': 'আয়েশা বেগম',
        'Mobile': '01700000000',
        'Village': 'মধুপুর',
        'Class': 'প্রথম',
        'Year': '২০২৬'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "Student_Enroll_Sample.xlsx");
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
          if (!onAddStudents) { for(const s of newStudents) await onAddStudent(s); }
          if (success) { alert(`${newStudents.length} জন শিক্ষার্থীর তথ্য ইমপোর্ট করা হয়েছে!`); setActiveSubView('STUDENT_LIST'); }
        }
      } catch (err) { alert('ফাইলটি সঠিক নয়। নমুনা কপি দেখুন।'); }
      finally { setIsProcessing(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsBinaryString(file);
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
    const subjectList = subjectInput.split(',').map(s => s.trim()).filter(s => s !== '');
    setIsProcessing(true);
    const success = await onSetSubjectsForClass(subjectClass, subjectList);
    if (success) { alert('বিষয়গুলো আপডেট করা হয়েছে।'); setSubjectInput(''); }
    setIsProcessing(false);
  };

  const handleAddNotice = async () => {
    if (!noticeInput.trim()) return;
    const newNotice = { id: Date.now().toString(), text: noticeInput, date: new Date().toLocaleDateString('bn-BD') };
    const success = await onUpdateNotices([newNotice, ...notices]);
    if (success) { alert('নোটিশ প্রকাশিত হয়েছে!'); setNoticeInput(''); }
  };

  const handleSaveBulkResults = async () => {
    const studentIds = Object.keys(bulkMarks);
    if (studentIds.length === 0) return;
    setIsProcessing(true);
    const classSubjects = subjects[entryConfig.class] || [];
    const resultsToSave: Result[] = studentIds.map(studentId => {
      const marksList = classSubjects.map(sub => ({ subjectName: sub, marks: parseInt(bulkMarks[studentId][sub] || '0') }));
      const total = marksList.reduce((acc, curr) => acc + curr.marks, 0);
      return {
        id: `${studentId}-${entryConfig.exam}-${entryConfig.year}`,
        studentId, examName: entryConfig.exam, class: entryConfig.class, year: entryConfig.year,
        marks: marksList, totalMarks: total, grade: calculateGrade(total, classSubjects.length), isPublished: true
      };
    });
    const success = await onSaveResults(resultsToSave);
    if (success) { alert('রেজাল্ট সেভ হয়েছে!'); setBulkMarks({}); setActiveSubView('MANAGE_RESULTS'); }
    setIsProcessing(false);
  };

  const handleTogglePublish = async (res: Result) => {
    setIsProcessing(true);
    const updatedResult = { ...res, isPublished: !res.isPublished };
    const success = await onSaveResult(updatedResult);
    if (success) {
      // Result list in App will be updated via fetchAllData or local state update
    }
    setIsProcessing(false);
  };

  const filteredStudentsForResults = useMemo(() => {
    return students.filter(s => s.studentClass === entryConfig.class && s.year === entryConfig.year).sort((a, b) => parseInt(a.roll) - parseInt(b.roll));
  }, [students, entryConfig.class, entryConfig.year]);

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
          <button key={tab.id} onClick={() => setActiveSubView(tab.id as TeacherSubView)} className={`flex-1 min-w-[100px] py-2.5 px-2 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 text-[12px] ${activeSubView === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <i className={`fas ${tab.icon} text-base`}></i> {tab.label}
          </button>
        ))}
      </div>

      {activeSubView === 'RESULT_ENTRY' && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-400 mb-4 flex items-center gap-2">
              <i className="fas fa-edit"></i> রেজাল্ট এন্ট্রি
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl">
              <select className="p-2.5 rounded-xl border-none outline-none font-bold text-sm" value={entryConfig.class} onChange={e => setEntryConfig({...entryConfig, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select className="p-2.5 rounded-xl border-none outline-none font-bold text-sm" value={entryConfig.year} onChange={e => setEntryConfig({...entryConfig, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
              <select className="p-2.5 rounded-xl border-none outline-none font-bold text-sm" value={entryConfig.exam} onChange={e => setEntryConfig({...entryConfig, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="p-3 text-left border-b">রোল ও নাম</th>
                    {(subjects[entryConfig.class] || []).map(sub => <th key={sub} className="p-3 text-center border-b">{sub}</th>)}
                    <th className="p-3 text-center border-b">মোট ও গ্রেড</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredStudentsForResults.map(student => {
                    const currentMarks = bulkMarks[student.id] || {};
                    const classSubjects = subjects[entryConfig.class] || [];
                    const total = classSubjects.reduce((acc, sub) => acc + parseInt(currentMarks[sub] || '0'), 0);
                    const grade = calculateGrade(total, classSubjects.length);
                    return (
                      <tr key={student.id}>
                        <td className="p-3"><div className="font-black text-indigo-600 text-xs">#{student.roll}</div><div className="text-sm font-bold">{student.name}</div></td>
                        {classSubjects.map(sub => (
                          <td key={sub} className="p-1.5 text-center">
                            <input type="number" className="w-14 p-1.5 text-center border-none bg-gray-100 dark:bg-gray-700 rounded-lg outline-none font-bold text-sm" value={currentMarks[sub] || ''} placeholder="0" onChange={e => setBulkMarks(prev => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), [sub]: e.target.value } }))} />
                          </td>
                        ))}
                        <td className="p-3 text-center"><div className="font-black text-sm">{total}</div><div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block ${grade === 'F' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{grade}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleSaveBulkResults} disabled={isProcessing} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-check-circle"></i>} সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubView === 'ENROLL' && (
        <div className="animate-fade-in max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-xl border dark:border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><i className="fas fa-user-plus text-[100px] text-indigo-600"></i></div>
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b dark:border-gray-700 pb-4">
                <div>
                  <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-400">নতুন শিক্ষার্থী ভর্তি</h2>
                  <p className="text-xs text-gray-500 font-medium">নির্ভুলভাবে তথ্য পূরণ করুন</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDownloadSample} className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-xs font-bold border border-amber-200 hover:bg-amber-500 hover:text-white transition-all"><i className="fas fa-download mr-1"></i> নমুনা কপি</button>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-green-50 text-green-700 px-3 py-2 rounded-xl text-xs font-bold border border-green-200 hover:bg-green-600 hover:text-white transition-all"><i className="fas fa-file-excel mr-1"></i> ইমপোর্ট</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                </div>
              </div>

              <form onSubmit={handleEnrollSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">শিক্ষার্থীর নাম</label>
                    <div className="relative"><i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i><input className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sm" placeholder="নাম" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">পিতার নাম</label>
                    <div className="relative"><i className="fas fa-male absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm"></i><input className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sm" placeholder="পিতার নাম" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} required /></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">মাতার নাম</label>
                    <div className="relative"><i className="fas fa-female absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm"></i><input className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sm" placeholder="মাতার নাম" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} required /></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">রোল নম্বর</label>
                    <div className="relative"><i className="fas fa-id-badge absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i><input type="number" className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sm" placeholder="রোল" value={formData.roll} onChange={e => setFormData({...formData, roll: e.target.value})} required /></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">শ্রেণী</label>
                    <div className="relative"><i className="fas fa-graduation-cap absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i><select className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sm appearance-none" value={formData.studentClass} onChange={e => setFormData({...formData, studentClass: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">শিক্ষাবর্ষ</label>
                    <div className="relative"><i className="fas fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i><select className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sm appearance-none" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">মোবাইল</label>
                    <div className="relative"><i className="fas fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i><input className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sm" placeholder="মোবাইল" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} /></div>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">ঠিকানা (গ্রাম)</label>
                    <div className="relative"><i className="fas fa-map-marker-alt absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i><input className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sm" placeholder="ঠিকানা" value={formData.village} onChange={e => setFormData({...formData, village: e.target.value})} /></div>
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black text-base shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2">
                    {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-check-circle"></i>} ভর্তি সম্পন্ন করুন
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeSubView === 'STUDENT_LIST' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border dark:border-gray-700 overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-600 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2">
              <select className="p-2 bg-white dark:bg-gray-800 rounded-xl border-none shadow-sm font-bold text-sm" value={filter.class} onChange={e => setFilter({...filter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select className="p-2 bg-white dark:bg-gray-800 rounded-xl border-none shadow-sm font-bold text-sm" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
              <button onClick={handleDownloadStudents} className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all"><i className="fas fa-download"></i> ডাউনলোড</button>
            </div>
            <div className="text-xs font-bold text-indigo-600">মোট: {students.filter(s => s.studentClass === filter.class && s.year === filter.year).length} জন</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black uppercase text-gray-500 tracking-wider">
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
              <tbody className="divide-y dark:divide-gray-700">
                {students.filter(s => s.studentClass === filter.class && s.year === filter.year).sort((a,b) => parseInt(a.roll) - parseInt(b.roll)).map(s => (
                  <tr key={s.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                    <td className="px-4 py-3 font-black text-indigo-600 text-sm">{s.roll}</td>
                    <td className="px-4 py-3 font-bold text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-xs">{s.fatherName}</td>
                    <td className="px-4 py-3 text-xs">{s.motherName}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-gray-500">{s.studentClass}</td>
                    <td className="px-4 py-3 text-xs">{s.mobile || '-'}</td>
                    <td className="px-4 py-3 text-xs">{s.village || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => { if(confirm(`${s.name} এর তথ্য ডিলিট করতে চান?`)) onDeleteStudent(s.id); }} 
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {students.filter(s => s.studentClass === filter.class && s.year === filter.year).length === 0 && (
                  <tr><td colSpan={8} className="p-10 text-center opacity-40 font-bold italic">কোন শিক্ষার্থী পাওয়া যায়নি।</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubView === 'MANAGE_RESULTS' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-400">রেজাল্ট ম্যানেজ ও পাবলিশ</h2>
            <button onClick={handleDownloadResults} className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all"><i className="fas fa-file-download"></i> ডাউনলোড</button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <select className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 font-bold text-sm" value={filter.class} onChange={e => setFilter({...filter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 font-bold text-sm" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="p-3">ছাত্র</th>
                  <th className="p-3">পরীক্ষা</th>
                  <th className="p-3 text-center">মোট নম্বর</th>
                  <th className="p-3 text-center">গ্রেড</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700 text-sm">
                {results.filter(r => r.class === filter.class && r.year === filter.year).map(res => {
                  const s = students.find(st => st.id === res.studentId);
                  return (
                    <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                      <td className="p-3 font-bold">{s?.name} <span className="text-indigo-600 text-xs">#{s?.roll}</span></td>
                      <td className="p-3 text-xs">{res.examName}</td>
                      <td className="p-3 text-center font-black">{res.totalMarks}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${res.grade === 'F' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{res.grade}</span></td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${res.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {res.isPublished ? 'পাবলিশড' : 'ড্রাফট'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-3">
                          <button 
                            onClick={() => handleTogglePublish(res)} 
                            title={res.isPublished ? 'আনপাবলিশ করুন' : 'পাবলিশ করুন'}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${res.isPublished ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white'}`}
                          >
                            <i className={`fas ${res.isPublished ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                          <button 
                            onClick={() => { if(confirm('ডিলিট করতে চান?')) onDeleteResult(res.id); }} 
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
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
            <h2 className="text-xl font-black mb-4">পাসওয়ার্ড পরিবর্তন</h2>
            <div className="flex gap-2">
              <input type="password" placeholder="নতুন পাসওয়ার্ড" className="flex-grow p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none text-sm" value={newPass} onChange={e => setNewPass(e.target.value)} />
              <button onClick={handleUpdatePassword} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm">আপডেট</button>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-xl font-black mb-4">বিষয় ম্যানেজমেন্ট</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <select className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm" value={subjectClass} onChange={e => setSubjectClass(e.target.value)}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <input placeholder="বিষয় (কমা দিয়ে)" className="md:col-span-2 p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm" value={subjectInput} onChange={e => setSubjectInput(e.target.value)} />
              <button onClick={handleSaveSubjects} className="bg-green-600 text-white p-2.5 rounded-xl font-bold text-sm">সংরক্ষণ</button>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-xl flex flex-wrap gap-2">
              {(subjects[subjectClass] || []).map(s => <span key={s} className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-[10px] font-bold border">{s}</span>)}
            </div>
          </div>
        </div>
      )}

      {activeSubView === 'NOTICES' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-xl font-black mb-4">নোটিশ বোর্ড</h2>
            <textarea placeholder="নোটিশ লিখুন..." className="w-full h-24 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none mb-4 text-sm" value={noticeInput} onChange={e => setNoticeInput(e.target.value)} />
            <button onClick={handleAddNotice} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm">পাবলিশ</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPanel;
