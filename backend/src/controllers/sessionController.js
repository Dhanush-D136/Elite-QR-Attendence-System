const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');

// Helper to generate a random 4-digit attendance code (e.g. 4821, 7194, 3058)
function generate4DigitCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper to parse time string (e.g. "08:15 AM", "12:40 PM") into total minutes from midnight
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const isPM = clean.toUpperCase().includes('PM');
  const isAM = clean.toUpperCase().includes('AM');
  const timePart = clean.replace(/AM|PM/i, '').trim();
  const parts = timePart.split(':');
  let hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// Helper to calculate Indian Standard Time (Asia/Kolkata, UTC+5:30)
function getISTTimeDetails() {
  const now = new Date();
  const istDateString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istDateString);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = days[istDate.getDay()];
  const currentMinutes = istDate.getHours() * 60 + istDate.getMinutes();

  return {
    now: istDate,
    rawNow: now,
    currentDay: currentDayName,
    currentMinutes,
    todayStr: `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`,
    formattedTime: istDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
}

// Auto-detect Current Class Slot from Timetable based on Server Clock (IST Asia/Kolkata)
function getCurrentTimetableSlot(req, res) {
  const ist = getISTTimeDetails();

  db.all('SELECT * FROM timetables WHERE day = ? ORDER BY period_number ASC, id ASC', [ist.currentDay], (err, rows) => {
    if (err || !rows || rows.length === 0) {
      return res.json({
        hasActiveSlot: false,
        message: 'No Active Lecture',
        currentDay: ist.currentDay,
        currentTime: ist.formattedTime
      });
    }

    let matchedSlot = null;
    let periodIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      const slot = rows[i];
      const startMins = parseTimeToMinutes(slot.start_time);
      const endMins = parseTimeToMinutes(slot.end_time);

      if (ist.currentMinutes >= startMins && ist.currentMinutes <= endMins) {
        matchedSlot = slot;
        periodIndex = slot.period_number || (i + 1);
        break;
      }
    }

    if (matchedSlot) {
      return res.json({
        hasActiveSlot: true,
        slot: {
          period: `Period ${periodIndex}`,
          periodNumber: periodIndex,
          subject: matchedSlot.subject_name,
          faculty: matchedSlot.faculty_name,
          room: matchedSlot.room_number,
          department: matchedSlot.department || 'AI & DS',
          year: 'III Year',
          section: 'A',
          startTime: matchedSlot.start_time,
          endTime: matchedSlot.end_time
        }
      });
    }

    // No class currently active at this exact time (e.g. Lunch Break or Off Hours)
    return res.json({
      hasActiveSlot: false,
      isBreakOrOffHours: true,
      message: 'No Active Lecture',
      currentDay: ist.currentDay,
      currentTime: ist.formattedTime,
      nextSlot: rows[0] ? {
        period: `Period ${rows[0].period_number || 1}`,
        subject: rows[0].subject_name,
        faculty: rows[0].faculty_name,
        room: rows[0].room_number,
        startTime: rows[0].start_time,
        endTime: rows[0].end_time
      } : null
    });
  });
}

// Create Attendance Session (Linked directly to Timetable Entry)
function createSession(req, res) {
  let { subject, subject_code, department, year, section, duration_minutes, period_number, faculty_name, date, room_number } = req.body;

  if (!subject || typeof subject !== 'string' || subject.trim() === '') {
    return res.status(400).json({ error: 'Subject Name is required to generate a subject-specific QR code.' });
  }

  subject = subject.trim();
  department = department || 'AI & DS';
  year = parseInt(year || 3);
  section = section || 'A';
  faculty_name = faculty_name || 'Faculty Member';
  period_number = period_number ? String(period_number) : '1';
  date = date || new Date().toISOString().split('T')[0];

  const id = uuidv4();
  const attendanceCode = generate4DigitCode();
  const duration = parseInt(duration_minutes || 25);
  const startTime = new Date();
  const expiryTime = new Date(startTime.getTime() + duration * 60000);
  const currentTimestamp = Math.floor(Date.now() / 1000);

  const query = `
    INSERT INTO attendance_sessions (
      id, subject, department, year, section, 
      period_number, faculty_name, date,
      admin_lat, admin_lng, admin_latitude, admin_longitude, 
      start_time, expiry_time, end_time, duration_minutes, 
      attendance_code, active_token, token, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 0.0, ?, ?, ?, ?, ?, ?, ?, 'active')
  `;

  db.run(
    query,
    [
      id, subject, department, year, section,
      period_number, faculty_name, date,
      startTime.toISOString(), expiryTime.toISOString(), expiryTime.toISOString(), duration,
      attendanceCode, attendanceCode, attendanceCode
    ],
    function (insertErr) {
      if (insertErr) {
        console.error('❌ [CREATE SESSION FAILED]', insertErr.message);
        return res.status(500).json({ error: 'Failed to create attendance session: ' + insertErr.message });
      }

      console.log(`✅ [TIMETABLE QR SESSION CREATED] ID: ${id}, Subject: ${subject}, Period: ${period_number}, Initial Code: ${attendanceCode}`);

      const sessionPayload = {
        sessionId: id,
        subject,
        department,
        year,
        section,
        period: period_number,
        faculty: faculty_name,
        date,
        room: room_number || 'F305',
        attendanceCode,
        timestamp: currentTimestamp,
        expiryTime
      };

      const io = req.app.get('socketio');
      if (io) {
        io.emit('session_created', sessionPayload);
      }

      res.status(201).json({
        message: 'Attendance session created successfully linked to timetable slot',
        session: {
          id,
          subject,
          department,
          year,
          section,
          period: period_number,
          faculty: faculty_name,
          date,
          room: room_number || 'F305',
          start_time: startTime.toISOString(),
          expiry_time: expiryTime.toISOString(),
          duration_minutes: duration,
          attendance_code: attendanceCode,
          status: 'active'
        },
        qrPayload: sessionPayload
      });
    }
  );
}

