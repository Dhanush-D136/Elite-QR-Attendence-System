const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const xlsx = require('xlsx');
const { db } = require('../database/db');

// List Students with search, filtering, and attendance rates
function getStudents(req, res) {
  const { search, department, year, section, page = 1, limit = 50 } = req.query;

  let query = `
    SELECT u.id, u.name, u.roll_number, u.email, u.department, u.year, u.section, u.phone, u.profile_photo, u.device_fingerprint, u.must_change_password, u.created_at,
           COUNT(DISTINCT ar.id) as attended_count,
           (SELECT COUNT(*) FROM attendance_sessions s WHERE s.department = u.department AND s.year = u.year AND s.section = u.section) as total_sessions
    FROM users u
    LEFT JOIN attendance_records ar ON u.id = ar.student_id
    WHERE u.role = 'student'
  `;

  const params = [];

  if (search) {
    query += ` AND (u.name LIKE ? OR u.roll_number LIKE ? OR u.email LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (department) {
    query += ` AND u.department = ?`;
    params.push(department);
  }

  if (year) {
    query += ` AND u.year = ?`;
    params.push(parseInt(year));
  }

  if (section) {
    query += ` AND u.section = ?`;
    params.push(section);
  }

  query += ` GROUP BY u.id ORDER BY u.roll_number ASC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database query error: ' + err.message });

    const formattedStudents = rows.map((st) => {
      const total = st.total_sessions || 0;
      const rate = total > 0 ? Math.min(100, Math.round((st.attended_count / total) * 100)) : null;
      return {
        ...st,
        attendance_percentage: rate,
        status: st.must_change_password === 1 ? 'Pending Reset' : 'Active'
      };
    });

    res.json({
      students: formattedStudents,
      total: formattedStudents.length
    });
  });
}

// Add Single Student
async function createStudent(req, res) {
  const { name, roll_number, email, department, year, section, phone, profile_photo } = req.body;

  if (!name || !roll_number || !email || !department || !year || !section) {
    return res.status(400).json({ error: 'Name, Roll Number, Email, Department, Year, and Section are required' });
  }

  const id = uuidv4();
  const defaultPasswordHash = await bcrypt.hash('1234', 10);
  const photo = profile_photo || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`;

  db.run(
    `INSERT INTO users (id, name, roll_number, email, role, department, year, section, phone, profile_photo, password_hash, must_change_password, is_first_login)
     VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, 1, 1)`,
    [id, name, roll_number, email, department, parseInt(year), section, phone || '', photo, defaultPasswordHash],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Student with this Roll Number or Email already exists.' });
        }
        return res.status(500).json({ error: 'Failed to create student: ' + err.message });
      }

      res.status(201).json({
        message: 'Student account created successfully with default password "1234". Student must change password on first login.',
        student: { id, name, roll_number, email, department, year, section, phone, profile_photo: photo }
      });
    }
  );
}

// Edit Student
async function updateStudent(req, res) {
  const { id } = req.params;
  const { name, roll_number, email, department, year, section, phone, profile_photo, new_password } = req.body;

  try {
    if (new_password && new_password.trim() !== '') {
      const passwordHash = await bcrypt.hash(new_password.trim(), 10);
      db.run(
        `UPDATE users 
         SET name = ?, roll_number = ?, email = ?, department = ?, year = ?, section = ?, phone = ?, profile_photo = COALESCE(?, profile_photo), password_hash = ?, must_change_password = 0, is_first_login = 0
         WHERE id = ? AND role = 'student'`,
        [name, roll_number, email, department, parseInt(year), section, phone || '', profile_photo, passwordHash, id],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Another student with this Roll Number or Email already exists.' });
            }
            return res.status(500).json({ error: 'Failed to update student: ' + err.message });
          }
          res.json({ message: 'Student details & password updated successfully' });
        }
      );
    } else {
      db.run(
        `UPDATE users 
         SET name = ?, roll_number = ?, email = ?, department = ?, year = ?, section = ?, phone = ?, profile_photo = COALESCE(?, profile_photo)
         WHERE id = ? AND role = 'student'`,
        [name, roll_number, email, department, parseInt(year), section, phone || '', profile_photo, id],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Another student with this Roll Number or Email already exists.' });
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

// Delete Student
function deleteStudent(req, res) {
  const { id } = req.params;
  db.run(`DELETE FROM users WHERE id = ? AND role = 'student'`, [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete student' });
    res.json({ message: 'Student removed successfully' });
  });
}

// Bulk Import Students (via JSON array or parsed Excel)
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

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO users (id, name, roll_number, email, role, department, year, section, phone, profile_photo, password_hash, must_change_password, is_first_login)
           VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, 1, 1)`,
          [id, st.name, st.roll_number, st.email, st.department || 'Computer Science', parseInt(st.year || 3), st.section || 'A', st.phone || '', photo, defaultPasswordHash],
          function (err) {
            if (err) reject(err);
            else {
              if (this.changes > 0) importedCount++;
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

// Reset Student Registered Device (Admin Override)
function resetStudentDevice(req, res) {
  const { id } = req.params;
  db.run("UPDATE users SET device_fingerprint = NULL WHERE id = ? AND role = 'student'", [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to reset student device: ' + err.message });
    res.json({ message: 'Student registered device reset successfully! Next scan will auto-bind new device.' });
  });
}

// Admin Reset Student Password (sets password = '1234' and triggers is_first_login = 1)
async function resetStudentPassword(req, res) {
  const { id } = req.params;
  const defaultPasswordHash = await bcrypt.hash('1234', 10);

  db.run(
    "UPDATE users SET password_hash = ?, must_change_password = 1, is_first_login = 1 WHERE id = ? AND role = 'student'",
    [defaultPasswordHash, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to reset student password: ' + err.message });
      res.json({ message: 'Student password reset to default "1234". Student must change password during next login.' });
    }
  );
}

module.exports = {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
  resetStudentDevice,
  resetStudentPassword
};
