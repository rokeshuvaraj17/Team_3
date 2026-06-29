const { Pool } = require('pg')
const { DATABASE_URL } = require('./env')

const isRemoteDb =
  DATABASE_URL &&
  !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(DATABASE_URL)

const poolConfig = DATABASE_URL
  ? {
      connectionString: DATABASE_URL,
      ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {}),
    }
  : null

const pool = poolConfig ? new Pool(poolConfig) : null

if (pool) {
  pool.on('error', (err) => {
    console.error('Database pool error:', err.message)
  })
}

module.exports = pool
