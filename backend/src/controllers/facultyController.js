const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');

/**
 * Faculty Login - Authentication using Faculty ID (FAC001) or Official Email
 */
async function facultyLogin(req, res) {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Faculty ID / Email and Password are required' });
  }

  const cleanIdentifier = identifier.trim().toLowerCase();

  db.get(
    "SELECT * FROM faculty WHERE LOWER(faculty_code) = ? OR LOWER(email) = ?",
    [cleanIdentifier, cleanIdentifier],
    async (err, faculty) => {
      if (err) return res.status(500).json({ error: 'Database authentication query failed' });
      if (!faculty) {
        return res.status(401).json({ error: 'Invalid Faculty Credentials. Account not found.' });
      }

      const match = await bcrypt.compare(password, faculty.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid Faculty Password. Please try again.' });
      }

      // Log Faculty Activity
      const logId = uuidv4();
      db.run("INSERT INTO faculty_activity_logs (id, faculty_id, action, details) VALUES (?, ?, 'Faculty Login', 'Logged into Faculty Portal')", [logId, faculty.id]);

      // Remove sensitive hash from response
      delete faculty.password_hash;
      res.json({
        message: 'Faculty Sign-In Successful',
        user: { ...faculty, role: 'faculty' },
        token: `faculty_token_${faculty.id}_${Date.now()}`
      });
    }
  );
}

/**
 * Get Faculty Dashboard Overview & Today's Schedule
 */
function getFacultyDashboard(req, res) {
  const facultyId = req.query.faculty_id || 'FAC-001-ID';

  db.get("SELECT id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo FROM faculty WHERE id = ? OR faculty_code = ?", [facultyId, facultyId], (err, faculty) => {
    if (err || !faculty) {
      return res.status(404).json({ error: 'Faculty profile not found' });
    }

    // Get Assigned Subjects
    db.all("SELECT * FROM faculty_subjects WHERE faculty_id = ?", [faculty.id], (errSub, subjects) => {
      const assignedSubjects = subjects || [];

      // Get Today's Schedule from Timetables
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = days[new Date().getDay()] || 'Monday';

      db.all(
        "SELECT * FROM timetables WHERE LOWER(faculty_name) LIKE ? OR LOWER(faculty_name) LIKE ? ORDER BY start_time ASC",
        [`%${faculty.name.toLowerCase()}%`, `%nivetha%`],
        (errTt, timetableRows) => {
          const todayClasses = timetableRows || [
            { id: 'TT-01', day: 'Monday', period_number: 'P1', subject_name: 'Knowledge Engineering', start_time: '08:15', end_time: '09:05', room_number: 'F305', department: 'AI & DS', section: 'A' },
            { id: 'TT-02', day: 'Monday', period_number: 'P2', subject_name: 'Programming Language for AI', start_time: '09:05', end_time: '09:55', room_number: 'F305', department: 'AI & DS', section: 'A' },
            { id: 'TT-03', day: 'Monday', period_number: 'P5', subject_name: 'Web Technology', start_time: '11:50', end_time: '12:35', room_number: 'F305', department: 'AI & DS', section: 'A' }
          ];

          // Count active attendance session for this faculty
          db.get("SELECT * FROM attendance_sessions WHERE status = 'active' ORDER BY start_time DESC LIMIT 1", [], (errSess, activeSession) => {
            res.json({
              faculty,
              assignedSubjects,
              todayClasses,
              todayDay,
              activeSession: activeSession || null
            });
          });
        }
      );
    });
  });
}

/**
 * Get Students Assigned to Faculty's Classes with Attendance Rates
 */
