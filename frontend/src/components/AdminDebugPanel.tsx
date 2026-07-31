import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { Terminal, RefreshCw, AlertTriangle, Database, Wifi, Shield, Cpu } from 'lucide-react';

export const AdminDebugPanel: React.FC = () => {
  const [debugState, setDebugState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDebugLog = async () => {
    try {
      const res = await api.get('/attendance/debug-log');
      setDebugState(res.data.debugState);
    } catch (err) {
      console.error('Failed to fetch debug state', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugLog();

    const socket = getSocket();
    socket.on('attendance_marked', () => fetchDebugLog());
    socket.on('suspicious_activity', () => fetchDebugLog());

    const interval = setInterval(fetchDebugLog, 3000);
    return () => {
      socket.off('attendance_marked');
      socket.off('suspicious_activity');
      clearInterval(interval);
    };
  }, []);

  if (isLoading || !debugState) return null;

  const isSuccess = debugState.status === 'SUCCESS';
  const isFailed = debugState.status === 'FAILED';

  return (
    <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4 font-sans animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
        <div className="flex items-center gap-2 text-[#6D5DFC] font-display font-bold text-base">
          <Terminal className="w-5 h-5" />
          <span>Attendance Telemetry & System Status</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold font-mono border ${
            isSuccess
              ? 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
              : isFailed
              ? 'bg-rose-50 text-rose-600 border-rose-200'
              : 'bg-[#FAFAFA] text-[#6B7280] border-[#E7E7E7]'
          }`}>
            Status: {debugState.status}
          </span>
          <button
            onClick={fetchDebugLog}
            className="p-1 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#FAFAFA]"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {debugState.error_message && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-mono font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Error Logged: {debugState.error_message}</span>
        </div>
      )}

      {/* Telemetry Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
          <span className="text-[10px] text-[#6B7280] flex items-center gap-1 font-semibold">
            <Cpu className="w-3 h-3 text-[#6D5DFC]" /> Last Student
          </span>
          <p className="font-bold text-[#111827] truncate">{debugState.student_name}</p>
          <p className="text-[10px] text-[#6B7280]">{debugState.roll_number}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
          <span className="text-[10px] text-[#6B7280] flex items-center gap-1 font-semibold">
            <Shield className="w-3 h-3 text-amber-500" /> Attendance Code
          </span>
          <p className="font-bold text-amber-600">{debugState.attendance_code}</p>
          <p className="text-[10px] text-[#6B7280] truncate">Session: {debugState.session_id.substring(0, 8)}...</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
          <span className="text-[10px] text-[#6B7280] flex items-center gap-1 font-semibold">
            <Database className="w-3 h-3 text-[#12B76A]" /> Database Insert
          </span>
          <p className="font-bold text-[#12B76A]">{debugState.db_insert_result}</p>
          <p className="text-[10px] text-[#6B7280]">SQL Insert Returning ID</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
          <span className="text-[10px] text-[#6B7280] flex items-center gap-1 font-semibold">
            <Wifi className="w-3 h-3 text-[#4F7CFF]" /> Socket Broadcast
          </span>
          <p className="font-bold text-[#4F7CFF]">{debugState.socket_result}</p>
          <p className="text-[10px] text-[#6B7280]">Realtime Telemetry Sent</p>
        </div>
      </div>
    </div>
  );
};
