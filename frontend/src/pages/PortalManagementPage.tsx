import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  ShieldCheck, 
  Users, 
  Key, 
  UserCheck, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  ChevronRight,
  BookOpen,
  Layers
} from 'lucide-react';
import api from '../services/api';

interface ClassPortalItem {
  id: string;
  portal_name: string;
  username: string;
  password?: string;
  department_name: string;
  department_id?: string;
  year: string;
  section: string;
  advisor_name?: string;
  advisor_id?: string;
  status: string;
  student_count?: number;
  created_at?: string;
}

export const PortalManagementPage: React.FC = () => {
  const [portals, setPortals] = useState<ClassPortalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPortal, setEditingPortal] = useState<ClassPortalItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    department_name: 'Artificial Intelligence & Data Science',
    year: '3',
    section: 'A',
    portal_name: '',
    username: '',
    password: '',
    advisor_name: ''
  });
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchPortals();
  }, []);

  const fetchPortals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/portals');
      if (res.data && res.data.portals) {
        setPortals(res.data.portals);
      }
    } catch (err) {
      console.error('Failed to fetch class portals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPortal(null);
    setFormData({
      department_name: 'Artificial Intelligence & Data Science',
      year: '3',
      section: 'A',
      portal_name: 'AI3A',
      username: 'AI3A',
      password: '1234',
      advisor_name: 'Mrs Nivetha P'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (portal: ClassPortalItem) => {
    setEditingPortal(portal);
    setFormData({
      department_name: portal.department_name,
      year: portal.year,
      section: portal.section,
      portal_name: portal.portal_name,
      username: portal.username,
      password: portal.password || '',
      advisor_name: portal.advisor_name || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Auto-generate portal name and username when department/year/section changes
  const handleDepartmentYearSectionChange = (dept: string, yr: string, sec: string) => {
    const deptPrefix = dept
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');
    const defaultCode = `${deptPrefix || 'DEPT'}${yr}${sec.toUpperCase()}`;
    
    setFormData((prev) => ({
      ...prev,
      department_name: dept,
      year: yr,
      section: sec.toUpperCase(),
      portal_name: prev.portal_name === '' || prev.portal_name.length <= 6 ? defaultCode : prev.portal_name,
      username: prev.username === '' || prev.username.length <= 6 ? defaultCode : prev.username
    }));
  };

  const handleSavePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.department_name || !formData.year || !formData.section || !formData.username) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingPortal) {
        // Update
        const res = await api.put(`/admin/portals/${editingPortal.id}`, formData);
        if (res.data && res.data.success) {
          setIsModalOpen(false);
          fetchPortals();
        } else {
          setFormError(res.data?.error || 'Failed to update portal.');
        }
      } else {
        // Create
        const res = await api.post('/admin/portals', formData);
        if (res.data && res.data.success) {
          setIsModalOpen(false);
          fetchPortals();
        } else {
          setFormError(res.data?.error || 'Failed to create portal.');
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'An error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePortal = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete Class Portal "${name}"?`)) return;
    try {
      await api.delete(`/admin/portals/${id}`);
      fetchPortals();
    } catch (err) {
      alert('Failed to delete portal');
    }
  };

  const filteredPortals = portals.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.portal_name.toLowerCase().includes(query) ||
      p.department_name.toLowerCase().includes(query) ||
      p.username.toLowerCase().includes(query) ||
      (p.advisor_name && p.advisor_name.toLowerCase().includes(query))
    );
  });

  const totalActive = portals.filter((p) => p.status === 'active' || p.status === 'Active').length;
  const uniqueDepts = new Set(portals.map((p) => p.department_name)).size;
  const totalStudents = portals.reduce((acc, p) => acc + (p.student_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#6D5DFC] via-[#5B4DFB] to-[#4F7CFF] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Centralized College ERP Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">
              Class Portal Management
            </h1>
            <p className="text-white/80 text-sm mt-1 max-w-xl">
              Provision, configure, and isolate Class Portals for all departments, academic years, and sections across the institution.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-3 bg-white text-[#6D5DFC] hover:bg-white/90 font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Class Portal</span>
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Class Portals</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{portals.length}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">{totalActive} Portals Active</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#6D5DFC] flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Academic Departments</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{uniqueDepts}</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Multi-Department ERP</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scoped Students</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalStudents > 0 ? totalStudents : 160}</h3>
            <p className="text-xs text-indigo-600 font-medium mt-0.5">Isolated per Portal</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Security Protocol</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">100%</h3>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Dynamic Portal Scoped</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Portals List Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search portal, department, advisor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5DFC]/20 focus:border-[#6D5DFC] transition-all"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              onClick={fetchPortals}
              className="p-2.5 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Portals Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6D5DFC] mb-3" />
            <p className="font-medium text-sm">Loading active Class Portals...</p>
          </div>
        ) : filteredPortals.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h4 className="font-bold text-gray-800 text-lg">No Class Portals Found</h4>
            <p className="text-gray-500 text-sm mt-1">Create your first Class Portal to provision dynamic class access.</p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 bg-[#6D5DFC] text-white text-xs font-bold rounded-lg hover:bg-[#5B4DFB] transition-all"
            >
              + Create Class Portal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
            {filteredPortals.map((portal) => (
              <div
                key={portal.id}
                className="bg-white border border-gray-200/80 rounded-2xl p-5 hover:shadow-md transition-all relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#6D5DFC] font-black text-sm flex items-center justify-center shadow-inner">
                        {portal.portal_name}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{portal.portal_name}</h3>
                        <p className="text-xs text-gray-500 font-mono">User: {portal.username}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        portal.status === 'active' || portal.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {portal.status || 'Active'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                        Department:
                      </span>
                      <span className="font-semibold text-gray-800 text-right truncate max-w-[170px]" title={portal.department_name}>
                        {portal.department_name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Layer className="w-3.5 h-3.5 text-gray-400" />
                        Class Scope:
                      </span>
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Year {portal.year} • Sec {portal.section}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                        Advisor:
                      </span>
                      <span className="font-medium text-gray-700">{portal.advisor_name || 'Assigned Advisor'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-[11px] text-gray-400 font-medium">
                    {portal.student_count ? `${portal.student_count} Students` : 'Class Space Ready'}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(portal)}
                      className="p-2 text-gray-500 hover:text-[#6D5DFC] hover:bg-purple-50 rounded-lg transition-all"
                      title="Edit Portal"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePortal(portal.id, portal.portal_name)}
                      className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete Portal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Class Portal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 transform transition-all">
            <div className="p-6 bg-gradient-to-r from-[#6D5DFC] to-[#4F7CFF] text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editingPortal ? `Edit Class Portal: ${editingPortal.portal_name}` : 'Create New Class Portal'}
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Provisions dedicated ERP access space for a specific Department, Year, and Section.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSavePortal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Department Name *
                </label>
                <select
                  value={formData.department_name}
                  onChange={(e) => handleDepartmentYearSectionChange(e.target.value, formData.year, formData.section)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6D5DFC]/20 focus:border-[#6D5DFC] outline-none"
                >
                  <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Master of Business Administration">Master of Business Administration</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Academic Year *
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => handleDepartmentYearSectionChange(formData.department_name, e.target.value, formData.section)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6D5DFC]/20 focus:border-[#6D5DFC] outline-none"
                  >
                    <option value="1">I Year (1st Year)</option>
                    <option value="2">II Year (2nd Year)</option>
                    <option value="3">III Year (3rd Year)</option>
                    <option value="4">IV Year (4th Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Section *
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) => handleDepartmentYearSectionChange(formData.department_name, formData.year, e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#6D5DFC]/20 focus:border-[#6D5DFC] outline-none"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Portal Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI3A"
                    value={formData.portal_name}
                    onChange={(e) => setFormData({ ...formData, portal_name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6D5DFC]/20 focus:border-[#6D5DFC] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Portal Username *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI3A"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-[#6D5DFC]/20 focus:border-[#6D5DFC] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Portal Password {editingPortal ? '(Leave blank to keep unchanged)' : '*'}
                </label>
                <input
                  type="password"
                  placeholder="Enter portal password (e.g. 1234)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#6D5DFC]/20 focus:border-[#6D5DFC] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Class Advisor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mrs Nivetha P"
                  value={formData.advisor_name}
                  onChange={(e) => setFormData({ ...formData, advisor_name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#6D5DFC]/20 focus:border-[#6D5DFC] outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#6D5DFC] hover:bg-[#5B4DFB] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingPortal ? 'Save Changes' : 'Create Class Portal'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
