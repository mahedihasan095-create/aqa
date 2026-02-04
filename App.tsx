
import React, { useState, useEffect } from 'react';
import { Student, Result, ViewType, Notice } from './types';
import TeacherPanel from './components/TeacherPanel';
import StudentPanel from './components/StudentPanel';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import { supabase } from './supabase';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('DASHBOARD');
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string[]>>({});
  const [notices, setNotices] = useState<Notice[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isDataInitialized, setIsDataInitialized] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');
  
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('isTeacherAuthenticated') === 'true';
  });
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<boolean>(false);
  const [teacherPassword, setTeacherPassword] = useState<string>('admin123');

  // Supabase থেকে সকল ডাটা লোড করা
  const fetchAllData = async () => {
    if (!supabase) return;
    setDbStatus('CONNECTING');
    try {
      const [
        { data: studentsData },
        { data: resultsData },
        { data: subjectsData },
        { data: noticesData },
        { data: settingsData }
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('results').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('notices').select('*').order('id', { ascending: false }),
        supabase.from('app_settings').select('*').eq('key', 'teacher_password').single()
      ]);

      if (studentsData) setStudents(studentsData);
      if (resultsData) setResults(resultsData);
      
      if (subjectsData) {
        const subMap: Record<string, string[]> = {};
        subjectsData.forEach((row: any) => {
          subMap[row.class] = row.subjects;
        });
        setSubjects(subMap);
      }
      
      if (noticesData) setNotices(noticesData);
      if (settingsData) setTeacherPassword(settingsData.value);
      
      setDbStatus('ONLINE');
    } catch (error) {
      console.error('Supabase fetch error:', error);
      setDbStatus('OFFLINE');
    } finally {
      setIsDataInitialized(true);
    }
  };

  useEffect(() => {
    fetchAllData();
    const savedDarkMode = localStorage.getItem('school_dark_mode');
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode) === true);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('school_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleLogout = () => {
    setIsTeacherAuthenticated(false);
    sessionStorage.removeItem('isTeacherAuthenticated');
    setView('DASHBOARD');
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      <Navbar 
        currentView={view} 
        setView={(v) => {
          if (v === 'TEACHER_DASHBOARD' && !isTeacherAuthenticated) setShowPasswordModal(true);
          else setView(v);
        }} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        isTeacherAuthenticated={isTeacherAuthenticated}
        onLogout={handleLogout}
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {!isDataInitialized ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="font-bold text-gray-400">ডাটাবেসের সাথে সংযুক্ত হওয়া হচ্ছে...</p>
          </div>
        ) : view === 'DASHBOARD' ? (
          <Dashboard 
            setView={(v) => (v === 'TEACHER_DASHBOARD' && !isTeacherAuthenticated) ? setShowPasswordModal(true) : setView(v)} 
            studentCount={students.length}
            notices={notices}
          />
        ) : view === 'TEACHER_DASHBOARD' ? (
          <TeacherPanel 
            students={students} results={results} subjects={subjects} notices={notices}
            onSetSubjectsForClass={async (className, classSubjects) => {
              const { error } = await supabase!.from('subjects').upsert({ class: className, subjects: classSubjects });
              if (!error) {
                setSubjects(prev => ({ ...prev, [className]: classSubjects }));
                return true;
              }
              return false;
            }}
            onAddStudent={async (s) => {
              const { error } = await supabase!.from('students').insert(s);
              if (!error) {
                setStudents(prev => [...prev, s]);
                return true;
              }
              return false;
            }}
            onUpdateStudent={async (s) => {
              const { error } = await supabase!.from('students').update(s).eq('id', s.id);
              if (!error) {
                setStudents(prev => prev.map(item => item.id === s.id ? s : item));
                return true;
              }
              return false;
            }}
            onDeleteStudent={async (id) => {
              const { error: resErr } = await supabase!.from('results').delete().eq('studentId', id);
              const { error: stdErr } = await supabase!.from('students').delete().eq('id', id);
              if (!stdErr) {
                setResults(prevResults => prevResults.filter(r => r.studentId !== id));
                setStudents(prevStudents => prevStudents.filter(s => s.id !== id));
                return true;
              }
              return false;
            }}
            onSaveResult={async (newResult) => {
              const { error } = await supabase!.from('results').upsert(newResult);
              if (!error) {
                setResults(prev => {
                  const idx = prev.findIndex(r => r.id === newResult.id);
                  if (idx > -1) {
                    const updated = [...prev];
                    updated[idx] = { ...newResult };
                    return updated;
                  }
                  return [...prev, { ...newResult }];
                });
                return true;
              }
              return false;
            }}
            onSaveResults={async (newResults) => {
              const { error } = await supabase!.from('results').upsert(newResults);
              if (!error) {
                setResults(prev => {
                  let updated = [...prev];
                  newResults.forEach(nr => {
                    const idx = updated.findIndex(r => r.id === nr.id);
                    if (idx > -1) updated[idx] = { ...nr };
                    else updated.push({ ...nr });
                  });
                  return updated;
                });
                return true;
              }
              return false;
            }}
            onDeleteResult={async (id) => {
              const { error } = await supabase!.from('results').delete().eq('id', id);
              if (!error) {
                setResults(prev => prev.filter(r => r.id !== id));
                return true;
              }
              return false;
            }}
            onUpdateNotices={async (updatedNotices) => {
              // সাধারণ নোটিশ ম্যানেজমেন্ট - সব ডিলিট করে নতুন ইনসার্ট (সহজ করার জন্য)
              await supabase!.from('notices').delete().neq('id', '0');
              const { error } = await supabase!.from('notices').insert(updatedNotices);
              if (!error) {
                setNotices(updatedNotices);
                return true;
              }
              return false;
            }}
            onUpdatePassword={async (newPass) => {
              const { error } = await supabase!.from('app_settings').upsert({ key: 'teacher_password', value: newPass });
              if (!error) {
                setTeacherPassword(newPass);
                handleLogout();
              }
            }}
            onClearAllData={async () => {
              await Promise.all([
                supabase!.from('students').delete().neq('id', '0'),
                supabase!.from('results').delete().neq('id', '0'),
                supabase!.from('subjects').delete().neq('id', '0'),
                supabase!.from('notices').delete().neq('id', '0')
              ]);
              setStudents([]);
              setResults([]);
              setSubjects({});
              setNotices([]);
              return true;
            }}
            currentPassword={teacherPassword}
          />
        ) : (
          <StudentPanel students={students} results={results} subjects={subjects} />
        )}
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-8 shadow-2xl border dark:border-gray-700 animate-fade-in">
            <div className="text-center mb-6">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-lock text-2xl text-indigo-600"></i>
              </div>
              <h2 className="text-2xl font-bold">শিক্ষক প্যানেল লগইন</h2>
              <p className="text-sm text-gray-500">প্রবেশের জন্য পাসওয়ার্ড দিন</p>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === teacherPassword) {
                setIsTeacherAuthenticated(true);
                sessionStorage.setItem('isTeacherAuthenticated', 'true');
                setView('TEACHER_DASHBOARD');
                setShowPasswordModal(false);
                setPasswordInput('');
                setLoginError(false);
              } else {
                setLoginError(true);
              }
            }} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  className={`w-full p-4 border rounded-2xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${loginError ? 'border-red-500' : ''}`}
                  placeholder="পাসওয়ার্ড লিখুন"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                {loginError && <p className="text-red-500 text-xs mt-2 font-bold"><i className="fas fa-exclamation-circle mr-1"></i> ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowPasswordModal(false); setPasswordInput(''); setLoginError(false); }} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold">বাতিল</button>
                <button type="submit" className="flex-2 bg-indigo-600 text-white py-4 px-8 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">লগইন</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-8 no-print">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 px-5 py-2 rounded-2xl flex items-center gap-3 border border-indigo-100 dark:border-indigo-800">
                <i className="fas fa-users text-indigo-600"></i>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">বর্তমান শিক্ষার্থী: <span className="text-indigo-600 dark:text-indigo-400 font-black ml-1">{students.length} জন</span></span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 px-5 py-2 rounded-2xl flex items-center gap-3 border border-amber-100 dark:border-amber-800">
                <i className="fas fa-calendar-check text-amber-600"></i>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">শিক্ষাবর্ষ: <span className="text-amber-600 dark:text-amber-400 font-black ml-1">২০২৬</span></span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                 <div className={`w-2 h-2 rounded-full ${dbStatus === 'ONLINE' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : dbStatus === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cloud Sync: {dbStatus}</span>
              </div>
            </div>
            <div className="text-center md:text-right text-gray-500">
               <p className="text-sm font-black text-indigo-900 dark:text-indigo-400 mb-1">আনওয়ারুল কুরআন একাডেমী</p>
               <p className="text-[10px] uppercase font-bold tracking-widest">&copy; {new Date().getFullYear()} | স্মার্ট এডুকেশন ম্যানেজমেন্ট সিস্টেম</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
