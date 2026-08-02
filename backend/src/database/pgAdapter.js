const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let dbPassword = process.env.SUPABASE_DB_PASSWORD || '';
let host = process.env.SUPABASE_DB_HOST || 'aws-0-ap-south-1.pooler.supabase.com';
let port = parseInt(process.env.SUPABASE_DB_PORT || '6543', 10);
const database = process.env.SUPABASE_DB_NAME || 'postgres';
let user = process.env.SUPABASE_DB_USER || 'postgres';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'ehmrnreqjadhjmmtlugj';

// AUTOMATIC IPv4 RESOLUTION & POOLER REWRITE FOR RENDER & CLOUD DEPLOYMENTS
// Direct Supabase DB hosts (db.[ref].supabase.co) are IPv6-ONLY.
// Render free/standard web instances operate on IPv4-only networks and fail with ENETUNREACH.
// We automatically upgrade connections to use Supabase IPv4 Pooler (aws-0-[region].pooler.supabase.com).
if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
  const extractedRef = host.split('.')[1] || projectRef;
  console.log(`[SUPABASE NETWORK AUDIT] Detected direct IPv6-only host: ${host}`);
  console.log(`[SUPABASE NETWORK AUDIT] Auto-switching to Supabase IPv4 Connection Pooler host for Render compatibility.`);
  
  host = process.env.SUPABASE_POOLER_HOST || 'aws-0-ap-south-1.pooler.supabase.com';
  if (port === 5432) port = 6543;
  if (!user.includes('.')) {
    user = `${user}.${extractedRef}`;
  }
} else if (!user.includes('.') && projectRef && host.includes('pooler.supabase.com')) {
  user = `${user}.${projectRef}`;
}

let pool = null;
let isSupabaseActive = false;

if (dbPassword && dbPassword.trim() !== '') {
  console.log('====================================================');
  console.log('[SUPABASE PG] Initializing IPv4 Connection Pooler:');
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

async function initSupabasePostgres() {
  if (!pool) {
    isSupabaseActive = false;
    return false;
  }
  try {
    const client = await pool.connect();
    console.log('====================================================');
    console.log('✅ Connected successfully to Supabase PostgreSQL cloud database (IPv4 Pooler)!');
    console.log('====================================================');

    // Read and run schema migrations
    const schemaSqlPath = path.join(__dirname, 'supabase_schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const sqlContent = fs.readFileSync(schemaSqlPath, 'utf8');
      await client.query(sqlContent);
      console.log('✅ Supabase PostgreSQL tables, indexes, and RLS policies verified and migrated.');
    }
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
