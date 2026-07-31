import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeSelector } from './ThemeSelector';
import { Shield, LogOut, Smartphone, Bell, CheckCircle, AlertTriangle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, deviceFingerprint } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E7E7E7] px-6 lg:px-10 py-3.5 flex items-center justify-between shadow-subtle">
      {/* Brand Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-[#6D5DFC] text-white flex items-center justify-center shadow-floating">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base tracking-tight text-[#111827]">
              SmartAttend
            </span>
            <span className="text-[10px] font-bold text-[#6D5DFC] px-2 py-0.5 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20 tracking-wider">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-[#6B7280] font-medium hidden sm:block">Enterprise Attendance Engine</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Device Fingerprint Status */}
        {user?.role === 'student' && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F7F3EE] border border-[#E7E7E7] text-xs font-medium text-[#111827]" title={`Registered Device ID: ${deviceFingerprint}`}>
            <Smartphone className="w-3.5 h-3.5 text-[#12B76A]" />
            <span className="text-[#6B7280]">Device:</span>
            <span className="text-[#12B76A] font-semibold">{deviceFingerprint ? deviceFingerprint.substring(0, 10) + '...' : 'Verified'}</span>
          </div>
        )}

        {/* Theme Selector */}
        <ThemeSelector />

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full bg-white border border-[#E7E7E7] text-[#6B7280] hover:text-[#111827] hover:border-[#6D5DFC]/40 transition-all relative shadow-sm"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#6D5DFC]"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-[#E7E7E7] p-4 shadow-2xl z-50 text-xs animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7]">
                <span className="font-bold text-[#111827]">Security Telemetry</span>
                <span className="text-[10px] text-[#6D5DFC] font-semibold">Active</span>
              </div>
              <div className="space-y-2.5 mt-3">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7]">
                  <CheckCircle className="w-4 h-4 text-[#12B76A] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#111827]">HMAC Token Rotation</p>
                    <p className="text-[11px] text-[#6B7280]">Dynamic tokens rotate every 30s with anti-tamper signature.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7]">
                  <AlertTriangle className="w-4 h-4 text-[#4F7CFF] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#111827]">Geofence Verification</p>
                    <p className="text-[11px] text-[#6B7280]">30m Haversine distance engine active.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-[#E7E7E7]">
            <img
              src={user.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-[#E7E7E7] object-cover shadow-sm"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#111827]">{user.name}</p>
              <p className="text-[10px] text-[#6D5DFC] uppercase tracking-wider font-semibold">
                {user.role} {user.roll_number ? `(${user.roll_number})` : ''}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
