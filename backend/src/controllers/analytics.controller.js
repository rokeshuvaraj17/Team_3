const analyticsModel = require('../models/analytics.model')
const { handleDbError } = require('../middleware/errorHandler')

async function getStats(req, res) {
  try {
    const stats = await analyticsModel.getStats(req.userId)
    res.json(stats)
  } catch (err) {
    const { status, body } = handleDbError(err, 'Analytics stats')
    return res.status(status).json(body)
  }
}

module.exports = { getStats }
