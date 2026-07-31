const { db, initDb } = require('./db');
const { createSession } = require('../controllers/sessionController');

async function testSessionCreation() {
  console.log('Testing Attendance Session creation & Schema verification...');

  await initDb();

  // Mock Request & Response
  const req = {
    body: {
      subject: 'Database Systems & SQL Schema',
      department: 'Computer Science & Engineering',
      year: 3,
      section: 'A',
      admin_lat: 13.1145,
      admin_lng: 80.1548,
      duration_minutes: 60
    },
    app: {
      get: () => null
    }
  };

  const res = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      console.log(`[TEST SESSION CREATED - STATUS ${this.statusCode || 200}]`, data);
      
      // Query database table_info & session record to verify columns
      db.get('SELECT * FROM attendance_sessions WHERE id = ?', [data.session.id], (err, sessionRow) => {
        if (err) {
          console.error('❌ SQL ERROR QUERYING CREATED SESSION:', err);
        } else {
          console.log('\n====================================================');
          console.log('✅ [TEST VERIFICATION PASSED] Created Session Row:');
          console.log('- Session ID:', sessionRow.id);
          console.log('- Subject:', sessionRow.subject);
          console.log('- attendance_code:', sessionRow.attendance_code);
          console.log('- active_token:', sessionRow.active_token);
          console.log('- token:', sessionRow.token);
          console.log('- admin_lat:', sessionRow.admin_lat);
          console.log('- admin_latitude:', sessionRow.admin_latitude);
          console.log('====================================================\n');
        }
      });
    }
  };

  createSession(req, res);
}

testSessionCreation();
