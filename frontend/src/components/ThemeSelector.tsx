import React, { useState } from 'react';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { Palette, Check } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { theme, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes: Array<{ id: ThemeMode; name: string; bg: string; accent: string }> = [
    { id: 'theme-white', name: 'Premium White (Default)', bg: 'bg-[#FAFAFA]', accent: 'bg-[#6D5DFC]' },
    { id: 'theme-pearl', name: 'Pearl White', bg: 'bg-[#F0F4F8]', accent: 'bg-[#4F7CFF]' },
    { id: 'theme-sand', name: 'Light Sand', bg: 'bg-[#F7F3EE]', accent: 'bg-[#12B76A]' },
    { id: 'theme-lavender', name: 'Lavender White', bg: 'bg-[#F3F0FF]', accent: 'bg-[#6D5DFC]' },
    { id: 'theme-dark', name: 'Executive Dark', bg: 'bg-[#090D16]', accent: 'bg-[#6D5DFC]' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-full bg-white border border-[#E7E7E7] text-[#111827] hover:border-[#6D5DFC]/40 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm hover:shadow"
        title="Switch Enterprise Theme"
      >
        <Palette className="w-3.5 h-3.5 text-[#6D5DFC]" />
        <span className="hidden sm:inline">Theme</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#E7E7E7] p-3 shadow-2xl z-50 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280] px-2 pb-1 border-b border-[#E7E7E7]">
            Enterprise Theme System
          </p>

          <div className="space-y-1">
            {themes.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setThemeMode(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[#F3F0FF] text-[#6D5DFC] font-semibold border border-[#6D5DFC]/30'
                      : 'text-[#111827] hover:bg-[#FAFAFA]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-4 h-4 rounded-full ${t.bg} border border-[#E7E7E7] shadow-sm flex items-center justify-center`}>
                      <span className={`w-2 h-2 rounded-full ${t.accent}`} />
                    </span>
                    <span>{t.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#6D5DFC]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