function getFacultyStudents(req, res) {
  db.all(
    `SELECT u.id, u.name, u.roll_number, u.vh_number, u.email, u.department, u.year, u.section, u.phone, u.profile_photo, u.status,
            COUNT(DISTINCT ar.id) as attended_count,
            (SELECT COUNT(*) FROM attendance_sessions s WHERE s.department = u.department AND s.year = u.year AND s.section = u.section) as total_sessions
     FROM users u
     LEFT JOIN attendance_records ar ON u.id = ar.student_id
     WHERE u.role = 'student'
     GROUP BY u.id
     ORDER BY u.roll_number ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch student roster: ' + err.message });

      const students = (rows || []).map((st) => {
        const total = st.total_sessions || 0;
        const attended = st.attended_count || 0;
        let rate = 0;
        if (total > 0) rate = Math.min(100, Math.round((attended / total) * 100));
        else rate = 0;

        return {
          ...st,
          attendance_percentage: rate
        };
      });

      res.json({ students });
    }
  );
}

/**
 * Get Student Risk Detection Categorization
 */
function getStudentRiskDetection(req, res) {
  db.all(
    `SELECT u.id, u.name, u.roll_number, u.vh_number, u.email, u.department, u.year, u.section, u.phone, u.profile_photo,
            COUNT(DISTINCT ar.id) as attended_count,
            (SELECT COUNT(*) FROM attendance_sessions s WHERE s.department = u.department AND s.year = u.year AND s.section = u.section) as total_sessions
     FROM users u
     LEFT JOIN attendance_records ar ON u.id = ar.student_id
     WHERE u.role = 'student'
     GROUP BY u.id
     ORDER BY u.roll_number ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to calculate risk detection' });

      const categorized = {
        safe: [],      // >= 75%
        warning: [],   // 65% - 74%
        risk: [],      // 50% - 64%
        critical: []   // < 50%
      };

      (rows || []).forEach((st) => {
        const total = Math.max(1, st.total_sessions || 5);
        const attended = st.attended_count || 0;
        const pct = Math.min(100, Math.round((attended / total) * 100));
        const missed = Math.max(0, total - attended);
        const neededFor75 = pct < 75 ? Math.max(0, Math.ceil(3 * total - 4 * attended)) : 0;

        const studentData = {
          ...st,
          attendance_percentage: pct,
          classesAttended: attended,
          classesMissed: missed,
          totalClasses: total,
          neededFor75
        };

        if (pct >= 75) categorized.safe.push(studentData);
        else if (pct >= 65) categorized.warning.push(studentData);
        else if (pct >= 50) categorized.risk.push(studentData);
        else categorized.critical.push(studentData);
      });

      res.json(categorized);
    }
  );
}

/**
 * Faculty Remarks System (CRUD)
 */
function addFacultyRemark(req, res) {
  const { student_id, faculty_id, remark_type, comment } = req.body;
  if (!student_id || !comment) {
    return res.status(400).json({ error: 'Student ID and comment are required' });
  }

  const id = uuidv4();
  db.run(
    `INSERT INTO faculty_remarks (id, student_id, faculty_id, remark_type, comment) VALUES (?, ?, ?, ?, ?)`,
    [id, student_id, faculty_id || 'FAC-001-ID', remark_type || 'Needs Attention', comment.trim()],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to add faculty remark' });
      res.json({ message: 'Faculty remark recorded successfully', id });
    }
  );
}

function getFacultyRemarks(req, res) {
  const { student_id } = req.params;
  db.all(
    `SELECT r.*, f.name as faculty_name FROM faculty_remarks r LEFT JOIN faculty f ON r.faculty_id = f.id WHERE r.student_id = ? ORDER BY r.created_at DESC`,
    [student_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch remarks' });
      res.json({ remarks: rows || [] });
    }
  );
}

/**
 * Faculty Document Center
 */
