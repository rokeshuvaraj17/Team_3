const { Router } = require('express')
const requireDb = require('../middleware/requireDb')
const ctrl = require('../controllers/auth.controller')

const router = Router()

router.post('/signup/otp', requireDb, ctrl.signupStart)
router.post('/signup', requireDb, ctrl.signup)
router.post('/login', requireDb, ctrl.login)
router.post('/forgot-password', requireDb, ctrl.forgotPassword)
router.post('/forgot-password/reset', requireDb, ctrl.resetPassword)

module.exports = router
