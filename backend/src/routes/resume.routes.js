const { Router } = require('express')
const auth = require('../middleware/auth')
const requireDb = require('../middleware/requireDb')
const { uploadResume } = require('../middleware/upload')
const ctrl = require('../controllers/resume.controller')

const router = Router()

router.get('/', auth, requireDb, ctrl.list)
router.post('/', auth, requireDb, ctrl.create)
router.post('/upload', auth, uploadResume.single('file'), ctrl.upload)
router.get('/:id/text', auth, requireDb, ctrl.getText)
router.get('/:id/file', auth, requireDb, ctrl.getFile)
router.patch('/:id', auth, requireDb, ctrl.update)
router.patch('/:id/primary', auth, requireDb, ctrl.setPrimary)
router.delete('/:id', auth, requireDb, ctrl.remove)

module.exports = router
