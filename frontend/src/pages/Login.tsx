import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  User,
  BookOpen,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  QrCode,
  BarChart3,
  Calendar,
  FileCheck2,
  CheckCircle2,
  Zap,
  LockKeyhole,
  Heart
} from 'lucide-react';

export const Login: React.FC = () => {
  const { loginAdmin, loginStudent, loginFaculty } = useAuth();
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter both your Credentials and Password.');
      return;
    }

    setIsLoading(true);
    try {
      if (role === 'admin') {
        await loginAdmin(identifier.trim(), password);
      } else if (role === 'faculty') {
        await loginFaculty(identifier.trim(), password);
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
    <div className="min-h-screen bg-[#0F172A] text-[#111827] flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      {/* Background Soft Noise & Ambient Glow Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#1E1B4B]/30 via-[#0F172A] to-[#020617] pointer-events-none" />

      {/* LEFT SIDE: 65% BRAND EXPERIENCE & HERO FAMILY COVER */}
      <div className="lg:w-[65%] w-full relative min-h-[340px] sm:min-h-[420px] lg:min-h-screen bg-[#0B0F19] flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden">
        {/* Full-Height Hero Background Cover Image */}
        <img
          src="/family.jpg"
          alt="Elite Minds Family Hero Cover"
          className="absolute inset-0 w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-1000 ease-out filter contrast-105 brightness-95 z-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/hero_banner.png';
          }}
        />

        {/* Soft Shading Overlays to Keep Photograph Clear & Visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/45 z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent hidden lg:block z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(109,93,252,0.2),transparent_70%)] z-0" />

        {/* TOP BRANDING BAR */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6D5DFC] to-[#4F7CFF] text-white flex items-center justify-center shadow-lg border border-white/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="font-display font-extrabold text-white text-xl tracking-tight block">
                ELITE MINDS
              </span>
              <span className="text-[#A594FF] text-[11px] font-mono font-bold tracking-wider block">
                Elite Minds Family Portal
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#A594FF] animate-pulse" />
            <span>Academic Portal v2.4</span>
          </div>
        </div>

        {/* CENTER-LEFT HERO BRANDING & METRICS */}
        <div className="relative z-10 my-auto py-8 lg:py-12 space-y-6 max-w-2xl">
          {/* Floating Family Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-md">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
            <span>One Family • One Mission</span>
          </div>

          {/* Main Title & Subtitle */}
          <div className="space-y-3">
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-none drop-shadow-xl">
              ELITE MINDS <br />
              <span className="bg-gradient-to-r from-[#A594FF] via-white to-[#6D5DFC] bg-clip-text text-transparent">
                Family Portal
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-200 font-semibold leading-relaxed max-w-lg drop-shadow-md">
              Learning Together. Growing Together. Achieving Together.
            </p>
          </div>

          {/* INSTITUTION FAMILY METRIC COUNTERS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-lg border-t border-white/20">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="font-display font-extrabold text-2xl sm:text-3xl text-white block">62+</span>
              <span className="text-[11px] text-slate-200 font-bold uppercase tracking-wider block">Students</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="font-display font-extrabold text-2xl sm:text-3xl text-[#A594FF] block">10+</span>
              <span className="text-[11px] text-slate-200 font-bold uppercase tracking-wider block">Subjects</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="font-display font-extrabold text-2xl sm:text-3xl text-[#12B76A] block">100%</span>
              <span className="text-[11px] text-slate-200 font-bold uppercase tracking-wider block">Digital</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="font-display font-extrabold text-2xl sm:text-3xl text-amber-300 block">1</span>
              <span className="text-[11px] text-slate-200 font-bold uppercase tracking-wider block">Elite Family</span>
            </div>
          </div>
        </div>

        {/* FOOTER CAPTION */}
        <div className="relative z-10 hidden lg:flex items-center justify-between text-xs text-slate-200 font-medium">
          <p>© 2026 Elite Minds Family • Built With Pride ❤️</p>
          <p className="flex items-center gap-1.5 text-white font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A]" /> System Status: Operational
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: 35% AUTHENTICATION EXPERIENCE (FLOATING GLASS OVERLAP CARD) */}
      <div className="lg:w-[35%] w-full flex flex-col justify-center p-4 sm:p-8 lg:p-10 z-20 relative lg:-ml-24 my-auto">
        {/* FLOATING GLASS AUTHENTICATION PANEL */}
        <div className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-9 border border-white/80 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] space-y-6 animate-fade-in relative">
          
          {/* Header Title */}
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#111827] tracking-tight">
              Welcome back to the Elite Minds Family ❤️
            </h2>
            <p className="text-xs text-[#6B7280] font-medium">
              Access your academic workspace securely.
            </p>
          </div>

          {/* ANIMATED SEGMENTED CONTROL ROLE SWITCHER (3-WAY) */}
          <div className="relative p-1.5 rounded-2xl bg-[#F1F5F9] border border-[#E2E8F0] grid grid-cols-3 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 relative z-10 ${
                role === 'student'
                  ? 'bg-white text-[#111827] shadow-md font-extrabold border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <User className={`w-3.5 h-3.5 ${role === 'student' ? 'text-[#6D5DFC]' : 'text-[#94A3B8]'}`} />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('faculty'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 relative z-10 ${
                role === 'faculty'
                  ? 'bg-white text-[#111827] shadow-md font-extrabold border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${role === 'faculty' ? 'text-purple-600' : 'text-[#94A3B8]'}`} />
              <span>Faculty</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('admin'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 relative z-10 ${
                role === 'admin'
                  ? 'bg-white text-[#111827] shadow-md font-extrabold border border-[#E2E8F0]'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${role === 'admin' ? 'text-[#4F7CFF]' : 'text-[#94A3B8]'}`} />
              <span>Admin</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-1.5">
                {role === 'student' ? 'Register Number / Official VH Email' : role === 'faculty' ? 'Faculty ID / Official Email' : 'Admin Email / Username'}
              </label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    role === 'student'
                      ? 'e.g. 113024243032 or vh13936@velhightech.com'
                      : role === 'faculty'
                      ? 'e.g. VEL TECH or FAC001'
                      : 'Enter Admin Email'
                  }
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#6D5DFC] focus:bg-white focus:ring-4 focus:ring-[#6D5DFC]/10 text-xs pl-11 font-medium transition-all"
                />
                {role === 'student' ? (
                  <User className="w-4 h-4 text-[#94A3B8] group-focus-within:text-[#6D5DFC] absolute left-4 top-4 transition-colors" />
                ) : role === 'faculty' ? (
                  <BookOpen className="w-4 h-4 text-[#94A3B8] group-focus-within:text-purple-600 absolute left-4 top-4 transition-colors" />
                ) : (
                  <Mail className="w-4 h-4 text-[#94A3B8] group-focus-within:text-[#4F7CFF] absolute left-4 top-4 transition-colors" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-[#6D5DFC] hover:underline font-bold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#6D5DFC] focus:bg-white focus:ring-4 focus:ring-[#6D5DFC]/10 text-xs pl-11 font-medium transition-all"
                />
                <Lock className="w-4 h-4 text-[#94A3B8] group-focus-within:text-[#6D5DFC] absolute left-4 top-4 transition-colors" />
              </div>
            </div>

            {/* PREMIUM CTA BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6D5DFC] to-[#4F7CFF] hover:from-[#5b4be0] hover:to-[#3b68ee] font-extrabold text-xs text-white shadow-[0_10px_25px_-5px_rgba(109,93,252,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(109,93,252,0.5)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating Workspace...</span>
              ) : (
                <>
                  <span>Sign In to {role === 'student' ? 'Student Portal' : 'Admin Console'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* SECURITY FOOTER INDICATORS */}
          <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between text-[10px] text-[#64748B] font-semibold gap-2">
            <span className="flex items-center gap-1">
              <LockKeyhole className="w-3 h-3 text-[#6D5DFC]" /> 256-Bit Secure Auth
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Real-Time Engine
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#12B76A]" /> Enterprise Grade
            </span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-7 border border-[#E2E8F0] shadow-2xl space-y-4 animate-fade-in relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-[#94A3B8] hover:text-[#111827] p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-extrabold text-xl text-[#111827]">Reset Credentials</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              If you have forgotten your password or need a password reset, please contact your Department Administrator or Class Advisor to reset your account credentials.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-3.5 rounded-2xl bg-[#111827] font-bold text-xs text-white hover:bg-black transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
