const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');

// --- Class Details (AI&DS III-A Single Class Focus) ---
function getClassDetails(req, res) {
  db.get('SELECT * FROM class_details WHERE id = 1', [], (err, details) => {
    if (err || !details) {
      return res.json({
        details: {
          department: 'AI & DS',
          year: 'III Year',
          section: 'A',
          semester: 'V',
          room: 'F305',
          class_advisor: 'Mrs Vasanthapriya M J T',
          academic_year: '2026-2027 (ODD)',
          batch: '2024-2028'
        }
      });
    }
    res.json({ details });
  });
}

function updateClassDetails(req, res) {
  const { department, year, section, semester, room, class_advisor, academic_year, batch } = req.body;
  db.run(
    `UPDATE class_details SET 
      department = ?, year = ?, section = ?, semester = ?, room = ?, 
      class_advisor = ?, academic_year = ?, batch = ? 
    WHERE id = 1`,
    [department, year, section, semester, room, class_advisor, academic_year, batch],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update class details' });
      res.json({ message: 'Class details updated successfully' });
    }
  );
}

// --- Faculty Controllers ---
function getFaculties(req, res) {
  db.all('SELECT * FROM faculties ORDER BY name ASC', [], (err, faculties) => {
    if (err) return res.status(500).json({ error: 'Database error fetching faculties' });
    res.json({ faculties });
  });
}

function createFaculty(req, res) {
  const { name, department, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Faculty name is required' });

  const id = 'fac-' + uuidv4();
  db.run('INSERT INTO faculties (id, name, department, email) VALUES (?, ?, ?, ?)', [id, name, department || 'AI & DS', email || ''], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to create faculty record' });
    res.json({ message: 'Faculty created successfully', id });
  });
}

function updateFaculty(req, res) {
  const { id } = req.params;
  const { name, department, email } = req.body;

  db.run('UPDATE faculties SET name = ?, department = ?, email = ? WHERE id = ?', [name, department, email, id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to update faculty record' });
    res.json({ message: 'Faculty updated successfully' });
  });
}

function deleteFaculty(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM faculties WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete faculty record' });
    res.json({ message: 'Faculty deleted successfully' });
  });
}

// --- Subject Controllers ---
function getSubjects(req, res) {
  const { faculty_name, department, semester, section, type } = req.query;

  let query = 'SELECT * FROM subjects WHERE is_archived = 0';
  const params = [];

  if (faculty_name) {
    query += ' AND LOWER(faculty_name) = LOWER(?)';
    params.push(faculty_name.trim());
  }

  if (department) {
    query += ' AND department = ?';
    params.push(department);
  }

  if (semester) {
    query += ' AND semester = ?';
    params.push(parseInt(semester));
  }

  if (section) {
    query += ' AND section = ?';
    params.push(section);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, subjects) => {
    if (err) return res.status(500).json({ error: 'Database error fetching subjects: ' + err.message });
    
    // Also fetch dynamic attendance stats for each subject
    db.all('SELECT * FROM attendance_sessions', [], (errSess, sessions) => {
      db.all('SELECT * FROM attendance_records', [], (errRec, records) => {
        db.all("SELECT COUNT(*) as total_students FROM users WHERE role = 'student'", [], (errStu, stuRow) => {
          const totalStudents = stuRow ? stuRow.total_students : 1;
          const sessList = sessions || [];
          const recList = records || [];

          const enrichedSubjects = (subjects || []).map((s) => {
            const matchedSessions = sessList.filter(
              (sess) => sess.subject.toLowerCase() === s.name.toLowerCase() || sess.subject.toLowerCase() === s.code.toLowerCase()
            );
            const classesHeld = matchedSessions.length;
            
            const sessionIds = new Set(matchedSessions.map((ms) => ms.id));
            const matchedRecords = recList.filter((r) => sessionIds.has(r.session_id) && r.status === 'present');
            const presentCount = matchedRecords.length;

            const totalPossible = classesHeld * totalStudents;
            const avgPercentage = classesHeld > 0 && totalPossible > 0 ? Math.min(100, Math.round((presentCount / totalPossible) * 100)) : null;

            return {
              ...s,
              type: s.type || 'Theory',
              section: s.section || 'A',
              status: s.status || 'Active',
              classesHeld,
              presentCount,
              absentCount: Math.max(0, (totalStudents * classesHeld) - presentCount),
              avgPercentage,
              attendance_percentage: avgPercentage
            };
          });

          res.json({ subjects: enrichedSubjects });
        });
      });
    });
  });
}

