const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const xlsx = require('xlsx');
const { db } = require('../database/db');

// List Students with search, filtering, attendance rates, and dashboard summary counts
function getStudents(req, res) {
  const { search, department, year, section, status, sortBy = 'roll_number', sortOrder = 'asc', page = 1, limit = 50 } = req.query;

  let query = `
    SELECT u.id, u.name, u.roll_number, u.vh_number, u.email, u.department, u.year, u.section, u.phone, u.profile_photo, u.profile_photo_url, 
           u.device_fingerprint, u.must_change_password, u.first_login, u.password_changed, u.password_changed_at,
           u.dob, u.date_of_birth, u.gender, u.blood_group, u.address, u.parent_name, u.parent_phone, u.parent_contact, u.bio, u.status, u.admission_year, u.username, u.created_at,
           COUNT(DISTINCT ar.id) as attended_count,
           (SELECT COUNT(*) FROM attendance_sessions s WHERE s.department = u.department AND s.year = u.year AND s.section = u.section) as total_sessions
    FROM users u
    LEFT JOIN attendance_records ar ON u.id = ar.student_id
    WHERE u.role = 'student'
  `;

  const params = [];

  // Search filter
  if (search && search.trim() !== '') {
    query += ` AND (u.name LIKE ? OR u.roll_number LIKE ? OR u.vh_number LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
  }

  // Department normalization filter
  if (department && department !== 'All' && department.trim() !== '') {
    const dClean = department.trim().toLowerCase();
    if (dClean.includes('ai') || dClean.includes('ds') || dClean.includes('data')) {
      query += ` AND (LOWER(u.department) LIKE '%ai%' OR LOWER(u.department) LIKE '%ds%' OR LOWER(u.department) LIKE '%data%')`;
    } else if (dClean.includes('comp') || dClean.includes('cs')) {
      query += ` AND (LOWER(u.department) LIKE '%computer%' OR LOWER(u.department) LIKE '%cs%')`;
    } else if (dClean.includes('electr') || dClean.includes('ece') || dClean.includes('eee')) {
      query += ` AND (LOWER(u.department) LIKE '%electr%' OR LOWER(u.department) LIKE '%ece%' OR LOWER(u.department) LIKE '%eee%')`;
    } else if (dClean.includes('mech')) {
      query += ` AND LOWER(u.department) LIKE '%mech%'`;
    } else {
      query += ` AND (u.department = ? OR LOWER(u.department) LIKE ?)`;
      params.push(department, `%${dClean}%`);
    }
  }

  // Year normalization filter
  if (year && year !== 'All' && String(year).trim() !== '') {
    const yStr = String(year).trim().toLowerCase();
    let yNum = 0;
    if (yStr === '1' || yStr === 'i' || yStr.includes('1st') || yStr.includes('year 1')) yNum = 1;
    else if (yStr === '2' || yStr === 'ii' || yStr.includes('2nd') || yStr.includes('year 2')) yNum = 2;
    else if (yStr === '3' || yStr === 'iii' || yStr.includes('3rd') || yStr.includes('year 3')) yNum = 3;
    else if (yStr === '4' || yStr === 'iv' || yStr.includes('4th') || yStr.includes('year 4')) yNum = 4;
    else yNum = parseInt(yStr) || 0;

    if (yNum > 0) {
      query += ` AND (u.year = ? OR u.year = ? OR CAST(u.year AS TEXT) LIKE ?)`;
      params.push(yNum, String(yNum), `%${yNum}%`);
    } else {
      query += ` AND u.year = ?`;
      params.push(year);
    }
  }

  // Section normalization filter
  if (section && section !== 'All' && String(section).trim() !== '') {
    let secClean = String(section).trim().toUpperCase();
    secClean = secClean.replace(/^SECTION\s*/i, '');
    query += ` AND (UPPER(u.section) = ? OR UPPER(u.section) = ? OR UPPER(u.section) LIKE ?)`;
    params.push(secClean, `SECTION ${secClean}`, `%${secClean}%`);
  }

  // Account Status / Password Status Filter
  if (status && status !== 'All' && String(status).trim() !== '') {
    const statusStr = String(status).trim();
    if (statusStr === 'Active') {
      query += ` AND COALESCE(u.status, 'Active') = 'Active'`;
    } else if (statusStr === 'Inactive' || statusStr === 'Suspended') {
      query += ` AND COALESCE(u.status, 'Active') IN ('Inactive', 'Suspended')`;
    } else if (statusStr === 'Default Password') {
      query += ` AND (u.must_change_password = 1 OR u.first_login = 1 OR u.password_changed = 0)`;
    } else if (statusStr === 'Custom Password') {
      query += ` AND (COALESCE(u.must_change_password, 0) = 0 AND COALESCE(u.first_login, 0) = 0 AND u.password_changed = 1)`;
    } else {
      query += ` AND COALESCE(u.status, 'Active') = ?`;
      params.push(statusStr);
    }
  }

  // SQL Order By
  const dir = String(sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  if (sortBy === 'name') {
    query += ` GROUP BY u.id ORDER BY u.name ${dir}`;
  } else if (sortBy === 'vh_number') {
    query += ` GROUP BY u.id ORDER BY u.vh_number ${dir}`;
  } else if (sortBy === 'email') {
    query += ` GROUP BY u.id ORDER BY u.email ${dir}`;
  } else if (sortBy === 'phone') {
    query += ` GROUP BY u.id ORDER BY u.phone ${dir}`;
  } else {
    query += ` GROUP BY u.id ORDER BY u.roll_number ${dir}`;
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database query error: ' + err.message });

    const formattedStudents = rows.map((st) => {
      const total = st.total_sessions || 0;
      const attended = st.attended_count || 0;
      let rate = 0;
      if (total > 0) {
        rate = Math.min(100, Math.round((attended / total) * 100));
      } else {
        rate = 0;
      }
      const isDefault = Boolean(st.must_change_password === 1 || st.first_login === 1 || st.password_changed === 0);
      const date_of_birth = st.date_of_birth || st.dob || '';
      const parent_contact = st.parent_contact || st.parent_phone || '';
      const profile_photo_url = st.profile_photo_url || st.profile_photo || '';
      return {
        ...st,
        date_of_birth,
        dob: date_of_birth,
        parent_contact,
        parent_phone: parent_contact,
        profile_photo_url,
        profile_photo: profile_photo_url,
        status: st.status || 'Active',
        attendance_percentage: rate,
        password_status: isDefault ? 'Default Password' : 'Custom Password'
      };
    });

    // Robust in-memory sorting for all columns
    const sortMultiplier = dir === 'DESC' ? -1 : 1;
    formattedStudents.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'vh_number') {
        valA = a.vh_number || '';
        valB = b.vh_number || '';
      } else if (sortBy === 'email') {
        valA = a.email || '';
        valB = b.email || '';
      } else if (sortBy === 'phone') {
        valA = a.phone || '';
        valB = b.phone || '';
      } else if (sortBy === 'attendance_percentage') {
        valA = typeof a.attendance_percentage === 'number' ? a.attendance_percentage : 0;
        valB = typeof b.attendance_percentage === 'number' ? b.attendance_percentage : 0;
        return (valA - valB) * sortMultiplier;
      } else if (sortBy === 'status') {
        valA = a.status || 'Active';
        valB = b.status || 'Active';
      } else if (sortBy === 'password_status') {
        valA = a.password_status || '';
        valB = b.password_status || '';
      } else if (sortBy === 'name') {
        valA = String(a.name || '');
        valB = String(b.name || '');
      } else if (sortBy === 'roll_number') {
        valA = String(a.roll_number || '');
        valB = String(b.roll_number || '');
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * sortMultiplier;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * sortMultiplier;
      }

      return String(valA || '').localeCompare(String(valB || ''), undefined, { numeric: true, sensitivity: 'base' }) * sortMultiplier;
    });

    // Telemetry Debug Log as requested by prompt specifications
    console.log('[STUDENT FILTER DEBUG]', {
      department: department || 'ALL',
      year: year || 'ALL',
      section: section || 'ALL',
      status: status || 'ALL',
      search: search || 'NONE',
      returnedCount: formattedStudents.length
    });

    // Compute Summary Stats for Top Cards
    db.all(`SELECT id, status, must_change_password, first_login, password_changed FROM users WHERE role = 'student'`, [], (err2, allSts) => {
      const totalStudents = allSts ? allSts.length : formattedStudents.length;
      let activeStudents = 0;
      let inactiveStudents = 0;
      let defaultPasswordCount = 0;
      let customPasswordCount = 0;

      (allSts || []).forEach((st) => {
        const stStatus = st.status || 'Active';
        if (stStatus === 'Active') activeStudents++;
        else inactiveStudents++;

        const isDef = Boolean(st.must_change_password === 1 || st.first_login === 1 || st.password_changed === 0);
        if (isDef) defaultPasswordCount++;
        else customPasswordCount++;
      });

      // Count logged in today & active sessions
      const todayStr = new Date().toISOString().split('T')[0];
      db.get(
        `SELECT COUNT(DISTINCT student_id) as count FROM login_logs WHERE DATE(login_time) = DATE('now') OR login_time LIKE ?`,
        [`${todayStr}%`],
        (err3, loggedInRow) => {
          db.get(`SELECT COUNT(*) as count FROM attendance_sessions WHERE status = 'active'`, [], (err4, activeSessionsRow) => {
            res.json({
              students: formattedStudents,
              total: formattedStudents.length,
              summaryStats: {
                totalStudents,
                activeStudents,
                inactiveStudents,
                defaultPasswordCount,
                customPasswordCount,
                loggedInToday: loggedInRow ? loggedInRow.count : 0,
                activeSessions: activeSessionsRow ? activeSessionsRow.count : 0
              }
            });
          });
        }
      );
    });
  });
}

// Add Single Student with validation
async function createStudent(req, res) {
  let { name, roll_number, vh_number, department, year, section, phone, profile_photo, dob, gender, blood_group, address, parent_name, parent_phone, bio, username, status, admission_year } = req.body;

  if (!name || !roll_number) {
    return res.status(400).json({ error: 'Student Name and Register Number are required' });
  }

  // Derive VH Number if not provided directly
  let vh = vh_number ? vh_number.trim().toUpperCase() : '';
  if (!vh) {
    const num = roll_number.replace(/[^0-9]/g, '');
    vh = 'VH' + (num.length >= 4 ? num.slice(-5) : '13936');
  }

  // Auto-generate official Elite Minds Email ID from VH Number
  const autoEmail = `${vh.toLowerCase()}@velhightech.com`;
  department = department || 'AI & Data Science';
  year = year ? parseInt(year) : 3;
  section = section || 'A';

  const id = uuidv4();
  const defaultPasswordHash = await bcrypt.hash('1234', 10);
  const photo = profile_photo || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`;
  const studentStatus = status || 'Active';
  const uname = username || roll_number.trim();

  db.run(
    `INSERT INTO users (id, name, roll_number, vh_number, email, role, department, year, section, phone, profile_photo, dob, gender, blood_group, address, parent_name, parent_phone, bio, status, admission_year, username, password_hash, must_change_password, is_first_login, first_login, password_changed)
     VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 0)`,
    [id, name.trim(), roll_number.trim(), vh, autoEmail, department, year, section, phone || '', photo, dob || null, gender || null, blood_group || null, address || null, parent_name || null, parent_phone || null, bio || null, studentStatus, admission_year || new Date().getFullYear(), uname, defaultPasswordHash],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          if (err.message.includes('roll_number')) {
            return res.status(409).json({ error: 'Validation Error: Register Number must be unique.' });
          }
          if (err.message.includes('email') || err.message.includes('vh_number')) {
            return res.status(409).json({ error: 'Validation Error: VH Number or Email already exists.' });
          }
          return res.status(409).json({ error: 'Student with this Register Number or VH Email already exists.' });
        }
        return res.status(500).json({ error: 'Failed to create student: ' + err.message });
      }

      // Log initial creation into audit logs
      const auditId = uuidv4();
      db.run(
        `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', 'Account Created (Default Password Assigned)', CURRENT_TIMESTAMP)`,
        [auditId, id]
      );

      res.status(201).json({
        message: `Student account created successfully with official email "${autoEmail}" and default password "1234".`,
        student: { id, name, roll_number, vh_number: vh, email: autoEmail, department, year, section, phone, profile_photo: photo, status: studentStatus }
      });
    }
  );
}

