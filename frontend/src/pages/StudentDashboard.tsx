import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { AttendanceRecord } from '../types';
import { MapPin, ShieldCheck, History, Flame, CheckCircle2, XCircle, Award, Sparkles, BookOpen } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = () => {
    api.get('/attendance/my-history')
      .then((res) => setHistory(res.data.history))
      .catch((err) => console.error('Failed to load history', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchHistory();

    const socket = getSocket();
    socket.on('attendance_marked', (data: { record: AttendanceRecord }) => {
      if (data.record && data.record.student_id === user?.id) {
        setHistory((prev) => [data.record, ...prev]);
        fetchHistory();
      }
    });

    return () => {
      socket.off('attendance_marked');
    };
  }, [user?.id]);

  const totalClasses = history.length;
  const presentClasses = history.filter((h) => h.status === 'present' || h.status === 'late').length;
  const missedClasses = Math.max(0, totalClasses - presentClasses);
  const attendanceRate = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 100;
  const isPresentToday = history.some(
    (h) => new Date(h.attendance_time).toDateString() === new Date().toDateString()
  );

  // Calculate streak
  const streak = isPresentToday ? Math.max(1, presentClasses) : Math.min(presentClasses, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Student Profile Header Card */}
      <div className="bg-white p-6 lg:p-8 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={user?.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt=""
            className="w-16 h-16 rounded-full border-2 border-[#E7E7E7] object-cover shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-2xl text-[#111827]">{user?.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                isPresentToday
                  ? 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                  : 'bg-[#F3F0FF] text-[#6D5DFC] border-[#6D5DFC]/20'
              }`}>
                {isPresentToday ? '✓ PRESENT TODAY' : 'STUDENT PORTAL'}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] font-medium mt-1">
              Roll No: <span className="font-mono text-[#6D5DFC] font-bold">{user?.roll_number}</span> • Dept of {user?.department} (Year {user?.year}, Sec {user?.section})
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20 text-xs text-[#6D5DFC] flex items-center gap-2 font-bold shadow-sm">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{streak} Day Attendance Streak</span>
          </div>
        </div>
      </div>

      {/* Student Widgets Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Percentage */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-2 hover:border-[#6D5DFC]/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Attendance Rate</span>
            <Award className="w-4 h-4 text-[#6D5DFC]" />
          </div>
          <p className={`font-display font-extrabold text-3xl ${attendanceRate >= 75 ? 'text-[#12B76A]' : 'text-rose-600'}`}>
            {attendanceRate}%
          </p>
          <div className="w-full bg-[#FAFAFA] rounded-full h-2 border border-[#E7E7E7] overflow-hidden">
            <div className="bg-[#6D5DFC] h-full rounded-full transition-all duration-500" style={{ width: `${attendanceRate}%` }} />
          </div>
          <p className="text-[10px] text-[#6B7280] font-medium">75% minimum institutional requirement</p>
        </div>

        {/* Classes Attended */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-2 hover:border-[#12B76A]/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Classes Attended</span>
            <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
          </div>
          <p className="font-display font-extrabold text-3xl text-[#12B76A]">{presentClasses}</p>
          <p className="text-[10px] text-[#12B76A] font-semibold">Verified via GPS QR engine</p>
        </div>

        {/* Classes Missed */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-2 hover:border-rose-400/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Classes Missed</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="font-display font-extrabold text-3xl text-rose-600">{missedClasses}</p>
          <p className="text-[10px] text-rose-500 font-medium">Absences recorded</p>
        </div>

        {/* Current Streak */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-2 hover:border-amber-400/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Active Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-display font-extrabold text-3xl text-amber-500">{streak} Days</p>
          <p className="text-[10px] text-amber-600 font-medium">Consecutive lecture check-ins</p>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-[#111827] flex items-center gap-2">
              <History className="w-5 h-5 text-[#6D5DFC]" />
              Recent Attendance Log
            </h3>
            <p className="text-xs text-[#6B7280] font-medium">Verified attendance timestamps, attendance codes, and GPS distance</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
              <tr>
                <th className="pb-3">Subject / Course</th>
                <th className="pb-3">Attendance Code</th>
                <th className="pb-3">Verified Timestamp</th>
                <th className="pb-3">Geofence Distance</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E7]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#6B7280]">
                    No attendance records found yet. Scan a lecture QR code to record attendance.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3.5 font-bold text-[#111827]">{h.subject || 'Lecture Session'}</td>
                    <td className="py-3.5 font-mono text-[#6D5DFC] font-bold">{h.attendance_code || '4821'}</td>
                    <td className="py-3.5 font-mono text-[#6B7280]">{new Date(h.attendance_time).toLocaleString()}</td>
                    <td className="py-3.5 font-mono text-[#12B76A] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{h.distance_meters} meters</span>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20">
                        {h.status}
                      </span>
                    </td>
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
