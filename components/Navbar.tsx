
import React from 'react';
import { ViewType } from '../types';

interface NavbarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isTeacherAuthenticated?: boolean;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, darkMode, setDarkMode, isTeacherAuthenticated, onLogout }) => {
  return (
    <nav className="bg-indigo-700 dark:bg-indigo-900 text-white shadow-lg no-print transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView('DASHBOARD')}>
            <i className="fas fa-book-quran text-2xl"></i>
            <span className="text-xl font-bold tracking-tight">আনওয়ারুল কুরআন একাডেমী</span>
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
