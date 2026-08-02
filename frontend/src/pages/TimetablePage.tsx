import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TimetableItem, Department, SubjectItem } from '../types';
import {
  Calendar,
  Plus,
  Edit3,
  Trash2,
  ArrowUpDown,
  Clock,
  X,
  Check,
  BookOpen,
  User,
  UserCheck,
  Building,
  MapPin,
  Sparkles,
  ListChecks,
  QrCode
} from 'lucide-react';
import { getSocket } from '../services/socket';

interface TimetablePageProps {
  onNavigate?: (tab: string, extraData?: any) => void;
}

export const TimetablePage: React.FC<TimetablePageProps> = ({ onNavigate }) => {
  const [timetables, setTimetables] = useState<TimetableItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // Filter & Sorting State
  const [department, setDepartment] = useState('AI & DS');
  const [year, setYear] = useState('3');
  const [section, setSection] = useState('A');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [sortBy, setSortBy] = useState<'period' | 'date' | 'subject' | 'faculty'>('period');
  const [searchSubject, setSearchSubject] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingTt, setEditingTt] = useState<TimetableItem | null>(null);

  const [formData, setFormData] = useState({
    department: 'AI & DS',
    year: '3',
    section: 'A',
    semester: '5',
    date: new Date().toISOString().split('T')[0],
    day: 'Monday',
    period_number: '1',
    subject_name: '',
    faculty_name: '',
    start_time: '08:15 AM',
    end_time: '09:05 AM',
    room_number: 'F305'
  });

  const days = ['All Days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchData = async () => {
    try {
      const resSub = await api.get('/subjects').catch(() => ({ data: { subjects: [] } }));
      const subList = resSub.data?.subjects || resSub.data || [];
      setSubjects(subList);
    } catch (e) {
      console.error('Failed to load subjects:', e);
    }

    try {
      const resDept = await api.get('/departments').catch(() => ({ data: { departments: [] } }));
      const deptList = resDept.data?.departments || resDept.data || [];
      setDepartments(deptList);
    } catch (e) {
      console.error('Failed to load departments:', e);
    }

    try {
      const params = new URLSearchParams();
      if (department && department !== 'All') params.append('department', department);
      if (year && year !== 'All') params.append('year', year);
      if (section && section !== 'All') params.append('section', section);
      if (sortBy) params.append('sort_by', sortBy);
      if (searchSubject) params.append('subject', searchSubject);

      const resTt = await api.get(`/timetable?${params.toString()}`).catch(() => ({ data: { timetables: [] } }));
      const ttList = resTt.data?.timetables || resTt.data || [];
      setTimetables(ttList);
    } catch (err) {
      console.error('Failed to fetch timetables:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to Socket.IO realtime timetable and subject synchronization events
    const socket = getSocket();
    const handleTimetableChange = () => {
      console.log('⚡ [ADMIN TIMETABLE] Realtime sync event received. Refetching data...');
      fetchData();
    };

    socket.on('timetable_created', handleTimetableChange);
    socket.on('timetable_updated', handleTimetableChange);
    socket.on('timetable_deleted', handleTimetableChange);
    socket.on('timetable_changed', handleTimetableChange);
    socket.on('subject_created', handleTimetableChange);
    socket.on('subject_updated', handleTimetableChange);
    socket.on('subject_deleted', handleTimetableChange);

    return () => {
      socket.off('timetable_created', handleTimetableChange);
      socket.off('timetable_updated', handleTimetableChange);
      socket.off('timetable_deleted', handleTimetableChange);
      socket.off('timetable_changed', handleTimetableChange);
      socket.off('subject_created', handleTimetableChange);
      socket.off('subject_updated', handleTimetableChange);
      socket.off('subject_deleted', handleTimetableChange);
    };
  }, [department, year, section, sortBy, searchSubject]);

  const openAddModal = async () => {
    setEditingTt(null);
    let subList = Array.isArray(subjects) && subjects.length > 0 ? subjects : [];
    
    if (subList.length === 0) {
      try {
        const res = await api.get('/subjects');
        subList = res.data?.subjects || res.data || [];
        setSubjects(subList);
      } catch (e) {
        console.error('Failed to fetch subjects on modal open:', e);
      }
    }

    const firstSub = subList[0];
    setFormData({
      department,
      year,
      section,
      semester: '5',
      date: new Date().toISOString().split('T')[0],
      day: (selectedDay === 'All Days' || !selectedDay) ? 'Monday' : selectedDay,
      period_number: '1',
      subject_name: firstSub ? firstSub.name : '',
      faculty_name: firstSub ? (firstSub.faculty_name || '') : '',
      start_time: '08:15 AM',
      end_time: '09:05 AM',
      room_number: 'F305'
    });
    setShowModal(true);
  };

  const openEditModal = (tt: TimetableItem) => {
    setEditingTt(tt);
    setFormData({
      department: tt.department || department,
      year: String(tt.year || year),
      section: tt.section || section,
      semester: String(tt.semester || 5),
      date: tt.date || new Date().toISOString().split('T')[0],
      day: tt.day || selectedDay,
      period_number: String(tt.period_number || 1),
      subject_name: tt.subject_name,
      faculty_name: tt.faculty_name,
      start_time: tt.start_time,
      end_time: tt.end_time,
      room_number: tt.room_number
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTt) {
        await api.put(`/timetables/${editingTt.id}`, formData);
        alert('✅ Timetable slot updated successfully');
      } else {
        await api.post('/timetables', formData);
        alert('✅ New timetable slot added successfully');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to save timetable slot'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this class schedule slot?')) {
      try {
        await api.delete(`/timetables/${id}`);
        fetchData();
      } catch (err) {
        alert('Failed to delete timetable entry');
      }
    }
  };

  const normalizeDay = (d?: string) => {
    if (!d) return '';
    const clean = d.toString().trim().toLowerCase();
    if (clean === 'day1' || clean === 'day 1' || clean === 'mon' || clean === 'monday') return 'monday';
    if (clean === 'day2' || clean === 'day 2' || clean === 'tue' || clean === 'tuesday') return 'tuesday';
    if (clean === 'day3' || clean === 'day 3' || clean === 'wed' || clean === 'wednesday') return 'wednesday';
    if (clean === 'day4' || clean === 'day 4' || clean === 'thu' || clean === 'thursday') return 'thursday';
    if (clean === 'day5' || clean === 'day 5' || clean === 'fri' || clean === 'friday') return 'friday';
    if (clean === 'day6' || clean === 'day 6' || clean === 'sat' || clean === 'saturday') return 'saturday';
    if (clean === 'day7' || clean === 'day 7' || clean === 'sun' || clean === 'sunday') return 'sunday';
    return clean;
  };

  const filteredTt = timetables.filter((t) => {
    if (selectedDay === 'All Days') return true;
    if (!t.day) return false;
    return normalizeDay(t.day) === normalizeDay(selectedDay);
  });

  const displayTt = filteredTt;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827]">Timetable Management</h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Configure academic schedules, period assignments, multiple slots per day, and faculty allocations
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Timetable Slot</span>
        </button>
      </div>

      {/* Selector Filters & Sorting Bar */}
      <div className="bg-white p-4 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
          >
            <option value="All">All Departments</option>
            <option value="AI & DS">AI & DS</option>
            <option value="AI & Data Science">AI & Data Science</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
          >
            <option value="All">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
          >
            <option value="All">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[#6B7280] font-bold flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#6D5DFC]" /> Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-bold focus:border-[#6D5DFC]"
          >
            <option value="period">Period Number</option>
            <option value="date">Date</option>
            <option value="subject">Subject Name</option>
            <option value="faculty">Faculty Member</option>
          </select>
        </div>
      </div>

      {/* Days Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E7E7E7]">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
              selectedDay === d
                ? 'bg-[#6D5DFC] text-white shadow-floating'
                : 'bg-white text-[#6B7280] border border-[#E7E7E7] hover:bg-[#FAFAFA]'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Timetable List Grid */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7]">
          <h3 className="font-display font-bold text-base text-[#111827]">
            {selectedDay} Timetable Slots ({department} - Yr {year}, Sec {section})
          </h3>
          <span className="text-xs text-[#6D5DFC] font-bold">
            {displayTt.length} Active Period(s) Configured
          </span>
        </div>

        {displayTt.length === 0 ? (
          <div className="py-12 text-center text-[#6B7280] text-xs font-medium space-y-2">
            <Calendar className="w-8 h-8 text-[#9CA3AF] mx-auto opacity-70" />
            <p>No class timetable slots configured for {selectedDay}.</p>
            <button
              onClick={openAddModal}
              className="px-3.5 py-1.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-bold text-xs border border-[#6D5DFC]/20 hover:bg-[#6D5DFC]/10 inline-flex items-center gap-1 mt-2"
            >
              <Plus className="w-3.5 h-3.5" /> Add First Slot for {selectedDay}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayTt.map((tt) => (
              <div key={tt.id} className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-3 hover:border-[#6D5DFC]/40 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7]">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono font-extrabold text-[10px] border border-[#6D5DFC]/20">
                        P{tt.period_number || 1}
                      </span>
                      <span className="font-bold text-[#111827] text-sm group-hover:text-[#6D5DFC] transition-colors">{tt.subject_name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(tt)}
                        className="p-1.5 rounded-full text-[#6B7280] hover:text-[#6D5DFC] hover:bg-[#F3F0FF] transition-colors"
                        title="Edit slot"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tt.id)}
                        className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-[#6B7280]">
                    <div className="flex items-center gap-1.5 font-mono text-[#6D5DFC] font-bold">
                      <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" />
                      <span>{tt.start_time} - {tt.end_time}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1 text-[#111827] font-semibold">
                        <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                        Faculty: <strong className="text-[#4F7CFF]">{tt.faculty_name}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#E7E7E7] text-[#111827] font-mono">
                        {tt.room_number || 'F305'}
                      </span>
                    </div>

                    {tt.date && (
                      <p className="text-[10px] text-[#6B7280] font-mono pt-1">
                        Specific Date: <strong>{tt.date}</strong>
                      </p>
                    )}
                  </div>

                  {/* Card Quick Action Buttons */}
                  <div className="pt-3 grid grid-cols-2 gap-2 text-xs border-t border-[#E7E7E7]">
                    <button
                      onClick={() => onNavigate && onNavigate('reports', { subject: tt.subject_name })}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] font-bold hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center justify-center gap-1 text-[11px]"
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      <span>Mark Attendance</span>
                    </button>
                    <button
                      onClick={() => onNavigate && onNavigate('sessions', { subject: tt.subject_name, faculty: tt.faculty_name })}
                      className="px-2.5 py-1.5 rounded-xl bg-[#ECFDF5] text-[#12B76A] font-bold border border-[#12B76A]/20 hover:bg-[#12B76A] hover:text-white transition-all flex items-center justify-center gap-1 text-[11px]"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Generate QR</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Timetable Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">
                {editingTt ? 'Edit Class Timetable Slot' : 'Add New Timetable Slot'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Subject Name</label>
                <select
                  value={formData.subject_name}
                  onChange={(e) => {
                    const sub = subjects.find(s => s.name === e.target.value);
                    setFormData({
                      ...formData,
                      subject_name: e.target.value,
                      faculty_name: sub?.faculty_name || formData.faculty_name
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                >
                  <option value="">Select or type subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                  ))}
                  {formData.subject_name && !subjects.some(s => s.name === formData.subject_name) && (
                    <option value={formData.subject_name}>{formData.subject_name}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Faculty Name</label>
                <input
                  type="text"
                  required
                  list="faculty-list"
                  value={formData.faculty_name}
                  onChange={(e) => setFormData({ ...formData, faculty_name: e.target.value })}
                  placeholder="e.g. Mrs Vasanthapriya M J T"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
                <datalist id="faculty-list">
                  <option value="Mrs Nivetha P" />
                  <option value="Mrs Vasanthapriya M J T" />
                  <option value="Mrs Krithiga" />
                  <option value="Mrs Gowthami K" />
                  <option value="Mr Ramajayam" />
                  <option value="Mr Balaarunesh G" />
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Day of Week</label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    {days.filter(d => d !== 'All Days').map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Period Number</label>
                  <select
                    value={formData.period_number}
                    onChange={(e) => {
                      const p = e.target.value;
                      const times: Record<string, { start: string; end: string }> = {
                        '1': { start: '08:15 AM', end: '09:05 AM' },
                        '2': { start: '09:05 AM', end: '09:55 AM' },
                        '3': { start: '10:10 AM', end: '11:00 AM' },
                        '4': { start: '11:00 AM', end: '11:50 AM' },
                        '5': { start: '11:50 AM', end: '12:35 PM' },
                        '6': { start: '01:15 PM', end: '02:00 PM' },
                        '7': { start: '02:00 PM', end: '02:45 PM' },
                        '8': { start: '02:45 PM', end: '03:30 PM' }
                      };
                      const selectedTimes = times[p] || { start: '08:15 AM', end: '09:05 AM' };
                      setFormData({
                        ...formData,
                        period_number: p,
                        start_time: selectedTimes.start,
                        end_time: selectedTimes.end
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono font-bold"
                  >
                    <option value="1">Period 1 (P1 - 08:15 AM)</option>
                    <option value="2">Period 2 (P2 - 09:05 AM)</option>
                    <option value="3">Period 3 (P3 - 10:10 AM)</option>
                    <option value="4">Period 4 (P4 - 11:00 AM)</option>
                    <option value="5">Period 5 (P5 - 11:50 AM)</option>
                    <option value="6">Period 6 (P6 - 01:15 PM)</option>
                    <option value="7">Period 7 (P7 - 02:00 PM)</option>
                    <option value="8">Period 8 (P8 - 02:45 PM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    placeholder="08:15 AM"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    placeholder="09:05 AM"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  placeholder="F305"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono uppercase"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all mt-2"
              >
                {editingTt ? 'Save Updated Slot' : 'Create Timetable Slot'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
