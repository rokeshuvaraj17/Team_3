const { Router } = require('express')
const auth = require('../middleware/auth')
const requireDb = require('../middleware/requireDb')
const ctrl = require('../controllers/analytics.controller')

const router = Router()

router.get('/stats', auth, requireDb, ctrl.getStats)

module.exports = router