function createSubject(req, res) {
  const { name, code, type, department, year, semester, section, faculty_name, credits, status, description } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Subject Name and Subject Code are required.' });

  const id = 'sub-' + uuidv4();
  db.run(
    `INSERT INTO subjects (id, name, code, type, department, year, semester, section, faculty_name, credits, description, status, is_archived) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      name.trim(),
      code.trim().toUpperCase(),
      type || 'Theory',
      department || 'AI & DS',
      parseInt(year || 3),
      parseInt(semester || 5),
      section || 'A',
      faculty_name || 'Faculty Member',
      parseInt(credits || 3),
      description || '',
      status || 'Active'
    ],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Subject code already exists. Please use a unique subject code.' });
        }
        return res.status(500).json({ error: 'Failed to create subject: ' + err.message });
      }
      res.status(201).json({ message: 'Subject created successfully and synchronized across modules!', id });
    }
  );
}

function updateSubject(req, res) {
  const { id } = req.params;
  const { name, code, type, department, year, semester, section, faculty_name, credits, status, description } = req.body;

  db.run(
    `UPDATE subjects 
     SET name = ?, code = ?, type = ?, department = ?, year = ?, semester = ?, section = ?, faculty_name = ?, credits = ?, status = ?, description = ? 
     WHERE id = ?`,
    [
      name.trim(),
      code.trim().toUpperCase(),
      type || 'Theory',
      department || 'AI & DS',
      parseInt(year || 3),
      parseInt(semester || 5),
      section || 'A',
      faculty_name,
      parseInt(credits || 3),
      status || 'Active',
      description,
      id
    ],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update subject: ' + err.message });
      res.json({ message: 'Subject updated successfully across all modules!' });
    }
  );
}

function toggleArchiveSubject(req, res) {
  const { id } = req.params;
  db.get('SELECT is_archived FROM subjects WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Subject not found' });
    const newArchived = row.is_archived === 1 ? 0 : 1;
    db.run('UPDATE subjects SET is_archived = ?, status = ? WHERE id = ?', [newArchived, newArchived ? 'Inactive' : 'Active', id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Failed to archive subject' });
      res.json({ message: newArchived ? 'Subject archived' : 'Subject restored', is_archived: newArchived });
    });
  });
}

function deleteSubject(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM subjects WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete subject' });
    res.json({ message: 'Subject removed successfully' });
  });
}

// --- Timetable Controllers ---
function getTimetables(req, res) {
  const { day, date, subject, faculty, sort_by = 'period' } = req.query;
  let query = 'SELECT * FROM timetables WHERE 1=1';
  const params = [];

  if (day) {
    query += ' AND day = ?';
    params.push(day);
  }

  if (date) {
    query += ' AND (date = ? OR date IS NULL OR date = "")';
    params.push(date);
  }

  if (subject) {
    query += ' AND subject_name LIKE ?';
    params.push(`%${subject}%`);
  }

  if (faculty) {
    query += ' AND faculty_name LIKE ?';
    params.push(`%${faculty}%`);
  }

  if (sort_by === 'date') {
    query += ' ORDER BY date DESC, period_number ASC, start_time ASC';
  } else if (sort_by === 'subject') {
    query += ' ORDER BY subject_name ASC, period_number ASC';
  } else if (sort_by === 'faculty') {
    query += ' ORDER BY faculty_name ASC, period_number ASC';
  } else {
    // Default sort by day & period_number
    query += ' ORDER BY CASE day WHEN "Monday" THEN 1 WHEN "Tuesday" THEN 2 WHEN "Wednesday" THEN 3 WHEN "Thursday" THEN 4 WHEN "Friday" THEN 5 WHEN "Saturday" THEN 6 ELSE 7 END, CAST(period_number AS INTEGER) ASC, start_time ASC';
  }

  db.all(query, params, (err, timetables) => {
    if (err) return res.status(500).json({ error: 'Database error fetching timetables: ' + err.message });
    res.json({ timetables: timetables || [] });
  });
}

function createTimetable(req, res) {
  const {
    department = 'AI & DS',
    year = 3,
    section = 'A',
    semester = 5,
    date,
    day = 'Monday',
    period_number = 1,
    subject_name,
    faculty_name,
    start_time,
    end_time,
    room_number = 'F305'
  } = req.body;

  if (!subject_name || !faculty_name || !start_time) {
    return res.status(400).json({ error: 'Subject Name, Faculty Name, and Start Time are required.' });
  }

  const id = 'tt-' + uuidv4();
  db.run(
    `INSERT INTO timetables (id, department, year, section, semester, date, day, period_number, subject_name, faculty_name, start_time, end_time, room_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      department,
      parseInt(year || 3),
      section,
      parseInt(semester || 5),
      date || null,
      day,
      parseInt(period_number || 1),
      subject_name,
      faculty_name,
      start_time,
      end_time || '09:00 AM',
      room_number
    ],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create timetable slot: ' + err.message });
      res.status(201).json({ message: 'Timetable entry created successfully', id });
    }
  );
}

