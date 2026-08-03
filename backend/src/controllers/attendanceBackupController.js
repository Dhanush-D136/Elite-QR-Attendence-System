const { v4: uuidv4 } = require('uuid');
const xlsx = require('xlsx');
const { db } = require('../database/db');

// Helper to get day of week string from date string
function getDayOfWeek(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

// Helper to create an automated backup snapshot in database
function createBackupSnapshot(namePrefix, callback) {
  const query = `
    SELECT 
      ar.*,
      u.name AS student_name,
      u.roll_number,
      u.email AS student_email,
      u.department AS student_department,
      u.year AS student_year,
      u.section AS student_section,
      s.subject AS session_subject,
      s.subject_code,
      s.faculty_name,
      s.faculty_id,
      s.date AS session_date,
      s.period_number,
      s.department AS session_department,
      s.year AS session_year,
      s.section AS session_section
    FROM attendance_records ar
    LEFT JOIN users u ON ar.student_id = u.id
    LEFT JOIN attendance_sessions s ON ar.session_id = s.id
  `;

  db.all(query, [], (errRecords, records) => {
    if (errRecords) {
      console.error('[BACKUP SNAPSHOT ERROR] Failed to fetch records:', errRecords);
      return callback(errRecords, null);
    }

    db.all('SELECT * FROM attendance_sessions', [], (errSessions, sessions) => {
      if (errSessions) {
        console.error('[BACKUP SNAPSHOT ERROR] Failed to fetch sessions:', errSessions);
        return callback(errSessions, null);
      }

      const backupId = `backup-${Date.now()}-${uuidv4().substring(0, 8)}`;
      const nowIso = new Date().toISOString();
      const dateStr = nowIso.replace(/[:.]/g, '-');
      const backupName = `${namePrefix}_Backup_${dateStr}`;
      
      const backupPayload = {
        export_timestamp: nowIso,
        total_records: records ? records.length : 0,
        total_sessions: sessions ? sessions.length : 0,
        records: records || [],
        sessions: sessions || []
      };

      const backupDataStr = JSON.stringify(backupPayload);

      db.run(
        `INSERT INTO attendance_backups (backup_id, backup_name, created_at, total_records, backup_data)
         VALUES (?, ?, ?, ?, ?)`,
        [backupId, backupName, nowIso, records ? records.length : 0, backupDataStr],
        function (errInsert) {
          if (errInsert) {
            console.error('[BACKUP SNAPSHOT ERROR] Failed to insert backup into DB:', errInsert);
            return callback(errInsert, null);
          }

          console.log(`✅ [BACKUP SNAPSHOT CREATED] ID: ${backupId}, Name: ${backupName}, Records: ${records ? records.length : 0}`);
          callback(null, {
            backup_id: backupId,
            backup_name: backupName,
            created_at: nowIso,
            total_records: records ? records.length : 0
          });
        }
      );
    });
  });
}

/**
 * 1. EXPORT ATTENDANCE (Excel, CSV, JSON)
 */
function exportAttendance(req, res) {
  const format = (req.query.format || 'xlsx').toLowerCase();

  const query = `
    SELECT 
      ar.id AS record_id,
      u.name AS student_name,
      u.roll_number AS register_number,
      COALESCE(u.department, s.department, 'AI & DS') AS department,
      COALESCE(u.year, s.year, 3) AS year,
      COALESCE(u.section, s.section, 'A') AS section,
      COALESCE(s.subject, s.subject_code, 'General Attendance') AS subject,
      COALESCE(s.faculty_name, 'Faculty') AS faculty,
      COALESCE(s.date, DATE(ar.attendance_time)) AS date,
      COALESCE(s.period_number, '1') AS period,
      ar.session_id,
      ar.status AS attendance_status,
      ar.attendance_time AS scan_time
    FROM attendance_records ar
    LEFT JOIN users u ON ar.student_id = u.id
    LEFT JOIN attendance_sessions s ON ar.session_id = s.id
    ORDER BY ar.attendance_time DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to export attendance records: ' + err.message });
    }

    // Format fields strictly as specified in requirements
    const exportData = (rows || []).map((row) => {
      const dateVal = row.date || (row.scan_time ? row.scan_time.split('T')[0] : 'N/A');
      return {
        'Student Name': row.student_name || 'Unknown Student',
        'Register Number': row.register_number || 'N/A',
        'Department': row.department || 'N/A',
        'Year': row.year ? `Year ${row.year}` : 'N/A',
        'Section': row.section || 'A',
        'Subject': row.subject || 'N/A',
        'Faculty': row.faculty || 'N/A',
        'Date': dateVal,
        'Day': getDayOfWeek(dateVal),
        'Period': `Period ${row.period}`,
        'Session ID': row.session_id || 'N/A',
        'Attendance Status': (row.attendance_status || 'present').toUpperCase(),
        'Scan Time': row.scan_time || 'N/A'
      };
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance_backup.json"');
      return res.send(JSON.stringify(exportData, null, 2));
    }

    if (format === 'csv') {
      if (exportData.length === 0) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance_backup.csv"');
        return res.send('Student Name,Register Number,Department,Year,Section,Subject,Faculty,Date,Day,Period,Session ID,Attendance Status,Scan Time\n');
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [headers.join(',')];

      for (const item of exportData) {
        const values = headers.map((h) => {
          const val = item[h] !== null && item[h] !== undefined ? String(item[h]) : '';
          const escaped = val.replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvString = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance_backup.csv"');
      return res.send(csvString);
    }

    // Default to Excel (.xlsx)
    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Attendance Backup');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_backup.xlsx"');
    return res.send(buffer);
  });
}

/**
 * 2. IMPORT ATTENDANCE BACKUP (.xlsx, .csv, .json)
 */
function importAttendance(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload an attendance backup file (.xlsx, .csv, or .json)' });
  }

  const filename = req.file.originalname.toLowerCase();
  let rawRows = [];

  try {
    if (filename.endsWith('.json')) {
      const fileText = req.file.buffer.toString('utf8');
      const parsed = JSON.parse(fileText);
      if (Array.isArray(parsed)) {
        rawRows = parsed;
      } else if (parsed && Array.isArray(parsed.records)) {
        rawRows = parsed.records;
      } else {
        return res.status(400).json({ success: false, message: 'Invalid JSON structure in uploaded backup file.' });
      }
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.csv') || filename.endsWith('.xls')) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file format. Please upload .xlsx, .csv, or .json' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to parse uploaded backup file: ' + err.message });
  }

  if (!rawRows || rawRows.length === 0) {
    return res.status(400).json({ success: false, message: 'Uploaded file contains no attendance records.' });
  }

  // Pre-fetch all students for validation
  db.all('SELECT id, roll_number, email FROM users WHERE role = "student"', [], (errUsers, studentUsers) => {
    if (errUsers) {
      return res.status(500).json({ success: false, message: 'Database error fetching students: ' + errUsers.message });
    }

    const studentMapByRoll = new Map();
    const studentMapById = new Map();
    (studentUsers || []).forEach((st) => {
      if (st.roll_number) studentMapByRoll.set(String(st.roll_number).trim().toLowerCase(), st.id);
      if (st.id) studentMapById.set(String(st.id).trim().toLowerCase(), st.id);
    });

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    let processed = 0;
    const totalToProcess = rawRows.length;

    db.serialize(() => {
      rawRows.forEach((row) => {
        // Normalize key names
        const regNo = (row['Register Number'] || row['roll_number'] || row['RegisterNo'] || row['register_number'] || '').toString().trim();
        const studentIdInput = (row['student_id'] || row['Student ID'] || '').toString().trim();
        const statusInput = (row['Attendance Status'] || row['status'] || row['Status'] || 'present').toString().trim().toLowerCase();
        const scanTimeInput = row['Scan Time'] || row['scan_time'] || row['attendance_time'] || row['Date'] || new Date().toISOString();
        const sessionIdInput = (row['Session ID'] || row['session_id'] || 'IMPORTED_SESSION').toString().trim();
        const recordIdInput = (row['record_id'] || row['id'] || uuidv4()).toString().trim();

        // Resolve student ID
        let matchedStudentId = null;
        if (regNo && studentMapByRoll.has(regNo.toLowerCase())) {
          matchedStudentId = studentMapByRoll.get(regNo.toLowerCase());
        } else if (studentIdInput && studentMapById.has(studentIdInput.toLowerCase())) {
          matchedStudentId = studentMapById.get(studentIdInput.toLowerCase());
        }

        if (!matchedStudentId) {
          skippedCount++;
          processed++;
          if (processed === totalToProcess) finalizeImport();
          return;
        }

        // Check if session exists, or create placeholder session if needed
        db.get('SELECT id FROM attendance_sessions WHERE id = ?', [sessionIdInput], (errSess, sessRow) => {
          if (!sessRow) {
            const subName = row['Subject'] || 'Imported Subject';
            const facName = row['Faculty'] || 'Imported Faculty';
            const dateVal = row['Date'] || scanTimeInput.split('T')[0] || new Date().toISOString().split('T')[0];
            db.run(
              `INSERT OR IGNORE INTO attendance_sessions (id, subject, department, year, section, admin_lat, admin_lng, duration_minutes, attendance_code, status, date, faculty_name)
               VALUES (?, ?, 'AI & DS', 3, 'A', 0.0, 0.0, 60, 'IMPORT', 'ended', ?, ?)`,
              [sessionIdInput, subName, dateVal, facName]
            );
          }

          // Check if record exists for this student and session
          db.get(
            'SELECT id FROM attendance_records WHERE (student_id = ? AND session_id = ?) OR id = ?',
            [matchedStudentId, sessionIdInput, recordIdInput],
            (errRec, existingRec) => {
              if (existingRec) {
                db.run(
                  `UPDATE attendance_records 
                   SET status = ?, attendance_time = ?, notes = 'Imported/Updated via Admin Backup'
                   WHERE id = ?`,
                  [statusInput, scanTimeInput, existingRec.id],
                  (errUp) => {
                    if (!errUp) updatedCount++;
                    else skippedCount++;
                    processed++;
                    if (processed === totalToProcess) finalizeImport();
                  }
                );
              } else {
                db.run(
                  `INSERT INTO attendance_records (id, student_id, session_id, attendance_code, attendance_time, student_lat, student_lng, distance_meters, status, device_fingerprint, notes)
                   VALUES (?, ?, ?, 'IMPORT', ?, 0.0, 0.0, 0.0, ?, 'import_backup', 'Imported via Admin Backup')`,
                  [recordIdInput, matchedStudentId, sessionIdInput, scanTimeInput, statusInput],
                  (errIns) => {
                    if (!errIns) addedCount++;
                    else skippedCount++;
                    processed++;
                    if (processed === totalToProcess) finalizeImport();
                  }
                );
              }
            }
          );
        });
      });
    });

    function finalizeImport() {
      const io = global.io;
      if (io) {
        io.emit('attendance_updated', { type: 'import', added: addedCount, updated: updatedCount });
        io.emit('attendance_reset', { type: 'import' });
      }

      return res.json({
        success: true,
        message: 'Imported Successfully',
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount
      });
    }
  });
}

/**
 * 3. CREATE MANUAL FULL BACKUP
 */
function createFullBackup(req, res) {
  createBackupSnapshot('Manual', (err, snapshot) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to create backup: ' + err.message });
    }
    return res.json({
      success: true,
      message: 'Attendance backup created successfully in Supabase',
      backup: snapshot
    });
  });
}

/**
 * 4. GET ALL BACKUPS HISTORY
 */
function getBackupsList(req, res) {
  db.all(
    'SELECT backup_id, backup_name, created_at, total_records FROM attendance_backups ORDER BY created_at DESC',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to fetch backup history: ' + err.message });
      }
      return res.json({ success: true, backups: rows || [] });
    }
  );
}

/**
 * 5. DOWNLOAD SPECIFIC BACKUP (JSON)
 */
function downloadBackup(req, res) {
  const { id } = req.params;

  db.get('SELECT backup_name, backup_data FROM attendance_backups WHERE backup_id = ?', [id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ success: false, message: 'Backup file not found' });
    }

    let parsedData = {};
    try {
      parsedData = typeof row.backup_data === 'string' ? JSON.parse(row.backup_data) : row.backup_data;
    } catch (e) {
      parsedData = { raw: row.backup_data };
    }

    const filename = `${row.backup_name || 'attendance_backup'}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(parsedData, null, 2));
  });
}

