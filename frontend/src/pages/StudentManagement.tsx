import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { User } from '../types';
import * as XLSX from 'xlsx';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Trash2,
  X,
  Check,
  Upload,
  Smartphone,
  Sparkles,
  Edit,
  Eye,
  UserCheck,
  MapPin,
  Phone,
  Heart,
  Calendar,
  Shield,
  BookOpen,
  Mail,
  User as UserIcon
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [viewingStudent, setViewingStudent] = useState<User | null>(null);

  const [editingStudent, setEditingStudent] = useState<{
    id: string;
    name: string;
    roll_number: string;
    email: string;
    department: string;
    year: string;
    section: string;
    phone: string;
    profile_photo: string;
    dob: string;
    gender: string;
    blood_group: string;
    address: string;
    parent_name: string;
    parent_phone: string;
    bio: string;
    new_password?: string;
  } | null>(null);

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    name: '',
    roll_number: '',
    email: '',
    department: 'AI & Data Science',
    year: '3',
    section: 'A',
    phone: '',
    profile_photo: '',
    dob: '',
    gender: 'Male',
    blood_group: 'O+',
    address: '',
    parent_name: '',
    parent_phone: '',
    bio: ''
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
      setStudents(res.data.students || []);
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
      alert('✅ Student account created successfully!');
      setShowAddModal(false);
      setNewStudent({
        name: '',
        roll_number: '',
        email: '',
        department: 'AI & Data Science',
        year: '3',
        section: 'A',
        phone: '',
        profile_photo: '',
        dob: '',
        gender: 'Male',
        blood_group: 'O+',
        address: '',
        parent_name: '',
        parent_phone: '',
        bio: ''
      });
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add student');
    }
  };

  // Open View Details Modal
  const openViewModal = (st: User) => {
    setViewingStudent(st);
    setShowViewModal(true);
  };

  // Open Edit Modal
  const openEditModal = (st: User) => {
    setEditingStudent({
      id: st.id,
      name: st.name,
      roll_number: st.roll_number || '',
      email: st.email,
      department: st.department || 'AI & Data Science',
      year: String(st.year || 3),
      section: st.section || 'A',
      phone: st.phone || '',
      profile_photo: st.profile_photo || '',
      dob: st.dob || '',
      gender: st.gender || 'Male',
      blood_group: st.blood_group || 'O+',
      address: st.address || '',
      parent_name: st.parent_name || '',
      parent_phone: st.parent_phone || '',
      bio: st.bio || '',
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
        alert('✅ Student removed successfully');
        setShowViewModal(false);
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
      DOB: st.dob || 'N/A',
      Gender: st.gender || 'N/A',
      'Blood Group': st.blood_group || 'N/A',
      Address: st.address || 'N/A',
      'Parent Name': st.parent_name || 'N/A',
      'Parent Phone': st.parent_phone || 'N/A',
      'Attendance %': st.attendance_percentage !== null && st.attendance_percentage !== undefined ? `${st.attendance_percentage}%` : '--',
      Status: st.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `EliteMinds_Students_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Reset Hardware Device
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
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827]">Student Directory & CRUD Management</h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Create, view full profile details, edit student records, and manage hardware bindings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#6D5DFC] to-[#4F7CFF] text-xs font-extrabold text-white shadow-floating hover:from-[#5b4be0] hover:to-[#3b68ee] transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Student</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search student name, register no, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#9CA3AF] pl-9 focus:outline-none focus:border-[#6D5DFC] focus:bg-white font-medium"
          />
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
                <th className="p-4">Roll / Register No</th>
                <th className="p-4">Department & Class</th>
                <th className="p-4">Contact</th>
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
                        className="w-9 h-9 rounded-full border border-[#E7E7E7] object-cover shadow-sm"
                      />
                      <div>
                        <p className="font-bold text-[#111827]">{st.name}</p>
                        <p className="text-[10px] text-[#6B7280] font-medium">{st.email}</p>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[#6D5DFC] font-bold">{st.roll_number}</td>
                    <td className="p-4 text-[#111827] font-medium">
                      {st.department || 'AI & DS'} <br />
                      <span className="text-[10px] text-[#6B7280]">Yr {st.year || 3} • Sec {st.section || 'A'}</span>
                    </td>
                    <td className="p-4 text-[#6B7280] font-mono text-[11px]">{st.phone || 'N/A'}</td>
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
                          onClick={() => openViewModal(st)}
                          className="px-2.5 py-1 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[10px] font-bold text-[#6D5DFC] hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center gap-1"
                          title="View complete student details"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => openEditModal(st)}
                          className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1"
                          title="Edit student details"
                        >
                          <Edit className="w-3 h-3 text-blue-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteStudent(st.id)}
                          className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Student Account"
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

      {/* ================================================== */}
      {/* 1. VIEW STUDENT FULL PROFILE DETAILS MODAL */}
      {/* ================================================== */}
      {showViewModal && viewingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] p-6 sm:p-8 border border-[#E7E7E7] shadow-2xl space-y-6 animate-fade-in relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E7E7]">
              <div className="flex items-center gap-3">
                <img
                  src={viewingStudent.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt=""
                  className="w-14 h-14 rounded-full border-2 border-[#6D5DFC]/30 object-cover shadow-sm"
                />
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[#111827]">{viewingStudent.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 text-[10px] font-mono font-bold">
                    {viewingStudent.roll_number}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-9 h-9 rounded-full bg-[#FAFAFA] text-[#6B7280] hover:text-[#111827] flex items-center justify-center border border-[#E7E7E7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Detail Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Academic Info */}
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
                <span className="text-[10px] font-bold text-[#6D5DFC] uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Academic Information
                </span>
                <div className="space-y-1 font-medium text-[#111827]">
                  <p><strong>Department:</strong> {viewingStudent.department || 'AI & Data Science'}</p>
                  <p><strong>Class:</strong> Year {viewingStudent.year || 3} • Section {viewingStudent.section || 'A'}</p>
                  <p><strong>Email:</strong> {viewingStudent.email}</p>
                  <p><strong>Attendance Rate:</strong> <span className="font-bold text-[#12B76A]">{viewingStudent.attendance_percentage || 100}%</span></p>
                </div>
              </div>

              {/* Personal Info */}
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
                <span className="text-[10px] font-bold text-[#6D5DFC] uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Personal Details
                </span>
                <div className="space-y-1 font-medium text-[#111827]">
                  <p><strong>Phone:</strong> {viewingStudent.phone || 'Not provided'}</p>
                  <p><strong>DOB:</strong> {viewingStudent.dob || 'Not provided'}</p>
                  <p><strong>Gender:</strong> {viewingStudent.gender || 'Not specified'}</p>
                  <p><strong>Blood Group:</strong> {viewingStudent.blood_group || 'Not specified'}</p>
                </div>
              </div>

              {/* Parent / Guardian Contact */}
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
                <span className="text-[10px] font-bold text-[#6D5DFC] uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Parent / Guardian Info
                </span>
                <div className="space-y-1 font-medium text-[#111827]">
                  <p><strong>Parent Name:</strong> {viewingStudent.parent_name || 'Not provided'}</p>
                  <p><strong>Parent Contact:</strong> {viewingStudent.parent_phone || 'Not provided'}</p>
                </div>
              </div>

              {/* Hardware Security Binding */}
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
                <span className="text-[10px] font-bold text-[#6D5DFC] uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#12B76A]" /> Hardware Device Security
                </span>
                <div className="space-y-1.5">
                  <p className="font-mono text-[11px] text-[#6B7280]">
                    Device ID: <strong className="text-[#111827]">{viewingStudent.device_fingerprint || 'Unbound Hardware'}</strong>
                  </p>
                  <button
                    onClick={() => handleResetDevice(viewingStudent.id, viewingStudent.name)}
                    className="px-3 py-1.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] text-[10px] font-bold border border-[#6D5DFC]/20 hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center gap-1"
                  >
                    <Smartphone className="w-3 h-3" /> Reset Bound Device
                  </button>
                </div>
              </div>
            </div>

            {/* Residential Address & Bio */}
            {(viewingStudent.address || viewingStudent.bio) && (
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2 text-xs">
                {viewingStudent.address && (
                  <p className="text-[#111827]">
                    <strong className="text-[#6D5DFC]">Home Address:</strong> {viewingStudent.address}
                  </p>
                )}
                {viewingStudent.bio && (
                  <p className="text-[#111827]">
                    <strong className="text-[#6D5DFC]">Bio / Notes:</strong> {viewingStudent.bio}
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E7E7E7]">
              <button
                onClick={() => handleDeleteStudent(viewingStudent.id)}
                className="px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Student Account
              </button>

              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(viewingStudent);
                }}
                className="px-5 py-2.5 rounded-full bg-[#6D5DFC] text-white text-xs font-bold shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-1.5"
              >
                <Edit className="w-4 h-4" /> Edit Student Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 2. ADD NEW STUDENT MODAL */}
      {/* ================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[28px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Add New Student Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="e.g. DHANUSH D"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Register Number *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.roll_number}
                    onChange={(e) => setNewStudent({ ...newStudent, roll_number: e.target.value })}
                    placeholder="1130242430302"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Email Address *</label>
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
                    <option value="AI & Data Science">AI & Data Science</option>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    placeholder="+1-555-0199"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newStudent.dob}
                    onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Blood Group</label>
                  <select
                    value={newStudent.blood_group}
                    onChange={(e) => setNewStudent({ ...newStudent, blood_group: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Parent Phone</label>
                  <input
                    type="text"
                    value={newStudent.parent_phone}
                    onChange={(e) => setNewStudent({ ...newStudent, parent_phone: e.target.value })}
                    placeholder="+1-555-0999"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  value={newStudent.parent_name}
                  onChange={(e) => setNewStudent({ ...newStudent, parent_name: e.target.value })}
                  placeholder="Parent Name"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Home Address</label>
                <input
                  type="text"
                  value={newStudent.address}
                  onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                  placeholder="Residential Address"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
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

      {/* ================================================== */}
      {/* 3. EDIT STUDENT MODAL */}
      {/* ================================================== */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[28px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Edit Student Profile Details</h3>
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
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Roll / Register No</label>
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

              <div className="grid grid-cols-2 gap-2">
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
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editingStudent.dob}
                    onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Blood Group</label>
                  <select
                    value={editingStudent.blood_group}
                    onChange={(e) => setEditingStudent({ ...editingStudent, blood_group: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Parent Contact</label>
                  <input
                    type="text"
                    value={editingStudent.parent_phone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parent_phone: e.target.value })}
                    placeholder="+1-555-0999"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  value={editingStudent.parent_name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parent_name: e.target.value })}
                  placeholder="Parent Name"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Home Address</label>
                <input
                  type="text"
                  value={editingStudent.address}
                  onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                  placeholder="Residential Address"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Bio / Personal Notes</label>
                <textarea
                  rows={2}
                  value={editingStudent.bio}
                  onChange={(e) => setEditingStudent({ ...editingStudent, bio: e.target.value })}
                  placeholder="Bio or notes..."
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
                Save Updated Profile Details
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

export default StudentManagement;
