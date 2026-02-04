
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
    <div className="space-y-8 animate-fade-in">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-black text-indigo-900 dark:text-indigo-400 mb-4 leading-tight">
                আনওয়ারুল কুরআন একাডেমী
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed max-w-2xl">
                পবিত্র কুরআন ও সুন্নাহর আলোকে জীবন গড়ার লক্ষ্যে আমাদের এই আধুনিক ডিজিটাল প্ল্যাটফর্মে আপনাকে স্বাগতম। এখান থেকে ভর্তি কার্যক্রম, ফলাফল এবং নোটিশ বোর্ড পরিচালনা করা হয়।
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 opacity-5 dark:opacity-10 transform -rotate-12 pointer-events-none">
              <i className="fas fa-book-quran text-[200px]"></i>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teacher Panel Card */}
            <div 
              onClick={() => setView('TEACHER_DASHBOARD')}
              className="group cursor-pointer bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border-2 border-transparent hover:border-indigo-600 transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="bg-indigo-100 dark:bg-indigo-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                <i className="fas fa-chalkboard-teacher text-2xl text-indigo-700 dark:text-indigo-400 group-hover:text-white"></i>
              </div>
              <h2 className="text-2xl font-bold mb-2">শিক্ষক প্যানেল</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">ভর্তি, রেজাল্ট ও নোটিশ ম্যানেজমেন্ট করুন।</p>
              <div className="flex items-center text-indigo-600 font-bold group-hover:translate-x-2 transition-transform">
                প্রবেশ করুন <i className="fas fa-arrow-right ml-2 text-xs"></i>
              </div>
            </div>

            {/* Student Panel Card */}
            <div 
              onClick={() => setView('STUDENT_PORTAL')}
              className="group cursor-pointer bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border-2 border-transparent hover:border-green-600 transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="bg-green-100 dark:bg-green-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                <i className="fas fa-user-graduate text-2xl text-green-700 dark:text-green-400 group-hover:text-white"></i>
              </div>
              <h2 className="text-2xl font-bold mb-2">ছাত্র-ছাত্রী প্যানেল</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">রেজাল্ট দেখুন এবং মার্কশিট প্রিন্ট করুন।</p>
              <div className="flex items-center text-green-600 font-bold group-hover:translate-x-2 transition-transform">
                ফলাফল দেখুন <i className="fas fa-arrow-right ml-2 text-xs"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Notice Board */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-8 h-fit">
          <div className="bg-amber-500 p-6 flex items-center justify-between">
            <h3 className="text-white font-black text-xl flex items-center gap-2">
              <i className="fas fa-bullhorn"></i> নোটিশ বোর্ড
            </h3>
            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] text-white font-bold uppercase tracking-wider">নতুন নোটিশ</span>
          </div>
          <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto scrollbar-hide">
            {notices.length > 0 ? notices.map(notice => (
              <div 
                key={notice.id} 
                onClick={() => setSelectedNotice(notice)}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600 hover:shadow-md hover:bg-amber-50 dark:hover:bg-amber-900/10 cursor-pointer transition-all active:scale-95 group"
              >
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center justify-between">
                  {notice.date}
                  <i className="fas fa-chevron-right opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </p>
                <p className="text-sm font-medium leading-relaxed line-clamp-2">{notice.text}</p>
              </div>
            )) : (
              <div className="text-center py-10 opacity-40">
                <i className="fas fa-folder-open text-4xl mb-4 block"></i>
                <p className="text-sm font-bold">আপাতত কোন নোটিশ নেই</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">আনওয়ারুল কুরআন একাডেমী নোটিফিকেশন</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {[
          { icon: 'fa-shield-alt', text: 'নিরাপদ ডাটা' },
          { icon: 'fa-bolt', text: 'দ্রুত ফলাফল' },
          { icon: 'fa-print', text: 'সহজ প্রিন্ট' },
          { icon: 'fa-mobile-alt', text: 'মোবাইল ফ্রেন্ডলি' }
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
            <i className={`fas ${item.icon} text-indigo-500 mb-2 block text-xl`}></i>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Notice Expansion Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedNotice(null)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="bg-amber-500 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <i className="fas fa-bullhorn text-xl"></i>
                <div>
                  <h3 className="font-black text-lg">নোটিশের বিস্তারিত</h3>
                  <p className="text-xs opacity-80">{selectedNotice.date}</p>
                </div>
              </div>
              <button onClick={() => setSelectedNotice(null)} className="bg-white/20 hover:bg-white/30 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-10">
              <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                {selectedNotice.text}
              </p>
              <div className="mt-10 pt-6 border-t dark:border-gray-700 flex justify-between items-center">
                <div className="text-xs font-bold text-gray-400 uppercase">
                  অধ্যক্ষ, আনওয়ারুল কুরআন একাডেমী
                </div>
                <button 
                  onClick={() => setSelectedNotice(null)}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
