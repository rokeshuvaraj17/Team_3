const { Router } = require('express')
const auth = require('../middleware/auth')
const requireDb = require('../middleware/requireDb')
const { uploadCoverLetter } = require('../middleware/upload')
const ctrl = require('../controllers/coverLetter.controller')

const router = Router()

router.get('/', auth, requireDb, ctrl.list)
router.post('/upload', auth, requireDb, uploadCoverLetter.single('file'), ctrl.upload)
router.get('/:id/text', auth, requireDb, ctrl.getText)
router.get('/:id/file', auth, requireDb, ctrl.getFile)
router.patch('/:id', auth, requireDb, ctrl.update)
router.delete('/:id', auth, requireDb, ctrl.remove)

module.exports = router
