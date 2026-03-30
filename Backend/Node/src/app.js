const express = require('express')
const cors = require('cors')
const { ALLOWED_ORIGINS } = require('./config/env')
const { errorHandler } = require('./middleware/errorHandler')

const healthRoutes = require('./routes/health.routes')
const authRoutes = require('./routes/auth.routes')
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

// CORS
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:4173',
]
const envOrigins = (ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const allowedOrigins = [...defaultOrigins, ...envOrigins]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    if (origin.startsWith('chrome-extension://')) return cb(null, true)
    if (origin.startsWith('https://') || origin === 'http://localhost' || origin.startsWith('http://127.0.0.1')) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}))

app.use(express.json())

// Mount routes
app.use('/api/health', healthRoutes)
app.use('/api', authRoutes)
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

// Global error handler
app.use(errorHandler)

module.exports = app