// Edit Student
async function updateStudent(req, res) {
  const { id } = req.params;
  const { name, roll_number, vh_number, department, year, section, phone, profile_photo, dob, gender, blood_group, address, parent_name, parent_phone, bio, status, admission_year, new_password } = req.body;

  try {
    const studentStatus = status || 'Active';
    let vh = vh_number ? vh_number.trim().toUpperCase() : '';
    if (!vh && roll_number) {
      const num = roll_number.replace(/[^0-9]/g, '');
      vh = 'VH' + (num.length >= 4 ? num.slice(-5) : '13936');
    }
    const autoEmail = vh ? `${vh.toLowerCase()}@velhightech.com` : undefined;

    if (new_password && new_password.trim() !== '') {
      const passwordHash = await bcrypt.hash(new_password.trim(), 10);
      db.run(
        `UPDATE users 
         SET name = ?, roll_number = ?, vh_number = COALESCE(?, vh_number), email = COALESCE(?, email), department = ?, year = ?, section = ?, phone = ?, profile_photo = COALESCE(?, profile_photo), dob = ?, gender = ?, blood_group = ?, address = ?, parent_name = ?, parent_phone = ?, bio = ?, status = ?, admission_year = ?, password_hash = ?, must_change_password = 0, is_first_login = 0, first_login = 0, password_changed = 1
         WHERE id = ? AND role = 'student'`,
        [name, roll_number, vh || null, autoEmail || null, department, parseInt(year), section, phone || '', profile_photo, dob || null, gender || null, blood_group || null, address || null, parent_name || null, parent_phone || null, bio || null, studentStatus, admission_year || null, passwordHash, id],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Another student with this Register Number or Email already exists.' });
            }
            return res.status(500).json({ error: 'Failed to update student: ' + err.message });
          }

          const auditId = uuidv4();
          db.run(
            `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', 'Password Updated by Admin', CURRENT_TIMESTAMP)`,
            [auditId, id]
          );

          res.json({ message: 'Student details & password updated successfully' });
        }
      );
    } else {
      db.run(
        `UPDATE users 
         SET name = ?, roll_number = ?, vh_number = COALESCE(?, vh_number), email = COALESCE(?, email), department = ?, year = ?, section = ?, phone = ?, profile_photo = COALESCE(?, profile_photo), dob = ?, gender = ?, blood_group = ?, address = ?, parent_name = ?, parent_phone = ?, bio = ?, status = ?, admission_year = ?
         WHERE id = ? AND role = 'student'`,
        [name, roll_number, vh || null, autoEmail || null, department, parseInt(year), section, phone || '', profile_photo, dob || null, gender || null, blood_group || null, address || null, parent_name || null, parent_phone || null, bio || null, studentStatus, admission_year || null, id],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Another student with this Register Number or Email already exists.' });
            }
            return res.status(500).json({ error: 'Failed to update student: ' + err.message });
          }
          res.json({ message: 'Student information updated successfully' });
        }
      );
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}