function uploadFacultyDocument(req, res) {
  const { faculty_id, subject_code, unit, title, file_url, file_type } = req.body;
  if (!title || !file_url) {
    return res.status(400).json({ error: 'Document Title and File URL are required' });
  }

  const id = uuidv4();
  db.run(
    `INSERT INTO faculty_documents (id, faculty_id, subject_code, unit, title, file_url, file_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, faculty_id || 'FAC-001-ID', subject_code || '21AI51T', unit || 'Unit 1', title.trim(), file_url.trim(), file_type || 'PDF'],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to save document' });
      res.json({ message: 'Course material uploaded successfully', id });
    }
  );
}

function getFacultyDocuments(req, res) {
  db.all(`SELECT * FROM faculty_documents ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch documents' });
    res.json({ documents: rows || [] });
  });
}

/**
 * Faculty Leave Requests
 */
function submitLeaveRequest(req, res) {
  const { faculty_id, leave_type, start_date, end_date, reason } = req.body;
  if (!start_date || !reason) {
    return res.status(400).json({ error: 'Start Date and Reason are required' });
  }

  const id = uuidv4();
  db.run(
    `INSERT INTO faculty_leave_requests (id, faculty_id, leave_type, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
    [id, faculty_id || 'FAC-001-ID', leave_type || 'Casual Leave', start_date, end_date || start_date, reason.trim()],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to submit leave request' });
      res.json({ message: 'Leave application submitted successfully for Admin approval', id });
    }
  );
}

function getFacultyLeaveRequests(req, res) {
  db.all(`SELECT * FROM faculty_leave_requests ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch leave applications' });
    res.json({ leaveRequests: rows || [] });
  });
}

/**
 * Faculty Profile Update (Restricted non-editable ID/subjects)
 */
function updateFacultyProfile(req, res) {
  const { id } = req.params;
  const { phone, qualification, experience, specialization, profile_photo } = req.body;

  db.run(
    `UPDATE faculty SET phone = COALESCE(?, phone), qualification = COALESCE(?, qualification), experience = COALESCE(?, experience), specialization = COALESCE(?, specialization), profile_photo = COALESCE(?, profile_photo) WHERE id = ?`,
    [phone, qualification, experience, specialization, profile_photo, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update faculty profile' });
      res.json({ message: 'Faculty profile details updated successfully' });
    }
  );
}

/**
 * Admin Faculty Management CRUD & Security Control Center Endpoints
 */
function adminGetFacultyManagementStats(req, res) {
  db.all("SELECT id, faculty_code, name, department, designation, email, phone, status, password_hash, created_at FROM faculty", [], async (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch faculty stats' });

    const bcrypt = require('bcryptjs');
    const totalFaculty = rows ? rows.length : 0;
    let activeFaculty = 0;
    let inactiveFaculty = 0;
    let lockedFaculty = 0;
    let defaultPasswordCount = 0;
    let customPasswordCount = 0;

    for (const fac of rows || []) {
      const st = fac.status || 'Active';
      if (st === 'Active') activeFaculty++;
      else if (st === 'Locked') lockedFaculty++;
      else inactiveFaculty++;

      const isDefault = await bcrypt.compare('1234', fac.password_hash);
      if (isDefault) defaultPasswordCount++;
      else customPasswordCount++;
    }

    db.get("SELECT COUNT(DISTINCT faculty_id) as logged_today FROM faculty_activity_logs WHERE DATE(timestamp) = DATE('now')", [], (errLog, logRow) => {
      db.get("SELECT COUNT(*) as active_count FROM attendance_sessions WHERE status = 'active'", [], (errSess, sessRow) => {
        res.json({
          totalFaculty,
          activeFaculty,
          inactiveFaculty,
          lockedFaculty,
          defaultPasswordCount,
          customPasswordCount,
          loggedInToday: logRow?.logged_today || Math.min(totalFaculty, 2),
          activeClassesCount: sessRow?.active_count || 0
        });
      });
    });
  });
}

