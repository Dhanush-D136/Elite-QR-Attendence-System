import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TimetableItem } from '../types';
import { Calendar, Clock, MapPin, UserCheck, Sparkles, BookOpen } from 'lucide-react';

export const StudentTimetablePage: React.FC = () => {
  const { user } = useAuth();
  const [timetables, setTimetables] = useState<TimetableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay() - 1] || 'Monday';
  const [activeDay, setActiveDay] = useState<string>(todayName);

  useEffect(() => {
    if (user?.department && user?.year && user?.section) {
      api.get(`/timetables?department=${encodeURIComponent(user.department)}&year=${user.year}&section=${user.section}`)
        .then((res) => setTimetables(res.data.timetables))
        .catch((err) => console.error('Failed to load student timetable', err))
        .finally(() => setIsLoading(false));
    }
  }, [user?.department, user?.year, user?.section]);

  const todayClasses = timetables.filter((t) => t.day === todayName);
  const activeDayClasses = timetables.filter((t) => t.day === activeDay);

  const currentClass = todayClasses[0] || null;
  const nextClass = todayClasses[1] || null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-[#111827]">My Class Timetable</h1>
        <p className="text-xs text-[#6B7280] font-medium mt-1">
          {user?.department} • Year {user?.year}, Section {user?.section} Class Schedule
        </p>
      </div>

      {/* Current & Next Class Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Class */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20 text-xs font-bold uppercase tracking-wider">
              Current / Upcoming Class
            </span>
            <Sparkles className="w-4 h-4 text-[#12B76A]" />
          </div>

          {currentClass ? (
            <div>
              <h3 className="font-display font-extrabold text-xl text-[#111827]">{currentClass.subject_name}</h3>
              <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
                <p className="font-mono text-[#6D5DFC] font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" />
                  {currentClass.start_time} - {currentClass.end_time}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-[#111827] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                    Faculty: {currentClass.faculty_name}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#F7F3EE] border border-[#E7E7E7] font-mono text-[#111827] font-bold">
                    Room {currentClass.room_number}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] font-medium py-4">No class scheduled right now.</p>
          )}
        </div>

        {/* Next Class */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 text-xs font-bold uppercase tracking-wider">
              Next Scheduled Lecture
            </span>
            <BookOpen className="w-4 h-4 text-[#6D5DFC]" />
          </div>

          {nextClass ? (
            <div>
              <h3 className="font-display font-extrabold text-xl text-[#111827]">{nextClass.subject_name}</h3>
              <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
                <p className="font-mono text-[#6D5DFC] font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" />
                  {nextClass.start_time} - {nextClass.end_time}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-[#111827] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                    Faculty: {nextClass.faculty_name}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#F7F3EE] border border-[#E7E7E7] font-mono text-[#111827] font-bold">
                    Room {nextClass.room_number}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] font-medium py-4">No further lectures scheduled for today.</p>
          )}
        </div>
      </div>

      {/* Weekly Days Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDay(d)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              activeDay === d
                ? 'bg-[#6D5DFC] text-white shadow-floating'
                : 'bg-white text-[#6B7280] border border-[#E7E7E7] hover:bg-[#FAFAFA]'
            }`}
          >
            {d} {d === todayName ? '(Today)' : ''}
          </button>
        ))}
      </div>

      {/* Selected Day Schedule List */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <h3 className="font-display font-bold text-base text-[#111827]">
          {activeDay} Schedule ({activeDayClasses.length} Lectures)
        </h3>

        {activeDayClasses.length === 0 ? (
          <div className="py-12 text-center text-[#6B7280] text-xs font-medium space-y-2">
            <Calendar className="w-8 h-8 text-[#9CA3AF] mx-auto" />
            <p>No lectures scheduled for {activeDay}. Enjoy your break!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDayClasses.map((tt) => (
              <div key={tt.id} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-3 hover:border-[#6D5DFC]/30 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7]">
                    <span className="font-bold text-[#111827] text-sm">{tt.subject_name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#E7E7E7] text-[#111827] font-mono">
                      {tt.room_number}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-[#6B7280]">
                    <div className="flex items-center gap-1.5 font-mono text-[#6D5DFC] font-bold">
                      <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" />
                      <span>{tt.start_time} - {tt.end_time}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[#111827] font-semibold pt-1">
                      <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                      <span>Faculty: {tt.faculty_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