// Delete Single Student (Cascades attendance records, login logs, audit logs)
function deleteStudent(req, res) {
  const { id } = req.params;

  db.serialize(() => {
    db.run(`DELETE FROM attendance_records WHERE student_id = ?`, [id]);
    db.run(`DELETE FROM login_logs WHERE student_id = ?`, [id]);
    db.run(`DELETE FROM password_audit_logs WHERE student_id = ?`, [id]);
    db.run(`DELETE FROM users WHERE id = ? AND role = 'student'`, [id], function (err) {
      if (err) return res.status(500).json({ error: 'Failed to delete student account' });
      res.json({ message: 'Student account and associated attendance, login, and audit records deleted permanently.' });
    });
  });
}

// Bulk Delete Students
function bulkDeleteStudents(req, res) {
  const { studentIds } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'An array of student IDs is required for bulk deletion.' });
  }

  const placeholders = studentIds.map(() => '?').join(',');

  db.serialize(() => {
    db.run(`DELETE FROM attendance_records WHERE student_id IN (${placeholders})`, studentIds);
    db.run(`DELETE FROM login_logs WHERE student_id IN (${placeholders})`, studentIds);
    db.run(`DELETE FROM password_audit_logs WHERE student_id IN (${placeholders})`, studentIds);
    db.run(`DELETE FROM users WHERE id IN (${placeholders}) AND role = 'student'`, studentIds, function (err) {
      if (err) return res.status(500).json({ error: 'Failed to bulk delete student accounts: ' + err.message });
      res.json({ message: `Successfully deleted ${this.changes} student accounts and associated records permanently.` });
    });
  });
}

