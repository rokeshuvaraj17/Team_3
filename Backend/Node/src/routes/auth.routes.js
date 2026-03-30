const { Router } = require('express')
const requireDb = require('../middleware/requireDb')
const ctrl = require('../controllers/auth.controller')

const router = Router()

router.post('/signup', requireDb, ctrl.signup)
router.post('/login', requireDb, ctrl.login)

module.exports = router
