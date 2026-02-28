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
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  
  // Supabase Auth State
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const handleSupabaseError = (error: any, action: string) => {
    console.error(`Supabase Error (${action}):`, error);
    
    // Handle stale session/token errors
    if (error.message?.includes('Refresh Token') || error.status === 400 || error.code === 'PGRST301') {
      supabase.auth.signOut().then(() => {
        setUser(null);
        // Optionally reload or redirect if needed, but clearing state is usually enough
      });
      return; // Don't show alert for token errors as we're handling it by logging out
    }

    if (error.code === '42501') {
      alert(`Error: পারমিশন ডিনাইড (RLS)! \nসুপাবেস ড্যাশবোর্ডে পলিসি সেট করুন।`);
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
        const sigSetting = settingsData.find(s => s.key === 'principal_signature');
        const logoSetting = settingsData.find(s => s.key === 'school_logo');
        if (sigSetting) setPrincipalSignature(sigSetting.value);
        if (logoSetting) setSchoolLogo(logoSetting.value);
      }
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      setIsDataInitialized(true);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth session error:', error);
          // If session is invalid, clear it
          if (error.message.includes('Refresh Token') || error.status === 400) {
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('Unexpected auth error:', err);
      }
    };

    initAuth();

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    fetchAllData();
    const savedDarkMode = localStorage.getItem('school_dark_mode');
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode) === true);

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('school_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      setLoginError('ইমেইল বা পাসওয়ার্ড ভুল!');
      setIsLoggingIn(false);
    } else {
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
      setView('TEACHER_DASHBOARD');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('DASHBOARD');
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'dark bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      <Navbar 
        currentView={view} 
        setView={(v) => {
          if (v === 'TEACHER_DASHBOARD' && !user) setShowLoginModal(true);
          else setView(v);
        }} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        isTeacherAuthenticated={!!user}
        onLogout={handleLogout}
        logo={schoolLogo}
      />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        {!isDataInitialized ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping scale-150"></div>
              {/* Inner pulsing circle */}
              <div className="absolute inset-0 rounded-full bg-indigo-600/10 animate-pulse-soft scale-125"></div>
              
              {/* Central Icon Container */}
              <div className="relative bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-2xl border border-indigo-100 dark:border-gray-700 flex items-center justify-center">
                <div className="w-16 h-16 flex items-center justify-center">
                  <i className="fas fa-book-quran text-5xl text-indigo-600 animate-float"></i>
                </div>
                
                {/* Spinning loader around the icon */}
                <div className="absolute inset-0 border-4 border-transparent border-t-indigo-600 border-r-indigo-600 rounded-[40px] animate-spin"></div>
              </div>
            </div>
            
            <div className="mt-12 text-center space-y-2">
              <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-300 animate-pulse">
                আনওয়ারুল কুরআন একাডেমী
              </h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[3px] animate-pulse">
                ডাটা লোড হচ্ছে...
              </p>
            </div>
            
            {/* Progress bar simulation */}
            <div className="mt-8 w-48 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border dark:border-gray-700 relative">
              <div className="absolute inset-0 bg-indigo-600/30 rounded-full animate-loading-bar w-1/2"></div>
            </div>
          </div>
        ) : view === 'DASHBOARD' ? (
          <Dashboard setView={(v) => (v === 'TEACHER_DASHBOARD' && !user) ? setShowLoginModal(true) : setView(v)} studentCount={students.length} notices={notices} />
        ) : view === 'TEACHER_DASHBOARD' ? (
          <TeacherPanel 
            students={students} results={results} subjects={subjects} notices={notices}
            principalSignature={principalSignature}
            schoolLogo={schoolLogo}
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
              const { error: delError } = await supabase!.from('notices').delete().neq('id', '000');
              if (delError) { handleSupabaseError(delError, 'Notice Sync'); return false; }
              const { error } = await supabase!.from('notices').insert(n);
              if (!error) { setNotices(n); return true; }
              handleSupabaseError(error, 'Updating Notices');
              return false;
            }}
            onUpdatePassword={async (p) => {
              const { error } = await supabase.auth.updateUser({ password: p });
              if (!error) alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
              else handleSupabaseError(error, 'Password Update');
            }}
            onUpdatePrincipalSignature={async (sig) => {
              const { error } = await supabase!.from('app_settings').upsert({ key: 'principal_signature', value: sig });
              if (!error) { setPrincipalSignature(sig); return true; }
              handleSupabaseError(error, 'Signature Upload');
              return false;
            }}
            onUpdateSchoolLogo={async (logoBase64) => {
              const { error } = await supabase!.from('app_settings').upsert({ key: 'school_logo', value: logoBase64 });
              if (!error) { setSchoolLogo(logoBase64); return true; }
              handleSupabaseError(error, 'Logo Update');
              return false;
            }}
            currentPassword=""
          />
        ) : (
          <StudentPanel students={students} results={results} subjects={subjects} principalSignature={principalSignature} logo={schoolLogo} />
        )}
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-indigo-950/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-scale-in border border-white/10">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-indigo-600 rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
                <i className="fas fa-user-shield text-3xl text-white"></i>
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100">শিক্ষক লগইন</h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-bold uppercase tracking-[3px]">Secure Access Portal</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">ইমেইল ঠিকানা</label>
                <input 
                  type="email" 
                  autoFocus 
                  required
                  className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-indigo-600 rounded-2xl outline-none font-bold text-sm transition-all shadow-inner" 
                  placeholder="name@email.com" 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-indigo-500 uppercase ml-2">গোপন পাসওয়ার্ড</label>
                <input 
                  type="password" 
                  required
                  className="w-full p-4 bg-gray-50 dark:bg-gray-700 border-none focus:ring-2 focus:ring-indigo-600 rounded-2xl outline-none font-bold text-sm transition-all shadow-inner" 
                  placeholder="••••••••" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                />
              </div>
              
              {loginError && <p className="text-red-500 text-xs font-bold text-center animate-bounce"><i className="fas fa-exclamation-circle mr-1"></i> {loginError}</p>}
              
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-black hover:bg-gray-200 transition-colors">বাতিল</button>
                <button type="submit" disabled={isLoggingIn} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                  {isLoggingIn ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-sign-in-alt"></i>} লগইন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <footer className="bg-white dark:bg-gray-950 border-t dark:border-white/5 py-12 no-print">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-[2px]">
          <div className="mb-4 md:mb-0 flex items-center gap-4">
             <div className="w-8 h-8 bg-indigo-600/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-code text-indigo-600"></i>
             </div>
             Powered by <span className="text-indigo-600">Internet Seba</span>
          </div>
          <div>&copy; {new Date().getFullYear()} আনওয়ারুল কুরআন একাডেমী</div>
        </div>
      </footer>
    </div>
  );
};

export default App;