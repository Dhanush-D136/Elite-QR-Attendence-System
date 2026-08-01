import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  QrCode,
  FileSpreadsheet,
  ShieldAlert,
  User,
  Camera,
  History,
  Sparkles,
  BookOpen,
  Home
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const adminNavItems = [
    { id: 'class-management', label: 'Admin Dashboard', icon: Building2 },
    { id: 'timetable', label: 'Timetable Management', icon: Calendar },
    { id: 'subjects', label: 'Subject Management', icon: BookOpen },
    { id: 'sessions', label: 'Live QR Session', icon: QrCode },
    { id: 'reports', label: 'Reports & Analytics', icon: FileSpreadsheet },
    { id: 'security', label: 'Security Logs', icon: ShieldAlert },
    { id: 'profile', label: 'Profile Settings', icon: User },
  ];

  const studentNavItems = [
    { id: 'student-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'qr-scanner', label: 'Scan QR Code', icon: Camera },
    { id: 'student-timetable', label: 'My Timetable', icon: Calendar },
    { id: 'history', label: 'Attendance Log', icon: History },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const mobileNavItems = isAdmin
    ? [
        { id: 'class-management', label: 'Home', icon: Home },
        { id: 'timetable', label: 'Timetable', icon: Calendar },
        { id: 'sessions', label: 'QR', icon: QrCode },
        { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
        { id: 'profile', label: 'Profile', icon: User },
      ]
    : [
        { id: 'student-dashboard', label: 'Home', icon: Home },
        { id: 'history', label: 'Attendance', icon: History },
        { id: 'qr-scanner', label: 'QR', icon: Camera },
        { id: 'student-timetable', label: 'Timetable', icon: Calendar },
        { id: 'profile', label: 'Profile', icon: User },
      ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:block w-64 p-4 md:p-6 shrink-0">
        <div className="bg-white/95 backdrop-blur-md border border-[#E7E7E7] rounded-[24px] p-4 shadow-enterprise space-y-4">
          {/* Console Header Badge */}
          <div className="px-3.5 py-2 rounded-2xl bg-[#F7F3EE] border border-[#E7E7E7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#6D5DFC]" />
              <span className="text-[11px] font-extrabold text-[#111827] uppercase tracking-wider">
                {isAdmin ? 'ELITE MINDS' : 'Student Portal'}
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#12B76A]" />
          </div>

          {/* Navigation Items */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-medium text-xs transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#F3F0FF] text-[#6D5DFC] font-bold border border-[#6D5DFC]/20 shadow-sm'
                      : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#FAFAFA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-[#6D5DFC]' : 'text-[#6B7280]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-4 rounded-full bg-[#6D5DFC]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E7E7E7] px-2 py-1.5 shadow-2xl">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
                  isActive
                    ? 'text-[#6D5DFC] font-bold bg-[#F3F0FF]'
                    : 'text-[#6B7280] font-medium hover:text-[#111827]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-[#6D5DFC]' : 'text-[#6B7280]'}`} />
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
