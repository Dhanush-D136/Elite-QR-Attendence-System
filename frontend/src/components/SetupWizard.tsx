import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Users,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Building,
  Plus
} from 'lucide-react';
import api from '../services/api';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Class Details
  const [classDetails, setClassDetails] = useState({
    department: 'AI & DS',
    year: 'III Year',
    section: 'A',
    semester: 'V',
    room: 'F305',
    class_advisor: 'Mrs Vasanthapriya M J T',
    academic_year: '2026-2027 (ODD)',
    batch: '2024-2028'
  });

  // Step 2: Subjects
  const [subjectsList, setSubjectsList] = useState<Array<{ name: string; code: string; faculty_name: string }>>([]);
  const [subForm, setSubForm] = useState({ name: '', code: '', faculty_name: '' });

  // Step 3: Faculty
  const [facultiesList, setFacultiesList] = useState<Array<{ name: string; department: string; email: string }>>([]);
  const [facForm, setFacForm] = useState({ name: '', department: 'AI & DS', email: '' });

  // Step 4: Students
  const [studentsCount, setStudentsCount] = useState(0);

  const steps = [
    { num: 1, label: 'Class Details', icon: Building },
    { num: 2, label: 'Add Subjects', icon: BookOpen },
    { num: 3, label: 'Add Faculty', icon: UserCheck },
    { num: 4, label: 'Add Students', icon: Users },
    { num: 5, label: 'Create Timetable', icon: Calendar },
    { num: 6, label: 'Launch Session', icon: Clock }
  ];

  const handleSaveStep1 = async () => {
    try {
      await api.put('/class-details', classDetails);
      setCurrentStep(2);
    } catch (err) {
      alert('Failed to save class details');
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.name || !subForm.code) return;
    try {
      await api.post('/subjects', subForm);
      setSubjectsList([...subjectsList, subForm]);
      setSubForm({ name: '', code: '', faculty_name: '' });
    } catch (err) {
      alert('Failed to add subject');
    }
  };

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facForm.name) return;
    try {
      await api.post('/faculties', facForm);
      setFacultiesList([...facultiesList, facForm]);
      setFacForm({ name: '', department: 'AI & DS', email: '' });
    } catch (err) {
      alert('Failed to add faculty');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-4">
      {/* Wizard Header Banner */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#F3F0FF] text-[#6D5DFC]">
              <Sparkles className="w-5 h-5 animate-spin" />
            </span>
            <div>
              <h2 className="font-display font-extrabold text-xl text-[#111827]">
                Elite Minds Setup Wizard
              </h2>
              <p className="text-xs text-[#6B7280] font-medium">
                Welcome to Elite Minds Attendance Portal! Let's configure your attendance management portal.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] font-bold text-xs border border-[#12B76A]/20">
            Step {currentStep} of 6
          </span>
        </div>

        {/* Step Progress Tracker */}
        <div className="grid grid-cols-6 gap-2 pt-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                className={`p-2.5 rounded-2xl border text-center space-y-1 transition-all ${
                  isCurrent
                    ? 'bg-[#F3F0FF] border-[#6D5DFC] text-[#6D5DFC]'
                    : isDone
                    ? 'bg-[#ECFDF5] border-[#12B76A] text-[#12B76A]'
                    : 'bg-[#FAFAFA] border-[#E7E7E7] text-[#9CA3AF]'
                }`}
              >
                <Icon className="w-4 h-4 mx-auto" />
                <span className="text-[10px] font-bold block truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: CLASS DETAILS */}
      {currentStep === 1 && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <h3 className="font-display font-extrabold text-lg text-[#111827]">Step 1: Configure Class Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[#6B7280] font-bold block mb-1">Department</label>
              <input
                type="text"
                value={classDetails.department}
                onChange={(e) => setClassDetails({ ...classDetails, department: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-bold"
              />
            </div>

            <div>
              <label className="text-[#6B7280] font-bold block mb-1">Class / Year</label>
              <input
                type="text"
                value={classDetails.year}
                onChange={(e) => setClassDetails({ ...classDetails, year: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-bold"
              />
            </div>

            <div>
              <label className="text-[#6B7280] font-bold block mb-1">Section</label>
              <input
                type="text"
                value={classDetails.section}
                onChange={(e) => setClassDetails({ ...classDetails, section: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-bold"
              />
            </div>

            <div>
              <label className="text-[#6B7280] font-bold block mb-1">Room Allocation</label>
              <input
                type="text"
                value={classDetails.room}
                onChange={(e) => setClassDetails({ ...classDetails, room: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[#6B7280] font-bold block mb-1">Class Advisor Name</label>
              <input
                type="text"
                value={classDetails.class_advisor}
                onChange={(e) => setClassDetails({ ...classDetails, class_advisor: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveStep1}
              className="px-6 py-2.5 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
            >
              <span>Save & Continue to Subjects</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: ADD SUBJECTS */}
      {currentStep === 2 && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <h3 className="font-display font-extrabold text-lg text-[#111827]">Step 2: Add Curriculum Subjects</h3>

          <form onSubmit={handleAddSubject} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <input
              type="text"
              placeholder="Subject Name (e.g. Data Analytics)"
              value={subForm.name}
              onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-bold"
            />
            <input
              type="text"
              placeholder="Subject Code (e.g. 21HC52T)"
              value={subForm.code}
              onChange={(e) => setSubForm({ ...subForm, code: e.target.value })}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-bold"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-full bg-[#6D5DFC] font-bold text-white text-xs shadow-floating hover:bg-[#5b4be0] flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </form>

          {subjectsList.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
              <h4 className="font-bold text-xs text-[#111827]">Configured Subjects ({subjectsList.length})</h4>
              <div className="flex flex-wrap gap-2">
                {subjectsList.map((s, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-bold text-xs border border-[#6D5DFC]/20">
                    {s.name} ({s.code})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-full bg-white text-[#6B7280] font-bold text-xs border border-[#E7E7E7]"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
            >
              <span>Continue to Faculty</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ADD FACULTY */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <h3 className="font-display font-extrabold text-lg text-[#111827]">Step 3: Add Faculty Members</h3>

          <form onSubmit={handleAddFaculty} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <input
              type="text"
              placeholder="Faculty Name (e.g. Mrs Gowthami K)"
              value={facForm.name}
              onChange={(e) => setFacForm({ ...facForm, name: e.target.value })}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-bold"
            />
            <input
              type="email"
              placeholder="Faculty Email"
              value={facForm.email}
              onChange={(e) => setFacForm({ ...facForm, email: e.target.value })}
              className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] font-bold"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-full bg-[#6D5DFC] font-bold text-white text-xs shadow-floating hover:bg-[#5b4be0] flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Faculty
            </button>
          </form>

          {facultiesList.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
              <h4 className="font-bold text-xs text-[#111827]">Configured Faculty ({facultiesList.length})</h4>
              <div className="flex flex-wrap gap-2">
                {facultiesList.map((f, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] font-bold text-xs border border-[#12B76A]/20">
                    {f.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-full bg-white text-[#6B7280] font-bold text-xs border border-[#E7E7E7]"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
            >
              <span>Continue to Students</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ADD STUDENTS */}
      {currentStep === 4 && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <h3 className="font-display font-extrabold text-lg text-[#111827]">Step 4: Add Class Students</h3>
          <p className="text-xs text-[#6B7280]">Add students to your roster manually or via bulk excel import.</p>

          <div className="p-6 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-center space-y-3">
            <Users className="w-8 h-8 text-[#6D5DFC] mx-auto" />
            <h4 className="font-bold text-sm text-[#111827]">Manage Student Roster</h4>
            <p className="text-xs text-[#6B7280]">Use the Student Roster console to add or import students anytime.</p>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-full bg-white text-[#6B7280] font-bold text-xs border border-[#E7E7E7]"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="px-6 py-2.5 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
            >
              <span>Continue to Timetable</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: CREATE TIMETABLE */}
      {currentStep === 5 && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <h3 className="font-display font-extrabold text-lg text-[#111827]">Step 5: Create Master Timetable Grid</h3>
          <p className="text-xs text-[#6B7280]">Configure lecture start/end times and period slots.</p>

          <div className="p-6 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-center space-y-3">
            <Calendar className="w-8 h-8 text-[#6D5DFC] mx-auto" />
            <h4 className="font-bold text-sm text-[#111827]">Timetable Grid Ready</h4>
            <p className="text-xs text-[#6B7280]">You can edit periods and time slots in the Timetable tab anytime.</p>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 rounded-full bg-white text-[#6B7280] font-bold text-xs border border-[#E7E7E7]"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(6)}
              className="px-6 py-2.5 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
            >
              <span>Final Step: Launch Session</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: FINISH */}
      {currentStep === 6 && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#ECFDF5] text-[#12B76A] flex items-center justify-center mx-auto border border-[#12B76A]/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <h3 className="font-display font-extrabold text-xl text-[#111827]">ERP Setup Completed Successfully!</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            Your single class ERP system is now fully configured and ready for live dynamic QR attendance sessions.
          </p>

          <button
            onClick={onComplete}
            className="px-8 py-3.5 rounded-full bg-[#6D5DFC] text-sm font-extrabold text-white shadow-floating hover:bg-[#5b4be0] transition-all"
          >
            Enter ERP Console
          </button>
        </div>
      )}
    </div>
  );
};