function adminGetFaculties(req, res) {
  db.all(
    `SELECT f.id, f.faculty_code, f.name, f.department, f.designation, f.email, f.phone, f.qualification, f.experience, f.specialization, f.profile_photo, f.status, f.password_changed, f.must_change_password, f.last_login, f.password_hash, f.created_at,
            (SELECT GROUP_CONCAT(DISTINCT fs.subject_name) FROM faculty_subject_mapping fs WHERE fs.faculty_id = f.id) as assigned_subjects_mapped,
            (SELECT GROUP_CONCAT(DISTINCT fs2.subject_name) FROM faculty_subjects fs2 WHERE fs2.faculty_id = f.id) as assigned_subjects_legacy,
            (SELECT GROUP_CONCAT(DISTINCT fs3.section) FROM faculty_subject_mapping fs3 WHERE fs3.faculty_id = f.id) as assigned_sections,
            (SELECT COUNT(*) FROM attendance_sessions s WHERE LOWER(s.faculty_name) LIKE '%' || LOWER(f.name) || '%') as sessions_conducted_count
     FROM faculty f
     ORDER BY f.faculty_code ASC`,
    [],
    async (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch faculty accounts: ' + err.message });

      const bcrypt = require('bcryptjs');
      const formatted = [];

      for (const fac of rows || []) {
        const isDefaultPassword = await bcrypt.compare('1234', fac.password_hash);
        delete fac.password_hash;

        const subjects = fac.assigned_subjects_mapped || fac.assigned_subjects_legacy || 'Knowledge Engineering, Web Tech';
        const sections = fac.assigned_sections || 'A';

        formatted.push({
          ...fac,
          status: fac.status || 'Active',
          password_status: (isDefaultPassword || fac.must_change_password === 1) ? 'Default Password' : 'Custom Password',
          assigned_subjects: subjects,
          assigned_sections: sections
        });
      }

      res.json({ faculties: formatted });
    }
  );
}

function adminGetFacultyDetails(req, res) {
  const { id } = req.params;

  db.get(
    `SELECT f.*, 
            (SELECT COUNT(*) FROM attendance_sessions s WHERE LOWER(s.faculty_name) LIKE '%' || LOWER(f.name) || '%') as sessions_conducted_count
     FROM faculty f WHERE f.id = ? OR f.faculty_code = ?`,
    [id, id],
    (err, faculty) => {
      if (err || !faculty) return res.status(404).json({ error: 'Faculty account not found' });
      delete faculty.password_hash;

      // Get Subject Mappings
      db.all(`SELECT * FROM faculty_subject_mapping WHERE faculty_id = ?`, [faculty.id], (errSub, subjects) => {
        // Get Timetable Mappings
        db.all(
          `SELECT t.* FROM timetables t WHERE LOWER(t.faculty_name) LIKE '%' || LOWER(?) || '%' OR LOWER(t.faculty_name) LIKE '%nivetha%' ORDER BY t.start_time ASC`,
          [faculty.name],
          (errTt, timetables) => {
            // Get Activity Logs
            db.all(
              `SELECT * FROM faculty_activity_logs WHERE faculty_id = ? ORDER BY timestamp DESC LIMIT 15`,
              [faculty.id],
              (errLogs, activityLogs) => {
                res.json({
                  faculty: {
                    ...faculty,
                    status: faculty.status || 'Active'
                  },
                  assignedSubjects: subjects || [],
                  timetables: timetables || [],
                  activityLogs: activityLogs || []
                });
              }
            );
          }
        );
      });
    }
  );
}

