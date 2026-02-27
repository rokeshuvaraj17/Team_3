require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Prefer DIRECT_URL for migrations if set (non-pgbouncer), otherwise fall back to DATABASE_URL
const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DIRECT_URL or DATABASE_URL is not set in .env');
  process.exit(1);
}

const isRemoteDb = !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(DATABASE_URL);
const pool = new Pool({
  connectionString: DATABASE_URL,
  ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {}),
});

const migrationsDir = path.join(__dirname, 'migrations');

async function run() {
  try {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.toLowerCase().endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
    }

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
