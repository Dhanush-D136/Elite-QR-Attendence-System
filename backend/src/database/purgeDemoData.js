const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'smartattend.db');
const db = new sqlite3.Database(dbPath);

console.log('[PRODUCTION PURGE] Cleaning all demo dataset records from smartattend.db...');

db.serialize(() => {
  // Purge demo students
  db.run("DELETE FROM users WHERE role = 'student'", function (err) {
    if (err) console.error('Failed to purge demo users:', err);
    else console.log(`✅ Purged ${this.changes} demo student account(s) from users table.`);
  });

  // Purge attendance records
  db.run("DELETE FROM attendance_records", function (err) {
    if (err) console.error('Failed to purge attendance_records:', err);
    else console.log(`✅ Purged ${this.changes} demo attendance record(s).`);
  });

  // Purge attendance sessions
  db.run("DELETE FROM attendance_sessions", function (err) {
    if (err) console.error('Failed to purge attendance_sessions:', err);
    else console.log(`✅ Purged ${this.changes} demo attendance session(s).`);
  });

  // Purge timetables
  db.run("DELETE FROM timetables", function (err) {
    if (err) console.error('Failed to purge timetables:', err);
    else console.log(`✅ Purged ${this.changes} demo timetable entry/entries.`);
  });

  // Purge violation logs
  db.run("DELETE FROM violation_logs", function (err) {
    if (err) console.error('Failed to purge violation_logs:', err);
    else console.log(`✅ Purged ${this.changes} violation log(s).`);
  });

  console.log('✨ Production Database successfully purged to clean state (Admin account retained).');
});
