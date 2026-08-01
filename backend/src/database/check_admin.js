const { db } = require('./db');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
  db.all("SELECT id, name, email, roll_number, role, password_hash FROM users WHERE role = 'admin'", [], async (err, rows) => {
    console.log('--- ADMIN USERS IN DB ---');
    console.log(rows);

    // Ensure admin accounts have known working passwords
    const defaultAdminHash = await bcrypt.hash('admin123', 10);

    for (const row of rows || []) {
      const isMatchAdmin123 = await bcrypt.compare('admin123', row.password_hash);
      const isMatchVel = await bcrypt.compare('vel', row.password_hash);
      const isMatch1234 = await bcrypt.compare('1234', row.password_hash);
      console.log(`Admin ${row.email || row.name}: admin123=${isMatchAdmin123}, vel=${isMatchVel}, 1234=${isMatch1234}`);
    }

    // Let's set admin passwords so 'admin123' OR 'vel' OR '1234' work or reset them to 'admin123'
    db.run(
      `UPDATE users SET password_hash = ? WHERE role = 'admin'`,
      [defaultAdminHash],
      () => {
        console.log('✓ Reset all admin accounts password_hash to bcrypt("admin123")');
        process.exit(0);
      }
    );
  });
}

checkAdmin();
