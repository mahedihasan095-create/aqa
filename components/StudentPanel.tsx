
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Result } from '../types';

interface StudentPanelProps {
  students: Student[];
  results: Result[];
  subjects: Record<string, string[]>;
}

const CLASSES = ['প্লে', 'নার্সারী', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম'];
const YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];
const EXAMS = ['প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'বার্ষিক পরীক্ষা'];

const StudentPanel: React.FC<StudentPanelProps> = ({ students, results, subjects: classSubjectsMap }) => {
  const [searchType, setSearchType] = useState<'BATCH' | 'INDIVIDUAL'>('INDIVIDUAL');
  const [batchFilter, setBatchFilter] = useState({ class: 'প্রথম', year: '2026', exam: 'বার্ষিক পরীক্ষা' });
  const [indivSearch, setIndivSearch] = useState({ roll: '', class: 'প্রথম', year: '2026', exam: 'বার্ষিক পরীক্ষা' });
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [searched, setSearched] = useState(false);
  
  // Sorting state for Batch Table
  const [batchSortKey, setBatchSortKey] = useState<'RANK' | 'ROLL'>('RANK');
  const [batchSortOrder, setBatchSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const publishedResults = useMemo(() => results.filter(r => r.isPublished), [results]);

  useEffect(() => {
    setSearched(false);
    setFoundStudent(null);
  }, [indivSearch.roll, indivSearch.class, indivSearch.year, indivSearch.exam, searchType]);

  const getSpecificResult = (studentId: string, className: string, year: string, examName: string) => {
    return publishedResults.find(r => r.studentId === studentId && r.class === className && r.year === year && r.examName === examName);
  };

  const classRanking = useMemo(() => {
    const targetClass = searchType === 'BATCH' ? batchFilter.class : indivSearch.class;
    const targetYear = searchType === 'BATCH' ? batchFilter.year : indivSearch.year;
    const targetExam = searchType === 'BATCH' ? batchFilter.exam : indivSearch.exam;
    
    const classStudents = students.filter(s => s.studentClass === targetClass && s.year === targetYear);
    const scores = classStudents.map(student => {
      const res = getSpecificResult(student.id, targetClass, targetYear, targetExam);
      return { studentId: student.id, score: res?.totalMarks || 0, hasResult: !!res };
    });
    return scores.filter(s => s.hasResult).sort((a, b) => b.score - a.score);
  }, [students, publishedResults, indivSearch, batchFilter, searchType]);

  const getRank = (studentId: string) => {
    const index = classRanking.findIndex(item => item.studentId === studentId);
    return index !== -1 ? index + 1 : '-';
  };

  const sortedBatchStudents = useMemo(() => {
    let list = students.filter(s => s.studentClass === batchFilter.class && s.year === batchFilter.year && getSpecificResult(s.id, batchFilter.class, batchFilter.year, batchFilter.exam));
    
    list.sort((a, b) => {
      let valA, valB;
      if (batchSortKey === 'RANK') {
        valA = parseInt(getRank(a.id).toString()) || 999;
        valB = parseInt(getRank(b.id).toString()) || 999;
      } else {
        valA = parseInt(a.roll) || 0;
        valB = parseInt(b.roll) || 0;
      }
      return batchSortOrder === 'ASC' ? valA - valB : valB - valA;
    });

    return list;
  }, [students, batchFilter, batchSortKey, batchSortOrder, classRanking]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 no-print">
        <button onClick={() => setSearchType('INDIVIDUAL')} className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${searchType === 'INDIVIDUAL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600'}`}>ব্যক্তিগত ফলাফল</button>
        <button onClick={() => setSearchType('BATCH')} className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${searchType === 'BATCH' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600'}`}>মেধাতালিকা</button>
      </div>

      {searchType === 'INDIVIDUAL' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border dark:border-gray-700 max-w-2xl mx-auto no-print">
            <h3 className="text-xl font-bold mb-6 text-indigo-800 dark:text-indigo-400 text-center">ফলাফল অনুসন্ধান</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div><label className="text-xs font-bold block mb-1">শ্রেণী</label><select className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded outline-none" value={indivSearch.class} onChange={e => setIndivSearch({...indivSearch, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1">সাল</label><select className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded font-sans outline-none" value={indivSearch.year} onChange={e => setIndivSearch({...indivSearch, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1">পরীক্ষা</label><select className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded outline-none" value={indivSearch.exam} onChange={e => setIndivSearch({...indivSearch, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1 font-sans">রোল (ENG)</label><input type="text" className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded font-sans outline-none" value={indivSearch.roll} onChange={e => setIndivSearch({...indivSearch, roll: e.target.value})} /></div>
              <div className="md:col-span-4 mt-2"><button onClick={() => { const s = students.find(st => st.roll === indivSearch.roll && st.studentClass === indivSearch.class && st.year === indivSearch.year); if(s) { setFoundStudent(s); setSearched(true); } else alert('শিক্ষার্থী পাওয়া যায়নি!'); }} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow transform active:scale-95 transition-all">ফলাফল দেখুন</button></div>
            </div>
          </div>

          {searched && foundStudent && (
            <div className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-2xl shadow-2xl border dark:border-gray-700 max-w-4xl mx-auto print-area overflow-hidden">
               <div className="text-center mb-8 border-b-2 border-indigo-100 pb-4">
                 <h1 className="text-3xl md:text-4xl font-black text-indigo-900 dark:text-indigo-400">আনওয়ারুল কুরআন একাডেমী</h1>
                 <p className="mt-2 text-indigo-600 font-bold uppercase tracking-wider">{indivSearch.exam} মূল্যায়নপত্র</p>
               </div>
               <div className="grid grid-cols-2 mb-6 gap-4 text-sm">
                 <div className="space-y-1"><p><strong>নাম:</strong> {foundStudent.name}</p><p><strong>পিতা:</strong> {foundStudent.fatherName}</p><p><strong>গ্রাম:</strong> {foundStudent.village}</p></div>
                 <div className="text-right space-y-1"><p><strong>রোল:</strong> <span className="font-sans font-bold">{foundStudent.roll}</span></p><p><strong>শ্রেণী:</strong> {foundStudent.studentClass} (<span className="font-sans">{foundStudent.year}</span>)</p><p><strong>মোবাইল:</strong> <span className="font-sans">{foundStudent.mobile}</span></p></div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left mb-6 border-collapse border border-gray-300 font-sans">
                   <thead className="bg-gray-100 dark:bg-gray-700 text-xs font-black">
                     <tr><th className="px-3 py-2 border border-gray-300 font-hind">বিষয়</th><th className="px-3 py-2 border border-gray-300 text-center font-hind">প্রাপ্ত নম্বর</th></tr>
                   </thead>
                   <tbody>
                     {(getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam)?.marks || []).map(m => (
                       <tr key={m.subjectName}><td className="px-3 py-1.5 border border-gray-300 font-hind">{m.subjectName}</td><td className="px-3 py-1.5 border border-gray-300 text-center font-bold">{m.marks}</td></tr>
                     ))}
                   </tbody>
                   <tfoot className="font-black bg-gray-50 dark:bg-gray-800">
                     <tr><td className="px-3 py-2 border border-gray-300 text-right font-hind">মোট নম্বর</td><td className="px-3 py-2 border border-gray-300 text-center text-indigo-600 font-bold">{getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam)?.totalMarks || 0}</td></tr>
                   </tfoot>
                 </table>
               </div>
               <div className="grid grid-cols-3 gap-4 text-center mt-6">
                 <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800"><span className="text-xs font-bold text-green-600 block uppercase">গ্রেড</span><span className="font-black text-2xl font-sans">{getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam)?.grade || '-'}</span></div>
                 <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800"><span className="text-xs font-bold text-amber-600 block uppercase">স্থান</span><span className="font-black text-2xl font-sans">#{getRank(foundStudent.id)}</span></div>
                 <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800"><span className="text-xs font-bold text-blue-600 block uppercase">ফলাফল</span><span className="font-black text-lg">উত্তীর্ণ</span></div>
               </div>
               <div className="no-print mt-10 flex justify-center"><button onClick={() => window.print()} className="bg-indigo-900 hover:bg-black text-white px-8 py-3 rounded-xl font-black shadow-xl transition-all flex items-center gap-2"><i className="fas fa-print"></i> প্রিন্ট করুন</button></div>
            </div>
          )}
        </div>
      )}

      {searchType === 'BATCH' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border dark:border-gray-700 overflow-hidden">
            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 border-b dark:border-gray-700 no-print grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="text-xs font-bold block mb-1">শ্রেণী</label><select className="w-full p-2.5 rounded-xl border outline-none dark:bg-gray-700" value={batchFilter.class} onChange={e => setBatchFilter({...batchFilter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1">সাল</label><select className="w-full p-2.5 rounded-xl border font-sans outline-none dark:bg-gray-700" value={batchFilter.year} onChange={e => setBatchFilter({...batchFilter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1">পরীক্ষা</label><select className="w-full p-2.5 rounded-xl border outline-none dark:bg-gray-700" value={batchFilter.exam} onChange={e => setBatchFilter({...batchFilter, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select></div>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-gray-100 dark:bg-gray-700 text-[11px] font-black uppercase text-gray-500">
                  <tr>
                    <th 
                      className="px-4 py-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => {
                        if (batchSortKey === 'ROLL') setBatchSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
                        else { setBatchSortKey('ROLL'); setBatchSortOrder('ASC'); }
                      }}
                    >
                      রোল (ENG) {batchSortKey === 'ROLL' && <i className={`fas fa-sort-${batchSortOrder === 'ASC' ? 'down' : 'up'} ml-1`}></i>}
                    </th>
                    <th className="px-4 py-4 font-hind">নাম</th>
                    <th className="px-4 py-4 text-center">মোট নম্বর</th>
                    <th className="px-4 py-4 text-center">গ্রেড</th>
                    <th 
                      className="px-4 py-4 text-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => {
                        if (batchSortKey === 'RANK') setBatchSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
                        else { setBatchSortKey('RANK'); setBatchSortOrder('ASC'); }
                      }}
                    >
                      স্থান {batchSortKey === 'RANK' && <i className={`fas fa-sort-${batchSortOrder === 'ASC' ? 'down' : 'up'} ml-1`}></i>}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700 font-sans">
                  {sortedBatchStudents.map(s => {
                    const res = getSpecificResult(s.id, batchFilter.class, batchFilter.year, batchFilter.exam);
                    if (!res) return null;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-black text-indigo-700">{s.roll}</td>
                        <td className="px-4 py-3 font-bold font-hind">{s.name}</td>
                        <td className="px-4 py-3 text-center font-black">{res.totalMarks}</td>
                        <td className="px-4 py-3 text-center font-bold text-green-600">{res.grade}</td>
                        <td className="px-4 py-3 text-center font-black text-amber-600">#{getRank(s.id)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="no-print mt-8 flex justify-center"><button onClick={() => window.print()} className="bg-indigo-900 text-white px-10 py-3 rounded-xl font-black shadow-lg hover:bg-black transition-all"><i className="fas fa-print mr-2"></i> মেধাতালিকা প্রিন্ট</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPanel;
