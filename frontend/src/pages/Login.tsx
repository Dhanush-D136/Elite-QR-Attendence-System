import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, Mail, ArrowRight, AlertCircle, HelpCircle, X } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginAdmin, loginStudent } = useAuth();
  const [role, setRole] = useState<'student' | 'admin'>('student');

  // Form fields initialized completely empty
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter both your User ID / Register Number and Password.');
      return;
    }

    setIsLoading(true);
    try {
      if (role === 'admin') {
        await loginAdmin(identifier.trim(), password);
      } else {
        await loginStudent(identifier.trim(), password);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111827] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Ambient Soft Geometry */}
      <div className="bg-ambient-shapes" />

      {/* Header & Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#6D5DFC] text-white flex items-center justify-center shadow-floating mx-auto">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-[#111827]">
          SmartAttend <span className="text-[#6D5DFC] font-bold text-xs px-3 py-1 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20">PRO</span>
        </h1>
        <p className="text-xs text-[#6B7280] font-medium">Academic Portal & Geofenced Attendance System</p>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E7E7E7] shadow-enterprise space-y-6">
          
          {/* Role Switcher */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#F7F3EE] border border-[#E7E7E7] text-xs font-bold">
            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                role === 'student'
                  ? 'bg-white text-[#111827] shadow-sm font-bold border border-[#E7E7E7]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <User className="w-4 h-4 text-[#6D5DFC]" />
              <span>Student Portal</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('admin'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                role === 'admin'
                  ? 'bg-white text-[#111827] shadow-sm font-bold border border-[#E7E7E7]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <Shield className="w-4 h-4 text-[#4F7CFF]" />
              <span>Admin Console</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                {role === 'student' ? 'Register Number / Email' : 'Admin Email / Username'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={role === 'student' ? 'Enter your Register Number' : 'Enter Admin Email'}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:bg-white text-xs pl-11 transition-all"
                />
                {role === 'student' ? (
                  <User className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-4" />
                ) : (
                  <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-4" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#111827]">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-[#6D5DFC] hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:bg-white text-xs pl-11 transition-all"
                />
                <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-4 top-4" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center justify-center gap-2 active:scale-98 mt-2"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to {role === 'student' ? 'Student Portal' : 'Admin Console'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4 animate-fade-in relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#111827] p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-extrabold text-lg text-[#111827]">Reset Password</h3>
            <p className="text-xs text-[#6B7280]">
              If you have forgotten your password or need a password reset, please contact your Department Administrator or Class Advisor to reset your account credentials.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-3 rounded-full bg-[#111827] font-bold text-xs text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
