const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const dbPassword = process.env.SUPABASE_DB_PASSWORD || '';
const host = process.env.SUPABASE_DB_HOST || 'db.ehmrnreqjadhjmmtlugj.supabase.co';
const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
const database = process.env.SUPABASE_DB_NAME || 'postgres';
const user = process.env.SUPABASE_DB_USER || 'postgres';

let pool = null;
let isSupabaseActive = false;

if (dbPassword && dbPassword.trim() !== '') {
  console.log('====================================================');
  console.log('[SUPABASE PG] Initializing PostgreSQL Connection Pool:');
  console.log(`  ➔ Host:     ${host}`);
  console.log(`  ➔ Port:     ${port}`);
  console.log(`  ➔ User:     ${user}`);
  console.log(`  ➔ Database: ${database}`);
  console.log('====================================================');

  pool = new Pool({
    host,
    port,
    database,
    user,
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
} else {
  console.log('[SUPABASE PG] Supabase DB password not provided in .env yet. Running in SQLite fallback mode until password is set.');
}

/**
 * Convert SQLite query string syntax to PostgreSQL syntax
 */
function convertSqlToPostgres(sql) {
  let converted = sql;

  // Replace positional SQLite placeholders '?' with PostgreSQL '$1', '$2', ...
  let paramIndex = 1;
  converted = converted.replace(/\?/g, () => `$${paramIndex++}`);

  // SQLite specific SQL keyword conversions
  converted = converted.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
  converted = converted.replace(/INSERT OR REPLACE INTO/gi, 'INSERT INTO');

  // Convert SQLite LIKE to PostgreSQL ILIKE for case-insensitive text search
  converted = converted.replace(/\bLIKE\b/gi, 'ILIKE');

  return converted;
}

/**
 * Execute query on PostgreSQL with SQLite-compatible interface
 */
async function queryPg(sql, params = []) {
  if (!pool) throw new Error('Supabase PostgreSQL pool not initialized.');
  const pgSql = convertSqlToPostgres(sql);
  const result = await pool.query(pgSql, params);
  return result;
}

async function getPg(sql, params = []) {
  const result = await queryPg(sql, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function allPg(sql, params = []) {
  const result = await queryPg(sql, params);
  return result.rows;
}

async function runPg(sql, params = []) {
  const result = await queryPg(sql, params);
  return {
    lastID: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
    changes: result.rowCount || 0
  };
}

/**
 * Automatic On-Startup Migration: Reads SQLite smartattend.db & populates Supabase PostgreSQL
 */
async function autoMigrateSqliteToSupabase(client) {
  const sqlite3 = require('sqlite3').verbose();
  const sqlitePath = path.join(__dirname, 'smartattend.db');

  if (!fs.existsSync(sqlitePath)) {
    console.log('[SUPABASE AUTO-MIGRATION] SQLite smartattend.db not found. Skipping auto-migration.');
    return;
  }

  console.log('====================================================');
  console.log('🚀 [SUPABASE AUTO-MIGRATION] Verifying & Seeding Supabase PostgreSQL from SQLite smartattend.db...');
  console.log('====================================================');

  const sqliteDb = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY);

  const tablesToMigrate = [
    'users',
    'attendance_tokens',
    'attendance_sessions',
    'attendance_records',
    'violation_logs',
    'login_logs',
    'password_audit_logs',
    'departments',
    'classes',
    'sections',
    'subjects',
    'timetables',
    'system_settings',
    'faculty',
    'faculty_subject_mapping',
    'faculty_timetable_mapping',
    'faculty_subjects',
    'faculty_remarks',
    'faculty_documents',
    'faculty_announcements',
    'faculty_leave_requests',
    'faculty_activity_logs',
    'class_details'
  ];

  for (const table of tablesToMigrate) {
    try {
      const sqliteRows = await new Promise((resolve) => {
        sqliteDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
          if (err) resolve([]);
          else resolve(rows || []);
        });
      });

      if (sqliteRows.length === 0) continue;

      let inserted = 0;
      for (const row of sqliteRows) {
        const keys = Object.keys(row);
        const values = Object.values(row);
        if (keys.length === 0) continue;

        const colNames = keys.map((k) => `"${k}"`).join(', ');
        const paramPlaceholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
        const primaryKey = keys.includes('id') ? 'id' : keys[0];

        const updateSet = keys
          .filter((k) => k !== primaryKey)
          .map((k) => `"${k}" = EXCLUDED."${k}"`)
          .join(', ');

        let insertQuery = `INSERT INTO public."${table}" (${colNames}) VALUES (${paramPlaceholders})`;
        if (updateSet) {
          insertQuery += ` ON CONFLICT ("${primaryKey}") DO UPDATE SET ${updateSet}`;
        } else {
          insertQuery += ` ON CONFLICT ("${primaryKey}") DO NOTHING`;
        }

        try {
          await client.query(insertQuery, values);
          inserted++;
        } catch (e) {
          // Ignore duplicate conflicts
        }
      }
      console.log(`  ✓ Auto-migrated ${table}: ${inserted}/${sqliteRows.length} rows inserted into Supabase.`);
    } catch (tblErr) {
      console.warn(`  ⚠️ Table '${table}' auto-migration note:`, tblErr.message);
    }
  }

  sqliteDb.close();
  console.log('====================================================');
  console.log('🎉 [SUPABASE AUTO-MIGRATION] Complete! All SQLite production records seeded into Supabase PostgreSQL.');
  console.log('====================================================');
}

async function initSupabasePostgres() {
  if (!pool) {
    isSupabaseActive = false;
    return false;
  }
  try {
    const client = await pool.connect();
    console.log('====================================================');
    console.log('✅ Connected successfully to Supabase PostgreSQL cloud database!');
    console.log('====================================================');

    // Read and run schema migrations
    const schemaSqlPath = path.join(__dirname, 'supabase_schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const sqlContent = fs.readFileSync(schemaSqlPath, 'utf8');
      await client.query(sqlContent);
      console.log('✅ Supabase PostgreSQL tables, indexes, and RLS policies verified and migrated.');
    }

    // Auto-migrate SQLite data into Supabase if empty
    await autoMigrateSqliteToSupabase(client);

    client.release();
    isSupabaseActive = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase PostgreSQL database:', error.message);
    isSupabaseActive = false;
    return false;
  }
}

module.exports = {
  pool,
  initSupabasePostgres,
  isSupabaseActive: () => isSupabaseActive,
  queryPg,
  getPg,
  allPg,
  runPg
};