// Bulk Import Students
async function bulkImportStudents(req, res) {
  const studentsList = req.body.students;

  if (!Array.isArray(studentsList) || studentsList.length === 0) {
    return res.status(400).json({ error: 'Valid array of students required for bulk import' });
  }

  const defaultPasswordHash = await bcrypt.hash('1234', 10);
  let importedCount = 0;
  let errors = [];

  for (const st of studentsList) {
    try {
      const id = uuidv4();
      const photo = st.profile_photo || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`;
      const roll = String(st.roll_number || st['Register Number'] || st['Roll Number'] || st['roll_number'] || '').trim();
      
      let vh = String(st.vh_number || st['VH Number'] || st['VH'] || st['vh_number'] || '').trim().toUpperCase();
      if (!vh) {
        const num = roll.replace(/[^0-9]/g, '');
        vh = 'VH' + (num.length >= 4 ? num.slice(-5) : '13936');
      }

      const officialEmail = `${vh.toLowerCase()}@velhightech.com`;

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO users (id, name, roll_number, vh_number, email, role, department, year, section, phone, profile_photo, status, password_hash, must_change_password, is_first_login, first_login, password_changed)
           VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, 'Active', ?, 1, 1, 1, 0)`,
          [id, st.name || st['Student Name'] || st['Name'], roll, vh, officialEmail, st.department || st['Department'] || 'AI & Data Science', parseInt(st.year || st['Year'] || 3), st.section || st['Section'] || 'A', st.phone || st['Phone'] || '', photo, defaultPasswordHash],
          function (err) {
            if (err) reject(err);
            else {
              if (this.changes > 0) {
                importedCount++;
                const auditId = uuidv4();
                db.run(
                  `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', 'Bulk Account Import (Default Password)', CURRENT_TIMESTAMP)`,
                  [auditId, id]
                );
              }
              resolve(true);
            }
          }
        );
      });
    } catch (e) {
      errors.push(`Failed for ${st.roll_number || st.name}: ${e.message}`);
    }
  }

  res.json({
    message: `Bulk import completed. Successfully imported ${importedCount} student accounts.`,
    importedCount,
    errors
  });
}

