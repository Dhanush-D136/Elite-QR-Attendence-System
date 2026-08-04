import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  User,
  Edit3,
  Save,
  X
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, deviceFingerprint } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Admin Profile Form State
  const [adminName, setAdminName] = useState(user?.name || '');
  const [adminEmail, setAdminEmail] = useState(user?.email || '');
  const [adminPhone, setAdminPhone] = useState(user?.phone || '');
  const [adminPhoto, setAdminPhoto] = useState(user?.profile_photo || '');
  const [institutionName, setInstitutionName] = useState((user as any)?.institution_name || 'Elite Institute of Technology');
  const [departmentName, setDepartmentName] = useState((user as any)?.department_name || 'Computer Science & Engineering');
  const [newPassword, setNewPassword] = useState('');

  // Student Profile State - Loaded directly from DB
  const [vhNumber, setVhNumber] = useState<string>('');
  const [officialEmail, setOfficialEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [parentName, setParentName] = useState<string>('');
  const [parentContact, setParentContact] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Student Profile directly from Supabase DB (No hardcoded values, No default fallbacks)
  const fetchStudentProfileFromDb = async () => {
    if (isAdmin) return;
    try {
      setIsLoadingProfile(true);
      const res = await api.get('/student/profile');
      const profile = res.data.user;
      if (profile) {
        setVhNumber(profile.vh_number || '');
        setOfficialEmail(profile.email || '');
        setPhone(profile.phone || '');
        setDateOfBirth(profile.date_of_birth || profile.dob || '');
        setBloodGroup(profile.blood_group || '');
        setParentName(profile.parent_name || '');
        setParentContact(profile.parent_contact || profile.parent_phone || '');
        setAddress(profile.address || '');
        setBio(profile.bio || '');
        setProfilePhotoUrl(profile.profile_photo_url || profile.profile_photo || '');
        updateUser(profile);
      }
    } catch (err: any) {
      console.error('Failed to load student profile directly from database', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchStudentProfileFromDb();
  }, [user?.role]);

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
          name: adminName,
          email: adminEmail,
          phone: adminPhone,
          profile_photo: adminPhoto,
          institution_name: institutionName,
          department_name: departmentName,
          new_password: newPassword
        });
        if (res.data.user) {
          updateUser(res.data.user);
        }
        setMessage({ type: 'success', text: 'Admin profile updated successfully.' });
      } else {
        // Save Student Profile Settings directly to Supabase DB
        const res = await api.put('/student/profile', {
          vh_number: vhNumber,
          email: officialEmail,
          phone,
          date_of_birth: dateOfBirth,
          dob: dateOfBirth,
          blood_group: bloodGroup,
          parent_name: parentName,
          parent_contact: parentContact,
          parent_phone: parentContact,
          address,
          bio,
          profile_photo_url: profilePhotoUrl,
          profile_photo: profilePhotoUrl
        });

        if (res.data.user) {
          updateUser(res.data.user);
          const updated = res.data.user;
          setVhNumber(updated.vh_number || '');
          setOfficialEmail(updated.email || '');
          setPhone(updated.phone || '');
          setDateOfBirth(updated.date_of_birth || updated.dob || '');
          setBloodGroup(updated.blood_group || '');
          setParentName(updated.parent_name || '');
          setParentContact(updated.parent_contact || updated.parent_phone || '');
          setAddress(updated.address || '');
          setBio(updated.bio || '');
          setProfilePhotoUrl(updated.profile_photo_url || updated.profile_photo || '');
        }
        setMessage({
          type: 'success',
          text: res.data.message || 'Profile settings saved successfully and synced with Supabase Database.'
        });
        setIsEditingProfile(false);
      }
      setNewPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile settings' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPhoto = profilePhotoUrl || user?.profile_photo_url || user?.profile_photo || '';

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in pb-12">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-[#111827]">Account Profile & Settings</h1>
        <p className="text-xs text-[#6B7280] font-medium mt-1">
          {isAdmin
            ? 'Manage institution credentials, contact info, and admin configuration'
            : 'Manage personal profile settings connected directly to Supabase database'}
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 font-semibold ${
          message.type === 'success' ? 'bg-[#ECFDF5] border-[#12B76A]/30 text-[#12B76A]' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Avatar Header */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex items-center gap-4">
          <img
            src={currentPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
            alt={user?.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#E7E7E7] shadow-sm"
          />
          <div>
            <h3 className="font-display font-extrabold text-lg text-[#111827]">{user?.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 text-[10px] font-mono font-bold uppercase">
                {user?.role}
              </span>
              {user?.roll_number && (
                <span className="font-mono text-xs font-bold text-[#6B7280]">
                  Reg No: <span className="text-[#6D5DFC]">{user.roll_number}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {isAdmin ? (
          /* ADMIN PROFILE FORM */
          <div className="bg-white p-6 sm:p-8 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-6">
            <h3 className="font-display font-bold text-base text-[#111827]">Administrator Credentials</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all"
            >
              {isSubmitting ? 'Saving Admin Settings...' : 'Save Admin Profile'}
            </button>
          </div>
        ) : (
          /* STUDENT PROFILE SETTINGS CARD */
          <div className="bg-white p-6 sm:p-8 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E7E7]">
              <div>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#6D5DFC]" />
                  <h3 className="font-display font-extrabold text-lg text-[#111827]">
                    STUDENT PROFILE SETTINGS
                  </h3>
                </div>
                <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                  Institutional fields are locked. All profile details are fetched directly from Supabase.
                </p>
              </div>

              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2.5 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] font-extrabold text-xs border border-[#6D5DFC]/20 hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center gap-2 self-start sm:self-auto shadow-xs"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      fetchStudentProfileFromDb();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#6B7280] font-bold text-xs hover:text-[#111827] flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>

            {/* LOCKED FIELDS (🔒 READ ONLY) */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-extrabold uppercase text-[#6B7280] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#6D5DFC]" />
                LOCKED INSTITUTIONAL FIELDS (READ ONLY)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Student Name */}
                <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1 opacity-90">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase flex items-center justify-between">
                    <span>Student Name</span>
                    <Lock className="w-3 h-3 text-gray-400" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={user?.name || ''}
                    className="w-full bg-transparent text-xs font-extrabold text-[#111827] focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* 2. Register Number */}
                <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1 opacity-90">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase flex items-center justify-between">
                    <span>Register Number</span>
                    <Lock className="w-3 h-3 text-gray-400" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={user?.roll_number || ''}
                    className="w-full bg-transparent text-xs font-mono font-extrabold text-[#6D5DFC] focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* 3. Department */}
                <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1 opacity-90">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase flex items-center justify-between">
                    <span>Department</span>
                    <Lock className="w-3 h-3 text-gray-400" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={user?.department || ''}
                    className="w-full bg-transparent text-xs font-extrabold text-[#111827] focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* 4. Year */}
                <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1 opacity-90">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase flex items-center justify-between">
                    <span>Year</span>
                    <Lock className="w-3 h-3 text-gray-400" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={`Year ${user?.year || 3}`}
                    className="w-full bg-transparent text-xs font-extrabold text-[#111827] focus:outline-none cursor-not-allowed"
                  />
                </div>

                {/* 5. Section */}
                <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1 opacity-90">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase flex items-center justify-between">
                    <span>Section</span>
                    <Lock className="w-3 h-3 text-gray-400" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={`Section ${user?.section || 'A'}`}
                    className="w-full bg-transparent text-xs font-extrabold text-[#111827] focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* EDITABLE FIELDS GRID */}
            <div className="space-y-4 pt-3 border-t border-[#E7E7E7]">
              <span className="text-[10px] font-mono font-extrabold uppercase text-[#6D5DFC]">
                EDITABLE PROFILE FIELDS (SUPABASE SYNCED)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* VH Number */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">VH Number</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={vhNumber}
                    onChange={(e) => setVhNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. VH13936"
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-mono font-bold transition-all ${
                      isEditingProfile
                        ? 'bg-white border-2 border-[#6D5DFC] text-[#111827] shadow-sm'
                        : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#6D5DFC] cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Official Email */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">Official Email</label>
                  <input
                    type="email"
                    disabled={!isEditingProfile}
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value.toLowerCase())}
                    placeholder="vh13936@velhightech.com"
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-mono font-bold transition-all ${
                      isEditingProfile
                        ? 'bg-white border-2 border-[#12B76A] text-[#111827] shadow-sm'
                        : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#12B76A] cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                      isEditingProfile
                        ? 'bg-white border-2 border-[#6D5DFC] text-[#111827] shadow-sm'
                        : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Date Of Birth */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">Date Of Birth</label>
                  <input
                    type="date"
                    disabled={!isEditingProfile}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                      isEditingProfile
                        ? 'bg-white border-2 border-[#6D5DFC] text-[#111827] shadow-sm'
                        : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">Blood Group</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value.toUpperCase())}
                    placeholder="e.g. O+, A+, B+"
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                      isEditingProfile
                        ? 'bg-white border-2 border-[#6D5DFC] text-[#111827] shadow-sm'
                        : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Parent Name */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">Parent Name</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="e.g. RAMESH K"
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                      isEditingProfile
                        ? 'bg-white border-2 border-[#6D5DFC] text-[#111827] shadow-sm'
                        : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Parent Contact */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">Parent Contact</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={parentContact}
                    onChange={(e) => setParentContact(e.target.value)}
                    placeholder="e.g. +91 9876543211"
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                      isEditingProfile
                        ? 'bg-white border-2 border-[#6D5DFC] text-[#111827] shadow-sm'
                        : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Profile Photo URL */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">Profile Photo URL</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profilePhotoUrl}
                    onChange={(e) => setProfilePhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                      isEditingProfile
                        ? 'bg-white border-2 border-[#6D5DFC] text-[#111827] shadow-sm'
                        : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1.5">Address</label>
                <textarea
                  rows={2}
                  disabled={!isEditingProfile}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter full residential address..."
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                    isEditingProfile
                      ? 'bg-white border-2 border-[#6D5DFC] text-[#111827] shadow-sm'
                      : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] cursor-not-allowed'
                  }`}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1.5">Bio</label>
                <textarea
                  rows={2}
                  disabled={!isEditingProfile}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className={`w-full px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                    isEditingProfile
                      ? 'bg-white border-2 border-[#6D5DFC] text-[#111827] shadow-sm'
                      : 'bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] cursor-not-allowed'
                  }`}
                />
              </div>
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

            {/* Save Profile Settings Button */}
            {isEditingProfile && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-[#6D5DFC] font-extrabold text-xs text-white shadow-floating hover:bg-[#5b4be0] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Updating Supabase Database...' : 'Save Profile Settings'}</span>
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
