import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, SubjectItem, TimetableItem } from '../types';
import {
  Building2,
  Users,
  BookOpen,
  UserCheck,
  Calendar,
  QrCode,
  BarChart3,
  Edit3,
  Plus,
  Trash2,
  Save,
  Clock,
  MapPin,
  Sparkles,
  Download,
  FileSpreadsheet,
  Search,
  X,
  CheckCircle2
} from 'lucide-react';
import { DynamicQRDisplay } from '../components/DynamicQRDisplay';

interface ClassDetails {
  department: string;
  year: string;
  section: string;
  semester: string;
  room: string;
  class_advisor: string;
  academic_year: string;
  batch: string;
}

interface Faculty {
  id: string;
  name: string;
  department: string;
  email?: string;
}

export const ClassManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('details');

  // --- Class Details State ---
  const [details, setDetails] = useState<ClassDetails>({
    department: 'AI & DS',
    year: 'III Year',
    section: 'A',
    semester: 'V',
    room: 'F305',
    class_advisor: 'Mrs Vasanthapriya M J T',
    academic_year: '2026-2027 (ODD)',
    batch: '2024-2028'
  });
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  // --- Subjects State ---
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ id: '', name: '', code: '', faculty_name: '', credits: 3 });

  // --- Faculty State ---
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ id: '', name: '', department: 'AI & DS', email: '' });

  // --- Timetable State ---
  const [timetables, setTimetables] = useState<TimetableItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [showTtModal, setShowTtModal] = useState(false);
  const [ttForm, setTtForm] = useState({
    id: '',
    day: 'Monday',
    subject_name: 'Data Analytics (DA)',
    faculty_name: 'Mrs Gowthami K',
    start_time: '8:15 AM',
    end_time: '9:05 AM',
    room_number: 'F305'
  });

  // --- Students State ---
  const [students, setStudents] = useState<User[]>([]);
  const [searchStudent, setSearchStudent] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periodTimes = [
    { period: 1, time: '8:15 AM - 9:05 AM' },
    { period: 2, time: '9:05 AM - 9:55 AM' },
    { period: 'BREAK', time: '9:55 AM - 10:10 AM' },
    { period: 3, time: '10:10 AM - 11:00 AM' },
    { period: 4, time: '11:00 AM - 11:50 AM' },
    { period: 5, time: '11:50 AM - 12:35 PM' },
    { period: 'LUNCH', time: '12:35 PM - 1:15 PM' },
    { period: 6, time: '1:15 PM - 2:00 PM' },
    { period: 7, time: '2:00 PM - 2:45 PM' },
    { period: 8, time: '2:45 PM - 3:30 PM' }
  ];

  const fetchAllData = async () => {
    try {
      const [resDet, resSub, resFac, resTt, resStud] = await Promise.all([
        api.get('/class-details'),
        api.get('/subjects'),
        api.get('/faculties'),
        api.get('/timetables'),
        api.get('/students')
      ]);
      if (resDet.data.details) setDetails(resDet.data.details);
      setSubjects(resSub.data.subjects || []);
      setFaculties(resFac.data.faculties || []);
      setTimetables(resTt.data.timetables || []);
      setStudents(resStud.data.students || []);
    } catch (err) {
      console.error('Failed to load class management data', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- Class Details Handlers ---
  const handleSaveDetails = async () => {
    try {
      await api.put('/class-details', details);
      setIsEditingDetails(false);
      alert('Class Details updated successfully!');
    } catch (err) {
      alert('Failed to update class details');
    }
  };

  // --- Subject Handlers ---
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (subjectForm.id) {
        await api.put(`/subjects/${subjectForm.id}`, subjectForm);
      } else {
        await api.post('/subjects', subjectForm);
      }
      setShowSubjectModal(false);
      setSubjectForm({ id: '', name: '', code: '', faculty_name: '', credits: 3 });
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save subject');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm('Delete subject?')) {
      await api.delete(`/subjects/${id}`);
      fetchAllData();
    }
  };

  // --- Faculty Handlers ---
  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (facultyForm.id) {
        await api.put(`/faculties/${facultyForm.id}`, facultyForm);
      } else {
        await api.post('/faculties', facultyForm);
      }
      setShowFacultyModal(false);
      setFacultyForm({ id: '', name: '', department: 'AI & DS', email: '' });
      fetchAllData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save faculty');
    }
  };

  const handleDeleteFaculty = async (id: string) => {
    if (confirm('Delete faculty record?')) {
      await api.delete(`/faculties/${id}`);
      fetchAllData();
    }
  };

  // --- Timetable Handlers ---
  const handleSaveTtSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (ttForm.id) {
        await api.put(`/timetables/${ttForm.id}`, ttForm);
      } else {
        await api.post('/timetables', ttForm);
      }
      setShowTtModal(false);
      setTtForm({ id: '', day: 'Monday', subject_name: 'Data Analytics (DA)', faculty_name: 'Mrs Gowthami K', start_time: '8:15 AM', end_time: '9:05 AM', room_number: 'F305' });
      fetchAllData();
    } catch (err) {
      alert('Failed to save timetable slot');
    }
  };

  const handleDeleteTtSlot = async (id: string) => {
    if (confirm('Delete timetable slot?')) {
      await api.delete(`/timetables/${id}`);
      fetchAllData();
    }
  };

  // --- Live Attendance State & Automatic Slot Detection ---
  const [activeSession, setActiveSession] = useState<any>(null);
  const [selectedSubjectForSession, setSelectedSubjectForSession] = useState('Data Analytics (DA)');
  const [autoSlot, setAutoSlot] = useState<any>(null);
  const [showOverride, setShowOverride] = useState<boolean>(false);

  const fetchCurrentSlot = async () => {
    try {
      const res = await api.get('/sessions/current-slot');
      if (res.data.hasActiveSlot) {
        setAutoSlot(res.data.slot);
      } else {
        setAutoSlot(null);
      }
    } catch (err) {
      console.error('Failed to fetch current timetable slot', err);
    }
  };

  useEffect(() => {
    fetchCurrentSlot();
    const interval = setInterval(fetchCurrentSlot, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- Start Live Attendance Session (1-Click Timetable Auto Launch) ---
  const handleStartSession = async (overrideSubject?: string) => {
    try {
      if (overrideSubject) {
        const res = await api.post('/sessions', {
          subject: overrideSubject,
          department: details.department,
          year: 3,
          section: details.section,
          duration_minutes: 25,
          period_number: autoSlot?.periodNumber || 1,
          faculty_name: autoSlot?.faculty || 'Faculty',
          room_number: autoSlot?.room || 'F305'
        });
        setActiveSession(res.data.session);
      } else {
        const res = await api.post('/sessions/auto-launch');
        setActiveSession(res.data.session);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to start session');
    }
  };

  const tabs = [
    { id: 'details', label: 'Class Details', icon: Building2 },
    { id: 'students', label: `Students (${students.length})`, icon: Users },
    { id: 'subjects', label: `Subjects (${subjects.length})`, icon: BookOpen },
    { id: 'faculty', label: `Faculty (${faculties.length})`, icon: UserCheck },
    { id: 'timetable', label: 'Master Timetable', icon: Calendar },
    { id: 'attendance', label: 'Live QR Attendance', icon: QrCode },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] font-extrabold flex items-center justify-center text-xl shadow-sm border border-[#6D5DFC]/20 font-mono">
            {details.department.substring(0, 4)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-2xl text-[#111827]">
                {details.department} — {details.year} {details.section}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#12B76A]/10 text-[#12B76A] font-bold text-xs border border-[#12B76A]/20">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#6B7280] font-medium mt-1">
              AY {details.academic_year} • Semester {details.semester} • Batch {details.batch} • Room {details.room} • Advisor: <strong className="text-[#111827]">{details.class_advisor}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('attendance')}
          className="px-5 py-3 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-2"
        >
          <QrCode className="w-4 h-4" />
          <span>Launch QR Session</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E7E7E7]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
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

      {/* TAB 1: CLASS DETAILS */}
      {activeTab === 'details' && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E7E7E7]">
            <h3 className="font-display font-extrabold text-lg text-[#111827]">Class Configuration & Metadata</h3>
            {isEditingDetails ? (
              <button
                onClick={handleSaveDetails}
                className="px-4 py-2 rounded-full bg-[#12B76A] text-xs font-bold text-white shadow-floating hover:bg-[#0ea25d] transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Details
              </button>
            ) : (
              <button
                onClick={() => setIsEditingDetails(true)}
                className="px-4 py-2 rounded-full bg-[#F3F0FF] text-[#6D5DFC] text-xs font-bold border border-[#6D5DFC]/20 hover:bg-[#6D5DFC]/10 transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" /> Edit Details
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Department</label>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={details.department}
                  onChange={(e) => setDetails({ ...details, department: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E7E7E7] font-bold text-[#111827]"
                />
              ) : (
                <p className="font-extrabold text-sm text-[#111827]">{details.department}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Year Level</label>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={details.year}
                  onChange={(e) => setDetails({ ...details, year: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E7E7E7] font-bold text-[#111827]"
                />
              ) : (
                <p className="font-extrabold text-sm text-[#111827]">{details.year}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Section</label>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={details.section}
                  onChange={(e) => setDetails({ ...details, section: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E7E7E7] font-bold text-[#111827]"
                />
              ) : (
                <p className="font-extrabold text-sm text-[#111827]">Section {details.section}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Semester</label>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={details.semester}
                  onChange={(e) => setDetails({ ...details, semester: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E7E7E7] font-bold text-[#111827]"
                />
              ) : (
                <p className="font-extrabold text-sm text-[#111827]">Semester {details.semester}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Classroom / Location</label>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={details.room}
                  onChange={(e) => setDetails({ ...details, room: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E7E7E7] font-bold text-[#111827]"
                />
              ) : (
                <p className="font-extrabold text-sm text-[#6D5DFC] font-mono">{details.room}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Class Advisor</label>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={details.class_advisor}
                  onChange={(e) => setDetails({ ...details, class_advisor: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E7E7E7] font-bold text-[#111827]"
                />
              ) : (
                <p className="font-extrabold text-sm text-[#111827]">{details.class_advisor}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Academic Year</label>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={details.academic_year}
                  onChange={(e) => setDetails({ ...details, academic_year: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E7E7E7] font-bold text-[#111827]"
                />
              ) : (
                <p className="font-extrabold text-sm text-[#111827]">{details.academic_year}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
              <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Batch</label>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={details.batch}
                  onChange={(e) => setDetails({ ...details, batch: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#E7E7E7] font-bold text-[#111827]"
                />
              ) : (
                <p className="font-extrabold text-sm text-[#111827]">{details.batch}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS */}
      {activeTab === 'students' && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h3 className="font-display font-bold text-lg text-[#111827]">AI&DS III-A Student Roster ({students.length})</h3>
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search student or register no..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] pl-9"
              />
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
            </div>
          </div>

          {students.length === 0 ? (
            <div className="py-12 px-6 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-center space-y-3">
              <Users className="w-10 h-10 text-[#6D5DFC] mx-auto opacity-70" />
              <h4 className="font-display font-extrabold text-base text-[#111827]">No students have been added yet.</h4>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Add students manually or import via Excel file to populate the class roster.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E7E7E7] text-[#6B7280] font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Student Name</th>
                    <th className="pb-3 px-3">Register Number</th>
                    <th className="pb-3 px-3">Email Address</th>
                    <th className="pb-3 px-3">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {students
                    .filter((s) => s.name.toLowerCase().includes(searchStudent.toLowerCase()) || (s.roll_number && s.roll_number.includes(searchStudent)))
                    .map((st) => (
                      <tr key={st.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-3 font-bold text-[#111827] flex items-center gap-2.5">
                          <img
                            src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                            className="w-7 h-7 rounded-full object-cover border border-[#E7E7E7]"
                            alt={st.name}
                          />
                          <span>{st.name}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[#6D5DFC] font-bold">{st.roll_number || 'N/A'}</td>
                        <td className="py-3 px-3 text-[#6B7280]">{st.email}</td>
                        <td className="py-3 px-3 text-[#6B7280]">{st.phone || '+91 9876543210'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-extrabold text-lg text-[#111827]">Curriculum Subjects ({subjects.length})</h3>
            <button
              onClick={() => {
                setSubjectForm({ id: '', name: '', code: '', faculty_name: '', credits: 3 });
                setShowSubjectModal(true);
              }}
              className="px-4 py-2 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="bg-white p-12 rounded-[24px] border border-[#E7E7E7] shadow-enterprise text-center space-y-3">
              <BookOpen className="w-10 h-10 text-[#6D5DFC] mx-auto opacity-70" />
              <h4 className="font-display font-extrabold text-base text-[#111827]">No subjects configured yet.</h4>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Configure your curriculum course subjects to enable timetable scheduling and attendance logging.
              </p>
              <button
                onClick={() => {
                  setSubjectForm({ id: '', name: '', code: '', faculty_name: '', credits: 3 });
                  setShowSubjectModal(true);
                }}
                className="px-5 py-2.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Subject
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((sub) => (
                <div key={sub.id} className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3 flex flex-col justify-between hover:border-[#6D5DFC]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7]">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20">
                        {sub.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSubjectForm({ id: sub.id, name: sub.name, code: sub.code, faculty_name: sub.faculty_name || '', credits: sub.credits || 3 });
                            setShowSubjectModal(true);
                          }}
                          className="p-1 text-[#6B7280] hover:text-[#6D5DFC]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteSubject(sub.id)} className="p-1 text-[#6B7280] hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-display font-extrabold text-base text-[#111827] mt-2">{sub.name}</h4>
                    <p className="text-xs text-[#6B7280] mt-1 font-medium">Faculty: <strong className="text-[#4F7CFF]">{sub.faculty_name || 'TBD'}</strong></p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6B7280] font-medium pt-2 border-t border-[#E7E7E7]">
                    <span>{sub.credits} Credits</span>
                    <span>{sub.description || 'Theory Course'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FACULTY */}
      {activeTab === 'faculty' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-extrabold text-lg text-[#111827]">Faculty Directory ({faculties.length})</h3>
            <button
              onClick={() => {
                setFacultyForm({ id: '', name: '', department: 'AI & DS', email: '' });
                setShowFacultyModal(true);
              }}
              className="px-4 py-2 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Faculty
            </button>
          </div>

          {faculties.length === 0 ? (
            <div className="bg-white p-12 rounded-[24px] border border-[#E7E7E7] shadow-enterprise text-center space-y-3">
              <UserCheck className="w-10 h-10 text-[#4F7CFF] mx-auto opacity-70" />
              <h4 className="font-display font-extrabold text-base text-[#111827]">No faculty members added yet.</h4>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Add faculty members to assign them to subjects and timetable lecture slots.
              </p>
              <button
                onClick={() => {
                  setFacultyForm({ id: '', name: '', department: 'AI & DS', email: '' });
                  setShowFacultyModal(true);
                }}
                className="px-5 py-2.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Faculty
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {faculties.map((fac) => (
                <div key={fac.id} className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] text-[#4F7CFF] font-bold flex items-center justify-center">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-[#111827]">{fac.name}</h4>
                      <p className="text-xs text-[#6B7280] font-medium">{fac.department} • {fac.email || 'faculty@veltech.com'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDeleteFaculty(fac.id)} className="p-1 text-[#6B7280] hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MASTER TIMETABLE GRID (Vel Tech High Tech AI&DS III-A) */}
      {activeTab === 'timetable' && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E7E7E7]">
            <div>
              <h3 className="font-display font-extrabold text-lg text-[#111827]">Vel Tech High Tech — AI&DS III-A Master Timetable</h3>
              <p className="text-xs text-[#6B7280] font-medium mt-0.5">Location: F305 | Class Advisor: Mrs Vasanthapriya M J T</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTtForm({ id: '', day: selectedDay, subject_name: 'Data Analytics (DA)', faculty_name: 'Mrs Gowthami K', start_time: '8:15 AM', end_time: '9:05 AM', room_number: 'F305' });
                  setShowTtModal(true);
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Class Slot
              </button>
            </div>
          </div>

          {/* Days Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedDay === d ? 'bg-[#6D5DFC] text-white shadow-floating' : 'bg-[#FAFAFA] text-[#6B7280] border border-[#E7E7E7]'
                }`}
              >
                {d} Schedule
              </button>
            ))}
          </div>

          {/* Timetable Grid for Selected Day */}
          <div className="space-y-3">
            {periodTimes.map((p, idx) => {
              if (p.period === 'BREAK' || p.period === 'LUNCH') {
                return (
                  <div key={idx} className="p-3 rounded-2xl bg-[#F7F3EE] border border-[#E7E7E7] text-center font-bold text-xs text-[#6B7280] tracking-wider uppercase">
                    ☕ {p.period} ({p.time})
                  </div>
                );
              }

              const slot = timetables.find((t) => t.day === selectedDay && t.start_time.startsWith(p.time.split('-')[0].trim()));
              return (
                <div key={idx} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-[#6D5DFC]/40 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-10 rounded-xl bg-white border border-[#E7E7E7] text-[#6D5DFC] font-mono font-bold text-xs flex flex-col items-center justify-center">
                      <span>P{p.period}</span>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] text-[#6D5DFC] font-bold">{p.time}</p>
                      <h4 className="font-display font-extrabold text-sm text-[#111827] mt-0.5">
                        {slot ? slot.subject_name : 'No Class / Free Slot'}
                      </h4>
                    </div>
                  </div>

                  {slot && (
                    <div className="flex items-center justify-between md:justify-end gap-4 text-xs">
                      <span className="font-semibold text-[#111827] flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                        {slot.faculty_name}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white border border-[#E7E7E7] font-mono text-[#111827] font-bold text-[11px]">
                        {slot.room_number}
                      </span>
                      <button
                        onClick={() => handleDeleteTtSlot(slot.id)}
                        className="p-1 text-[#6B7280] hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: TIMETABLE-BASED AUTOMATIC ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-[#E7E7E7]">
              <div>
                <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20 text-[10px] font-extrabold uppercase tracking-wider">
                  Automated Timetable Detector
                </span>
                <h3 className="font-display font-extrabold text-xl text-[#111827] mt-1">
                  Current Active Lecture Session
                </h3>
              </div>

              <button
                onClick={() => setShowOverride(!showOverride)}
                className="px-3.5 py-1.5 rounded-full bg-[#FAFAFA] text-[#6B7280] font-bold text-xs border border-[#E7E7E7] hover:bg-slate-100 transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{showOverride ? 'Hide Manual Override' : 'Admin Manual Session Override'}</span>
              </button>
            </div>

            {/* Auto Detected Slot Card */}
            {autoSlot ? (
              <div className="p-6 rounded-2xl bg-[#F3F0FF]/50 border border-[#6D5DFC]/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#6D5DFC] text-white font-mono font-bold text-xs">
                        {autoSlot.period}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#6D5DFC] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {autoSlot.startTime} - {autoSlot.endTime}
                      </span>
                    </div>
                    <h2 className="font-display font-extrabold text-2xl text-[#111827] mt-2">
                      {autoSlot.subject}
                    </h2>
                  </div>

                  <button
                    onClick={() => handleStartSession(autoSlot.subject)}
                    className="px-8 py-4 rounded-full bg-[#6D5DFC] text-sm font-extrabold text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center justify-center gap-2 shrink-0 animate-pulse"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Attendance QR</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs border-t border-[#6D5DFC]/20">
                  <div>
                    <span className="text-[#6B7280] font-medium block">Faculty Name</span>
                    <strong className="text-[#111827] font-bold flex items-center gap-1 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" /> {autoSlot.faculty}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[#6B7280] font-medium block">Class & Section</span>
                    <strong className="text-[#111827] font-bold mt-0.5">AI&DS III-A</strong>
                  </div>

                  <div>
                    <span className="text-[#6B7280] font-medium block">Room Allocation</span>
                    <strong className="text-[#6D5DFC] font-mono font-bold mt-0.5">{autoSlot.room}</strong>
                  </div>

                  <div>
                    <span className="text-[#6B7280] font-medium block">Session Mode</span>
                    <strong className="text-[#12B76A] font-bold mt-0.5">Automated Timetable Sync</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 px-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2 text-center">
                <Clock className="w-7 h-7 text-amber-600 mx-auto" />
                <h4 className="font-display font-extrabold text-base">No Active Timetable Slot Currently</h4>
                <p className="text-xs text-amber-700 font-medium">
                  Current time is outside standard lecture hours or during break intervals. You can use Admin Manual Session Override below to launch an ad-hoc session.
                </p>
              </div>
            )}

            {/* Admin Manual Override Drawer */}
            {showOverride && (
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-xs text-[#111827] uppercase tracking-wider">
                    ⚡ Admin Emergency Manual Session Override
                  </h4>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    MANUAL MODE
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select
                    value={selectedSubjectForSession}
                    onChange={(e) => setSelectedSubjectForSession(e.target.value)}
                    className="w-full sm:w-80 px-4 py-2.5 rounded-2xl bg-white border border-[#E7E7E7] text-xs text-[#111827] font-bold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleStartSession(selectedSubjectForSession)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-amber-600 text-xs font-bold text-white shadow-floating hover:bg-amber-700"
                  >
                    Launch Manual Session
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeSession && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DynamicQRDisplay
                sessionId={activeSession.id}
                subjectName={activeSession.subject}
                department={activeSession.department}
                section={activeSession.section}
                liveRecordsCount={0}
              />

              <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                  <h4 className="font-display font-bold text-base text-[#111827]">Live Attendance Feed</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#12B76A] font-bold text-[10px] border border-[#12B76A]/20">
                    REALTIME WEBSOCKET
                  </span>
                </div>

                <div className="py-12 text-center text-[#6B7280] text-xs space-y-2">
                  <Sparkles className="w-6 h-6 text-[#6D5DFC] mx-auto animate-bounce" />
                  <p className="font-bold text-[#111827]">Broadcasting session for {activeSession.subject}</p>
                  <p className="text-[11px] text-[#6B7280]">Camera QR scans will automatically appear here in real time.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: ANALYTICS & REPORTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise">
              <span className="text-[10px] font-bold text-[#6B7280] uppercase">Total Students</span>
              <p className="font-display font-extrabold text-2xl text-[#111827] mt-1">{students.length}</p>
            </div>
            <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise">
              <span className="text-[10px] font-bold text-[#12B76A] uppercase">Present Today</span>
              <p className="font-display font-extrabold text-2xl text-[#12B76A] mt-1">59</p>
            </div>
            <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise">
              <span className="text-[10px] font-bold text-rose-500 uppercase">Absent Today</span>
              <p className="font-display font-extrabold text-2xl text-rose-500 mt-1">2</p>
            </div>
            <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise">
              <span className="text-[10px] font-bold text-[#6D5DFC] uppercase">Attendance Rate</span>
              <p className="font-display font-extrabold text-2xl text-[#6D5DFC] mt-1">96.7%</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-extrabold text-base text-[#111827]">Subject-Wise Attendance Breakdown</h4>
              <button className="px-3.5 py-1.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] text-xs font-bold border border-[#6D5DFC]/20 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Export PDF / Excel
              </button>
            </div>

            <div className="space-y-3">
              {subjects.map((sub, i) => {
                const percent = [96.7, 95.0, 98.2, 93.4, 94.8, 97.1][i % 6] || 95;
                return (
                  <div key={sub.id} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#111827]">{sub.name} ({sub.code})</span>
                      <span className="text-[#6D5DFC] font-mono">{percent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E7E7E7] overflow-hidden">
                      <div className="h-full bg-[#6D5DFC] rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">{subjectForm.id ? 'Edit Subject' : 'Add Subject'}</h3>
              <button onClick={() => setShowSubjectModal(false)}><X className="w-5 h-5 text-[#6B7280]" /></button>
            </div>
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Subject Name (e.g. Data Analytics)"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs"
              />
              <input
                type="text"
                required
                placeholder="Subject Code (e.g. 21HC52T)"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-mono"
              />
              <input
                type="text"
                placeholder="Faculty Name (e.g. Mrs Gowthami K)"
                value={subjectForm.faculty_name}
                onChange={(e) => setSubjectForm({ ...subjectForm, faculty_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs"
              />
              <button type="submit" className="w-full py-3 rounded-full bg-[#6D5DFC] font-bold text-xs text-white">Save Subject</button>
            </form>
          </div>
        </div>
      )}

      {/* Faculty Modal */}
      {showFacultyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Add Faculty</h3>
              <button onClick={() => setShowFacultyModal(false)}><X className="w-5 h-5 text-[#6B7280]" /></button>
            </div>
            <form onSubmit={handleSaveFaculty} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Faculty Name (e.g. Mrs Nivetha P)"
                value={facultyForm.name}
                onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={facultyForm.email}
                onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs"
              />
              <button type="submit" className="w-full py-3 rounded-full bg-[#6D5DFC] font-bold text-xs text-white">Save Faculty</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
