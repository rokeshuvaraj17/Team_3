const { Router } = require('express')
const requireDb = require('../middleware/requireDb')
const auth = require('../middleware/auth')
const ctrl = require('../controllers/oauth.controller')

const router = Router()

router.get('/extension', ctrl.authorizeRedirect)
router.post('/extension/approve', auth, requireDb, ctrl.approve)
router.post('/extension/deny', ctrl.deny)
router.post('/extension/token', requireDb, ctrl.token)

module.exports = router