// Reset Student Registered Hardware Device
function resetStudentDevice(req, res) {
  const { id } = req.params;
  db.run("UPDATE users SET device_fingerprint = NULL WHERE id = ? AND role = 'student'", [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to reset student device: ' + err.message });
    res.json({ message: 'Student registered device reset successfully! Next scan will auto-bind new device.' });
  });
}

// Admin Reset Student Password (Default 1234 or Custom Generated)
async function resetStudentPassword(req, res) {
  const { id } = req.params;
  const { resetType, customPassword } = req.body;

  let newPass = '1234';
  if (resetType === 'custom' && customPassword && customPassword.trim() !== '') {
    newPass = customPassword.trim();
  }

  const passwordHash = await bcrypt.hash(newPass, 10);

  db.run(
    "UPDATE users SET password_hash = ?, must_change_password = 1, is_first_login = 1, first_login = 1, password_changed = 0 WHERE id = ? AND role = 'student'",
    [passwordHash, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to reset student password: ' + err.message });

      const auditId = uuidv4();
      const actionText = resetType === 'custom' ? `Password Reset to Custom Password (${newPass})` : 'Password Reset to Default (1234)';
      db.run(
        `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', ?, CURRENT_TIMESTAMP)`,
        [auditId, id, actionText]
      );

      res.json({
        message: `Student password reset successfully to "${newPass}". Student will be forced to change password during next login.`
      });
    }
  );
}

// Bulk Admin Reset Student Passwords
async function bulkResetStudentPasswords(req, res) {
  const { studentIds, resetType, customPassword } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'No student IDs provided for bulk password reset.' });
  }

  let newPass = '1234';
  if (resetType === 'custom' && customPassword && customPassword.trim() !== '') {
    newPass = customPassword.trim();
  }

  const passwordHash = await bcrypt.hash(newPass, 10);
  let updatedCount = 0;

  for (const stId of studentIds) {
    await new Promise((resolve) => {
      db.run(
        "UPDATE users SET password_hash = ?, must_change_password = 1, is_first_login = 1, first_login = 1, password_changed = 0 WHERE id = ? AND role = 'student'",
        [passwordHash, stId],
        function (err) {
          if (!err && this.changes > 0) {
            updatedCount++;
            const auditId = uuidv4();
            const actionText = resetType === 'custom' ? `Bulk Reset to Custom Temp Password (${newPass})` : 'Bulk Reset to Default Password (1234)';
            db.run(
              `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', ?, CURRENT_TIMESTAMP)`,
              [auditId, stId, actionText]
            );
          }
          resolve(true);
        }
      );
    });
  }

  res.json({
    message: `Successfully reset passwords for ${updatedCount} student account(s) to temporary password "${newPass}". Mandatory password change flag applied.`,
    updatedCount
  });
}

