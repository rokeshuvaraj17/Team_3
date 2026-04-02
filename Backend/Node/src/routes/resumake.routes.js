const { Router } = require('express')
const auth = require('../middleware/auth')
const ctrl = require('../controllers/resumake.controller')

const router = Router()

router.post('/generate', auth, ctrl.generate)
router.post('/compile-pdf', auth, ctrl.compilePdf)

module.exports = router
