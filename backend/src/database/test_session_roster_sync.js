const { db } = require('./db');
const { v4: uuidv4 } = require('uuid');

function testSessionRosterSync() {
  console.log('==================================================');
  console.log('TESTING SESSION ROSTER & ATTENDANCE RECORD SYNC');
  console.log('==================================================\n');

  const nowMs = Date.now();
  const testStudentId = 'test-roster-student-' + nowMs;
  const testRoll = '1130242430' + (nowMs % 1000);
  const testEmail = `dhanush.test.${nowMs}@univ.edu`;
  const testSessionId = 'test-session-' + nowMs;
  const recordId = uuidv4();

  db.serialize(() => {
    // 1. Create session
    db.run(
      `INSERT INTO attendance_sessions (id, subject, department, year, section, period_number, faculty_name, admin_lat, admin_lng, start_time, expiry_time, duration_minutes, attendance_code, status)
       VALUES (?, 'Programming Language for AI', 'AI & DS', 3, 'A', '1', 'Mrs Nivetha P', 0.0, 0.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 25, '1344', 'active')`,
      [testSessionId]
    );

    // 2. Create student
    db.run(
      `INSERT INTO users (id, name, roll_number, email, role, department, year, section, password_hash)
       VALUES (?, 'DHANUSH D TEST', ?, ?, 'student', 'AI & DS', 3, 'A', 'hash')`,
      [testStudentId, testRoll, testEmail]
    );

    // 3. Insert record
    db.run(
      `INSERT INTO attendance_records (id, student_id, session_id, attendance_code, attendance_time, status, student_lat, student_lng, distance_meters)
       VALUES (?, ?, ?, '1344', CURRENT_TIMESTAMP, 'present', 0.0, 0.0, 0.0)`,
      [recordId, testStudentId, testSessionId]
    );

    // 4. Query session and records
    db.get('SELECT * FROM attendance_sessions WHERE id = ?', [testSessionId], (err, session) => {
      db.all(
        `SELECT ar.*, u.name as student_name, u.name, u.roll_number, u.email as student_email, u.email, u.profile_photo, u.department, u.year, u.section 
         FROM attendance_records ar 
         JOIN users u ON ar.student_id = u.id 
         WHERE ar.session_id = ? 
         ORDER BY ar.attendance_time DESC`,
        [testSessionId],
        (err2, records) => {
          const presentStudents = [];
          const processed = new Set();
          (records || []).forEach((r) => {
            if (r.status === 'present' && !processed.has(r.student_id)) {
              processed.add(r.student_id);
              presentStudents.push({
                name: r.student_name || r.name,
                roll_number: r.roll_number,
                status: 'Present',
                scan_method: 'QR Scan'
              });
            }
          });

          console.log(`[TEST SESSION] ${session ? session.subject : 'N/A'} (ID: ${testSessionId})`);
          console.log(`[RECORDS FOUND] Total present records: ${presentStudents.length}`);

          let passed = false;
          if (presentStudents.length >= 1 && presentStudents[0].roll_number === testRoll) {
            console.log('✓ SUCCESS: Scanned student appears in Present list!');
            console.log(`  - Student Name: ${presentStudents[0].name}`);
            console.log(`  - Register Number: ${presentStudents[0].roll_number}`);
            console.log(`  - Scan Method: ${presentStudents[0].scan_method}`);
            passed = true;
          } else {
            console.error('✗ FAILED: Scanned student was not retrieved in Present list!', { session, records, presentStudents });
          }

          // Cleanup
          db.run('DELETE FROM attendance_records WHERE id = ?', [recordId]);
          db.run('DELETE FROM users WHERE id = ?', [testStudentId]);
          db.run('DELETE FROM attendance_sessions WHERE id = ?', [testSessionId], () => {
            console.log('\n==================================================');
            console.log(passed ? '🎉 SESSION ROSTER SYNC TEST PASSED!' : '❌ TEST FAILED');
            console.log('==================================================');
            process.exit(passed ? 0 : 1);
          });
        }
      );
    });
  });
}

testSessionRosterSync();
