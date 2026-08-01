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
  X
} from 'lucide-react';

export const FacultyManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'activity' | 'passwords'>('directory');

  // Stats & Faculty List
  const [stats, setStats] = useState<any>({
    totalFaculty: 2,
    activeFaculty: 2,
    inactiveFaculty: 0,
    defaultPasswordCount: 2,
    customPasswordCount: 0,
    loggedInToday: 2,
    activeClassesCount: 1
  });

  const [faculties, setFaculties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);

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
  const [newPassword, setNewPassword] = useState<string>('1234');

  useEffect(() => {
    fetchFacultyManagementData();
  }, []);

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

  // Add Faculty
  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
        password: '1234'
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
      await api.put(`/admin/faculty-management/faculties/${selectedFaculty.id}`, {
        name: facultyName,
        email: facultyEmail,
        department: facultyDept,
        designation: facultyDesig,
        phone: facultyPhone,
        qualification: facultyQual,
        experience: facultyExp,
        specialization: facultySpec
      });
      alert(`✅ Faculty details updated successfully for ${facultyName}!`);
      setShowEditModal(false);
      fetchFacultyManagementData();
    } catch (err: any) {
      alert('Failed to update faculty details');
    }
  };

  // Reset Password (Default 1234)
  const handleResetPassword = async () => {
    if (!selectedFaculty) return;
    try {
      await api.post(`/admin/faculty-management/faculties/${selectedFaculty.id}/reset-password`, {
        new_password: newPassword || '1234'
      });
      alert(`✅ Password for ${selectedFaculty.name} reset to '${newPassword || '1234'}' successfully!`);
      setShowResetModal(false);
      fetchFacultyManagementData();
    } catch (err: any) {
      alert('Failed to reset password');
    }
  };

  // Delete Faculty
  const handleDeleteFaculty = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Faculty account '${name}'? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/faculty-management/faculties/${id}`);
      alert(`✅ Faculty account '${name}' deleted successfully.`);
      fetchFacultyManagementData();
    } catch (err) {
      alert('Failed to delete faculty account');
    }
  };

  // Export Faculty List to Excel
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
      'Account Status': f.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty Roster');
    XLSX.writeFile(wb, `Faculty_Roster_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const resetForm = () => {
    setFacultyCode('');
    setFacultyName('');
    setFacultyEmail('');
    setFacultyPhone('+91 9876501234');
    setFacultyQual('M.Tech (AI & DS)');
    setFacultyExp('6 Years Teaching');
    setFacultySpec('AI & Web Security');
    setSelectedFaculty(null);
  };

  const openEditModal = (fac: any) => {
    setSelectedFaculty(fac);
    setFacultyCode(fac.faculty_code);
    setFacultyName(fac.name);
    setFacultyEmail(fac.email);
    setFacultyDept(fac.department || 'AI & Data Science');
    setFacultyDesig(fac.designation || 'Assistant Professor');
    setFacultyPhone(fac.phone || '');
    setFacultyQual(fac.qualification || '');
    setFacultyExp(fac.experience || '');
    setFacultySpec(fac.specialization || '');
    setShowEditModal(true);
  };

  const filteredFaculties = faculties.filter((f: any) => {
    const matchSearch =
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.faculty_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = selectedDept === 'All' || f.department === selectedDept;
    const matchStatus = selectedStatus === 'All' || f.password_status === selectedStatus;
    return matchSearch && matchDept && matchStatus;
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
            Complete CRUD administration, faculty roster management, and password control center
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
            <Plus className="w-4 h-4" /> Add Faculty
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
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">INACTIVE</span>
          <strong className="text-2xl font-extrabold text-rose-600 block mt-1">{stats.inactiveFaculty}</strong>
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

      {/* TAB SWITCHER BAR */}
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
          <BookOpen className="w-4 h-4" /> Faculty Login Activity
        </button>
        <button
          onClick={() => setActiveSubTab('passwords')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'passwords' ? 'bg-[#111827] text-white shadow-md' : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Key className="w-4 h-4" /> Password Control & Audit Logs
        </button>
      </div>

      {/* FILTER & SEARCH CONTROL TOOLBAR */}
      <div className="p-4 rounded-[24px] bg-white border border-[#E7E7E7] shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-bold text-[#111827]"
          >
            <option value="All">All Password Status</option>
            <option value="Default Password">Default Password</option>
            <option value="Custom Password">Custom Password</option>
          </select>
        </div>
      </div>

      {/* MAIN FACULTY DIRECTORY TABLE */}
      {activeSubTab === 'directory' && (
        <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-[#6B7280]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6D5DFC] mb-2" />
              <p className="font-bold text-sm">Loading Faculty Roster...</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-4 w-8"><input type="checkbox" className="rounded border-gray-300" /></th>
                  <th className="p-4">Faculty Profile</th>
                  <th className="p-4">Faculty Code</th>
                  <th className="p-4">Department & Designation</th>
                  <th className="p-4">Phone Contact</th>
                  <th className="p-4">Assigned Subjects</th>
                  <th className="p-4">Password Status</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7]">
                {filteredFaculties.map((fac: any) => (
                  <tr key={fac.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-4"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={fac.profile_photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'} alt="" className="w-10 h-10 rounded-full object-cover border border-[#E7E7E7]" />
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
                    <td className="p-4 font-mono text-[#111827]">{fac.phone || '+91 9876501234'}</td>
                    <td className="p-4">
                      <span className="text-[11px] text-[#111827] font-medium block">
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
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20">
                        ACTIVE
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setSelectedFaculty(fac); setShowViewModal(true); }}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(fac)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600"
                          title="Edit Faculty"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSelectedFaculty(fac); setNewPassword('1234'); setShowResetModal(true); }}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600"
                          title="Reset Password (1234)"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFaculty(fac.id, fac.name)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                          title="Delete Faculty"
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

      {/* MODAL: ADD FACULTY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
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
                    placeholder="e.g. FAC003"
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

              <div>
                <label className="block text-[11px] font-bold text-[#111827] mb-1">Official Email ID</label>
                <input
                  type="email"
                  value={facultyEmail}
                  onChange={(e) => setFacultyEmail(e.target.value)}
                  placeholder="Auto-generated: fac003@velhightech.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="p-3 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[11px] text-[#6D5DFC] font-bold">
                🔑 Default password for new faculty accounts is set to <strong>1234</strong> (same as student accounts).
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

      {/* MODAL: RESET PASSWORD */}
      {showResetModal && selectedFaculty && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <h4 className="font-bold text-[#111827]">Reset Password for {selectedFaculty.name} ({selectedFaculty.faculty_code})</h4>
            <p className="text-xs text-[#6B7280]">
              Single-click reset to default password <strong>1234</strong> or enter a custom password below.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-[#111827] mb-1">New Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-mono text-xs text-[#111827]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                className="px-5 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-md"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