// Force Student Password Change on Next Login
function forceStudentPasswordChange(req, res) {
  const { id } = req.params;
  db.run(
    "UPDATE users SET must_change_password = 1, is_first_login = 1, first_login = 1, password_changed = 0 WHERE id = ? AND role = 'student'",
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to force password change: ' + err.message });

      const auditId = uuidv4();
      db.run(
        `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', 'Force Password Change Flagged', CURRENT_TIMESTAMP)`,
        [auditId, id]
      );

      res.json({ message: 'Mandatory password change enforced for student on next login.' });
    }
  );
}

// Update Account Status (Active, Inactive, Locked, Suspended)
function updateStudentAccountStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Active', 'Inactive', 'Locked', 'Suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid account status value' });
  }

  db.run(
    "UPDATE users SET status = ? WHERE id = ? AND role = 'student'",
    [status, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update account status: ' + err.message });

      const auditId = uuidv4();
      const actionText = status === 'Locked' ? 'Account Locked' : status === 'Suspended' ? 'Account Suspended' : status === 'Active' ? 'Account Activated' : 'Account Deactivated';

      db.run(
        `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', ?, CURRENT_TIMESTAMP)`,
        [auditId, id, actionText]
      );

      res.json({ message: `Student account status updated to "${status}".` });
    }
  );
}

// Get Comprehensive Student Profile Details (Modal View)
function getStudentProfileDetails(req, res) {
  const { id } = req.params;

  db.get('SELECT * FROM users WHERE id = ? AND role = "student"', [id], (err, student) => {
    if (err || !student) return res.status(404).json({ error: 'Student account not found' });

    // Attendance Summary
    db.all(
      `SELECT ar.*, s.subject, s.date as session_date, s.period_number 
       FROM attendance_records ar
       JOIN attendance_sessions s ON ar.session_id = s.id
       WHERE ar.student_id = ?
       ORDER BY ar.attendance_time DESC`,
      [id],
      (err2, records) => {
        db.get(
          `SELECT COUNT(*) as total_sessions FROM attendance_sessions WHERE department = ? AND year = ? AND section = ?`,
          [student.department || 'AI & Data Science', student.year || 3, student.section || 'A'],
          (err3, totalRow) => {
            const presentCount = (records || []).filter((r) => r.status === 'present').length;
            const totalSessions = totalRow ? totalRow.total_sessions : 0;
            const absentCount = Math.max(0, totalSessions - presentCount);
            const overallRate = totalSessions > 0 ? Math.min(100, Math.round((presentCount / totalSessions) * 100)) : 0;
            const lastAttendanceDate = records && records.length > 0 ? records[0].attendance_time : null;

            // Login History
            db.all(
              `SELECT * FROM login_logs WHERE student_id = ? ORDER BY login_time DESC LIMIT 20`,
              [id],
              (err4, loginLogs) => {
                res.json({
                  profile: student,
                  attendanceSummary: {
                    overallRate,
                    presentCount,
                    absentCount,
                    lastAttendanceDate
                  },
                  qrScanHistory: records || [],
                  loginHistory: loginLogs || []
                });
              }
            );
          }
        );
      }
    );
  });
}

