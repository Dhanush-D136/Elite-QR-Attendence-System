import React, { useState } from 'react';
import { MapPin, Navigation, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface LocationSimulatorProps {
  onLocationSelect: (lat: number, lng: number, isMock: boolean) => void;
  adminLocation?: { lat: number; lng: number };
}

export const LocationSimulator: React.FC<LocationSimulatorProps> = ({ onLocationSelect, adminLocation }) => {
  const baseLat = adminLocation?.lat || 12.9716;
  const baseLng = adminLocation?.lng || 77.5946;

  const [mode, setMode] = useState<'inside' | 'outside' | 'mock' | 'real'>('inside');

  const handleSelectMode = (selectedMode: 'inside' | 'outside' | 'mock' | 'real') => {
    setMode(selectedMode);

    if (selectedMode === 'real') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => onLocationSelect(pos.coords.latitude, pos.coords.longitude, false),
          () => onLocationSelect(baseLat, baseLng, false)
        );
      } else {
        onLocationSelect(baseLat, baseLng, false);
      }
    } else if (selectedMode === 'inside') {
      // 5 meters away (Within 30m radius)
      onLocationSelect(baseLat + 0.000045, baseLng + 0.000045, false);
    } else if (selectedMode === 'outside') {
      // 80 meters away (Outside 30m radius)
      onLocationSelect(baseLat + 0.00072, baseLng + 0.00072, false);
    } else if (selectedMode === 'mock') {
      // Mock GPS flag trigger
      onLocationSelect(baseLat, baseLng, true);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-indigo-500/20 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400">
          <Navigation className="w-4 h-4 animate-bounce" />
          <span className="font-display font-semibold text-xs text-slate-200">GPS Location Tester / Simulator</span>
        </div>
        <span className="text-[10px] text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 font-mono">
          30m Radius Engine
        </span>
      </div>
      <p className="text-[11px] text-slate-400">
        Simulate student GPS coordinates relative to instructor's location to evaluate Haversine distance & anti-spoof checks:
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => handleSelectMode('inside')}
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
            mode === 'inside'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Inside (5m)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMode('outside')}
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
            mode === 'outside'
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Outside (80m)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMode('mock')}
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
            mode === 'mock'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Mock GPS</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMode('real')}
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
            mode === 'real'
              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Device Native</span>
        </button>
      </div>
    </div>
  );
};
