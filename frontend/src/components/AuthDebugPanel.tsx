import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Key, Terminal } from 'lucide-react';

interface AuthDebugPanelProps {
  activeTab: string;
}

export const AuthDebugPanel: React.FC<AuthDebugPanelProps> = ({ activeTab }) => {
  const { user, token, isLoading } = useAuth();

  const isDevMode = localStorage.getItem('smartattend_dev_mode') === 'true';
  const isAdmin = user?.role === 'admin';

  if (!isAdmin || !isDevMode) {
    return null;
  }

  const tokenExists = !!token;
  const userExists = !!user;
  const isAuthenticated = tokenExists && userExists;

  return (
    <div className="bg-white border-b border-[#E7E7E7] px-6 py-2 text-xs font-mono text-[#111827] flex items-center justify-between overflow-x-auto shadow-subtle">
      <div className="flex items-center gap-4 shrink-0">
        <span className="flex items-center gap-1.5 text-[#6D5DFC] font-bold">
          <Terminal className="w-3.5 h-3.5" /> Dev Monitor:
        </span>

        <span className="flex items-center gap-1">
          <Key className="w-3 h-3 text-amber-500" />
          Token: <strong className={tokenExists ? 'text-[#12B76A]' : 'text-rose-600'}>{tokenExists ? 'ACTIVE' : 'MISSING'}</strong>
        </span>

        <span className="flex items-center gap-1">
          <UserCheck className="w-3 h-3 text-[#6D5DFC]" />
          User: <strong className={userExists ? 'text-[#111827]' : 'text-rose-600'}>{user ? `${user.name} (${user.role})` : 'NULL'}</strong>
        </span>

        <span className="flex items-center gap-1">
          Active Tab: <strong className="text-[#4F7CFF]">{activeTab}</strong>
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0 text-[10px]">
        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
          isLoading
            ? 'bg-amber-50 text-amber-600 border border-amber-200'
            : isAuthenticated
            ? 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20'
            : 'bg-rose-50 text-rose-600 border border-rose-200'
        }`}>
          {isLoading ? 'LOADING...' : isAuthenticated ? '✓ AUTHENTICATED' : 'UNAUTHENTICATED'}
        </span>
      </div>
    </div>
  );
};
