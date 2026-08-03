const { db } = require('../database/db');
const { safeDateOnly, safeTimeOnly } = require('../utils/dateHelpers');

// Main Admin Dashboard Overview Metrics (100% Dynamic SQL)
function getDashboardMetrics(req, res) {
  db.get("SELECT COUNT(*) as total_students FROM users WHERE role = 'student'", [], (err, row1) => {
    const totalStudents = row1 ? row1.total_students : 0;

    db.get("SELECT COUNT(*) as active_sessions FROM attendance_sessions WHERE status = 'active'", [], (err, row2) => {
      const activeSessions = row2 ? row2.active_sessions : 0;

      const todayDate = new Date().toISOString().split('T')[0];
      db.get(
        "SELECT COUNT(DISTINCT student_id) as present_today FROM attendance_records WHERE DATE(attendance_time) = ?",
        [todayDate],
        (err, row3) => {
          const presentToday = row3 ? row3.present_today : 0;
          const absentToday = Math.max(0, totalStudents - presentToday);
          const attendancePercentage = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : null;

          db.all(
            `SELECT department, COUNT(id) as student_count 
             FROM users 
             WHERE role = 'student' 
             GROUP BY department`,
            [],
            (err, deptRows) => {
              db.all(
                `SELECT DATE(attendance_time) as date, COUNT(id) as count 
                 FROM attendance_records 
                 GROUP BY DATE(attendance_time) 
                 ORDER BY date DESC LIMIT 7`,
                [],
                (err, trendRows) => {
                  res.json({
                    overview: {
                      totalStudents,
                      presentToday,
                      absentToday,
                      attendancePercentage,
                      activeSessions,
                      totalDepartments: deptRows ? deptRows.length : 0
                    },
                    departmentStats: deptRows || [],
                    dailyTrends: (trendRows || []).reverse()
                  });
                }
              );
            }
          );
        }
      );
    });
  });
}