function updateTimetable(req, res) {
  const { id } = req.params;
  const {
    department,
    year,
    section,
    semester,
    date,
    day,
    period_number,
    subject_name,
    faculty_name,
    start_time,
    end_time,
    room_number
  } = req.body;

  db.run(
    `UPDATE timetables 
     SET department = ?, year = ?, section = ?, semester = ?, date = ?, day = ?, period_number = ?, subject_name = ?, faculty_name = ?, start_time = ?, end_time = ?, room_number = ?
     WHERE id = ?`,
    [
      department || 'AI & DS',
      parseInt(year || 3),
      section || 'A',
      parseInt(semester || 5),
      date || null,
      day || 'Monday',
      parseInt(period_number || 1),
      subject_name,
      faculty_name,
      start_time,
      end_time,
      room_number || 'F305',
      id
    ],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update timetable entry: ' + err.message });
      res.json({ message: 'Timetable entry updated successfully' });
    }
  );
}

function deleteTimetable(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM timetables WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete timetable entry: ' + err.message });
    res.json({ message: 'Timetable entry deleted successfully' });
  });
}

// --- Legacy Multi-Dept Fallbacks ---
function getDepartments(req, res) { res.json({ departments: [{ id: 'dept-1', name: 'AI & DS', code: 'AIDS', hod_name: 'Mrs Vasanthapriya M J T', description: 'Artificial Intelligence & Data Science' }] }); }
function createDepartment(req, res) { res.json({ message: 'Success' }); }
function updateDepartment(req, res) { res.json({ message: 'Success' }); }
function deleteDepartment(req, res) { res.json({ message: 'Success' }); }

function getClasses(req, res) { res.json({ classes: [{ id: 'cls-3', name: 'III Year', level_year: 3 }] }); }
function createClass(req, res) { res.json({ message: 'Success' }); }
function updateClass(req, res) { res.json({ message: 'Success' }); }
function deleteClass(req, res) { res.json({ message: 'Success' }); }

function getSections(req, res) { res.json({ sections: [{ id: 'sec-a', name: 'A' }] }); }
function createSection(req, res) { res.json({ message: 'Success' }); }
function updateSection(req, res) { res.json({ message: 'Success' }); }
function deleteSection(req, res) { res.json({ message: 'Success' }); }

module.exports = {
  getClassDetails,
  updateClassDetails,
  getFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getSubjects,
  createSubject,
  updateSubject,
  toggleArchiveSubject,
  deleteSubject,
  getTimetables,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSections,
  createSection,
  updateSection,
  deleteSection
};
