import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Sparkles,
  Calendar,
  Clock,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  User,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Award,
  ChevronRight,
  X,
  RefreshCw,
  BookOpen,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';

export interface StudentIntelligenceItem {
  id: string;
  register_number?: string;
  roll_number: string;
  vh_number?: string;
  name: string;
  department: string;
  year: number;
  section: string;
  profile_photo?: string;
  presentPeriods: number;
  totalScheduledPeriods: number;
  missedPeriods: number;
  attendancePercentage: number;
  overallPercentage?: number;
  spellPercentage?: number;
  presentDays?: number;
  absentDays?: number;
  classesAttended?: number;
  classesMissed?: number;
  currentStreak?: number;
  lastScanTime?: string;
  status: string;
  riskCategory?: string;
  statusColor: string;
  periods: Record<string, 'P' | 'A'>;
  dailyBreakdown?: Array<{
    date: string;
    presentPeriods: number;
    missedPeriods: number;
    periods: string[];
  }>;
}

export const StudentAttendanceIntelligence: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [department, setDepartment] = useState<string>('All');
  const [year, setYear] = useState<string>('All');
  const [section, setSection] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [students, setStudents] = useState<StudentIntelligenceItem[]>([]);
  const [summary, setSummary] = useState<any>({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    avgAttendance: 0,
    avgSpellAttendance: 0,
    highRiskCount: 0,
    safeCount: 0,
    conductedPeriodsToday: 8
  });
  const [liveQr, setLiveQr] = useState<any>({
    active: false,
    subject: 'No Active QR Session',
    scannedCount: 0,
    pendingCount: 0,
    totalStudents: 0,
    liveAttendancePct: 0,
    lastScanTimestamp: 'N/A',
    expiryTime: 'Session Idle'
  });
  const [streakLeaders, setStreakLeaders] = useState<any[]>([]);
  const [trendAnalytics, setTrendAnalytics] = useState<any>({
    dailyTrend: [],
    weeklyTrend: [],
    growthRate: '+3.2%',
    dropRate: '-1.1%',
    lowestStudents: [],
    highestStudents: []
  });
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [dayOrderInfo, setDayOrderInfo] = useState<any>({
    currentDate: todayStr,
    dayName: 'Monday',
    dayOrder: 'Day Order 1',
    periodSubjects: {
      P1: 'Knowledge Engineering',
      P2: 'Machine Learning',
      P3: 'Data Mining',
      P4: 'Break / Seminar',
      P5: 'Computer Vision',
      P6: 'AI Lab',
      P7: 'AI Lab',
      P8: 'Placement Training'
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentIntelligenceItem | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  const fetchIntelligenceData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (department !== 'All') params.append('department', department);
      if (year !== 'All') params.append('year', year);
      if (section !== 'All') params.append('section', section);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/analytics/period-intelligence?${params.toString()}`);
      if (res.data.success) {
        setStudents(res.data.students || []);
        setSummary(res.data.summary || {});
        setLiveQr(res.data.liveQr || {});
        setStreakLeaders(res.data.streakLeaders || []);
        setTrendAnalytics(res.data.trendAnalytics || {});
        setDayOrderInfo(res.data.dayOrderInfo || {});
        setDiagnostics(res.data.diagnostics || null);
      }
    } catch (err) {
      console.error('Failed to load period intelligence data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligenceData();

    const socket = getSocket();
    const handleLiveSync = () => {
      console.log('⚡ [PERIOD INTELLIGENCE] Live attendance update received via Socket.IO');
      fetchIntelligenceData();
    };

    socket.on('attendanceMarked', handleLiveSync);
    socket.on('attendance_marked', handleLiveSync);
    socket.on('attendance_updated', handleLiveSync);
    socket.on('roster_updated', handleLiveSync);
    socket.on('session_created', handleLiveSync);

    return () => {
      socket.off('attendanceMarked', handleLiveSync);
      socket.off('attendance_marked', handleLiveSync);
      socket.off('attendance_updated', handleLiveSync);
      socket.off('roster_updated', handleLiveSync);
      socket.off('session_created', handleLiveSync);
    };
  }, [fromDate, toDate, department, year, section, searchQuery]);

  // Filtering Logic
  const filteredStudents = students.filter((st) => {
    const pct = st.attendancePercentage;
    if (riskFilter === 'Safe' && pct < 75) return false;
    if (riskFilter === 'Warning' && (pct < 65 || pct >= 75)) return false;
    if (riskFilter === 'HighRisk' && (pct < 50 || pct >= 65)) return false;
    if (riskFilter === 'Critical' && pct >= 50) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = filteredStudents.map((st) => ({
      'Register Number': st.roll_number || st.register_number,
      'Student Name': st.name,
      'Department': st.department,
      'Year': st.year,
      'Section': st.section,
      'Overall Attendance %': `${st.overallPercentage || st.attendancePercentage}%`,
      'Spell Attendance %': `${st.spellPercentage || st.attendancePercentage}%`,
      'Present Days': st.presentDays || st.presentPeriods,
      'Absent Days': st.absentDays || st.missedPeriods,
      'Classes Attended': st.classesAttended || st.presentPeriods,
      'Classes Missed': st.classesMissed || st.missedPeriods,
      'Current Streak': st.currentStreak || 0,
      'Last Scan Time': st.lastScanTime || 'N/A',
      'Risk Category': st.riskCategory || st.status,
      'P1': st.periods.P1 || 'A',
      'P2': st.periods.P2 || 'A',
      'P3': st.periods.P3 || 'A',
      'P4': st.periods.P4 || 'A',
      'P5': st.periods.P5 || 'A',
      'P6': st.periods.P6 || 'A',
      'P7': st.periods.P7 || 'A',
      'P8': st.periods.P8 || 'A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Period Intelligence');
    XLSX.writeFile(wb, `Student_Attendance_Intelligence_${fromDate}_to_${toDate}.xlsx`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Register No', 'Name', 'Dept', 'Year', 'Section', 'Overall %', 'Spell %', 'Present Days', 'Absent Days', 'Attended', 'Missed', 'Streak', 'Last Scan', 'Risk Category', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const rows = filteredStudents.map((st) => [
      st.roll_number || st.register_number,
      st.name,
      st.department,
      st.year,
      st.section,
      `${st.overallPercentage || st.attendancePercentage}%`,
      `${st.spellPercentage || st.attendancePercentage}%`,
      st.presentDays || st.presentPeriods,
      st.absentDays || st.missedPeriods,
      st.classesAttended || st.presentPeriods,
      st.classesMissed || st.missedPeriods,
      st.currentStreak || 0,
      st.lastScanTime || 'N/A',
      st.riskCategory || st.status,
      st.periods.P1 || 'A',
      st.periods.P2 || 'A',
      st.periods.P3 || 'A',
      st.periods.P4 || 'A',
      st.periods.P5 || 'A',
      st.periods.P6 || 'A',
      st.periods.P7 || 'A',
      st.periods.P8 || 'A'
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Student_Attendance_Intelligence_${fromDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`Student Attendance Intelligence Report (${fromDate} to ${toDate})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Day Order: ${dayOrderInfo.dayOrder || ''} (${dayOrderInfo.dayName || ''})`, 14, 22);

    const tableHeaders = [['Reg No', 'Name', 'Dept', 'Yr-Sec', 'Overall %', 'Spell %', 'Attended', 'Missed', 'Streak', 'Risk Status', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']];
    const tableData = filteredStudents.map((st) => [
      st.roll_number || st.register_number,
      st.name,
      st.department,
      `${st.year}-${st.section}`,
      `${st.overallPercentage || st.attendancePercentage}%`,
      `${st.spellPercentage || st.attendancePercentage}%`,
      st.classesAttended || st.presentPeriods,
      st.classesMissed || st.missedPeriods,
      st.currentStreak || 0,
      st.riskCategory || st.status,
      st.periods.P1 || 'A',
      st.periods.P2 || 'A',
      st.periods.P3 || 'A',
      st.periods.P4 || 'A',
      st.periods.P5 || 'A',
      st.periods.P6 || 'A',
      st.periods.P7 || 'A',
      st.periods.P8 || 'A'
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [109, 93, 252] }
    });

    doc.save(`Student_Attendance_Intelligence_${fromDate}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Module Title Header Card */}
      <div className="bg-white p-6 lg:p-8 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] font-mono font-extrabold text-[11px] uppercase tracking-wider border border-[#12B76A]/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse" />
              LIVE SUPABASE & SOCKET.IO SYNC ACTIVE
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl lg:text-3xl text-[#111827]">
            Student Attendance Intelligence
          </h1>
          <p className="text-xs text-[#6B7280] font-medium max-w-xl">
            Single Source of Truth attendance intelligence synced across Student, Faculty, and Admin portals.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchIntelligenceData}
            className="px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] hover:bg-[#F3F0FF] hover:border-[#6D5DFC]/40 transition-all flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#6D5DFC] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-2xl bg-[#ECFDF5] border border-[#10B981]/20 text-xs font-extrabold text-[#059669] hover:bg-[#10B981] hover:text-white transition-all flex items-center gap-2 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-extrabold text-amber-700 hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 text-xs font-extrabold text-[#6D5DFC] hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center gap-2 shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* LIVE QR ANALYTICS SESSION BAR */}
      <div className={`p-5 rounded-[24px] border shadow-enterprise flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        liveQr.active ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white border-emerald-500/30' : 'bg-white text-[#111827] border-[#E7E7E7]'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center gap-2 justify-center font-bold text-lg shadow-md ${
            liveQr.active ? 'bg-emerald-500 text-white animate-pulse' : 'bg-[#FAFAFA] text-[#6B7280] border border-[#E7E7E7]'
          }`}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-extrabold uppercase ${
                liveQr.active ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' : 'bg-gray-100 text-gray-600'
              }`}>
                {liveQr.active ? '● LIVE QR SESSION ACTIVE' : 'NO ACTIVE QR SESSION'}
              </span>
              {liveQr.active && (
                <span className="text-xs font-mono text-emerald-300 font-bold">{liveQr.period_number} • {liveQr.subject_code}</span>
              )}
            </div>
            <h3 className={`font-display font-extrabold text-lg mt-0.5 ${liveQr.active ? 'text-white' : 'text-[#111827]'}`}>
              {liveQr.subject}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm text-center">
            <span className="block text-[10px] uppercase opacity-70">Scanned Students</span>
            <strong className="text-base text-emerald-400 font-extrabold">{liveQr.scannedCount} / {liveQr.totalStudents}</strong>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm text-center">
            <span className="block text-[10px] uppercase opacity-70">Students Pending</span>
            <strong className="text-base text-rose-400 font-extrabold">{liveQr.pendingCount} Students</strong>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm text-center">
            <span className="block text-[10px] uppercase opacity-70">Live Attendance %</span>
            <strong className="text-base text-amber-300 font-extrabold">{liveQr.liveAttendancePct}%</strong>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm text-center">
            <span className="block text-[10px] uppercase opacity-70">Last Scan Time</span>
            <strong className="text-xs text-white font-mono">{liveQr.lastScanTimestamp}</strong>
          </div>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS (LIVE CLASS ANALYTICS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E7] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-[#6B7280] uppercase block">Total Students</span>
          <strong className="font-display font-extrabold text-xl text-[#111827] block">{summary.totalStudents || filteredStudents.length}</strong>
          <span className="text-[10px] text-[#6B7280]">Active Class Roster</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E7] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-[#12B76A] uppercase block">Present Today</span>
          <strong className="font-display font-extrabold text-xl text-[#12B76A] block">{summary.presentToday || 0}</strong>
          <span className="text-[10px] text-[#12B76A]">Scanned & Marked</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E7] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-rose-600 uppercase block">Absent Today</span>
          <strong className="font-display font-extrabold text-xl text-rose-600 block">{summary.absentToday || 0}</strong>
          <span className="text-[10px] text-rose-500">Unattended Slots</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E7] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-[#6D5DFC] uppercase block">Avg Attendance %</span>
          <strong className="font-display font-extrabold text-xl text-[#6D5DFC] block">{summary.avgAttendance || 0}%</strong>
          <span className="text-[10px] text-[#6D5DFC]">Overall Percentage</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E7] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-purple-600 uppercase block">Avg Spell %</span>
          <strong className="font-display font-extrabold text-xl text-purple-600 block">{summary.avgSpellAttendance || 0}%</strong>
          <span className="text-[10px] text-purple-500">Spell Attendance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E7] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-orange-600 uppercase block">High Risk (&lt;65%)</span>
          <strong className="font-display font-extrabold text-xl text-orange-600 block">{summary.highRiskCount || 0}</strong>
          <span className="text-[10px] text-orange-500">Critical Watchlist</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E7] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase block">Safe (≥75%)</span>
          <strong className="font-display font-extrabold text-xl text-emerald-600 block">{summary.safeCount || 0}</strong>
          <span className="text-[10px] text-emerald-500">Good Standing</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E7E7] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-amber-600 uppercase block">Streak Leaders</span>
          <strong className="font-display font-extrabold text-xl text-amber-600 block">{streakLeaders.length > 0 ? `${streakLeaders[0].streak} Days` : '0 Days'}</strong>
          <span className="text-[10px] text-amber-600">Top Streak Candidate</span>
        </div>
      </div>

      {/* DAY ORDER & PERIOD SUBJECT MATRIX BAR */}
      <div className="bg-gradient-to-br from-white to-[#F7F3EE]/50 p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E7E7]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#6D5DFC] text-white shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-[#6D5DFC] tracking-wider">Day Order Subject Matrix</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-extrabold text-[10px] border border-[#6D5DFC]/20">
                  {dayOrderInfo.dayOrder || 'Day Order 1'}
                </span>
              </div>
              <h3 className="font-display font-extrabold text-base text-[#111827]">
                Master Timetable Schedule ({dayOrderInfo.dayName || 'Monday'})
              </h3>
            </div>
          </div>

          <div className="text-xs font-bold text-[#6D5DFC] bg-white px-4 py-2 rounded-2xl border border-[#E7E7E7] shadow-xs flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" />
            <span>Active Period Count: 8 Periods Configured</span>
          </div>
        </div>

        {/* Period Chips Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {Array.from({ length: 8 }).map((_, idx) => {
            const pKey = `P${idx + 1}`;
            const subName = dayOrderInfo.periodSubjects ? dayOrderInfo.periodSubjects[pKey] : `Period ${idx + 1}`;
            const isBreak = subName?.toLowerCase().includes('break');

            return (
              <div
                key={pKey}
                className={`p-3 rounded-2xl border text-center space-y-1 transition-all ${
                  isBreak
                    ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                    : 'bg-white border-[#E7E7E7] hover:border-[#6D5DFC]/40 shadow-xs'
                }`}
              >
                <span className="text-[10px] font-mono font-black text-[#6D5DFC] block uppercase tracking-wider">
                  {pKey}
                </span>
                <p className="text-xs font-extrabold text-[#111827] truncate" title={subName}>
                  {subName}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search Reg No, Name, or VH No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-semibold text-[#111827] focus:bg-white focus:border-[#6D5DFC] focus:outline-none transition-all"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-semibold text-[#111827] focus:bg-white focus:border-[#6D5DFC] focus:outline-none transition-all"
            >
              <option value="All">All Depts</option>
              <option value="AI & DS">AI & DS / AI & Data Science</option>
              <option value="CSE">Computer Science & Engineering</option>
              <option value="ECE">Electronics & Communication</option>
              <option value="IT">Information Technology</option>
              <option value="EEE">Electrical & Electronics</option>
              <option value="Mechanical">Mechanical Engineering</option>
              <option value="Civil">Civil Engineering</option>
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-semibold text-[#111827] focus:bg-white focus:border-[#6D5DFC] focus:outline-none transition-all"
            >
              <option value="All">All Years</option>
              <option value="1">Year I</option>
              <option value="2">Year II</option>
              <option value="3">Year III</option>
              <option value="4">Year IV</option>
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-semibold text-[#111827] focus:bg-white focus:border-[#6D5DFC] focus:outline-none transition-all"
            >
              <option value="All">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>
          </div>

          {/* Risk Category Filter */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-semibold text-[#111827] focus:bg-white focus:border-[#6D5DFC] focus:outline-none transition-all"
            >
              <option value="All">All Risk Statuses</option>
              <option value="Safe">Safe (≥75%)</option>
              <option value="Warning">Warning (65-74%)</option>
              <option value="HighRisk">High Risk (50-64%)</option>
              <option value="Critical">Critical (&lt;50%)</option>
            </select>
          </div>
        </div>

        {/* Date Range Picker Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E7E7E7]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-[#111827]">Date Filter:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
            />
            <span className="text-xs font-bold text-[#6B7280]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
            />
            <button
              onClick={fetchIntelligenceData}
              className="px-4 py-2 rounded-2xl bg-[#6D5DFC] text-white text-xs font-extrabold hover:bg-[#5b4ceb] transition-all shadow-sm"
            >
              View Attendance
            </button>
          </div>

          <div className="text-xs text-[#6B7280] font-semibold">
            Showing <strong className="text-[#111827]">{filteredStudents.length}</strong> of {students.length} students
          </div>
        </div>
      </div>

      {/* MASTER STUDENT PERIOD-WISE ATTENDANCE GRID TABLE */}
      <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
          <div>
            <h3 className="font-display font-bold text-base text-[#111827]">
              Individual Student Attendance Intelligence
            </h3>
            <p className="text-xs text-[#6B7280] font-medium">
              Click any student row to view full historical timeline, streak stats, spell %, and detailed period breakdown.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#6B7280]">Color Key:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/30 text-[10px] font-mono font-extrabold">
              P = Present
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-mono font-extrabold">
              A = Absent
            </span>
          </div>
        </div>

        {/* Table View */}
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#6D5DFC] animate-spin mx-auto" />
            <p className="text-xs text-[#6B7280] font-bold">Computing student attendance intelligence matrix...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          /* EMPTY DATA DIAGNOSTIC CARD */
          <div className="py-12 px-6 bg-[#FAFAFA] rounded-2xl border border-dashed border-[#E7E7E7] text-center space-y-4 max-w-xl mx-auto my-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-extrabold text-base text-[#111827]">No Data Found for Selected Class</h4>
              <p className="text-xs text-[#6B7280] font-medium">
                {diagnostics?.status || 'No student records matched the specified department, year, or section filters.'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E7E7E7] text-left text-xs space-y-2">
              <span className="font-extrabold text-[#111827] block">System Diagnostics:</span>
              <ul className="space-y-1 text-[#6B7280] font-mono text-[11px]">
                <li>• Total Registered Students in DB: {diagnostics?.totalStudentsInDb || summary.totalStudents || 0}</li>
                <li>• Department Match: Multi-alias active (AI & DS ↔ AI & Data Science)</li>
                <li>• Suggested Action: Set Department/Year/Section to "All" or click reset.</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setDepartment('All');
                setYear('All');
                setSection('All');
                setRiskFilter('All');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-2xl bg-[#6D5DFC] text-white font-extrabold text-xs shadow-md hover:bg-[#5b4ceb] transition-all"
            >
              Reset Filters to Show All Students
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E7E7E7] bg-[#FAFAFA] text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-3 px-3">Reg No</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-2 text-center">Yr-Sec</th>
                  <th className="py-3 px-2 text-center">Overall %</th>
                  <th className="py-3 px-2 text-center text-purple-600">Spell %</th>
                  <th className="py-3 px-2 text-center text-emerald-600">Present</th>
                  <th className="py-3 px-2 text-center text-rose-600">Missed</th>
                  <th className="py-3 px-2 text-center text-amber-600">Streak</th>
                  <th className="py-3 px-2 text-center">Risk Status</th>
                  <th className="py-3 px-2 text-center bg-[#F3F0FF]/50 text-[#6D5DFC]">P1</th>
                  <th className="py-3 px-2 text-center bg-[#F3F0FF]/50 text-[#6D5DFC]">P2</th>
                  <th className="py-3 px-2 text-center bg-[#F3F0FF]/50 text-[#6D5DFC]">P3</th>
                  <th className="py-3 px-2 text-center bg-[#F3F0FF]/50 text-[#6D5DFC]">P4</th>
                  <th className="py-3 px-2 text-center bg-[#F3F0FF]/50 text-[#6D5DFC]">P5</th>
                  <th className="py-3 px-2 text-center bg-[#F3F0FF]/50 text-[#6D5DFC]">P6</th>
                  <th className="py-3 px-2 text-center bg-[#F3F0FF]/50 text-[#6D5DFC]">P7</th>
                  <th className="py-3 px-2 text-center bg-[#F3F0FF]/50 text-[#6D5DFC]">P8</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7] text-xs">
                {paginatedStudents.map((st) => {
                  let badgeColor = 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20';
                  const riskCat = st.riskCategory || st.status;
                  if (riskCat === 'Warning') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  if (riskCat === 'High Risk') badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
                  if (riskCat === 'Critical') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <tr
                      key={st.id}
                      onClick={() => setSelectedStudent(st)}
                      className="hover:bg-[#F7F3EE]/50 transition-all cursor-pointer group"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-[#6D5DFC]">{st.roll_number || st.register_number}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-[#E7E7E7]"
                          />
                          <span className="font-extrabold text-[#111827] group-hover:text-[#6D5DFC] transition-colors">{st.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#6B7280]">{st.department}</td>
                      <td className="py-3 px-2 text-center font-bold text-[#111827]">Y{st.year}-{st.section}</td>
                      <td className="py-3 px-2 text-center font-mono font-black text-[#111827]">{st.overallPercentage || st.attendancePercentage}%</td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-purple-600">{st.spellPercentage || st.attendancePercentage}%</td>
                      <td className="py-3 px-2 text-center font-mono font-extrabold text-[#12B76A]">{st.classesAttended || st.presentPeriods}</td>
                      <td className="py-3 px-2 text-center font-mono font-extrabold text-rose-600">{st.classesMissed || st.missedPeriods}</td>
                      <td className="py-3 px-2 text-center font-bold text-amber-600 flex items-center justify-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span>{st.currentStreak || 0}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {riskCat}
                        </span>
                      </td>

                      {/* Period Cells P1..P8 */}
                      {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'].map((pKey) => {
                        const val = st.periods[pKey] || 'A';
                        const isPresent = val === 'P';
                        const subName = dayOrderInfo.periodSubjects ? dayOrderInfo.periodSubjects[pKey] : pKey;

                        return (
                          <td key={pKey} className="py-3 px-2 text-center" title={`${pKey}: ${subName} (${isPresent ? 'Present' : 'Absent'})`}>
                            <span
                              className={`w-6 h-6 rounded-lg inline-flex items-center justify-center font-mono font-extrabold text-[11px] transition-transform hover:scale-110 ${
                                isPresent
                                  ? 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/40 shadow-xs'
                                  : 'bg-rose-50 text-rose-600 border border-rose-200'
                              }`}
                            >
                              {val}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[#E7E7E7] text-xs font-bold text-[#6B7280]">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] hover:bg-[#F3F0FF] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] hover:bg-[#F3F0FF] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STUDENT ATTENDANCE TIMELINE SLIDE-OVER DRAWER / MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto p-6 space-y-6 shadow-2xl border-l border-[#E7E7E7]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E7E7]">
              <div className="flex items-center gap-3">
                <img
                  src={selectedStudent.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#E7E7E7] shadow-sm"
                />
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[#111827]">{selectedStudent.name}</h3>
                  <p className="text-xs text-[#6B7280] font-semibold">
                    Reg No: <span className="font-mono text-[#6D5DFC] font-bold">{selectedStudent.roll_number || selectedStudent.register_number}</span> • {selectedStudent.department} (Year {selectedStudent.year}, Sec {selectedStudent.section})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#6B7280] hover:text-[#111827]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20">
                <span className="text-[10px] font-bold text-[#6D5DFC] uppercase block">Overall Rate</span>
                <strong className="text-lg text-[#6D5DFC] font-extrabold">{selectedStudent.overallPercentage || selectedStudent.attendancePercentage}%</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
                <span className="text-[10px] font-bold text-purple-700 uppercase block">Spell Rate</span>
                <strong className="text-lg text-purple-700 font-extrabold">{selectedStudent.spellPercentage || selectedStudent.attendancePercentage}%</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#10B981]/20">
                <span className="text-[10px] font-bold text-[#059669] uppercase block">Classes Attended</span>
                <strong className="text-lg text-[#059669] font-extrabold">{selectedStudent.classesAttended || selectedStudent.presentPeriods}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Classes Missed</span>
                <strong className="text-lg text-rose-600 font-extrabold">{selectedStudent.classesMissed || selectedStudent.missedPeriods}</strong>
              </div>
            </div>

            {/* Additional Meta Telemetry */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Current Active Streak</span>
                  <strong className="text-base text-amber-800 font-extrabold">{selectedStudent.currentStreak || 0} Days</strong>
                </div>
                <Flame className="w-6 h-6 text-amber-500 fill-amber-400" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-600 uppercase block">Last Scan Time</span>
                <strong className="text-xs text-slate-800 font-mono font-bold block mt-1">{selectedStudent.lastScanTime || 'No Scans Yet'}</strong>
              </div>
            </div>

            {/* Period-Wise Matrix Detail for Selected Date */}
            <div className="space-y-3">
              <h4 className="font-display font-extrabold text-sm text-[#111827] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6D5DFC]" />
                Daily Period Breakdown ({fromDate})
              </h4>

              <div className="grid grid-cols-4 gap-2">
                {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'].map((pKey) => {
                  const val = selectedStudent.periods[pKey] || 'A';
                  const isPres = val === 'P';
                  const subName = dayOrderInfo.periodSubjects ? dayOrderInfo.periodSubjects[pKey] : pKey;

                  return (
                    <div
                      key={pKey}
                      className={`p-3 rounded-2xl border text-center space-y-1 ${
                        isPres ? 'bg-[#ECFDF5] border-[#10B981]/30' : 'bg-rose-50 border-rose-200'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold text-[#6B7280] block">{pKey}</span>
                      <strong className={`text-sm font-extrabold block ${isPres ? 'text-[#059669]' : 'text-rose-600'}`}>
                        {isPres ? 'Present ✓' : 'Absent ❌'}
                      </strong>
                      <span className="text-[10px] text-[#6B7280] block truncate" title={subName}>{subName}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Historical Daily Timeline Table */}
            {selectedStudent.dailyBreakdown && selectedStudent.dailyBreakdown.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-display font-extrabold text-sm text-[#111827]">Historical Date Breakdown</h4>
                <div className="border border-[#E7E7E7] rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[10px] font-bold text-[#6B7280] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-center">Present</th>
                        <th className="py-2.5 px-3 text-center">Missed</th>
                        <th className="py-2.5 px-3">Attended Periods</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {selectedStudent.dailyBreakdown.map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#111827]">{row.date}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-[#12B76A]">{row.presentPeriods}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-rose-600">{row.missedPeriods}</td>
                          <td className="py-2.5 px-3 font-mono text-[#6D5DFC] font-bold">
                            {row.periods.length > 0 ? row.periods.join(', ') : 'None'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
