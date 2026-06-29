const { Router } = require('express')
const auth = require('../middleware/auth')
const requireDb = require('../middleware/requireDb')
const ctrl = require('../controllers/jobTracker.controller')

const router = Router()

router.post('/', auth, requireDb, ctrl.create)
router.get('/', auth, requireDb, ctrl.list)

module.exports = router
