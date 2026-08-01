import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Image as ImageIcon, Settings } from 'lucide-react';
import { HeroBannerSettingsModal } from './HeroBannerSettingsModal';

export const HeroBanner: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [bannerUrl, setBannerUrl] = useState<string>(() => {
    return localStorage.getItem('elite_minds_hero_banner') || '/family.jpg';
  });

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setBannerUrl(localStorage.getItem('elite_minds_hero_banner') || '/family.jpg');
    };
    window.addEventListener('hero_banner_updated', handleStorageChange);
    return () => window.removeEventListener('hero_banner_updated', handleStorageChange);
  }, []);

  return (
    <div className="relative w-full rounded-[28px] overflow-hidden shadow-enterprise border border-[#E7E7E7] group transition-all duration-500 animate-fade-in my-2">
      {/* Smart Responsive Container with Full Image Visibility */}
      <div className="relative w-full h-[220px] sm:h-[280px] md:h-[360px] bg-[#0B0F19] overflow-hidden flex items-center justify-center">
        {/* Background Blurred Fill Layer */}
        <img
          src={bannerUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-md opacity-40 scale-110"
        />
        {/* Main Foreground Full-Visibility Image (No Cropping) */}
        <img
          src={bannerUrl}
          alt="Elite Minds Family Hero Cover"
          className="relative max-w-full max-h-full object-contain object-center z-0 transition-transform duration-700 ease-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/family.jpg';
          }}
        />

        {/* Soft Premium Gradient & Glass Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/90 via-[#0B0F19]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19]/80 via-transparent to-transparent hidden sm:block" />

        {/* Top-Right Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#6D5DFC] animate-pulse" />
            <span>ELITE MINDS ACADEMIC PORTAL</span>
          </span>

          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full bg-black/50 hover:bg-[#6D5DFC] backdrop-blur-md border border-white/20 text-white transition-all shadow-md group/btn"
              title="Configure Hero Banner Image"
            >
              <Settings className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" />
            </button>
          )}
        </div>

        {/* Bottom Branding Overlay (Bottom-Left on Desktop, Bottom-Center on Mobile) */}
        <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:max-w-xl text-center sm:text-left space-y-1.5 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#6D5DFC]/30 backdrop-blur-md border border-[#6D5DFC]/40 text-[#A594FF] text-[10px] font-mono font-extrabold uppercase tracking-wider">
            Official Institution Portal
          </div>

          <h1 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight drop-shadow-md">
            Elite Minds Attendance Portal
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed drop-shadow-sm">
            Smart Attendance. Intelligent Analytics. Seamless Academic Management.
          </p>
        </div>
      </div>

      {/* Admin Settings Modal */}
      {showSettings && (
        <HeroBannerSettingsModal
          currentUrl={bannerUrl}
          onClose={() => setShowSettings(false)}
          onSave={(newUrl) => {
            localStorage.setItem('elite_minds_hero_banner', newUrl);
            setBannerUrl(newUrl);
            window.dispatchEvent(new Event('hero_banner_updated'));
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
};
