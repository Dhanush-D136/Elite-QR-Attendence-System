import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { User } from '../types';
import * as XLSX from 'xlsx';
import { UserPlus, FileSpreadsheet, Download, Search, Trash2, X, Check, Upload, Smartphone, Sparkles, Edit } from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [editingStudent, setEditingStudent] = useState<{
    id: string;
    name: string;
    roll_number: string;
    email: string;
    department: string;
    year: string;
    section: string;
    phone: string;
    new_password?: string;
  } | null>(null);

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    name: '',
    roll_number: '',
    email: '',
    department: 'Computer Science',
    year: '3',
    section: 'A',
    phone: '',
    profile_photo: ''
  });

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (department) params.append('department', department);
      if (year) params.append('year', year);
      if (section) params.append('section', section);

      const res = await api.get(`/students?${params.toString()}`);
      setStudents(res.data.students);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, department, year, section]);

  // Handle Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/students', newStudent);
      setShowAddModal(false);
      setNewStudent({
        name: '',
        roll_number: '',
        email: '',
        department: 'Computer Science',
        year: '3',
        section: 'A',
        phone: '',
        profile_photo: ''
      });
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add student');
    }
  };

  // Open Edit Modal
  const openEditModal = (st: User) => {
    setEditingStudent({
      id: st.id,
      name: st.name,
      roll_number: st.roll_number,
      email: st.email,
      department: st.department || 'Computer Science',
      year: String(st.year || 3),
      section: st.section || 'A',
      phone: st.phone || '',
      new_password: ''
    });
    setShowEditModal(true);
  };

  // Handle Submit Edit Student
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await api.put(`/students/${editingStudent.id}`, editingStudent);
      alert('✅ Student details updated successfully');
      setShowEditModal(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to update student'}`);
    }
  };

  // Handle Delete Student
  const handleDeleteStudent = async (id: string) => {
    if (confirm('Are you sure you want to delete this student account?')) {
      try {
        await api.delete(`/students/${id}`);
        fetchStudents();
      } catch (err) {
        alert('Failed to delete student');
      }
    }
  };

  // Handle Excel Bulk Import Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('Excel file is empty!');
          return;
        }

        const res = await api.post('/students/bulk-import', { students: data });
        alert(`Successfully imported ${res.data.importedCount} student accounts!`);
        setShowImportModal(false);
        fetchStudents();
      } catch (err) {
        alert('Error parsing Excel file. Please ensure correct template structure.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export Students to Excel
  const handleExportExcel = () => {
    const exportData = students.map((st) => ({
      Name: st.name,
      'Roll Number': st.roll_number,
      Email: st.email,
      Department: st.department,
      Year: st.year,
      Section: st.section,
      Phone: st.phone,
      'Attendance %': st.attendance_percentage !== null && st.attendance_percentage !== undefined ? `${st.attendance_percentage}%` : '--',
      Status: st.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `EliteMinds_Students_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Reset Device
  const handleResetDevice = async (studentId: string, name: string) => {
    if (!confirm(`Are you sure you want to reset registered hardware device for ${name}?`)) return;
    try {
      const res = await api.post(`/students/${studentId}/reset-device`);
      alert(`✅ ${res.data.message}`);
      fetchStudents();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to reset device'}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827]">Student Directory</h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">Manage enrolled student accounts, device bindings, and attendance stats</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-full bg-white border border-[#E7E7E7] text-xs font-bold text-[#111827] hover:bg-[#FAFAFA] transition-all flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#12B76A]" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-full bg-white border border-[#E7E7E7] text-xs font-bold text-[#111827] hover:bg-[#FAFAFA] transition-all flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4 text-[#4F7CFF]" />
            <span>Export XLSX</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-2 active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by student name, roll no, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#9CA3AF] pl-9 focus:outline-none focus:border-[#6D5DFC] focus:bg-white font-medium"
          />
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] focus:outline-none focus:border-[#6D5DFC] font-medium"
          >
            <option value="">All Departments</option>
            <option value="AI & Data Science">AI & Data Science</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] focus:outline-none focus:border-[#6D5DFC] font-medium"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] focus:outline-none focus:border-[#6D5DFC] font-medium"
          >
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] tracking-wider sticky top-0 font-bold">
              <tr>
                <th className="p-4">Student Profile</th>
                <th className="p-4">Roll Number</th>
                <th className="p-4">Department</th>
                <th className="p-4">Class</th>
                <th className="p-4">Attendance %</th>
                <th className="p-4">Device Binding</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E7]">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-[#6B7280]">
                    No student records found matching your active filters.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt=""
                        className="w-8 h-8 rounded-full border border-[#E7E7E7] object-cover"
                      />
                      <div>
                        <p className="font-bold text-[#111827]">{st.name}</p>
                        <p className="text-[10px] text-[#6B7280] font-medium">{st.email}</p>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[#6D5DFC] font-bold">{st.roll_number}</td>
                    <td className="p-4 text-[#111827] font-medium">{st.department}</td>
                    <td className="p-4 text-[#6B7280]">Yr {st.year} • Sec {st.section}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${
                          (st.attendance_percentage || 100) >= 75 ? 'text-[#12B76A]' : 'text-rose-600'
                        }`}>
                          {st.attendance_percentage}%
                        </span>
                        <div className="w-16 bg-[#FAFAFA] rounded-full h-1.5 overflow-hidden border border-[#E7E7E7]">
                          <div
                            className={`h-full rounded-full ${
                              (st.attendance_percentage || 100) >= 75 ? 'bg-[#12B76A]' : 'bg-rose-500'
                            }`}
                            style={{ width: `${st.attendance_percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[10px]">
                      {st.device_fingerprint ? (
                        <span className="text-[#12B76A] flex items-center gap-1 font-bold">
                          <Check className="w-3.5 h-3.5" /> Bound ({st.device_fingerprint.substring(0, 8)}...)
                        </span>
                      ) : (
                        <span className="text-amber-500 font-semibold">Unbound</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                        st.must_change_password === 1
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                      }`}>
                        {st.must_change_password === 1 ? 'Pending Reset' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(st)}
                          className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1"
                          title="Edit student details"
                        >
                          <Edit className="w-3 h-3 text-blue-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleResetDevice(st.id, st.name)}
                          className="px-2.5 py-1 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[10px] font-bold text-[#6D5DFC] hover:bg-[#6D5DFC]/10 transition-colors flex items-center gap-1"
                          title="Reset hardware device binding"
                        >
                          <Smartphone className="w-3 h-3 text-[#6D5DFC]" />
                          <span>Reset Device</span>
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st.id)}
                          className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Student"
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Add New Student Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="e.g. Jordan Miller"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={newStudent.roll_number}
                    onChange={(e) => setNewStudent({ ...newStudent, roll_number: e.target.value })}
                    placeholder="CS202606"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    placeholder="student@univ.edu"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Department</label>
                  <select
                    value={newStudent.department}
                    onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Year</label>
                  <select
                    value={newStudent.year}
                    onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Section</label>
                  <select
                    value={newStudent.section}
                    onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[11px] text-[#6D5DFC] font-medium">
                Default initial password is <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#6D5DFC]/30 font-bold">1234</code>. Password change is enforced on first login.
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0]"
              >
                Create Student Account
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Edit Student Information</h3>
              <button onClick={() => setShowEditModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.roll_number}
                    onChange={(e) => setEditingStudent({ ...editingStudent, roll_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Department</label>
                  <select
                    value={editingStudent.department}
                    onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Year</label>
                  <select
                    value={editingStudent.year}
                    onChange={(e) => setEditingStudent({ ...editingStudent, year: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Section</label>
                  <select
                    value={editingStudent.section}
                    onChange={(e) => setEditingStudent({ ...editingStudent, section: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingStudent.phone}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  placeholder="+1-555-0199"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave empty to keep current password"
                  value={editingStudent.new_password || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, new_password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] mt-2"
              >
                Save Updated Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Bulk Import Students</h3>
              <button onClick={() => setShowImportModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 border-2 border-dashed border-[#E7E7E7] hover:border-[#12B76A] rounded-2xl bg-[#FAFAFA] transition-colors space-y-3">
              <Upload className="w-10 h-10 text-[#12B76A] mx-auto animate-bounce" />
              <p className="text-xs text-[#111827] font-bold">Upload Excel File (.xlsx / .csv)</p>
              <p className="text-[10px] text-[#6B7280]">Columns: name, roll_number, email, department, year, section</p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="block w-full text-xs text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#ECFDF5] file:text-[#12B76A]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