/**
 * 6. RESTORE ATTENDANCE FROM BACKUP
 */
function restoreBackup(req, res) {
  const { id } = req.params;

  db.get('SELECT * FROM attendance_backups WHERE backup_id = ?', [id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ success: false, message: 'Backup record not found' });
    }

    let backupObj = null;
    try {
      backupObj = typeof row.backup_data === 'string' ? JSON.parse(row.backup_data) : row.backup_data;
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to parse backup payload' });
    }

    const records = backupObj.records || [];
    const sessions = backupObj.sessions || [];

    db.serialize(() => {
      // 1. Restore sessions
      sessions.forEach((s) => {
        db.run(
          `INSERT OR IGNORE INTO attendance_sessions (id, subject, department, year, section, admin_lat, admin_lng, start_time, expiry_time, end_time, duration_minutes, attendance_code, status, created_at, period_number, faculty_name, faculty_id, subject_code, subject_id, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id, s.subject || 'Restored Session', s.department || 'AI & DS', s.year || 3, s.section || 'A',
            s.admin_lat || 0.0, s.admin_lng || 0.0, s.start_time, s.expiry_time, s.end_time, s.duration_minutes || 60,
            s.attendance_code || 'RESTORE', s.status || 'ended', s.created_at, s.period_number, s.faculty_name,
            s.faculty_id, s.subject_code, s.subject_id, s.date
          ]
        );
      });

      // 2. Restore attendance records
      records.forEach((r) => {
        db.run(
          `INSERT OR REPLACE INTO attendance_records (id, student_id, session_id, attendance_code, attendance_time, student_lat, student_lng, distance_meters, status, device_fingerprint, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id, r.student_id, r.session_id, r.attendance_code || 'RESTORE', r.attendance_time,
            r.student_lat || 0.0, r.student_lng || 0.0, r.distance_meters || 0.0, r.status || 'present',
            r.device_fingerprint || 'restored_backup', r.notes || 'Restored from Backup'
          ]
        );
      });

      const io = global.io;
      if (io) {
        io.emit('attendance_updated', { type: 'restore', restoredCount: records.length });
        io.emit('attendance_reset', { type: 'restore' });
      }

      return res.json({
        success: true,
        message: `Attendance restored successfully from backup: ${row.backup_name}`,
        recordsRestored: records.length,
        sessionsRestored: sessions.length
      });
    });
  });
}

