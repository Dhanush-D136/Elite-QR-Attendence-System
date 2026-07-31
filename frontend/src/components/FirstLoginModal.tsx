import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, Smartphone, AlertCircle } from 'lucide-react';

export const FirstLoginModal: React.FC = () => {
  const { submitFirstPasswordChange, deviceFingerprint } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate strong password policy
  const validatePasswordPolicy = (pwd: string) => {
    if (pwd.length < 8) {
      return 'New password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter (e.g. A-Z).';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter (e.g. a-z).';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number (e.g. 0-9).';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return 'Password must contain at least one special character (e.g. !@#$%^&*).';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current temporary password.');
      return;
    }

    const policyError = validatePasswordPolicy(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    if (newPassword === '1234') {
      setError('New password cannot be the default "1234" password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitFirstPasswordChange(newPassword);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[24px] p-6 sm:p-8 border border-[#E7E7E7] shadow-2xl space-y-5 animate-fade-in relative">
        
        {/* Header Icon & Required Message */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 flex items-center justify-center mx-auto text-[#6D5DFC] shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-[#111827]">Change Password</h2>
          <div className="p-3 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[#6D5DFC] text-xs font-semibold leading-relaxed">
            Welcome. For security reasons, you must create a new password before continuing.
          </div>
        </div>

        {/* Hardware Binding Status */}
        {deviceFingerprint && (
          <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-[#12B76A] shrink-0" />
            <div className="text-xs text-left">
              <span className="font-bold text-[#111827]">Binding Device: </span>
              <span className="font-mono text-[#12B76A] text-[11px]">{deviceFingerprint.substring(0, 14)}...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Password Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password (e.g. 1234)"
                className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] text-xs pl-10"
              />
              <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create new strong password"
                className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] text-xs pl-10"
              />
              <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] text-xs pl-10"
              />
              <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Password Policy Guidelines */}
          <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[11px] text-[#6B7280] space-y-1">
            <p className="font-semibold text-[#111827]">Password Requirements:</p>
            <ul className="space-y-0.5 list-disc pl-4 text-[10px]">
              <li>Minimum 8 characters</li>
              <li>At least 1 uppercase letter, 1 lowercase letter</li>
              <li>At least 1 number & 1 special character</li>
            </ul>
            <p className="text-[10px] text-[#6D5DFC] font-mono mt-1 font-semibold">
              Examples: Student@123, Aids2025#
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Updating Password...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save New Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
