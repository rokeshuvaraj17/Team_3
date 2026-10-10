const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
const env = require('./env')

const IGNORABLE = new Set(['42P07', '42710', '42701', '23505'])

function sslFor(url) {
  if (/[?&]sslmode=disable/i.test(url)) return false
  const host = (url.match(/@([^/:?]+)/) || [])[1] || ''
  if (/\.supabase\.|neon\.tech|amazonaws\.com/i.test(host)) {
    return { rejectUnauthorized: false }
  }
  return false
}

function createPool() {
  const url = env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const ssl = sslFor(url)
  return new Pool({
    connectionString: url,
    ...(ssl ? { ssl } : {}),
    max: 2,
    connectionTimeoutMillis: 15000,
  })
}

async function runFile(pool, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8')
  try {
    await pool.query(sql)
  } catch (err) {
    if (IGNORABLE.has(err.code)) return
    throw err
  }
}

async function ensure() {
  const pool = createPool()
  try {
    await pool.query('select 1')
    await runFile(pool, path.join(__dirname, '../../schema/bootstrap.sql'))
    const migrationsDir = path.join(__dirname, '../../migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.toLowerCase().endsWith('.sql'))
      .sort()
    for (const file of files) {
      await runFile(pool, path.join(migrationsDir, file))
    }
    console.log('[db] schema ready on hosted Postgres')
  } finally {
    await pool.end()
  }
}

module.exports = { ensure }