/**
 * 7. DELETE BACKUP FROM HISTORY
 */
function deleteBackup(req, res) {
  const { id } = req.params;

  db.run('DELETE FROM attendance_backups WHERE backup_id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete backup: ' + err.message });
    }
    return res.json({ success: true, message: 'Backup record deleted successfully' });
  });
}

/**
 * 8. RESET TODAY'S ATTENDANCE
 */
function resetTodayAttendance(req, res) {
  // Step 1: Auto create backup snapshot before deleting
  createBackupSnapshot('Auto_Pre_ResetToday', (errSnapshot, snapshot) => {
    if (errSnapshot) {
      console.warn('[RESET TODAY] Pre-reset backup warning:', errSnapshot.message);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Delete attendance records created today
    const deleteQuery = `
      DELETE FROM attendance_records 
      WHERE DATE(attendance_time) = DATE('now')
         OR DATE(attendance_time) = ?
         OR attendance_time LIKE ?
    `;

    db.run(deleteQuery, [todayStr, `${todayStr}%`], function (errDelete) {
      if (errDelete) {
        return res.status(500).json({ success: false, message: "Failed to reset today's attendance: " + errDelete.message });
      }

      const deletedRows = this ? this.changes || 0 : 0;

      const io = global.io;
      if (io) {
        io.emit('attendance_updated', { type: 'reset_today', deleted: deletedRows });
        io.emit('attendance_reset', { type: 'reset_today', date: todayStr });
      }

      return res.json({
        success: true,
        message: "Today's attendance records reset successfully",
        recordsDeleted: deletedRows,
        backupCreated: snapshot ? snapshot.backup_name : 'Created'
      });
    });
  });
}

/**
 * 9. RESET ALL ATTENDANCE (With Double Confirmation)
 */
function resetAllAttendance(req, res) {
  const { confirmation_step1, confirmation_step2 } = req.body;

  if (confirmation_step1 !== 'RESET ATTENDANCE' || confirmation_step2 !== 'DELETE ALL ATTENDANCE') {
    return res.status(400).json({
      success: false,
      message: 'Invalid confirmation tokens. Step 1 must be "RESET ATTENDANCE" and Step 2 must be "DELETE ALL ATTENDANCE".'
    });
  }

  // Step 1: Auto create full backup snapshot before resetting
  createBackupSnapshot('Auto_Pre_ResetAll', (errSnapshot, snapshot) => {
    if (errSnapshot) {
      console.warn('[RESET ALL] Pre-reset backup warning:', errSnapshot.message);
    }

    db.run('DELETE FROM attendance_records', [], function (errDelete) {
      if (errDelete) {
        return res.status(500).json({ success: false, message: 'Failed to reset attendance database: ' + errDelete.message });
      }

      const deletedRows = this ? this.changes || 0 : 0;

      const io = global.io;
      if (io) {
        io.emit('attendance_updated', { type: 'reset_all' });
        io.emit('attendance_reset', { type: 'reset_all' });
      }

      return res.json({
        success: true,
        message: 'Entire attendance database reset successfully. Student & Faculty accounts, subjects, and timetables remain completely intact.',
        recordsDeleted: deletedRows,
        backupCreated: snapshot ? snapshot.backup_name : 'Created'
      });
    });
  });
}

/**
 * 10. UNDO LAST RESET
 */
function undoLastReset(req, res) {
  // Find the latest auto pre-reset backup or newest backup
  db.get(
    "SELECT * FROM attendance_backups WHERE backup_name LIKE 'Auto_Pre_%' ORDER BY created_at DESC LIMIT 1",
    [],
    (err, autoBackup) => {
      let targetBackup = autoBackup;

      if (!targetBackup) {
        // Fallback to absolute newest backup
        db.get('SELECT * FROM attendance_backups ORDER BY created_at DESC LIMIT 1', [], (err2, newestBackup) => {
          if (!newestBackup) {
            return res.status(404).json({ success: false, message: 'No backup found in database history to undo reset.' });
          }
          restoreBackupFromRow(newestBackup);
        });
      } else {
        restoreBackupFromRow(targetBackup);
      }
    }
  );

  function restoreBackupFromRow(row) {
    let backupObj = null;
    try {
      backupObj = typeof row.backup_data === 'string' ? JSON.parse(row.backup_data) : row.backup_data;
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to parse backup payload for undo' });
    }

    const records = backupObj.records || [];
    const sessions = backupObj.sessions || [];

    db.serialize(() => {
      sessions.forEach((s) => {
        db.run(
          `INSERT OR IGNORE INTO attendance_sessions (id, subject, department, year, section, admin_lat, admin_lng, start_time, expiry_time, end_time, duration_minutes, attendance_code, status, created_at, period_number, faculty_name, faculty_id, subject_code, subject_id, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id, s.subject || 'Restored Session', s.department || 'AI & DS', s.year || 3, s.section || 'A',
            s.admin_lat || 0.0, s.admin_lng || 0.0, s.start_time, s.expiry_time, s.end_time, s.duration_minutes || 60,
            s.attendance_code || 'UNDO_RESET', s.status || 'ended', s.created_at, s.period_number, s.faculty_name,
            s.faculty_id, s.subject_code, s.subject_id, s.date
          ]
        );
      });

      records.forEach((r) => {
        db.run(
          `INSERT OR REPLACE INTO attendance_records (id, student_id, session_id, attendance_code, attendance_time, student_lat, student_lng, distance_meters, status, device_fingerprint, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id, r.student_id, r.session_id, r.attendance_code || 'UNDO_RESET', r.attendance_time,
            r.student_lat || 0.0, r.student_lng || 0.0, r.distance_meters || 0.0, r.status || 'present',
            r.device_fingerprint || 'undo_reset', r.notes || 'Restored via Undo Reset'
          ]
        );
      });

      const io = global.io;
      if (io) {
        io.emit('attendance_updated', { type: 'undo_reset', count: records.length });
        io.emit('attendance_reset', { type: 'undo_reset' });
      }

      return res.json({
        success: true,
        message: 'Last reset undone successfully. Attendance data restored.',
        restoredBackupName: row.backup_name,
        recordsRestored: records.length
      });
    });
  }
}

module.exports = {
  exportAttendance,
  importAttendance,
  createFullBackup,
  getBackupsList,
  downloadBackup,
  restoreBackup,
  deleteBackup,
  resetTodayAttendance,
  resetAllAttendance,
  undoLastReset
};
