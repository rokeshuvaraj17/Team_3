const multer = require('multer')

const memoryStorage = multer.memoryStorage()

const imageFilter = (_req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
  if (allowed.includes(file.mimetype)) return cb(null, true)
  cb(new Error('Only PNG, JPEG, GIF, WebP images are allowed.'))
}

const resumeFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (allowed.includes(file.mimetype)) return cb(null, true)
  cb(new Error('Only PDF and DOC/DOCX files are allowed for resumes.'))
}

const docFilter = (_req, file, cb) => {
  const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  if (allowed.includes(file.mimetype)) return cb(null, true)
  cb(new Error('Only PDF, DOC, DOCX, or TXT files are allowed for cover letters.'))
}

const uploadPhoto = multer({ storage: memoryStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter })
const uploadResume = multer({ storage: memoryStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: resumeFilter })
const uploadCoverLetter = multer({ storage: memoryStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: docFilter })

module.exports = { uploadPhoto, uploadResume, uploadCoverLetter }