// Dynamic Subject-Centric Academic Reports Data (100% Dynamic SQL with Advanced Filters)
function getReportsData(req, res) {
  const {
    subject_name,
    subject_code,
    student_name,
    register_number,
    faculty_name,
    from_date,
    to_date,
    from_time,
    to_time,
    period_number,
    semester,
    section
  } = req.query;

  db.all('SELECT * FROM subjects WHERE is_archived = 0 ORDER BY name ASC', [], (err, subjects) => {
    let subjectList = subjects || [];

    // Filter subject list if subject parameters provided
    if (subject_name) {
      const sName = subject_name.toLowerCase().trim();
      subjectList = subjectList.filter((s) => s.name.toLowerCase().includes(sName) || s.code.toLowerCase().includes(sName));
    }
    if (subject_code) {
      const sCode = subject_code.toLowerCase().trim();
      subjectList = subjectList.filter((s) => s.code.toLowerCase().includes(sCode));
    }
    if (faculty_name) {
      const fName = faculty_name.toLowerCase().trim();
      subjectList = subjectList.filter((s) => (s.faculty_name || '').toLowerCase().includes(fName));
    }
    if (semester) {
      subjectList = subjectList.filter((s) => String(s.semester) === String(semester));
    }
    if (section) {
      subjectList = subjectList.filter((s) => (s.section || 'A').toUpperCase() === section.toUpperCase());
    }

    db.all("SELECT * FROM users WHERE role = 'student' ORDER BY roll_number ASC", [], (err, studentRows) => {
      let students = studentRows || [];

      if (student_name) {
        const stName = student_name.toLowerCase().trim();
        students = students.filter((st) => (st.name || '').toLowerCase().includes(stName));
      }
      if (register_number) {
        const regNo = register_number.toLowerCase().trim();
        students = students.filter((st) => (st.roll_number || st.email || '').toLowerCase().includes(regNo));
      }

      const totalStudents = students.length;

      // Query sessions with filters
      let sessionQuery = `SELECT s.id as session_id, s.subject, s.department, s.year, s.section, s.start_time, s.end_time, s.period_number, s.faculty_name FROM attendance_sessions s WHERE 1=1`;
      const sessionParams = [];

      if (section) {
        sessionQuery += ` AND UPPER(s.section) = UPPER(?)`;
        sessionParams.push(section);
      }
      if (period_number) {
        sessionQuery += ` AND (s.period_number = ? OR s.period_number LIKE ?)`;
        sessionParams.push(period_number, `%${period_number}%`);
      }

      db.all(sessionQuery, sessionParams, (errSession, sessions) => {
        let sessionList = sessions || [];

        // Date and Time filtering on sessions
        if (from_date) {
          sessionList = sessionList.filter((s) => {
            const sessDate = safeDateOnly(s.start_time);
            return sessDate >= from_date;
          });
        }
        if (to_date) {
          sessionList = sessionList.filter((s) => {
            const sessDate = safeDateOnly(s.start_time);
            return sessDate <= to_date;
          });
        }
        if (from_time) {
          sessionList = sessionList.filter((s) => {
            const timePart = safeTimeOnly(s.start_time);
            return timePart >= from_time;
          });
        }
        if (to_time) {
          sessionList = sessionList.filter((s) => {
            const timePart = safeTimeOnly(s.start_time);
            return timePart <= to_time;
          });
        }

        db.all(
          `SELECT ar.student_id, ar.session_id, ar.status, ar.attendance_time, s.subject
           FROM attendance_records ar
           JOIN attendance_sessions s ON ar.session_id = s.id`,
          [],
          (errRecords, recRows) => {
            const validSessionIds = new Set(sessionList.map((s) => s.session_id));
            const records = (recRows || []).filter((r) => validSessionIds.has(r.session_id));

            const todayDate = new Date().toISOString().split('T')[0];

            // Build per-subject statistics
            const subjectStats = subjectList.map((s) => {
              const matchedSessions = sessionList.filter(
                (sess) => sess.subject.toLowerCase() === s.name.toLowerCase() || sess.subject.toLowerCase() === s.code.toLowerCase()
              );
              const classesHeld = matchedSessions.length;
              const matchedSessionIds = new Set(matchedSessions.map((ms) => ms.session_id));
              
              const subjectRecords = records.filter((r) => matchedSessionIds.has(r.session_id));
              const totalPossible = classesHeld * Math.max(1, totalStudents);
              const totalPresentRecords = subjectRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
              
              // If total classes conducted is 0, percentage must be null (displayed as --)
              const avgPercentage = classesHeld > 0 && totalPossible > 0 
                ? Math.min(100, Math.round((totalPresentRecords / totalPossible) * 100)) 
                : null;
                
              const presentCount = totalStudents > 0 && avgPercentage !== null ? Math.round(totalStudents * (avgPercentage / 100)) : 0;
              const absentCount = Math.max(0, totalStudents - presentCount);

              // Find last session timestamp
              let lastClassDate = 'No sessions held';
              if (matchedSessions.length > 0) {
                const sortedSessions = [...matchedSessions].sort((a, b) => String(b.start_time || '').localeCompare(String(a.start_time || '')));
                const rawDate = sortedSessions[0].start_time;
                lastClassDate = rawDate ? new Date(rawDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently Conducted';
              }

              // Student-wise breakdown for this subject
              const subjectStudents = students.map((st) => {
                const stRecords = subjectRecords.filter((r) => r.student_id === st.id);
                const stPresentCount = stRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
                const stAbsentCount = Math.max(0, classesHeld - stPresentCount);
                
                // Crucial fix: If classesHeld = 0, stPct MUST be null (displayed as --), NOT 100%!
                const stPct = classesHeld > 0 ? Math.min(100, Math.round((stPresentCount / classesHeld) * 100)) : null;
                
                // Check if attended today
                const isPresentToday = stRecords.some((r) => String(r.attendance_time || '').startsWith(todayDate));
                
                // Get last attended date
                const sortedStRecords = [...stRecords].sort((a, b) => String(b.attendance_time || '').localeCompare(String(a.attendance_time || '')));
                const lastAttendedDate = sortedStRecords[0] ? new Date(sortedStRecords[0].attendance_time).toLocaleDateString() : 'Never';

                let statusStr = '--';
                if (stPct !== null) {
                  if (stPct >= 75) statusStr = 'Safe';
                  else if (stPct >= 65) statusStr = 'Warning';
                  else if (stPct >= 50) statusStr = 'High Risk';
                  else statusStr = 'Critical';
                }

                return {
                  id: st.id,
                  name: st.name,
                  roll_number: st.roll_number || st.email.split('@')[0],
                  email: st.email,
                  presentCount: stPresentCount,
                  absentCount: stAbsentCount,
                  percentage: stPct,
                  lastAttendedDate,
                  isPresentToday,
                  isAbsentToday: !isPresentToday,
                  status: statusStr
                };
              });

              const defaulterCount = subjectStudents.filter((st) => st.percentage !== null && st.percentage < 75).length;

              return {
                id: s.id,
                name: s.name,
                code: s.code,
                faculty_name: s.faculty_name || 'Faculty Member',
                classesHeld,
                totalSessions: classesHeld,
                avgPercentage,
                attendance_percentage: avgPercentage,
                presentCount,
                absentCount,
                lastClassDate,
                studentsBelow75: defaulterCount,
                defaulterCount,
                students: subjectStudents
              };
            });

            // Overall student stats
            const studentAttendanceMap = {};
            students.forEach((st) => {
              studentAttendanceMap[st.id] = { attended: 0, total: sessionList.length };
            });
            records.forEach((rec) => {
              if ((rec.status === 'present' || rec.status === 'late') && studentAttendanceMap[rec.student_id]) {
                studentAttendanceMap[rec.student_id].attended += 1;
              }
            });

            const studentStats = students.map((st) => {
              const stData = studentAttendanceMap[st.id] || { attended: 0, total: sessionList.length };
              const totalSess = sessionList.length;
              const pct = totalSess > 0 ? Math.min(100, Math.round((stData.attended / totalSess) * 100)) : null;

              let statusStr = '--';
              if (pct !== null) {
                if (pct >= 75) statusStr = 'Safe';
                else if (pct >= 65) statusStr = 'Warning';
                else if (pct >= 50) statusStr = 'High Risk';
                else statusStr = 'Critical';
              }

              return {
                id: st.id,
                name: st.name,
                roll_number: st.roll_number || st.email.split('@')[0],
                email: st.email,
                overallPercentage: pct,
                classesAttended: stData.attended,
                classesMissed: Math.max(0, totalSess - stData.attended),
                status: statusStr
              };
            });

            const defaulters = studentStats.filter((st) => st.overallPercentage !== null && st.overallPercentage < 75);

            db.get(
              "SELECT COUNT(DISTINCT student_id) as present_today FROM attendance_records WHERE DATE(attendance_time) = ?",
              [todayDate],
              (err, row3) => {
                const presentToday = row3 ? row3.present_today : 0;
                const absentToday = Math.max(0, totalStudents - presentToday);

                res.json({
                  overview: {
                    totalStudents,
                    todayPresent: presentToday,
                    todayAbsent: absentToday,
                    overallPercentage: totalStudents > 0 && sessionList.length > 0 ? Math.round((presentToday / totalStudents) * 100) : null,
                    classesConductedToday: sessionList.filter((s) => (s.start_time || '').startsWith(todayDate)).length
                  },
                  subjectStats,
                  studentStats,
                  defaulters
                });
              }
            );
          }
        );
      });
    });
  });
}

// Data Integrity Audit Tool (Auto Scan for corrupted/orphan/duplicate records)
function auditDataIntegrity(req, res) {
  db.get("SELECT COUNT(*) as orphan_students FROM attendance_records WHERE student_id NOT IN (SELECT id FROM users)", [], (err, r1) => {
    db.get("SELECT COUNT(*) as orphan_sessions FROM attendance_records WHERE session_id NOT IN (SELECT id FROM attendance_sessions)", [], (err, r2) => {
      db.get(
        `SELECT COUNT(*) as duplicate_scans FROM (
          SELECT student_id, session_id, COUNT(*) as cnt 
          FROM attendance_records 
          GROUP BY student_id, session_id 
          HAVING cnt > 1
        )`,
        [],
        (err, r3) => {
          db.get("SELECT COUNT(*) as invalid_sessions FROM attendance_sessions WHERE subject IS NULL OR subject = ''", [], (err, r4) => {
            db.get("SELECT COUNT(*) as total_records FROM attendance_records", [], (err, r5) => {
              const orphanStudents = r1 ? r1.orphan_students : 0;
              const orphanSessions = r2 ? r2.orphan_sessions : 0;
              const duplicateScans = r3 ? r3.duplicate_scans : 0;
              const invalidSessions = r4 ? r4.invalid_sessions : 0;
              const totalRecords = r5 ? r5.total_records : 0;

              const totalIssues = orphanStudents + orphanSessions + duplicateScans + invalidSessions;
              const healthScore = totalRecords > 0 
                ? Math.max(0, Math.round(((Math.max(1, totalRecords) - totalIssues) / Math.max(1, totalRecords)) * 100)) 
                : 100;

              res.json({
                healthScore,
                totalIssues,
                totalRecords,
                metrics: {
                  orphanStudents,
                  orphanSessions,
                  duplicateScans,
                  invalidSessions
                },
                status: totalIssues === 0 ? 'Healthy' : 'Action Required'
              });
            });
          });
        }
      );
    });
  });
}

// One-Click Data Integrity Repair Mechanism
function repairDataIntegrity(req, res) {
  let repairedOrphansNoStudent = 0;
  let repairedOrphansNoSession = 0;
  let repairedDuplicates = 0;
  let repairedSessions = 0;

  // 1. Delete orphan attendance records without valid student
  db.run("DELETE FROM attendance_records WHERE student_id NOT IN (SELECT id FROM users)", function (err1) {
    repairedOrphansNoStudent = this ? this.changes || 0 : 0;

    // 2. Delete orphan attendance records without valid session
    db.run("DELETE FROM attendance_records WHERE session_id NOT IN (SELECT id FROM attendance_sessions)", function (err2) {
      repairedOrphansNoSession = this ? this.changes || 0 : 0;

      // 3. Deduplicate attendance records (keep earliest id/timestamp per student per session)
      db.run(
        `DELETE FROM attendance_records 
         WHERE id NOT IN (
           SELECT MIN(id) 
           FROM attendance_records 
           GROUP BY student_id, session_id
         )`,
        function (err3) {
          repairedDuplicates = this ? this.changes || 0 : 0;

          // 4. Delete corrupted sessions with empty subjects
          db.run("DELETE FROM attendance_sessions WHERE subject IS NULL OR subject = ''", function (err4) {
            repairedSessions = this ? this.changes || 0 : 0;

            const totalRepaired = repairedOrphansNoStudent + repairedOrphansNoSession + repairedDuplicates + repairedSessions;

            res.json({
              message: `Data Integrity Repair Completed successfully! Cleaned ${totalRepaired} issue(s).`,
              totalRepaired,
              details: {
                repairedOrphansNoStudent,
                repairedOrphansNoSession,
                repairedDuplicates,
                repairedSessions
              }
            });
          });
        }
      );
    });
  });
}

module.exports = { getDashboardMetrics, getReportsData, auditDataIntegrity, repairDataIntegrity };
