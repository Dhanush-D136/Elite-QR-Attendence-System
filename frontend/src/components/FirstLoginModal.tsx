import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, Smartphone } from 'lucide-react';

export const FirstLoginModal: React.FC = () => {
  const { submitFirstPasswordChange, deviceFingerprint } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[24px] p-6 sm:p-8 border border-[#E7E7E7] shadow-2xl space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 flex items-center justify-center mx-auto text-[#6D5DFC]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="font-display font-extrabold text-2xl text-[#111827]">Security Action Required</h2>
          <p className="text-xs text-[#6B7280] font-medium">
            First login detected. Create your personal password and bind your primary hardware device to complete registration.
          </p>
        </div>

        {/* Device Registration Badge */}
        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-[#12B76A] shrink-0" />
          <div className="text-xs text-left">
            <p className="font-bold text-[#111827]">Hardware Device Registered</p>
            <p className="text-[10px] text-[#12B76A] font-mono font-bold">
              ID: {deviceFingerprint ? deviceFingerprint.substring(0, 16) + '...' : 'Registering'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create new strong password"
                className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:bg-white text-xs pl-10"
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
                placeholder="Re-enter password to verify"
                className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] focus:bg-white text-xs pl-10"
              />
              <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Updating Credentials...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Password & Complete Registration</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