async function adminCreateFaculty(req, res) {
  const { faculty_code, name, department, designation, email, phone, qualification, experience, specialization, password, status, profile_photo, assigned_subjects } = req.body;
  if (!faculty_code || !name) {
    return res.status(400).json({ error: 'Faculty Code and Name are required' });
  }

  const cleanCode = faculty_code.trim().toUpperCase();
  const cleanEmail = (email || `${cleanCode.toLowerCase()}@velhightech.com`).trim().toLowerCase();
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password || '1234', 10);
  const photo = profile_photo || `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150`;
  const facultyStatus = status || 'Active';

  db.run(
    `INSERT INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, status, password_hash, password_changed, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [id, cleanCode, name.trim(), department || 'AI & Data Science', designation || 'Assistant Professor', cleanEmail, phone || '+91 9876501234', qualification || 'M.Tech (AI & DS)', experience || '5 Years Teaching', specialization || 'Artificial Intelligence', photo, facultyStatus, passwordHash],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Faculty Code or Email already exists in the system.' });
        }
        return res.status(500).json({ error: 'Failed to create faculty account: ' + err.message });
      }

      // Add Subject Mappings if provided
      if (assigned_subjects && Array.isArray(assigned_subjects)) {
        assigned_subjects.forEach((sub) => {
          const mapId = uuidv4();
          const subName = typeof sub === 'string' ? sub : sub.subject_name;
          const subCode = typeof sub === 'object' ? sub.subject_code : '21AI51T';
          db.run(
            `INSERT INTO faculty_subject_mapping (id, faculty_id, subject_name, subject_code, department, year, section) VALUES (?, ?, ?, ?, ?, 3, 'A')`,
            [mapId, id, subName, subCode, department || 'AI & DS']
          );
        });
      } else {
        // Default Subject Mappings
        const mapId1 = uuidv4();
        db.run(
          `INSERT INTO faculty_subject_mapping (id, faculty_id, subject_name, subject_code, department, year, section) VALUES (?, ?, 'Knowledge Engineering', '21AI55T', ?, 3, 'A')`,
          [mapId1, id, department || 'AI & DS']
        );
      }

      // Log Activity
      db.run(`INSERT INTO faculty_activity_logs (id, faculty_id, action, details) VALUES (?, ?, 'Account Created', 'Faculty account created by Administrator')`, [uuidv4(), id]);

      res.status(201).json({ message: `Faculty account ${cleanCode} created successfully!`, id });
    }
  );
}

function adminUpdateFaculty(req, res) {
  const { id } = req.params;
  const { name, department, designation, email, phone, qualification, experience, specialization, status, profile_photo, assigned_subjects } = req.body;

  db.run(
    `UPDATE faculty SET name = COALESCE(?, name), department = COALESCE(?, department), designation = COALESCE(?, designation), email = COALESCE(?, email), phone = COALESCE(?, phone), qualification = COALESCE(?, qualification), experience = COALESCE(?, experience), specialization = COALESCE(?, specialization), status = COALESCE(?, status), profile_photo = COALESCE(?, profile_photo), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, department, designation, email, phone, qualification, experience, specialization, status, profile_photo, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update faculty details: ' + err.message });

      // Update Subject Mappings if provided
      if (assigned_subjects && Array.isArray(assigned_subjects)) {
        db.run(`DELETE FROM faculty_subject_mapping WHERE faculty_id = ?`, [id], () => {
          assigned_subjects.forEach((sub) => {
            const mapId = uuidv4();
            const subName = typeof sub === 'string' ? sub : sub.subject_name;
            const subCode = typeof sub === 'object' ? sub.subject_code : '21AI51T';
            db.run(
              `INSERT INTO faculty_subject_mapping (id, faculty_id, subject_name, subject_code, department, year, section) VALUES (?, ?, ?, ?, ?, 3, 'A')`,
              [mapId, id, subName, subCode, department || 'AI & DS']
            );
          });
        });
      }

      // Sync updated faculty name to timetables if name changed
      if (name) {
        db.run(`UPDATE timetables SET faculty_name = ? WHERE faculty_name LIKE '%' || ? || '%'`, [name, name]);
      }

      res.json({ message: 'Faculty details updated successfully' });
    }
  );
}

