
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ViewType, Student, Result, Notice } from './types';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import TeacherPanel from './components/TeacherPanel';
import StudentPanel from './components/StudentPanel';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('DASHBOARD');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string[]>>({});
  const [principalSignature, setPrincipalSignature] = useState<string>('');
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [slideshowImages, setSlideshowImages] = useState<{url: string, title: string}[]>([]);
  const [teacherPassword, setTeacherPassword] = useState('123456');
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [isDataInitialized, setIsDataInitialized] = useState(false);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch students
        const { data: studentsData } = await supabase.from('students').select('*');
        if (studentsData) setStudents(studentsData);

        // Fetch results
        const { data: resultsData } = await supabase.from('results').select('*');
        if (resultsData) setResults(resultsData);

        // Fetch notices
        const { data: noticesData } = await supabase.from('notices').select('*').order('id', { ascending: false });
        if (noticesData) setNotices(noticesData);

        // Fetch settings (subjects, password, etc.)
        const { data: settingsData } = await supabase.from('settings').select('*');
        if (settingsData) {
          const settings: any = {};
          settingsData.forEach(s => {
            settings[s.key] = s.value;
          });
          if (settings.subjects) setSubjects(settings.subjects);
          if (settings.teacherPassword) setTeacherPassword(settings.teacherPassword);
          if (settings.principalSignature) setPrincipalSignature(settings.principalSignature);
          if (settings.schoolLogo) setSchoolLogo(settings.schoolLogo);
          if (settings.slideshowImages) setSlideshowImages(settings.slideshowImages);
        }

        setIsDataInitialized(true);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Handlers
  const handleAddStudent = async (student: Student) => {
    const { error } = await supabase.from('students').insert([student]);
    if (!error) {
      setStudents(prev => [...prev, student]);
      return true;
    }
    return false;
  };

  const handleAddStudents = async (newStudents: Student[]) => {
    const { error } = await supabase.from('students').insert(newStudents);
    if (!error) {
      setStudents(prev => [...prev, ...newStudents]);
      return true;
    }
    return false;
  };

  const handleUpdateStudent = async (student: Student) => {
    const { error } = await supabase.from('students').update(student).eq('id', student.id);
    if (!error) {
      setStudents(prev => prev.map(s => s.id === student.id ? student : s));
      return true;
    }
    return false;
  };

  const handleDeleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) {
      setStudents(prev => prev.filter(s => s.id !== id));
      return true;
    }
    return false;
  };

  const handleSaveResult = async (result: Result) => {
    const { error } = await supabase.from('results').upsert([result]);
    if (!error) {
      setResults(prev => {
        const index = prev.findIndex(r => r.id === result.id);
        if (index >= 0) {
          const newResults = [...prev];
          newResults[index] = result;
          return newResults;
        }
        return [...prev, result];
      });
      return true;
    }
    return false;
  };

  const handleSaveResults = async (newResults: Result[]) => {
    const { error } = await supabase.from('results').upsert(newResults);
    if (!error) {
      setResults(prev => {
        const updatedResults = [...prev];
        newResults.forEach(nr => {
          const index = updatedResults.findIndex(r => r.id === nr.id);
          if (index >= 0) {
            updatedResults[index] = nr;
          } else {
            updatedResults.push(nr);
          }
        });
        return updatedResults;
      });
      return true;
    }
    return false;
  };

  const handleDeleteResult = async (id: string) => {
    const { error } = await supabase.from('results').delete().eq('id', id);
    if (!error) {
      setResults(prev => prev.filter(r => r.id !== id));
      return true;
    }
    return false;
  };

  const handleUpdateNotices = async (newNotices: Notice[]) => {
    // For simplicity, we'll replace all notices or handle them individually
    // Here we'll just clear and insert for simplicity in this mock-like implementation
    // In production, you'd want better sync logic
    const { error: deleteError } = await supabase.from('notices').delete().neq('id', '0');
    if (!deleteError) {
      const { error: insertError } = await supabase.from('notices').insert(newNotices);
      if (!insertError) {
        setNotices(newNotices);
        return true;
      }
    }
    return false;
  };

  const handleSetSubjectsForClass = async (className: string, classSubjects: string[]) => {
    const updatedSubjects = { ...subjects, [className]: classSubjects };
    const { error } = await supabase.from('settings').upsert([{ key: 'subjects', value: updatedSubjects }]);
    if (!error) {
      setSubjects(updatedSubjects);
      return true;
    }
    return false;
  };

  const handleUpdatePassword = async (newPass: string) => {
    const { error } = await supabase.from('settings').upsert([{ key: 'teacherPassword', value: newPass }]);
    if (!error) {
      setTeacherPassword(newPass);
    }
  };

  const handleUpdatePrincipalSignature = async (signature: string) => {
    const { error } = await supabase.from('settings').upsert([{ key: 'principalSignature', value: signature }]);
    if (!error) {
      setPrincipalSignature(signature);
      return true;
    }
    return false;
  };

  const handleUpdateSchoolLogo = async (logo: string) => {
    const { error } = await supabase.from('settings').upsert([{ key: 'schoolLogo', value: logo }]);
    if (!error) {
      setSchoolLogo(logo);
      return true;
    }
    return false;
  };

  const handleUpdateSlideshowImages = async (images: {url: string, title: string}[]) => {
    const { error } = await supabase.from('settings').upsert([{ key: 'slideshowImages', value: images }]);
    if (!error) {
      setSlideshowImages(images);
      return true;
    }
    return false;
  };

  const handleTeacherLogin = (password: string) => {
    if (password === teacherPassword) {
      setIsTeacherAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsTeacherAuthenticated(false);
  };

  if (!isDataInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-900 text-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xl font-black animate-pulse">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navbar 
        currentView={currentView} 
        setView={setCurrentView} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        isTeacherAuthenticated={isTeacherAuthenticated}
        onLogout={handleLogout}
        logo={schoolLogo}
      />

      <main className="container mx-auto py-6 px-4">
        {currentView === 'DASHBOARD' && (
          <Dashboard 
            setView={setCurrentView} 
            studentCount={students.length} 
            notices={notices}
            slideshowImages={slideshowImages}
          />
        )}

        {currentView === 'TEACHER_DASHBOARD' && (
          !isTeacherAuthenticated ? (
            <div className="max-w-md mx-auto mt-20 bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-2xl border dark:border-gray-700 animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-lock text-indigo-600 text-2xl"></i>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">শিক্ষক লগইন</h2>
                <p className="text-sm text-gray-500 mt-1">প্যানেলে প্রবেশ করতে পাসওয়ার্ড দিন</p>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const pass = (e.target as any).password.value;
                if (!handleTeacherLogin(pass)) {
                  alert('ভুল পাসওয়ার্ড!');
                }
              }} className="space-y-4">
                <input 
                  name="password"
                  type="password" 
                  placeholder="পাসওয়ার্ড" 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none outline-none font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                  autoFocus
                />
                <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95">
                  প্রবেশ করুন
                </button>
              </form>
            </div>
          ) : (
            <TeacherPanel 
              students={students}
              results={results}
              subjects={subjects}
              notices={notices}
              principalSignature={principalSignature}
              schoolLogo={schoolLogo}
              slideshowImages={slideshowImages}
              onSetSubjectsForClass={handleSetSubjectsForClass}
              onAddStudent={handleAddStudent}
              onAddStudents={handleAddStudents}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onSaveResult={handleSaveResult}
              onSaveResults={handleSaveResults}
              onDeleteResult={handleDeleteResult}
              onUpdateNotices={handleUpdateNotices}
              onUpdatePassword={handleUpdatePassword}
              onUpdatePrincipalSignature={handleUpdatePrincipalSignature}
              onUpdateSchoolLogo={handleUpdateSchoolLogo}
              onUpdateSlideshowImages={handleUpdateSlideshowImages}
              currentPassword={teacherPassword}
            />
          )
        )}

        {currentView === 'STUDENT_PORTAL' && (
          <StudentPanel 
            students={students}
            results={results}
            subjects={subjects}
            principalSignature={principalSignature}
            logo={schoolLogo}
          />
        )}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-8 no-print mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 font-bold text-sm">
            © {new Date().getFullYear()} আনওয়ারুল কুরআন একাডেমী। সর্বস্বত্ব সংরক্ষিত।
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-2 font-medium">
            Developed with <i className="fas fa-heart text-red-500"></i> for Education
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
