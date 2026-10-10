const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const { ALLOWED_ORIGINS } = require('./config/env')
const { errorHandler } = require('./middleware/errorHandler')
const { createCorsOptions } = require('./utils/cors')

const healthRoutes = require('./routes/health.routes')
const authRoutes = require('./routes/auth.routes')
const oauthRoutes = require('./routes/oauth.routes')
const profileRoutes = require('./routes/profile.routes')
const autofillRoutes = require('./routes/autofill.routes')
const jobRoutes = require('./routes/job.routes')
const resumeRoutes = require('./routes/resume.routes')
const coverLetterRoutes = require('./routes/coverLetter.routes')
const aiRoutes = require('./routes/ai.routes')
const resumakeRoutes = require('./routes/resumake.routes')
const extensionRoutes = require('./routes/extension.routes')
const analyticsRoutes = require('./routes/analytics.routes')
const jobTrackerRoutes = require('./routes/jobTracker.routes')
const { keysRouter: apiKeysRoutes, providersRouter: apiKeyProvidersRoutes } = require('./routes/apiKey.routes')

const app = express()

app.use(cors(createCorsOptions({
  allowedOrigins: ALLOWED_ORIGINS,
  nodeEnv: process.env.NODE_ENV,
})))

app.use(express.json())

// Mount routes
app.use('/api/health', healthRoutes)
app.use('/api', authRoutes)
app.use('/api/oauth', oauthRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/autofill', autofillRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/resumes', resumeRoutes)
app.use('/api/cover-letters', coverLetterRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/resumake', resumakeRoutes)
app.use('/api/extension', extensionRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/job-tracker', jobTrackerRoutes)
app.use('/api/api-keys', apiKeysRoutes)
app.use('/api/api-key-providers', apiKeyProvidersRoutes)

const frontendDistCandidates = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../public/web'),
]
const frontendDist = frontendDistCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')))
if (frontendDist) {
  app.use(express.static(frontendDist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

// Global error handler
app.use(errorHandler)

module.exports = app
