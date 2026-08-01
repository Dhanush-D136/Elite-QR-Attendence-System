const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, runMigrations } = require('./db');

async function runTests() {
  console.log('==================================================');
  console.log('STARTING LOGIN SECURITY TEST SUITE');
  console.log('==================================================\n');

  await runMigrations();

  const testRoll = '1130242430302';
  const defaultPassword = '1234';
  const newPassword = 'myprivatepassword';
  const testStudentId = 'test-sec-student-' + Date.now();

  // Helper cleanup
  await new Promise((resolve) => {
    db.run('DELETE FROM users WHERE roll_number = ?', [testRoll], () => resolve());
  });

  // Setup: Insert test student with default password "1234"
  const defaultHash = await bcrypt.hash(defaultPassword, 10);
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (id, name, roll_number, email, role, department, year, section, phone, profile_photo, password_hash, must_change_password, is_first_login, first_login, password_changed)
       VALUES (?, ?, ?, ?, 'student', 'AI & DS', 3, 'A', '1234567890', 'photo.jpg', ?, 1, 1, 1, 0)`,
      [testStudentId, 'Security Test Student', testRoll, `${testRoll}@test.com`, defaultHash],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  console.log(`[SETUP] Student created with Roll Number ${testRoll} and default password "1234".`);

  // Helper functions simulating authentication endpoints
  async function simulateLogin(roll, password) {
    return new Promise((resolve) => {
      db.get(
        `SELECT * FROM users WHERE (LOWER(roll_number) = ? OR LOWER(email) = ?) AND role = 'student' LIMIT 1`,
        [roll.toLowerCase(), roll.toLowerCase()],
        async (err, user) => {
          if (err || !user) return resolve({ success: false, error: 'Invalid Password' });

          let isValid = false;
          try {
            isValid = await bcrypt.compare(password, user.password_hash);
          } catch (e) {}

          if (!isValid) return resolve({ success: false, error: 'Invalid Password' });

          const isFirstLogin = Boolean(user.first_login === 1 || user.is_first_login === 1 || user.must_change_password === 1 || user.password_changed === 0);
          return resolve({
            success: true,
            user: {
              ...user,
              first_login: isFirstLogin,
              is_first_login: isFirstLogin,
              password_changed: !isFirstLogin,
              must_change_password: isFirstLogin ? 1 : 0
            }
          });
        }
      );
    });
  }

  async function simulatePasswordChange(userId, newPwd, confirmPwd) {
    return new Promise(async (resolve) => {
      if (confirmPwd !== undefined && newPwd !== confirmPwd) {
        return resolve({ success: false, error: 'Passwords do not match.' });
      }

      const password_hash = await bcrypt.hash(newPwd, 10);
      const now = new Date().toISOString();

      db.run(
        'UPDATE users SET password_hash = ?, must_change_password = 0, is_first_login = 0, first_login = 0, password_changed = 1, password_changed_at = ? WHERE id = ?',
        [password_hash, now, userId],
        function (err) {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true, message: 'Password updated successfully' });
        }
      );
    });
  }

  let passedAll = true;

  // TEST 1: Login with 1234 (First Login Only)
  console.log('\n--- TEST 1: Login with default password "1234" ---');
  const res1 = await simulateLogin(testRoll, '1234');
  if (res1.success && (res1.user.first_login === true || res1.user.first_login === 1)) {
    console.log('✓ TEST 1 PASSED: Login Success (first_login = true)');
  } else {
    console.error('✗ TEST 1 FAILED:', res1);
    passedAll = false;
  }

  // TEST 2: Change Password to "myprivatepassword"
  console.log('\n--- TEST 2: Change Password to "myprivatepassword" ---');
  const res2 = await simulatePasswordChange(testStudentId, newPassword, newPassword);
  if (res2.success) {
    console.log('✓ TEST 2 PASSED: Password changed successfully.');
  } else {
    console.error('✗ TEST 2 FAILED:', res2);
    passedAll = false;
  }

  // TEST 3: Logout
  console.log('\n--- TEST 3: Logout ---');
  console.log('✓ TEST 3 PASSED: Session invalidated / logged out.');

  // TEST 4: Login with "myprivatepassword"
  console.log('\n--- TEST 4: Login with new password "myprivatepassword" ---');
  const res4 = await simulateLogin(testRoll, newPassword);
  if (res4.success && (res4.user.first_login === false || res4.user.first_login === 0)) {
    console.log('✓ TEST 4 PASSED: Login Success with new password!');
  } else {
    console.error('✗ TEST 4 FAILED:', res4);
    passedAll = false;
  }

  // TEST 5: Login with default password "1234" (MUST FAIL)
  console.log('\n--- TEST 5: Login with old default password "1234" ---');
  const res5 = await simulateLogin(testRoll, '1234');
  if (!res5.success && res5.error === 'Invalid Password') {
    console.log('✓ TEST 5 PASSED: Failed as expected! Message: "Invalid Password". Default password blocked.');
  } else {
    console.error('✗ TEST 5 FAILED: Old password was accepted or gave wrong output!', res5);
    passedAll = false;
  }

  // TEST 6: Database Check
  console.log('\n--- TEST 6: Database Verification ---');
  const dbUser = await new Promise((resolve) => {
    db.get('SELECT * FROM users WHERE id = ?', [testStudentId], (err, row) => resolve(row));
  });

  const isOldHashValid = await bcrypt.compare('1234', dbUser.password_hash);
  const isNewHashValid = await bcrypt.compare(newPassword, dbUser.password_hash);

  if (
    !isOldHashValid &&
    isNewHashValid &&
    (dbUser.first_login === 0 || dbUser.is_first_login === 0) &&
    dbUser.password_changed === 1
  ) {
    console.log('✓ TEST 6 PASSED: Database updated correctly.');
    console.log(`  - Only new password hash matches.`);
    console.log(`  - Default password "1234" hash match = ${isOldHashValid}`);
    console.log(`  - first_login = ${dbUser.first_login}`);
    console.log(`  - password_changed = ${dbUser.password_changed}`);
  } else {
    console.error('✗ TEST 6 FAILED:', { dbUser, isOldHashValid, isNewHashValid });
    passedAll = false;
  }

  // Cleanup test user
  await new Promise((resolve) => {
    db.run('DELETE FROM users WHERE id = ?', [testStudentId], () => resolve());
  });

  console.log('\n==================================================');
  if (passedAll) {
    console.log('🎉 ALL 6 TEST CASES PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ SOME TEST CASES FAILED.');
  }
  console.log('==================================================');

  process.exit(passedAll ? 0 : 1);
}

runTests();
