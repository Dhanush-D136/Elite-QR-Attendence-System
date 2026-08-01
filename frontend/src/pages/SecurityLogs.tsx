import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { ViolationLog } from '../types';
import { ShieldAlert, AlertTriangle, Smartphone, MapPin, RefreshCw, Trash2 } from 'lucide-react';

import { DataIntegrityAuditPanel } from '../components/DataIntegrityAuditPanel';

export const SecurityLogs: React.FC = () => {
  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchViolations = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/violations');
      setViolations(res.data.violations);
    } catch (err) {
      console.error('Failed to fetch security violation logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
    const socket = getSocket();

    socket.on('suspicious_activity', (data: ViolationLog) => {
      setViolations((prev) => [data, ...prev]);
    });

    return () => {
      socket.off('suspicious_activity');
    };
  }, []);

  const handleClearLogs = async () => {
    if (confirm('Clear all security violation history?')) {
      try {
        await api.delete('/violations');
        fetchViolations();
      } catch (err) {
        alert('Failed to clear logs');
      }
    }
  };

  const getViolationBadge = (type: string) => {
    switch (type) {
      case 'MOCK_GPS':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-rose-600"/> Mock GPS Detected</span>;
      case 'OUT_OF_RANGE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-600"/> Out of 30m Geofence</span>;
      case 'DEVICE_MISMATCH':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 flex items-center gap-1"><Smartphone className="w-3 h-3 text-[#6D5DFC]"/> Unregistered Device</span>;
      case 'EXPIRED_QR':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-slate-100 text-[#6B7280] border border-[#E7E7E7] flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Expired QR / Screenshot</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-rose-50 text-rose-700 border border-rose-200">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827] flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            Security & Violation Logs
          </h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">Real-time anti-spoofing flags, geofence breaches, and device mismatch alerts</p>
        </div>

        <button
          onClick={handleClearLogs}
          className="px-4 py-2 rounded-full bg-white border border-[#E7E7E7] text-xs font-bold text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-2 shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Violation Audit Logs</span>
        </button>
      </div>

      {/* Data Integrity Audit & Auto-Repair Panel */}
      <DataIntegrityAuditPanel />

      <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Student Name</th>
                <th className="p-4">Roll Number</th>
                <th className="p-4">Violation Category</th>
                <th className="p-4">Diagnostic Details</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E7]">
              {violations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-[#6B7280]">
                    No security violations recorded. All student check-ins operating securely.
                  </td>
                </tr>
              ) : (
                violations.map((v) => (
                  <tr key={v.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-4 font-bold text-[#111827]">{v.student_name || 'Unknown Student'}</td>
                    <td className="p-4 font-mono text-[#6D5DFC] font-bold">{v.roll_number || 'N/A'}</td>
                    <td className="p-4">{getViolationBadge(v.violation_type)}</td>
                    <td className="p-4 text-[#6B7280] max-w-xs truncate font-medium">{v.details}</td>
                    <td className="p-4 text-[#6B7280] font-mono text-[11px]">{new Date(v.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
