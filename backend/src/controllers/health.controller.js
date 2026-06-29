const pool = require('../config/db')
const { handleDbError } = require('../middleware/errorHandler')

function check(req, res) {
  res.json({ ok: true, message: 'Backend is running', timestamp: new Date().toISOString() })
}

async function dbCheck(req, res) {
  try {
    await pool.query('select 1')
    const status = typeof pool.getStatus === 'function' ? pool.getStatus() : undefined
    res.json({ ok: true, message: 'Database connected', db: status })
  } catch (err) {
    const { status, body } = handleDbError(err, 'Health check')
    return res.status(status).json(body)
  }
}

module.exports = { check, dbCheck }
