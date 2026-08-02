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

if (dbPassword && dbPassword.trim() !== '') {
  console.log('[SUPABASE PG] Initializing PostgreSQL connection pool to Supabase:', host);
  pool = new Pool({
    host,
    port,
    database,
    user,
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
} else {
  console.log('[SUPABASE PG] Supabase DB password not provided in .env yet. Running in SQLite fallback mode until password is set.');
}

async function initSupabasePostgres() {
  if (!pool) {
    return false;
  }
  try {
    const client = await pool.connect();
    console.log('[SUPABASE PG] Connected successfully to Supabase PostgreSQL cloud database!');
    
    // Read and run schema migrations
    const schemaSqlPath = path.join(__dirname, 'supabase_schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const sqlContent = fs.readFileSync(schemaSqlPath, 'utf8');
      await client.query(sqlContent);
      console.log('[SUPABASE PG] Supabase PostgreSQL tables, indexes, and RLS policies verified and migrated.');
    }
    client.release();
    return true;
  } catch (error) {
    console.error('[SUPABASE PG] Failed to connect to Supabase PostgreSQL database:', error.message);
    return false;
  }
}

module.exports = { pool, initSupabasePostgres };
