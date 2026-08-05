import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { AttendanceSession, TimetableItem } from '../types';
import { DynamicQRDisplay } from '../components/DynamicQRDisplay';
import { HeroBanner } from '../components/HeroBanner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  QrCode,
  Play,
  StopCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  UserX,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  X,
  Filter,
  Users,
  Calendar,
  UserCheck,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Search,
  Layers,
  Building2,
  BookOpen,
  MapPin,
  RefreshCw,
  Cpu,
  Radio,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SessionHubProps {
  initialSubject?: string;
  initialFaculty?: string;
  initialSubjectCode?: string;
  initialPeriod?: string;
}

export const SessionHub: React.FC<SessionHubProps> = ({
  initialSubject,
  initialFaculty,
  initialSubjectCode,
  initialPeriod
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';

  // --- Dynamic ERP Selectors Data ---
  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [dbClasses, setDbClasses] = useState<any[]>([]);
  const [dbSections, setDbSections] = useState<any[]>([]);

  // --- Cascading Academic Filter Form State ---
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');
  const [department, setDepartment] = useState<string>('AI & Data Science');
  const [year, setYear] = useState<string>('3');
  const [section, setSection] = useState<string>('A');
  const [dayOrder, setDayOrder] = useState<string>('Wednesday');
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [periodNumber, setPeriodNumber] = useState<string>(initialPeriod || '1');
  const [subject, setSubject] = useState<string>(initialSubject || 'Programming Language for AI');
  const [subjectCode, setSubjectCode] = useState<string>(initialSubjectCode || '21AI51T');
  const [facultyName, setFacultyName] = useState<string>(initialFaculty || 'Mrs Nivetha P');
  const [duration, setDuration] = useState<string>('30');
  const [attendanceMethod, setAttendanceMethod] = useState<string>('QR Code');
  const [roomNumber, setRoomNumber] = useState<string>('F305');

  // --- Class Preview State ---
  const [classPreview, setClassPreview] = useState<{
    totalStudents: number;
    facultyAdvisor: string;
    students: any[];
  }>({
    totalStudents: 0,
    facultyAdvisor: 'Faculty Incharge',
    students: []
  });
  const [classTimetable, setClassTimetable] = useState<TimetableItem[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // --- Sessions & Active Session State ---
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const selectedSessionRef = useRef<AttendanceSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // --- Roster & Realtime State ---
  const [presentStudents, setPresentStudents] = useState<any[]>([]);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [totalEnrolled, setTotalEnrolled] = useState<number>(0);
  const [attendanceRate, setAttendanceRate] = useState<string>('0.00');
  const [rosterTab, setRosterTab] = useState<'present' | 'absent' | 'all'>('present');

  // --- History & Search State ---
  const [historySearch, setHistorySearch] = useState<string>('');

  // Sync selectedSessionRef
  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

  // Load Day Name from Date or Default
  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(sessionDate);
    if (!isNaN(d.getTime())) {
      const dayName = days[d.getDay()];
      if (dayName !== 'Sunday') setDayOrder(dayName);
    }
  }, [sessionDate]);

  // Load Dynamic ERP Selectors from Supabase/Backend
  useEffect(() => {
    // Departments
    api.get('/departments')
      .then((res) => {
        const depts = res.data.departments || [];
        setDbDepartments(depts);
        if (depts.length > 0 && !department) {
          setDepartment(depts[0].name || depts[0].code);
        }
      })
      .catch(() => {});

    // Classes / Years
    api.get('/classes')
      .then((res) => {
        setDbClasses(res.data.classes || []);
      })
      .catch(() => {});

    // Sections
    api.get('/sections')
      .then((res) => {
        setDbSections(res.data.sections || []);
      })
      .catch(() => {});

    // Faculty pre-fill check
    if (isFaculty && user) {
      if (user.department) setDepartment(user.department);
      if (user.year) setYear(String(user.year));
      if (user.section) setSection(user.section);
      if (user.name) setFacultyName(user.name);

      api.get(`/faculty/dashboard?faculty_id=${user.id}`)
        .then((res) => {
          const subs = res.data.assignedSubjects || [];
          if (subs.length > 0 && !initialSubject) {
            const firstSub = subs[0].subject_name || subs[0].name;
            const firstCode = subs[0].subject_code || subs[0].code || '';
            setSubject(firstSub);
            setSubjectCode(firstCode);
          }
        })
        .catch(() => {});
    }
  }, [user, isFaculty]);

  // Load Class Preview & Class Timetable whenever Department, Year, Section, or DayOrder changes
  useEffect(() => {
    fetchClassPreviewAndTimetable();
  }, [department, year, section, dayOrder]);

  const fetchClassPreviewAndTimetable = async () => {
    try {
      setIsLoadingPreview(true);

      // 1. Fetch Class Roster Preview
      const rosterRes = await api.get(`/sessions/roster-preview?department=${encodeURIComponent(department)}&year=${year}&section=${section}`);
      if (rosterRes.data) {
        setClassPreview({
          totalStudents: rosterRes.data.totalStudents || 0,
          facultyAdvisor: rosterRes.data.facultyAdvisor || 'Faculty Advisor',
          students: rosterRes.data.students || []
        });
      }

      // 2. Fetch Timetable for this exact class
      const ttRes = await api.get(`/timetables?department=${encodeURIComponent(department)}&year=${year}&section=${section}&day=${dayOrder}`);
      const ttList = ttRes.data.timetables || [];
      setClassTimetable(ttList);

      // Auto-fill form from first period slot if available
      if (ttList.length > 0) {
        const matchingSlot = ttList.find((t: TimetableItem) => String(t.period_number) === String(periodNumber)) || ttList[0];
        autoFillFromSlot(matchingSlot);
      }
    } catch (err) {
      console.error('Failed to load class preview or timetable', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const autoFillFromSlot = (slot: TimetableItem) => {
    if (!slot) return;
    setSubject(slot.subject_name || slot.subject_id || subject);
    setFacultyName(slot.faculty_name || facultyName);
    setPeriodNumber(String(slot.period_number || periodNumber));
    if (slot.room_number) setRoomNumber(slot.room_number);

    // Calculate duration from start_time & end_time if possible
    if (slot.start_time && slot.end_time) {
      const calcDur = calculateMinutesBetween(slot.start_time, slot.end_time);
      if (calcDur > 0) setDuration(String(calcDur));
    }
  };

  const calculateMinutesBetween = (startTimeStr: string, endTimeStr: string) => {
    try {
      const parseMins = (tStr: string) => {
        const clean = tStr.trim();
        const isPM = clean.toUpperCase().includes('PM');
        const isAM = clean.toUpperCase().includes('AM');
        const timePart = clean.replace(/AM|PM/i, '').trim();
        const parts = timePart.split(':');
        let hrs = parseInt(parts[0] || '0', 10);
        const mins = parseInt(parts[1] || '0', 10);
        if (isPM && hrs < 12) hrs += 12;
        if (isAM && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
      };
      const startM = parseMins(startTimeStr);
      const endM = parseMins(endTimeStr);
      return Math.max(15, endM - startM);
    } catch (e) {
      return 30;
    }
  };

  // Fetch Active & Historical Sessions
  useEffect(() => {
    fetchSessions();

    const socket = getSocket();

    const handleSync = () => {
      fetchSessions();
      if (selectedSessionRef.current) {
        selectSession(selectedSessionRef.current);
      }
    };

    socket.on('attendanceMarked', handleSync);
    socket.on('attendance_marked', handleSync);
    socket.on('attendance_updated', handleSync);
    socket.on('session_created', handleSync);
    socket.on('session_ended', handleSync);

    return () => {
      socket.off('attendanceMarked', handleSync);
      socket.off('attendance_marked', handleSync);
      socket.off('attendance_updated', handleSync);
      socket.off('session_created', handleSync);
      socket.off('session_ended', handleSync);
    };
  }, []);

  // Remaining Time Timer Countdown for Active Session
  useEffect(() => {
    if (!selectedSession || selectedSession.status !== 'active') {
      setRemainingSeconds(0);
      return;
    }

    const expiryMs = new Date(selectedSession.expiry_time || selectedSession.end_time).getTime();

    const updateTimer = () => {
      const diffSec = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setRemainingSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions');
      const fetchedSessions = res.data.sessions || [];
      setSessions(fetchedSessions);

      if (fetchedSessions.length > 0 && !selectedSessionRef.current) {
        const activeSess = fetchedSessions.find((s: AttendanceSession) => s.status === 'active') || fetchedSessions[0];
        if (activeSess) selectSession(activeSess);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const selectSession = async (session: AttendanceSession) => {
    setSelectedSession(session);
    try {
      const res = await api.get(`/sessions/${session.id}`);
      const presents = res.data.presentStudents || [];
      const absents = res.data.absentStudents || [];
      const total = res.data.totalEnrolled || presents.length + absents.length;
      const rate = res.data.attendanceRate || '0.00';

      setPresentStudents(presents);
      setAbsentStudents(absents);
      setTotalEnrolled(total);
      setAttendanceRate(rate);
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert('Subject name is required to generate a dynamic attendance QR.');
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        academic_year: academicYear,
        department,
        year,
        section,
        day: dayOrder,
        date: sessionDate,
        period_number: periodNumber,
        subject: subject.trim(),
        subject_code: subjectCode.trim(),
        faculty_name: facultyName.trim(),
        duration_minutes: duration,
        room_number: roomNumber,
        attendance_method: attendanceMethod
      };

      const res = await api.post('/sessions', payload);
      alert(`✅ Dynamic Attendance Session Created Successfully!\nClass: ${department} ${year}-${section}\nSubject: ${subject}\nDuration: ${duration} Minutes`);

      fetchSessions();
      if (res.data && res.data.session) {
        selectSession(res.data.session);
      }
    } catch (err: any) {
      console.error('Session creation failed:', err);
      alert(`❌ Failed to launch QR Session: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to terminate this attendance QR session? All non-scanned students will be automatically marked ABSENT.')) {
      return;
    }

    try {
      await api.put(`/sessions/${sessionId}/end`);
      alert('✅ Attendance QR Session ended. Non-scanned students recorded as ABSENT.');
      fetchSessions();
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession({ ...selectedSession, status: 'completed' });
      }
    } catch (err: any) {
      console.error('Failed to terminate session:', err);
      alert(`❌ Error ending session: ${err.response?.data?.error || err.message}`);
    }
  };

  // --- Multi-Format Exporting (Excel, CSV, PDF) ---
  const getFilteredHistory = () => {
    if (!historySearch.trim()) return sessions;
    const query = historySearch.toLowerCase();
    return sessions.filter((s) =>
      (s.subject || '').toLowerCase().includes(query) ||
      (s.department || '').toLowerCase().includes(query) ||
      (s.faculty_name || '').toLowerCase().includes(query) ||
      (s.section || '').toLowerCase().includes(query) ||
      (s.date || '').toLowerCase().includes(query) ||
      (s.period_number || '').toLowerCase().includes(query)
    );
  };

  const exportHistoryExcel = () => {
    const dataToExport = getFilteredHistory().map((s) => ({
      'Session ID': s.id,
      'Academic Year': academicYear,
      'Department': s.department,
      'Year': `${s.year} Year`,
      'Section': `Sec ${s.section}`,
      'Date': s.date || new Date(s.start_time).toISOString().split('T')[0],
      'Period': `Period ${s.period_number || 1}`,
      'Subject': s.subject,
      'Faculty': s.faculty_name || 'Faculty',
      'Attendance Method': s.attendance_method || 'QR Code',
      'Present Count': s.presentCount || 0,
      'Absent Count': s.absentCount || 0,
      'Attendance Rate': `${s.attendanceRate || 0}%`,
      'Status': s.status.toUpperCase()
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QR Session History');
    XLSX.writeFile(wb, `Live_QR_Session_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportHistoryCSV = () => {
    const dataToExport = getFilteredHistory().map((s) => ({
      'Session ID': s.id,
      'Department': s.department,
      'Year': s.year,
      'Section': s.section,
      'Date': s.date || new Date(s.start_time).toISOString().split('T')[0],
      'Period': s.period_number || 1,
      'Subject': s.subject,
      'Faculty': s.faculty_name || 'Faculty',
      'Attendance Method': s.attendance_method || 'QR Code',
      'Present': s.presentCount || 0,
      'Absent': s.absentCount || 0,
      'Rate': `${s.attendanceRate || 0}%`
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Live_QR_Session_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportHistoryPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Elite Minds Attendance Portal - Dynamic QR Session History', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Sessions: ${getFilteredHistory().length}`, 14, 22);

    const tableRows = getFilteredHistory().map((s) => [
      s.department,
      `${s.year} Year - ${s.section}`,
      s.date || new Date(s.start_time).toISOString().split('T')[0],
      `P${s.period_number || 1}`,
      s.subject,
      s.faculty_name || 'Faculty',
      s.attendance_method || 'QR Code',
      s.presentCount || 0,
      s.absentCount || 0,
      `${s.attendanceRate || 0}%`,
      s.status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Department', 'Year/Sec', 'Date', 'Period', 'Subject', 'Faculty', 'Method', 'Present', 'Absent', 'Rate %', 'Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [109, 93, 252], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 }
    });

    doc.save(`Dynamic_QR_Session_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const formatTimer = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Enterprise Control Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl text-[#111827]">
              Live Dynamic QR Attendance Hub
            </h1>
            <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/30 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 animate-spin" /> Institution Engine
            </span>
          </div>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Dynamic institution-wide dynamic QR attendance control center powered by Supabase PostgreSQL
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E7E7] text-xs font-bold text-[#12B76A] shadow-sm">
            <Radio className="w-3.5 h-3.5 text-[#12B76A] animate-pulse" />
            <span>Socket.IO Engine Connected</span>
          </div>
          <button
            onClick={fetchClassPreviewAndTimetable}
            className="p-2 rounded-xl bg-white border border-[#E7E7E7] hover:bg-gray-50 text-[#111827] transition-all shadow-sm"
            title="Refresh System State"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPreview ? 'animate-spin text-[#6D5DFC]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Left Filter & Preview Panel (5 cols), Right Active Session & Live Roster (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CASCADING ACADEMIC SELECTOR PANEL */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[24px] p-6 border border-[#E7E7E7] shadow-enterprise space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-sm text-[#111827]">
                    Cascading Academic Selector
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">Select parameters to generate dynamic QR</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAFAFA] border border-[#E7E7E7] text-[#6B7280]">
                {isFaculty ? 'Faculty Restricted' : 'Admin Full Access'}
              </span>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              
              {/* 1. Academic Year */}
              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  1. Academic Year
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] transition-all"
                >
                  <option value="2026-2027">2026-2027 (ODD SEMESTER)</option>
                  <option value="2027-2028">2027-2028</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
              </div>

              {/* 2. Department & 3. Year Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    2. Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={isFaculty && !!user?.department}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] disabled:opacity-70 transition-all"
                  >
                    {dbDepartments.length > 0 ? (
                      dbDepartments.map((d: any) => (
                        <option key={d.id || d.code} value={d.name || d.code}>
                          {d.name || d.code}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="AI & Data Science">AI & Data Science</option>
                        <option value="Artificial Intelligence">Artificial Intelligence</option>
                        <option value="Computer Science">Computer Science (CSE)</option>
                        <option value="Information Technology">Information Technology (IT)</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Civil">Civil</option>
                        <option value="MBA">MBA</option>
                        <option value="MCA">MCA</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    3. Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    disabled={isFaculty && !!user?.year}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] disabled:opacity-70 transition-all"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>

              {/* 4. Section & 5. Day Order Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    4. Section
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    disabled={isFaculty && !!user?.section}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] disabled:opacity-70 transition-all"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    5. Day Order
                  </label>
                  <select
                    value={dayOrder}
                    onChange={(e) => setDayOrder(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] transition-all"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
              </div>

              {/* 6. Date & 7. Period Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    6. Date
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    7. Period Number
                  </label>
                  <select
                    value={periodNumber}
                    onChange={(e) => {
                      setPeriodNumber(e.target.value);
                      const matchingSlot = classTimetable.find((t) => String(t.period_number) === String(e.target.value));
                      if (matchingSlot) autoFillFromSlot(matchingSlot);
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] transition-all"
                  >
                    <option value="1">Period 1 (08:15 AM - 09:05 AM)</option>
                    <option value="2">Period 2 (09:05 AM - 09:55 AM)</option>
                    <option value="3">Period 3 (10:10 AM - 11:00 AM)</option>
                    <option value="4">Period 4 (11:00 AM - 11:50 AM)</option>
                    <option value="5">Period 5 (11:50 AM - 12:35 PM)</option>
                    <option value="6">Period 6 (01:15 PM - 02:00 PM)</option>
                    <option value="7">Period 7 (02:00 PM - 02:45 PM)</option>
                    <option value="8">Period 8 (02:45 PM - 03:30 PM)</option>
                  </select>
                </div>
              </div>

              {/* 8. Subject Name & Code */}
              <div>
                <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                  8. Subject Name & Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Programming Language for AI (21AI51T)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] transition-all"
                />
              </div>

              {/* 9. Faculty & Room Number Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    9. Faculty Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mrs Nivetha P"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    readOnly={isFaculty}
                    required
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] read-only:opacity-75 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. F305 / Lab 2"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] transition-all"
                  />
                </div>
              </div>

              {/* 10. Duration & 11. Attendance Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    10. QR Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] transition-all"
                  >
                    <option value="5">5 Minutes</option>
                    <option value="10">10 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="25">25 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider mb-1">
                    11. Attendance Method
                  </label>
                  <select
                    value={attendanceMethod}
                    onChange={(e) => setAttendanceMethod(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#6D5DFC] transition-all"
                  >
                    <option value="QR Code">QR Code</option>
                    <option value="Bluetooth + Fingerprint">Bluetooth + Fingerprint (Future)</option>
                    <option value="Hybrid">Hybrid (QR + BLE + Biometrics)</option>
                  </select>
                </div>
              </div>

              {/* Action Submit Button */}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#6D5DFC] to-[#4F7CFF] text-white font-extrabold text-xs shadow-enterprise hover:shadow-floating hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Generating Dynamic Session...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Generate Institution Live QR Session
                  </>
                )}
              </button>
            </form>
          </div>

          {/* DYNAMIC CLASS PREVIEW & TIMETABLE CARD */}
          <div className="bg-white rounded-[24px] p-6 border border-[#E7E7E7] shadow-enterprise space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#6D5DFC]" />
                <h3 className="font-display font-extrabold text-sm text-[#111827]">
                  Class Cohort Preview
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#F3F0FF] text-[#6D5DFC]">
                {department} • {year} Year • Sec {section}
              </span>
            </div>

            {/* Class Stats Summary Pill */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
              <div>
                <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Enrolled Roster</span>
                <span className="font-display font-extrabold text-lg text-[#111827] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#6D5DFC]" /> {classPreview.totalStudents} Students
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Faculty Advisor</span>
                <span className="text-xs font-bold text-[#111827] truncate block mt-1">
                  {classPreview.facultyAdvisor}
                </span>
              </div>
            </div>

            {/* Class Timetable Slot Pills */}
            <div>
              <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">
                {dayOrder}'s Timetable Slots (Click to Auto-Fill Form)
              </span>
              {classTimetable.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-[#E7E7E7] rounded-2xl text-xs text-[#6B7280]">
                  No timetable entries configured for this class on {dayOrder}.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {classTimetable.map((slot) => {
                    const isSelected = String(slot.period_number) === String(periodNumber);
                    return (
                      <div
                        key={slot.id}
                        onClick={() => autoFillFromSlot(slot)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#F3F0FF] border-[#6D5DFC] shadow-sm'
                            : 'bg-[#FAFAFA] border-[#E7E7E7] hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-7 h-7 rounded-xl font-bold flex items-center justify-center text-[10px] ${
                            isSelected ? 'bg-[#6D5DFC] text-white' : 'bg-gray-200 text-[#111827]'
                          }`}>
                            P{slot.period_number}
                          </span>
                          <div>
                            <p className="font-bold text-[#111827]">{slot.subject_name}</p>
                            <p className="text-[10px] text-[#6B7280]">{slot.faculty_name} • {slot.start_time} - {slot.end_time}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-[#6D5DFC] px-2 py-0.5 rounded-md bg-white border border-[#E7E7E7]">
                          {slot.room_number || 'F305'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE SESSION DISPLAY, ROTATING QR & LIVE ROSTER */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* ACTIVE SESSION CARD */}
          <div className="bg-white rounded-[24px] p-6 border border-[#E7E7E7] shadow-enterprise space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7E7E7]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-extrabold text-lg text-[#111827]">
                    Current Active Session
                  </h2>
                  {selectedSession && selectedSession.status === 'active' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20 animate-pulse flex items-center gap-1">
                      <Radio className="w-3 h-3 text-[#12B76A]" /> LIVE BROADCASTING
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-600">
                      SESSION INACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                  {selectedSession ? `${selectedSession.department} • ${selectedSession.year} Year • Sec ${selectedSession.section}` : 'No session launched'}
                </p>
              </div>

              {selectedSession && selectedSession.status === 'active' && (
                <button
                  onClick={() => handleEndSession(selectedSession.id)}
                  className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-extrabold hover:bg-rose-100 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <StopCircle className="w-4 h-4 text-rose-600" /> End QR Session & Auto-Absent
                </button>
              )}
            </div>

            {/* Session Display Content */}
            {!selectedSession ? (
              <div className="text-center py-12 space-y-3 bg-[#FAFAFA] rounded-2xl border border-dashed border-[#E7E7E7]">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="font-display font-extrabold text-sm text-[#111827]">No Active QR Session Displayed</h3>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto font-medium">
                  Select your class parameters from the left cascading selector and click "Generate Institution Live QR Session" to launch the dynamic attendance engine.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Meta details bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Subject</span>
                    <span className="text-xs font-extrabold text-[#111827] truncate block">{selectedSession.subject}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Faculty</span>
                    <span className="text-xs font-extrabold text-[#111827] truncate block">{selectedSession.faculty_name || selectedSession.faculty || 'Faculty'}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Time Remaining</span>
                    <span className={`text-xs font-extrabold block ${remainingSeconds > 0 ? 'text-[#12B76A]' : 'text-rose-600'}`}>
                      {remainingSeconds > 0 ? formatTimer(remainingSeconds) : 'Session Expired'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Attendance Rate</span>
                    <span className="text-xs font-extrabold text-[#6D5DFC] block">{attendanceRate}%</span>
                  </div>
                </div>

                {/* Live Rotating QR Code Display Component */}
                <div className="flex justify-center p-4 bg-[#FAFAFA] rounded-3xl border border-[#E7E7E7]">
                  <DynamicQRDisplay
                    sessionId={selectedSession.id}
                    subject={selectedSession.subject}
                    faculty={selectedSession.faculty_name || selectedSession.faculty || 'Faculty'}
                  />
                </div>

                {/* Real-time Roster Statistics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/30 text-center">
                    <span className="text-[10px] font-bold text-[#12B76A] uppercase block">Students Present</span>
                    <span className="font-display font-extrabold text-xl text-[#12B76A] mt-0.5 block">{presentStudents.length}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                    <span className="text-[10px] font-bold text-rose-600 uppercase block">Students Absent</span>
                    <span className="font-display font-extrabold text-xl text-rose-600 mt-0.5 block">{absentStudents.length}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/30 text-center">
                    <span className="text-[10px] font-bold text-[#6D5DFC] uppercase block">Total Class Cohort</span>
                    <span className="font-display font-extrabold text-xl text-[#6D5DFC] mt-0.5 block">{totalEnrolled}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LIVE SESSION ROSTER PANEL */}
          <div className="bg-white rounded-[24px] p-6 border border-[#E7E7E7] shadow-enterprise space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-display font-extrabold text-base text-[#111827]">
                  Session Student Roster
                </h3>
                <p className="text-xs text-[#6B7280] font-medium">
                  Isolated cohort roster for {department} • {year} Year • Sec {section}
                </p>
              </div>

              {/* Roster Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7]">
                <button
                  onClick={() => setRosterTab('present')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    rosterTab === 'present' ? 'bg-[#12B76A] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  Present ({presentStudents.length})
                </button>
                <button
                  onClick={() => setRosterTab('absent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    rosterTab === 'absent' ? 'bg-rose-600 text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  Absent ({absentStudents.length})
                </button>
              </div>
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] text-[#111827] font-extrabold border-b border-[#E7E7E7]">
                  <tr>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Register / Roll No</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Time Marked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {(rosterTab === 'present' ? presentStudents : absentStudents).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#6B7280]">
                        No students listed under {rosterTab.toUpperCase()} status yet.
                      </td>
                    </tr>
                  ) : (
                    (rosterTab === 'present' ? presentStudents : absentStudents).map((st: any, idx: number) => (
                      <tr key={st.id || idx} className="hover:bg-gray-50/50 transition-all">
                        <td className="p-3.5 font-bold text-[#111827] flex items-center gap-2.5">
                          <img
                            src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-[#E7E7E7]"
                          />
                          <span>{st.name || st.student_name}</span>
                        </td>
                        <td className="p-3.5 font-mono text-[#6B7280] font-semibold">{st.roll_number || st.vh_number || '--'}</td>
                        <td className="p-3.5 font-medium text-[#111827]">{st.department || department} ({st.year || year}-{st.section || section})</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            rosterTab === 'present'
                              ? 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20'
                              : 'bg-rose-50 text-rose-600 border border-rose-200'
                          }`}>
                            {rosterTab === 'present' ? 'PRESENT' : 'ABSENT'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-gray-500 text-[11px]">
                          {st.attendance_time ? new Date(st.attendance_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* SESSION HISTORY & MULTI-FORMAT REPORT EXPORT SECTION */}
      <div className="bg-white rounded-[24px] p-6 border border-[#E7E7E7] shadow-enterprise space-y-4 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E7E7]">
          <div>
            <h3 className="font-display font-extrabold text-base text-[#111827]">
              Institution Live QR Session History & Audit Log
            </h3>
            <p className="text-xs text-[#6B7280] font-medium">
              Complete archive of active and completed QR sessions across all departments
            </p>
          </div>

          {/* Search Bar & Multi-Format Export Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search session history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 pr-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827] focus:outline-none focus:border-[#6D5DFC] w-60"
              />
            </div>

            <button
              onClick={exportHistoryExcel}
              className="px-3.5 py-2 rounded-xl bg-[#ECFDF5] border border-[#12B76A]/30 text-[#12B76A] text-xs font-extrabold hover:bg-[#d1fae5] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>

            <button
              onClick={exportHistoryCSV}
              className="px-3.5 py-2 rounded-xl bg-[#EFF6FF] border border-[#4F7CFF]/30 text-[#4F7CFF] text-xs font-extrabold hover:bg-[#dbeafe] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>

            <button
              onClick={exportHistoryPDF}
              className="px-3.5 py-2 rounded-xl bg-[#F3F0FF] border border-[#6D5DFC]/30 text-[#6D5DFC] text-xs font-extrabold hover:bg-[#e0d7fe] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* Sessions History Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] text-[#111827] font-extrabold border-b border-[#E7E7E7]">
              <tr>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Year / Sec</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Period</th>
                <th className="p-3.5">Subject</th>
                <th className="p-3.5">Faculty</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5">Present</th>
                <th className="p-3.5">Absent</th>
                <th className="p-3.5">Attendance %</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E7]">
              {getFilteredHistory().length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-[#6B7280]">
                    No session history matches your search filter.
                  </td>
                </tr>
              ) : (
                getFilteredHistory().map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => selectSession(s)}
                    className={`cursor-pointer hover:bg-gray-50 transition-all ${
                      selectedSession?.id === s.id ? 'bg-[#F3F0FF]/50 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3.5 font-bold text-[#111827]">{s.department || 'AI & DS'}</td>
                    <td className="p-3.5 font-medium">{s.year} Year - Sec {s.section}</td>
                    <td className="p-3.5 font-mono text-[#6B7280]">{s.date || new Date(s.start_time).toISOString().split('T')[0]}</td>
                    <td className="p-3.5 font-bold text-[#6D5DFC]">Period {s.period_number || 1}</td>
                    <td className="p-3.5 font-bold text-[#111827] max-w-[180px] truncate">{s.subject}</td>
                    <td className="p-3.5 font-medium">{s.faculty_name || s.faculty || 'Faculty'}</td>
                    <td className="p-3.5 font-medium text-gray-600">{s.attendance_method || 'QR Code'}</td>
                    <td className="p-3.5 font-bold text-[#12B76A]">{s.presentCount || 0}</td>
                    <td className="p-3.5 font-bold text-rose-600">{s.absentCount || 0}</td>
                    <td className="p-3.5 font-extrabold text-[#6D5DFC]">{s.attendanceRate || 0}%</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        s.status === 'active'
                          ? 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
