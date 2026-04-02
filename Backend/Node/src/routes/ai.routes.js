const { Router } = require('express')
const ctrl = require('../controllers/ai.controller')

const router = Router()

// All AI endpoints do their own auth check (x-user-id header) inside the controller
router.post('/skill-suggestions', ctrl.skillSuggestions)
router.post('/generate-cover-letter', ctrl.generateCoverLetter)
router.post('/generate-resume', ctrl.generateResume)
router.post('/translate', ctrl.translate)

module.exports = router
