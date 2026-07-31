const bcrypt = require('bcryptjs');
const { db } = require('./db');

async function resetAllPasswords() {
  console.log('Resetting and verifying all user passwords in database...');

  const adminHash = await bcrypt.hash('admin123', 10);
  const studentHash = await bcrypt.hash('1234', 10);

  // Update Admin Passwords
  db.run("UPDATE users SET password_hash = ? WHERE role = 'admin'", [adminHash], function (err) {
    if (err) console.error('Failed to reset admin passwords', err);
    else console.log(`Updated ${this.changes} admin user password(s) to 'admin123'`);
  });

  // Update Student Passwords
  db.run("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE role = 'student'", [studentHash], function (err) {
    if (err) console.error('Failed to reset student passwords', err);
    else console.log(`Updated ${this.changes} student user password(s) to '1234'`);
  });
}

resetAllPasswords();
