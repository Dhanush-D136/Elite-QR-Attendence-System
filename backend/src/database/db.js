const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, 'smartattend.db');
const db = new sqlite3.Database(dbPath);

const PREDEFINED_100_TOKENS = [
  "A7K9X","B4XM2","C8RT5","D7PQ9","E6ZW4","F9KL8","G3YN7","H5VC2","J8MD6","K4TR9",
  "L7QW5","M9XB3","N6KP8","P4ZT7","Q8RV2","R5MN9","S7YC4","T9KD6","U4XW8","V7RP3",
  "W5ZT9","X8MN4","Y6KC7","Z9QV5","A3RT8","B7YD4","C5KP9","D8XM6","E4ZW7","F7MN2",
  "G9TR5","H6QV8","J4KC9","K7RP2","L5YD8","M8ZT4","N4XW7","P9MN3","Q6RT5","R8KP4",
  "S5QV7","T7YC9","U8MD2","V4TR6","W7ZW9","X5KC3","Y9RP8","Z6MN4","A8QV7","B5YD9",
  "C7TR4","D9KP6","E5XM8","F8ZW3","G4MN7","H7RV5","J9KC2","K5ZT8","L8YD4","M4TR7",
  "N7QV9","P5KP3","Q9XM6","R4ZW8","S8MN5","T6KC7","U9RP4","V5YD8","W8TR2","X4QV9",
  "Y7KP5","Z5XM7","A9ZW4","B6MN8","C8KC5","D4RP7","E7YD9","F5TR3","G8QV6","H4KP9",
  "J7XM5","K9ZW2","L4MN7","M7KC8","N5RP4","P8YD6","Q4TR9","R7QV3","S9KP5","T4XM8",
  "U7ZW6","V9MN2","W4KC7","X7RP8","Y5YD4","Z8TR6","A4QV9","B8KP3","C6XM7","D7ZW5"
];

/**
 * Step 1, 3, 6, 7: Automatic Database Startup Migration System & Version Validation
 */
