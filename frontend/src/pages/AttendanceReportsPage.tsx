import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { User } from '../types';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  UserCheck,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  Users,
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Award,
  CheckCircle2,
  XCircle,
  Filter,
  Plus,
  Edit,
  Trash2,
  ListChecks
} from 'lucide-react';

interface SubjectStat {
  id: string;
  name: string;
  code: string;
  faculty_name: string;
  classesHeld: number;
  avgPercentage: number;
  presentCount: number;
  absentCount: number;
  lastClassDate: string;
  studentsBelow75: number;
}

interface ClassHistoryEntry {
  id: string;
  date: string;
  period: string;
  timeRange: string;
  present: number;
  absent: number;
  percentage: number;
  faculty: string;
  room: string;
}

interface StudentRecord {
  roll_number: string;
  name: string;
  time_marked?: string;
  status: string;
  reason?: string;
}

interface AttendanceRecordItem {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  student_email: string;
  student_department: string;
  student_year: number;
  student_section: string;
  profile_photo: string;
  subject: string;
  attendance_code: string;
  attendance_time: string;
  status: string;
  notes?: string;
}

export const AttendanceReportsPage: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectStat | null>(null);
  const [selectedClassHistory, setSelectedClassHistory] = useState<ClassHistoryEntry | null>(null);
  const [lectureRosterTab, setLectureRosterTab] = useState<'present' | 'absent'>('present');

  const [activeTab, setActiveTab] = useState<'subjects' | 'records' | 'defaulters' | 'monthly'>('subjects');

  // Live Data States
  const [subjectsData, setSubjectsData] = useState<SubjectStat[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordItem[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [defaultersList, setDefaultersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State for Attendance Log
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Modals for Attendance CRUD
  const [showMarkModal, setShowMarkModal] = useState<boolean>(false);
  const [showEditRecordModal, setShowEditRecordModal] = useState<boolean>(false);

  // New Attendance Record Form State
  const [newAttendance, setNewAttendance] = useState({
    student_id: '',
    subject: 'Programming Language for AI',
    status: 'present',
    attendance_time: new Date().toISOString().slice(0, 16),
    notes: 'Manually marked by administrator'
  });

  // Edit Attendance Record Form State
  const [editingRecord, setEditingRecord] = useState<{
    id: string;
    student_name: string;
    roll_number: string;
    subject: string;
    status: string;
    notes: string;
    attendance_time: string;
  } | null>(null);

  // Fetch Reports and Roster Data
  const fetchReportsData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/analytics/reports');
      if (res.data.subjectStats) setSubjectsData(res.data.subjectStats);
      if (res.data.defaulters) setDefaultersList(res.data.defaulters);

      const studentRes = await api.get('/students');
      if (studentRes.data.students) setStudents(studentRes.data.students);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Attendance Records
  const fetchAttendanceRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (deptFilter) params.append('department', deptFilter);
      if (subjectFilter) params.append('subject', subjectFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const res = await api.get(`/attendance/records?${params.toString()}`);
      setAttendanceRecords(res.data.records || []);
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  useEffect(() => {
    if (activeTab === 'records') {
      fetchAttendanceRecords();
    }
  }, [activeTab, searchQuery, statusFilter, deptFilter, subjectFilter, periodFilter, fromDate, toDate]);

  // Real-time Socket Listener
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      fetchReportsData();
      if (activeTab === 'records') fetchAttendanceRecords();
    };

    socket.on('attendanceMarked', handleUpdate);
    socket.on('attendance_marked', handleUpdate);
    socket.on('attendance_updated', handleUpdate);
    socket.on('attendance_deleted', handleUpdate);

    return () => {
      socket.off('attendanceMarked', handleUpdate);
      socket.off('attendance_marked', handleUpdate);
      socket.off('attendance_updated', handleUpdate);
      socket.off('attendance_deleted', handleUpdate);
    };
  }, [activeTab]);

  // Create Manual Attendance Record
  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendance.student_id) {
      alert('Please select a student');
      return;
    }
    try {
      await api.post('/attendance/admin-mark', newAttendance);
      alert('✅ Attendance record inserted successfully!');
      setShowMarkModal(false);
      fetchAttendanceRecords();
      fetchReportsData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to insert attendance record'}`);
    }
  };

  // Open Edit Attendance Record Modal
  const openEditRecordModal = (rec: AttendanceRecordItem) => {
    setEditingRecord({
      id: rec.id,
      student_name: rec.student_name,
      roll_number: rec.roll_number,
      subject: rec.subject || 'General Session',
      status: rec.status,
      notes: rec.notes || '',
      attendance_time: rec.attendance_time ? new Date(rec.attendance_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
    });
    setShowEditRecordModal(true);
  };

  // Submit Update Attendance Record
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await api.put(`/attendance/records/${editingRecord.id}`, {
        status: editingRecord.status,
        notes: editingRecord.notes,
        attendance_time: new Date(editingRecord.attendance_time).toISOString()
      });
      alert('✅ Attendance record updated successfully!');
      setShowEditRecordModal(false);
      setEditingRecord(null);
      fetchAttendanceRecords();
      fetchReportsData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to update record'}`);
    }
  };

  // Delete Attendance Record
  const handleDeleteRecord = async (id: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete attendance entry for ${studentName}?`)) return;
    try {
      await api.delete(`/attendance/records/${id}`);
      alert('✅ Attendance record removed');
      fetchAttendanceRecords();
      fetchReportsData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to delete record'}`);
    }
  };

  // Export Attendance Log to Excel
  const handleExportExcel = () => {
    const exportData = attendanceRecords.map((r) => ({
      'Student Name': r.student_name,
      'Roll Number': r.roll_number,
      Department: r.student_department,
      Class: `Yr ${r.student_year} Sec ${r.student_section}`,
      Subject: r.subject || 'General',
      Status: r.status.toUpperCase(),
      'Attendance Time': new Date(r.attendance_time).toLocaleString(),
      Notes: r.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records');
    XLSX.writeFile(wb, `SmartAttend_Attendance_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Defaulters to Excel
  const handleExportDefaulters = () => {
    const exportData = defaultersList.map((d) => ({
      'Roll Number': d.roll_number,
      'Student Name': d.name,
      Email: d.email,
      'Attendance %': `${d.overallPercentage}%`,
      'Classes Attended': d.classesAttended,
      'Classes Missed': d.classesMissed,
      Status: d.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Defaulters List');
    XLSX.writeFile(wb, `SmartAttend_Defaulters_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl text-[#111827]">
              Attendance & Reports Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-bold text-xs border border-[#6D5DFC]/20">
              AI&DS III-A
            </span>
          </div>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Real-Time Attendance Operations, Full Record CRUD, Defaulter Tracking & Academic Analytics
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'records' && (
            <button
              onClick={() => setShowMarkModal(true)}
              className="px-4 py-2 rounded-full bg-[#6D5DFC] text-white text-xs font-bold shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Insert Attendance
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-full bg-[#ECFDF5] text-[#12B76A] text-xs font-bold border border-[#12B76A]/20 hover:bg-[#12B76A]/10 transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* LEVEL 0: MAIN TABS & VIEWS */}
      {!selectedSubject && (
        <div className="space-y-6">
          {/* Navigation Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E7E7E7]">
            {[
              { id: 'subjects', label: `Subject Analytics (${subjectsData.length})`, icon: BookOpen },
              { id: 'records', label: `Attendance Log & CRUD (${attendanceRecords.length})`, icon: ListChecks },
              { id: 'defaulters', label: `Defaulters List (${defaultersList.length})`, icon: AlertTriangle },
              { id: 'monthly', label: 'Semester Trends', icon: Calendar }
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-[#6D5DFC] text-white shadow-floating'
                      : 'bg-white text-[#6B7280] border border-[#E7E7E7] hover:bg-[#FAFAFA]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: SUBJECT CARDS GRID */}
          {activeTab === 'subjects' && (
            <div>
              {subjectsData.length === 0 ? (
                <div className="bg-white p-12 rounded-[24px] border border-[#E7E7E7] shadow-enterprise text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-[#6D5DFC] mx-auto opacity-70" />
                  <h4 className="font-display font-extrabold text-base text-[#111827]">No attendance data available yet.</h4>
                  <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                    Attendance analytics and subject reports will update as lectures are conducted.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {subjectsData.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4 flex flex-col justify-between hover:border-[#6D5DFC]/40 transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                          <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20">
                            {sub.code}
                          </span>
                          <span className="text-[11px] text-[#6B7280] font-medium">{sub.classesHeld} Classes Held</span>
                        </div>

                        <h3 className="font-display font-extrabold text-lg text-[#111827] mt-3 group-hover:text-[#6D5DFC] transition-colors">
                          {sub.name}
                        </h3>
                        <p className="text-xs text-[#6B7280] font-semibold mt-1 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                          <span>Faculty: <strong className="text-[#4F7CFF]">{sub.faculty_name}</strong></span>
                        </p>

                        <div className="mt-4 p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-[#6B7280] font-bold block">AVG ATTENDANCE</span>
                            <strong className="font-mono text-[#6D5DFC] font-extrabold text-sm">{sub.avgPercentage}%</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#12B76A] font-bold block">PRESENT</span>
                            <strong className="font-mono text-[#12B76A] font-extrabold text-sm">{sub.presentCount}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-500 font-bold block">ABSENT</span>
                            <strong className="font-mono text-rose-500 font-extrabold text-sm">{sub.absentCount}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-[#6B7280] font-medium">Last: {sub.lastClassDate}</span>
                        <button
                          onClick={() => setSelectedSubject(sub)}
                          className="px-4 py-2 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-1"
                        >
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATTENDANCE RECORDS FULL CRUD LOG */}
          {activeTab === 'records' && (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="bg-white p-4 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-center gap-3">
                <div className="relative w-full md:w-72">
                  <input
                    type="text"
                    placeholder="Search by student, roll no, subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#9CA3AF] pl-9 focus:outline-none focus:border-[#6D5DFC] font-medium"
                  />
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  >
                    <option value="">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>

                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  >
                    <option value="">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>

                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                  />
                  <span className="text-[#6B7280]">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                  />
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="p-4">Student</th>
                        <th className="p-4">Roll Number</th>
                        <th className="p-4">Subject</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Notes / Code</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {attendanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-[#6B7280]">
                            No attendance log records matching current filter criteria.
                          </td>
                        </tr>
                      ) : (
                        attendanceRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="p-4 flex items-center gap-3">
                              <img
                                src={rec.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt=""
                                className="w-8 h-8 rounded-full border border-[#E7E7E7] object-cover"
                              />
                              <div>
                                <p className="font-bold text-[#111827]">{rec.student_name}</p>
                                <p className="text-[10px] text-[#6B7280]">{rec.student_department || 'Student'}</p>
                              </div>
                            </td>
                            <td className="p-4 font-mono text-[#6D5DFC] font-bold">{rec.roll_number}</td>
                            <td className="p-4 font-semibold text-[#111827]">{rec.subject || 'General Session'}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                rec.status === 'present'
                                  ? 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                                  : rec.status === 'absent'
                                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                                  : rec.status === 'late'
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-blue-50 text-blue-600 border-blue-200'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-[#6B7280] text-[11px]">
                              {new Date(rec.attendance_time).toLocaleString()}
                            </td>
                            <td className="p-4 text-[#6B7280] text-[11px]">
                              {rec.notes || rec.attendance_code || 'Recorded'}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditRecordModal(rec)}
                                  className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1"
                                  title="Edit status or timestamp"
                                >
                                  <Edit className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(rec.id, rec.student_name)}
                                  className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEFAULTERS LIST */}
          {activeTab === 'defaulters' && (
            <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-[#111827]">Academic Defaulters List (&lt; 75%)</h3>
                  <p className="text-xs text-[#6B7280] font-medium mt-0.5">Students requiring attendance counseling and parent notification</p>
                </div>
                <button
                  onClick={handleExportDefaulters}
                  className="px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 flex items-center gap-1 hover:bg-rose-100"
                >
                  <Download className="w-3.5 h-3.5" /> Export Defaulters
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E7E7E7] text-[#6B7280] font-bold uppercase tracking-wider">
                      <th className="pb-3 px-3">Register Number</th>
                      <th className="pb-3 px-3">Student Name</th>
                      <th className="pb-3 px-3 text-center">Overall Attendance %</th>
                      <th className="pb-3 px-3 text-center">Classes Attended / Missed</th>
                      <th className="pb-3 px-3 text-center">Status Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {defaultersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#12B76A] font-bold">
                          🎉 Excellent! No student accounts are currently below the 75% attendance threshold.
                        </td>
                      </tr>
                    ) : (
                      defaultersList.map((d) => (
                        <tr key={d.id || d.roll_number} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-[#6D5DFC]">{d.roll_number}</td>
                          <td className="py-3.5 px-3 font-bold text-[#111827]">{d.name}</td>
                          <td className="py-3.5 px-3 text-center font-mono font-extrabold text-rose-600 text-sm">{d.overallPercentage}%</td>
                          <td className="py-3.5 px-3 text-center font-mono text-[#6B7280]">{d.classesAttended || 0} Attended / {d.classesMissed || 0} Missed</td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] border bg-rose-50 text-rose-600 border-rose-200">
                              Critical (&lt; 75%)
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: MONTHLY TRENDS */}
          {activeTab === 'monthly' && (
            <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
              <h3 className="font-display font-extrabold text-lg text-[#111827]">Semester Monthly Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { month: 'Current Semester', pct: 92, classes: attendanceRecords.length },
                  { month: 'Month 1', pct: 94, classes: 24 },
                  { month: 'Month 2', pct: 91, classes: 26 },
                  { month: 'Month 3', pct: 93, classes: 25 }
                ].map((m) => (
                  <div key={m.month} className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#111827]">{m.month}</span>
                      <span className="font-mono font-extrabold text-[#6D5DFC]">{m.pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E7E7E7] overflow-hidden">
                      <div className="h-full bg-[#6D5DFC] rounded-full" style={{ width: `${m.pct}%` }} />
                    </div>
                    <span className="text-[10px] text-[#6B7280] font-medium block pt-1">{m.classes} Lectures Recorded</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEVEL 1: DRILL-DOWN SUBJECT ATTENDANCE DASHBOARD */}
      {selectedSubject && !selectedClassHistory && (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedSubject(null)}
            className="px-4 py-2 rounded-full bg-white text-[#111827] text-xs font-bold border border-[#E7E7E7] shadow-sm hover:bg-[#FAFAFA] transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Subject Cards</span>
          </button>

          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E7E7E7]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20">
                    {selectedSubject.code}
                  </span>
                  <h2 className="font-display font-extrabold text-2xl text-[#111827]">
                    {selectedSubject.name} Attendance Dashboard
                  </h2>
                </div>
                <p className="text-xs text-[#6B7280] font-medium mt-1">
                  Faculty: <strong className="text-[#4F7CFF]">{selectedSubject.faculty_name}</strong> • AI&DS III-A
                </p>
              </div>

              <button
                onClick={handleExportExcel}
                className="px-4 py-2 rounded-full bg-[#6D5DFC] text-white text-xs font-bold shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Subject Matrix
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase">Total Classes Conducted</span>
                <p className="font-display font-extrabold text-xl text-[#111827]">{selectedSubject.classesHeld} Lectures</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
                <span className="text-[10px] font-bold text-[#6D5DFC] uppercase">Average Attendance</span>
                <p className="font-display font-extrabold text-xl text-[#6D5DFC]">{selectedSubject.avgPercentage}%</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
                <span className="text-[10px] font-bold text-[#12B76A] uppercase">Average Present</span>
                <p className="font-display font-extrabold text-xl text-[#12B76A]">{selectedSubject.presentCount} Students</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
                <span className="text-[10px] font-bold text-amber-600 uppercase">Average Absent</span>
                <p className="font-display font-extrabold text-xl text-amber-600">{selectedSubject.absentCount} Students</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: INSERT NEW ATTENDANCE RECORD */}
      {showMarkModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Insert Attendance Entry</h3>
              <button onClick={() => setShowMarkModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkAttendance} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Select Student</label>
                <select
                  required
                  value={newAttendance.student_id}
                  onChange={(e) => setNewAttendance({ ...newAttendance, student_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                >
                  <option value="">Select a student...</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.roll_number}) - {st.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Subject</label>
                <select
                  value={newAttendance.subject}
                  onChange={(e) => setNewAttendance({ ...newAttendance, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                >
                  <option value="Programming Language for AI">Programming Language for AI</option>
                  <option value="Data Analytics">Data Analytics</option>
                  <option value="Web Technology">Web Technology</option>
                  <option value="Knowledge Engineering">Knowledge Engineering</option>
                  <option value="Block Chain Technology">Block Chain Technology</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Attendance Status</label>
                  <select
                    value={newAttendance.status}
                    onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newAttendance.attendance_time}
                    onChange={(e) => setNewAttendance({ ...newAttendance, attendance_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Notes / Reason</label>
                <input
                  type="text"
                  value={newAttendance.notes}
                  onChange={(e) => setNewAttendance({ ...newAttendance, notes: e.target.value })}
                  placeholder="e.g. Manually verified by advisor"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] mt-2"
              >
                Insert Attendance Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ATTENDANCE RECORD */}
      {showEditRecordModal && editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-display font-bold text-lg text-[#111827]">Edit Attendance Entry</h3>
                <p className="text-xs text-[#6B7280]">{editingRecord.student_name} ({editingRecord.roll_number})</p>
              </div>
              <button onClick={() => setShowEditRecordModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Attendance Status</label>
                <select
                  value={editingRecord.status}
                  onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Attendance Timestamp</label>
                <input
                  type="datetime-local"
                  value={editingRecord.attendance_time}
                  onChange={(e) => setEditingRecord({ ...editingRecord, attendance_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Notes / Justification</label>
                <input
                  type="text"
                  value={editingRecord.notes}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  placeholder="e.g. Updated after leave submission"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] mt-2"
              >
                Save Updated Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
