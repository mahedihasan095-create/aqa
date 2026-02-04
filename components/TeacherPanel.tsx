import React, { useState } from 'react';
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
  students, results, subjects, notices, onSetSubjectsForClass, onAddStudent, 
  onUpdateStudent, onDeleteStudent, onSaveResult, onSaveResults, onDeleteResult, 
  onUpdateNotices, onUpdatePassword, currentPassword 
}) => {
  const [activeSubView, setActiveSubView] = useState<TeacherSubView>('STUDENT_LIST');
  const [filter, setFilter] = useState({ class: 'প্রথম', year: '২০২৬' });
  const [formData, setFormData] = useState({ 
    name: '', fatherName: '', motherName: '', village: '', mobile: '', studentClass: 'প্রথম', year: '২০২৬', roll: '' 
  });

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newStudent: Student = { ...formData, id: Date.now().toString() };
    const success = await onAddStudent(newStudent);
    if (success) {
      alert('ভর্তি সফল হয়েছে');
      setFormData({ ...formData, name: '', roll: '', mobile: '' });
      setActiveSubView('STUDENT_LIST');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 no-print bg-white dark:bg-gray-800 p-2 rounded-xl border dark:border-gray-700">
        <button onClick={() => setActiveSubView('ENROLL')} className={`flex-1 py-3 px-4 rounded-lg font-bold transition ${activeSubView === 'ENROLL' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>ভর্তি ফরম</button>
        <button onClick={() => setActiveSubView('STUDENT_LIST')} className={`flex-1 py-3 px-4 rounded-lg font-bold transition ${activeSubView === 'STUDENT_LIST' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>ছাত্র তালিকা</button>
        <button onClick={() => setActiveSubView('RESULT_ENTRY')} className={`flex-1 py-3 px-4 rounded-lg font-bold transition ${activeSubView === 'RESULT_ENTRY' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>রেজাল্ট এন্ট্রি</button>
        <button onClick={() => setActiveSubView('NOTICES')} className={`flex-1 py-3 px-4 rounded-lg font-bold transition ${activeSubView === 'NOTICES' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>নোটিশ</button>
        <button onClick={() => setActiveSubView('SETTINGS')} className={`flex-1 py-3 px-4 rounded-lg font-bold transition ${activeSubView === 'SETTINGS' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>সেটিংস</button>
      </div>

      {activeSubView === 'ENROLL' && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border dark:border-gray-700">
          <h2 className="text-xl font-bold mb-6 text-indigo-700">নতুন শিক্ষার্থী ভর্তি</h2>
          <form onSubmit={handleEnrollSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="নাম" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <input className="p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="রোল" type="number" value={formData.roll} onChange={e => setFormData({...formData, roll: e.target.value})} required />
            <input className="p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="পিতার নাম" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} />
            <input className="p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="মোবাইল" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
            <select className="p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={formData.studentClass} onChange={e => setFormData({...formData, studentClass: e.target.value})}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="submit" className="md:col-span-2 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition">ভর্তি সম্পন্ন করুন</button>
          </form>
        </div>
      )}

      {activeSubView === 'STUDENT_LIST' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex gap-4">
            <select className="p-2 rounded border dark:bg-gray-600" value={filter.class} onChange={e => setFilter({...filter, class: e.target.value})}>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="p-2 rounded border dark:bg-gray-600" value={filter.year} onChange={e => setFilter({...filter, year: e.target.value})}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700 text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="p-4">রোল</th>
                <th className="p-4">নাম</th>
                <th className="p-4">মোবাইল</th>
                <th className="p-4">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {students.filter(s => s.studentClass === filter.class && s.year === filter.year).map(s => (
                <tr key={s.id}>
                  <td className="p-4 font-bold">{s.roll}</td>
                  <td className="p-4">{s.name}</td>
                  <td className="p-4">{s.mobile}</td>
                  <td className="p-4">
                    <button onClick={() => onDeleteStudent(s.id)} className="text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherPanel;