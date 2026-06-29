const { Router } = require('express')
const auth = require('../middleware/auth')
const requireDb = require('../middleware/requireDb')
const ctrl = require('../controllers/job.controller')

const router = Router()

// External job search proxies (no auth, no DB)
router.get('/search', ctrl.searchAdzuna)
router.get('/jooble/search', ctrl.searchJooble)
router.get('/arbeitnow/search', ctrl.searchArbeitnow)
router.get('/reed/search', ctrl.searchReed)
router.get('/jsearch/search', ctrl.searchJsearch)

// Internal job DB
router.get('/', requireDb, ctrl.list)
router.get('/:id', requireDb, ctrl.getOne)
router.post('/:id/apply', auth, requireDb, ctrl.apply)
router.get('/:id/applied', auth, requireDb, ctrl.checkApplied)

module.exports = router
