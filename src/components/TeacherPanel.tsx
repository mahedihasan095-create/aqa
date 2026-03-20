
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Student, Result, TeacherSubView, SubjectMarks, Notice } from '../types';
import * as XLSX from 'xlsx';

interface TeacherPanelProps {
  students: Student[];
  results: Result[];
  subjects: Record<string, string[]>;
  notices: Notice[];
  principalSignature?: string;
  schoolLogo?: string;
  slideshowImages?: {url: string, title: string}[];
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
  onUpdateSchoolLogo: (logoBase64: string) => Promise<boolean>;
  onUpdateSlideshowImages?: (images: {url: string, title: string}[]) => Promise<boolean>;
  currentPassword: string;
}

const CLASSES = ['প্লে', 'নার্সারী', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম'];
const YEARS = ['২০২৬', '২০২৭', '২০২৮', '২০২৯', '২০৩০'];
const EXAMS = ['প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'বার্ষিক পরীক্ষা'];

const TeacherPanel: React.FC<TeacherPanelProps> = ({ 
  students, results, subjects, notices, principalSignature, schoolLogo, slideshowImages = [], onSetSubjectsForClass, onAddStudent, onAddStudents,
  onUpdateStudent, onDeleteStudent, onSaveResult, onSaveResults, onDeleteResult, 
  onUpdateNotices, onUpdatePassword, onUpdatePrincipalSignature, onUpdateSchoolLogo, onUpdateSlideshowImages, currentPassword 
}) => {
  const [activeSubView, setActiveSubView] = useState<TeacherSubView>('STUDENT_LIST');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultExcelRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const slideshowInputRef = useRef<HTMLInputElement>(null);
  
  const [newPass, setNewPass] = useState('');
  const [subjectClass, setSubjectClass] = useState('প্রথম');
  const [subjectInput, setSubjectInput] = useState('');
  const [noticeInput, setNoticeInput] = useState('');
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  const groupedResults = useMemo(() => {
    const groups: Record<string, { class: string, year: string, examName: string, results: Result[], isPublished: boolean, totalStudents: number }> = {};
    results.forEach(res => {
      const key = `${res.class}|${res.year}|${res.examName}`;
      if (!groups[key]) {
        groups[key] = {
          class: res.class,
          year: res.year,
          examName: res.examName,
          results: [],
          isPublished: true,
          totalStudents: 0
        };
      }
      groups[key].results.push(res);
      if (!res.isPublished) groups[key].isPublished = false;
    });
    
    // Count students per class to show coverage
    Object.keys(groups).forEach(key => {
      const className = groups[key].class;
      groups[key].totalStudents = students.filter(s => s.studentClass === className).length;
    });

    return Object.entries(groups).map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.year.localeCompare(a.year) || a.class.localeCompare(b.class));
  }, [results, students]);

  const handleTogglePublishGroup = async (key: string, currentStatus: boolean) => {
    const group = groupedResults.find(g => g.key === key);
    if (!group) return;
    setIsProcessing(true);
    const updatedResults = group.results.map(r => ({ ...r, isPublished: !currentStatus }));
    await onSaveResults(updatedResults);
    setIsProcessing(false);
  };

  const handleDeleteGroup = async (key: string) => {
    if (!confirm('আপনি কি এই গ্রুপের সকল রেজাল্ট মুছতে চান?')) return;
    const group = groupedResults.find(g => g.key === key);
    if (!group) return;
    setIsProcessing(true);
    // We need to delete one by one or have a bulk delete. 
    // Since onSaveResults is bulk, maybe we can use it if the backend supports it, 
    // but onDeleteResult is single. Let's use single for now or check if we can add bulk delete.
    // For now, let's just do single deletes in a loop.
    for (const res of group.results) {
      await onDeleteResult(res.id);
    }
    setIsProcessing(false);
  };

  const [studentFilterClass, setStudentFilterClass] = useState('সব');

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

  const downloadSampleExcel = () => {
    const data = [
      {
        'নাম': 'করিম উদ্দিন',
        'রোল': '১০১',
        'পিতা': 'আব্দুর রহিম',
        'মাতা': 'ফাতেমা বেগম',
        'মোবাইল': '01700000000',
        'গ্রাম': 'কলাবাড়ী',
        'শ্রেণী': 'প্রথম',
        'সাল': '২০২৬'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Admission_Sample.xlsx");
  };

  const downloadResultSampleExcel = () => {
    const classSubjects = subjects[entryConfig.class] || [];
    if (classSubjects.length === 0) {
      alert('এই শ্রেণীর জন্য কোনো বিষয় সেট করা হয়নি। অনুগ্রহ করে সেটিংসে বিষয় সেট করুন।');
      return;
    }
    
    // Create columns based on class subjects
    const data = [
      {
        'রোল': '১০১',
        'নাম': 'নমুনা ছাত্র',
        ...Object.fromEntries(classSubjects.map(sub => [sub, '0']))
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks");
    XLSX.writeFile(wb, `Result_Entry_Sample_${entryConfig.class}.xlsx`);
  };

  const downloadStudentsExcel = () => {
    const data = filteredStudents.map(s => ({
      'রোল': s.roll,
      'নাম': s.name,
      'শ্রেণী': s.studentClass,
      'পিতার নাম': s.fatherName,
      'মাতার নাম': s.motherName,
      'মোবাইল': s.mobile,
      'গ্রাম': s.village,
      'সাল': s.year
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Students_List_${studentFilterClass}.xlsx`);
  };

  const downloadResultsExcel = () => {
    const data = results.map(r => {
      const student = students.find(s => s.id === r.studentId);
      const marksObj: Record<string, number> = {};
      r.marks.forEach(m => {
        marksObj[m.subjectName] = m.marks;
      });
      return {
        'রোল': student?.roll || '',
        'নাম': student?.name || '',
        'শ্রেণী': r.class,
        'পরীক্ষা': r.examName,
        'সাল': r.year,
        ...marksObj,
        'মোট নম্বর': r.totalMarks,
        'গ্রেড': r.grade,
        'অবস্থা': r.isPublished ? 'পাবলিশড' : 'ড্রাফট'
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "Results_Data.xlsx");
  };

  const downloadAllDataJSON = () => {
    const allData = {
      students,
      results,
      subjects,
      notices,
      principalSignature,
      schoolLogo,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `School_Management_Backup_${new Date().toLocaleDateString('bn-BD')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        
        const importedStudents: Student[] = data.map((row, idx) => ({
          id: (Date.now() + idx).toString(),
          name: (row['নাম'] || row['Name'] || '').toString(),
          roll: (row['রোল'] || row['Roll'] || '').toString(),
          fatherName: (row['পিতা'] || row['Father Name'] || '').toString(),
          motherName: (row['মাতা'] || row['Mother Name'] || '').toString(),
          mobile: (row['মোবাইল'] || row['Mobile'] || '').toString(),
          village: (row['গ্রাম'] || row['Village'] || '').toString(),
          studentClass: (row['শ্রেণী'] || row['Class'] || formData.studentClass).toString(),
          year: (row['সাল'] || row['Year'] || formData.year).toString(),
        }));

        if (onAddStudents) {
          setIsProcessing(true);
          const success = await onAddStudents(importedStudents);
          if (success) alert('সফলভাবে ইমপোর্ট করা হয়েছে!');
          setIsProcessing(false);
        }
      } catch (err) {
        alert('ফাইলটি প্রসেস করতে সমস্যা হয়েছে।');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddNotice = async () => {
    if (!noticeInput.trim()) return;
    
    let updatedNotices: Notice[];
    if (editingNoticeId) {
      updatedNotices = notices.map(n => 
        n.id === editingNoticeId ? { ...n, text: noticeInput } : n
      );
    } else {
      const newNotice: Notice = {
        id: Date.now().toString(),
        text: noticeInput,
        date: new Date().toLocaleDateString('bn-BD')
      };
      updatedNotices = [newNotice, ...notices];
    }

    setIsProcessing(true);
    const success = await onUpdateNotices(updatedNotices);
    if (success) {
      setNoticeInput('');
      setEditingNoticeId(null);
      alert(editingNoticeId ? 'নোটিশ আপডেট করা হয়েছে।' : 'নোটিশ যোগ করা হয়েছে।');
    }
    setIsProcessing(false);
  };

  const handleEditNotice = (notice: Notice) => {
    setNoticeInput(notice.text);
    setEditingNoticeId(notice.id);
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('আপনি কি এই নোটিশটি মুছতে চান?')) return;
    setIsProcessing(true);
    const success = await onUpdateNotices(notices.filter(n => n.id !== id));
    setIsProcessing(false);
  };

  const handleTogglePublish = async (resultId: string) => {
    const res = results.find(r => r.id === resultId);
    if (!res) return;
    setIsProcessing(true);
    await onSaveResult({ ...res, isPublished: !res.isPublished });
    setIsProcessing(false);
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

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.roll.includes(studentSearch);
      const matchesClass = studentFilterClass === 'সব' || s.studentClass === studentFilterClass;
      return matchesSearch && matchesClass;
    }).sort((a, b) => parseInt(a.roll) - parseInt(b.roll));
  }, [students, studentSearch, studentFilterClass]);

  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => onUpdatePrincipalSignature(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => onUpdateSchoolLogo(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSlideshowUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (slideshowImages.length >= 4) {
      alert('সর্বোচ্চ ৪টি ছবি আপলোড করা যাবে।');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (onUpdateSlideshowImages) {
        setIsProcessing(true);
        await onUpdateSlideshowImages([...slideshowImages, { url: base64, title: '' }]);
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSlideTitle = async (index: number, title: string) => {
    if (onUpdateSlideshowImages) {
      const newImages = [...slideshowImages];
      newImages[index] = { ...newImages[index], title };
      await onUpdateSlideshowImages(newImages);
    }
  };

  const handleDeleteSlide = async (index: number) => {
    if (!confirm('আপনি কি এই ছবিটি মুছতে চান?')) return;
    if (onUpdateSlideshowImages) {
      setIsProcessing(true);
      const newImages = slideshowImages.filter((_, i) => i !== index);
      await onUpdateSlideshowImages(newImages);
      setIsProcessing(false);
    }
  };

  const handleSaveSubjects = async () => {
    if (!subjectInput.trim()) {
      alert('অনুগ্রহ করে অন্তত একটি বিষয় প্রদান করুন।');
      return;
    }
    const classSubjects = subjectInput.split(',').map(s => s.trim()).filter(s => s !== '');
    setIsProcessing(true);
    const success = await onSetSubjectsForClass(subjectClass, classSubjects);
    if (success) {
      alert('বিষয়সমূহ সফলভাবে আপডেট করা হয়েছে!');
      setSubjectInput(''); // Clear input after success
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Mobile-Friendly Sub-Navigation */}
      <div className="no-print bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-2 rounded-2xl shadow-xl overflow-x-auto scrollbar-hide sticky top-[80px] z-40">
        <div className="flex min-w-max gap-2 px-1">
          {[
            { id: 'STUDENT_LIST', label: 'ছাত্র তালিকা', icon: 'fa-users' },
            { id: 'ENROLL', label: 'ভর্তি ফরম', icon: 'fa-user-plus' },
            { id: 'RESULT_ENTRY', label: 'নম্বর এন্ট্রি', icon: 'fa-file-signature' },
            { id: 'MANAGE_RESULTS', label: 'রেজাল্ট ম্যানেজ', icon: 'fa-tasks' },
            { id: 'NOTICES', label: 'নোটিশ', icon: 'fa-bullhorn' },
            { id: 'SETTINGS', label: 'সেটিংস', icon: 'fa-cog' },
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveSubView(tab.id as TeacherSubView)} 
              className={`py-3 px-5 rounded-xl font-black transition-all duration-300 flex items-center gap-2 text-xs md:text-sm ${
                activeSubView === tab.id 
                ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] scale-105' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* View: Student List */}
      {activeSubView === 'STUDENT_LIST' && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-2xl">
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-300">শিক্ষার্থী তালিকা ({filteredStudents.length})</h2>
                <div className="flex gap-2 w-full md:w-auto">
                   <button 
                     onClick={downloadStudentsExcel}
                     className="p-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center gap-2 font-bold text-sm"
                     title="এক্সেল ডাউনলোড করুন"
                   >
                     <i className="fas fa-file-excel"></i> <span className="hidden sm:inline">ডাউনলোড</span>
                   </button>
                   <select className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 font-bold text-sm" value={studentFilterClass} onChange={e => setStudentFilterClass(e.target.value)}>
                      <option value="সব">সব শ্রেণী</option>
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <input 
                     type="text" 
                     placeholder="নাম বা রোল দিয়ে খুঁজুন..." 
                     className="flex-grow md:w-64 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                     value={studentSearch}
                     onChange={e => setStudentSearch(e.target.value)}
                   />
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-indigo-50 dark:bg-indigo-900/20 text-[10px] font-black uppercase text-indigo-400">
                      <tr>
                         <th className="p-4 rounded-tl-xl">রোল</th>
                         <th className="p-4">নাম</th>
                         <th className="p-4">শ্রেণী</th>
                         <th className="p-4">পিতার নাম</th>
                         <th className="p-4">মাতার নাম</th>
                         <th className="p-4">মোবাইল</th>
                         <th className="p-4 rounded-tr-xl text-center">অ্যাকশন</th>
                      </tr>
                   </thead>
                   <tbody className="">
                      {filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                           <td className="p-4 font-black text-indigo-600 dark:text-indigo-400">{student.roll}</td>
                           <td className="p-4 font-bold">{student.name}</td>
                           <td className="p-4 font-medium">{student.studentClass} ({student.year})</td>
                           <td className="p-4 text-sm">{student.fatherName}</td>
                           <td className="p-4 text-sm">{student.motherName}</td>
                           <td className="p-4 text-sm font-mono">{student.mobile}</td>
                           <td className="p-4 text-center">
                              <div className="flex justify-center gap-2">
                                 <button onClick={() => setEditingStudent(student)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><i className="fas fa-edit"></i></button>
                                 <button onClick={() => onDeleteStudent(student.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><i className="fas fa-trash"></i></button>
                              </div>
                           </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr><td colSpan={7} className="p-20 text-center text-gray-400 font-bold">কোনো শিক্ষার্থী পাওয়া যায়নি।</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* View: Enroll Student - Compressed View */}
      {activeSubView === 'ENROLL' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-fade-in">
           <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-5 md:p-6 rounded-[32px] shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-indigo-900 dark:text-indigo-300">নতুন শিক্ষার্থী ভর্তি ফরম</h2>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full">
                  <i className="fas fa-info-circle text-indigo-500"></i> সব তথ্য সঠিকভাবে পূরণ করুন
                </div>
              </div>
              <form onSubmit={handleEnrollSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 {[
                   { label: 'শিক্ষার্থীর নাম', key: 'name', type: 'text', placeholder: 'নাম' },
                   { label: 'রোল নম্বর', key: 'roll', type: 'number', placeholder: 'রোল' },
                   { label: 'পিতার নাম', key: 'fatherName', type: 'text', placeholder: 'পিতার নাম' },
                   { label: 'মাতার নাম', key: 'motherName', type: 'text', placeholder: 'মাতার নাম' },
                   { label: 'মোবাইল নম্বর', key: 'mobile', type: 'text', placeholder: 'মোবাইল' },
                   { label: 'গ্রাম/ঠিকানা', key: 'village', type: 'text', placeholder: 'গ্রামের নাম' }
                 ].map(field => (
                   <div key={field.key} className="space-y-1">
                      <label className="text-[9px] font-black text-indigo-500 uppercase ml-1">{field.label}</label>
                      <input 
                        type={field.type} 
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl border-none outline-none font-bold text-xs focus:ring-1 focus:ring-indigo-600 transition-all shadow-sm"
                        placeholder={field.placeholder}
                        value={(formData as any)[field.key]}
                        onChange={e => setFormData({...formData, [field.key]: e.target.value})}
                      />
                   </div>
                 ))}
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-500 uppercase ml-1">শ্রেণী</label>
                    <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl border-none outline-none font-bold text-xs shadow-sm" value={formData.studentClass} onChange={e => setFormData({...formData, studentClass: e.target.value})}>
                       {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-500 uppercase ml-1">শিক্ষাবর্ষ</label>
                    <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl border-none outline-none font-bold text-xs shadow-sm" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})}>
                       {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
                 <div className="flex items-end">
                    <button disabled={isProcessing} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs">
                       {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-check-circle"></i>} ভর্তি নিশ্চিত করুন
                    </button>
                 </div>
              </form>
           </div>
           
           <div className="lg:col-span-1 space-y-4">
              <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-5 rounded-[32px] shadow-xl relative overflow-hidden group">
                 <h3 className="text-sm font-black mb-2 flex items-center gap-2 relative z-10">
                    <i className="fas fa-file-excel"></i> এক্সেল ইমপোর্ট
                 </h3>
                 <p className="text-[10px] text-green-100 mb-4 relative z-10 font-medium">একসাথে একাধিক শিক্ষার্থী যোগ করতে এক্সেল ব্যবহার করুন।</p>
                 <div className="flex flex-col gap-2 relative z-10">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 bg-white text-green-700 rounded-xl font-black shadow-md hover:bg-green-50 transition-all active:scale-95 text-xs flex items-center justify-center gap-2">
                      <i className="fas fa-upload"></i> ফাইল আপলোড
                    </button>
                    <button onClick={downloadSampleExcel} className="w-full py-2.5 bg-green-800/40 text-white rounded-xl font-black hover:bg-green-800/60 transition-all active:scale-95 text-[10px] flex items-center justify-center gap-2">
                      <i className="fas fa-download"></i> নমুনা ফাইল ডাউনলোড
                    </button>
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelImport} />
                 <i className="fas fa-file-excel absolute -bottom-2 -right-2 text-6xl text-white/10 rotate-12 group-hover:scale-110 transition-transform"></i>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-[32px] shadow-lg">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                     <i className="fas fa-users text-indigo-600"></i>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase leading-none">মোট শিক্ষার্থী</p>
                     <p className="text-xl font-black text-gray-900 dark:text-gray-100 leading-none mt-1">{students.length}</p>
                   </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* View: Result Entry */}
      {activeSubView === 'RESULT_ENTRY' && (
        <div className="animate-fade-in space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[32px] shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-3">
                  <i className="fas fa-edit"></i> রেজাল্ট এন্ট্রি প্যানেল
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-bold">শ্রেণী ও পরীক্ষা নির্বাচন করে নম্বর প্রদান করুন</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadResultSampleExcel} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-100 transition-colors">
                  <i className="fas fa-download"></i> নমুনা ফাইল
                </button>
                <button onClick={() => resultExcelRef.current?.click()} className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-green-100 transition-colors">
                  <i className="fas fa-file-excel"></i> ইমপোর্ট
                </button>
                <input type="file" ref={resultExcelRef} className="hidden" accept=".xlsx, .xls" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">শ্রেণী</label>
                 <select className="w-full p-3 rounded-xl bg-white dark:bg-gray-700 font-bold" value={entryConfig.class} onChange={e => setEntryConfig({...entryConfig, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">সাল</label>
                 <select className="w-full p-3 rounded-xl bg-white dark:bg-gray-700 font-bold" value={entryConfig.year} onChange={e => setEntryConfig({...entryConfig, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">পরীক্ষা</label>
                 <select className="w-full p-3 rounded-xl bg-white dark:bg-gray-700 font-bold" value={entryConfig.exam} onChange={e => setEntryConfig({...entryConfig, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="p-4 text-left">রোল ও নাম</th>
                    {(subjects[entryConfig.class] || []).map(sub => <th key={sub} className="p-4 text-center">{sub}</th>)}
                    <th className="p-4 text-center">মোট ও গ্রেড</th>
                  </tr>
                </thead>
                <tbody className="">
                  {students.filter(s => s.studentClass === entryConfig.class && s.year === entryConfig.year).sort((a,b) => parseInt(a.roll) - parseInt(b.roll)).map(student => {
                    const currentMarks = bulkMarks[student.id] || {};
                    const classSubjects = subjects[entryConfig.class] || [];
                    const total = classSubjects.reduce((acc, sub) => acc + parseInt(currentMarks[sub] || '0'), 0);
                    const grade = calculateGrade(total, classSubjects.length);
                    return (
                      <tr key={student.id} className="text-gray-800 dark:text-gray-200">
                        <td className="p-4">
                           <div className="font-black text-indigo-600 text-xs">রোল: {student.roll}</div>
                           <div className="text-sm font-bold">{student.name}</div>
                        </td>
                        {classSubjects.map(sub => (
                          <td key={sub} className="p-2 text-center">
                            <input 
                              type="number" 
                              className="w-16 p-2 text-center bg-gray-50 dark:bg-gray-900 rounded-lg outline-none font-bold text-sm no-spinner" 
                              value={currentMarks[sub] || ''} 
                              placeholder="0" 
                              onChange={e => setBulkMarks(prev => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), [sub]: e.target.value } }))} 
                            />
                          </td>
                        ))}
                        <td className="p-4 text-center">
                           <div className="font-black text-lg">{total}</div>
                           <div className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${grade === 'F' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{grade}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 flex justify-end">
               <button onClick={handleSaveBulkResults} disabled={isProcessing} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95">
                 {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>} তথ্য সংরক্ষণ করুন
               </button>
            </div>
          </div>
        </div>
      )}

      {/* View: Manage Results (Publishing) */}
      {activeSubView === 'MANAGE_RESULTS' && (
        <div className="animate-fade-in space-y-4">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                 <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-300">রেজাল্ট পাবলিশ ম্যানেজমেন্ট</h2>
                 <button 
                   onClick={downloadResultsExcel}
                   className="p-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center gap-2 font-bold text-sm w-full md:w-auto justify-center"
                 >
                   <i className="fas fa-file-excel"></i> এক্সেল ডাউনলোড করুন
                 </button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black uppercase text-gray-400">
                       <tr>
                          <th className="p-4">শ্রেণী ও সাল</th>
                          <th className="p-4">পরীক্ষার নাম</th>
                          <th className="p-4 text-center">শিক্ষার্থী সংখ্যা</th>
                          <th className="p-4 text-center">অবস্থা</th>
                          <th className="p-4 text-center">অ্যাকশন</th>
                       </tr>
                    </thead>
                    <tbody className="">
                       {groupedResults.map(group => {
                          return (
                            <tr key={group.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                               <td className="p-4 text-sm font-bold">{group.class} ({group.year})</td>
                               <td className="p-4 text-sm font-bold text-indigo-600">{group.examName}</td>
                               <td className="p-4 text-center font-black">
                                  <span className="text-indigo-600">{group.results.length}</span> / {group.totalStudents}
                               </td>
                               <td className="p-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${group.isPublished ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                     {group.isPublished ? 'পাবলিশড' : 'ড্রাফট'}
                                  </span>
                               </td>
                               <td className="p-4 text-center">
                                  <div className="flex justify-center gap-2">
                                     <button onClick={() => handleTogglePublishGroup(group.key, group.isPublished)} className={`p-2 rounded-lg transition-colors ${group.isPublished ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`} title={group.isPublished ? "সব আনপাবলিশ করুন" : "সব পাবলিশ করুন"}>
                                        <i className={`fas ${group.isPublished ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                     </button>
                                     <button onClick={() => handleDeleteGroup(group.key)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="সব মুছুন"><i className="fas fa-trash"></i></button>
                                  </div>
                               </td>
                            </tr>
                          );
                       })}
                       {groupedResults.length === 0 && (
                         <tr><td colSpan={5} className="p-20 text-center text-gray-400 font-bold">কোনো রেজাল্ট পাওয়া যায়নি।</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* View: Notices Management */}
      {activeSubView === 'NOTICES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
           <div className="lg:col-span-2 space-y-4">
              {notices.map(notice => (
                <div key={notice.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl flex justify-between items-start group">
                   <div>
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mb-2 inline-block">{notice.date}</span>
                      <p className="font-bold text-gray-800 dark:text-gray-200">{notice.text}</p>
                   </div>
                   <div className="flex gap-1">
                      <button onClick={() => handleEditNotice(notice)} className="p-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-600"><i className="fas fa-edit"></i></button>
                      <button onClick={() => handleDeleteNotice(notice.id)} className="p-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"><i className="fas fa-trash"></i></button>
                   </div>
                </div>
              ))}
              {notices.length === 0 && <div className="p-20 text-center text-gray-400 font-bold bg-white dark:bg-gray-800 rounded-3xl">কোনো নোটিশ নেই।</div>}
           </div>
           
           <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-2xl h-fit">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black flex items-center gap-2">
                    <i className={`fas ${editingNoticeId ? 'fa-edit' : 'fa-plus-circle'} text-indigo-500`}></i> 
                    {editingNoticeId ? 'নোটিশ এডিট করুন' : 'নতুন নোটিশ'}
                 </h3>
                 {editingNoticeId && (
                   <button onClick={() => { setEditingNoticeId(null); setNoticeInput(''); }} className="text-xs font-bold text-red-500 hover:underline">বাতিল করুন</button>
                 )}
              </div>
              <textarea 
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-600 h-40 resize-none mb-4"
                placeholder="এখানে নোটিশটি লিখুন..."
                value={noticeInput}
                onChange={e => setNoticeInput(e.target.value)}
              />
              <button onClick={handleAddNotice} disabled={isProcessing} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95">
                 {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className={`fas ${editingNoticeId ? 'fa-save' : 'fa-paper-plane'}`}></i>} 
                 {editingNoticeId ? ' আপডেট করুন' : ' নোটিশ পাবলিশ করুন'}
              </button>
           </div>
        </div>
      )}

      {/* View: Settings */}
      {activeSubView === 'SETTINGS' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
          {/* Backup & Export Section */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <i className="fas fa-images text-indigo-500"></i> স্লাইডশো ইমেজ ম্যানেজমেন্ট
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {slideshowImages.map((slide, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl space-y-3">
                  <div className="relative group aspect-video rounded-2xl overflow-hidden shadow-md">
                    <img src={slide.url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => handleDeleteSlide(idx)}
                        className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[8px] font-black rounded-full">ইমেজ {idx + 1}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-500 uppercase ml-1">ছবির শিরোনাম (Title)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="flex-grow p-2.5 bg-white dark:bg-gray-800 rounded-xl border-none outline-none font-bold text-xs focus:ring-1 focus:ring-indigo-600 transition-all shadow-sm"
                        placeholder="এখানে শিরোনাম লিখুন..."
                        defaultValue={slide.title}
                        onBlur={(e) => handleUpdateSlideTitle(idx, e.target.value)}
                      />
                      <button className="px-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md"><i className="fas fa-save"></i></button>
                    </div>
                  </div>
                </div>
              ))}
              {slideshowImages.length < 4 && (
                <button 
                  onClick={() => slideshowInputRef.current?.click()}
                  className="aspect-video rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group"
                >
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <i className="fas fa-plus"></i>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase">নতুন স্লাইড যোগ করুন</span>
                </button>
              )}
            </div>
            <input type="file" ref={slideshowInputRef} className="hidden" accept="image/*" onChange={handleSlideshowUpload} />
            <p className="text-[10px] text-gray-400 font-bold italic"><i className="fas fa-info-circle mr-1"></i> সর্বোচ্চ ৪টি ছবি স্লাইডশোতে ব্যবহার করা যাবে।</p>
          </div>

          {/* Backup & Export Section */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-3">
               <i className="fas fa-database text-indigo-500"></i> ব্যাকআপ ও এক্সপোর্ট
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-bold">
              আপনার অ্যাপের সকল তথ্য (শিক্ষার্থী, রেজাল্ট, নোটিশ, সেটিংস) একটি JSON ফাইল হিসেবে ডাউনলোড করে রাখুন। পরবর্তীতে এটি ব্যাকআপ হিসেবে ব্যবহার করা যাবে।
            </p>
            <button 
              onClick={downloadAllDataJSON}
              className="w-full md:w-auto px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <i className="fas fa-download"></i> সম্পূর্ণ ডাটা JSON ডাউনলোড করুন
            </button>
          </div>

          {/* Subject Management */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-3">
               <i className="fas fa-book text-indigo-500"></i> শ্রেণী অনুযায়ী বিষয় ব্যবস্থাপনা
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">শ্রেণী নির্বাচন করুন</label>
                <select 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none outline-none font-bold text-sm shadow-inner"
                  value={subjectClass}
                  onChange={e => setSubjectClass(e.target.value)}
                >
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">বিষয়সমূহ (কমা দিয়ে লিখুন)</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    className="flex-grow p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none outline-none font-bold text-sm shadow-inner"
                    placeholder="উদা: বাংলা, ইংরেজি, গণিত"
                    value={subjectInput}
                    onChange={e => setSubjectInput(e.target.value)}
                  />
                  <button 
                    onClick={handleSaveSubjects}
                    disabled={isProcessing}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>} সংরক্ষণ
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-gray-400 font-bold italic">
              * বিষয়গুলো কমা (,) দিয়ে আলাদা করে লিখুন। যেমন: বাংলা, ইংরেজি, গণিত।
            </p>

            {/* Display Current Subjects */}
            <div className="mt-8 pt-8">
              <h3 className="text-sm font-black mb-4 text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-list-ul"></i> {subjectClass} শ্রেণীর বর্তমান বিষয়সমূহ:
              </h3>
              <div className="flex flex-wrap gap-2">
                {subjects[subjectClass] && subjects[subjectClass].length > 0 ? (
                  subjects[subjectClass].map((sub, i) => (
                    <span key={i} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl text-sm font-bold animate-fade-in">
                      {sub}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 font-bold italic">কোনো বিষয় সেট করা নেই।</p>
                )}
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-2xl">
            <h2 className="text-2xl font-black mb-8 text-gray-900 dark:text-gray-100 flex items-center gap-3">
               <i className="fas fa-image text-amber-500"></i> স্কুলের লোগো সেট করুন
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="flex-shrink-0 w-44 h-44 bg-gray-50 dark:bg-gray-700 rounded-[32px] flex items-center justify-center overflow-hidden shadow-inner group relative">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="text-center p-4">
                    <i className="fas fa-cloud-upload-alt text-gray-300 text-4xl mb-2"></i>
                    <p className="text-[10px] text-gray-400 font-black uppercase">লোগো নেই</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                   <i className="fas fa-camera text-white text-2xl"></i>
                </div>
              </div>
              <div className="flex-grow space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                   আপনার প্রতিষ্ঠানের লোগো আপলোড করুন যা নেভিগেশন বার এবং প্রতিটি মার্কশিটের উপরে প্রদর্শিত হবে। একটি স্বচ্ছ (PNG) বা সাদা ব্যাকগ্রাউন্ডের লোগো ব্যবহার করা উত্তম।
                </p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => logoInputRef.current?.click()} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95">
                    <i className="fas fa-plus-circle"></i> নতুন লোগো
                  </button>
                  {schoolLogo && (
                    <button onClick={() => onUpdateSchoolLogo('')} className="bg-red-50 text-red-600 px-6 py-3.5 rounded-2xl font-black text-sm hover:bg-red-100 transition-all">মুছে ফেলুন</button>
                  )}
                </div>
                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-xl">
               <h2 className="text-xl font-black mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <i className="fas fa-lock text-red-500"></i> নিরাপত্তা পাসওয়ার্ড
               </h2>
               <div className="space-y-4">
                 <input type="password" placeholder="নতুন পাসওয়ার্ড দিন" className="w-full p-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl outline-none text-sm transition-all shadow-inner font-bold" value={newPass} onChange={e => setNewPass(e.target.value)} />
                 <button onClick={() => onUpdatePassword(newPass)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95">পাসওয়ার্ড আপডেট করুন</button>
               </div>
             </div>

             <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-xl">
               <h2 className="text-xl font-black mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <i className="fas fa-pen-nib text-indigo-500"></i> অধ্যক্ষের স্বাক্ষর
               </h2>
               <div className="flex flex-col items-center text-center space-y-4">
                 <div className="w-full h-24 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
                    {principalSignature ? (
                      <img src={principalSignature} alt="Principal Signature" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <span className="text-[10px] text-gray-400 font-black uppercase">স্বাক্ষর যোগ করা হয়নি</span>
                    )}
                 </div>
                 <button onClick={() => sigInputRef.current?.click()} className="w-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 py-3.5 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all active:scale-95">
                    <i className="fas fa-upload mr-2"></i> স্বাক্ষর আপলোড
                 </button>
                 <input type="file" ref={sigInputRef} className="hidden" accept="image/*" onChange={handleSigUpload} />
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[40px] p-8 shadow-2xl animate-scale-in">
              <h2 className="text-2xl font-black mb-6 text-indigo-900 dark:text-indigo-300">শিক্ষার্থীর তথ্য সংশোধন</h2>
              <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {[
                   { label: 'নাম', key: 'name' }, { label: 'রোল', key: 'roll' }, { label: 'পিতার নাম', key: 'fatherName' }, 
                   { label: 'মাতার নাম', key: 'motherName' }, { label: 'মোবাইল', key: 'mobile' }, { label: 'গ্রাম', key: 'village' }
                 ].map(field => (
                   <div key={field.key} className="space-y-1">
                      <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">{field.label}</label>
                      <input 
                        type="text" className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border-none outline-none font-bold text-sm"
                        value={(editingStudent as any)[field.key]}
                        onChange={e => setEditingStudent({...editingStudent, [field.key]: e.target.value})}
                      />
                   </div>
                 ))}
                 
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">শ্রেণী</label>
                    <select 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border-none outline-none font-bold text-sm" 
                      value={editingStudent.studentClass} 
                      onChange={e => setEditingStudent({...editingStudent, studentClass: e.target.value})}
                    >
                       {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">শিক্ষাবর্ষ</label>
                    <select 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border-none outline-none font-bold text-sm" 
                      value={editingStudent.year} 
                      onChange={e => setEditingStudent({...editingStudent, year: e.target.value})}
                    >
                       {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>

                 <div className="md:col-span-2 flex gap-3 mt-4">
                    <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-2xl font-black">বাতিল</button>
                    <button type="submit" disabled={isProcessing} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">আপডেট করুন</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeacherPanel;
