import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, Mail, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginAdmin, loginStudent } = useAuth();
  const [role, setRole] = useState<'admin' | 'student'>('student');

  // Form fields
  const [email, setEmail] = useState('admin@smartattend.com');
  const [adminPassword, setAdminPassword] = useState('admin123');

  const [rollNumber, setRollNumber] = useState('113024243001');
  const [studentPassword, setStudentPassword] = useState('1234');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await loginAdmin(email, adminPassword);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid admin credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await loginStudent(rollNumber, studentPassword);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid student roll number or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-click auto logins
  const handleQuickAdminLogin = async () => {
    setRole('admin');
    setEmail('admin@smartattend.com');
    setAdminPassword('admin123');
    setError('');
    setIsLoading(true);
    try {
      await loginAdmin('admin@smartattend.com', 'admin123');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login as Admin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStudentLogin = async (roll: string) => {
    setRole('student');
    setRollNumber(roll);
    setStudentPassword('1234');
    setError('');
    setIsLoading(true);
    try {
      await loginStudent(roll, '1234');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login as Student');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111827] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Ambient Soft Blob Geometry (2% - 5% Opacity) */}
      <div className="bg-ambient-shapes" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#6D5DFC] text-white flex items-center justify-center shadow-floating mx-auto">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="font-display font-extrabold text-3xl tracking-tight text-[#111827]">
          SmartAttend <span className="text-[#6D5DFC] font-bold text-xs px-3 py-1 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20">PRO</span>
        </h1>
        <p className="text-xs text-[#6B7280] font-medium">Enterprise Geofenced QR Attendance Engine</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E7E7E7] shadow-enterprise space-y-6">
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#F7F3EE] border border-[#E7E7E7] text-xs font-bold">
            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                role === 'student'
                  ? 'bg-white text-[#111827] shadow-sm font-bold border border-[#E7E7E7]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#6D5DFC]" />
              <span>Student Portal</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('admin'); setError(''); }}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                role === 'admin'
                  ? 'bg-white text-[#111827] shadow-sm font-bold border border-[#E7E7E7]'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#4F7CFF]" />
              <span>Admin Console</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Login Form */}
          {role === 'student' ? (
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Roll Number or Email</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 113024243001 or CS202601"
                    className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:bg-white text-xs pl-10 uppercase font-mono transition-all"
                  />
                  <User className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Default initial password: 1234"
                    className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:bg-white text-xs pl-10 transition-all"
                  />
                  <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-[#6D5DFC] mt-1.5 font-medium">Default initial student password is <code className="font-mono bg-[#F3F0FF] px-1.5 py-0.5 rounded-lg border border-[#6D5DFC]/20">1234</code></p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {isLoading ? (
                  <span>Authenticating Session...</span>
                ) : (
                  <>
                    <span>Sign In to Student Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Admin Login Form */
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Admin Email or Username</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@smartattend.com"
                    className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:bg-white text-xs pl-10 transition-all"
                  />
                  <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="admin123"
                    className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:bg-white text-xs pl-10 transition-all"
                  />
                  <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {isLoading ? (
                  <span>Authenticating Admin...</span>
                ) : (
                  <>
                    <span>Sign In to Admin Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Preset 1-Click Demo Logins Bar */}
          <div className="pt-5 border-t border-[#E7E7E7] text-[11px] text-[#6B7280] space-y-3">
            <p className="font-bold text-[#111827] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#6D5DFC]" />
              Quick Demo Access Shortcuts:
            </p>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                className="p-2.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[#6D5DFC] hover:bg-[#6D5DFC]/10 transition-all text-left font-semibold"
              >
                🔑 Admin Console
                <span className="block text-[9px] text-[#6B7280] font-normal mt-0.5">admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickStudentLogin('113024243001')}
                className="p-2.5 rounded-2xl bg-[#F7F3EE] border border-[#E7E7E7] text-[#111827] hover:bg-[#E7E7E7] transition-all text-left font-semibold"
              >
                🎓 Student 1
                <span className="block text-[9px] text-[#6B7280] font-normal mt-0.5">113024243001</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickStudentLogin('CS202601')}
                className="p-2.5 rounded-2xl bg-[#F7F3EE] border border-[#E7E7E7] text-[#111827] hover:bg-[#E7E7E7] transition-all text-left font-semibold"
              >
                🎓 Student 2
                <span className="block text-[9px] text-[#6B7280] font-normal mt-0.5">CS202601</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