async function adminResetFacultyPassword(req, res) {
  const { id } = req.params;
  const { new_password, action, status } = req.body;

  // Handle Account Lock / Unlock action
  if (action === 'lock' || status === 'Locked') {
    return db.run("UPDATE faculty SET status = 'Locked' WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ error: 'Failed to lock faculty account' });
      db.run("INSERT INTO faculty_activity_logs (id, faculty_id, action, details) VALUES (?, ?, 'Account Locked', 'Account locked by Administrator')", [uuidv4(), id]);
      res.json({ message: 'Faculty account locked successfully.' });
    });
  }

  if (action === 'unlock' || status === 'Active') {
    return db.run("UPDATE faculty SET status = 'Active' WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ error: 'Failed to unlock faculty account' });
      db.run("INSERT INTO faculty_activity_logs (id, faculty_id, action, details) VALUES (?, ?, 'Account Unlocked', 'Account unlocked by Administrator')", [uuidv4(), id]);
      res.json({ message: 'Faculty account unlocked successfully.' });
    });
  }

  // Handle Forced Password Change Flag
  if (action === 'force_change') {
    return db.run("UPDATE faculty SET must_change_password = 1, password_changed = 0 WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ error: 'Failed to force password change' });
      db.run("INSERT INTO faculty_activity_logs (id, faculty_id, action, details) VALUES (?, ?, 'Force Password Change', 'Flagged to force password change on next login')", [uuidv4(), id]);
      res.json({ message: 'Faculty account flagged to force password change on next login!' });
    });
  }

  // Default: Password Reset
  const targetPassword = new_password || '1234';
  const passwordHash = await bcrypt.hash(targetPassword, 10);

  db.run(
    "UPDATE faculty SET password_hash = ?, password_changed = 0, must_change_password = 0 WHERE id = ?",
    [passwordHash, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to reset faculty password' });
      db.run("INSERT INTO faculty_activity_logs (id, faculty_id, action, details) VALUES (?, ?, 'Password Reset', 'Password reset by Administrator')", [uuidv4(), id]);
      res.json({ message: `Faculty password reset to '${targetPassword}' successfully!` });
    }
  );
}

function adminDeleteFaculty(req, res) {
  const { id } = req.params;

  db.run("DELETE FROM faculty WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete faculty account' });

    // Cascade hard delete from all mapping tables
    db.run("DELETE FROM faculty_subject_mapping WHERE faculty_id = ?", [id]);
    db.run("DELETE FROM faculty_subjects WHERE faculty_id = ?", [id]);
    db.run("DELETE FROM faculty_timetable_mapping WHERE faculty_id = ?", [id]);
    db.run("DELETE FROM faculty_activity_logs WHERE faculty_id = ?", [id]);
    db.run("DELETE FROM faculty_remarks WHERE faculty_id = ?", [id]);
    db.run("DELETE FROM faculty_documents WHERE faculty_id = ?", [id]);
    db.run("DELETE FROM faculty_leave_requests WHERE faculty_id = ?", [id]);

    res.json({ message: 'Faculty account permanently removed successfully' });
  });
}

function adminGetFacultyLoginActivity(req, res) {
  db.all(
    `SELECT l.*, f.name as faculty_name, f.faculty_code, f.email, f.department
     FROM faculty_activity_logs l
     LEFT JOIN faculty f ON l.faculty_id = f.id
     ORDER BY l.timestamp DESC LIMIT 100`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch login activity logs' });
      res.json({ logs: rows || [] });
    }
  );
}

module.exports = {
  facultyLogin,
  getFacultyDashboard,
  getFacultyStudents,
  getStudentRiskDetection,
  addFacultyRemark,
  getFacultyRemarks,
  uploadFacultyDocument,
  getFacultyDocuments,
  submitLeaveRequest,
  getFacultyLeaveRequests,
  updateFacultyProfile,
  adminGetFacultyManagementStats,
  adminGetFaculties,
  adminGetFacultyDetails,
  adminCreateFaculty,
  adminUpdateFaculty,
  adminResetFacultyPassword,
  adminDeleteFaculty,
  adminGetFacultyLoginActivity
};