// Login Activity Monitoring
function getLoginActivity(req, res) {
  const todayStr = new Date().toISOString().split('T')[0];

  db.all(
    `SELECT l.*, u.name as student_name, u.roll_number, u.department, u.year, u.section, u.profile_photo
     FROM login_logs l
     JOIN users u ON l.student_id = u.id
     ORDER BY l.login_time DESC LIMIT 100`,
    [],
    (err, logs) => {
      db.get(`SELECT COUNT(*) as totalStudents FROM users WHERE role = 'student'`, [], (err2, totalSts) => {
        db.get(
          `SELECT COUNT(DISTINCT student_id) as loggedInToday FROM login_logs WHERE DATE(login_time) = DATE('now') OR login_time LIKE ?`,
          [`${todayStr}%`],
          (err3, loggedInRow) => {
            db.get(
              `SELECT COUNT(DISTINCT student_id) as activeRightNow FROM login_logs WHERE login_time >= datetime('now', '-30 minutes')`,
              [],
              (err4, activeRow) => {
                res.json({
                  logs: logs || [],
                  stats: {
                    totalStudents: totalSts ? totalSts.totalStudents : 0,
                    loggedInToday: loggedInRow ? loggedInRow.loggedInToday : 0,
                    activeRightNow: activeRow ? activeRow.activeRightNow : 0
                  }
                });
              }
            );
          }
        );
      });
    }
  );
}

// Password Audit Logs History
function getPasswordAuditLogs(req, res) {
  db.all(
    `SELECT pal.*, u.name as student_name, u.roll_number, u.department, u.email
     FROM password_audit_logs pal
     JOIN users u ON pal.student_id = u.id
     ORDER BY pal.changed_at DESC LIMIT 100`,
    [],
    (err, logs) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch password audit logs: ' + err.message });
      res.json({ logs: logs || [] });
    }
  );
}

// Get Logged-in Student Self Profile directly from Supabase DB
function getStudentSelfProfile(req, res) {
  const studentId = req.user && req.user.id;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized. Token invalid.' });
  }

  db.get('SELECT * FROM users WHERE id = ? AND role = "student"', [studentId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'Student record not found in database' });
    }

    const date_of_birth = user.date_of_birth || user.dob || '';
    const parent_contact = user.parent_contact || user.parent_phone || '';
    const profile_photo_url = user.profile_photo_url || user.profile_photo || '';

    res.json({
      user: {
        ...user,
        date_of_birth,
        dob: date_of_birth,
        parent_contact,
        parent_phone: parent_contact,
        profile_photo_url,
        profile_photo: profile_photo_url
      }
    });
  });
}

