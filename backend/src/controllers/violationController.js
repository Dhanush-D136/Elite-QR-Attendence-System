const { db } = require('../database/db');

function getViolationLogs(req, res) {
  db.all('SELECT * FROM violation_logs ORDER BY created_at DESC LIMIT 100', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch violation logs' });
    res.json({ violations: rows });
  });
}

function clearViolationLogs(req, res) {
  db.run('DELETE FROM violation_logs', [], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to clear log history' });
    res.json({ message: 'Security logs cleared successfully' });
  });
}

module.exports = { getViolationLogs, clearViolationLogs };
