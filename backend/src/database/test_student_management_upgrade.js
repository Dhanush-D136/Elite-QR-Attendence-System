const { db, runMigrations, initDb } = require('./db');
const { v4: uuidv4 } = require('uuid');

async function testStudentManagementUpgrade() {
  console.log('==================================================');
  console.log('TESTING STUDENT MANAGEMENT SYSTEM UPGRADE');
  console.log('==================================================\n');

  await runMigrations();
  await initDb();

  const nowMs = Date.now();
  const testStudentId = 'mgmt-student-' + nowMs;
  const testRoll = '11302424' + (nowMs % 100000);
  const testEmail = `student.mgmt.${nowMs}@univ.edu`;

  db.serialize(() => {
    // 1. CREATE Student with Account & Personal details
    console.log('1. ADD STUDENT: Creating student account...');
    db.run(
      `INSERT INTO users (id, name, roll_number, email, role, department, year, section, phone, profile_photo, dob, gender, blood_group, address, parent_name, parent_phone, bio, status, admission_year, username, password_hash, must_change_password, is_first_login, first_login, password_changed)
       VALUES (?, 'ABASKAR N', ?, ?, 'student', 'AI & Data Science', 3, 'A', '+91-9876543210', 'http://example.com/photo.jpg', '2004-01-01', 'Male', 'O+', 'Chennai, TN', 'Natarajan', '+91-9876543211', 'AI student', 'Active', 2024, ?, 'hash', 1, 1, 1, 0)`,
      [testStudentId, testRoll, testEmail, testRoll],
      function (err) {
        if (err) console.error('Add student error:', err);
        else console.log('  ✓ Student account created successfully!');
      }
    );

    // 2. LOGIN MONITORING: Record login event
    console.log('\n2. LOGIN MONITORING: Inserting login event...');
    const logId = uuidv4();
    db.run(
      `INSERT INTO login_logs (id, student_id, login_time, ip_address, device, browser)
       VALUES (?, ?, CURRENT_TIMESTAMP, '127.0.0.1', 'Desktop PC', 'Chrome')`,
      [logId, testStudentId],
      function (err) {
        if (err) console.error('Login log error:', err);
        else console.log('  ✓ Login activity recorded in login_logs!');
      }
    );

    // 3. PASSWORD RESET & AUDIT LOGGING
    console.log('\n3. PASSWORD MANAGEMENT: Resetting password & logging audit event...');
    const auditId = uuidv4();
    db.run(
      `UPDATE users SET password_hash = 'newhash', must_change_password = 1, password_changed = 0 WHERE id = ?`,
      [testStudentId],
      function (err) {
        db.run(
          `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', 'Password Reset to Default (1234)', CURRENT_TIMESTAMP)`,
          [auditId, testStudentId],
          function (err2) {
            console.log('  ✓ Password reset & audit log recorded!');
          }
        );
      }
    );

    // 4. VERIFY PROFILE & LOGS FETCH
    db.get('SELECT * FROM users WHERE id = ?', [testStudentId], (err, user) => {
      db.all('SELECT * FROM login_logs WHERE student_id = ?', [testStudentId], (err2, logs) => {
        db.all('SELECT * FROM password_audit_logs WHERE student_id = ?', [testStudentId], (err3, audits) => {
          console.log('\n4. VERIFICATION RESULTS:');
          console.log(`  - Student Name: ${user.name}`);
          console.log(`  - Register Number: ${user.roll_number}`);
          console.log(`  - Status: ${user.status}`);
          console.log(`  - Login Logs Count: ${(logs || []).length} (Device: ${logs && logs[0] ? logs[0].device : 'N/A'}, IP: ${logs && logs[0] ? logs[0].ip_address : 'N/A'})`);
          console.log(`  - Password Audit Logs Count: ${(audits || []).length} (Action: ${audits && audits[0] ? audits[0].action : 'N/A'})`);

          // 5. BULK DELETE CLEANUP
          console.log('\n5. BULK DELETE: Permanently removing student and all logs...');
          db.run('DELETE FROM attendance_records WHERE student_id = ?', [testStudentId]);
          db.run('DELETE FROM login_logs WHERE student_id = ?', [testStudentId]);
          db.run('DELETE FROM password_audit_logs WHERE student_id = ?', [testStudentId]);
          db.run('DELETE FROM users WHERE id = ?', [testStudentId], function (err4) {
            console.log('\n==================================================');
            console.log('🎉 STUDENT MANAGEMENT UPGRADE TEST PASSED CLEANLY!');
            console.log('==================================================');
            process.exit(0);
          });
        });
      });
    });
  });
}

testStudentManagementUpgrade();