// Student Self-Service Profile Update (Supabase DB source of truth + Audit Logs + Realtime Sync)
async function updateStudentSelfProfile(req, res) {
  const studentId = req.user && req.user.id;
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized. Token invalid.' });
  }

  const {
    vh_number,
    email,
    phone,
    date_of_birth,
    dob,
    blood_group,
    parent_name,
    parent_contact,
    parent_phone,
    address,
    bio,
    profile_photo_url,
    profile_photo
  } = req.body;

  try {
    db.get('SELECT * FROM users WHERE id = ? AND role = "student"', [studentId], async (err, current) => {
      if (err || !current) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      let newVh = current.vh_number || '';
      let newEmail = current.email || '';

      if (vh_number !== undefined && String(vh_number).trim() !== '') {
        const cleanVh = String(vh_number).trim().toUpperCase();
        if (cleanVh !== (current.vh_number || '').toUpperCase()) {
          const vhCheck = await new Promise((resolve) => {
            db.get(
              'SELECT id FROM users WHERE (LOWER(vh_number) = LOWER(?) OR LOWER(roll_number) = LOWER(?)) AND id != ?',
              [cleanVh, cleanVh, studentId],
              (e, row) => resolve(row)
            );
          });
          if (vhCheck) {
            return res.status(400).json({ error: `VH Number "${cleanVh}" is already assigned to another student.` });
          }
          newVh = cleanVh;
        }
      }

      if (email !== undefined && String(email).trim() !== '') {
        const cleanEmail = String(email).trim().toLowerCase();
        if (cleanEmail !== (current.email || '').toLowerCase()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ error: 'Invalid email address format.' });
          }
          const emailCheck = await new Promise((resolve) => {
            db.get(
              'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?',
              [cleanEmail, studentId],
              (e, row) => resolve(row)
            );
          });
          if (emailCheck) {
            return res.status(400).json({ error: `Official Email ID "${cleanEmail}" is already registered to another account.` });
          }
          newEmail = cleanEmail;
        }
      }

      const newPhone = phone !== undefined ? String(phone).trim() : (current.phone || '');
      const newDob = date_of_birth !== undefined ? String(date_of_birth).trim() : (dob !== undefined ? String(dob).trim() : (current.date_of_birth || current.dob || ''));
      const newBloodGroup = blood_group !== undefined ? String(blood_group).trim() : (current.blood_group || '');
      const newParentName = parent_name !== undefined ? String(parent_name).trim() : (current.parent_name || '');
      const newParentContact = parent_contact !== undefined ? String(parent_contact).trim() : (parent_phone !== undefined ? String(parent_phone).trim() : (current.parent_contact || current.parent_phone || ''));
      const newAddress = address !== undefined ? String(address).trim() : (current.address || '');
      const newBio = bio !== undefined ? String(bio).trim() : (current.bio || '');
      const newPhoto = profile_photo_url !== undefined ? String(profile_photo_url).trim() : (profile_photo !== undefined ? String(profile_photo).trim() : (current.profile_photo_url || current.profile_photo || ''));

      // Audit Logging for Changed Fields
      const changes = [
        { field: 'vh_number', oldVal: current.vh_number, newVal: newVh },
        { field: 'email', oldVal: current.email, newVal: newEmail },
        { field: 'phone', oldVal: current.phone, newVal: newPhone },
        { field: 'date_of_birth', oldVal: current.date_of_birth || current.dob, newVal: newDob },
        { field: 'blood_group', oldVal: current.blood_group, newVal: newBloodGroup },
        { field: 'parent_name', oldVal: current.parent_name, newVal: newParentName },
        { field: 'parent_contact', oldVal: current.parent_contact || current.parent_phone, newVal: newParentContact },
        { field: 'address', oldVal: current.address, newVal: newAddress },
        { field: 'bio', oldVal: current.bio, newVal: newBio },
        { field: 'profile_photo_url', oldVal: current.profile_photo_url || current.profile_photo, newVal: newPhoto }
      ];

      changes.forEach((c) => {
        const o = c.oldVal ? String(c.oldVal).trim() : '';
        const n = c.newVal ? String(c.newVal).trim() : '';
        if (o !== n) {
          const auditId = uuidv4();
          db.run(
            `INSERT INTO student_profile_audit_logs (id, student_id, field_changed, old_value, new_value, timestamp)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [auditId, studentId, c.field, o || 'N/A', n || 'N/A']
          );
        }
      });

      const updateSql = `
        UPDATE users SET
          vh_number = ?,
          email = ?,
          phone = ?,
          date_of_birth = ?,
          dob = ?,
          blood_group = ?,
          parent_name = ?,
          parent_contact = ?,
          parent_phone = ?,
          address = ?,
          bio = ?,
          profile_photo_url = ?,
          profile_photo = ?
        WHERE id = ? AND role = 'student'
      `;

      const params = [
        newVh,
        newEmail,
        newPhone,
        newDob,
        newDob,
        newBloodGroup,
        newParentName,
        newParentContact,
        newParentContact,
        newAddress,
        newBio,
        newPhoto,
        newPhoto,
        studentId
      ];

      db.run(updateSql, params, function (errUpdate) {
        if (errUpdate) {
          return res.status(500).json({ error: 'Failed to update student profile: ' + errUpdate.message });
        }

        db.get('SELECT * FROM users WHERE id = ? AND role = "student"', [studentId], (errGet, freshUser) => {
          if (freshUser) {
            freshUser.date_of_birth = freshUser.date_of_birth || freshUser.dob || '';
            freshUser.parent_contact = freshUser.parent_contact || freshUser.parent_phone || '';
            freshUser.profile_photo_url = freshUser.profile_photo_url || freshUser.profile_photo || '';
          }

          try {
            const io = req.app.get('socketio');
            if (io) {
              io.emit('student_updated', { studentId, user: freshUser });
              io.emit('roster_updated', { studentId, user: freshUser });
            }
          } catch (sErr) {}

          res.json({
            message: 'Student profile updated successfully and synced with Admin Records.',
            user: freshUser
          });
        });
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error updating student profile: ' + e.message });
  }
}

module.exports = {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents,
  bulkImportStudents,
  resetStudentDevice,
  resetStudentPassword,
  bulkResetStudentPasswords,
  forceStudentPasswordChange,
  updateStudentAccountStatus,
  getStudentProfileDetails,
  getLoginActivity,
  getPasswordAuditLogs,
  getStudentSelfProfile,
  updateStudentSelfProfile
};
