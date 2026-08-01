const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Flexible Admin Login
function adminLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email/username and password required' });
  }

  const cleanInput = email.trim().toLowerCase();

  const query = `
    SELECT * FROM users 
    WHERE role = 'admin' 
      AND (
        LOWER(email) = ? 
        OR LOWER(roll_number) = ? 
        OR ? = 'admin' 
        OR ? = 'vel'
      )
    LIMIT 1
  `;

  db.get(query, [cleanInput, cleanInput, cleanInput, cleanInput], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });

    let isValid = false;
    try {
      isValid = await bcrypt.compare(password, user.password_hash);
    } catch (e) {}

    if (!isValid) return res.status(401).json({ error: 'Invalid admin password' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin authentication successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
        phone: user.phone,
        profile_photo: user.profile_photo,
        institution_name: user.institution_name,
        department_name: user.department_name
      }
    });
  });
}

function isValidPasswordComplexity(pwd) {
  if (!pwd || typeof pwd !== 'string' || pwd.trim() === '') return false;
  return true;
}

// Flexible Student Login
function studentLogin(req, res) {
  const { roll_number, password, device_fingerprint } = req.body;

  if (!roll_number || !password) {
    return res.status(400).json({ error: 'Roll number/email and password required' });
  }

  const cleanInput = roll_number.trim().toLowerCase();

  const query = `
    SELECT * FROM users 
    WHERE (LOWER(roll_number) = ? OR LOWER(email) = ? OR LOWER(email) LIKE ?) 
      AND role = 'student'
    LIMIT 1
  `;

  db.get(query, [cleanInput, cleanInput, `${cleanInput}%`], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid Password' });

    let isValid = false;
    try {
      isValid = await bcrypt.compare(password, user.password_hash);
    } catch (e) {}

    if (!isValid) return res.status(401).json({ error: 'Invalid Password' });

    const isFirstLogin = Boolean(user.first_login === 1 || user.is_first_login === 1 || user.must_change_password === 1 || user.password_changed === 0);

    // Check device binding if device_fingerprint is provided
    let registeredDevice = user.device_fingerprint;
    if (!registeredDevice && device_fingerprint) {
      db.run('UPDATE users SET device_fingerprint = ? WHERE id = ?', [device_fingerprint, user.id]);
      registeredDevice = device_fingerprint;
    }

    // Log student login event
    const logId = uuidv4();
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp);
    const ua = req.headers['user-agent'] || 'Unknown Browser';
    const device = ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone') ? 'Mobile Device' : 'Desktop PC';
    const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Web Browser';

    db.run(
      `INSERT INTO login_logs (id, student_id, login_time, ip_address, device, browser) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
      [logId, user.id, ip, device, browser]
    );

    const token = jwt.sign(
      { id: user.id, name: user.name, roll_number: user.roll_number, email: user.email, role: 'student', department: user.department, year: user.year, section: user.section },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Student authentication successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        roll_number: user.roll_number,
        email: user.email,
        department: user.department,
        year: user.year,
        section: user.section,
        role: 'student',
        profile_photo: user.profile_photo,
        device_fingerprint: registeredDevice,
        first_login: isFirstLogin,
        is_first_login: isFirstLogin,
        password_changed: !isFirstLogin,
        must_change_password: isFirstLogin ? 1 : 0
      }
    });
  });
}

// First-time Password Reset
async function firstTimePasswordChange(req, res) {
  const { new_password, confirm_password, device_fingerprint } = req.body;
  const userId = req.user.id;

  if (confirm_password !== undefined && new_password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (!isValidPasswordComplexity(new_password)) {
    return res.status(400).json({
      error: 'Please enter a valid new password.'
    });
  }

  const password_hash = await bcrypt.hash(new_password, 10);
  const now = new Date().toISOString();

  db.run(
    'UPDATE users SET password_hash = ?, must_change_password = 0, is_first_login = 0, first_login = 0, password_changed = 1, password_changed_at = ?, device_fingerprint = COALESCE(?, device_fingerprint) WHERE id = ?',
    [password_hash, now, device_fingerprint || null, userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update password: ' + err.message });

      const auditId = uuidv4();
      db.run(
        `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Student', 'First-Time Password Setup', CURRENT_TIMESTAMP)`,
        [auditId, userId]
      );

      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'User fetch error' });

        const token = jwt.sign(
          { id: user.id, name: user.name, roll_number: user.roll_number, email: user.email, role: 'student', department: user.department, year: user.year, section: user.section },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Password updated successfully.',
          token,
          user: {
            id: user.id,
            name: user.name,
            roll_number: user.roll_number,
            email: user.email,
            department: user.department,
            year: user.year,
            section: user.section,
            role: 'student',
            profile_photo: user.profile_photo,
            device_fingerprint: user.device_fingerprint,
            first_login: false,
            is_first_login: false,
            password_changed: true,
            must_change_password: 0
          }
        });
      });
    }
  );
}

