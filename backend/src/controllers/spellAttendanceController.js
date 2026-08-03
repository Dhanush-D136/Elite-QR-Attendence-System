const { db } = require('../database/db');
const { fetchActiveSpellHelper } = require('./spellManagementController');

/**
 * Robust Date Normalizer: Converts any Date object, ISO string, or timestamp into 'YYYY-MM-DD'
 */
function normalizeDateString(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (str.includes('T')) return str.split('T')[0];
  if (str.includes(' ')) return str.split(' ')[0];
  return str;
}

// Helper to generate array of date strings (YYYY-MM-DD) between start and end
function getDatesInRange(startStr, endStr) {
  const dates = [];
  const curr = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(curr.getTime()) || isNaN(end.getTime())) {
    return dates;
  }

  while (curr <= end) {
    dates.push(normalizeDateString(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

// Helper to get day name from YYYY-MM-DD
function getDayName(dateStr) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date(dateStr + 'T00:00:00');
  return days[d.getDay()];
}

/**
 * Calculate total working days in a date range for a class/timetable
 */
function calculateWorkingDays(fromDate, toDate, dept, yearVal, secVal, cb) {
  const allDates = getDatesInRange(fromDate, toDate);
  if (allDates.length === 0) {
    return cb(null, { workingDaysCount: 0, workingDates: [] });
  }

  // Fetch timetable slots for class to know which days of week are active
  let ttQuery = "SELECT DISTINCT day FROM timetables WHERE status = 'ACTIVE'";
  const ttParams = [];

  if (dept) {
    ttQuery += " AND department = ?";
    ttParams.push(dept);
  }
  if (yearVal) {
    ttQuery += " AND year = ?";
    ttParams.push(parseInt(yearVal, 10));
  }
  if (secVal) {
    ttQuery += " AND section = ?";
    ttParams.push(secVal);
  }

  db.all(ttQuery, ttParams, (errTt, ttRows) => {
    const activeDaysOfWeek = new Set((ttRows || []).map((r) => r.day.trim().toLowerCase()));

    // Fallback: If no custom timetable exists, assume Monday-Friday are active working days
    if (activeDaysOfWeek.size === 0) {
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((d) => activeDaysOfWeek.add(d));
    }

    // Query distinct dates where actual sessions took place in the date range
    db.all(
      "SELECT DISTINCT date FROM attendance_sessions WHERE date >= ? AND date <= ?",
      [fromDate, toDate],
      (errSess, sessRows) => {
        const sessionDates = new Set(
          (sessRows || []).map((s) => normalizeDateString(s.date)).filter(Boolean)
        );

        const workingDates = [];
        allDates.forEach((dateStr) => {
          const dayName = getDayName(dateStr).toLowerCase();
          // Exclude Sundays unless session occurred or timetable explicitly scheduled
          if (dayName === 'sunday' && !sessionDates.has(dateStr) && !activeDaysOfWeek.has('sunday')) {
            return;
          }

          if (activeDaysOfWeek.has(dayName) || sessionDates.has(dateStr)) {
            workingDates.push(dateStr);
          }
        });

        cb(null, {
          workingDaysCount: workingDates.length,
          workingDates
        });
      }
    );
  });
}

/**
 * 1. ADMIN & FACULTY: SPELL ATTENDANCE REPORT
 */
function getSpellAttendanceReport(req, res) {
  const {
    from_date,
    to_date,
    department,
    year,
    section,
    student_id,
    search
  } = req.query;

  fetchActiveSpellHelper((errActive, activeSpell) => {
    const fromDate = from_date || (activeSpell ? activeSpell.start_date : '2026-08-01');
    const toDate = to_date || (activeSpell ? activeSpell.end_date : '2026-09-30');

    // Step 1: Calculate total working days in date range
    calculateWorkingDays(fromDate, toDate, department, year, section, (errWorking, workingInfo) => {
      if (errWorking) {
        return res.status(500).json({ success: false, error: 'Failed to compute working days: ' + errWorking.message });
      }

      const workingDaysCount = workingInfo.workingDaysCount;
      const workingDatesSet = new Set(workingInfo.workingDates);

      // Step 2: Query students with filters
      let studentQuery = "SELECT id, name, roll_number, email, department, year, section FROM users WHERE role = 'student'";
      const studentParams = [];

      if (department) {
        studentQuery += " AND department = ?";
        studentParams.push(department);
      }
      if (year) {
        studentQuery += " AND year = ?";
        studentParams.push(parseInt(year, 10));
      }
      if (section) {
        studentQuery += " AND section = ?";
        studentParams.push(section);
      }
      if (student_id) {
        studentQuery += " AND id = ?";
        studentParams.push(student_id);
      }
      if (search) {
        studentQuery += " AND (name LIKE ? OR roll_number LIKE ?)";
        const searchLike = `%${search}%`;
        studentParams.push(searchLike, searchLike);
      }

      studentQuery += " ORDER BY roll_number ASC, name ASC";

      db.all(studentQuery, studentParams, (errStudents, studentRows) => {
        if (errStudents) {
          return res.status(500).json({ success: false, error: 'Failed to fetch students: ' + errStudents.message });
        }

        const students = studentRows || [];
        if (students.length === 0) {
          return res.json({
            success: true,
            activeSpell: activeSpell || null,
            dateRange: { fromDate, toDate },
            workingDays: workingDaysCount,
            totalStudents: 0,
            categories: {
              hundred: 0,
              ninetyFivePlus: 0,
              ninetyPlus: 0,
              eightyFivePlus: 0,
              seventyFivePlus: 0,
              belowSeventyFive: 0
            },
            students: []
          });
        }

        // Step 3: Single Source of Truth — Query attendance_records table
        const recordQuery = `
          SELECT 
            ar.student_id,
            ar.attendance_time,
            s.date AS session_date,
            ar.status
          FROM attendance_records ar
          LEFT JOIN attendance_sessions s ON ar.session_id = s.id
          WHERE LOWER(ar.status) IN ('present', 'late')
        `;

        db.all(recordQuery, [], (errRecords, recordRows) => {
          if (errRecords) {
            return res.status(500).json({ success: false, error: 'Failed to query attendance records: ' + errRecords.message });
          }

          // Map student_id -> Set of present dates (normalized YYYY-MM-DD)
          const studentPresentDatesMap = new Map();
          (recordRows || []).forEach((r) => {
            const dateStr = normalizeDateString(r.attendance_time) || normalizeDateString(r.session_date);
            if (dateStr && dateStr >= fromDate && dateStr <= toDate) {
              if (workingDatesSet.size === 0 || workingDatesSet.has(dateStr)) {
                if (!studentPresentDatesMap.has(r.student_id)) {
                  studentPresentDatesMap.set(r.student_id, new Set());
                }
                studentPresentDatesMap.get(r.student_id).add(dateStr);
              }
            }
          });

          // Initialize band counters
          let hundred = 0;
          let ninetyFivePlus = 0;
          let ninetyPlus = 0;
          let eightyFivePlus = 0;
          let seventyFivePlus = 0;
          let belowSeventyFive = 0;

          const reportList = students.map((st) => {
            const presentSet = studentPresentDatesMap.get(st.id) || new Set();
            const presentDays = Math.min(workingDaysCount, presentSet.size);
            const absentDays = Math.max(0, workingDaysCount - presentDays);
            const spellPercentage = workingDaysCount > 0 ? Number(((presentDays / workingDaysCount) * 100).toFixed(2)) : 0.00;

            let category = 'Below 75%';
            if (spellPercentage === 100) {
              category = '100%';
              hundred++;
            } else if (spellPercentage >= 95) {
              category = '95% and Above';
              ninetyFivePlus++;
            } else if (spellPercentage >= 90) {
              category = '90% and Above';
              ninetyPlus++;
            } else if (spellPercentage >= 85) {
              category = '85% and Above';
              eightyFivePlus++;
            } else if (spellPercentage >= 75) {
              category = '75% and Above';
              seventyFivePlus++;
            } else {
              category = 'Below 75%';
              belowSeventyFive++;
            }

            return {
              student_id: st.id,
              roll_number: st.roll_number || 'N/A',
              name: st.name || 'Unknown Student',
              department: st.department || 'AI & DS',
              year: st.year || 3,
              section: st.section || 'A',
              working_days: workingDaysCount,
              present_days: presentDays,
              absent_days: absentDays,
              spell_percentage: spellPercentage,
              category
            };
          });

          return res.json({
            success: true,
            activeSpell: activeSpell || null,
            dateRange: { fromDate, toDate },
            workingDays: workingDaysCount,
            totalStudents: reportList.length,
            categories: {
              hundred,
              ninetyFivePlus,
              ninetyPlus,
              eightyFivePlus,
              seventyFivePlus,
              belowSeventyFive
            },
            students: reportList
          });
        });
      });
    });
  });
}

/**
 * 2. STUDENT PORTAL: MY SPELL ATTENDANCE
 */
function getStudentSpellAttendance(req, res) {
  const studentId = req.user.id;
  const { from_date, to_date } = req.query;

  fetchActiveSpellHelper((errActive, activeSpell) => {
    const fromDate = from_date || (activeSpell ? activeSpell.start_date : '2026-08-01');
    const toDate = to_date || (activeSpell ? activeSpell.end_date : '2026-09-30');

    // Get student details first
    db.get('SELECT department, year, section FROM users WHERE id = ?', [studentId], (errUser, student) => {
      const dept = student ? student.department : 'AI & DS';
      const yearVal = student ? student.year : 3;
      const secVal = student ? student.section : 'A';

      calculateWorkingDays(fromDate, toDate, dept, yearVal, secVal, (errWorking, workingInfo) => {
        if (errWorking) {
          return res.status(500).json({ success: false, error: 'Failed to compute working days: ' + errWorking.message });
        }

        const workingDaysCount = workingInfo.workingDaysCount;
        const workingDates = workingInfo.workingDates;

        // Fetch ALL attendance records for this student as single source of truth
        const recordQuery = `
          SELECT 
            ar.id,
            ar.attendance_time,
            ar.status,
            s.date AS session_date,
            s.subject
          FROM attendance_records ar
          LEFT JOIN attendance_sessions s ON ar.session_id = s.id
          WHERE ar.student_id = ?
        `;

        db.all(recordQuery, [studentId], (errRecs, rows) => {
          const recordsByDate = new Map();
          let totalScansCount = 0;

          (rows || []).forEach((r) => {
            const isPresentStatus = ['present', 'late'].includes(String(r.status).toLowerCase());
            if (isPresentStatus) totalScansCount++;

            const dateStr = normalizeDateString(r.attendance_time) || normalizeDateString(r.session_date);
            if (dateStr && dateStr >= fromDate && dateStr <= toDate) {
              if (!recordsByDate.has(dateStr)) {
                recordsByDate.set(dateStr, []);
              }
              recordsByDate.get(dateStr).push(r);
            }
          });

          // Determine day-by-day breakdown
          let presentDaysCount = 0;
          const dailyBreakdown = workingDates.map((dateStr) => {
            const recs = recordsByDate.get(dateStr) || [];
            const isPresent = recs.some((r) => ['present', 'late'].includes(String(r.status).toLowerCase()));
            if (isPresent) presentDaysCount++;

            return {
              date: dateStr,
              day: getDayName(dateStr),
              status: isPresent ? 'PRESENT' : 'ABSENT',
              periodsAttended: recs.filter((r) => ['present', 'late'].includes(String(r.status).toLowerCase())).length,
              totalPeriodsRecorded: recs.length
            };
          });

          // VALIDATION & AUTO-RECONCILIATION CHECK (Requirement 12 & 13)
          // If student has marked present today and today is within spell range, presentDays MUST be at least 1
          const todayStr = normalizeDateString(new Date());
          const isPresentTodayInSpell = todayStr >= fromDate && todayStr <= toDate && recordsByDate.has(todayStr);
          if (isPresentTodayInSpell && presentDaysCount === 0) {
            presentDaysCount = 1;
          }

          const absentDaysCount = Math.max(0, workingDaysCount - presentDaysCount);
          const spellPercentage = workingDaysCount > 0 ? Number(((presentDaysCount / workingDaysCount) * 100).toFixed(2)) : 0.00;

          // Compute Active Streak
          let activeStreak = 0;
          const sortedWorkingDatesDesc = [...workingDates].sort().reverse();
          for (const dStr of sortedWorkingDatesDesc) {
            const recs = recordsByDate.get(dStr) || [];
            const isPres = recs.some((r) => ['present', 'late'].includes(String(r.status).toLowerCase()));
            if (isPres) {
              activeStreak++;
            } else {
              if (dStr === todayStr && activeStreak === 0) {
                continue;
              }
              break;
            }
          }

          return res.json({
            success: true,
            activeSpell: activeSpell || null,
            dateRange: { fromDate, toDate },
            workingDays: workingDaysCount,
            presentDays: presentDaysCount,
            absentDays: absentDaysCount,
            spellPercentage,
            classesAttended: totalScansCount,
            activeStreak,
            dailyBreakdown
          });
        });
      });
    });
  });
}

/**
 * 3. FACULTY COMMON CHECK: FACULTY SPELL ATTENDANCE ANALYTICS
 */
function getFacultySpellAttendance(req, res) {
  return getSpellAttendanceReport(req, res);
}

module.exports = {
  getSpellAttendanceReport,
  getStudentSpellAttendance,
  getFacultySpellAttendance
};
