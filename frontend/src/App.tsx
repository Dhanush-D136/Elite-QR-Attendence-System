import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { FirstLoginModal } from './components/FirstLoginModal';

import { Login } from './pages/Login';
import { SessionHub } from './pages/SessionHub';
import { SecurityLogs } from './pages/SecurityLogs';
import { AttendanceReportsPage } from './pages/AttendanceReportsPage';
import { ProfilePage } from './pages/ProfilePage';
import { StudentDashboard } from './pages/StudentDashboard';
import { QRScannerView } from './pages/QRScannerView';
import { ClassManagementPage } from './pages/ClassManagementPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { StudentTimetablePage } from './pages/StudentTimetablePage';
import { TimetablePage } from './pages/TimetablePage';
import { StudentManagement } from './pages/StudentManagement';
import { FacultyManagement } from './pages/FacultyManagement';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { AttendanceManagementPage } from './pages/AttendanceManagementPage';
import { SpellManagementPage } from './pages/SpellManagementPage';
import { RefreshCw } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, token, isLoading, mustChangePasswordTempToken } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';
  const [activeTab, setActiveTab] = useState<string>(() => (isAdmin ? 'class-management' : isFaculty ? 'faculty-dashboard' : 'student-dashboard'));
  const [sessionParams, setSessionParams] = useState<{ subject?: string; code?: string; faculty?: string; period?: string } | null>(null);

  const handleNavigate = (tab: string, extraData?: any) => {
    setActiveTab(tab);
    if (extraData) {
      setSessionParams(extraData);
    }
  };

  // Sync active tab whenever user or role changes
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' && (activeTab === 'student-dashboard' || activeTab === 'qr-scanner' || activeTab === 'student-timetable')) {
        setActiveTab('class-management');
      } else if (user.role === 'student' && (activeTab === 'class-management' || activeTab === 'sessions' || activeTab === 'dashboard' || activeTab === 'timetable')) {
        setActiveTab('student-dashboard');
      } else if (user.role === 'faculty') {
        setActiveTab('faculty-dashboard');
      }
    }
  }, [user]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-[#111827] flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/30 flex items-center justify-center text-[#6D5DFC] shadow-floating">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="font-display font-extrabold text-lg text-[#111827]">Initializing Elite Minds Attendance Portal...</h2>
        <p className="text-xs text-[#6B7280]">Smart Attendance. Intelligent Analytics. Seamless Academic Management.</p>
      </div>
    );
  }

  // Route Guard: If first login password change is required, force modal overlay blocking dashboard
  if (mustChangePasswordTempToken || (user && (user.is_first_login === true || user.is_first_login === 1 || user.must_change_password === 1))) {
    return <FirstLoginModal />;
  }

  // Route Guard: If not authenticated, render Login Page
  if (!user || !token) {
    return <Login />;
  }

  // Faculty Workspace Layout
  if (isFaculty) {
    return <FacultyDashboard />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#111827] transition-colors duration-300 font-sans relative overflow-x-hidden">
      {/* Ambient Background Shapes */}
      <div className="bg-ambient-shapes" />

      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row relative z-10 max-w-[1500px] w-full mx-auto">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full overflow-y-auto">
          {isAdmin ? (
            <>
              {(activeTab === 'class-management' || activeTab === 'dashboard') && <ClassManagementPage />}
              {activeTab === 'spell-management' && <SpellManagementPage />}
              {activeTab === 'students-management' && <StudentManagement />}
              {activeTab === 'faculty-management' && <FacultyManagement />}
              {activeTab === 'timetable' && <TimetablePage onNavigate={handleNavigate} />}
              {activeTab === 'subjects' && <SubjectsPage onNavigate={handleNavigate} />}
              {activeTab === 'sessions' && (
                <SessionHub
                  initialSubject={sessionParams?.subject}
                  initialFaculty={sessionParams?.faculty}
                  initialSubjectCode={sessionParams?.code}
                  initialPeriod={sessionParams?.period}
                />
              )}
              {activeTab === 'reports' && <AttendanceReportsPage onNavigate={handleNavigate} />}
              {activeTab === 'attendance-management' && <AttendanceManagementPage />}
              {activeTab === 'security' && <SecurityLogs />}
              {activeTab === 'profile' && <ProfilePage />}
              {activeTab === 'settings' && <ProfilePage />}
            </>
          ) : (
            <>
              {(activeTab === 'student-dashboard' || activeTab === 'dashboard') && <StudentDashboard />}
              {activeTab === 'qr-scanner' && (
                <QRScannerView onSuccessReturn={() => setActiveTab('student-dashboard')} />
              )}
              {activeTab === 'student-timetable' && <StudentTimetablePage />}
              {activeTab === 'history' && <StudentDashboard />}
              {activeTab === 'profile' && <ProfilePage />}
              {activeTab === 'settings' && <ProfilePage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