// Rotate QR Code every 25 seconds
function rotateSessionQR(req, res) {
  const { id } = req.params;

  db.get('SELECT * FROM attendance_sessions WHERE id = ?', [id], (err, session) => {
    if (err || !session || session.status !== 'active') {
      return res.status(404).json({ error: 'Active session not found' });
    }

    const newCode = generate4DigitCode();
    const currentTimestamp = Math.floor(Date.now() / 1000);

    db.run(
      'UPDATE attendance_sessions SET attendance_code = ?, active_token = ?, token = ? WHERE id = ?',
      [newCode, newCode, newCode, id],
      function (updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Failed to rotate QR code' });
        }

        console.log(`🔄 [QR ROTATED] Session: ${id}, New 4-Digit Code: ${newCode}`);

        const rotationPayload = {
          sessionId: id,
          attendanceCode: newCode,
          timestamp: currentTimestamp,
          subject: session.subject
        };

        const io = req.app.get('socketio');
        if (io) {
          io.emit('qr_rotated', rotationPayload);
        }

        res.json({
          success: true,
          qrPayload: rotationPayload
        });
      }
    );
  });
}

function getSessionQR(req, res) {
  const { id } = req.params;

  db.get('SELECT * FROM attendance_sessions WHERE id = ?', [id], (err, session) => {
    if (err || !session) return res.status(404).json({ error: 'Session not found' });

    const now = new Date();
    const expiry = new Date(session.expiry_time || session.end_time);

    if (now > expiry || session.status !== 'active') {
      return res.status(400).json({ error: 'Session has expired or is inactive', isExpired: true });
    }

    const attendanceCode = session.attendance_code || '4821';
    const currentTimestamp = Math.floor(Date.now() / 1000);

    res.json({
      sessionId: id,
      attendanceCode,
      timestamp: currentTimestamp,
      subject: session.subject,
      expiresAt: expiry.getTime()
    });
  });
}

function getSessions(req, res) {
  db.all('SELECT * FROM attendance_sessions ORDER BY start_time DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ sessions: rows });
  });
}

function getSessionById(req, res) {
  const { id } = req.params;
  db.get('SELECT * FROM attendance_sessions WHERE id = ?', [id], (err, session) => {
    if (err || !session) return res.status(404).json({ error: 'Session not found' });

    db.all(
      `SELECT ar.*, u.name as student_name, u.roll_number, u.email as student_email, u.profile_photo, u.department, u.year, u.section 
       FROM attendance_records ar 
       JOIN users u ON ar.student_id = u.id 
       WHERE ar.session_id = ? 
       ORDER BY ar.attendance_time DESC`,
      [id],
      (err, records) => {
        const recordList = records || [];

        // Query all students enrolled in this session's department, year, and section
        db.all(
          `SELECT id, name, roll_number, email, department, year, section, profile_photo 
           FROM users 
           WHERE role = 'student' AND department = ? AND year = ? AND section = ?
           ORDER BY roll_number ASC`,
          [session.department, session.year, session.section],
          (errStudents, allStudents) => {
            const studentRoster = allStudents || [];

            const presentMap = {};
            recordList.forEach((r) => {
              if (r.status === 'present') {
                presentMap[r.student_id] = r;
              }
            });

            const presentStudents = [];
            const absentStudents = [];

            studentRoster.forEach((st) => {
              if (presentMap[st.id]) {
                presentStudents.push({
                  ...st,
                  attendance_time: presentMap[st.id].attendance_time,
                  record_id: presentMap[st.id].id,
                  status: 'Present'
                });
              } else {
                absentStudents.push({
                  ...st,
                  status: 'Absent',
                  reason: 'Uninformed Absence'
                });
              }
            });

            res.json({
              session,
              records: recordList,
              presentStudents,
              absentStudents,
              totalEnrolled: studentRoster.length
            });
          }
        );
      }
    );
  });
}

