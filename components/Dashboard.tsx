
import React, { useState } from 'react';
import { ViewType, Notice } from '../types';

interface DashboardProps {
  setView: (view: ViewType) => void;
  studentCount: number;
  notices: Notice[];
}

const Dashboard: React.FC<DashboardProps> = ({ setView, studentCount, notices }) => {
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in pb-10 px-2">
      {/* Hero Section - Super Compressed */}
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 dark:from-gray-800 dark:to-gray-900 p-4 md:p-6 rounded-[28px] shadow-xl relative overflow-hidden border border-white/10">
        <div className="relative z-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-grow">
            <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-[1px] mb-2">প্রতিষ্ঠিত ২০১৯</span>
            <h1 className="text-xl md:text-3xl font-black mb-1 leading-tight drop-shadow-lg">
              আনওয়ারুল কুরআন একাডেমী
            </h1>
            <p className="text-indigo-100 text-[11px] md:text-xs leading-relaxed max-w-2xl font-medium opacity-90 line-clamp-1 md:line-clamp-2">
              পবিত্র কুরআন ও সুন্নাহর আলোকে জীবন গড়ার লক্ষ্যে আধুনিক প্রযুক্তি ও নৈতিক শিক্ষার এক অপূর্ব সমন্বয়।
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
             <div className="flex items-center gap-2 px-3 py-2 bg-indigo-600/50 backdrop-blur-md rounded-xl border border-white/20">
                <div className="w-7 h-7 bg-indigo-400/30 rounded-full flex items-center justify-center">
                   <i className="fas fa-users text-white text-[10px]"></i>
                </div>
                <div className="text-left">
                   <div className="text-sm font-black leading-none">{studentCount}</div>
                   <div className="text-[8px] uppercase font-bold opacity-70">শিক্ষার্থী</div>
                </div>
             </div>
             <button 
               onClick={() => setView('STUDENT_PORTAL')}
               className="px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-black shadow-lg hover:bg-indigo-50 transition-all flex items-center gap-2 text-[11px]"
             >
               ফলাফল দেখুন
               <i className="fas fa-arrow-right text-[10px]"></i>
             </button>
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 opacity-5 transform -rotate-12 pointer-events-none scale-75">
          <i className="fas fa-book-quran text-[150px] text-white"></i>
        </div>
      </div>

      {/* Action Cards - Side by Side */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => setView('TEACHER_DASHBOARD')}
          className="group cursor-pointer bg-white dark:bg-gray-800 p-3 md:p-4 rounded-[20px] shadow-sm border border-transparent hover:border-indigo-600 transition-all flex items-center gap-3"
        >
          <div className="bg-indigo-50 dark:bg-indigo-900/40 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
            <i className="fas fa-chalkboard-teacher text-sm text-indigo-600 dark:text-indigo-400 group-hover:text-white"></i>
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900 dark:text-gray-100 leading-none">শিক্ষক প্যানেল</h2>
            <p className="text-[9px] text-gray-500 mt-1">ম্যানেজমেন্ট পোর্টাল</p>
          </div>
        </div>

        <div 
          onClick={() => setView('STUDENT_PORTAL')}
          className="group cursor-pointer bg-white dark:bg-gray-800 p-3 md:p-4 rounded-[20px] shadow-sm border border-transparent hover:border-green-600 transition-all flex items-center gap-3"
        >
          <div className="bg-green-50 dark:bg-green-900/40 w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors">
            <i className="fas fa-user-graduate text-sm text-green-700 dark:text-green-400 group-hover:text-white"></i>
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900 dark:text-gray-100 leading-none">ছাত্র প্যানেল</h2>
            <p className="text-[9px] text-gray-500 mt-1">ফলাফল ও মার্কশিট</p>
          </div>
        </div>
      </div>

      {/* Notice Board - Now positioned directly underneath */}
      <div className="bg-white dark:bg-gray-800 rounded-[24px] shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="bg-amber-500 px-4 py-2 flex justify-between items-center">
          <h3 className="text-white font-black text-xs flex items-center gap-2">
            <i className="fas fa-bullhorn"></i> নোটিশ বোর্ড
          </h3>
          <span className="text-[9px] text-amber-100 font-bold uppercase">{notices.length}টি নোটিশ</span>
        </div>
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {notices.length > 0 ? notices.slice(0, 6).map(notice => (
            <div 
              key={notice.id} 
              onClick={() => setSelectedNotice(notice)}
              className="p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-transparent hover:border-amber-400 hover:shadow-sm cursor-pointer transition-all active:scale-95 group flex flex-col justify-between"
            >
              <p className="text-[10px] font-bold text-gray-800 dark:text-gray-200 leading-tight line-clamp-2 mb-1">{notice.text}</p>
              <span className="text-[8px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full self-start">{notice.date}</span>
            </div>
          )) : (
            <div className="col-span-full text-center py-6 opacity-30">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">কোন নোটিশ নেই</p>
            </div>
          )}
        </div>
      </div>

      {/* Trust Badges - Very Small */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: 'fa-shield-halved', text: 'নিরাপদ' },
          { icon: 'fa-bolt-lightning', text: 'দ্রুত' },
          { icon: 'fa-certificate', text: 'অফিসিয়াল' },
          { icon: 'fa-mobile-screen-button', text: 'রেসপন্সিভ' }
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center gap-1 group">
            <i className={`fas ${item.icon} text-indigo-500 text-[10px]`}></i>
            <span className="text-[8px] font-black text-gray-400 uppercase leading-none">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-indigo-950/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setSelectedNotice(null)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <i className="fas fa-bullhorn text-xs"></i>
                <h3 className="font-black text-sm">নোটিশ বিস্তারিত</h3>
              </div>
              <button onClick={() => setSelectedNotice(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="p-6">
              <span className="text-[9px] font-black text-amber-600 mb-2 block">{selectedNotice.date}</span>
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed font-bold whitespace-pre-wrap">
                {selectedNotice.text}
              </p>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setSelectedNotice(null)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-xs shadow-lg">বন্ধ করুন</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
