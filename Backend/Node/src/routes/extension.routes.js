const { Router } = require('express')
const auth = require('../middleware/auth')
const ctrl = require('../controllers/extension.controller')

const router = Router()

router.post('/job-resume-context', auth, ctrl.postJobResumeContext)
router.get('/job-resume-context', auth, ctrl.getJobResumeContext)
router.get('/download', ctrl.download)
router.post('/cover-letter-context', auth, ctrl.postCoverLetterContext)
router.get('/cover-letter-context', auth, ctrl.getCoverLetterContext)

module.exports = router
