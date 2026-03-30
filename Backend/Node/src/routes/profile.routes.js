const { Router } = require('express')
const auth = require('../middleware/auth')
const requireDb = require('../middleware/requireDb')
const { uploadPhoto } = require('../middleware/upload')
const ctrl = require('../controllers/profile.controller')

const router = Router()

router.get('/', auth, requireDb, ctrl.get)
router.put('/', auth, requireDb, ctrl.update)
router.post('/photo', auth, requireDb, uploadPhoto.single('photo'), ctrl.uploadPhoto)

module.exports = router