// Change Password
async function changePassword(req, res) {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.user.id;

  if (confirm_password !== undefined && new_password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (!isValidPasswordComplexity(new_password)) {
    return res.status(400).json({
      error: 'Please enter a valid new password.'
    });
  }

  db.get('SELECT password_hash FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });

    let isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid Password' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    const now = new Date().toISOString();
    db.run(
      'UPDATE users SET password_hash = ?, must_change_password = 0, is_first_login = 0, first_login = 0, password_changed = 1, password_changed_at = ? WHERE id = ?',
      [newHash, now, userId],
      (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update password' });
        res.json({ message: 'Password updated successfully' });
      }
    );
  });
}

// Get current profile
function getMe(req, res) {
  db.get(
    'SELECT id, name, roll_number, email, role, department, year, section, phone, profile_photo, institution_name, department_name, device_fingerprint, is_first_login, first_login, must_change_password, password_changed, password_changed_at, dob, gender, blood_group, address, parent_name, parent_phone, bio FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'User not found' });
      const isFirstLogin = Boolean(user.first_login === 1 || user.is_first_login === 1 || user.must_change_password === 1 || user.password_changed === 0);
      res.json({
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
}

// Update Admin Profile
async function updateAdminProfile(req, res) {
  const { name, email, phone, profile_photo, institution_name, department_name, new_password } = req.body;
  const adminId = req.user.id;

  try {
    let passwordHash = null;
    if (new_password && new_password.trim().length >= 4) {
      passwordHash = await bcrypt.hash(new_password, 10);
    }

    let query = `
      UPDATE users 
      SET name = ?, email = ?, phone = ?, profile_photo = ?, institution_name = ?, department_name = ?
    `;
    const params = [name, email, phone, profile_photo, institution_name, department_name];

    if (passwordHash) {
      query += `, password_hash = ?`;
      params.push(passwordHash);
    }

    query += ` WHERE id = ? AND role = 'admin'`;
    params.push(adminId);

    db.run(query, params, function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update admin profile: ' + err.message });
      
      db.get('SELECT id, name, email, role, phone, profile_photo, institution_name, department_name FROM users WHERE id = ?', [adminId], (err, user) => {
        res.json({ message: 'Admin profile updated successfully', user });
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error updating profile' });
  }
}

// Update Student Profile
async function updateStudentProfile(req, res) {
  const { phone, profile_photo, dob, gender, blood_group, address, parent_name, parent_phone, bio, new_password } = req.body;
  const studentId = req.user.id;

  try {
    let passwordHash = null;
    if (new_password && new_password.trim().length >= 4) {
      passwordHash = await bcrypt.hash(new_password, 10);
    }

    let query = `UPDATE users SET phone = ?, profile_photo = ?, dob = ?, gender = ?, blood_group = ?, address = ?, parent_name = ?, parent_phone = ?, bio = ?`;
    const params = [phone || '', profile_photo, dob || null, gender || null, blood_group || null, address || null, parent_name || null, parent_phone || null, bio || null];

    if (passwordHash) {
      query += `, password_hash = ?, must_change_password = 0, is_first_login = 0, first_login = 0, password_changed = 1`;
      params.push(passwordHash);
    }

    query += ` WHERE id = ? AND role = 'student'`;
    params.push(studentId);

    db.run(query, params, function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update student profile: ' + err.message });

      db.get('SELECT id, name, roll_number, email, role, department, year, section, phone, profile_photo, device_fingerprint, dob, gender, blood_group, address, parent_name, parent_phone, bio FROM users WHERE id = ?', [studentId], (err, user) => {
        res.json({ message: 'Student profile updated successfully', user });
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error updating student profile' });
  }
}

// Student Self-Service Device Registration ("Use This Device")
function registerStudentDevice(req, res) {
  const { device_fingerprint } = req.body;
  const studentId = req.user.id;

  if (!device_fingerprint) {
    return res.status(400).json({ error: 'Device fingerprint is required' });
  }

  db.run("UPDATE users SET device_fingerprint = ? WHERE id = ? AND role = 'student'", [device_fingerprint, studentId], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to register device: ' + err.message });
    
    db.get('SELECT id, name, roll_number, email, role, department, year, section, phone, profile_photo, device_fingerprint FROM users WHERE id = ?', [studentId], (err, user) => {
      res.json({ message: 'Current device bound successfully!', user });
    });
  });
}

module.exports = {
  adminLogin,
  studentLogin,
  firstTimePasswordChange,
  changePassword,
  getMe,
  updateAdminProfile,
  updateStudentProfile,
  registerStudentDevice
};
