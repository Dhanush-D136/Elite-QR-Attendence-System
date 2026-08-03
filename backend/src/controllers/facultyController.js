const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

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

      const isDefault = Boolean(faculty.password_changed === 0 || faculty.must_change_password === 1 || password === '1234');

      // Log Faculty Activity
      const logId = uuidv4();
      db.run("INSERT INTO faculty_activity_logs (id, faculty_id, action, details) VALUES (?, ?, 'Faculty Login', 'Logged into Faculty Portal')", [logId, faculty.id]);

      // Generate signed JWT token
      const token = jwt.sign(
        { id: faculty.id, name: faculty.name, role: 'faculty', email: faculty.email, faculty_code: faculty.faculty_code || faculty.code },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Remove sensitive hash from response
      delete faculty.password_hash;
      res.json({
        message: 'Faculty Sign-In Successful',
        user: {
          ...faculty,
          role: 'faculty',
          first_login: isDefault,
          is_first_login: isDefault,
          must_change_password: isDefault ? 1 : 0,
          password_changed: !isDefault
        },
        token
      });
    }
  );
}

/**
 * Faculty Self-Service & First-Login Password Change
 */
async function facultyChangePassword(req, res) {
  const { current_password, new_password, confirm_password, faculty_id } = req.body;
  const targetId = faculty_id || (req.user && req.user.id);

  if (!targetId) {
    return res.status(400).json({ error: 'Faculty ID is required' });
  }

  if (confirm_password !== undefined && new_password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (!new_password || new_password.trim().length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
  }

  db.get('SELECT * FROM faculty WHERE id = ? OR faculty_code = ?', [targetId, targetId], async (err, faculty) => {
    if (err || !faculty) return res.status(404).json({ error: 'Faculty account not found' });

    if (current_password) {
      let isValid = await bcrypt.compare(current_password, faculty.password_hash);
      if (!isValid && current_password !== '1234') {
        return res.status(400).json({ error: 'Invalid current password' });
      }
    }

    const newHash = await bcrypt.hash(new_password.trim(), 10);
    const now = new Date().toISOString();

    db.run(
      'UPDATE faculty SET password_hash = ?, must_change_password = 0, password_changed = 1, updated_at = ? WHERE id = ?',
      [newHash, now, faculty.id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update faculty password: ' + err.message });

        db.run(
          `INSERT INTO faculty_activity_logs (id, faculty_id, action, details) VALUES (?, ?, 'Password Changed', 'Faculty updated password successfully')`,
          [uuidv4(), faculty.id]
        );

        const token = jwt.sign(
          { id: faculty.id, name: faculty.name, role: 'faculty', email: faculty.email, faculty_code: faculty.faculty_code || faculty.code },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        delete faculty.password_hash;
        res.json({
          message: 'Faculty password updated successfully.',
          token,
          user: {
            ...faculty,
            role: 'faculty',
            first_login: false,
            is_first_login: false,
            must_change_password: 0,
            password_changed: 1
          }
        });
      }
    );
  });
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

      // Get Today's & Weekly Schedule dynamically from Master Timetables table
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = days[new Date().getDay()] || 'Monday';

      const searchParam = `%${faculty.name.toLowerCase()}%`;
      db.all(
        `SELECT * FROM timetables 
         WHERE (faculty_id = ? OR LOWER(faculty_name) LIKE ?) 
           AND (status = 'ACTIVE' OR status IS NULL)
         ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END, CAST(period_number AS INTEGER) ASC, start_time ASC`,
        [faculty.id, searchParam],
        (errTt, timetableRows) => {
          const allClasses = timetableRows || [];
          const todayClasses = allClasses.filter((t) => (t.day || '').toLowerCase() === todayDay.toLowerCase());

          // Count active attendance session for this faculty
          db.get("SELECT * FROM attendance_sessions WHERE status = 'active' ORDER BY start_time DESC LIMIT 1", [], (errSess, activeSession) => {
            res.json({
              faculty,
              assignedSubjects,
              todayClasses,
              weeklyTimetable: allClasses,
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
    `SELECT f.id, f.faculty_code, f.name, f.department, f.designation, f.email, f.phone, f.qualification, f.experience, f.specialization, f.joining_date, f.assigned_class, f.assigned_section, f.profile_photo, f.status, f.password_changed, f.must_change_password, f.last_login, f.password_hash, f.created_at,
            (SELECT GROUP_CONCAT(DISTINCT fs.subject_name) FROM faculty_subject_mapping fs WHERE fs.faculty_id = f.id) as assigned_subjects_mapped,
            (SELECT GROUP_CONCAT(DISTINCT fs2.subject_name) FROM faculty_subjects fs2 WHERE fs2.faculty_id = f.id) as assigned_subjects_legacy,
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

        const subjects = fac.assigned_subjects_mapped || fac.assigned_subjects_legacy || '';
        const sections = fac.assigned_section || 'A';

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
          `SELECT t.* FROM timetables t WHERE LOWER(t.faculty_name) LIKE '%' || LOWER(?) || '%' ORDER BY t.start_time ASC`,
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
  const { faculty_code, name, department, designation, email, phone, qualification, experience, specialization, joining_date, assigned_class, assigned_section, password, status, profile_photo, assigned_subjects } = req.body;
  if (!faculty_code || !name) {
    return res.status(400).json({ error: 'Faculty Code and Name are required' });
  }

  const cleanCode = faculty_code.trim().toUpperCase();
  const cleanEmail = (email && email.trim() !== '') ? email.trim().toLowerCase() : `${cleanCode.toLowerCase()}@velhightech.com`;
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password || '1234', 10);
  const photo = profile_photo || `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150`;
  const facultyStatus = status || 'Active';

  // Upfront duplication check for friendly user error response
  db.get(
    `SELECT id, faculty_code, name, email FROM faculty WHERE LOWER(faculty_code) = LOWER(?) OR LOWER(email) = LOWER(?)`,
    [cleanCode, cleanEmail],
    (checkErr, existing) => {
      if (existing) {
        if (existing.faculty_code.toLowerCase() === cleanCode.toLowerCase()) {
          return res.status(409).json({
            error: `Faculty Code '${cleanCode}' is already registered for ${existing.name}. Please use a unique Faculty Code or edit the existing account.`
          });
        }
        if (existing.email.toLowerCase() === cleanEmail.toLowerCase()) {
          return res.status(409).json({
            error: `Official Email ID '${cleanEmail}' is already registered for ${existing.name}. Please use a unique email address or edit the existing account.`
          });
        }
      }

      db.run(
        `INSERT INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, joining_date, assigned_class, assigned_section, profile_photo, status, password_hash, password_changed, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [id, cleanCode, name.trim(), department || 'AI & Data Science', designation || 'Assistant Professor', cleanEmail, phone || '+91 9876501234', qualification || 'M.Tech (AI & DS)', experience || '5 Years Teaching', specialization || 'Artificial Intelligence', joining_date || new Date().toISOString().split('T')[0], assigned_class || 'AI&DS III-A', assigned_section || 'A', photo, facultyStatus, passwordHash],
        function (err) {
          if (err) {
            if (
              err.message.includes('UNIQUE constraint failed') ||
              err.message.includes('unique constraint') ||
              err.message.includes('duplicate key')
            ) {
              if (err.message.includes('email') || err.message.includes('faculty_email_key')) {
                return res.status(409).json({ error: `Official Email ID '${cleanEmail}' is already registered in the system. Please use a unique email address.` });
              }
              if (err.message.includes('faculty_code') || err.message.includes('faculty_faculty_code_key')) {
                return res.status(409).json({ error: `Faculty Code '${cleanCode}' is already registered in the system. Please use a unique Faculty Code.` });
              }
              return res.status(409).json({ error: 'Faculty Code or Email already exists in the system.' });
            }
            return res.status(500).json({ error: 'Failed to create faculty account: ' + err.message });
          }

          // Add Subject Mappings if provided
          if (assigned_subjects && Array.isArray(assigned_subjects) && assigned_subjects.length > 0) {
            assigned_subjects.forEach((sub) => {
              const mapId1 = uuidv4();
              const mapId2 = uuidv4();
              const subName = typeof sub === 'string' ? sub : (sub.subject_name || sub.name);
              const subCode = typeof sub === 'object' ? (sub.subject_code || sub.code || '21AI51T') : '21AI51T';
              const subId = typeof sub === 'object' ? sub.id : null;

              db.run(
                `INSERT INTO faculty_subject_mapping (id, faculty_id, subject_id, subject_name, subject_code, department, year, section) VALUES (?, ?, ?, ?, ?, ?, 3, ?)`,
                [mapId1, id, subId, subName, subCode, department || 'AI & DS', assigned_section || 'A']
              );
              db.run(
                `INSERT INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES (?, ?, ?, ?, ?, 3, ?)`,
                [mapId2, id, subCode, subName, department || 'AI & DS', assigned_section || 'A']
              );
            });
          }

          // Log Activity
          db.run(`INSERT INTO faculty_activity_logs (id, faculty_id, action, details) VALUES (?, ?, 'Account Created', 'Faculty account created by Administrator')`, [uuidv4(), id]);

          res.status(201).json({ message: `Faculty account ${cleanCode} created successfully!`, id });
        }
      );
    }
  );
}

function adminUpdateFaculty(req, res) {
  const { id } = req.params;
  const { name, department, designation, email, phone, qualification, experience, specialization, joining_date, assigned_class, assigned_section, status, profile_photo, assigned_subjects } = req.body;

  db.run(
    `UPDATE faculty SET name = COALESCE(?, name), department = COALESCE(?, department), designation = COALESCE(?, designation), email = COALESCE(?, email), phone = COALESCE(?, phone), qualification = COALESCE(?, qualification), experience = COALESCE(?, experience), specialization = COALESCE(?, specialization), joining_date = COALESCE(?, joining_date), assigned_class = COALESCE(?, assigned_class), assigned_section = COALESCE(?, assigned_section), status = COALESCE(?, status), profile_photo = COALESCE(?, profile_photo), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, department, designation, email, phone, qualification, experience, specialization, joining_date, assigned_class, assigned_section, status, profile_photo, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update faculty details: ' + err.message });

      // Update Subject Mappings if provided
      if (assigned_subjects && Array.isArray(assigned_subjects)) {
        db.run(`DELETE FROM faculty_subject_mapping WHERE faculty_id = ?`, [id], () => {
          db.run(`DELETE FROM faculty_subjects WHERE faculty_id = ?`, [id], () => {
            assigned_subjects.forEach((sub) => {
              const mapId1 = uuidv4();
              const mapId2 = uuidv4();
              const subName = typeof sub === 'string' ? sub : (sub.subject_name || sub.name);
              const subCode = typeof sub === 'object' ? (sub.subject_code || sub.code || '21AI51T') : '21AI51T';
              const subId = typeof sub === 'object' ? sub.id : null;

              db.run(
                `INSERT INTO faculty_subject_mapping (id, faculty_id, subject_id, subject_name, subject_code, department, year, section) VALUES (?, ?, ?, ?, ?, ?, 3, ?)`,
                [mapId1, id, subId, subName, subCode, department || 'AI & DS', assigned_section || 'A']
              );
              db.run(
                `INSERT INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES (?, ?, ?, ?, ?, 3, ?)`,
                [mapId2, id, subCode, subName, department || 'AI & DS', assigned_section || 'A']
              );
            });
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
  const forceFlag = (targetPassword === '1234') ? 1 : 0;

  db.run(
    "UPDATE faculty SET password_hash = ?, password_changed = ?, must_change_password = ? WHERE id = ?",
    [passwordHash, forceFlag === 1 ? 0 : 1, forceFlag, id],
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

function getFacultyAttendanceAnalytics(req, res) {
  const user = req.user;
  const requestedFacultyId = req.query.faculty_id || (user ? user.id : null);
  const facultyName = user ? user.name : '';

  db.get(
    `SELECT * FROM faculty WHERE id = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(email)) = LOWER(TRIM(?))`,
    [requestedFacultyId, facultyName, user ? user.email : ''],
    (err, facRow) => {
      const facId = facRow ? facRow.id : requestedFacultyId;
      const fName = facRow ? facRow.name : facultyName;

      db.all(
        `SELECT DISTINCT subject_name, subject_code, department, year, section, semester 
         FROM faculty_subject_mapping WHERE faculty_id = ?
         UNION
         SELECT DISTINCT subject_name, subject_code, department, year, section, 5 as semester 
         FROM faculty_subjects WHERE faculty_id = ?
         UNION
         SELECT DISTINCT name as subject_name, code as subject_code, department, year, section, semester 
         FROM subjects WHERE LOWER(TRIM(faculty_name)) = LOWER(TRIM(?)) AND (is_archived = 0 OR is_archived IS NULL)`,
        [facId, facId, fName],
        (errSub, assignedSubs) => {
          const subjectList = assignedSubs || [];
          const assignedSubNames = new Set(subjectList.map((s) => (s.subject_name || '').toLowerCase()));
          const assignedSubCodes = new Set(subjectList.map((s) => (s.subject_code || '').toLowerCase()));

          db.all(`SELECT * FROM subjects WHERE (is_archived = 0 OR is_archived IS NULL)`, [], (errAllSub, allSubjects) => {
            db.all(`SELECT * FROM attendance_sessions ORDER BY start_time DESC`, [], (errSess, allSessions) => {
              let sessions = allSessions || [];

              if (user && user.role === 'faculty') {
                sessions = sessions.filter((s) => {
                  const sName = (s.subject || '').toLowerCase();
                  return assignedSubNames.has(sName) || assignedSubCodes.has(sName) || (s.faculty_name || '').toLowerCase() === fName.toLowerCase();
                });
              }

              const { preset, subject, department, year, section, period, date, from_date, to_date } = req.query;

              if (subject) {
                const subFilter = subject.toLowerCase().trim();
                sessions = sessions.filter((s) => (s.subject || '').toLowerCase().includes(subFilter));
              }
              if (department) {
                sessions = sessions.filter((s) => (s.department || '').toLowerCase() === department.toLowerCase());
              }
              if (year) {
                sessions = sessions.filter((s) => String(s.year) === String(year));
              }
              if (section) {
                sessions = sessions.filter((s) => (s.section || 'A').toUpperCase() === section.toUpperCase());
              }
              if (period) {
                sessions = sessions.filter((s) => String(s.period_number || '').toLowerCase().includes(String(period).toLowerCase()));
              }

              const now = new Date();
              const todayStr = now.toISOString().split('T')[0];

              if (date) {
                sessions = sessions.filter((s) => (s.start_time || '').startsWith(date) || (s.date && s.date === date));
              } else if (preset === 'today') {
                sessions = sessions.filter((s) => (s.start_time || '').startsWith(todayStr) || (s.date && s.date === todayStr));
              } else if (preset === 'yesterday') {
                const yest = new Date(now);
                yest.setDate(yest.getDate() - 1);
                const yestStr = yest.toISOString().split('T')[0];
                sessions = sessions.filter((s) => (s.start_time || '').startsWith(yestStr) || (s.date && s.date === yestStr));
              } else if (preset === 'current_week') {
                const dayOfWeek = now.getDay();
                const diffToMon = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                const monday = new Date(now.setDate(diffToMon));
                const mondayStr = monday.toISOString().split('T')[0];
                sessions = sessions.filter((s) => {
                  const sDate = (s.start_time || '').split('T')[0].split(' ')[0];
                  return sDate >= mondayStr && sDate <= todayStr;
                });
              } else if (preset === 'current_month') {
                const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                sessions = sessions.filter((s) => {
                  const sDate = (s.start_time || '').split('T')[0].split(' ')[0];
                  return sDate >= firstDayMonth && sDate <= todayStr;
                });
              } else if (preset === 'date_range' || (from_date && to_date)) {
                if (from_date) {
                  sessions = sessions.filter((s) => {
                    const sDate = (s.start_time || '').split('T')[0].split(' ')[0];
                    return sDate >= from_date;
                  });
                }
                if (to_date) {
                  sessions = sessions.filter((s) => {
                    const sDate = (s.start_time || '').split('T')[0].split(' ')[0];
                    return sDate <= to_date;
                  });
                }
              }

              db.all(`SELECT * FROM attendance_records`, [], (errRec, allRecords) => {
                const recRows = allRecords || [];

                db.all("SELECT id, name, roll_number, department, year, section FROM users WHERE role = 'student'", [], (errSt, allStudents) => {
                  const studentList = allStudents || [];

                  const sessionBreakdown = sessions.map((sess) => {
                    const sessRecords = recRows.filter((r) => r.session_id === sess.id);
                    const enrolledInDeptYearSec = studentList.filter((st) => {
                      const matchDept = !sess.department || st.department === sess.department;
                      const matchYear = !sess.year || String(st.year) === String(sess.year);
                      const matchSec = !sess.section || (st.section || 'A').toUpperCase() === (sess.section || 'A').toUpperCase();
                      return matchDept && matchYear && matchSec;
                    });
                    const totalStudents = Math.max(enrolledInDeptYearSec.length, 1);
                    const presentCount = sessRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
                    const absentCount = Math.max(0, totalStudents - presentCount);
                    const attendancePct = Math.round((presentCount / totalStudents) * 100);

                    const startDate = sess.start_time ? new Date(sess.start_time) : new Date();
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = dayNames[startDate.getDay()];

                    return {
                      session_id: sess.id,
                      subject_name: sess.subject,
                      subject_code: sess.subject_code || '21AI51T',
                      faculty_name: sess.faculty_name || fName,
                      date: sess.date || startDate.toISOString().split('T')[0],
                      day: dayName,
                      period: sess.period_number ? `P${sess.period_number}` : 'P1',
                      period_number: sess.period_number || 1,
                      start_time: sess.start_time ? new Date(sess.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:30 AM',
                      end_time: sess.end_time ? new Date(sess.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:20 AM',
                      department: sess.department,
                      year: sess.year,
                      section: sess.section,
                      total_students: totalStudents,
                      present_count: presentCount,
                      absent_count: absentCount,
                      attendance_pct: attendancePct,
                      status: sess.status
                    };
                  });

                  const todaysSessions = sessions.filter((s) => (s.start_time || '').startsWith(todayStr) || (s.date && s.date === todayStr));
                  let todaysTotalPresent = 0;
                  let todaysTotalAbsent = 0;
                  let todaysTotalStudents = 0;

                  todaysSessions.forEach((ts) => {
                    const sb = sessionBreakdown.find((b) => b.session_id === ts.id);
                    if (sb) {
                      todaysTotalPresent += sb.present_count;
                      todaysTotalAbsent += sb.absent_count;
                      todaysTotalStudents += sb.total_students;
                    }
                  });

                  const todaysAttendanceRate = todaysTotalStudents > 0 ? Math.round((todaysTotalPresent / todaysTotalStudents) * 100) : 0;

                  let totalPresentSum = 0;
                  let totalStudentsSum = 0;
                  sessionBreakdown.forEach((sb) => {
                    totalPresentSum += sb.present_count;
                    totalStudentsSum += sb.total_students;
                  });
                  const overallAttendancePct = totalStudentsSum > 0 ? Math.round((totalPresentSum / totalStudentsSum) * 100) : 0;

                  const subjectSummaryMap = {};
                  subjectList.forEach((sub) => {
                    if (sub.subject_name) {
                      subjectSummaryMap[sub.subject_name.toLowerCase()] = {
                        subject_name: sub.subject_name,
                        subject_code: sub.subject_code || '21AI51T',
                        department: sub.department || 'AI & DS',
                        year: sub.year || 3,
                        section: sub.section || 'A',
                        total_sessions: 0,
                        total_present: 0,
                        total_students: 0,
                        attendance_percentage: 0
                      };
                    }
                  });

                  sessionBreakdown.forEach((sb) => {
                    const key = (sb.subject_name || '').toLowerCase();
                    if (key) {
                      if (!subjectSummaryMap[key]) {
                        subjectSummaryMap[key] = {
                          subject_name: sb.subject_name,
                          subject_code: sb.subject_code,
                          department: sb.department || 'AI & DS',
                          year: sb.year || 3,
                          section: sb.section || 'A',
                          total_sessions: 0,
                          total_present: 0,
                          total_students: 0,
                          attendance_percentage: 0
                        };
                      }
                      subjectSummaryMap[key].total_sessions += 1;
                      subjectSummaryMap[key].total_present += sb.present_count;
                      subjectSummaryMap[key].total_students += sb.total_students;
                    }
                  });

                  const subjectWiseSummary = Object.values(subjectSummaryMap).map((item) => {
                    const pct = item.total_students > 0 ? Math.round((item.total_present / item.total_students) * 100) : 0;
                    return { ...item, attendance_percentage: pct };
                  });

                  res.json({
                    faculty_info: {
                      id: facId,
                      name: fName,
                      email: facRow ? facRow.email : (user ? user.email : ''),
                      department: facRow ? facRow.department : 'AI & DS',
                      designation: facRow ? facRow.designation : 'Faculty Member'
                    },
                    assigned_subjects: subjectList,
                    overview: {
                      todays_classes_count: todaysSessions.length,
                      todays_attendance_rate: todaysAttendanceRate,
                      total_present_today: todaysTotalPresent,
                      total_absent_today: todaysTotalAbsent,
                      overall_attendance_pct: overallAttendancePct,
                      total_sessions_analyzed: sessionBreakdown.length
                    },
                    subject_wise_summary: subjectWiseSummary,
                    session_breakdown: sessionBreakdown
                  });
                });
              });
            });
          });
        }
      );
    }
  );
}

function getSessionStudentRoster(req, res) {
  const { sessionId } = req.params;
  const { status, search } = req.query;

  db.get(`SELECT * FROM attendance_sessions WHERE id = ?`, [sessionId], (err, session) => {
    if (err || !session) return res.status(404).json({ error: 'Attendance session not found' });

    db.all(`SELECT id, name, roll_number, email, department, year, section, profile_photo, vh_number FROM users WHERE role = 'student' ORDER BY roll_number ASC`, [], (errSt, studentRows) => {
      let enrolled = studentRows || [];

      if (session.department) {
        enrolled = enrolled.filter((st) => st.department === session.department);
      }
      if (session.year) {
        enrolled = enrolled.filter((st) => String(st.year) === String(session.year));
      }
      if (session.section) {
        enrolled = enrolled.filter((st) => (st.section || 'A').toUpperCase() === (session.section || 'A').toUpperCase());
      }

      db.all(`SELECT * FROM attendance_records WHERE session_id = ?`, [sessionId], (errRec, recordRows) => {
        const recordsMap = new Map();
        (recordRows || []).forEach((r) => recordsMap.set(r.student_id, r));

        let roster = enrolled.map((st) => {
          const rec = recordsMap.get(st.id);
          const recStatus = rec ? rec.status : 'absent';
          const scanTime = rec ? rec.attendance_time : null;

          return {
            student_id: st.id,
            name: st.name,
            roll_number: st.roll_number || st.email,
            register_number: st.roll_number || st.vh_number || st.email,
            email: st.email,
            department: st.department || session.department,
            year: st.year || session.year,
            section: st.section || session.section,
            profile_photo: st.profile_photo,
            status: recStatus,
            scan_time: scanTime ? new Date(scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A',
            raw_scan_time: scanTime,
            distance_meters: rec ? rec.distance_meters : 0,
            notes: rec ? rec.notes : '',
            record_id: rec ? rec.id : null
          };
        });

        if (status && status !== 'all') {
          roster = roster.filter((r) => r.status.toLowerCase() === status.toLowerCase());
        }

        if (search && search.trim() !== '') {
          const q = search.toLowerCase().trim();
          roster = roster.filter((r) => r.name.toLowerCase().includes(q) || r.roll_number.toLowerCase().includes(q) || r.register_number.toLowerCase().includes(q));
        }

        const presentCount = recordRows ? recordRows.filter((r) => r.status === 'present').length : 0;
        const lateCount = recordRows ? recordRows.filter((r) => r.status === 'late').length : 0;
        const absentCount = Math.max(0, enrolled.length - presentCount - lateCount);

        res.json({
          session: session,
          stats: {
            total_enrolled: enrolled.length,
            present_count: presentCount,
            late_count: lateCount,
            absent_count: absentCount,
            attendance_pct: enrolled.length > 0 ? Math.round(((presentCount + lateCount) / enrolled.length) * 100) : 0
          },
          students: roster
        });
      });
    });
  });
}

function updateFacultyAttendanceRecord(req, res) {
  const { id } = req.params;
  const { student_id, session_id, status, notes } = req.body;

  const newStatus = status || 'present';
  const updatedNotes = notes || 'Attendance updated by faculty';

  db.get(`SELECT * FROM attendance_records WHERE id = ? OR (student_id = ? AND session_id = ?)`, [id, student_id, session_id], (err, record) => {
    if (record) {
      db.run(
        `UPDATE attendance_records SET status = ?, notes = ?, attendance_time = CURRENT_TIMESTAMP WHERE id = ?`,
        [newStatus, updatedNotes, record.id],
        function (updErr) {
          if (updErr) return res.status(500).json({ error: 'Failed to update attendance record: ' + updErr.message });
          if (global.io) {
            global.io.emit('attendance_updated', { record_id: record.id, student_id: record.student_id, session_id: record.session_id, status: newStatus });
            global.io.emit('attendanceMarked', { id: record.id, student_id: record.student_id, session_id: record.session_id, status: newStatus });
          }
          res.json({ message: 'Attendance record updated successfully in Supabase PostgreSQL!', id: record.id, status: newStatus });
        }
      );
    } else {
      const newRecordId = id !== 'new' && id ? id : uuidv4();
      db.run(
        `INSERT INTO attendance_records (id, student_id, session_id, attendance_code, attendance_time, student_lat, student_lng, distance_meters, status, notes)
         VALUES (?, ?, ?, 'MANUAL_FACULTY', CURRENT_TIMESTAMP, 0.0, 0.0, 0.0, ?, ?)`,
        [newRecordId, student_id, session_id, newStatus, updatedNotes],
        function (insErr) {
          if (insErr) return res.status(500).json({ error: 'Failed to create attendance record: ' + insErr.message });
          if (global.io) {
            global.io.emit('attendance_updated', { record_id: newRecordId, student_id, session_id, status: newStatus });
            global.io.emit('attendanceMarked', { id: newRecordId, student_id, session_id, status: newStatus });
          }
          res.status(201).json({ message: 'Attendance record created successfully in Supabase PostgreSQL!', id: newRecordId, status: newStatus });
        }
      );
    }
  });
}

function deleteFacultyAttendanceRecord(req, res) {
  const { id } = req.params;

  db.get(`SELECT * FROM attendance_records WHERE id = ?`, [id], (err, rec) => {
    if (err || !rec) return res.status(404).json({ error: 'Attendance record not found' });

    db.run(`DELETE FROM attendance_records WHERE id = ?`, [id], function (delErr) {
      if (delErr) return res.status(500).json({ error: 'Failed to delete attendance record: ' + delErr.message });
      if (global.io) {
        global.io.emit('attendance_deleted', { record_id: id, student_id: rec.student_id, session_id: rec.session_id });
      }
      res.json({ message: 'Attendance record permanently removed from Supabase PostgreSQL!' });
    });
  });
}

module.exports = {
  facultyLogin,
  facultyChangePassword,
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
  adminGetFacultyLoginActivity,
  getFacultyAttendanceAnalytics,
  getSessionStudentRoster,
  updateFacultyAttendanceRecord,
  deleteFacultyAttendanceRecord
};
