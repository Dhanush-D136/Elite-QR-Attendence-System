import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Lock, CheckCircle2, AlertCircle, Smartphone, Terminal, User } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, deviceFingerprint } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [devMode, setDevMode] = useState<boolean>(() => localStorage.getItem('smartattend_dev_mode') === 'true');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || '');
  const [institutionName, setInstitutionName] = useState((user as any)?.institution_name || 'Elite Institute of Technology');
  const [departmentName, setDepartmentName] = useState((user as any)?.department_name || 'Computer Science & Engineering');
  const [newPassword, setNewPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRegisterCurrentDevice = async () => {
    try {
      setIsSubmitting(true);
      const res = await api.post('/auth/student/register-device', {
        device_fingerprint: deviceFingerprint
      });
      if (res.data.user) {
        updateUser(res.data.user);
      }
      setMessage({ type: 'success', text: 'Current hardware device registered and bound successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to register device' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (isAdmin) {
        const res = await api.put('/auth/admin/profile', {
          name,
          email,
          phone,
          profile_photo: profilePhoto,
          institution_name: institutionName,
          department_name: departmentName,
          new_password: newPassword
        });
        if (res.data.user) {
          updateUser(res.data.user);
        }
        setMessage({ type: 'success', text: 'Profile Updated Successfully' });
      } else {
        const res = await api.put('/auth/student/profile', {
          phone,
          profile_photo: profilePhoto,
          new_password: newPassword
        });
        if (res.data.user) {
          updateUser(res.data.user);
        }
        setMessage({ type: 'success', text: 'Profile Updated Successfully' });
      }
      setNewPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-[#111827]">Account Profile & Settings</h1>
        <p className="text-xs text-[#6B7280] font-medium mt-1">
          {isAdmin ? 'Manage institution credentials, contact info, and admin configuration' : 'Manage personal details, profile picture, and device hardware credentials'}
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2 font-medium ${
          message.type === 'success' ? 'bg-[#ECFDF5] border-[#12B76A]/30 text-[#12B76A]' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-6">
        {/* Profile Avatar Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-[#E7E7E7]">
          <img
            src={profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user?.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-[#E7E7E7] shadow-sm"
          />
          <div>
            <h3 className="font-display font-bold text-lg text-[#111827]">{user?.name}</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 text-[10px] font-mono font-bold uppercase">
              {user?.role} {user?.roll_number ? `(${user?.roll_number})` : ''}
            </span>
          </div>
        </div>

        {/* Profile Photo Link Field */}
        <div>
          <label className="block text-xs font-semibold text-[#111827] mb-1.5">Profile Photo Image URL</label>
          <input
            type="url"
            value={profilePhoto}
            onChange={(e) => setProfilePhoto(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:bg-white"
          />
        </div>

        {/* Fields */}
        {isAdmin ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Institution Name</label>
                <input
                  type="text"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Department Name</label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                <Lock className="w-3.5 h-3.5 text-[#6D5DFC]" />
                <span>Institutional Credentials (Admin Managed)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[#6B7280] block">Roll Number</span>
                  <span className="text-[#111827] font-bold">{user?.roll_number}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] block">Department</span>
                  <span className="text-[#111827] font-bold">{user?.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] block">Year</span>
                  <span className="text-[#111827] font-bold">{user?.year}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] block">Section</span>
                  <span className="text-[#111827] font-bold">{user?.section}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-555-1001"
                className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
              />
            </div>

            {/* Hardware Binding */}
            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#111827] block">Registered Hardware Device</span>
                <span className="font-mono text-[10px] text-[#6B7280]">
                  ID: {user?.device_fingerprint ? user.device_fingerprint.substring(0, 16) + '...' : 'Unregistered'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleRegisterCurrentDevice}
                className="px-4 py-2 rounded-full bg-[#6D5DFC] text-white font-bold text-xs shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-1.5"
              >
                <Smartphone className="w-4 h-4 text-white" />
                <span>Use Current Device</span>
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all"
        >
          {isSubmitting ? 'Saving Profile Settings...' : 'Save Profile Settings'}
        </button>
      </form>
    </div>
  );
};
