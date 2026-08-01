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

        // Migrate faculty table columns if missing
        db.all('PRAGMA table_info(faculty)', [], (errFac, facColumns) => {
          if (facColumns) {
            const facColNames = facColumns.map((c) => c.name.toLowerCase());
            const facMigrations = [
              { col: 'status', type: "TEXT DEFAULT 'Active'" },
              { col: 'password_changed', type: 'INTEGER DEFAULT 0' },
              { col: 'must_change_password', type: 'INTEGER DEFAULT 0' },
              { col: 'last_login', type: 'DATETIME' },
              { col: 'login_count', type: 'INTEGER DEFAULT 0' },
              { col: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
              { col: 'updated_at', type: 'DATETIME' }
            ];
            facMigrations.forEach(({ col, type }) => {
              if (!facColNames.includes(col.toLowerCase())) {
                try {
                  db.run(`ALTER TABLE faculty ADD COLUMN ${col} ${type};`);
                } catch (e) {}
              }
            });
          }
        });

        // Mandatory Student Email Standardization Migration: Purge all fake email domains
        db.run(`
          UPDATE users 
          SET vh_number = CASE 
                WHEN vh_number IS NOT NULL AND vh_number LIKE 'VH%' THEN vh_number 
                WHEN phone IS NOT NULL AND phone LIKE 'VH%' THEN phone 
                WHEN roll_number IS NOT NULL THEN 'VH' || SUBSTR(roll_number, -5)
                ELSE 'VH13936'
              END,
              email = LOWER(
                CASE 
                  WHEN vh_number IS NOT NULL AND vh_number LIKE 'VH%' THEN vh_number 
                  WHEN phone IS NOT NULL AND phone LIKE 'VH%' THEN phone 
                  WHEN roll_number IS NOT NULL THEN 'VH' || SUBSTR(roll_number, -5)
                  ELSE 'VH13936'
                END
              ) || '@velhightech.com'
          WHERE role = 'student'
        `, (stErr) => {
          if (!stErr) {
            console.log('[STUDENT EMAIL MIGRATION] All student accounts purged of fake email domains and standardized to official @velhightech.com emails.');
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
                  { code: '21AI51T', name: 'Programming Language for AI', faculty_name: 'Mrs Nivetha P', type: 'Theory', credits: 3 },
                  { code: '21AI55T', name: 'Knowledge Engineering', faculty_name: 'Mrs Krithiga', type: 'Theory', credits: 3 },
                  { code: '21HI52T', name: 'Data Analytics', faculty_name: 'Mrs Gowthami K', type: 'Theory', credits: 3 },
                  { code: '21HI53IT', name: 'Web Technology', faculty_name: 'Mrs Vasanthapriya M J T', type: 'Theory', credits: 3 },
                  { code: '21HC54T', name: 'Blockchain Technology', faculty_name: 'Mr Ramajayam', type: 'Theory', credits: 3 },
                  { code: '21AI57P', name: 'Data Analytics Laboratory', faculty_name: 'Mrs Gowthami K / Mr Balaji M', type: 'Lab', credits: 2 },
                  { code: '21EE01P', name: 'Mini Project - I', faculty_name: 'Mr Balaarunesh G', type: 'Project', credits: 2 },
                  { code: '21EE03P', name: 'Technical Seminar', faculty_name: 'Mr Balaarunesh G', type: 'Seminar', credits: 1 },
                  { code: '21MB03OT', name: 'Entrepreneurship Development', faculty_name: 'Open Elective', type: 'Theory', credits: 3 },
                  { code: 'SPORTS_HOUR', name: 'Sports', faculty_name: 'Sports Department', type: 'Sports', credits: 0 }
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
                    { day: 'Monday', period_number: 1, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Monday', period_number: 2, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                    { day: 'Monday', period_number: 3, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                    { day: 'Monday', period_number: 4, code: '21EE01P', name: 'Mini Project - I', faculty: 'Mr Balaarunesh G', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                    { day: 'Monday', period_number: 5, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                    { day: 'Monday', period_number: 6, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Monday', period_number: 7, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Monday', period_number: 8, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '02:45 PM', end: '03:30 PM', room: 'F305' },

                    // Tuesday
                    { day: 'Tuesday', period_number: 1, code: '21MB03OT', name: 'Entrepreneurship Development', faculty: 'Open Elective', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Tuesday', period_number: 2, code: '21MB03OT', name: 'Entrepreneurship Development', faculty: 'Open Elective', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                    { day: 'Tuesday', period_number: 3, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                    { day: 'Tuesday', period_number: 4, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                    { day: 'Tuesday', period_number: 5, code: '21HC54T', name: 'Blockchain Technology', faculty: 'Mr Ramajayam', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                    { day: 'Tuesday', period_number: 6, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Tuesday', period_number: 7, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Tuesday', period_number: 8, code: '21HC54T', name: 'Blockchain Technology', faculty: 'Mr Ramajayam', start: '02:45 PM', end: '03:30 PM', room: 'F305' },

                    // Wednesday
                    { day: 'Wednesday', period_number: 1, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Wednesday', period_number: 2, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K / Mr Balaji M', start: '09:05 AM', end: '09:55 AM', room: 'Lab 2' },
                    { day: 'Wednesday', period_number: 3, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K / Mr Balaji M', start: '10:10 AM', end: '11:00 AM', room: 'Lab 2' },
                    { day: 'Wednesday', period_number: 4, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K / Mr Balaji M', start: '11:00 AM', end: '11:50 AM', room: 'Lab 2' },
                    { day: 'Wednesday', period_number: 5, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K / Mr Balaji M', start: '11:50 AM', end: '12:35 PM', room: 'Lab 2' },
                    { day: 'Wednesday', period_number: 6, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Wednesday', period_number: 7, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Wednesday', period_number: 8, code: 'SPORTS_HOUR', name: 'Sports', faculty: 'Sports Department', start: '02:45 PM', end: '03:30 PM', room: 'Ground' },

                    // Thursday
                    { day: 'Thursday', period_number: 1, code: '21MB03OT', name: 'Entrepreneurship Development', faculty: 'Open Elective', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Thursday', period_number: 2, code: '21MB03OT', name: 'Entrepreneurship Development', faculty: 'Open Elective', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                    { day: 'Thursday', period_number: 3, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                    { day: 'Thursday', period_number: 4, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                    { day: 'Thursday', period_number: 5, code: '21HC54T', name: 'Blockchain Technology', faculty: 'Mr Ramajayam', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                    { day: 'Thursday', period_number: 6, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Thursday', period_number: 7, code: '21HC54T', name: 'Blockchain Technology', faculty: 'Mr Ramajayam', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Thursday', period_number: 8, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '02:45 PM', end: '03:30 PM', room: 'F305' },

                    // Friday
                    { day: 'Friday', period_number: 1, code: '21EE01P', name: 'Mini Project - I', faculty: 'Mr Balaarunesh G', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                    { day: 'Friday', period_number: 2, code: '21EE01P', name: 'Mini Project - I', faculty: 'Mr Balaarunesh G', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                    { day: 'Friday', period_number: 3, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                    { day: 'Friday', period_number: 4, code: '21EE03P', name: 'Technical Seminar', faculty: 'Mr Balaarunesh G', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                    { day: 'Friday', period_number: 5, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                    { day: 'Friday', period_number: 6, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                    { day: 'Friday', period_number: 7, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                    { day: 'Friday', period_number: 8, code: 'RESERVED', name: 'Reserved Hour', faculty: 'Admin Configured', start: '02:45 PM', end: '03:30 PM', room: 'F305' }
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

      // Create Faculties table with extended schema
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty (
          id TEXT PRIMARY KEY,
          faculty_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          department TEXT,
          designation TEXT,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          qualification TEXT,
          experience TEXT,
          specialization TEXT,
          profile_photo TEXT,
          status TEXT DEFAULT 'Active',
          password_hash TEXT NOT NULL,
          password_changed INTEGER DEFAULT 0,
          must_change_password INTEGER DEFAULT 0,
          last_login DATETIME,
          login_count INTEGER DEFAULT 0,
          failed_login_attempts INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, async () => {
        // Run column migrations on faculty table if created with legacy schema
        db.all('PRAGMA table_info(faculty)', [], (errFacCol, facCols) => {
          if (facCols) {
            const facColNames = facCols.map((c) => c.name.toLowerCase());
            const facMigrations = [
              { col: 'status', type: "TEXT DEFAULT 'Active'" },
              { col: 'password_changed', type: 'INTEGER DEFAULT 0' },
              { col: 'must_change_password', type: 'INTEGER DEFAULT 0' },
              { col: 'last_login', type: 'DATETIME' },
              { col: 'login_count', type: 'INTEGER DEFAULT 0' },
              { col: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
              { col: 'updated_at', type: 'DATETIME' }
            ];
            facMigrations.forEach(({ col, type }) => {
              if (!facColNames.includes(col.toLowerCase())) {
                try {
                  db.run(`ALTER TABLE faculty ADD COLUMN ${col} ${type};`);
                } catch (e) {}
              }
            });
          }
        });

        // Seed default faculty account FAC001 - Mrs Nivetha P if not exists
        const bcrypt = require('bcryptjs');
        const defaultHash = await bcrypt.hash('1234', 10);
        db.run(
          `INSERT OR IGNORE INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, status, password_hash)
           VALUES ('FAC-001-ID', 'FAC001', 'Mrs Nivetha P', 'AI & Data Science', 'Assistant Professor', 'nivetha@velhightech.com', '+91 9876501234', 'M.Tech (AI & DS)', '6 Years Teaching', 'Programming Language for AI', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'Active', ?)`,
          [defaultHash]
        );
        db.run(
          `INSERT OR IGNORE INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, status, password_hash)
           VALUES ('FAC-003-ID', 'FAC003', 'Mrs Vasanthapriya M J T', 'AI & Data Science', 'Assistant Professor', 'vasanthapriya@velhightech.com', '+91 9876509012', 'M.Tech (Computer Science)', '7 Years Teaching', 'Web Technology', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'Active', ?)`,
          [defaultHash]
        );
        db.run(
          `INSERT OR IGNORE INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, status, password_hash)
           VALUES ('FAC-007-ID', 'FAC007', 'Mrs Krithiga', 'AI & Data Science', 'Assistant Professor', 'krithiga@velhightech.com', '+91 9876501111', 'M.Tech (AI)', '5 Years Teaching', 'Knowledge Engineering', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'Active', ?)`,
          [defaultHash]
        );
        db.run(
          `INSERT OR IGNORE INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, status, password_hash)
           VALUES ('FAC-008-ID', 'FAC008', 'Mrs Gowthami K', 'AI & Data Science', 'Assistant Professor', 'gowthami@velhightech.com', '+91 9876502222', 'M.E. (Data Science)', '6 Years Teaching', 'Data Analytics & Laboratory', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150', 'Active', ?)`,
          [defaultHash]
        );
        db.run(
          `INSERT OR IGNORE INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, status, password_hash)
           VALUES ('FAC-009-ID', 'FAC009', 'Mr Ramajayam', 'AI & Data Science', 'Associate Professor', 'ramajayam@velhightech.com', '+91 9876503333', 'M.Tech (CS)', '8 Years Teaching', 'Blockchain Technology', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Active', ?)`,
          [defaultHash]
        );
        db.run(
          `INSERT OR IGNORE INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, status, password_hash)
           VALUES ('FAC-010-ID', 'FAC010', 'Mr Balaji M', 'AI & Data Science', 'Assistant Professor', 'balaji@velhightech.com', '+91 9876504444', 'M.Tech (AI & DS)', '4 Years Teaching', 'Data Analytics Laboratory', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'Active', ?)`,
          [defaultHash]
        );
        db.run(
          `INSERT OR IGNORE INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, status, password_hash)
           VALUES ('FAC-011-ID', 'FAC011', 'Mr Balaarunesh G', 'AI & Data Science', 'Assistant Professor', 'balaarunesh@velhightech.com', '+91 9876505555', 'M.E. (ECE)', '5 Years Teaching', 'Mini Project & Technical Seminar', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'Active', ?)`,
          [defaultHash]
        );
      });

      // Create Faculty Subjects Mapping tables
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_subject_mapping (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          subject_id TEXT,
          subject_name TEXT NOT NULL,
          subject_code TEXT NOT NULL,
          department TEXT,
          year INTEGER DEFAULT 3,
          section TEXT DEFAULT 'A',
          semester INTEGER DEFAULT 5,
          academic_year TEXT DEFAULT '2025-2026',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_timetable_mapping (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          faculty_name TEXT,
          day TEXT NOT NULL,
          period TEXT NOT NULL,
          subject_id TEXT,
          subject_name TEXT NOT NULL,
          subject_code TEXT,
          section TEXT DEFAULT 'A',
          department TEXT DEFAULT 'AI & DS',
          year INTEGER DEFAULT 3,
          room_no TEXT DEFAULT 'F305',
          start_time TEXT,
          end_time TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_subjects (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          subject_code TEXT NOT NULL,
          subject_name TEXT NOT NULL,
          department TEXT,
          year INTEGER,
          section TEXT
        )
      `, () => {
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-001', 'FAC-001-ID', '21AI51T', 'Programming Language for AI', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-002', 'FAC-007-ID', '21AI55T', 'Knowledge Engineering', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-003', 'FAC-008-ID', '21HI52T', 'Data Analytics', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-004', 'FAC-003-ID', '21HI53IT', 'Web Technology', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-005', 'FAC-009-ID', '21HC54T', 'Blockchain Technology', 'AI & DS', 3, 'A')`);

        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-001', 'FAC-001-ID', '21AI51T', 'Programming Language for AI', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-002', 'FAC-007-ID', '21AI55T', 'Knowledge Engineering', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-003', 'FAC-008-ID', '21HI52T', 'Data Analytics', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-004', 'FAC-003-ID', '21HI53IT', 'Web Technology', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-005', 'FAC-009-ID', '21HC54T', 'Blockchain Technology', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-006', 'FAC-008-ID', '21AI57P', 'Data Analytics Laboratory', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-007', 'FAC-010-ID', '21AI57P', 'Data Analytics Laboratory', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-008', 'FAC-011-ID', '21EE01P', 'Mini Project - I', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-009', 'FAC-011-ID', '21EE03P', 'Technical Seminar', 'AI & DS', 3, 'A')`);
      });

      // Create Faculty Remarks table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_remarks (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          faculty_id TEXT NOT NULL,
          remark_type TEXT NOT NULL,
          comment TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Faculty Documents table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_documents (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          subject_code TEXT NOT NULL,
          unit TEXT NOT NULL,
          title TEXT NOT NULL,
          file_url TEXT NOT NULL,
          file_type TEXT DEFAULT 'PDF',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Faculty Announcements table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_announcements (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          subject_code TEXT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Faculty Leave Requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_leave_requests (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          leave_type TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          reason TEXT NOT NULL,
          status TEXT DEFAULT 'Pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Faculty Activity Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_activity_logs (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          device TEXT,
          browser TEXT,
          status TEXT DEFAULT 'Success',
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, () => {
        db.all('PRAGMA table_info(faculty_activity_logs)', [], (err, cols) => {
          if (cols) {
            const names = cols.map((c) => c.name.toLowerCase());
            if (!names.includes('ip_address')) db.run('ALTER TABLE faculty_activity_logs ADD COLUMN ip_address TEXT;');
            if (!names.includes('device')) db.run('ALTER TABLE faculty_activity_logs ADD COLUMN device TEXT;');
            if (!names.includes('browser')) db.run('ALTER TABLE faculty_activity_logs ADD COLUMN browser TEXT;');
            if (!names.includes('status')) db.run("ALTER TABLE faculty_activity_logs ADD COLUMN status TEXT DEFAULT 'Success';");
          }
        });
      });

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

      // Create Timetables table & seed full weekly slots for AI & DS and Computer Science
      db.run(`
        CREATE TABLE IF NOT EXISTS timetables (
          id TEXT PRIMARY KEY,
          department TEXT,
          year INTEGER,
          section TEXT,
          semester INTEGER DEFAULT 5,
          date TEXT,
          day TEXT,
          period_number INTEGER,
          subject_name TEXT,
          faculty_name TEXT,
          start_time TEXT,
          end_time TEXT,
          room_number TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_timetables_slot ON timetables(department, year, section, day, period_number);
      `, () => {
        console.log('✅ Database initialized cleanly with Official Production Timetables for AI & DS III-A (40 Weekly Slots).');
        resolve(true);
      });
    });
  });
}

module.exports = { db, initDb, runMigrations, PREDEFINED_100_TOKENS };
