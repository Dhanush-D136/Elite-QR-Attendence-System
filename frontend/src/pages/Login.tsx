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
  Zap,
  LockKeyhole,
  Activity,
  Cpu,
  Database
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
    <div className="min-h-screen bg-[#050816] text-[#111827] flex flex-col xl:flex-row relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Noise & Ambient Aurora Mesh Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#1A1C38]/40 via-[#050816] to-[#02040A] pointer-events-none z-0" />
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#5B5BFF]/10 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-[#8A7DFF]/10 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* LEFT SIDE: 65% BRAND EXPERIENCE ZONE & CINEMATIC 4-LAYER HERO */}
      <div className="xl:w-[65%] w-full relative min-h-[380px] sm:min-h-[460px] xl:min-h-screen bg-[#050816] flex flex-col justify-between p-6 sm:p-10 xl:p-14 overflow-hidden z-10">
        
        {/* LAYER 1: Full-Height Background Cover Image */}
        <img
          src="/family.jpg"
          alt="Elite Minds Hero Cover"
          className="absolute inset-0 w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-1000 ease-out filter contrast-105 z-0 opacity-85"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/hero_banner.png';
          }}
        />

        {/* LAYER 2: Dark Navy Deep Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/75 to-[#050816]/90 z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050816]/95 via-[#050816]/60 to-transparent hidden xl:block z-0" />
        
        {/* LAYER 3: Glassmorphic Overlay & Depth Blur System */}
        <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[24px] z-0" />

        {/* LAYER 4: Animated Light Particles & Aurora Connection Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(91,91,255,0.18),transparent_65%)] pointer-events-none z-0 animate-pulse" />

        {/* TOP BRANDING BAR */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer">
            {/* Glass Icon Container */}
            <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-[24px] border border-white/25 text-white flex items-center justify-center shadow-[0_0_40px_rgba(91,91,255,0.4)] group-hover:scale-105 group-hover:border-[#5B5BFF]/60 transition-all duration-300">
              <Shield className="w-6 h-6 text-white drop-shadow-md" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-xl xl:text-2xl tracking-[0.12em] block leading-none">
                ELITE MINDS
              </span>
              <span className="text-[#8A7DFF] text-[11px] font-medium tracking-wider uppercase block mt-1">
                Enterprise Academic Intelligence Platform
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-[#8A7DFF] animate-pulse" />
            <span className="tracking-wide">ENTERPRISE GRADE v2.4</span>
          </div>
        </div>

        {/* CENTER-LEFT HERO CONTENT & EXECUTIVE KPI CARDS */}
        <div className="relative z-10 my-auto py-8 xl:py-12 space-y-8 max-w-2xl">
          {/* Floating Glass Feature Badges */}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-2 shadow-md hover:bg-white/15 transition-all">
              <QrCode className="w-4 h-4 text-[#5B5BFF]" />
              <span>QR Attendance Engine</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-2 shadow-md hover:bg-white/15 transition-all">
              <BarChart3 className="w-4 h-4 text-[#00D084]" />
              <span>Real-Time Intelligence</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-2 shadow-md hover:bg-white/15 transition-all">
              <Calendar className="w-4 h-4 text-[#8A7DFF]" />
              <span>Smart Timetable Sync</span>
            </div>
          </div>

          {/* Main Headline & Subtitle */}
          <div className="space-y-4">
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl xl:text-6xl text-white tracking-tight leading-[1.06] drop-shadow-2xl">
              ELITE MINDS <br />
              <span className="bg-gradient-to-r from-[#8A7DFF] via-white to-[#5B5BFF] bg-clip-text text-transparent">
                Enterprise Academic Intelligence
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-xl drop-shadow-sm">
              One Unified Platform for Attendance, Analytics, Timetable Intelligence, Faculty Operations, Student Success.
            </p>
          </div>

          {/* EXECUTIVE KPI METRIC CARDS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2 max-w-xl">
            <div className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-[24px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Students</span>
                <User className="w-3.5 h-3.5 text-[#5B5BFF] group-hover:scale-110 transition-transform" />
              </div>
              <span className="font-display font-extrabold text-2xl xl:text-3xl text-white block">62+</span>
              <span className="text-[10px] text-[#00D084] font-semibold mt-0.5 block">Active Roster</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-[24px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Subjects</span>
                <BookOpen className="w-3.5 h-3.5 text-[#8A7DFF] group-hover:scale-110 transition-transform" />
              </div>
              <span className="font-display font-extrabold text-2xl xl:text-3xl text-[#8A7DFF] block">10+</span>
              <span className="text-[10px] text-slate-300 font-semibold mt-0.5 block">Integrated Modules</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-[24px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Uptime</span>
                <Activity className="w-3.5 h-3.5 text-[#00D084] group-hover:scale-110 transition-transform" />
              </div>
              <span className="font-display font-extrabold text-2xl xl:text-3xl text-[#00D084] block">99.9%</span>
              <span className="text-[10px] text-slate-300 font-semibold mt-0.5 block">Platform SLA</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-[24px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-1.5 transition-all duration-300 group">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
                <Cpu className="w-3.5 h-3.5 text-[#5B5BFF] group-hover:scale-110 transition-transform" />
              </div>
              <span className="font-display font-extrabold text-2xl xl:text-3xl text-white block">100%</span>
              <span className="text-[10px] text-[#8A7DFF] font-semibold mt-0.5 block">Digital Sync</span>
            </div>
          </div>
        </div>

        {/* FLOATING STATUS BAR DOCK */}
        <div className="relative z-10 hidden xl:flex items-center justify-between text-xs text-slate-400 font-medium">
          <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold flex items-center gap-3 shadow-lg">
            <span className="flex items-center gap-1.5 text-[#00D084]">
              <span className="w-2 h-2 rounded-full bg-[#00D084] animate-ping" />
              System Operational
            </span>
            <span className="text-white/30">•</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Zap className="w-3 h-3 text-[#5B5BFF]" /> Live Sync Active
            </span>
            <span className="text-white/30">•</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Shield className="w-3 h-3 text-[#8A7DFF]" /> Enterprise Grade Security
            </span>
            <span className="text-white/30">•</span>
            <span className="text-slate-300">SOC Compliant</span>
            <span className="text-white/30">•</span>
            <span className="text-[#00D084]">99.9% Uptime</span>
          </div>

          <p className="text-[11px] text-slate-400 font-mono">
            © 2026 Elite Minds Enterprise
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: 35% AUTHENTICATION ZONE (FLOATING GLASS CARD OVERLAP) */}
      <div className="xl:w-[35%] w-full flex flex-col justify-center p-4 sm:p-8 xl:p-12 z-20 relative xl:-ml-20 my-auto">
        {/* FLOATING GLASS AUTHENTICATION PANEL */}
        <div className="w-full max-w-md mx-auto bg-white/88 backdrop-blur-[40px] rounded-[32px] p-7 sm:p-10 border border-white/80 shadow-[0_40px_120px_rgba(0,0,0,0.25)] space-y-6 animate-fade-in relative">
          
          {/* Welcome Section */}
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#111827] tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs text-[#6B7280] font-medium">
              Access your academic intelligence workspace.
            </p>
          </div>

          {/* SEGMENTED ENTERPRISE ROLE SWITCHER (3-WAY) */}
          <div className="relative p-1.5 rounded-2xl bg-[#F1F5F9]/80 border border-[#E2E8F0] grid grid-cols-3 text-xs font-bold gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 relative z-10 ${
                role === 'student'
                  ? 'bg-gradient-to-r from-[#5B5BFF] to-[#6F8CFF] text-white shadow-[0_4px_15px_rgba(91,91,255,0.35)] font-extrabold'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <User className={`w-3.5 h-3.5 ${role === 'student' ? 'text-white' : 'text-[#94A3B8]'}`} />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('faculty'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 relative z-10 ${
                role === 'faculty'
                  ? 'bg-gradient-to-r from-[#5B5BFF] to-[#6F8CFF] text-white shadow-[0_4px_15px_rgba(91,91,255,0.35)] font-extrabold'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${role === 'faculty' ? 'text-white' : 'text-[#94A3B8]'}`} />
              <span>Faculty</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('admin'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 relative z-10 ${
                role === 'admin'
                  ? 'bg-gradient-to-r from-[#5B5BFF] to-[#6F8CFF] text-white shadow-[0_4px_15px_rgba(91,91,255,0.35)] font-extrabold'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${role === 'admin' ? 'text-white' : 'text-[#94A3B8]'}`} />
              <span>Admin</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3 font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider mb-2">
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
                  className="w-full h-[64px] px-5 py-3.5 rounded-[18px] bg-slate-50/80 border border-[#E2E8F0] text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#5B5BFF] focus:bg-white focus:ring-4 focus:ring-[#5B5BFF]/15 text-xs pl-12 font-medium transition-all shadow-sm"
                />
                {role === 'student' ? (
                  <User className="w-5 h-5 text-[#94A3B8] group-focus-within:text-[#5B5BFF] absolute left-4 top-5 transition-colors" />
                ) : role === 'faculty' ? (
                  <BookOpen className="w-5 h-5 text-[#94A3B8] group-focus-within:text-[#5B5BFF] absolute left-4 top-5 transition-colors" />
                ) : (
                  <Mail className="w-5 h-5 text-[#94A3B8] group-focus-within:text-[#5B5BFF] absolute left-4 top-5 transition-colors" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#111827] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-[#5B5BFF] hover:underline font-bold"
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
                  className="w-full h-[64px] px-5 py-3.5 rounded-[18px] bg-slate-50/80 border border-[#E2E8F0] text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#5B5BFF] focus:bg-white focus:ring-4 focus:ring-[#5B5BFF]/15 text-xs pl-12 font-medium transition-all shadow-sm"
                />
                <Lock className="w-5 h-5 text-[#94A3B8] group-focus-within:text-[#5B5BFF] absolute left-4 top-5 transition-colors" />
              </div>
            </div>

            {/* PREMIUM EXTRAORDINARY SIGN IN BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[64px] rounded-[18px] bg-gradient-to-r from-[#5B5BFF] to-[#6F8CFF] hover:from-[#4b4bff] hover:to-[#5c7cff] font-extrabold text-xs text-white shadow-[0_12px_30px_rgba(91,91,255,0.45)] hover:shadow-[0_18px_40px_rgba(91,91,255,0.55)] transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 mt-4 cursor-pointer relative overflow-hidden group"
            >
              {/* Shimmer Light Sweep Hover Animation */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              
              {isLoading ? (
                <span>Authenticating Workspace...</span>
              ) : (
                <>
                  <span className="tracking-wide">Sign In to {role === 'student' ? 'Student Portal' : role === 'faculty' ? 'Faculty Portal' : 'Admin Console'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* TRUST BADGES SECTION */}
          <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-2 gap-2 text-[10px] text-[#64748B] font-semibold">
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="w-3.5 h-3.5 text-[#5B5BFF]" /> 256-Bit Encryption
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00D084]" /> Real-Time Sync
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#8A7DFF]" /> Enterprise Security
            </span>
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#5B5BFF]" /> Zero Data Loss
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
            <div className="w-12 h-12 rounded-2xl bg-[#F3F0FF] text-[#5B5BFF] flex items-center justify-center">
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
