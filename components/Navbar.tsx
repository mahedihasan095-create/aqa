
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
);

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, darkMode, setDarkMode, isTeacherAuthenticated, onLogout, logo }) => {
  return (
    <nav className="bg-indigo-700 dark:bg-indigo-900 text-white shadow-lg no-print transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('DASHBOARD')}>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-indigo-200 p-0.5">
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <DefaultLogo />
              )}
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight">আনওয়ারুল কুরআন একাডেমী</span>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-md hover:bg-indigo-600 dark:hover:bg-indigo-800 transition-colors"
              title={darkMode ? "লাইট মোড" : "ডার্ক মোড"}
            >
              <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button
              onClick={() => setView('DASHBOARD')}
              className={`px-3 py-2 rounded-md transition ${
                currentView === 'DASHBOARD' 
                ? 'bg-indigo-800 dark:bg-indigo-950 font-semibold' 
                : 'hover:bg-indigo-600 dark:hover:bg-indigo-800'
              }`}
              title="মূল ড্যাশবোর্ড"
            >
              <i className="fas fa-home"></i>
            </button>
            <button
              onClick={() => setView('TEACHER_DASHBOARD')}
              className={`px-4 py-2 rounded-md transition ${
                currentView === 'TEACHER_DASHBOARD' 
                ? 'bg-indigo-800 dark:bg-indigo-950 font-semibold' 
                : 'hover:bg-indigo-600 dark:hover:bg-indigo-800'
              }`}
            >
              <i className="fas fa-chalkboard-teacher mr-2"></i>
              <span className="hidden md:inline">শিক্ষক প্যানেল</span>
            </button>
            <button
              onClick={() => setView('STUDENT_PORTAL')}
              className={`px-4 py-2 rounded-md transition ${
                currentView === 'STUDENT_PORTAL' 
                ? 'bg-indigo-800 dark:bg-indigo-950 font-semibold' 
                : 'hover:bg-indigo-600 dark:hover:bg-indigo-800'
              }`}
            >
              <i className="fas fa-user-graduate mr-2"></i>
              <span className="hidden md:inline">ছাত্র-ছাত্রী প্যানেল</span>
            </button>
            
            {isTeacherAuthenticated && currentView === 'TEACHER_DASHBOARD' && onLogout && (
              <button
                onClick={onLogout}
                className="ml-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md transition font-bold flex items-center gap-2"
                title="লগআউট"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span className="hidden lg:inline">লগআউট</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