function endSession(req, res) {
  const { id } = req.params;
  db.run('UPDATE attendance_sessions SET status = ? WHERE id = ?', ['completed', id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to terminate session' });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('session_ended', { sessionId: id });
    }

    res.json({ message: 'Session closed successfully' });
  });
}

// Auto-Launch Attendance Session from Current Timetable Slot (1-Click Launch)
function autoLaunchSession(req, res) {
  const ist = getISTTimeDetails();

  db.all('SELECT * FROM timetables WHERE day = ? ORDER BY period_number ASC, id ASC', [ist.currentDay], (err, rows) => {
    if (err || !rows || rows.length === 0) {
      return res.status(400).json({
        error: 'No active timetable slot currently.',
        message: `Current time (${ist.formattedTime}) on ${ist.currentDay} is outside standard lecture hours.`
      });
    }

    let matchedSlot = null;
    let periodNumber = 1;

    for (let i = 0; i < rows.length; i++) {
      const slot = rows[i];
      const startMins = parseTimeToMinutes(slot.start_time);
      const endMins = parseTimeToMinutes(slot.end_time);

      if (ist.currentMinutes >= startMins && ist.currentMinutes <= endMins) {
        matchedSlot = slot;
        periodNumber = slot.period_number || (i + 1);
        break;
      }
    }

    // If auto-launching and currently between classes or off-hours, fallback to first slot or specified slot
    if (!matchedSlot) {
      matchedSlot = rows[0];
      periodNumber = rows[0].period_number || 1;
    }

    const sessionId = `SES-${ist.todayStr}-P${periodNumber}`;
    const attendanceCode = generate4DigitCode();
    const duration = 25;
    const startTime = new Date();
    const expiryTime = new Date(startTime.getTime() + duration * 60000);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const query = `
      INSERT INTO attendance_sessions (
        id, subject, department, year, section, 
        admin_lat, admin_lng, admin_latitude, admin_longitude, 
        start_time, expiry_time, end_time, duration_minutes, 
        attendance_code, active_token, token, status
      )
      VALUES (?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 0.0, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    db.run(
      query,
      [
        sessionId, matchedSlot.subject_name, 'AI & DS', 3, 'A',
        startTime.toISOString(), expiryTime.toISOString(), expiryTime.toISOString(), duration,
        attendanceCode, attendanceCode, attendanceCode
      ],
      function (insertErr) {
        if (insertErr) {
          db.get('SELECT * FROM attendance_sessions WHERE id = ?', [sessionId], (err2, existing) => {
            if (existing) {
              return res.json({
                message: 'Active timetable session already launched',
                session: existing,
                qrPayload: {
                  sessionId,
                  subject: existing.subject,
                  class: 'Elite Minds Portal',
                  period: `P${periodNumber}`,
                  faculty: matchedSlot.faculty_name,
                  room: matchedSlot.room_number,
                  attendanceCode: existing.attendance_code,
                  timestamp: currentTimestamp
                }
              });
            }
            return res.status(500).json({ error: 'Failed to auto-launch attendance session' });
          });
          return;
        }

        console.log(`✅ [1-CLICK TIMETABLE SESSION] ID: ${sessionId}, Subject: ${matchedSlot.subject_name}, Code: ${attendanceCode}`);

        const qrPayload = {
          sessionId,
          subject: matchedSlot.subject_name,
          class: 'Elite Minds Portal',
          period: `P${periodNumber}`,
          faculty: matchedSlot.faculty_name,
          room: matchedSlot.room_number,
          attendanceCode,
          timestamp: currentTimestamp
        };

        const io = req.app.get('socketio');
        if (io) {
          io.emit('session_created', qrPayload);
        }

        res.status(201).json({
          message: 'Attendance session auto-launched from timetable',
          session: {
            id: sessionId,
            subject: matchedSlot.subject_name,
            department: 'AI & DS',
            year: 3,
            section: 'A',
            period: `P${periodNumber}`,
            faculty: matchedSlot.faculty_name,
            room: matchedSlot.room_number,
            start_time: startTime.toISOString(),
            expiry_time: expiryTime.toISOString(),
            duration_minutes: duration,
            attendance_code: attendanceCode,
            status: 'active'
          },
          qrPayload
        });
      }
    );
  });
}

module.exports = {
  getCurrentTimetableSlot,
  autoLaunchSession,
  createSession,
  rotateSessionQR,
  getSessionQR,
  getSessions,
  getSessionById,
  endSession
};
