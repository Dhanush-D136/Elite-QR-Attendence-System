import React, { useState } from 'react';
import { X, Image as ImageIcon, RotateCcw, Check, Sparkles } from 'lucide-react';

interface HeroBannerSettingsModalProps {
  currentUrl: string;
  onClose: () => void;
  onSave: (newUrl: string) => void;
}

export const HeroBannerSettingsModal: React.FC<HeroBannerSettingsModalProps> = ({
  currentUrl,
  onClose,
  onSave
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const DEFAULT_BANNER = '/hero_banner.png';

  const handleReset = () => {
    setUrlInput(DEFAULT_BANNER);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(urlInput || DEFAULT_BANNER);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[28px] p-6 border border-[#E7E7E7] shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-[#111827]">
                Hero Banner Settings
              </h3>
              <p className="text-xs text-[#6B7280]">Manage cover banner image for Elite Minds Attendance Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827] p-1 rounded-full hover:bg-[#FAFAFA]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-[#111827] uppercase mb-1">
              Banner Image URL
            </label>
            <input
              type="text"
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="e.g. /hero_banner.png or https://..."
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] focus:outline-none focus:border-[#6D5DFC]"
            />
          </div>

          {/* Live Preview Card */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-[#6B7280] uppercase">Live Banner Preview</span>
            <div className="relative w-full h-36 rounded-2xl bg-[#111827] overflow-hidden border border-[#E7E7E7] flex items-center justify-center">
              <img
                src={urlInput}
                alt="Banner Preview"
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_BANNER;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/80 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <span className="text-[10px] font-mono text-[#A594FF] block">PREVIEW</span>
                <strong className="font-display font-extrabold text-sm">Elite Minds Attendance Portal</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-[#6B7280] font-bold hover:bg-[#F3F0FF] hover:text-[#6D5DFC] transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-full bg-white border border-[#E7E7E7] text-[#6B7280] font-bold hover:bg-[#FAFAFA]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#6D5DFC] text-white font-bold shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Banner</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
