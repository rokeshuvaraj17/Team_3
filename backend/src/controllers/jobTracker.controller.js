const jobTrackerModel = require('../models/jobTracker.model')
const { handleDbError } = require('../middleware/errorHandler')

async function create(req, res) {
  try {
    const row = await jobTrackerModel.create(req.userId, req.body || {})
    res.status(201).json({
      id: row.id,
      company_name: row.company_name,
      position_title: row.position_title,
      location: row.location,
      created_at: row.created_at,
    })
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'Job tracker is not set up. Run the database migration: backend/migrations/create_job_tracker.sql' })
    }
    const { status, body } = handleDbError(err, 'Job tracker save')
    return res.status(status).json(body)
  }
}

async function list(req, res) {
  try {
    const rows = await jobTrackerModel.listByUserId(req.userId)
    res.json(rows)
  } catch (err) {
    if (err.code === '42P01') return res.json([])
    const { status, body } = handleDbError(err, 'Job tracker list')
    return res.status(status).json(body)
  }
}

module.exports = { create, list }
