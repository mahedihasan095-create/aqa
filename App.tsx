import React, { useState, useEffect } from 'react';
import { Student, Result, ViewType, Notice } from './types';
import TeacherPanel from './components/TeacherPanel';
import StudentPanel from './components/StudentPanel';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';

const API_URL = '/api';

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
  const [slideshowImages, setSlideshowImages] = useState<{url: string, title: string}[]>([]);
  const [dailyVisits, setDailyVisits] = useState<number>(0);
  const [totalVisits, setTotalVisits] = useState<number>(0);
  
  // Auth State (Simplified for local SQL)
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const handleApiError = (error: any, action: string) => {
    console.error(`API Error (${action}):`, error);
    alert(`Error ${action}: ${error.message || 'Unknown error occurred'}`);
  };

  const fetchAllData = async () => {
    try {
      const [sRes, rRes, subRes, nRes, setRes] = await Promise.all([
        fetch(`${API_URL}/students`),
        fetch(`${API_URL}/results`),
        fetch(`${API_URL}/subjects`),
        fetch(`${API_URL}/notices`),
        fetch(`${API_URL}/settings`)
      ]);

      const studentsData = await sRes.json();
      const resultsData = await rRes.json();
      const subjectsData = await subRes.json();
      const noticesData = await nRes.json();
      const settingsData = await setRes.json();

      setStudents(studentsData);
      setResults(resultsData.map((r: any) => ({ ...r, marks: typeof r.marks === 'string' ? JSON.parse(r.marks) : r.marks })));
      
      const subMap: Record<string, string[]> = {};
      subjectsData.forEach((row: any) => {
        subMap[row.class] = typeof row.subjects === 'string' ? JSON.parse(row.subjects) : row.subjects;
      });
      setSubjects(subMap);
      
      setNotices(noticesData);
      
      if (settingsData) {
        const sigSetting = settingsData.find((s: any) => s.setting_key === 'principal_signature');
        const logoSetting = settingsData.find((s: any) => s.setting_key === 'school_logo');
        const slideshowSetting = settingsData.find((s: any) => s.setting_key === 'slideshow_images');
        const statsSetting = settingsData.find((s: any) => s.setting_key === 'visitor_stats');
        
        if (sigSetting) setPrincipalSignature(sigSetting.setting_value);
        if (logoSetting) setSchoolLogo(logoSetting.setting_value);
        if (slideshowSetting && slideshowSetting.setting_value) {
          try {
            const parsed = JSON.parse(slideshowSetting.setting_value);
            setSlideshowImages(parsed);
          } catch (e) { console.error(e); }
        }
        if (statsSetting && statsSetting.setting_value) {
          try {
            const stats = JSON.parse(statsSetting.setting_value);
            const today = new Date().toLocaleDateString('en-CA');
            setDailyVisits(stats.daily[today] || 0);
            setTotalVisits(stats.total || 0);
          } catch (e) { console.error(e); }
        }
      }
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      setIsDataInitialized(true);
    }
  };

  const trackVisit = async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const sessionCounted = sessionStorage.getItem('visit_counted');
    if (sessionCounted) return;

    try {
      const res = await fetch(`${API_URL}/settings`);
      const settings = await res.json();
      const statsSetting = settings.find((s: any) => s.setting_key === 'visitor_stats');
      
      let stats = { total: 0, daily: {} as Record<string, number> };
      if (statsSetting && statsSetting.setting_value) {
        stats = JSON.parse(statsSetting.setting_value);
      }

      stats.total = (stats.total || 0) + 1;
      stats.daily[today] = (stats.daily[today] || 0) + 1;

      await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'visitor_stats', value: JSON.stringify(stats) })
      });
      
      sessionStorage.setItem('visit_counted', 'true');
      setDailyVisits(stats.daily[today] || 0);
      setTotalVisits(stats.total || 0);
    } catch (err) {
      console.error('Visit tracking error:', err);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('school_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    fetchAllData();
    trackVisit();
    const savedDarkMode = localStorage.getItem('school_dark_mode');
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode) === true);
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
    
    // Simple mock login for local SQL setup (In real app, use a proper /api/login endpoint)
    if (loginEmail === 'admin@school.com' && loginPassword === 'admin123') {
      const mockUser = { email: loginEmail, id: 'admin' };
      setUser(mockUser);
      localStorage.setItem('school_user', JSON.stringify(mockUser));
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
      setView('TEACHER_DASHBOARD');
    } else {
      setLoginError('ইমেইল বা পাসওয়ার্ড ভুল!');
    }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    setUser(null);
    localStorage.removeItem('school_user');
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
            <div className="relative w-64 h-48 flex flex-col items-center justify-center">
              {/* Academy Building in Background */}
              <div className="absolute top-0 opacity-10 dark:opacity-5">
                <i className="fas fa-school text-[120px] text-indigo-900 dark:text-white"></i>
              </div>
              
              {/* Running Student Animation */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="animate-student-run">
                  <div className="relative">
                    <i className="fas fa-user-graduate text-6xl text-indigo-600 drop-shadow-lg"></i>
                    {/* Backpack detail */}
                    <div className="absolute -left-1 top-4 w-3 h-6 bg-indigo-800 rounded-full opacity-40"></div>
                  </div>
                </div>
                
                {/* Moving Ground Effect */}
                <div className="mt-2 w-40 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                  <div className="absolute inset-0 animate-ground opacity-50"></div>
                </div>
              </div>

              {/* Floating Books/Knowledge Icons */}
              <div className="absolute top-4 right-4 animate-bounce delay-100">
                <i className="fas fa-book text-indigo-400/40 text-xl"></i>
              </div>
              <div className="absolute bottom-12 left-4 animate-bounce delay-300">
                <i className="fas fa-pencil-alt text-amber-400/40 text-xl"></i>
              </div>
            </div>
            
            <div className="mt-12 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className="h-px w-8 bg-indigo-200 dark:bg-indigo-900"></div>
                <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-300">
                  আনওয়ারুল কুরআন একাডেমী
                </h2>
                <div className="h-px w-8 bg-indigo-200 dark:bg-indigo-900"></div>
              </div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-[4px] flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                জ্ঞানের পথে যাত্রা...
                <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-75"></span>
              </p>
            </div>
            
            {/* Progress bar simulation */}
            <div className="mt-10 w-56 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border dark:border-gray-700 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full animate-loading-bar w-1/3"></div>
            </div>
          </div>
        ) : view === 'DASHBOARD' ? (
          <Dashboard 
            setView={(v) => (v === 'TEACHER_DASHBOARD' && !user) ? setShowLoginModal(true) : setView(v)} 
            studentCount={students.length} 
            notices={notices} 
            slideshowImages={slideshowImages}
          />
        ) : view === 'TEACHER_DASHBOARD' ? (
          <TeacherPanel 
            students={students} results={results} subjects={subjects} notices={notices}
            principalSignature={principalSignature}
            schoolLogo={schoolLogo}
            slideshowImages={slideshowImages}
            onUpdateSlideshowImages={async (images: {url: string, title: string}[]) => {
              const res = await fetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'slideshow_images', value: JSON.stringify(images) })
              });
              if (res.ok) { setSlideshowImages(images); return true; }
              return false;
            }}
            onSetSubjectsForClass={async (className, classSubjects) => {
              const res = await fetch(`${API_URL}/subjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ className, classSubjects })
              });
              if (res.ok) { setSubjects(prev => ({ ...prev, [className]: classSubjects })); return true; }
              return false;
            }}
            onAddStudent={async (s) => {
              const res = await fetch(`${API_URL}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(s)
              });
              if (res.ok) { setStudents(prev => [...prev, s]); return true; }
              return false;
            }}
            onAddStudents={async (list) => {
              for (const s of list) {
                await fetch(`${API_URL}/students`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(s)
                });
              }
              setStudents(prev => [...prev, ...list]);
              return true;
            }}
            onUpdateStudent={async (s) => {
              const res = await fetch(`${API_URL}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(s)
              });
              if (res.ok) { setStudents(prev => prev.map(item => item.id === s.id ? s : item)); return true; }
              return false;
            }}
            onDeleteStudent={async (id) => {
              const res = await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
              if (res.ok) { setStudents(prev => prev.filter(s => s.id !== id)); return true; }
              return false;
            }}
            onSaveResult={async (resObj) => {
              const res = await fetch(`${API_URL}/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resObj)
              });
              if (res.ok) { setResults(prev => [...prev.filter(r => r.id !== resObj.id), resObj]); return true; }
              return false;
            }}
            onSaveResults={async (list) => {
              for (const r of list) {
                await fetch(`${API_URL}/results`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(r)
                });
              }
              fetchAllData();
              return true;
            }}
            onDeleteResult={async (id) => {
              const res = await fetch(`${API_URL}/results/${id}`, { method: 'DELETE' });
              if (res.ok) { setResults(prev => prev.filter(r => r.id !== id)); return true; }
              return false;
            }}
            onUpdateNotices={async (n) => {
              const res = await fetch(`${API_URL}/notices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(n)
              });
              if (res.ok) { setNotices(n); return true; }
              return false;
            }}
            onUpdatePassword={async (p) => {
              alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। (Mock)');
            }}
            onUpdatePrincipalSignature={async (sig) => {
              const res = await fetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'principal_signature', value: sig })
              });
              if (res.ok) { setPrincipalSignature(sig); return true; }
              return false;
            }}
            onUpdateSchoolLogo={async (logoBase64) => {
              const res = await fetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'school_logo', value: logoBase64 })
              });
              if (res.ok) { setSchoolLogo(logoBase64); return true; }
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
          <div className="mb-6 md:mb-0 flex items-center gap-4">
             <div className="w-8 h-8 bg-indigo-600/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-code text-indigo-600"></i>
             </div>
             Powered by <span className="text-indigo-600">Internet Seba</span>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex items-center gap-4 text-[9px] font-bold text-gray-500 bg-gray-50 dark:bg-gray-900/50 px-5 py-2.5 rounded-full border dark:border-white/5 shadow-inner">
              <div className="flex items-center gap-2">
                <i className="fas fa-calendar-day text-indigo-500"></i>
                আজকের ভিজিটর: <span className="text-indigo-600 dark:text-indigo-400 text-xs">{dailyVisits}</span>
              </div>
              <div className="w-px h-3 bg-gray-300 dark:bg-gray-700"></div>
              <div className="flex items-center gap-2">
                <i className="fas fa-users text-indigo-500"></i>
                সর্বমোট ভিজিটর: <span className="text-indigo-600 dark:text-indigo-400 text-xs">{totalVisits}</span>
              </div>
            </div>
            <div>&copy; {new Date().getFullYear()} আনওয়ারুল কুরআন একাডেমী</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;