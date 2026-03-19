
import React from 'react';
import { ViewType } from '../types';

interface NavbarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isTeacherAuthenticated?: boolean;
  onLogout?: () => void;
  logo?: string;
}

const DefaultLogo = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <circle cx="100" cy="100" r="98" fill="none" stroke="#ed1c24" strokeWidth="2"/>
    <circle cx="100" cy="100" r="94" fill="none" stroke="#000" strokeWidth="1"/>
    <circle cx="100" cy="100" r="80" fill="none" stroke="#ed1c24" strokeWidth="1"/>
    
    <path id="curveTop" d="M 30,100 A 70,70 0 1,1 170,100" fill="none" />
    <text className="text-[18px] font-bold fill-[#2e3192]">
      <textPath href="#curveTop" startOffset="50%" textAnchor="middle">
        আনওয়ারুল কুরআন একাডেমী
      </textPath>
    </text>

    <path id="curveBottom" d="M 30,100 A 70,70 0 0,0 170,100" fill="none" />
    <text className="text-[10px] font-bold fill-black">
      <textPath href="#curveBottom" startOffset="50%" textAnchor="middle">
        কলাবাড়ী মাহিগঞ্জ, রংপুর
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
      <path d="M 5,10 Q 20,5 35,10 M 5,20 Q 20,15 35,20 M 5,30 Q 20,25 35,30 M 5,40 Q 20,35 35,40 M 5,50 Q 20,45 35,50" fill="none" stroke="#ccc" strokeWidth="1" />
      <path d="M 45,10 Q 60,5 75,10 M 45,20 Q 60,15 75,20 M 45,30 Q 60,25 75,30 M 45,40 Q 60,35 75,40 M 45,50 Q 60,45 75,50" fill="none" stroke="#ccc" strokeWidth="1" />
    </g>
    <path d="M 60,135 L 100,155 L 140,135 L 100,145 Z" fill="black" />
  </svg>
);

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, darkMode, setDarkMode, isTeacherAuthenticated, onLogout, logo }) => {
  return (
    <nav className="bg-gradient-to-r from-indigo-700 to-indigo-900 dark:from-gray-900 dark:to-indigo-950 text-white shadow-2xl no-print sticky top-0 z-[100] border-b border-white/10 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setView('DASHBOARD')}>
            <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center overflow-hidden border-2 border-white group-hover:scale-105 transition-transform duration-300 p-0.5">
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <DefaultLogo />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-base md:text-xl font-black tracking-tight leading-none">আনওয়ারুল কুরআন একাডেমী</span>
              <span className="text-[10px] md:text-xs opacity-80 mt-1 font-medium hidden sm:block">আধুনিক ইসলামী শিক্ষা প্রতিষ্ঠান</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
              title={darkMode ? "লাইট মোড" : "ডার্ক মোড"}
            >
              <i className={`fas ${darkMode ? 'fa-sun text-amber-400' : 'fa-moon'}`}></i>
            </button>
            
            <button
              onClick={() => setView('DASHBOARD')}
              className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-300 font-bold flex items-center gap-2 ${
                currentView === 'DASHBOARD' 
                ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' 
                : 'hover:bg-white/10'
              }`}
            >
              <i className="fas fa-home"></i>
              <span className="hidden lg:inline">হোম</span>
            </button>

            <button
              onClick={() => setView('STUDENT_PORTAL')}
              className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-300 font-bold flex items-center gap-2 ${
                currentView === 'STUDENT_PORTAL' 
                ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' 
                : 'hover:bg-white/10'
              }`}
            >
              <i className="fas fa-user-graduate"></i>
              <span className="hidden lg:inline">ফলাফল</span>
            </button>

            <button
              onClick={() => setView('TEACHER_DASHBOARD')}
              className={`p-2.5 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-300 font-bold flex items-center gap-2 ${
                currentView === 'TEACHER_DASHBOARD' 
                ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' 
                : 'hover:bg-white/10'
              }`}
            >
              <i className="fas fa-chalkboard-teacher"></i>
              <span className="hidden lg:inline">শিক্ষক প্যানেল</span>
            </button>
            
            {isTeacherAuthenticated && currentView === 'TEACHER_DASHBOARD' && onLogout && (
              <button
                onClick={onLogout}
                className="p-2.5 sm:px-4 sm:py-2.5 bg-red-500/20 hover:bg-red-500 text-red-100 rounded-xl transition-all font-bold flex items-center gap-2 border border-red-500/30"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span className="hidden md:inline">লগআউট</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