function runMigrations() {
  return new Promise((resolve) => {
    console.log('[DATABASE MIGRATION] Inspecting SQLite tables and schema versioning...');

    // 1. Migrate users table columns if missing
    db.all('PRAGMA table_info(users)', [], (errUser, userColumns) => {
      if (userColumns) {
        const userColNames = userColumns.map((c) => c.name.toLowerCase());
        const userMigrations = [
          { col: 'institution_name', type: "TEXT DEFAULT 'Elite Institute of Technology'" },
          { col: 'department_name', type: "TEXT DEFAULT 'Computer Science & Engineering'" },
          { col: 'device_fingerprint', type: 'TEXT' },
          { col: 'is_first_login', type: 'INTEGER DEFAULT 1' },
          { col: 'first_login', type: 'INTEGER DEFAULT 1' },
          { col: 'password_changed', type: 'INTEGER DEFAULT 0' },
          { col: 'must_change_password', type: 'INTEGER DEFAULT 0' },
          { col: 'password_changed_at', type: 'DATETIME' },
          { col: 'dob', type: 'TEXT' },
          { col: 'gender', type: 'TEXT' },
          { col: 'blood_group', type: 'TEXT' },
          { col: 'address', type: 'TEXT' },
          { col: 'parent_name', type: 'TEXT' },
          { col: 'parent_phone', type: 'TEXT' },
          { col: 'bio', type: 'TEXT' },
          { col: 'status', type: "TEXT DEFAULT 'Active'" },
          { col: 'admission_year', type: 'INTEGER' },
          { col: 'username', type: 'TEXT' },
          { col: 'vh_number', type: 'TEXT' }
        ];

        userMigrations.forEach(({ col, type }) => {
          if (!userColNames.includes(col.toLowerCase())) {
            console.log(`[MIGRATION EXECUTE] ADD COLUMN ${col} to users table`);
            try {
              db.run(`ALTER TABLE users ADD COLUMN ${col} ${type};`);
            } catch (e) {}
          }
        });

        // Mandatory Student Email Standardization Migration
        db.all("SELECT id, roll_number, email, phone, vh_number FROM users WHERE role = 'student'", [], (err, stRows) => {
          if (stRows && stRows.length > 0) {
            stRows.forEach((st) => {
              let vh = st.vh_number;
              if (!vh || vh.trim() === '') {
                if (st.phone && st.phone.toUpperCase().startsWith('VH')) {
                  vh = st.phone.trim().toUpperCase();
                } else if (st.roll_number && st.roll_number.length >= 4) {
                  const num = st.roll_number.replace(/[^0-9]/g, '');
                  vh = 'VH' + (num.length >= 4 ? num.slice(-5) : '13936');
                } else {
                  vh = 'VH13936';
                }
              }

              vh = vh.trim().toUpperCase();
              const officialEmail = `${vh.toLowerCase()}@velhightech.com`;

              db.run("UPDATE users SET vh_number = ?, email = ? WHERE id = ?", [vh, officialEmail, st.id]);
            });
            console.log(`[STUDENT EMAIL MIGRATION] Standardized ${stRows.length} student emails to official @velhightech.com format.`);
          }
        });
      }

      // 2. Migrate attendance_sessions table
      db.all('PRAGMA table_info(attendance_sessions)', [], (err, columns) => {
        if (err || !columns) {
          console.error('[DATABASE MIGRATION] Error querying attendance_sessions info:', err);
          return resolve(false);
        }

        const colNames = columns.map((c) => c.name.toLowerCase());
        console.log('[PRAGMA table_info(attendance_sessions)] Existing columns:', colNames.join(', '));

        const requiredMigrations = [
          { col: 'attendance_code', type: 'TEXT' },
          { col: 'active_token', type: 'TEXT' },
          { col: 'token', type: 'TEXT' },
          { col: 'admin_latitude', type: 'REAL' },
          { col: 'admin_longitude', type: 'REAL' },
          { col: 'end_time', type: 'DATETIME' },
          { col: 'created_at', type: 'DATETIME' },
          { col: 'period_number', type: 'TEXT' },
          { col: 'faculty_name', type: 'TEXT' },
          { col: 'date', type: 'TEXT' }
        ];

        let completedCount = 0;
        requiredMigrations.forEach(({ col, type }) => {
          if (!colNames.includes(col.toLowerCase())) {
            console.log(`[MIGRATION EXECUTE] ADD COLUMN ${col} (${type}) to attendance_sessions`);
            db.run(`ALTER TABLE attendance_sessions ADD COLUMN ${col} ${type};`, () => {
              completedCount++;
              if (completedCount >= requiredMigrations.length) {
                verifyRecordsTable();
              }
            });
          } else {
            completedCount++;
            if (completedCount >= requiredMigrations.length) {
              verifyRecordsTable();
            }
          }
        });

        function verifyRecordsTable() {
          db.all('PRAGMA table_info(attendance_records)', [], (err2, recColumns) => {
            if (recColumns) {
              const recColNames = recColumns.map((c) => c.name.toLowerCase());
              if (!recColNames.includes('attendance_code')) {
                db.run('ALTER TABLE attendance_records ADD COLUMN attendance_code TEXT;');
              }
              if (!recColNames.includes('notes')) {
                db.run('ALTER TABLE attendance_records ADD COLUMN notes TEXT;');
              }
            }

            // Verify subjects schema migrations
            db.all('PRAGMA table_info(subjects)', [], (errSub, subColumns) => {
              if (subColumns) {
                const subColNames = subColumns.map((c) => c.name.toLowerCase());
                const subMigrations = [
                  { col: 'type', type: "TEXT DEFAULT 'Theory'" },
                  { col: 'section', type: "TEXT DEFAULT 'A'" },
                  { col: 'status', type: "TEXT DEFAULT 'Active'" }
                ];
                subMigrations.forEach(({ col, type }) => {
                  if (!subColNames.includes(col.toLowerCase())) {
                    console.log(`[MIGRATION EXECUTE] ADD COLUMN ${col} to subjects`);
                    try {
                      db.run(`ALTER TABLE subjects ADD COLUMN ${col} ${type};`);
                    } catch (e) {}
                  }
                });
              }

              // Verify timetables schema migrations
              db.all('PRAGMA table_info(timetables)', [], (err3, ttColumns) => {
                if (ttColumns) {
                  const ttColNames = ttColumns.map((c) => c.name.toLowerCase());
                  const ttMigrations = [
                    { col: 'date', type: 'TEXT' },
                    { col: 'period_number', type: 'INTEGER DEFAULT 1' },
                    { col: 'semester', type: 'INTEGER DEFAULT 5' }
                  ];
                  ttMigrations.forEach(({ col, type }) => {
                    if (!ttColNames.includes(col.toLowerCase())) {
                      console.log(`[MIGRATION EXECUTE] ADD COLUMN ${col} to timetables`);
                      try {
                        db.run(`ALTER TABLE timetables ADD COLUMN ${col} ${type};`);
                      } catch (e) {}
                    }
                  });
                }

                // Auto-sync & Seed Master Timetable for Semester 5 Section A
                const SEMESTER_5_CODES = [
                  '21AI55T', '21AI51T', '21HI52T', '21EE01P', '21HI53IT', 
                  '21MB03OT', '21HC54T', '21AI57P', '21EE03P', 'SPORTS_HOUR'
                ];

                // 1. Purge legacy subjects not in Semester 5 master list
                db.run(
                  `DELETE FROM subjects WHERE code NOT IN (${SEMESTER_5_CODES.map(() => '?').join(',')}) AND (semester != 5 OR code LIKE 'SUB%')`,
                  SEMESTER_5_CODES
                );
                db.run(
                  `DELETE FROM timetables WHERE subject_name NOT IN (${SEMESTER_5_CODES.map(() => '?').join(',')}) AND subject_name NOT IN (SELECT name FROM subjects)`
                );

                const SEMESTER_5_SUBJECTS = [
                  { code: '21AI55T', name: 'Knowledge Engineering', faculty_name: 'Mrs Nivetha P', type: 'Theory', credits: 3 },
                  { code: '21AI51T', name: 'Programming Language for AI', faculty_name: 'Dr Rajesh Kumar', type: 'Theory', credits: 3 },
                  { code: '21HI52T', name: 'Data Analytics', faculty_name: 'Mrs Gowthami K', type: 'Theory', credits: 3 },
                  { code: '21EE01P', name: 'Mini Project - I', faculty_name: 'Mr Arun Kumar', type: 'Project', credits: 2 },
                  { code: '21HI53IT', name: 'Web Technology', faculty_name: 'Mrs Vasanthapriya M J T', type: 'Theory', credits: 3 },
                  { code: '21MB03OT', name: 'Open Elective Subject', faculty_name: 'Faculty Member', type: 'Theory', credits: 3 },
                  { code: '21HC54T', name: 'Block Chain Technology', faculty_name: 'Mrs Deepa R', type: 'Theory', credits: 3 },
                  { code: '21AI57P', name: 'Data Analytics Laboratory', faculty_name: 'Mrs Gowthami K', type: 'Lab', credits: 2 },
                  { code: '21EE03P', name: 'Technical Seminar', faculty_name: 'Mr Arun Kumar', type: 'Seminar', credits: 1 },
                  { code: 'SPORTS_HOUR', name: 'Sports', faculty_name: 'Physical Director', type: 'Sports', credits: 0 }
                ];

                SEMESTER_5_SUBJECTS.forEach((sub) => {
                  const subId = 'sub-' + sub.code.toLowerCase();
                  db.run(
                    `INSERT OR REPLACE INTO subjects (id, name, code, type, department, year, semester, section, faculty_name, credits, status, is_archived)
                     VALUES (?, ?, ?, ?, 'AI & DS', 3, 5, 'A', ?, ?, 'Active', 0)`,
                    [subId, sub.name, sub.code, sub.type, sub.faculty_name, sub.credits]
                  );
                });

                // Clear & Repopulate Master Timetable Slots for Semester 5 Section A
                db.run("DELETE FROM timetables WHERE department = 'AI & DS' AND year = 3 AND section = 'A'", () => {
                  const MASTER_TIMETABLE_SLOTS = [
                    // Monday
                    { day: 'Monday', period_number: 1, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Nivetha P', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Monday', period_number: 2, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Dr Rajesh Kumar', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                    { day: 'Monday', period_number: 3, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                    { day: 'Monday', period_number: 4, code: '21EE01P', name: 'Mini Project - I', faculty: 'Mr Arun Kumar', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                    { day: 'Monday', period_number: 5, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                    { day: 'Monday', period_number: 6, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Monday', period_number: 7, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Monday', period_number: 8, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '02:45 PM', end: '03:30 PM', room: 'F305' },

                    // Tuesday
                    { day: 'Tuesday', period_number: 1, code: '21MB03OT', name: 'Open Elective Subject', faculty: 'Faculty Member', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Tuesday', period_number: 2, code: '21MB03OT', name: 'Open Elective Subject', faculty: 'Faculty Member', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                    { day: 'Tuesday', period_number: 3, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                    { day: 'Tuesday', period_number: 4, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Nivetha P', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                    { day: 'Tuesday', period_number: 5, code: '21HC54T', name: 'Block Chain Technology', faculty: 'Mrs Deepa R', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                    { day: 'Tuesday', period_number: 6, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Tuesday', period_number: 7, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Tuesday', period_number: 8, code: '21HC54T', name: 'Block Chain Technology', faculty: 'Mrs Deepa R', start: '02:45 PM', end: '03:30 PM', room: 'F305' },

                    // Wednesday
                    { day: 'Wednesday', period_number: 1, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Wednesday', period_number: 2, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K', start: '09:05 AM', end: '09:55 AM', room: 'Lab 2' },
                    { day: 'Wednesday', period_number: 3, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'Lab 2' },
                    { day: 'Wednesday', period_number: 4, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K', start: '11:00 AM', end: '11:50 AM', room: 'Lab 2' },
                    { day: 'Wednesday', period_number: 5, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K', start: '11:50 AM', end: '12:35 PM', room: 'Lab 2' },
                    { day: 'Wednesday', period_number: 6, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Dr Rajesh Kumar', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Wednesday', period_number: 7, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Nivetha P', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Wednesday', period_number: 8, code: 'SPORTS_HOUR', name: 'Sports', faculty: 'Physical Director', start: '02:45 PM', end: '03:30 PM', room: 'Ground' },

                    // Thursday
                    { day: 'Thursday', period_number: 1, code: '21MB03OT', name: 'Open Elective Subject', faculty: 'Faculty Member', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Thursday', period_number: 2, code: '21MB03OT', name: 'Open Elective Subject', faculty: 'Faculty Member', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                    { day: 'Thursday', period_number: 3, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Dr Rajesh Kumar', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                    { day: 'Thursday', period_number: 4, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                    { day: 'Thursday', period_number: 5, code: '21HC54T', name: 'Block Chain Technology', faculty: 'Mrs Deepa R', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                    { day: 'Thursday', period_number: 6, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Nivetha P', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Thursday', period_number: 7, code: '21HC54T', name: 'Block Chain Technology', faculty: 'Mrs Deepa R', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Thursday', period_number: 8, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Dr Rajesh Kumar', start: '02:45 PM', end: '03:30 PM', room: 'F305' },

                    // Friday
                    { day: 'Friday', period_number: 1, code: '21EE01P', name: 'Mini Project - I', faculty: 'Mr Arun Kumar', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Friday', period_number: 2, code: '21EE01P', name: 'Mini Project - I', faculty: 'Mr Arun Kumar', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                    { day: 'Friday', period_number: 3, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                    { day: 'Friday', period_number: 4, code: '21EE03P', name: 'Technical Seminar', faculty: 'Mr Arun Kumar', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                    { day: 'Friday', period_number: 5, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Dr Rajesh Kumar', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                    { day: 'Friday', period_number: 6, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Friday', period_number: 7, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Nivetha P', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Friday', period_number: 8, code: '21HC54T', name: 'Block Chain Technology', faculty: 'Mrs Deepa R', start: '02:45 PM', end: '03:30 PM', room: 'F305' }
                  ];

                  MASTER_TIMETABLE_SLOTS.forEach((slot) => {
                    const ttId = `tt-${slot.day.toLowerCase()}-p${slot.period_number}`;
                    db.run(
                      `INSERT OR REPLACE INTO timetables (id, department, year, section, semester, day, period_number, subject_name, faculty_name, start_time, end_time, room_number)
                       VALUES (?, 'AI & DS', 3, 'A', 5, ?, ?, ?, ?, ?, ?, ?)`,
                      [ttId, slot.day, slot.period_number, slot.name, slot.faculty, slot.start, slot.end, slot.room]
                    );
                  });
                });

                console.log('[DATABASE MIGRATION] Master Semester 5 Section A Timetable seeded cleanly with official period timings.');
                resolve(true);
              });
            });
          });
        }
      });
    });
  });
}

function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      // Create Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          roll_number TEXT UNIQUE,
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL,
          department TEXT,
          year INTEGER,
          section TEXT,
          phone TEXT,
          profile_photo TEXT,
          institution_name TEXT DEFAULT 'Elite Institute of Technology',
          department_name TEXT DEFAULT 'Computer Science & Engineering',
          password_hash TEXT NOT NULL,
          device_fingerprint TEXT,
          must_change_password INTEGER DEFAULT 0,
          is_first_login INTEGER DEFAULT 1,
          first_login INTEGER DEFAULT 1,
          password_changed INTEGER DEFAULT 0,
          password_changed_at DATETIME,
          dob TEXT,
          gender TEXT,
          blood_group TEXT,
          address TEXT,
          parent_name TEXT,
          parent_phone TEXT,
          bio TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Attendance Tokens table (100 Predefined Tokens Pool)
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_tokens (
          id TEXT PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          qr_image_path TEXT,
          is_used INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Attendance Sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_sessions (
          id TEXT PRIMARY KEY,
          subject TEXT NOT NULL,
          department TEXT NOT NULL,
          year INTEGER NOT NULL,
          section TEXT NOT NULL,
          admin_lat REAL NOT NULL,
          admin_lng REAL NOT NULL,
          admin_latitude REAL,
          admin_longitude REAL,
          start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          expiry_time DATETIME NOT NULL,
          end_time DATETIME,
          duration_minutes INTEGER NOT NULL,
          attendance_code TEXT NOT NULL,
          active_token TEXT,
          token TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Attendance Records table
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_records (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          attendance_code TEXT,
          attendance_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          student_lat REAL NOT NULL,
          student_lng REAL NOT NULL,
          distance_meters REAL NOT NULL,
          status TEXT NOT NULL,
          device_fingerprint TEXT,
          notes TEXT,
          FOREIGN KEY (student_id) REFERENCES users(id),
          FOREIGN KEY (session_id) REFERENCES attendance_sessions(id)
        )
      `);

      // Create Violation Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS violation_logs (
          id TEXT PRIMARY KEY,
          student_id TEXT,
          student_name TEXT,
          roll_number TEXT,
          violation_type TEXT NOT NULL,
          details TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Login Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS login_logs (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip_address TEXT,
          device TEXT,
          browser TEXT,
          FOREIGN KEY (student_id) REFERENCES users(id)
        )
      `);

      // Create Password Audit Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS password_audit_logs (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          changed_by TEXT NOT NULL,
          action TEXT NOT NULL,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id)
        )
      `);

      // Create Departments table
      db.run(`
        CREATE TABLE IF NOT EXISTS departments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          hod_name TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Classes table
      db.run(`
        CREATE TABLE IF NOT EXISTS classes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          level_year INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Sections table
      db.run(`
        CREATE TABLE IF NOT EXISTS sections (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Subjects table
      db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          type TEXT DEFAULT 'Theory',
          department TEXT NOT NULL,
          year INTEGER NOT NULL,
          semester INTEGER NOT NULL,
          section TEXT DEFAULT 'A',
          faculty_name TEXT,
          credits INTEGER DEFAULT 3,
          description TEXT,
          status TEXT DEFAULT 'Active',
          is_archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Timetables table
      db.run(`
        CREATE TABLE IF NOT EXISTS timetables (
          id TEXT PRIMARY KEY,
          department TEXT NOT NULL,
          year INTEGER NOT NULL,
          section TEXT NOT NULL,
          semester INTEGER DEFAULT 5,
          date TEXT,
          day TEXT NOT NULL,
          period_number INTEGER DEFAULT 1,
          subject_name TEXT NOT NULL,
          faculty_name TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          room_number TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create System Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          wifi_restriction_enabled INTEGER DEFAULT 0,
          allowed_ip_subnets TEXT DEFAULT '192.168.1.0/24,10.0.0.0/16',
          geofence_radius_meters REAL DEFAULT 30.0,
          grace_period_minutes INTEGER DEFAULT 5
        )
      `);

      // Run automatic schema migrations
      await runMigrations();

      // Seed Initial Admin (Vel Admin with credentials: vel / elite minds)
      const adminPasswordHash = await bcrypt.hash('elite minds', 10);

      db.run(
        `INSERT OR IGNORE INTO users (id, name, roll_number, email, role, department, year, section, phone, profile_photo, password_hash, must_change_password, is_first_login) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [
          'admin-1',
          'Vel Admin',
          'vel',
          'vel',
          'admin',
          'Computer Science & Engineering',
          0,
          'N/A',
          '+1-555-0192',
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          adminPasswordHash
        ]
      );

      // Force update existing admin-1 user credentials to vel / elite minds
      db.run(
        `UPDATE users SET name = 'Vel Admin', email = 'vel', roll_number = 'vel', password_hash = ? WHERE role = 'admin'`,
        [adminPasswordHash]
      );

      // Seed 100 Predefined Attendance Tokens
      for (const token of PREDEFINED_100_TOKENS) {
        db.run(
          `INSERT OR IGNORE INTO attendance_tokens (id, token, qr_image_path, is_used, is_active)
           VALUES (?, ?, ?, 0, 0)`,
          [uuidv4(), token, `/attendance_qr_codes/${token}.png`]
        );
      }

      // Seed Default System Settings
      db.run(
        `INSERT OR IGNORE INTO system_settings (id, wifi_restriction_enabled, allowed_ip_subnets, geofence_radius_meters, grace_period_minutes)
         VALUES (1, 0, '192.168.1.0/24', 30.0, 5)`
      );

      // Create Class Details table
      db.run(`
        CREATE TABLE IF NOT EXISTS class_details (
          id INTEGER PRIMARY KEY DEFAULT 1,
          department TEXT NOT NULL,
          year TEXT NOT NULL,
          section TEXT NOT NULL,
          semester TEXT NOT NULL,
          room TEXT NOT NULL,
          class_advisor TEXT NOT NULL,
          academic_year TEXT NOT NULL,
          batch TEXT NOT NULL
        )
      `, () => {
        db.run(
          `INSERT OR IGNORE INTO class_details (id, department, year, section, semester, room, class_advisor, academic_year, batch)
           VALUES (1, 'AI & DS', 'III Year', 'A', 'V', 'F305', 'Mrs Vasanthapriya M J T', '2026-2027 (ODD)', '2024-2028')`
        );
      });

      // Create Faculties table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculties (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          department TEXT,
          email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Subjects table
      db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT NOT NULL,
          department TEXT,
          year INTEGER,
          semester INTEGER,
          faculty_name TEXT,
          credits INTEGER DEFAULT 3,
          description TEXT,
          is_archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Timetables table
      db.run(`
        CREATE TABLE IF NOT EXISTS timetables (
          id TEXT PRIMARY KEY,
          department TEXT,
          year INTEGER,
          section TEXT,
          day TEXT,
          subject_name TEXT,
          faculty_name TEXT,
          start_time TEXT,
          end_time TEXT,
          room_number TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ Database initialized cleanly for production. Demo seeds removed.');
      resolve(true);
    });
  });
}

module.exports = { db, initDb, runMigrations, PREDEFINED_100_TOKENS };
