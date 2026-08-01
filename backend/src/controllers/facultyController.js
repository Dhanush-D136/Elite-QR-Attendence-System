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
        let rate = 100;
        if (total > 0) rate = Math.min(100, Math.round((attended / total) * 100));
        else if (attended > 0) rate = 100;
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
  db.all("SELECT id, faculty_code, name, department, designation, email, phone, password_hash, created_at FROM faculty", [], async (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch faculty stats' });

    const bcrypt = require('bcryptjs');
    const totalFaculty = rows ? rows.length : 0;
    const activeFaculty = totalFaculty; // All default active
    const inactiveFaculty = 0;

    let defaultPasswordCount = 0;
    let customPasswordCount = 0;

    for (const fac of rows || []) {
      const isDefault = await bcrypt.compare('1234', fac.password_hash);
      if (isDefault) defaultPasswordCount++;
      else customPasswordCount++;
    }

    // Active attendance sessions count
    db.get("SELECT COUNT(*) as active_count FROM attendance_sessions WHERE status = 'active'", [], (errSess, sessRow) => {
      res.json({
        totalFaculty,
        activeFaculty,
        inactiveFaculty,
        defaultPasswordCount,
        customPasswordCount,
        loggedInToday: Math.min(totalFaculty, 2),
        activeClassesCount: sessRow?.active_count || 0
      });
    });
  });
}

function adminGetFaculties(req, res) {
  db.all(
    `SELECT f.id, f.faculty_code, f.name, f.department, f.designation, f.email, f.phone, f.qualification, f.experience, f.specialization, f.profile_photo, f.password_hash, f.created_at,
            (SELECT GROUP_CONCAT(fs.subject_name, ', ') FROM faculty_subjects fs WHERE fs.faculty_id = f.id) as assigned_subjects
     FROM faculty f
     ORDER BY f.faculty_code ASC`,
    [],
    async (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch faculty accounts' });

      const bcrypt = require('bcryptjs');
      const formatted = [];

      for (const fac of rows || []) {
        const isDefaultPassword = await bcrypt.compare('1234', fac.password_hash);
        delete fac.password_hash;
        formatted.push({
          ...fac,
          password_status: isDefaultPassword ? 'Default Password' : 'Custom Password',
          status: 'Active'
        });
      }

      res.json({ faculties: formatted });
    }
  );
}

async function adminCreateFaculty(req, res) {
  const { faculty_code, name, department, designation, email, phone, qualification, experience, specialization, password } = req.body;
  if (!faculty_code || !name) {
    return res.status(400).json({ error: 'Faculty Code and Name are required' });
  }

  const cleanCode = faculty_code.trim().toUpperCase();
  const cleanEmail = (email || `${cleanCode.toLowerCase()}@velhightech.com`).trim().toLowerCase();
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password || '1234', 10);
  const photo = `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150`;

  db.run(
    `INSERT INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, cleanCode, name.trim(), department || 'AI & Data Science', designation || 'Assistant Professor', cleanEmail, phone || '+91 9876501234', qualification || 'M.Tech (AI & DS)', experience || '5 Years Teaching', specialization || 'Artificial Intelligence', photo, passwordHash],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Faculty Code or Email already exists in the system.' });
        }
        return res.status(500).json({ error: 'Failed to create faculty account: ' + err.message });
      }
      res.status(201).json({ message: `Faculty account ${cleanCode} created successfully with default password '1234'!`, id });
    }
  );
}

function adminUpdateFaculty(req, res) {
  const { id } = req.params;
  const { name, department, designation, email, phone, qualification, experience, specialization } = req.body;

  db.run(
    `UPDATE faculty SET name = COALESCE(?, name), department = COALESCE(?, department), designation = COALESCE(?, designation), email = COALESCE(?, email), phone = COALESCE(?, phone), qualification = COALESCE(?, qualification), experience = COALESCE(?, experience), specialization = COALESCE(?, specialization) WHERE id = ?`,
    [name, department, designation, email, phone, qualification, experience, specialization, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update faculty details' });
      res.json({ message: 'Faculty details updated successfully' });
    }
  );
}

async function adminResetFacultyPassword(req, res) {
  const { id } = req.params;
  const { new_password } = req.body;

  const targetPassword = new_password || '1234';
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(targetPassword, 10);

  db.run("UPDATE faculty SET password_hash = ? WHERE id = ?", [passwordHash, id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to reset faculty password' });
    res.json({ message: `Faculty password reset to '${targetPassword}' successfully!` });
  });
}

function adminDeleteFaculty(req, res) {
  const { id } = req.params;
  db.run("DELETE FROM faculty WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete faculty account' });
    db.run("DELETE FROM faculty_subjects WHERE faculty_id = ?", [id]);
    res.json({ message: 'Faculty account removed successfully' });
  });
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
  adminCreateFaculty,
  adminUpdateFaculty,
  adminResetFacultyPassword,
  adminDeleteFaculty
};
