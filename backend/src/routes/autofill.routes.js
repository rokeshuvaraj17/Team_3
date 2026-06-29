const { Router } = require('express')
const requireDb = require('../middleware/requireDb')
const ctrl = require('../controllers/autofill.controller')

const router = Router()

// GET/PUT autofill do their own auth check (x-user-id header) inside the controller
router.get('/', requireDb, ctrl.get)
router.put('/', requireDb, ctrl.update)

// Semantic endpoints have OPTIONAL userId — no auth middleware
router.post('/semantic-match', ctrl.semanticMatch)
router.post('/semantic-option-match', ctrl.semanticOptionMatch)
router.post('/match-fields', ctrl.matchFields)

module.exports = router
