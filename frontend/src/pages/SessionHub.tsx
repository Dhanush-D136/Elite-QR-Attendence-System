import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { AttendanceSession, AttendanceRecord, TimetableItem } from '../types';
import { DynamicQRDisplay } from '../components/DynamicQRDisplay';
import {
  QrCode,
  Play,
  StopCircle,
  UserCheck,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  UserX,
  Plus,
  Edit
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
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [timetables, setTimetables] = useState<TimetableItem[]>([]);

  // Roster lists for selected session
  const [presentStudents, setPresentStudents] = useState<any[]>([]);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [rosterTab, setRosterTab] = useState<'present' | 'absent'>('present');

  // Selected Timetable Slot for QR Generation
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [subject, setSubject] = useState<string>(initialSubject || 'Programming Language for AI');
  const [facultyName, setFacultyName] = useState<string>(initialFaculty || 'Mrs Nivetha P');
  const [periodNumber, setPeriodNumber] = useState<string>(initialPeriod || '1');
  const [subjectCode, setSubjectCode] = useState<string>(initialSubjectCode || '');
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('AI & Data Science');
  const [year, setYear] = useState('3');
  const [section, setSection] = useState('A');
  const [duration, setDuration] = useState('30');

  const [isCreating, setIsCreating] = useState(false);

  // Sync initial props when passed dynamically
  useEffect(() => {
    if (initialSubject) {
      setSubject(initialSubject);
    }
    if (initialFaculty) {
      setFacultyName(initialFaculty);
    }
    if (initialSubjectCode) {
      setSubjectCode(initialSubjectCode);
    }
    if (initialPeriod) {
      setPeriodNumber(initialPeriod);
    }
  }, [initialSubject, initialFaculty, initialSubjectCode, initialPeriod]);

  const fetchTimetables = async () => {
    try {
      const res = await api.get('/timetables');
      const fetchedTt = res.data.timetables || [];
      setTimetables(fetchedTt);

      if (fetchedTt.length > 0) {
        if (initialSubject) {
          const match = fetchedTt.find(
            (t: TimetableItem) =>
              t.subject_name.toLowerCase().includes(initialSubject.toLowerCase()) ||
              initialSubject.toLowerCase().includes(t.subject_name.toLowerCase())
          );
          if (match) {
            setSelectedTimetableId(match.id);
            setSubject(match.subject_name);
            setFacultyName(match.faculty_name);
            setPeriodNumber(String(match.period_number || 1));
          } else {
            setSubject(initialSubject);
            if (initialFaculty) setFacultyName(initialFaculty);
          }
        } else if (!subject) {
          const first = fetchedTt[0];
          setSelectedTimetableId(first.id);
          setSubject(first.subject_name);
          setFacultyName(first.faculty_name);
          setPeriodNumber(String(first.period_number || 1));
        }
      }
    } catch (err) {
      console.error('Failed to fetch timetables:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions');
      const fetchedSessions = res.data.sessions || [];
      setSessions(fetchedSessions);

      if (fetchedSessions.length > 0 && !selectedSession) {
        let targetSession = null;
        if (initialSubject) {
          targetSession = fetchedSessions.find(
            (s: AttendanceSession) =>
              s.status === 'active' &&
              (s.subject.toLowerCase().includes(initialSubject.toLowerCase()) ||
                initialSubject.toLowerCase().includes(s.subject.toLowerCase()))
          );
        }
        if (!targetSession) {
          targetSession = fetchedSessions.find((s: AttendanceSession) => s.status === 'active') || fetchedSessions[0];
        }
        if (targetSession) {
          selectSession(targetSession);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const selectSession = async (session: AttendanceSession) => {
    setSelectedSession(session);
    try {
      const res = await api.get(`/sessions/${session.id}`);
      setPresentStudents(res.data.presentStudents || []);
      setAbsentStudents(res.data.absentStudents || []);
    } catch (e) {
      setPresentStudents([]);
      setAbsentStudents([]);
    }
  };

  useEffect(() => {
    fetchTimetables();
    fetchSessions();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchSessions();
      if (selectedSession) selectSession(selectedSession);
    };

    socket.on('attendance_updated', handleUpdate);
    socket.on('attendance_marked', handleUpdate);
    socket.on('attendanceMarked', handleUpdate);

    return () => {
      socket.off('attendance_updated', handleUpdate);
      socket.off('attendance_marked', handleUpdate);
      socket.off('attendanceMarked', handleUpdate);
    };
  }, [selectedSession?.id]);

  // Handle Select Timetable Slot from Dropdown
  const handleTimetableSelect = (ttId: string) => {
    setSelectedTimetableId(ttId);
    const tt = timetables.find((t) => t.id === ttId);
    if (tt) {
      setSubject(tt.subject_name);
      setFacultyName(tt.faculty_name);
      setPeriodNumber(String(tt.period_number || 1));
      if (tt.department) setDepartment(tt.department);
      if (tt.section) setSection(tt.section);
    }
  };

  // Launch Session directly linked to Timetable Entry
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || subject.trim() === '') {
      alert('❌ Validation Error: Subject Name is required to generate a session QR code.');
      return;
    }
    if (!facultyName || facultyName.trim() === '') {
      alert('❌ Validation Error: Faculty assignment is required before generating session QR code.');
      return;
    }

    try {
      setIsCreating(true);
      const res = await api.post('/sessions', {
        subject: subject.trim(),
        subject_code: subjectCode.trim(),
        faculty_name: facultyName.trim(),
        period_number: periodNumber,
        date: sessionDate,
        department,
        year: parseInt(year),
        section,
        duration_minutes: parseInt(duration)
      });

      const newSession = res.data.session;
      setSessions((prev) => [newSession, ...prev]);
      selectSession(newSession);
      alert(`✅ Attendance Session launched exclusively for ${subject} (Period ${periodNumber})!`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to launch attendance session');
    } finally {
      setIsCreating(false);
    }
  };

  // Manually mark absent student as present
  const handleManualMarkPresent = async (studentId: string, studentName: string) => {
    if (!selectedSession) return;
    try {
      await api.post('/attendance/admin-mark', {
        student_id: studentId,
        session_id: selectedSession.id,
        status: 'present',
        notes: 'Marked present by faculty'
      });
      alert(`✅ Marked ${studentName} as PRESENT`);
      selectSession(selectedSession);
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to mark attendance'}`);
    }
  };

  // Manually mark present student as absent/delete record
  const handleManualMarkAbsent = async (recordId: string, studentName: string) => {
    if (!recordId) return;
    if (!confirm(`Mark ${studentName} as ABSENT for this session?`)) return;
    try {
      await api.delete(`/attendance/records/${recordId}`);
      alert(`✅ Updated ${studentName} to ABSENT`);
      if (selectedSession) selectSession(selectedSession);
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to update attendance'}`);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('End and close this attendance session? Students will no longer be able to scan.')) return;
    try {
      await api.post(`/sessions/${sessionId}/end`);
      fetchSessions();
      alert('Attendance Session closed.');
    } catch (err) {
      alert('Failed to end session');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827]">Live Dynamic QR Attendance Hub</h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Real-time attendance session manager for Elite Minds Attendance Portal
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Timetable Selection & Launch Form */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
            <div className="flex items-center gap-2 text-[#6D5DFC]">
              <Play className="w-4 h-4 fill-[#6D5DFC]" />
              <h3 className="font-display font-bold text-base text-[#111827]">Launch Timetable QR Session</h3>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3">
              {/* Timetable Slot Selector */}
              {timetables.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Select Timetable Entry</label>
                  <select
                    value={selectedTimetableId}
                    onChange={(e) => handleTimetableSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/30 text-[#6D5DFC] text-xs font-bold"
                  >
                    {timetables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.day} P{t.period_number || 1} - {t.subject_name} ({t.faculty_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Faculty Name *</label>
                <input
                  type="text"
                  required
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs font-medium"
                  >
                    <option value="15">15 Mins</option>
                    <option value="25">25 Mins</option>
                    <option value="45">45 Mins</option>
                    <option value="60">60 Mins</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Period Number</label>
                  <select
                    value={periodNumber}
                    onChange={(e) => setPeriodNumber(e.target.value)}
                    className="w-full px-2 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs"
                  >
                    <option value="1">Period 1</option>
                    <option value="2">Period 2</option>
                    <option value="3">Period 3</option>
                    <option value="4">Period 4</option>
                    <option value="5">Period 5</option>
                    <option value="6">Period 6</option>
                    <option value="7">Period 7</option>
                    <option value="8">Period 8</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Section</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-2 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isCreating ? (
                  <span>Generating QR...</span>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Generate Session QR</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Session History List */}
          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3">
            <h3 className="font-display font-bold text-sm text-[#111827]">Active & Past Sessions</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-[#6B7280] py-4 text-center">No attendance sessions created yet.</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectSession(s)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-xs space-y-1 ${
                      selectedSession?.id === s.id
                        ? 'bg-[#F3F0FF] border-[#6D5DFC]/40 text-[#111827]'
                        : 'bg-[#FAFAFA] border-[#E7E7E7] text-[#6B7280] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[#111827]">{s.subject}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
                        s.status === 'active' ? 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20' : 'bg-[#E7E7E7] text-[#6B7280]'
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-medium">
                      <span>Code: <strong className="text-[#6D5DFC] font-mono font-bold">{s.attendance_code}</strong></span>
                      <span>P{s.period_number || 1} • {new Date(s.start_time).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic QR Display & Present/Absent Rosters */}
        <div className="space-y-6 lg:col-span-2">
          {selectedSession && selectedSession.status === 'active' ? (
            <div className="space-y-6">
              <DynamicQRDisplay
                sessionId={selectedSession.id}
                subjectName={selectedSession.subject}
                subjectCode={subjectCode || (selectedSession as any).subject_code}
                facultyName={selectedSession.faculty_name}
                periodNumber={selectedSession.period_number}
                sessionDate={selectedSession.date || sessionDate}
                department={selectedSession.department}
                section={selectedSession.section}
                liveRecordsCount={presentStudents.length}
              />

              <div className="text-center">
                <button
                  onClick={() => handleEndSession(selectedSession.id)}
                  className="px-6 py-2.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  <StopCircle className="w-4 h-4 text-rose-600" />
                  <span>End & Close Attendance Session</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-10 rounded-[24px] border border-[#E7E7E7] shadow-enterprise text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 flex items-center justify-center mx-auto text-[#6D5DFC]">
                <QrCode className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-base text-[#111827]">No Active QR Session Displayed</h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto font-medium">
                Select a timetable slot from the left form to launch the 25-second dynamic attendance QR code.
              </p>
            </div>
          )}

          {/* Present & Absent Student Lists */}
          {selectedSession && (
            <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E7E7]">
                <div>
                  <h3 className="font-display font-bold text-base text-[#111827]">
                    Session Roster — {selectedSession.subject}
                  </h3>
                  <p className="text-xs text-[#6B7280] font-medium">
                    Faculty: <strong>{selectedSession.faculty_name || 'Faculty Member'}</strong> • Period: P{selectedSession.period_number || 1}
                  </p>
                </div>

                {/* Tabs: Present vs Absent */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRosterTab('present')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      rosterTab === 'present'
                        ? 'bg-[#12B76A] text-white shadow-floating'
                        : 'bg-[#FAFAFA] text-[#6B7280] border border-[#E7E7E7]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Present ({presentStudents.length})
                  </button>

                  <button
                    onClick={() => setRosterTab('absent')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      rosterTab === 'absent'
                        ? 'bg-rose-600 text-white shadow-floating'
                        : 'bg-[#FAFAFA] text-[#6B7280] border border-[#E7E7E7]'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" /> Absent ({absentStudents.length})
                  </button>
                </div>
              </div>

              {/* PRESENT STUDENTS LIST */}
              {rosterTab === 'present' && (
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3">Register Number</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Time Marked</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {presentStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#6B7280]">
                            No students marked present yet for this session.
                          </td>
                        </tr>
                      ) : (
                        presentStudents.map((st) => (
                          <tr key={st.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-3 font-bold text-[#111827] flex items-center gap-2">
                              <img
                                src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover border border-[#E7E7E7]"
                              />
                              <span>{st.name}</span>
                            </td>
                            <td className="py-3 font-mono text-[#6D5DFC] font-bold">{st.roll_number}</td>
                            <td className="py-3 text-[#6B7280]">{st.email}</td>
                            <td className="py-3 font-mono text-[#12B76A] font-bold">
                              {st.attendance_time ? new Date(st.attendance_time).toLocaleTimeString() : 'Verified'}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleManualMarkAbsent(st.record_id, st.name)}
                                className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-600 hover:bg-rose-100 transition-colors"
                              >
                                Mark Absent
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ABSENT STUDENTS LIST */}
              {rosterTab === 'absent' && (
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3">Register Number</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {absentStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#12B76A] font-bold">
                            🎉 All enrolled students are marked Present for this session!
                          </td>
                        </tr>
                      ) : (
                        absentStudents.map((st) => (
                          <tr key={st.id} className="hover:bg-rose-50/40 transition-colors">
                            <td className="py-3 font-bold text-[#111827] flex items-center gap-2">
                              <img
                                src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover border border-[#E7E7E7]"
                              />
                              <span>{st.name}</span>
                            </td>
                            <td className="py-3 font-mono text-rose-600 font-bold">{st.roll_number}</td>
                            <td className="py-3 text-[#6B7280]">{st.email}</td>
                            <td className="py-3 text-[#6B7280] font-medium">{st.reason || 'Uninformed Absence'}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleManualMarkPresent(st.id, st.name)}
                                className="px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#12B76A]/20 text-[10px] font-bold text-[#12B76A] hover:bg-[#12B76A]/10 transition-colors"
                              >
                                Mark Present
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
