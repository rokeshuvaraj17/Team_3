const pool = require('../config/db')

function requireDb(req, res, next) {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  next()
}

module.exports = requireDb
