const path = require('path')
const dotenv = require('dotenv')
const { Pool } = require('pg')

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function query(sql, params = []) {
  return pool.query(sql, params)
}

async function cleanup() {
  const { rows } = await pool.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `)

  const tables = rows.map((r) => `"public"."${r.tablename}"`)
  if (tables.length) {
    await pool.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE;`)
  }
}

async function close() {
  await pool.end()
}

module.exports = { query, cleanup, close }