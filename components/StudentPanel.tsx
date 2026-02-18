
import React, { useState, useMemo, useEffect } from 'react';
import { Student, Result } from '../types';

interface StudentPanelProps {
  students: Student[];
  results: Result[];
  subjects: Record<string, string[]>;
  principalSignature?: string;
  logo?: string;
}

const CLASSES = ['প্লে', 'নার্সারী', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম'];
const YEARS = ['২০২৬', '২০২৭', '২০২৮', '২০২৯', '২০৩০'];
const EXAMS = ['প্রথম সাময়িক', 'দ্বিতীয় সাময়িক', 'বার্ষিক পরীক্ষা'];

const SchoolLogo = ({ size = "w-24 h-24", logo }: { size?: string, logo?: string }) => (
  <div className={`${size} flex items-center justify-center`}>
    {logo ? (
      <img src={logo} alt="School Logo" className="w-full h-full object-contain" />
    ) : (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <circle cx="100" cy="100" r="98" fill="none" stroke="#ed1c24" strokeWidth="2"/>
        <circle cx="100" cy="100" r="94" fill="none" stroke="#000" strokeWidth="1"/>
        <circle cx="100" cy="100" r="80" fill="none" stroke="#ed1c24" strokeWidth="1"/>
        
        <path id="curveTopLarge" d="M 30,100 A 70,70 0 1,1 170,100" fill="none" />
        <text className="text-[18px] font-bold fill-[#2e3192]">
          <textPath href="#curveTopLarge" startOffset="50%" textAnchor="middle">
            আনওয়ারুল কুরআন একাডেমী
          </textPath>
        </text>

        <path id="curveBottomLarge" d="M 30,100 A 70,70 0 0,0 170,100" fill="none" />
        <text className="text-[10px] font-bold fill-black">
          <textPath href="#curveBottomLarge" startOffset="50%" textAnchor="middle">
            কলাবাড়ী মাহিগঞ্জ, ২৯নং ওয়ার্ড, রংপুর
          </textPath>
        </text>

        <circle cx="100" cy="70" r="25" fill="#ed1c24" />
        <g transform="translate(100,70)">
          {[...Array(30)].map((_, i) => (
            <line key={i} x1="0" y1="0" x2="0" y2="-40" stroke="#ed1c24" strokeWidth="0.5" transform={`rotate(${i * 12})`} />
          ))}
        </g>
        
        <g transform="translate(60,75)">
          <rect x="0" y="0" width="80" height="60" fill="white" stroke="black" strokeWidth="2" />
          <line x1="40" y1="0" x2="40" y2="60" stroke="black" strokeWidth="2" />
          <path d="M 5,10 Q 20,5 35,10 M 5,20 Q 20,15 35,20 M 5,30 Q 20,25 35,30 M 5,40 Q 20,35 35,40 M 5,50 Q 20,45 35,50" fill="none" stroke="gray" strokeWidth="1" />
          <path d="M 45,10 Q 60,5 75,10 M 45,20 Q 60,15 75,20 M 45,30 Q 60,25 75,30 M 45,40 Q 60,35 75,40 M 45,50 Q 60,45 75,50" fill="none" stroke="gray" strokeWidth="1" />
        </g>
        <path d="M 60,135 L 100,155 L 140,135 L 100,145 Z" fill="black" />
      </svg>
    )}
  </div>
);

const StudentPanel: React.FC<StudentPanelProps> = ({ students, results, subjects: classSubjectsMap, principalSignature, logo }) => {
  const [searchType, setSearchType] = useState<'BATCH' | 'INDIVIDUAL'>('INDIVIDUAL');
  const [batchFilter, setBatchFilter] = useState({ class: 'প্রথম', year: '২০২৬', exam: 'বার্ষিক পরীক্ষা' });
  const [batchSortBy, setBatchSortBy] = useState<'RANK' | 'ROLL'>('RANK');
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

  const calculateGrandAverage = (studentId: string, className: string, year: string) => {
    const r1 = getSpecificResult(studentId, className, year, 'প্রথম সাময়িক');
    const r2 = getSpecificResult(studentId, className, year, 'দ্বিতীয় সাময়িক');
    const r3 = getSpecificResult(studentId, className, year, 'বার্ষিক পরীক্ষা');
    
    const t1 = r1?.totalMarks || 0;
    const t2 = r2?.totalMarks || 0;
    const t3 = r3?.totalMarks || 0;
    
    return {
      term1: t1,
      term2: t2,
      annual: t3,
      grandTotal: t1 + t2 + t3,
      average: ((t1 + t2 + t3) / 3).toFixed(2),
      hasAnnual: !!r3
    };
  };

  const classRanking = useMemo(() => {
    const targetClass = searchType === 'BATCH' ? batchFilter.class : indivSearch.class;
    const targetYear = searchType === 'BATCH' ? batchFilter.year : indivSearch.year;
    const targetExam = searchType === 'BATCH' ? batchFilter.exam : indivSearch.exam;
    
    const classStudents = students.filter(s => s.studentClass === targetClass && s.year === targetYear);
    const scores = classStudents.map(student => {
      if (targetExam === 'বার্ষিক পরীক্ষা') {
        const stats = calculateGrandAverage(student.id, targetClass, targetYear);
        return { studentId: student.id, score: parseFloat(stats.average), hasResult: stats.hasAnnual };
      } else {
        const res = getSpecificResult(student.id, targetClass, targetYear, targetExam);
        return { studentId: student.id, score: res?.totalMarks || 0, hasResult: !!res };
      }
    });
    return scores.filter(s => s.hasResult).sort((a, b) => b.score - a.score);
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
    if (!student) { alert('শিক্ষার্থী পাওয়া যায়নি।'); return; }
    setFoundStudent(student);
    setSearched(true);
  };

  const isAnnualView = (searchType === 'BATCH' ? batchFilter.exam : indivSearch.exam) === 'বার্ষিক পরীক্ষা';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 no-print">
        <button onClick={() => setSearchType('INDIVIDUAL')} className={`flex-1 py-4 rounded-xl border-2 transition-all font-bold ${searchType === 'INDIVIDUAL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-700'}`}>একক মার্কশিট</button>
        <button onClick={() => setSearchType('BATCH')} className={`flex-1 py-4 rounded-xl border-2 transition-all font-bold ${searchType === 'BATCH' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-700'}`}>শ্রেণী ভিত্তিক মেধা তালিকা</button>
      </div>

      {searchType === 'INDIVIDUAL' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-md border dark:border-gray-700 max-w-2xl mx-auto no-print">
            <h3 className="text-xl font-black mb-6 text-indigo-900 dark:text-indigo-300 text-center">ফলাফল অনুসন্ধান</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div><label className="text-xs font-bold block mb-1 text-gray-500 dark:text-gray-400">শ্রেণী</label><select className="w-full p-2.5 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl" value={indivSearch.class} onChange={e => setIndivSearch({...indivSearch, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1 text-gray-500 dark:text-gray-400">সাল</label><select className="w-full p-2.5 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl" value={indivSearch.year} onChange={e => setIndivSearch({...indivSearch, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1 text-gray-500 dark:text-gray-400">পরীক্ষা</label><select className="w-full p-2.5 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl" value={indivSearch.exam} onChange={e => setIndivSearch({...indivSearch, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select></div>
              <div><label className="text-xs font-bold block mb-1 text-gray-500 dark:text-gray-400">রোল নম্বর</label><input type="text" className="w-full p-2.5 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl" value={indivSearch.roll} onChange={e => setIndivSearch({...indivSearch, roll: e.target.value})} /></div>
              <div className="md:col-span-4 mt-2"><button onClick={handleSearch} className="w-full bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg">ফলাফল দেখুন</button></div>
            </div>
          </div>

          {searched && foundStudent && (
            getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam) ? (
              <div className="bg-white dark:bg-gray-800 p-4 md:p-8 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-700 max-w-4xl mx-auto print-area overflow-hidden">
                 <div className="flex items-center gap-6 mb-4 border-b-2 border-indigo-50 dark:border-indigo-900 pb-4 print:pb-2 print:mb-2 print-header">
                   <div className="shrink-0">
                     <SchoolLogo size="w-16 h-16 md:w-20 md:h-20" logo={logo} />
                   </div>
                   <div className="flex-grow text-left">
                     <h1 className="text-2xl md:text-4xl font-black text-indigo-900 dark:text-indigo-300 leading-tight">আনওয়ারুল কুরআন একাডেমী</h1>
                     <p className="text-[10px] md:text-xs font-bold text-gray-600 dark:text-gray-400">কলাবাড়ী মাহিগঞ্জ, ২৯নং ওয়ার্ড, রংপুর</p>
                     <div className="inline-block mt-1 bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider">
                       {indivSearch.exam} মূল্যায়নপত্র - {indivSearch.year}
                     </div>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 mb-4 gap-3 text-[10px] md:text-xs text-gray-800 dark:text-gray-200">
                   <div className="space-y-1 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border dark:border-gray-600">
                     <p><strong>নাম:</strong> {foundStudent.name}</p>
                     <p><strong>পিতা:</strong> {foundStudent.fatherName}</p>
                     <p><strong>মাতা:</strong> {foundStudent.motherName}</p>
                     <p><strong>গ্রাম:</strong> {foundStudent.village}</p>
                   </div>
                   <div className="space-y-1 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border dark:border-gray-600">
                     <p><strong>রোল:</strong> {foundStudent.roll}</p>
                     <p><strong>শ্রেণী:</strong> {foundStudent.studentClass}</p>
                     <p><strong>শিক্ষাবর্ষ:</strong> {foundStudent.year}</p>
                     <p><strong>মোবাইল:</strong> {foundStudent.mobile || '-'}</p>
                   </div>
                 </div>
                 
                 <div className="overflow-x-auto mb-4">
                   <table className="w-full text-left border-collapse border border-gray-200 dark:border-gray-700 print-table">
                     <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] md:text-xs">
                       <tr>
                         <th className="px-3 py-2 border border-gray-200 dark:border-gray-700">বিষয়ের নাম</th>
                         <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center">পূর্ণমান</th>
                         <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center">প্রাপ্ত নম্বর</th>
                         <th className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center">গ্রেড</th>
                       </tr>
                     </thead>
                     <tbody className="text-gray-800 dark:text-gray-200 text-[10px] md:text-xs">
                       {getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam)?.marks.map(m => (
                         <tr key={m.subjectName}>
                           <td className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 font-bold">{m.subjectName}</td>
                           <td className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-center">১০০</td>
                           <td className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-center font-black text-indigo-700 dark:text-indigo-400">{m.marks}</td>
                           <td className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-center font-bold">
                             {m.marks >= 80 ? 'A+' : m.marks >= 70 ? 'A' : m.marks >= 60 ? 'A-' : m.marks >= 50 ? 'B' : m.marks >= 40 ? 'C' : m.marks >= 33 ? 'D' : 'F'}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                     <tfoot className="bg-indigo-50 dark:bg-indigo-900/20 font-black text-gray-900 dark:text-gray-100 text-[10px] md:text-xs">
                       <tr>
                         <td colSpan={2} className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right uppercase tracking-wider">চলতি পরীক্ষার মোট নম্বর:</td>
                         <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center text-sm md:text-lg text-indigo-700 dark:text-indigo-300">
                           {getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam)?.totalMarks}
                         </td>
                         <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center">
                           {getSpecificResult(foundStudent.id, indivSearch.class, indivSearch.year, indivSearch.exam)?.grade}
                         </td>
                       </tr>
                     </tfoot>
                   </table>
                 </div>

                 {isAnnualView && (
                   <div className="mt-4 border-t-2 border-indigo-100 dark:border-indigo-900 pt-3">
                     <h3 className="text-xs md:text-sm font-black text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                       <i className="fas fa-chart-line"></i> বার্ষিক সমন্বিত ফলাফল (৩ পরীক্ষা)
                     </h3>
                     <div className="grid grid-cols-4 gap-2">
                       {[
                         { label: '১ম সাময়িক', value: calculateGrandAverage(foundStudent.id, indivSearch.class, indivSearch.year).term1, color: 'indigo' },
                         { label: '২য় সাময়িক', value: calculateGrandAverage(foundStudent.id, indivSearch.class, indivSearch.year).term2, color: 'blue' },
                         { label: 'বার্ষিক', value: calculateGrandAverage(foundStudent.id, indivSearch.class, indivSearch.year).annual, color: 'purple' },
                         { label: 'চূড়ান্ত গড়', value: calculateGrandAverage(foundStudent.id, indivSearch.class, indivSearch.year).average, color: 'green', isAvg: true }
                       ].map((item, idx) => (
                         <div key={idx} className={`p-2 bg-${item.color}-50 dark:bg-${item.color}-900/20 border border-${item.color}-200 dark:border-${item.color}-800 rounded-xl text-center shadow-sm`}>
                            <span className={`text-[8px] font-black text-${item.color}-600 dark:text-${item.color}-400 block uppercase`}>{item.label}</span>
                            <span className={`font-black ${item.isAvg ? 'text-sm md:text-lg' : 'text-xs md:text-sm'} text-${item.color}-700 dark:text-${item.color}-300`}>{item.value}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 <div className="mt-6 grid grid-cols-2 gap-3">
                   <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 text-center">
                     <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 block mb-1 uppercase">শ্রেণীতে স্থান</span>
                     <span className="font-black text-2xl text-amber-700 dark:text-amber-300">#{getRank(foundStudent.id)}</span>
                   </div>
                   <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 text-center">
                     <span className="text-[9px] font-black text-green-600 dark:text-green-400 block mb-1 uppercase">ফলাফল</span>
                     <span className="font-black text-xl text-green-700 dark:text-green-300">উত্তীর্ণ</span>
                   </div>
                 </div>

                 <div className="mt-12 flex justify-between items-end border-t border-dashed dark:border-gray-700 pt-6 px-2 print-footer">
                   <div className="text-center">
                     <div className="w-24 border-b border-gray-400 dark:border-gray-500 mb-1 mx-auto"></div>
                     <p className="text-[9px] font-bold text-gray-500">অভিভাবক</p>
                   </div>
                   <div className="text-center">
                     <div className="w-24 border-b border-gray-400 dark:border-gray-500 mb-1 mx-auto"></div>
                     <p className="text-[9px] font-bold text-gray-500">শ্রেণী শিক্ষক</p>
                   </div>
                   <div className="text-center relative">
                     {principalSignature && (
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-8 pointer-events-none">
                         <img src={principalSignature} alt="Principal Signature" className="w-full h-full object-contain" />
                       </div>
                     )}
                     <div className="w-24 border-b border-gray-400 dark:border-gray-500 mb-1 mx-auto"></div>
                     <p className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400">অধ্যক্ষ</p>
                   </div>
                 </div>

                 <div className="no-print mt-8 flex justify-center gap-4">
                   <button onClick={() => window.print()} className="bg-indigo-900 text-white px-8 py-3 rounded-xl font-black shadow-xl flex items-center gap-2"><i className="fas fa-print"></i> প্রিন্ট মার্কশিট</button>
                   <button onClick={() => setSearched(false)} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-6 py-3 rounded-xl font-bold">নতুন অনুসন্ধান</button>
                 </div>
              </div>
            ) : (
              <div className="text-center p-20 bg-amber-50 dark:bg-amber-900/20 rounded-[40px] max-w-xl mx-auto border border-amber-200 dark:border-amber-800 font-bold text-amber-700 dark:text-amber-400 shadow-xl">
                <i className="fas fa-exclamation-triangle text-6xl mb-6 block text-amber-500"></i>
                <p className="text-xl">ফলাফল এখনো প্রকাশিত হয়নি।</p>
              </div>
            )
          )}
        </div>
      )}

      {searchType === 'BATCH' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-[40px] shadow-xl border dark:border-gray-700 overflow-hidden print-area">
            <div className="p-8 bg-indigo-50 dark:bg-indigo-900/30 no-print border-b dark:border-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-300">শ্রেণী ভিত্তিক মেধা তালিকা</h2>
                <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                  <i className="fas fa-print"></i> প্রিন্ট করুন
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="text-[10px] font-black block mb-1 text-gray-400 uppercase ml-1">শ্রেণী</label><select className="w-full p-3 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold" value={batchFilter.class} onChange={e => setBatchFilter({...batchFilter, class: e.target.value})}>{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-[10px] font-black block mb-1 text-gray-400 uppercase ml-1">সাল</label><select className="w-full p-3 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold" value={batchFilter.year} onChange={e => setBatchFilter({...batchFilter, year: e.target.value})}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                <div><label className="text-[10px] font-black block mb-1 text-gray-400 uppercase ml-1">পরীক্ষা</label><select className="w-full p-3 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold" value={batchFilter.exam} onChange={e => setBatchFilter({...batchFilter, exam: e.target.value})}>{EXAMS.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select></div>
                <div>
                  <label className="text-[10px] font-black block mb-1 text-gray-400 uppercase ml-1">সাজানোর ধরণ</label>
                  <select 
                    className="w-full p-3 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold border-2 border-indigo-200 dark:border-indigo-800" 
                    value={batchSortBy} 
                    onChange={e => setBatchSortBy(e.target.value as 'RANK' | 'ROLL')}
                  >
                    <option value="RANK">মেধা ক্রম অনুযায়ী</option>
                    <option value="ROLL">রোল নম্বর অনুযায়ী</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-2 md:p-3">
              <div className="print-header hidden mb-4 text-center">
                <SchoolLogo size="w-16 h-16 mx-auto mb-2" logo={logo} />
                <h1 className="text-xl font-black">আনওয়ারুল কুরআন একাডেমী</h1>
                <h2 className="text-lg font-bold">{batchFilter.class} - {batchFilter.exam} ({batchFilter.year})</h2>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">শ্রেণী ভিত্তিক মেধা তালিকা</h3>
              </div>
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse print-table">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-300 font-black text-[9px] uppercase tracking-tighter">
                    <tr>
                      <th className="compact-th border-b dark:border-gray-600">রোল</th>
                      <th className="compact-th border-b dark:border-gray-600 text-left min-w-[90px]">নাম</th>
                      
                      {(classSubjectsMap[batchFilter.class] || []).map(s => <th key={s} className="compact-th border-b dark:border-gray-600">{s}</th>)}
                      
                      {isAnnualView ? (
                        <>
                          <th className="compact-th border-b dark:border-gray-600 font-black">১ম</th>
                          <th className="compact-th border-b dark:border-gray-600 font-black">২য়</th>
                          <th className="compact-th border-b dark:border-gray-600 font-black">বার্ষিক</th>
                          <th className="compact-th border-b dark:border-gray-600 font-black bg-gray-100 dark:bg-gray-700">গড়</th>
                        </>
                      ) : (
                        <th className="compact-th border-b dark:border-gray-600 font-black">মোট</th>
                      )}
                      <th className="compact-th border-b dark:border-gray-600">গ্রেড</th>
                      <th className="compact-th border-b dark:border-gray-600">স্থান</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                    {students.filter(s => s.studentClass === batchFilter.class && s.year === batchFilter.year).sort((a,b) => {
                      if (batchSortBy === 'ROLL') {
                        return parseInt(a.roll) - parseInt(b.roll);
                      }
                      
                      const resA = getSpecificResult(a.id, batchFilter.class, batchFilter.year, batchFilter.exam);
                      const resB = getSpecificResult(b.id, batchFilter.class, batchFilter.year, batchFilter.exam);
                      if (isAnnualView) {
                        return parseFloat(calculateGrandAverage(b.id, batchFilter.class, batchFilter.year).average) - parseFloat(calculateGrandAverage(a.id, batchFilter.class, batchFilter.year).average);
                      }
                      return (resB?.totalMarks || 0) - (resA?.totalMarks || 0);
                    }).map(s => {
                      const res = getSpecificResult(s.id, batchFilter.class, batchFilter.year, batchFilter.exam);
                      if (!res) return null;
                      
                      const annualStats = isAnnualView ? calculateGrandAverage(s.id, batchFilter.class, batchFilter.year) : null;
                      
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                          <td className="compact-td font-black text-indigo-700 dark:text-indigo-400">{s.roll}</td>
                          <td className="compact-td font-bold text-left">{s.name}</td>
                          
                          {(classSubjectsMap[batchFilter.class] || []).map(sub => (
                            <td key={sub} className="compact-td font-bold">{res.marks.find(m => m.subjectName === sub)?.marks || '0'}</td>
                          ))}

                          {isAnnualView ? (
                            <>
                              <td className="compact-td font-bold">{annualStats?.term1}</td>
                              <td className="compact-td font-bold">{annualStats?.term2}</td>
                              <td className="compact-td font-black">{annualStats?.annual}</td>
                              <td className="compact-td font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10">{annualStats?.average}</td>
                            </>
                          ) : (
                            <td className="compact-td font-black text-indigo-700 dark:text-indigo-300">{res.totalMarks}</td>
                          )}
                          
                          <td className="compact-td font-bold">
                            <span className={`px-1 rounded text-[9px] font-black ${res.grade === 'F' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                              {res.grade}
                            </span>
                          </td>
                          <td className="compact-td font-black text-amber-600">#{getRank(s.id)}</td>
                        </tr>
                      )
                    }).filter(r => r !== null)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPanel;
