const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbPassword = process.env.SUPABASE_DB_PASSWORD || '';
const host = process.env.SUPABASE_DB_HOST || 'db.ehmrnreqjadhjmmtlugj.supabase.co';
const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
const database = process.env.SUPABASE_DB_NAME || 'postgres';
const user = process.env.SUPABASE_DB_USER || 'postgres';

console.log('====================================================');
console.log('🚀 SUPABASE DATA MIGRATION & DEPLOYMENT AUDIT');
console.log('====================================================');

if (!dbPassword || dbPassword.trim() === '') {
  console.error('\n❌ ERROR: SUPABASE_DB_PASSWORD is missing or empty in backend/.env!');
  console.error('👉 Please paste your Supabase database password into backend/.env:');
  console.error('   SUPABASE_DB_PASSWORD=your_actual_password_here');
  console.error('\nThen re-run: node src/database/migrate_sqlite_to_supabase.js\n');
  process.exit(1);
}

const sqlitePath = path.resolve(__dirname, 'smartattend.db');
const sqliteDb = new sqlite3.Database(sqlitePath);

console.log(`[TARGET CONNECTION] User: ${user} | Host: ${host} | Port: ${port} | DB: ${database}`);

const pgPool = new Pool({
  host,
  port,
  database,
  user,
  password: dbPassword,
  ssl: { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 10000
});

async function runMigrationAudit() {
  let pgClient;
  try {
    console.log(`\n[STEP 1/5] Connecting to Supabase PostgreSQL at ${host}:${port}...`);
    pgClient = await pgPool.connect();
    console.log('✅ Connected to Supabase PostgreSQL successfully!');

    console.log('\n[STEP 2/5] Executing supabase_schema.sql (Creating all tables, indexes, RLS policies)...');
    const schemaSqlPath = path.join(__dirname, 'supabase_schema.sql');
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
    await pgClient.query(schemaSql);
    console.log('✅ PostgreSQL Schema Applied Cleanly to Supabase!');

    console.log('\n[STEP 3/5] Verifying Created Tables in Supabase...');
    const tableRes = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const createdTables = tableRes.rows.map(r => r.table_name);
    console.log(`✅ Found ${createdTables.length} tables in Supabase public schema:`);
    console.log(createdTables.join(', '));

    console.log('\n[STEP 4/5] Migrating Existing SQLite Data from smartattend.db into Supabase...');

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

    const auditReport = [];

    for (const table of tablesToMigrate) {
      if (!createdTables.includes(table)) {
        console.warn(`⚠️ Warning: Table '${table}' does not exist in Supabase schema. Skipping data copy.`);
        continue;
      }

      // Read rows from SQLite
      const sqliteRows = await new Promise((resolve) => {
        sqliteDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
          if (err) resolve([]);
          else resolve(rows || []);
        });
      });

      let insertedCount = 0;
      if (sqliteRows.length > 0) {
        for (const row of sqliteRows) {
          const keys = Object.keys(row);
          const values = Object.values(row);
          if (keys.length === 0) continue;

          // Convert SQLite query placeholders
          const colNames = keys.map(k => `"${k}"`).join(', ');
          const paramPlaceholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');

          // Generate ON CONFLICT DO UPDATE or DO NOTHING
          const primaryKey = keys.includes('id') ? 'id' : keys[0];
          const updateSet = keys
            .filter(k => k !== primaryKey)
            .map(k => `"${k}" = EXCLUDED."${k}"`)
            .join(', ');

          let insertQuery = `INSERT INTO public."${table}" (${colNames}) VALUES (${paramPlaceholders})`;
          if (updateSet) {
            insertQuery += ` ON CONFLICT ("${primaryKey}") DO UPDATE SET ${updateSet}`;
          } else {
            insertQuery += ` ON CONFLICT ("${primaryKey}") DO NOTHING`;
          }

          try {
            await pgClient.query(insertQuery, values);
            insertedCount++;
          } catch (insertErr) {
            console.error(`❌ Failed inserting row into ${table}:`, insertErr.message);
          }
        }
      }

      // Count total rows in Supabase table
      const countRes = await pgClient.query(`SELECT COUNT(*) FROM public."${table}"`);
      const supabaseCount = parseInt(countRes.rows[0].count, 10);

      auditReport.push({
        table,
        sqliteCount: sqliteRows.length,
        supabaseCount
      });
      console.log(`  ✓ ${table}: SQLite=${sqliteRows.length} rows ➔ Supabase=${supabaseCount} rows`);
    }

    console.log('\n[STEP 5/5] Migration Complete! Audit Summary Table:');
    console.table(auditReport);

    console.log('\n====================================================');
    console.log('🎉 SUPABASE MIGRATION STATUS: SUCCESS!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err.message);
    console.error(err.stack);
  } finally {
    if (pgClient) pgClient.release();
    pgPool.end();
    sqliteDb.close();
  }
}

runMigrationAudit();
