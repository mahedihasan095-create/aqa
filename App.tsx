
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
  const [principalSignature, setPrincipalSignature] = useState<string>('');
  
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('isTeacherAuthenticated') === 'true';
  });
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<boolean>(false);
  const [teacherPassword, setTeacherPassword] = useState<string>('admin123');

  const handleSupabaseError = (error: any, action: string) => {
    console.error(`Supabase Error (${action}):`, error);
    if (error.code === '42501') {
      alert(`Error: পারমিশন ডিনাইড (RLS)! \nদয়া করে সুপাবেস ড্যাশবোর্ডে গিয়ে এই টেবিলের RLS বন্ধ করুন অথবা পলিসি সেট করুন।`);
    } else {
      alert(`Error ${action}: ${error.message || 'Unknown error occurred'}`);
    }
  };

  const fetchAllData = async () => {
    if (!supabase) return;
    try {
      const [
        { data: studentsData, error: sErr },
        { data: resultsData, error: rErr },
        { data: subjectsData, error: subErr },
        { data: noticesData, error: nErr },
        { data: settingsData, error: setErr }
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('results').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('notices').select('*').order('id', { ascending: false }),
        supabase.from('app_settings').select('*')
      ]);

      if (sErr) handleSupabaseError(sErr, 'Fetching Students');
      if (rErr) handleSupabaseError(rErr, 'Fetching Results');
      
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
      
      if (settingsData) {
        const passSetting = settingsData.find(s => s.key === 'teacher_password');
        const sigSetting = settingsData.find(s => s.key === 'principal_signature');
        if (passSetting) setTeacherPassword(passSetting.value);
        if (sigSetting) setPrincipalSignature(sigSetting.value);
      }
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      setIsDataInitialized(true);
    }
  };

  useEffect(() => {
    fetchAllData();
    const savedDarkMode = localStorage.getItem('school_dark_mode');
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode) === true);

    if (supabase) {
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notices' },
          (payload) => {
            const newNotice = payload.new as Notice;
            setNotices(prev => [newNotice, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
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
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 font-bold">লোড হচ্ছে...</p>
          </div>
        ) : view === 'DASHBOARD' ? (
          <Dashboard setView={(v) => (v === 'TEACHER_DASHBOARD' && !isTeacherAuthenticated) ? setShowPasswordModal(true) : setView(v)} studentCount={students.length} notices={notices} />
        ) : view === 'TEACHER_DASHBOARD' ? (
          <TeacherPanel 
            students={students} results={results} subjects={subjects} notices={notices}
            principalSignature={principalSignature}
            onSetSubjectsForClass={async (className, classSubjects) => {
              const { error } = await supabase!.from('subjects').upsert({ class: className, subjects: classSubjects }, { onConflict: 'class' });
              if (!error) { setSubjects(prev => ({ ...prev, [className]: classSubjects })); return true; }
              handleSupabaseError(error, 'Updating Subjects');
              return false;
            }}
            onAddStudent={async (s) => {
              const { error } = await supabase!.from('students').insert(s);
              if (!error) { setStudents(prev => [...prev, s]); return true; }
              handleSupabaseError(error, 'Adding Student');
              return false;
            }}
            onAddStudents={async (list) => {
              const { error } = await supabase!.from('students').insert(list);
              if (!error) { setStudents(prev => [...prev, ...list]); return true; }
              handleSupabaseError(error, 'Importing Students');
              return false;
            }}
            onUpdateStudent={async (s) => {
              const { error } = await supabase!.from('students').update(s).eq('id', s.id);
              if (!error) { setStudents(prev => prev.map(item => item.id === s.id ? s : item)); return true; }
              handleSupabaseError(error, 'Updating Student');
              return false;
            }}
            onDeleteStudent={async (id) => {
              const { error } = await supabase!.from('students').delete().eq('id', id);
              if (!error) { setStudents(prev => prev.filter(s => s.id !== id)); return true; }
              handleSupabaseError(error, 'Deleting Student');
              return false;
            }}
            onSaveResult={async (res) => {
              const { error } = await supabase!.from('results').upsert(res);
              if (!error) { setResults(prev => [...prev.filter(r => r.id !== res.id), res]); return true; }
              handleSupabaseError(error, 'Saving Result');
              return false;
            }}
            onSaveResults={async (list) => {
              const { error } = await supabase!.from('results').upsert(list);
              if (!error) { fetchAllData(); return true; }
              handleSupabaseError(error, 'Saving Results Bulk');
              return false;
            }}
            onDeleteResult={async (id) => {
              const { error } = await supabase!.from('results').delete().eq('id', id);
              if (!error) { setResults(prev => prev.filter(r => r.id !== id)); return true; }
              handleSupabaseError(error, 'Deleting Result');
              return false;
            }}
            onUpdateNotices={async (n) => {
              // Delete all and insert new set for simplicity in management
              const { error: delError } = await supabase!.from('notices').delete().neq('id', '000');
              if (delError) { handleSupabaseError(delError, 'Notice Sync'); return false; }
              const { error } = await supabase!.from('notices').insert(n);
              if (!error) { setNotices(n); return true; }
              handleSupabaseError(error, 'Updating Notices');
              return false;
            }}
            onUpdatePassword={async (p) => {
              const { error } = await supabase!.from('app_settings').upsert({ key: 'teacher_password', value: p });
              if (!error) {
                setTeacherPassword(p);
                alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। পুনরায় লগইন করুন।');
                handleLogout();
              } else {
                handleSupabaseError(error, 'Password Change');
              }
            }}
            onUpdatePrincipalSignature={async (sig) => {
              const { error } = await supabase!.from('app_settings').upsert({ key: 'principal_signature', value: sig });
              if (!error) {
                setPrincipalSignature(sig);
                return true;
              }
              handleSupabaseError(error, 'Signature Upload');
              return false;
            }}
            currentPassword={teacherPassword}
          />
        ) : (
          <StudentPanel students={students} results={results} subjects={subjects} principalSignature={principalSignature} />
        )}
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">শিক্ষক প্যানেল লগইন</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === teacherPassword) {
                setIsTeacherAuthenticated(true);
                sessionStorage.setItem('isTeacherAuthenticated', 'true');
                setView('TEACHER_DASHBOARD');
                setShowPasswordModal(false);
                setPasswordInput('');
                setLoginError(false);
              } else { setLoginError(true); }
            }} className="space-y-4">
              <input type="password" autoFocus className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="পাসওয়ার্ড" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
              {loginError && <p className="text-red-500 text-sm">ভুল পাসওয়ার্ড!</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-3 bg-gray-100 rounded-lg">বাতিল</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-lg">লগইন</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <footer className="bg-white dark:bg-gray-800 border-t py-6 no-print">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <div className="mb-2 md:mb-0">
            Powered by <span className="text-indigo-600 font-bold">INTERNET SEBA</span> | {students.length} জন শিক্ষার্থী
          </div>
          <div>&copy; {new Date().getFullYear()} আনওয়ারুল কুরআন একাডেমী</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
