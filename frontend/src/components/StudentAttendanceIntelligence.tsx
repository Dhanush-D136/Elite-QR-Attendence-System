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
  status: string;
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
    avgAttendance: 0,
    shortageCount: 0,
    conductedPeriodsToday: 8
  });
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
        setDayOrderInfo(res.data.dayOrderInfo || {});
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
    if (riskFilter === 'Safe' && st.attendancePercentage < 75) return false;
    if (riskFilter === 'Warning' && (st.attendancePercentage < 65 || st.attendancePercentage >= 75)) return false;
    if (riskFilter === 'HighRisk' && (st.attendancePercentage < 50 || st.attendancePercentage >= 65)) return false;
    if (riskFilter === 'Critical' && st.attendancePercentage >= 50) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = filteredStudents.map((st) => ({
      'Register Number': st.roll_number,
      'Student Name': st.name,
      'Department': st.department,
      'Year': st.year,
      'Section': st.section,
      'Present Periods': `${st.presentPeriods} / ${st.totalScheduledPeriods}`,
      'Absent / Missed Periods': `${st.missedPeriods} / ${st.totalScheduledPeriods}`,
      'Attendance %': `${st.attendancePercentage}%`,
      'Status': st.status,
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
    XLSX.utils.book_append_sheet(wb, ws, 'Period Attendance');
    XLSX.writeFile(wb, `Student_Period_Attendance_${fromDate}_to_${toDate}.xlsx`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Reg No', 'Name', 'Department', 'Year', 'Section', 'Present', 'Missed', 'Attendance %', 'Status', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const rows = filteredStudents.map((st) => [
      st.roll_number,
      st.name,
      st.department,
      st.year,
      st.section,
      `${st.presentPeriods}/${st.totalScheduledPeriods}`,
      `${st.missedPeriods}/${st.totalScheduledPeriods}`,
      `${st.attendancePercentage}%`,
      st.status,
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
    link.setAttribute('download', `Student_Period_Attendance_${fromDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`Student Period-Wise Attendance Report (${fromDate} to ${toDate})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Day: ${dayOrderInfo.dayName || ''} (${dayOrderInfo.dayOrder || ''})`, 14, 22);

    const tableHeaders = [['Reg No', 'Name', 'Dept', 'Yr-Sec', 'Present', 'Missed', 'Att %', 'Status', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']];
    const tableData = filteredStudents.map((st) => [
      st.roll_number,
      st.name,
      st.department,
      `${st.year}-${st.section}`,
      `${st.presentPeriods}/${st.totalScheduledPeriods}`,
      `${st.missedPeriods}/${st.totalScheduledPeriods}`,
      `${st.attendancePercentage}%`,
      st.status,
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
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [109, 93, 252] }
    });

    doc.save(`Student_Period_Attendance_${fromDate}.pdf`);
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
              LIVE SUPABASE SYNC ACTIVE
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl lg:text-3xl text-[#111827]">
            Student Attendance Intelligence
          </h1>
          <p className="text-xs text-[#6B7280] font-medium max-w-xl">
            Real-time period-wise attendance matrix, day-order timetable analysis, student timeline intelligence, risk detection & export controls.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchIntelligenceData}
            className="px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] hover:bg-[#F3F0FF] hover:border-[#6D5DFC]/40 transition-all flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#6D5DFC] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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

      {/* SEARCH & FILTERS BAR */}
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
              <option value="AI & DS">AI & DS</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="IT">IT</option>
              <option value="EEE">EEE</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
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

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-1">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Total Students</span>
            <Users className="w-4 h-4 text-[#6D5DFC]" />
          </div>
          <p className="font-display font-extrabold text-2xl lg:text-3xl text-[#111827]">{summary.totalStudents || filteredStudents.length}</p>
          <p className="text-[10px] text-[#6B7280] font-medium">Active roster count</p>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-1">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Avg Attendance Rate</span>
            <Award className="w-4 h-4 text-[#12B76A]" />
          </div>
          <p className="font-display font-extrabold text-2xl lg:text-3xl text-[#12B76A]">{summary.avgAttendance || 0}%</p>
          <p className="text-[10px] text-[#12B76A] font-semibold">Institutional average</p>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-1">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Shortage Risk (&lt;75%)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="font-display font-extrabold text-2xl lg:text-3xl text-rose-600">{summary.shortageCount || 0}</p>
          <p className="text-[10px] text-rose-500 font-medium">Defaulter candidates</p>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-1">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Scheduled Periods</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-display font-extrabold text-2xl lg:text-3xl text-amber-600">{summary.conductedPeriodsToday || 8} Periods</p>
          <p className="text-[10px] text-amber-600 font-medium">Configured daily slots</p>
        </div>
      </div>

      {/* MASTER STUDENT PERIOD-WISE ATTENDANCE GRID TABLE */}
      <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
          <div>
            <h3 className="font-display font-bold text-base text-[#111827]">
              Student Period-Wise Attendance Matrix
            </h3>
            <p className="text-xs text-[#6B7280] font-medium">
              Click any student row to view full historical timeline, subject breakdown, and trend analysis.
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
            <p className="text-xs text-[#6B7280] font-bold">Computing period-wise attendance matrix...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 text-[#6B7280] mx-auto opacity-40" />
            <h4 className="font-display font-bold text-base text-[#111827]">No Students Found</h4>
            <p className="text-xs text-[#6B7280]">Try adjusting search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E7E7E7] bg-[#FAFAFA] text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-3 px-3">Reg No</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-3 text-center">Yr / Sec</th>
                  <th className="py-3 px-3 text-center">Present</th>
                  <th className="py-3 px-3 text-center">Missed</th>
                  <th className="py-3 px-3 text-center">Att %</th>
                  <th className="py-3 px-3 text-center">Status</th>
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
                  if (st.status === 'Warning') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  if (st.status === 'High Risk') badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
                  if (st.status === 'Critical') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <tr
                      key={st.id}
                      onClick={() => setSelectedStudent(st)}
                      className="hover:bg-[#F7F3EE]/50 transition-all cursor-pointer group"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-[#6D5DFC]">{st.roll_number}</td>
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
                      <td className="py-3 px-3 text-center font-bold text-[#111827]">Y{st.year} - {st.section}</td>
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-[#12B76A]">{st.presentPeriods} / {st.totalScheduledPeriods}</td>
                      <td className="py-3 px-3 text-center font-mono font-extrabold text-rose-600">{st.missedPeriods} / {st.totalScheduledPeriods}</td>
                      <td className="py-3 px-3 text-center font-mono font-black text-[#111827]">{st.attendancePercentage}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          {st.status}
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
                    Reg No: <span className="font-mono text-[#6D5DFC] font-bold">{selectedStudent.roll_number}</span> • {selectedStudent.department} (Year {selectedStudent.year}, Sec {selectedStudent.section})
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
                <span className="text-[10px] font-bold text-[#6D5DFC] uppercase block">Attendance Rate</span>
                <strong className="text-lg text-[#6D5DFC] font-extrabold">{selectedStudent.attendancePercentage}%</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#10B981]/20">
                <span className="text-[10px] font-bold text-[#059669] uppercase block">Present Periods</span>
                <strong className="text-lg text-[#059669] font-extrabold">{selectedStudent.presentPeriods} / {selectedStudent.totalScheduledPeriods}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Missed Periods</span>
                <strong className="text-lg text-rose-600 font-extrabold">{selectedStudent.missedPeriods} / {selectedStudent.totalScheduledPeriods}</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Risk Status</span>
                <strong className="text-sm text-amber-800 font-extrabold block mt-1">{selectedStudent.status}</strong>
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
