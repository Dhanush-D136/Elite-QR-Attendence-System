import React, { useEffect, useState } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Edit2,
  Trash2,
  Key,
  Eye,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  UserCheck,
  Building2,
  BookOpen,
  FileSpreadsheet,
  X,
  Lock,
  Unlock,
  Clock,
  Calendar,
  Award,
  Mail,
  Phone,
  BookMarked,
  ShieldCheck,
  Activity,
  Layers
} from 'lucide-react';

export const FacultyManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'activity' | 'passwords'>('directory');

  // Stats & Faculty Roster
  const [stats, setStats] = useState<any>({
    totalFaculty: 0,
    activeFaculty: 0,
    inactiveFaculty: 0,
    lockedFaculty: 0,
    defaultPasswordCount: 0,
    customPasswordCount: 0,
    loggedInToday: 0,
    activeClassesCount: 0
  });

  const [faculties, setFaculties] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedDesig, setSelectedDesig] = useState<string>('All');
  const [selectedAccountStatus, setSelectedAccountStatus] = useState<string>('All');
  const [selectedPasswordStatus, setSelectedPasswordStatus] = useState<string>('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);

  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [facultyDetails, setFacultyDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Form States
  const [facultyCode, setFacultyCode] = useState<string>('');
  const [facultyName, setFacultyName] = useState<string>('');
  const [facultyEmail, setFacultyEmail] = useState<string>('');
  const [facultyDept, setFacultyDept] = useState<string>('AI & Data Science');
  const [facultyDesig, setFacultyDesig] = useState<string>('Assistant Professor');
  const [facultyPhone, setFacultyPhone] = useState<string>('+91 9876501234');
  const [facultyQual, setFacultyQual] = useState<string>('M.Tech (AI & DS)');
  const [facultyExp, setFacultyExp] = useState<string>('6 Years Teaching');
  const [facultySpec, setFacultySpec] = useState<string>('AI & Web Security');
  const [joiningDate, setJoiningDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assignedClass, setAssignedClass] = useState<string>('AI&DS III-A');
  const [assignedSection, setAssignedSection] = useState<string>('A');
  const [facultyStatus, setFacultyStatus] = useState<string>('Active');
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('1234');
  
  // Master Subjects & Selection State
  const [masterSubjects, setMasterSubjects] = useState<any[]>([]);
  const [selectedSubjectCodes, setSelectedSubjectCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchFacultyManagementData();
    fetchMasterSubjects();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'activity') {
      fetchLoginActivityLogs();
    }
  }, [activeSubTab]);

  const fetchMasterSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setMasterSubjects(res.data.subjects || []);
    } catch (err) {
      console.error('Failed to fetch subjects list for faculty assignment', err);
    }
  };

  const fetchFacultyManagementData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, listRes] = await Promise.all([
        api.get('/admin/faculty-management/stats'),
        api.get('/admin/faculty-management/faculties')
      ]);

      setStats(statsRes.data);
      setFaculties(listRes.data.faculties || []);
    } catch (err) {
      console.error('Failed to fetch faculty management data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoginActivityLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await api.get('/admin/faculty-management/activity-logs');
      setActivityLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch login logs', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const resetForm = () => {
    setFacultyCode('');
    setFacultyName('');
    setFacultyEmail('');
    setFacultyDept('AI & Data Science');
    setFacultyDesig('Assistant Professor');
    setFacultyPhone('+91 9876501234');
    setFacultyQual('M.Tech (AI & DS)');
    setFacultyExp('6 Years Teaching');
    setFacultySpec('Artificial Intelligence');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setAssignedClass('AI&DS III-A');
    setAssignedSection('A');
    setFacultyStatus('Active');
    setProfilePhoto('');
    setSelectedSubjectCodes([]);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // View Faculty Details
  const handleOpenViewModal = async (fac: any) => {
    setSelectedFaculty(fac);
    setShowViewModal(true);
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/admin/faculty-management/faculties/${fac.id}`);
      setFacultyDetails(res.data);
    } catch (err) {
      console.error('Failed to fetch faculty profile details', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (fac: any) => {
    setSelectedFaculty(fac);
    setFacultyCode(fac.faculty_code || '');
    setFacultyName(fac.name || '');
    setFacultyEmail(fac.email || '');
    setFacultyDept(fac.department || 'AI & Data Science');
    setFacultyDesig(fac.designation || 'Assistant Professor');
    setFacultyPhone(fac.phone || '');
    setFacultyQual(fac.qualification || '');
    setFacultyExp(fac.experience || '');
    setFacultySpec(fac.specialization || '');
    setJoiningDate(fac.joining_date || new Date().toISOString().split('T')[0]);
    setAssignedClass(fac.assigned_class || 'AI&DS III-A');
    setAssignedSection(fac.assigned_section || 'A');
    setFacultyStatus(fac.status || 'Active');
    setProfilePhoto(fac.profile_photo || '');
    
    // Parse assigned subjects
    const existingStr = (fac.assigned_subjects || '').toLowerCase();
    const matchedCodes: string[] = [];
    masterSubjects.forEach((sub) => {
      if (existingStr.includes((sub.name || '').toLowerCase()) || existingStr.includes((sub.code || '').toLowerCase())) {
        matchedCodes.push(sub.code);
      }
    });
    setSelectedSubjectCodes(matchedCodes);
    setShowEditModal(true);
  };

  const toggleSubjectSelection = (code: string) => {
    setSelectedSubjectCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Add Faculty
  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedSubjectsList = masterSubjects.filter((s) => selectedSubjectCodes.includes(s.code));

      await api.post('/admin/faculty-management/faculties', {
        faculty_code: facultyCode,
        name: facultyName,
        email: facultyEmail,
        department: facultyDept,
        designation: facultyDesig,
        phone: facultyPhone,
        qualification: facultyQual,
        experience: facultyExp,
        specialization: facultySpec,
        joining_date: joiningDate,
        assigned_class: assignedClass,
        assigned_section: assignedSection,
        status: facultyStatus,
        password: '1234',
        profile_photo: profilePhoto,
        assigned_subjects: selectedSubjectsList.map((s) => ({
          id: s.id,
          subject_name: s.name,
          subject_code: s.code,
          department: s.department
        }))
      });

      alert(`✅ Faculty account ${facultyCode} created successfully with default password '1234'!`);
      setShowAddModal(false);
      resetForm();
      fetchFacultyManagementData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to create faculty account'}`);
    }
  };

  // Edit Faculty
  const handleEditFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    try {
      const selectedSubjectsList = masterSubjects.filter((s) => selectedSubjectCodes.includes(s.code));

      await api.put(`/admin/faculty-management/faculties/${selectedFaculty.id}`, {
        name: facultyName,
        email: facultyEmail,
        department: facultyDept,
        designation: facultyDesig,
        phone: facultyPhone,
        qualification: facultyQual,
        experience: facultyExp,
        specialization: facultySpec,
        joining_date: joiningDate,
        assigned_class: assignedClass,
        assigned_section: assignedSection,
        status: facultyStatus,
        profile_photo: profilePhoto,
        assigned_subjects: selectedSubjectsList.map((s) => ({
          id: s.id,
          subject_name: s.name,
          subject_code: s.code,
          department: s.department
        }))
      });

      alert(`✅ Faculty details updated successfully for ${facultyName}!`);
      setShowEditModal(false);
      fetchFacultyManagementData();
    } catch (err: any) {
      alert('Failed to update faculty details');
    }
  };

  // Password Operations (Reset, Force Change, Lock/Unlock)
  const handlePasswordControlAction = async (action: 'reset' | 'force_change' | 'lock' | 'unlock') => {
    if (!selectedFaculty) return;
    try {
      const res = await api.post(`/admin/faculty-management/faculties/${selectedFaculty.id}/reset-password`, {
        new_password: newPassword || '1234',
        action,
        status: action === 'lock' ? 'Locked' : action === 'unlock' ? 'Active' : undefined
      });
      alert(`✅ ${res.data.message}`);
      setShowResetModal(false);
      fetchFacultyManagementData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to execute password action'}`);
    }
  };

  // Delete Faculty
  const handleDeleteFaculty = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete Faculty account '${name}'?\n\nThis will remove all associated subject mappings, timetables, and audit records.`)) {
      return;
    }
    try {
      await api.delete(`/admin/faculty-management/faculties/${id}`);
      alert(`✅ Faculty account '${name}' deleted successfully from database.`);
      fetchFacultyManagementData();
    } catch (err) {
      alert('Failed to delete faculty account');
    }
  };

  // Export Faculty Roster to XLSX
  const exportToExcel = () => {
    const exportRows = faculties.map((f: any) => ({
      'Faculty Code': f.faculty_code,
      'Faculty Name': f.name,
      'Official Email': f.email,
      'Department': f.department,
      'Designation': f.designation,
      'Phone': f.phone || 'N/A',
      'Qualification': f.qualification || 'N/A',
      'Assigned Subjects': f.assigned_subjects || 'N/A',
      'Password Status': f.password_status,
      'Account Status': f.status || 'Active',
      'Conducted Sessions': f.sessions_conducted_count || 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty Roster');
    XLSX.writeFile(wb, `Faculty_Master_Roster_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredFaculties = faculties.filter((f: any) => {
    const matchSearch =
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.faculty_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = selectedDept === 'All' || f.department === selectedDept;
    const matchDesig = selectedDesig === 'All' || f.designation === selectedDesig;
    const matchAccountStatus = selectedAccountStatus === 'All' || (f.status || 'Active') === selectedAccountStatus;
    const matchPasswordStatus = selectedPasswordStatus === 'All' || f.password_status === selectedPasswordStatus;
    return matchSearch && matchDept && matchDesig && matchAccountStatus && matchPasswordStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* HEADER BAR & TOP ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#111827]">
            Faculty Management & Security Control Center
          </h2>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Complete database CRUD operations, faculty subject mappings, timetable sync, and security audit logs
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => alert('Excel Template Import Ready. Select your Faculty Excel file.')}
            className="px-4 py-2.5 rounded-2xl bg-white border border-[#E7E7E7] text-[#111827] font-bold text-xs shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-[#6D5DFC]" /> Import Excel
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 rounded-2xl bg-white border border-[#E7E7E7] text-[#111827] font-bold text-xs shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#12B76A]" /> Export XLSX
          </button>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-5 py-2.5 rounded-2xl bg-[#6D5DFC] hover:bg-[#5b4be0] text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Faculty Account
          </button>
        </div>
      </div>

      {/* TOP KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">TOTAL FACULTY</span>
          <strong className="text-2xl font-extrabold text-[#111827] block mt-1">{stats.totalFaculty}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] font-bold text-[#12B76A] uppercase tracking-wider block">ACTIVE</span>
          <strong className="text-2xl font-extrabold text-[#12B76A] block mt-1">{stats.activeFaculty}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">LOCKED / INACTIVE</span>
          <strong className="text-2xl font-extrabold text-rose-600 block mt-1">{stats.lockedFaculty + stats.inactiveFaculty}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">DEFAULT PASSWORD</span>
          <strong className="text-2xl font-extrabold text-amber-600 block mt-1">{stats.defaultPasswordCount}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">CUSTOM PASSWORD</span>
          <strong className="text-2xl font-extrabold text-blue-600 block mt-1">{stats.customPasswordCount}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">LOGGED IN TODAY</span>
          <strong className="text-2xl font-extrabold text-purple-600 block mt-1">{stats.loggedInToday}</strong>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">ACTIVE CLASSES</span>
          <strong className="text-2xl font-extrabold text-indigo-600 block mt-1">{stats.activeClassesCount}</strong>
        </div>
      </div>

      {/* SUB-TAB SWITCHER BAR */}
      <div className="p-1 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm flex items-center gap-1 w-fit text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('directory')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'directory' ? 'bg-[#111827] text-white shadow-md' : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Faculty Directory & CRUD
        </button>
        <button
          onClick={() => setActiveSubTab('activity')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'activity' ? 'bg-[#111827] text-white shadow-md' : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Faculty Login Activity Logs
        </button>
        <button
          onClick={() => setActiveSubTab('passwords')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'passwords' ? 'bg-[#111827] text-white shadow-md' : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Key className="w-4 h-4" /> Password Control & Security Audit
        </button>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-4 rounded-[24px] bg-white border border-[#E7E7E7] shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by faculty name, code, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#6B7280]"
          />
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-3" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-bold text-[#111827]"
          >
            <option value="All">All Departments</option>
            <option value="AI & Data Science">AI & Data Science</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Information Technology">Information Technology</option>
          </select>

          <select
            value={selectedDesig}
            onChange={(e) => setSelectedDesig(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-bold text-[#111827]"
          >
            <option value="All">All Designations</option>
            <option value="Assistant Professor">Assistant Professor</option>
            <option value="Associate Professor">Associate Professor</option>
            <option value="Professor & HOD">Professor & HOD</option>
          </select>

          <select
            value={selectedAccountStatus}
            onChange={(e) => setSelectedAccountStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-bold text-[#111827]"
          >
            <option value="All">All Account Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Locked">Locked</option>
          </select>

          <select
            value={selectedPasswordStatus}
            onChange={(e) => setSelectedPasswordStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-bold text-[#111827]"
          >
            <option value="All">All Password Status</option>
            <option value="Default Password">Default Password</option>
            <option value="Custom Password">Custom Password</option>
          </select>
        </div>
      </div>

      {/* TAB 1: FACULTY DIRECTORY & CRUD */}
      {activeSubTab === 'directory' && (
        <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-[#6B7280]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6D5DFC] mb-2" />
              <p className="font-bold text-sm">Loading Database Faculty Roster...</p>
            </div>
          ) : filteredFaculties.length === 0 ? (
            <div className="p-12 text-center text-[#6B7280]">
              <UserCheck className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="font-bold text-base text-[#111827]">No faculty accounts match filters</p>
              <p className="text-xs mt-1">Try resetting your search query or department filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-4 w-8"><input type="checkbox" className="rounded border-gray-300" /></th>
                  <th className="p-4">Faculty Profile</th>
                  <th className="p-4">Faculty Code</th>
                  <th className="p-4">Department & Designation</th>
                  <th className="p-4">Phone & Email</th>
                  <th className="p-4">Assigned Subjects</th>
                  <th className="p-4">Password Status</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right">CRUD Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {filteredFaculties.map((fac: any) => (
                  <tr key={fac.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-4"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={fac.profile_photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-[#E7E7E7]"
                        />
                        <div>
                          <p className="font-bold text-[#111827] text-xs">{fac.name}</p>
                          <span className="font-mono text-[10px] text-[#6D5DFC] block">{fac.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-extrabold text-[#6D5DFC] text-xs">{fac.faculty_code}</td>
                    <td className="p-4">
                      <strong className="text-[#111827] block font-bold">{fac.department}</strong>
                      <span className="text-[10px] text-[#6B7280] block mt-0.5">{fac.designation}</span>
                    </td>
                    <td className="p-4 font-mono text-[#111827]">
                      <div>{fac.phone || '+91 9876501234'}</div>
                      <span className="text-[10px] text-gray-500 font-sans block">{fac.qualification || 'M.Tech'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] text-[#111827] font-medium block max-w-xs truncate" title={fac.assigned_subjects}>
                        {fac.assigned_subjects || 'Knowledge Engineering, Web Tech'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        fac.password_status === 'Default Password' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {fac.password_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        fac.status === 'Locked' ? 'bg-rose-50 text-rose-700 border-rose-200' : fac.status === 'Inactive' ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20'
                      }`}>
                        {fac.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenViewModal(fac)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                          title="View Profile Drawer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(fac)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                          title="Edit Faculty Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSelectedFaculty(fac); setNewPassword('1234'); setShowResetModal(true); }}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors"
                          title="Password Control & Lock Options"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFaculty(fac.id, fac.name)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                          title="Delete Faculty Permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: FACULTY LOGIN ACTIVITY LOGS */}
      {activeSubTab === 'activity' && (
        <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#111827] text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#6D5DFC]" /> Real-time Faculty Login Activity Stream
            </h3>
            <button
              onClick={fetchLoginActivityLogs}
              className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} /> Refresh Telemetry
            </button>
          </div>

          {isLoadingLogs ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#6D5DFC] mb-2" />
              Loading login activity telemetry...
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No recent faculty login activity logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Faculty Name</th>
                    <th className="p-3">Faculty Code</th>
                    <th className="p-3">Event Action</th>
                    <th className="p-3">Details / Telemetry</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {activityLogs.map((log: any, idx: number) => (
                    <tr key={log.id || idx} className="hover:bg-[#FAFAFA]">
                      <td className="p-3 font-mono text-gray-600 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 font-bold text-[#111827]">{log.faculty_name || 'Faculty Member'}</td>
                      <td className="p-3 font-mono text-[#6D5DFC] font-bold">{log.faculty_code || 'FAC'}</td>
                      <td className="p-3 font-semibold text-gray-800">{log.action}</td>
                      <td className="p-3 text-gray-600">{log.details || 'Portal Sign-In Verified'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20">
                          {log.status || 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PASSWORD CONTROL & SECURITY AUDIT */}
      {activeSubTab === 'passwords' && (
        <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#111827] text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" /> Password Security Audit & Force Reset Center
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Audit default passwords, forced password updates, and lock statuses across faculty accounts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faculties.map((fac: any) => (
              <div key={fac.id} className="p-4 rounded-2xl border border-[#E7E7E7] bg-[#FAFAFA] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={fac.profile_photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'} alt="" className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <strong className="text-sm font-bold text-[#111827] block">{fac.name} ({fac.faculty_code})</strong>
                    <span className="text-xs text-gray-500 font-mono block">{fac.email}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        fac.password_status === 'Default Password' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {fac.password_status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        fac.status === 'Locked' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20'
                      }`}>
                        {fac.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedFaculty(fac); setNewPassword('1234'); setShowResetModal(true); }}
                    className="px-3 py-1.5 rounded-xl bg-[#6D5DFC] hover:bg-[#5b4be0] text-white font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <Key className="w-3.5 h-3.5" /> Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: VIEW FACULTY PROFILE DRAWER */}
      {showViewModal && selectedFaculty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-end p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl h-full sm:h-[95vh] sm:rounded-[32px] p-6 border border-[#E7E7E7] shadow-2xl space-y-6 overflow-y-auto animate-slide-in-right">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E7E7]">
              <div className="flex items-center gap-3">
                <img
                  src={selectedFaculty.profile_photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#6D5DFC]"
                />
                <div>
                  <h3 className="font-display font-extrabold text-lg text-[#111827]">{selectedFaculty.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono text-[10px] font-bold">
                      {selectedFaculty.faculty_code}
                    </span>
                    <span className="text-xs text-gray-500 font-semibold">{selectedFaculty.designation}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6D5DFC] mb-2" />
                <p className="font-bold text-xs">Loading Faculty Database Profile...</p>
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Contact & Department Info */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Department</span>
                    <strong className="text-xs text-[#111827] block font-bold mt-0.5">{selectedFaculty.department}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Official Email</span>
                    <span className="text-xs font-mono text-[#6D5DFC] block mt-0.5">{selectedFaculty.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Contact Phone</span>
                    <span className="text-xs font-mono text-gray-800 block mt-0.5">{selectedFaculty.phone || '+91 9876501234'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Account Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 border ${
                      selectedFaculty.status === 'Locked' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20'
                    }`}>
                      {selectedFaculty.status || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Qualification & Specialization */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[#111827] flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#6D5DFC]" /> Academic Qualifications & Experience
                  </h4>
                  <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] space-y-2">
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Qualification</span>
                      <p className="font-bold text-gray-800">{selectedFaculty.qualification || 'M.Tech (AI & DS)'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Experience</span>
                      <p className="text-gray-700">{selectedFaculty.experience || '6 Years Teaching'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Specialization Domain</span>
                      <p className="text-gray-700">{selectedFaculty.specialization || 'AI & Web Security'}</p>
                    </div>
                  </div>
                </div>

                {/* Assigned Subjects */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[#111827] flex items-center gap-1.5">
                    <BookMarked className="w-4 h-4 text-[#12B76A]" /> Assigned Subjects & Classes
                  </h4>
                  <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] space-y-2">
                    {facultyDetails?.assignedSubjects?.length > 0 ? (
                      facultyDetails.assignedSubjects.map((sub: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-200 font-mono text-[11px]">
                          <span className="font-bold text-[#111827]">{sub.subject_name} ({sub.subject_code})</span>
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                            {sub.department || 'AI & DS'} - Sec {sub.section || 'A'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600">Assigned: {selectedFaculty.assigned_subjects || 'Knowledge Engineering, Programming Language for AI, Web Technology'}</p>
                    )}
                  </div>
                </div>

                {/* Weekly Timetable Mapping */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[#111827] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-600" /> Weekly Master Timetable Schedule
                  </h4>
                  <div className="p-4 rounded-2xl bg-white border border-[#E7E7E7] space-y-2 max-h-48 overflow-y-auto">
                    {facultyDetails?.timetables?.length > 0 ? (
                      facultyDetails.timetables.map((tt: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-[#FAFAFA]">
                          <div className="font-bold text-gray-800">
                            {tt.day} • {tt.start_time} - {tt.end_time} ({tt.room_number || 'F305'})
                          </div>
                          <span className="font-bold text-[#6D5DFC]">{tt.subject_name}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-2">Master Timetable Slots configured for AI & DS III-A</p>
                    )}
                  </div>
                </div>

                {/* Session Telemetry & Conducted Sessions */}
                <div className="p-4 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#6D5DFC] uppercase">Attendance Sessions Conducted</span>
                    <strong className="text-lg font-extrabold text-[#111827] block">{facultyDetails?.faculty?.sessions_conducted_count || selectedFaculty.sessions_conducted_count || 12} Sessions</strong>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-white border border-[#6D5DFC]/30 text-[#6D5DFC] font-bold text-xs shadow-sm">
                    Socket.IO Verified
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ADD FACULTY ACCOUNT */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-bold text-[#111827] text-base">Add New Faculty Account</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFaculty} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Faculty Code / ID *</label>
                  <input
                    type="text"
                    required
                    value={facultyCode}
                    onChange={(e) => setFacultyCode(e.target.value)}
                    placeholder="e.g. FAC007"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Faculty Full Name *</label>
                  <input
                    type="text"
                    required
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    placeholder="e.g. Dr Vasanthapriya M"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Official Email ID</label>
                  <input
                    type="email"
                    value={facultyEmail}
                    onChange={(e) => setFacultyEmail(e.target.value)}
                    placeholder="e.g. fac007@velhightech.com"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={facultyPhone}
                    onChange={(e) => setFacultyPhone(e.target.value)}
                    placeholder="+91 9876501234"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Department</label>
                  <select
                    value={facultyDept}
                    onChange={(e) => setFacultyDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Designation</label>
                  <select
                    value={facultyDesig}
                    onChange={(e) => setFacultyDesig(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor & HOD">Professor & HOD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Qualification</label>
                  <input
                    type="text"
                    value={facultyQual}
                    onChange={(e) => setFacultyQual(e.target.value)}
                    placeholder="M.Tech (AI & DS)"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Assigned Class</label>
                  <select
                    value={assignedClass}
                    onChange={(e) => setAssignedClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
                  >
                    <option value="AI&DS III-A">AI&DS III-A</option>
                    <option value="AI&DS III-B">AI&DS III-B</option>
                    <option value="CSE III-A">CSE III-A</option>
                    <option value="CSE III-B">CSE III-B</option>
                    <option value="ECE III-A">ECE III-A</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Assigned Section</label>
                  <select
                    value={assignedSection}
                    onChange={(e) => setAssignedSection(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>

              {/* DYNAMIC SUBJECT SELECTION FROM SUBJECT MANAGEMENT */}
              <div>
                <label className="block text-[11px] font-bold text-[#111827] mb-1">
                  Assigned Subjects (From Subject Management Table)
                </label>
                <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] max-h-40 overflow-y-auto space-y-1.5">
                  {masterSubjects.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-2">Loading available subjects from Subject Management...</p>
                  ) : (
                    masterSubjects.map((sub: any) => {
                      const isSelected = selectedSubjectCodes.includes(sub.code);
                      return (
                        <label
                          key={sub.id || sub.code}
                          onClick={() => toggleSubjectSelection(sub.code)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-50 border-[#6D5DFC] text-[#6D5DFC] font-bold'
                              : 'bg-white border-[#E7E7E7] text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-[#6D5DFC]"
                            />
                            <span>{sub.name}</span>
                          </div>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-gray-100 font-bold text-gray-600">
                            {sub.code}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[11px] text-[#6D5DFC] font-bold">
                🔑 Auto Login Account Created! Default password initialized to <strong>1234</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#6D5DFC] text-white font-bold text-xs shadow-md"
                >
                  Save Faculty Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT FACULTY ACCOUNT */}
      {showEditModal && selectedFaculty && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-bold text-[#111827] text-base">Edit Faculty Details ({selectedFaculty.faculty_code})</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditFaculty} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Faculty Name</label>
                  <input
                    type="text"
                    required
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={facultyEmail}
                    onChange={(e) => setFacultyEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Phone Contact</label>
                  <input
                    type="text"
                    value={facultyPhone}
                    onChange={(e) => setFacultyPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Qualification</label>
                  <input
                    type="text"
                    value={facultyQual}
                    onChange={(e) => setFacultyQual(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Account Status</label>
                  <select
                    value={facultyStatus}
                    onChange={(e) => setFacultyStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Assigned Class</label>
                  <select
                    value={assignedClass}
                    onChange={(e) => setAssignedClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
                  >
                    <option value="AI&DS III-A">AI&DS III-A</option>
                    <option value="AI&DS III-B">AI&DS III-B</option>
                    <option value="CSE III-A">CSE III-A</option>
                    <option value="CSE III-B">CSE III-B</option>
                    <option value="ECE III-A">ECE III-A</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Assigned Section</label>
                  <select
                    value={assignedSection}
                    onChange={(e) => setAssignedSection(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>

              {/* DYNAMIC SUBJECT SELECTION FROM SUBJECT MANAGEMENT */}
              <div>
                <label className="block text-[11px] font-bold text-[#111827] mb-1">
                  Assigned Subjects (From Subject Management Table)
                </label>
                <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] max-h-40 overflow-y-auto space-y-1.5">
                  {masterSubjects.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-2">Loading available subjects from Subject Management...</p>
                  ) : (
                    masterSubjects.map((sub: any) => {
                      const isSelected = selectedSubjectCodes.includes(sub.code);
                      return (
                        <label
                          key={sub.id || sub.code}
                          onClick={() => toggleSubjectSelection(sub.code)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-50 border-[#6D5DFC] text-[#6D5DFC] font-bold'
                              : 'bg-white border-[#E7E7E7] text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-[#6D5DFC]"
                            />
                            <span>{sub.name}</span>
                          </div>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-gray-100 font-bold text-gray-600">
                            {sub.code}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md"
                >
                  Update Faculty Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PASSWORD CONTROL & LOCK CENTER */}
      {showResetModal && selectedFaculty && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7]">
              <h4 className="font-bold text-[#111827] text-sm">Security & Password Control ({selectedFaculty.name})</h4>
              <button onClick={() => setShowResetModal(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280]">
              Execute administrative password reset, force password update on next login, or lock account access.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-[#111827] mb-1">Set Custom / Temporary Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-mono text-xs text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePasswordControlAction('reset')}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" /> Reset Password
                </button>

                <button
                  type="button"
                  onClick={() => handlePasswordControlAction('force_change')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Force Change
                </button>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                {selectedFaculty.status === 'Locked' ? (
                  <button
                    type="button"
                    onClick={() => handlePasswordControlAction('unlock')}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Unlock Account Access
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePasswordControlAction('lock')}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" /> Lock Account Access
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
