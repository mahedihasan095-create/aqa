
import React, { useState, useEffect } from 'react';
import { Student, Result, TeacherSubView, SubjectMarks, Notice } from '../types';

interface TeacherPanelProps {
  students: Student[];
  results: Result[];
  subjects: Record<string, string[]>;
  notices: Notice[];
  onSetSubjectsForClass: (className: string, classSubjects: string[]) => Promise<boolean>;
  onAddStudent: (s: Student) => Promise<boolean>;
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
  students, results, subjects, notices, onSetSubjectsForClass, onAddStudent, 
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

  /**
   * Enhanced Export: Using UTF-16LE + BOM which is the gold standard for Excel
   * This ensures Bengali text appears perfectly on both Windows and Mac.
   */
  const downloadExcel = (data: any[], fileName: string) => {
    if (data.length === 0) return alert('ডাউনলোড করার জন্য কোনো ডাটা নেই!');
    
    const headers = Object.keys(data[0]);
    const tsvContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(header => (row[header] || '').toString()).join('\t'))
    ].join('\r\n');

    // Convert string to UTF-16LE
    const buffer = new ArrayBuffer(tsvContent.length * 2);
    const view = new Uint16Array(buffer);
    for (let i = 0; i < tsvContent.length; i++) {
      view[i] = tsvContent.charCodeAt(i);
    }

    // Add BOM for UTF-16LE (0xFF, 0xFE)
    const bom = new Uint8Array([0xFF, 0xFE]);
    const blob = new Blob([bom, buffer], { type: 'application/vnd.ms-excel;charset=utf-16le' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${fileName}.xls`; // Using .xls forces Excel to handle the content as a spreadhseet
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

      {activeSubView === 'NOTICES' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <i className="fas fa-bullhorn text-amber-500"></i> নতুন নোটিশ যুক্ত করুন
            </h2>
            <div className="flex gap-4">
              <textarea 
                className="flex-1 p-4 border rounded-2xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]" 
                placeholder="নোটিশের বিস্তারিত লিখুন..." 
                value={newNotice} 
                onChange={e => setNewNotice(e.target.value)}
              ></textarea>
              <button 
                onClick={handleAddNotice}
                disabled={isSaving || !newNotice.trim()}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all h-fit self-end"
              >
                পাবলিশ
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-400 tracking-widest px-2">প্রকাশিত নোটিশসমূহ</h3>
            {notices.length > 0 ? notices.map(notice => (
              <div key={notice.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border dark:border-gray-700 flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-amber-600 uppercase">{notice.date}</p>
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{notice.text}</p>
                </div>
                <button onClick={() => handleDeleteNotice(notice.id)} className="text-red-100 hover:text-red-500 p-2 transition-colors">
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            )) : (
              <div className="text-center py-20 bg-gray-100 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-400 font-bold">এখনো কোন নোটিশ প্রকাশ করা হয়নি</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <tr><td colSpan={entryClassSubjects.length + 3} className="px-6 py-10 text-center text-gray-400">এই শ্রেণী ও সালে কোনো শিক্ষার্থী পাওয়া যায়নি।</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              <input placeholder="খুঁজুন..." className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500" value={manageFilter.search} onChange={e => setManageFilter({...manageFilter, search: e.target.value})} />
            </div>
          </div>

          <div className="flex justify-between items-center px-2 flex-wrap gap-4">
            <button 
              onClick={exportResultList}
              className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"
            >
              <i className="fas fa-file-excel"></i> রেজাল্ট এক্সেল ডাউনলোড
            </button>

            {filteredManaged.length > 0 && (
              <div className="flex gap-3">
                <button 
                  onClick={() => handleBulkPublish(false)} 
                  disabled={isSaving}
                  className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <i className="fas fa-times-circle"></i> সব আনপাবলিশ
                </button>
                <button 
                  onClick={() => handleBulkPublish(true)} 
                  disabled={isSaving}
                  className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 shadow-md transition-all flex items-center gap-2"
                >
                  {isSaving ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-check-double"></i>}
                  সব পাবলিশ
                </button>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 font-bold text-xs uppercase border-b dark:border-gray-600">
                <tr><th className="px-6 py-4">রোল</th><th className="px-6 py-4">নাম</th><th className="px-6 py-4 text-center">মোট</th><th className="px-6 py-4 text-center">গ্রেড</th><th className="px-6 py-4 text-center">পাবলিশ স্ট্যাটাস</th><th className="px-6 py-4 text-center">অ্যাকশন</th></tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredManaged.length > 0 ? filteredManaged.map(r => {
                  const s = students.find(st => st.id === r.studentId);
                  const isCurrentPublishing = publishingId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-bold">{s?.roll}</td>
                      <td className="px-6 py-4">{s?.name}</td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">{r.totalMarks}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-600 dark:text-green-400">{r.grade}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div 
                            onClick={() => !isCurrentPublishing && handlePublishToggle(r)} 
                            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-300 cursor-pointer shadow-inner ${
                              r.isPublished ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            } ${isCurrentPublishing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                          >
                            <span 
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                r.isPublished ? 'translate-x-7' : 'translate-x-1'
                              }`}
                            />
                            {isCurrentPublishing && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <i className="fas fa-circle-notch animate-spin text-[10px] text-white"></i>
                              </div>
                            )}
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${r.isPublished ? 'text-green-600' : 'text-gray-400'}`}>
                            {r.isPublished ? 'পাবলিশড' : 'বন্ধ'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => setEditingResult(r)} className="text-indigo-500 hover:text-indigo-700 transition-colors"><i className="fas fa-edit"></i></button>
                          <button onClick={async (e) => { 
                            e.preventDefault();
                            if(window.confirm('আপনি কি নিশ্চিতভাবে এই ফলাফলটি মুছে ফেলতে চান?')) {
                              const ok = await onDeleteResult(r.id);
                              if (ok) alert('ফলাফল সফলভাবে মুছে ফেলা হয়েছে।');
                            }
                          }} className="text-red-500 hover:text-red-700 transition-colors"><i className="fas fa-trash-alt"></i></button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">কোন ফলাফল পাওয়া যায়নি।</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubView === 'STUDENT_LIST' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">শ্রেণী</label>
              <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={filter.class} onChange={e => setFilter({...filter, class: e.target.value})}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">সাল</label>
              <select className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold mb-1 block uppercase text-gray-400">খুঁজুন (নাম বা রোল)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><i className="fas fa-search"></i></span>
                <input placeholder="শিক্ষার্থীর নাম বা রোল লিখুন..." className="w-full pl-10 pr-4 py-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500" value={listSearch} onChange={e => setListSearch(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end px-2">
            <button 
              onClick={exportStudentList}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"
            >
              <i className="fas fa-download"></i> তালিকা এক্সেল ডাউনলোড
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-x-auto">
             <table className="w-full text-left min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase font-bold text-gray-500 dark:text-gray-400 border-b dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4">রোল</th>
                    <th className="px-6 py-4">নাম</th>
                    <th className="px-6 py-4">পিতার নাম</th>
                    <th className="px-6 py-4">মাতার নাম</th>
                    <th className="px-6 py-4">গ্রাম</th>
                    <th className="px-6 py-4 hidden md:table-cell">মোবাইল</th>
                    <th className="px-6 py-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filteredStudentList.length > 0 ? filteredStudentList.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{s.roll}</td>
                      <td className="px-6 py-4 font-bold">{s.name}</td>
                      <td className="px-6 py-4">{s.fatherName}</td>
                      <td className="px-6 py-4">{s.motherName}</td>
                      <td className="px-6 py-4 font-medium text-gray-500">{s.village}</td>
                      <td className="px-6 py-4 hidden md:table-cell">{s.mobile}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => setEditingStudent(s)} className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><i className="fas fa-edit"></i></button>
                          <button onClick={async (e) => { 
                            e.preventDefault();
                            if(window.confirm(`${s.name}-কে কি সত্যিই মুছে ফেলতে চান? এটি করলে তার সকল রেজাল্টও মুছে যাবে।`)) {
                              const ok = await onDeleteStudent(s.id);
                              if (ok) alert('শিক্ষার্থী সফলভাবে মুছে ফেলা হয়েছে।');
                            }
                          }} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all"><i className="fas fa-trash-alt"></i></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="px-6 py-20 text-center">কোন শিক্ষার্থী খুঁজে পাওয়া যায়নি।</td></tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {activeSubView === 'ENROLL' && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl max-w-4xl mx-auto border dark:border-gray-700 animate-fade-in">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 w-14 h-14 rounded-2xl flex items-center justify-center">
              <i className="fas fa-user-plus text-2xl text-indigo-700 dark:text-indigo-400"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-400">নতুন শিক্ষার্থী ভর্তি</h2>
              <p className="text-sm text-gray-500">শিক্ষার্থীর সকল তথ্য নির্ভুলভাবে প্রদান করুন</p>
            </div>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsSaving(true);
            const s: Student = { ...formData, id: Date.now().toString() };
            if(await onAddStudent(s)) {
              alert('ভর্তি সফল হয়েছে!');
              setFormData({ ...formData, name: '', roll: '', mobile: '', fatherName: '', motherName: '', village: '' });
            }
            setIsSaving(false);
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-indigo-600 border-b pb-1">ব্যক্তিগত ও একাডেমিক তথ্য</h3>
                <div>
                  <label className="text-xs font-bold mb-1 block uppercase text-gray-400">শিক্ষার্থীর নাম</label>
                  <input required placeholder="নাম লিখুন" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold mb-1 block uppercase text-gray-400">রোল নম্বর</label>
                    <input required placeholder="রোল" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.roll} onChange={e => setFormData({...formData, roll: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1 block uppercase text-gray-400">শ্রেণী</label>
                    <select className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.studentClass} onChange={e => setFormData({...formData, studentClass: e.target.value})}>
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block uppercase text-gray-400">শিক্ষাবর্ষ (সাল)</label>
                  <select className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-indigo-600 border-b pb-1">অভিভাবক ও ঠিকানা</h3>
                <div>
                  <label className="text-xs font-bold mb-1 block uppercase text-gray-400">পিতার নাম</label>
                  <input required placeholder="পিতার নাম" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block uppercase text-gray-400">মাতার নাম</label>
                  <input required placeholder="মাতার নাম" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold mb-1 block uppercase text-gray-400">গ্রাম</label>
                    <input required placeholder="গ্রাম" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.village} onChange={e => setFormData({...formData, village: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1 block uppercase text-gray-400">মোবাইল</label>
                    <input required placeholder="মোবাইল নম্বর" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transform active:scale-95 transition-all">
              ভর্তি নিশ্চিত করুন
            </button>
          </form>
        </div>
      )}

      {activeSubView === 'SETTINGS' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <i className="fas fa-key text-indigo-600"></i> পাসওয়ার্ড পরিবর্তন
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">বর্তমান পাসওয়ার্ড</label>
                <input type="password" required autoComplete="current-password" placeholder="বর্তমান পাসওয়ার্ড" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">নতুন পাসওয়ার্ড</label>
                  <input type="password" required autoComplete="new-password" placeholder="নতুন পাসওয়ার্ড" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">পাসওয়ার্ড নিশ্চিত করুন</label>
                  <input type="password" required autoComplete="new-password" placeholder="আবার লিখুন" className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg transform active:scale-95 transition-all">পাসওয়ার্ড আপডেট করুন</button>
            </form>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30">
            <h2 className="text-2xl font-bold text-red-700 mb-4">সিস্টেম রিসেট</h2>
            <p className="text-sm text-gray-600 mb-6 font-bold tracking-tighter">সাবধান! এটি সকল ডাটা স্থায়ীভাবে মুছে ফেলবে।</p>
            <button onClick={handleResetSystem} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl">বর্তমান সকল ডাটা ক্লিয়ার করুন</button>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl p-8 animate-fade-in shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">শিক্ষার্থীর তথ্য পরিবর্তন</h2>
              <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-red-500"><i className="fas fa-times text-xl"></i></button>
            </div>
            <form onSubmit={handleUpdateStudentSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase text-gray-400">শিক্ষার্থীর নাম</label>
                  <input required className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} />
                </div>
                <div><label className="text-xs font-bold uppercase text-gray-400">রোল নম্বর</label><input required className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={editingStudent.roll} onChange={e => setEditingStudent({...editingStudent, roll: e.target.value})} /></div>
                <div><label className="text-xs font-bold uppercase text-gray-400">মোবাইল</label><input required className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={editingStudent.mobile} onChange={e => setEditingStudent({...editingStudent, mobile: e.target.value})} /></div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400">শ্রেণী</label>
                  <select className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={editingStudent.studentClass} onChange={e => setEditingStudent({...editingStudent, studentClass: e.target.value})}>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400">শিক্ষাবর্ষ (সাল)</label>
                  <select className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={editingStudent.year} onChange={e => setEditingStudent({...editingStudent, year: e.target.value})}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-bold uppercase text-gray-400">পিতার নাম</label><input required className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={editingStudent.fatherName} onChange={e => setEditingStudent({...editingStudent, fatherName: e.target.value})} /></div>
                <div><label className="text-xs font-bold uppercase text-gray-400">মাতার নাম</label><input required className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={editingStudent.motherName} onChange={e => setEditingStudent({...editingStudent, motherName: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="text-xs font-bold uppercase text-gray-400">গ্রাম</label><input required className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none" value={editingStudent.village} onChange={e => setEditingStudent({...editingStudent, village: e.target.value})} /></div>
              </div>
              <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold">বাতিল</button>
                <button type="submit" disabled={isSaving} className="flex-2 bg-indigo-600 text-white font-bold py-3 px-8 rounded-2xl shadow-xl">আপডেট করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingResult && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto scrollbar-hide">
            <h2 className="text-2xl font-bold mb-6 text-indigo-800 dark:text-indigo-300">রেজাল্ট আপডেট ({editingResult.examName})</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              const total = editingResult.marks.reduce((acc, curr) => acc + (curr.marks || 0), 0);
              const ok = await onSaveResult({ ...editingResult, totalMarks: total, grade: calculateGrade(total, editingResult.marks.length) });
              setIsSaving(false);
              if (ok) { alert('সফলভাবে আপডেট করা হয়েছে।'); setEditingResult(null); }
              else { alert('আপডেট করা সম্ভব হয়নি।'); }
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {editingResult.marks.map((m, idx) => (
                  <div key={idx}>
                    <label className="text-xs font-bold text-gray-400 block mb-1">{m.subjectName}</label>
                    <input type="number" className="w-full p-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none" value={m.marks} onChange={e => {
                      const newMarks = [...editingResult.marks];
                      newMarks[idx] = { ...newMarks[idx], marks: parseInt(e.target.value) || 0 };
                      setEditingResult({ ...editingResult, marks: newMarks });
                    }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setEditingResult(null)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold">বাতিল</button>
                <button type="submit" disabled={isSaving} className="flex-2 bg-indigo-600 text-white font-bold py-3 px-8 rounded-2xl">সংরক্ষণ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPanel;
