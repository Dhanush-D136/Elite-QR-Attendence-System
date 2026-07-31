import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ClassItem, SectionItem } from '../types';
import { Layers, Plus, Trash2, Edit3, X, CheckCircle2 } from 'lucide-react';

export const ClassesSectionsPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Class Modal
  const [showClassModal, setShowClassModal] = useState(false);
  const [className, setClassName] = useState('');
  const [levelYear, setLevelYear] = useState('1');

  // Section Modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionName, setSectionName] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resCls, resSec] = await Promise.all([api.get('/classes'), api.get('/sections')]);
      setClasses(resCls.data.classes);
      setSections(resSec.data.sections);
    } catch (err) {
      console.error('Failed to fetch classes/sections', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/classes', { name: className, level_year: levelYear });
      setShowClassModal(false);
      setClassName('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add class');
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (confirm('Delete this class year level?')) {
      try {
        await api.delete(`/classes/${id}`);
        fetchData();
      } catch (err) {
        alert('Failed to delete class');
      }
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sections', { name: sectionName });
      setShowSectionModal(false);
      setSectionName('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add section');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (confirm('Delete this section?')) {
      try {
        await api.delete(`/sections/${id}`);
        fetchData();
      } catch (err) {
        alert('Failed to delete section');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-[#111827]">Class & Section Management</h1>
        <p className="text-xs text-[#6B7280] font-medium mt-1">Configure academic year levels (First Year to Fourth Year) and classroom section divisions (A, B, C, D)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class Year Levels Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
            <div className="flex items-center gap-2 text-[#6D5DFC]">
              <Layers className="w-5 h-5" />
              <h3 className="font-display font-bold text-lg text-[#111827]">Academic Year Levels</h3>
            </div>
            <button
              onClick={() => setShowClassModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-bold text-xs border border-[#6D5DFC]/20 hover:bg-[#6D5DFC]/10 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Class Year
            </button>
          </div>

          <div className="space-y-2.5">
            {classes.map((cls) => (
              <div key={cls.id} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex items-center justify-between text-xs hover:border-[#6D5DFC]/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#E7E7E7] text-[#6D5DFC] font-extrabold flex items-center justify-center font-mono">
                    Y{cls.level_year}
                  </div>
                  <div>
                    <p className="font-bold text-[#111827]">{cls.name}</p>
                    <p className="text-[10px] text-[#6B7280] font-medium">Level Year {cls.level_year}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteClass(cls.id)}
                  className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section Divisions Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
            <div className="flex items-center gap-2 text-[#4F7CFF]">
              <Layers className="w-5 h-5" />
              <h3 className="font-display font-bold text-lg text-[#111827]">Classroom Sections</h3>
            </div>
            <button
              onClick={() => setShowSectionModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#EFF6FF] text-[#4F7CFF] font-bold text-xs border border-[#4F7CFF]/20 hover:bg-[#4F7CFF]/10 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Section
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {sections.map((sec) => (
              <div key={sec.id} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex items-center justify-between text-xs hover:border-[#4F7CFF]/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-white border border-[#E7E7E7] text-[#4F7CFF] font-extrabold text-base flex items-center justify-center font-mono">
                    {sec.name}
                  </div>
                  <div>
                    <p className="font-bold text-[#111827]">Section {sec.name}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSection(sec.id)}
                  className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Add Class Year Level</h3>
              <button onClick={() => setShowClassModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Third Year"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Year Level Number</label>
                <select
                  value={levelYear}
                  onChange={(e) => setLevelYear(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                >
                  <option value="1">1st Year (1)</option>
                  <option value="2">2nd Year (2)</option>
                  <option value="3">3rd Year (3)</option>
                  <option value="4">4th Year (4)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0]"
              >
                Create Class Year Level
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Add Classroom Section</h3>
              <button onClick={() => setShowSectionModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSection} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Section Letter</label>
                <input
                  type="text"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. A, B, C, D"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] uppercase font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#4F7CFF] font-bold text-xs text-white shadow-floating hover:bg-[#3b6ae8]"
              >
                Create Section
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
