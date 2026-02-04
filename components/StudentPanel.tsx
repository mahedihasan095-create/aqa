
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Result } from '../types';

interface StudentPanelProps {
  students: Student[];
  results: Result[];
  subjects: Record<string, string[]>;
}

const CLASSES = ['প্লে', 'নার্সারী', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম'];
const YEARS = ['২০২৬', '২০২৭', '২০২৮', '২০২৯', '২০৩০'];
const EXAMS = ['প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'বার্ষিক পরীক্ষা'];

const StudentPanel: React.FC<StudentPanelProps> = ({ students, results, subjects: classSubjectsMap }) => {
  const [searchType, setSearchType] = useState<'BATCH' | 'INDIVIDUAL'>('INDIVIDUAL');
  const [batchFilter, setBatchFilter] = useState({ class: 'প্রথম', year: '২০২৬', exam: 'বার্ষিক পরীক্ষা' });
  const [indivSearch, setIndivSearch] = useState({ roll: '', class: 'প্রথম', year: '২০২৬', exam: 'বার্ষিক পরীক্ষা' });
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [searched, setSearched] = useState(false);

  const publishedResults = useMemo(() => results.filter(r => r.isPublished), [results]);

  useEffect(() => {
    setSearched(false);
    setFoundStudent(null);
  }, [indivSearch.roll, indivSearch.class, indivSearch.year, indivSearch.exam, searchType]);

  const getSpecificResult = (studentId: string, className: string, year: string, examName: string) => {
    return publishedResults.find(r => 
      r.studentId === studentId && 
      r.class === className && 
      r.year === year && 
      r.examName.trim() === examName.trim()
    );
  };

  const getSubjectsForClass = (className: string) => {
    return classSubjectsMap[className] || [];
  };

  const classRanking = useMemo(() => {
    const targetClass = searchType === 'BATCH' ? batchFilter.class : indivSearch.class;
    const targetYear = searchType === 'BATCH' ? batchFilter.year : indivSearch.year;
    const targetExam = searchType === 'BATCH' ? batchFilter.exam : indivSearch.exam;
    
    const classStudents = students.filter(s => s.studentClass === targetClass && s.year === targetYear);
    
    const scores = classStudents.map(student => {
      if (targetExam === 'বার্ষিক পরীক্ষা') {
        const r1 = getSpecificResult(student.id, targetClass, targetYear, 'প্রথম সাময়িক');
        const r2 = getSpecificResult(student.id, targetClass, targetYear, 'দ্বিতীয় সাময়িক');
        const r3 = getSpecificResult(student.id, targetClass, targetYear, 'বার্ষিক পরীক্ষা');
        
        const t1 = r1?.totalMarks || 0;
        const t2 = r2?.totalMarks || 0;
        const t3 = r3?.totalMarks || 0;
        
        return { studentId: student.id, score: (t1 + t2 + t3) / 3, hasResult: !!r3 };
      } else {
        const res = getSpecificResult(student.id, targetClass, targetYear, targetExam);
        return { studentId: student.id, score: res?.totalMarks || 0, hasResult: !!res };
      }
    });
    
    return scores
      .filter(s => s.hasResult)
      .sort((a, b) => b.score - a.score);
  }, [students, publishedResults, indivSearch, batchFilter, searchType]);

  const getRank = (studentId: string) => {
    const index = classRanking.findIndex(item => item.studentId === studentId);
    return index !== -1 ? index + 1 : '-';
  };

  const handleSearch = () => {
    const student = students.find(s => 
      s.roll.toString() === indivSearch.roll.toString() && 
      s.studentClass === indivSearch.class && 
      s.year === indivSearch.year
    );
    if (!student) {
      alert('শিক্ষার্থী পাওয়া যায়নি।');
      return;
    }
    setFoundStudent(student);
    setSearched(true);
  };

  const batchStudents = useMemo(() => {
    return students
      .filter(s => s.studentClass === batchFilter.class && s.year === batchFilter.year)
      .sort((a, b) => parseInt(a.roll) - parseInt(b.roll));
  }, [students, batchFilter]);

  const currentClassSubjects = useMemo(() => {
    const targetClass = (searchType === 'BATCH') ? batchFilter.class : indivSearch.class;
    return getSubjectsForClass(targetClass);
  }, [indivSearch.class, batchFilter.class, classSubjectsMap, searchType]);

  const isAnnual = (searchType === 'BATCH' ? batchFilter.exam : indivSearch.exam) === 'বার্ষিক পরীক্ষা';

  return (
    <div className="space-y-6">
      {/* ট্যাব সিলেকশন */}
      <div className="flex flex-wrap gap-2 no-print">
        <button onClick={() => setSearchType('INDIVIDUAL')} className={`flex-1 py-4 rounded-xl border-2 transition-all font-bold ${searchType === 'INDIVIDUAL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600'}`}>একক পরীক্ষা</button>
        <button onClick={() => setSearchType('BATCH')} className={`flex-1 py-4 rounded-xl border-2 transition-all font-bold ${searchType === 'BATCH' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600'}`}>শ্রেণী ভিত্তিক তালিকা</button>
      </div>

      {/* একক সার্চ ও ফলাফল */}
      {searchType === 'INDIVIDUAL' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border dark:border-gray-700 max-w-2xl mx-auto no-print">
            <h3 className="text-xl font-bold mb-6 text-indigo-800 dark:text-indigo-400 text-center">ফলাফল অনুসন্ধান করুন</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div><label className="text-xs font-bold block mb-1">শ্রেণী</label><select className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded" value={indivSearch.class} onChange={e => setIndivSearch({...indivSearch, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1">সাল</label><select className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded" value={indivSearch.year} onChange={e => setIndivSearch({...indivSearch, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1">পরীক্ষা</label><select className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded" value={indivSearch.exam} onChange={e => setIndivSearch({...indivSearch, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1">রোল নম্বর</label><input type="text" className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded" value={indivSearch.roll} onChange={e => setIndivSearch({...indivSearch, roll: e.target.value})} /></div>
              <div className="md:col-span-4 mt-2"><button onClick={handleSearch} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold shadow transform active:scale-95 transition-all">ফলাফল দেখুন</button></div>
            </div>
          </div>

          {searched && foundStudent && (
            getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam) ? (
              <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-5xl mx-auto print-area">
                 <div className="text-center mb-8 border-b-2 border-indigo-100 pb-4">
                   <h1 className="text-4xl font-black text-indigo-900 dark:text-indigo-400 leading-tight">আনওয়ারুল কুরআন একাডেমী</h1>
                   <div className="inline-block mt-4 bg-indigo-600 text-white px-6 py-1 rounded-full font-bold uppercase tracking-wider">{indivSearch.exam} মূল্যায়নপত্র</div>
                 </div>
                 <div className="grid grid-cols-2 mb-8 gap-4 text-sm md:text-base">
                   <div className="space-y-1">
                     <p><strong>নাম:</strong> {foundStudent.name}</p>
                     <p><strong>পিতা:</strong> {foundStudent.fatherName}</p>
                     <p><strong>গ্রাম:</strong> {foundStudent.village}</p>
                   </div>
                   <div className="text-right space-y-1">
                     <p><strong>রোল:</strong> {foundStudent.roll}</p>
                     <p><strong>শ্রেণী:</strong> {foundStudent.studentClass} ({foundStudent.year})</p>
                     <p><strong>মোবাইল:</strong> {foundStudent.mobile}</p>
                   </div>
                 </div>
                 
                 <div className="overflow-x-auto">
                   <table className="w-full text-left mb-8 border-collapse border border-gray-300">
                     <thead className="bg-gray-100 dark:bg-gray-700 text-xs md:text-sm uppercase">
                       <tr>
                         <th className="px-4 py-3 border border-gray-300">বিষয়</th>
                         {isAnnual && (
                           <>
                             <th className="px-4 py-3 border border-gray-300 text-center">১ম সাময়িক</th>
                             <th className="px-4 py-3 border border-gray-300 text-center">২য় সাময়িক</th>
                           </>
                         )}
                         <th className="px-4 py-3 border border-gray-300 text-center">{indivSearch.exam === 'বার্ষিক পরীক্ষা' ? 'বার্ষিক' : 'প্রাপ্ত নম্বর'}</th>
                         {isAnnual && <th className="px-4 py-3 border border-gray-300 text-center bg-indigo-50 dark:bg-indigo-900/20">গড়</th>}
                       </tr>
                     </thead>
                     <tbody className="text-sm md:text-base">
                       {currentClassSubjects.map(sub => {
                         const r1 = getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, 'প্রথম সাময়িক');
                         const r2 = getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, 'দ্বিতীয় সাময়িক');
                         const r3 = getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, 'বার্ষিক পরীক্ষা');
                         const rCurrent = getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam);

                         const m1 = r1?.marks.find(m => m.subjectName === sub)?.marks || 0;
                         const m2 = r2?.marks.find(m => m.subjectName === sub)?.marks || 0;
                         const m3 = r3?.marks.find(m => m.subjectName === sub)?.marks || 0;
                         const mCurrent = rCurrent?.marks.find(m => m.subjectName === sub)?.marks || 0;
                         
                         const avg = isAnnual ? ((m1 + m2 + m3) / 3).toFixed(1) : '-';

                         return (
                           <tr key={sub} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                             <td className="px-4 py-3 border border-gray-300 font-medium">{sub}</td>
                             {isAnnual && (
                               <>
                                 <td className="px-4 py-3 border border-gray-300 text-center">{m1}</td>
                                 <td className="px-4 py-3 border border-gray-300 text-center">{m2}</td>
                               </>
                             )}
                             <td className="px-4 py-3 border border-gray-300 text-center font-bold text-indigo-700 dark:text-indigo-400">{mCurrent}</td>
                             {isAnnual && <td className="px-4 py-3 border border-gray-300 text-center font-black bg-indigo-50/50 dark:bg-indigo-900/10">{avg}</td>}
                           </tr>
                         );
                       })}
                     </tbody>
                     <tfoot className="font-bold bg-gray-50 dark:bg-gray-800">
                       <tr>
                         <td className="px-4 py-4 border border-gray-300 text-right">মোট প্রাপ্ত নম্বর</td>
                         {isAnnual && (
                           <>
                             <td className="px-4 py-4 border border-gray-300 text-center">{getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, 'প্রথম সাময়িক')?.totalMarks || 0}</td>
                             <td className="px-4 py-4 border border-gray-300 text-center">{getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, 'দ্বিতীয় সাময়িক')?.totalMarks || 0}</td>
                           </>
                         )}
                         <td className="px-4 py-4 border border-gray-300 text-center text-xl text-indigo-800 dark:text-indigo-300">
                           {getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam)?.totalMarks || 0}
                         </td>
                         {isAnnual && (
                           <td className="px-4 py-4 border border-gray-300 text-center text-xl bg-indigo-50 dark:bg-indigo-900/20">
                             {(( (getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, 'প্রথম সাময়িক')?.totalMarks || 0) + 
                                (getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, 'দ্বিতীয় সাময়িক')?.totalMarks || 0) + 
                                (getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, 'বার্ষিক পরীক্ষা')?.totalMarks || 0) ) / 3).toFixed(1)}
                           </td>
                         )}
                       </tr>
                     </tfoot>
                   </table>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mt-10">
                    <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-3xl border-2 border-green-100 dark:border-green-800">
                      <span className="text-xs font-bold uppercase text-green-600 block mb-2">গ্রেড</span>
                      <span className="font-black text-4xl block text-green-700 dark:text-green-400">
                        {getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam)?.grade || '-'}
                      </span>
                    </div>
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border-2 border-amber-100 dark:border-amber-800 shadow-inner">
                      <span className="text-xs font-bold uppercase text-amber-600 block mb-2">{isAnnual ? 'চূড়ান্ত মেধা স্থান' : 'মেধা স্থান'}</span>
                      <span className="font-black text-4xl block text-amber-700 dark:text-amber-400">#{getRank(foundStudent.id)}</span>
                    </div>
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border-2 border-blue-100 dark:border-blue-800">
                      <span className="text-xs font-bold uppercase text-blue-600 block mb-2">ফলাফল</span>
                      <span className="font-black text-2xl block text-blue-700 dark:text-blue-400">উত্তীর্ণ</span>
                    </div>
                 </div>

                 <div className="no-print mt-12 flex justify-center gap-4">
                   <button onClick={() => window.print()} className="bg-indigo-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black shadow-xl transition-all flex items-center gap-2">
                     <i className="fas fa-print"></i> মার্কশিট প্রিন্ট করুন
                   </button>
                 </div>
              </div>
            ) : (
              <div className="text-center p-20 bg-amber-50 dark:bg-amber-900/10 rounded-3xl max-w-xl mx-auto border border-amber-100 dark:border-amber-800 font-bold text-amber-700 shadow-lg">
                <i className="fas fa-exclamation-triangle text-4xl mb-4 block"></i>
                ফলাফল এখনো প্রকাশিত হয়নি অথবা এই শিক্ষার্থীর তথ্য পাওয়া যায়নি।
              </div>
            )
          )}
        </div>
      )}

      {/* শ্রেণী ভিত্তিক তালিকা ও প্রিন্ট অপশন */}
      {searchType === 'BATCH' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border dark:border-gray-700 overflow-hidden animate-fade-in">
            <div className="p-8 bg-indigo-50 dark:bg-indigo-900/20 border-b dark:border-gray-700 no-print">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1 text-gray-400">শ্রেণী</label>
                  <select className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600" value={batchFilter.class} onChange={e => setBatchFilter({...batchFilter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-gray-400">সাল</label>
                  <select className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600" value={batchFilter.year} onChange={e => setBatchFilter({...batchFilter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-gray-400">পরীক্ষা</label>
                  <select className="w-full p-2.5 rounded-xl border dark:bg-gray-700 dark:border-gray-600" value={batchFilter.exam} onChange={e => setBatchFilter({...batchFilter, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              {/* প্রিন্ট হেডার - শুধুমাত্র প্রিন্টে দেখা যাবে */}
              <div className="hidden print:block text-center mb-8 border-b-2 border-gray-800 pb-4">
                <h1 className="text-3xl font-black mb-1">আনওয়ারুল কুরআন একাডেমী</h1>
                <h2 className="text-xl font-bold uppercase tracking-widest">{batchFilter.exam} - ফলাফল তালিকা</h2>
                <p className="text-sm mt-2">শ্রেণী: {batchFilter.class} | শিক্ষাবর্ষ: {batchFilter.year}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="bg-gray-100 dark:bg-gray-700 font-bold text-[11px] uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-4 border-b border-gray-200 dark:border-gray-600">রোল</th>
                      <th className="px-4 py-4 border-b border-gray-200 dark:border-gray-600">নাম</th>
                      {currentClassSubjects.map(s => <th key={s} className="px-3 py-4 border-b border-gray-200 dark:border-gray-600 text-center">{s}</th>)}
                      
                      {isAnnual && (
                        <>
                          <th className="px-3 py-4 border-b border-gray-200 dark:border-gray-600 text-center bg-gray-50 dark:bg-gray-800 font-black">১ম সাময়িক (মোট)</th>
                          <th className="px-3 py-4 border-b border-gray-200 dark:border-gray-600 text-center bg-gray-50 dark:bg-gray-800 font-black">২য় সাময়িক (মোট)</th>
                        </>
                      )}
                      
                      <th className="px-4 py-4 border-b border-gray-200 dark:border-gray-600 text-center font-black">{isAnnual ? 'বার্ষিক (মোট)' : 'মোট নম্বর'}</th>
                      {isAnnual && <th className="px-4 py-4 border-b border-gray-200 dark:border-gray-600 text-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 font-black">৩ পরীক্ষার গড়</th>}
                      <th className="px-4 py-4 border-b border-gray-200 dark:border-gray-600 text-center">গ্রেড</th>
                      <th className="px-4 py-4 border-b border-gray-200 dark:border-gray-600 text-center bg-amber-50/30 dark:bg-amber-900/5">স্থান</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700 text-xs md:text-sm">
                    {batchStudents.map(s => {
                      const rAnnual = getSpecificResult(s.id, batchFilter.class, batchFilter.year, 'বার্ষিক পরীক্ষা');
                      const r1 = getSpecificResult(s.id, batchFilter.class, batchFilter.year, 'প্রথম সাময়িক');
                      const r2 = getSpecificResult(s.id, batchFilter.class, batchFilter.year, 'দ্বিতীয় সাময়িক');
                      const rCurrent = getSpecificResult(s.id, batchFilter.class, batchFilter.year, batchFilter.exam);
                      if (!rCurrent) return null;

                      const combinedAvg = isAnnual 
                        ? (((r1?.totalMarks || 0) + (r2?.totalMarks || 0) + (rAnnual?.totalMarks || 0)) / 3).toFixed(1)
                        : '-';

                      return (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-black text-indigo-700 dark:text-indigo-400">{s.roll}</td>
                          <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-bold">{s.name}</td>
                          {currentClassSubjects.map(sub => (
                            <td key={sub} className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 text-center text-gray-600 dark:text-gray-400">
                              {rCurrent.marks.find(m => m.subjectName === sub)?.marks || '0'}
                            </td>
                          ))}
                          {isAnnual && (
                            <>
                              <td className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 text-center bg-gray-50/50 dark:bg-gray-800/20 font-medium text-gray-500">{r1?.totalMarks || 0}</td>
                              <td className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 text-center bg-gray-50/50 dark:bg-gray-800/20 font-medium text-gray-500">{r2?.totalMarks || 0}</td>
                            </>
                          )}
                          <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center font-black text-indigo-600">{rCurrent.totalMarks}</td>
                          {isAnnual && <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center font-black bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-800 dark:text-indigo-300">{combinedAvg}</td>}
                          <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center font-bold text-green-600">{rCurrent.grade}</td>
                          <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-center font-black bg-amber-50/30 dark:bg-amber-900/5">#{getRank(s.id)}</td>
                        </tr>
                      )
                    }).filter(row => row !== null)}
                  </tbody>
                </table>
              </div>
              
              {batchStudents.filter(s => getSpecificResult(s.id, batchFilter.class, batchFilter.year, batchFilter.exam)).length > 0 && (
                <div className="no-print mt-12 flex justify-center">
                  <button onClick={() => window.print()} className="bg-indigo-900 hover:bg-black text-white px-12 py-5 rounded-2xl font-black shadow-2xl transform active:scale-95 transition-all flex items-center gap-3">
                    <i className="fas fa-print text-xl"></i> পূর্ণাঙ্গ তালিকা প্রিন্ট করুন
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPanel;
