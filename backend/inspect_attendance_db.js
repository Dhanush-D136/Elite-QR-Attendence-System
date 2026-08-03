const { db } = require('./src/database/db');

async function inspectDB() {
  console.log('====================================================');
  console.log('INSPECTING ATTENDANCE DATABASE TELEMETRY...');
  console.log('====================================================');

  db.all('SELECT * FROM faculty', [], (err, facs) => {
    console.log('\n--- [FACULTY TABLE] ---');
    console.log(facs);

    db.all('SELECT * FROM faculty_subject_mapping', [], (err, fsm) => {
      console.log('\n--- [FACULTY SUBJECT MAPPING TABLE] ---');
      console.log(fsm);

      db.all('SELECT * FROM subjects', [], (err, subs) => {
        console.log('\n--- [SUBJECTS TABLE] ---');
        console.log(subs);

        db.all('SELECT * FROM attendance_sessions ORDER BY created_at DESC LIMIT 20', [], (err, sess) => {
          console.log('\n--- [ATTENDANCE SESSIONS TABLE] ---');
          console.log(sess);

          db.all('SELECT COUNT(*) as rec_count FROM attendance_records', [], (err, recCount) => {
            console.log('\n--- [ATTENDANCE RECORDS COUNT] ---');
            console.log(recCount);

            db.all('SELECT * FROM attendance_records ORDER BY created_at DESC LIMIT 10', [], (err, recs) => {
              console.log('\n--- [ATTENDANCE RECORDS SAMPLE] ---');
              console.log(recs);

              process.exit(0);
            });
          });
        });
      });
    });
  });
}

inspectDB();
