const pool = require('../config/db')
const { handleDbError } = require('../middleware/errorHandler')

function check(req, res) {
  res.json({ ok: true, message: 'Backend is running', timestamp: new Date().toISOString() })
}

async function dbCheck(req, res) {
  try {
    await pool.query('select 1')
    res.json({ ok: true, message: 'Database connected' })
  } catch (err) {
    const { status, body } = handleDbError(err, 'Health check')
    return res.status(status).json(body)
  }
}

module.exports = { check, dbCheck }
