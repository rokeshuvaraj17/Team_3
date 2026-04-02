const { Router } = require('express')
const requireDb = require('../middleware/requireDb')
const ctrl = require('../controllers/health.controller')

const router = Router()

router.get('/', ctrl.check)
router.get('/db', requireDb, ctrl.dbCheck)

module.exports = router
