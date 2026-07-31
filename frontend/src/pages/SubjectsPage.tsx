import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { SubjectItem, Department } from '../types';
import { BookOpen, Plus, Edit3, Archive, Trash2, X, Search, UserCheck } from 'lucide-react';

export const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department: 'Computer Science',
    year: '3',
    semester: '5',
    faculty_name: '',
    credits: '4',
    description: ''
  });

  const fetchData = async () => {
    try {
      const [resSub, resDept] = await Promise.all([api.get('/subjects'), api.get('/departments')]);
      setSubjects(resSub.data.subjects);
      setDepartments(resDept.data.departments);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      department: departments[0]?.name || 'Computer Science',
      year: '3',
      semester: '5',
      faculty_name: '',
      credits: '4',
      description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code,
      department: sub.department,
      year: String(sub.year),
      semester: String(sub.semester),
      faculty_name: sub.faculty_name || '',
      credits: String(sub.credits || 3),
      description: sub.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, formData);
      } else {
        await api.post('/subjects', formData);
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save subject');
    }
  };

  const handleToggleArchive = async (id: string) => {
    try {
      const res = await api.put(`/subjects/${id}/archive`);
      fetchData();
    } catch (err) {
      alert('Failed to archive subject');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete subject ${name}?`)) {
      try {
        await api.delete(`/subjects/${id}`);
        fetchData();
      } catch (err) {
        alert('Failed to delete subject');
      }
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      (s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()) || (s.faculty_name && s.faculty_name.toLowerCase().includes(search.toLowerCase()))) &&
      (departmentFilter === '' || s.department === departmentFilter)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827]">Subject Management</h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">Configure academic curriculum subjects, faculty assignments, credits, and semesters</p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search subject name, code, or faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#9CA3AF] pl-9 focus:outline-none focus:border-[#6D5DFC] font-medium"
          />
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] focus:outline-none focus:border-[#6D5DFC] font-medium w-full md:w-auto"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Subjects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSubjects.map((sub) => (
          <div key={sub.id} className={`bg-white p-6 rounded-[24px] border shadow-enterprise space-y-4 flex flex-col justify-between transition-all ${
            sub.is_archived ? 'opacity-60 border-slate-300 bg-slate-50' : 'border-[#E7E7E7] hover:border-[#6D5DFC]/40'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center font-bold shadow-sm">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-[#111827]">{sub.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold text-[#6D5DFC] font-mono px-2 py-0.5 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20">
                        {sub.code}
                      </span>
                      <span className="text-[10px] text-[#6B7280] font-semibold">{sub.credits} Credits</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleArchive(sub.id)}
                    className="p-1.5 rounded-full text-[#6B7280] hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    title={sub.is_archived ? 'Restore Subject' : 'Archive Subject'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(sub)}
                    className="p-1.5 rounded-full text-[#6B7280] hover:text-[#6D5DFC] hover:bg-[#F3F0FF] transition-colors"
                    title="Edit Subject"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(sub.id, sub.name)}
                    className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#6B7280] font-medium">
                  <span>Dept: <strong className="text-[#111827]">{sub.department}</strong></span>
                  <span>Year {sub.year} • Sem {sub.semester}</span>
                </div>
                <div className="flex items-center gap-2 text-[#111827] font-semibold pt-1">
                  <UserCheck className="w-4 h-4 text-[#4F7CFF]" />
                  <span>Faculty: <strong className="text-[#4F7CFF]">{sub.faculty_name || 'TBD'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Operating Systems"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. CS301"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Credits</label>
                  <input
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Year Level</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Assigned Faculty Name</label>
                <input
                  type="text"
                  value={formData.faculty_name}
                  onChange={(e) => setFormData({ ...formData, faculty_name: e.target.value })}
                  placeholder="e.g. Mr. Kumar"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all"
              >
                {editingSubject ? 'Update Subject' : 'Create Subject'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
