import api from './api';

export interface SpellStudentItem {
  student_id: string;
  roll_number: string;
  name: string;
  department: string;
  year: number;
  section: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  spell_percentage: number;
  category: string;
}

export interface SpellReportData {
  success: boolean;
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  workingDays: number;
  totalStudents: number;
  categories: {
    hundred: number;
    ninetyFivePlus: number;
    ninetyPlus: number;
    eightyFivePlus: number;
    seventyFivePlus: number;
    belowSeventyFive: number;
  };
  students: SpellStudentItem[];
}

export interface StudentDailyBreakdown {
  date: string;
  day: string;
  status: 'PRESENT' | 'ABSENT';
  periodsAttended: number;
  totalPeriodsRecorded: number;
}

export interface StudentSpellAttendanceData {
  success: boolean;
  dateRange: {
    fromDate: string;
    toDate: string;
  };
  workingDays: number;
  presentDays: number;
  absentDays: number;
  spellPercentage: number;
  dailyBreakdown: StudentDailyBreakdown[];
}

export const spellAttendanceService = {
  // Fetch Admin & Faculty Spell Attendance Report
  getSpellAttendanceReport: async (filters: {
    from_date?: string;
    to_date?: string;
    department?: string;
    year?: string;
    section?: string;
    search?: string;
    student_id?: string;
  }): Promise<SpellReportData> => {
    const params = new URLSearchParams();
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.department) params.append('department', filters.department);
    if (filters.year) params.append('year', filters.year);
    if (filters.section) params.append('section', filters.section);
    if (filters.search) params.append('search', filters.search);
    if (filters.student_id) params.append('student_id', filters.student_id);

    const response = await api.get(`/analytics/spell-attendance?${params.toString()}`);
    return response.data;
  },

  // Fetch Logged-in Student Spell Attendance
  getStudentSpellAttendance: async (fromDate?: string, toDate?: string): Promise<StudentSpellAttendanceData> => {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);

    const response = await api.get(`/attendance/my-spell-attendance?${params.toString()}`);
    return response.data;
  },

  // Fetch Faculty Spell Analytics
  getFacultySpellAttendance: async (filters: {
    from_date?: string;
    to_date?: string;
    department?: string;
    year?: string;
    section?: string;
  }): Promise<SpellReportData> => {
    const params = new URLSearchParams();
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.department) params.append('department', filters.department);
    if (filters.year) params.append('year', filters.year);
    if (filters.section) params.append('section', filters.section);

    const response = await api.get(`/faculty/spell-attendance?${params.toString()}`);
    return response.data;
  }
};
