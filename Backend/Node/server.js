require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const multer = require('multer')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const cloudinary = require('cloudinary').v2

const cloudName = process.env.cloudinary_cloud_name || process.env.CLOUDINARY_CLOUD_NAME || ''
const cloudKey = process.env.cloudinary_api_key || process.env.CLOUDINARY_API_KEY || ''
const cloudSecret = process.env.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET || ''
if (cloudName && cloudKey && cloudSecret) {
  cloudinary.config({ cloud_name: cloudName, api_key: cloudKey, api_secret: cloudSecret })
}

const memoryStorage = multer.memoryStorage()
const uploadToCloudinary = (buffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const { resource_type = 'auto', ...rest } = options
    const opts = { folder, resource_type, ...rest }
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err)
      resolve(result?.secure_url)
    })
    stream.end(buffer)
  })
}

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

const app = express()
const PORT = process.env.PORT || 3000
const DATABASE_URL = process.env.DATABASE_URL
const PASSWORD_SALT = process.env.PASSWORD_SALT || ''
// Adzuna job API (https://developer.adzuna.com): ADZUNA_APP_ID + ADZUNA_APP_KEY, or free_job_api_key for both
const freeKey = process.env.FREE_JOB_API_KEY || process.env.free_job_api_key || ''
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || freeKey
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || freeKey
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || ''
const REED_API_KEY = process.env.REED_API_KEY || ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

/** Combine salt + password for hashing (same order must be used in signup and login) */
function saltedPassword(password) {
  return PASSWORD_SALT + password
}

/** Map database errors to HTTP status and safe user message. Logs details server-side only. */
function handleDbError(err, res, context) {
  const code = err.code || (err.errno && String(err.errno))
  const syscall = err.syscall
  const message = err.message || ''

  // Connection / network errors → 503 Service Unavailable
  if (code === 'ENOTFOUND' || code === 'ENOENT' || message.includes('getaddrinfo')) {
    console.error(`${context}: Database host not found (check DATABASE_URL and network)`, err.message)
    return res.status(503).json({ error: 'Database unavailable. Check connection settings and network.' })
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    console.error(`${context}: Database connection failed`, err.message)
    return res.status(503).json({ error: 'Database unavailable. Cannot reach the database server.' })
  }
  if (code === 'EADDRNOTAVAIL' || code === 'ENETUNREACH') {
    console.error(`${context}: Database network error`, err.message)
    return res.status(503).json({ error: 'Database unavailable. Network or SSL configuration issue.' })
  }
  // Auth / SSL
  if (code === '28P01' || message.includes('password')) {
    console.error(`${context}: Database authentication failed`, err.message)
    return res.status(503).json({ error: 'Database configuration error. Check credentials.' })
  }

  // Application-level DB errors (already handled in routes where needed)
  if (code === '23505') return res.status(409).json({ error: 'An account with this email already exists' })
  if (code === '23503') return res.status(400).json({ error: 'User not found' })

  // Unknown
  console.error(`${context}:`, err)
  return res.status(500).json({ error: 'Something went wrong. Please try again.' })
}

// Remote Postgres (Supabase, etc.) requires SSL; localhost typically does not
const isRemoteDb =
  DATABASE_URL &&
  !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(DATABASE_URL)
const poolConfig = DATABASE_URL
  ? {
      connectionString: DATABASE_URL,
      ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {}),
    }
  : null
const pool = poolConfig ? new Pool(poolConfig) : null

if (pool) {
  pool.on('error', (err) => {
    console.error('Database pool error:', err.message)
  })
}

// Allow Vite dev server and production frontend origins
const allowedOrigins = [
  'http://localhost:5173',  // Vite default
  'http://127.0.0.1:5173',
  'http://localhost:4173',  // Vite preview
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json())

// Health check (for proxy and monitoring)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend is running', timestamp: new Date().toISOString() })
})

// Database health check – returns 503 if DB is unreachable
app.get('/api/health/db', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ ok: false, error: 'Database not configured' })
  }
  try {
    await pool.query('select 1')
    res.json({ ok: true, message: 'Database connected' })
  } catch (err) {
    return handleDbError(err, res, 'Health check')
  }
})

// Sign up: create user in public.users (name, email, password_hash, email_verified)
app.post('/api/signup', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }
  if (!PASSWORD_SALT) {
    return res.status(503).json({ error: 'Server configuration error (PASSWORD_SALT not set)' })
  }
  const { name, email, password } = req.body || {}
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  const trimmedEmail = typeof email === 'string' ? email.trim() : ''

  if (!trimmedName || trimmedName.length < 2) {
    return res.status(400).json({ error: 'Name is required and must be at least 2 characters' })
  }
  if (!trimmedEmail) {
    return res.status(400).json({ error: 'Email is required' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const password_hash = await bcrypt.hash(saltedPassword(password), 10)
    const { rows } = await pool.query(
      `insert into public.users (name, email, password_hash)
       values ($1, $2, $3)
       returning id, name, email, email_verified, created_at`,
      [trimmedName, trimmedEmail, password_hash]
    )
    const user = rows[0]
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        created_at: user.created_at,
      },
    })
  } catch (err) {
    return handleDbError(err, res, 'Signup')
  }
})

// Login – validate credentials against public.users
app.post('/api/login', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not configured' })
  }
  if (!PASSWORD_SALT) {
    return res.status(503).json({ error: 'Server configuration error (PASSWORD_SALT not set)' })
  }
  const { email, password } = req.body || {}
  const trimmedEmail = typeof email === 'string' ? email.trim() : ''
  if (!trimmedEmail || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    const { rows } = await pool.query(
      'select id, name, email, password_hash, email_verified from public.users where email = $1',
      [trimmedEmail]
    )
    const user = rows[0]
    if (!user || !(await bcrypt.compare(saltedPassword(password), user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
      },
    })
  } catch (err) {
    return handleDbError(err, res, 'Login')
  }
})

// Get current user profile (x-user-id header)
app.get('/api/profile', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  try {
    const { rows } = await pool.query(
      'select id, user_id, display_name, headline, summary, location, location_country, state, profile_image_url, phone, website_url, linkedin_url, created_at, updated_at from public.user_profiles where user_id = $1',
      [userId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Profile not found' })
    res.json(rows[0])
  } catch (err) {
    return handleDbError(err, res, 'Profile get')
  }
})

// Create or update user profile (x-user-id header). Accepts partial updates.
app.put('/api/profile', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  const body = req.body || {}
  const display_name = typeof body.display_name === 'string' ? body.display_name.trim() : null
  if (display_name !== null && display_name.length < 2) return res.status(400).json({ error: 'Display name must be at least 2 characters' })
  const location_country = typeof body.location_country === 'string' ? body.location_country.trim() : null
  if (location_country && location_country.length !== 2) return res.status(400).json({ error: 'Country must be a 2-letter code' })
  const phoneRaw = body.phone != null && typeof body.phone === 'string' ? body.phone.trim() : null
  if (phoneRaw) {
    const digits = phoneRaw.replace(/\D/g, '')
    if (digits.length < 10) return res.status(400).json({ error: 'Phone number must be at least 10 digits' })
  }

  const getNull = (v) => (v != null && typeof v === 'string' ? v.trim() || null : null)

  try {
    const existing = await pool.query('select * from public.user_profiles where user_id = $1', [userId])
    const row = existing.rows[0]
    const merged = {
      display_name: display_name ?? row?.display_name ?? '',
      headline: getNull(body.headline) ?? row?.headline ?? null,
      summary: getNull(body.summary) ?? row?.summary ?? null,
      location: getNull(body.location) ?? row?.location ?? null,
      location_country: location_country ?? row?.location_country ?? null,
      state: getNull(body.state) ?? row?.state ?? null,
      profile_image_url: getNull(body.profile_image_url) ?? row?.profile_image_url ?? null,
      phone: getNull(body.phone) ?? row?.phone ?? null,
      website_url: getNull(body.website_url) ?? row?.website_url ?? null,
      linkedin_url: getNull(body.linkedin_url) ?? row?.linkedin_url ?? null,
    }
    if (!merged.display_name) return res.status(400).json({ error: 'Display name is required' })

    const { rows } = await pool.query(
      `insert into public.user_profiles (user_id, display_name, headline, summary, location, location_country, state, profile_image_url, phone, website_url, linkedin_url)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (user_id) do update set
         display_name = $2, headline = $3, summary = $4, location = $5, location_country = $6,
         state = $7, profile_image_url = $8, phone = $9, website_url = $10, linkedin_url = $11, updated_at = now()
       returning id, user_id, display_name, headline, summary, location, location_country, state, profile_image_url, phone, website_url, linkedin_url, created_at, updated_at`,
      [
        userId,
        merged.display_name,
        merged.headline,
        merged.summary,
        merged.location,
        merged.location_country,
        merged.state,
        merged.profile_image_url,
        merged.phone,
        merged.website_url,
        merged.linkedin_url,
      ]
    )
    res.json(rows[0])
  } catch (err) {
    return handleDbError(err, res, 'Profile put')
  }
})

// -----------------------------------------------------------------------------
// Jobs – Adzuna external API (proxy to keep keys server-side)
// -----------------------------------------------------------------------------
// GET /api/jobs/search?what=&where=&salary_min=&salary_max=&full_time=&permanent=&page=&results_per_page=&country=
app.get('/api/jobs/search', async (req, res) => {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return res.status(503).json({ error: 'Job search not configured (set FREE_JOB_API_KEY or ADZUNA_APP_ID/ADZUNA_APP_KEY in .env)' })
  }
  const country = (req.query.country || 'in').toString().toLowerCase().replace(/[^a-z]/g, '') || 'in'
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    'content-type': 'application/json',
    results_per_page: String(Math.min(50, Math.max(10, parseInt(req.query.results_per_page, 10) || 20))),
  })
  if (req.query.what) params.set('what', req.query.what.toString().trim())
  if (req.query.where) params.set('where', req.query.where.toString().trim())
  if (req.query.salary_min) params.set('salary_min', req.query.salary_min.toString())
  if (req.query.salary_max) params.set('salary_max', req.query.salary_max.toString())
  if (req.query.full_time === '1' || req.query.full_time === 'true') params.set('full_time', '1')
  if (req.query.permanent === '1' || req.query.permanent === 'true') params.set('permanent', '1')
  if (req.query.sort_by) params.set('sort_by', req.query.sort_by.toString())

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params}`
  try {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } })
    const text = await resp.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (parseErr) {
      console.error('Adzuna API returned non-JSON. First 200 chars:', text.slice(0, 200))
      return res.status(502).json({
        error: 'Job API returned invalid response. Check that the backend is running and Adzuna credentials are set.',
      })
    }
    if (!resp.ok) {
      const msg = data?.display || data?.error || data?.exception || 'Adzuna API error'
      if (resp.status === 401 || (data && (data.exception === 'AUTH_FAIL' || data.exception === 'Unauthorized'))) {
        console.error('Adzuna auth failed. Get separate app_id and app_key from https://developer.adzuna.com')
        return res.status(401).json({
          error: 'Job API credentials invalid. Get app_id and app_key from https://developer.adzuna.com (login → API dashboard).',
        })
      }
      return res.status(resp.status).json(data || { error: msg })
    }
    res.json(data)
  } catch (err) {
    console.error('Adzuna proxy error:', err.message)
    return res.status(502).json({ error: 'Could not fetch jobs. Check backend is running and try again.' })
  }
})

// Map country code (from frontend) to location substrings for filtering (Arbeitnow/Jooble return global lists)
const COUNTRY_LOCATION_MAP = {
  in: ['india'],
  gb: ['united kingdom', 'uk', 'england', 'scotland', 'wales'],
  us: ['united states', 'usa', ' u.s.', ' u.s.a.'],
  au: ['australia'],
  de: ['germany', 'deutschland'],
  br: ['brazil', 'brasil'],
}
function locationMatchesCountry(jobLocation, countryCode) {
  if (!countryCode) return true
  const loc = (jobLocation || '').trim()
  if (!loc) return false
  const terms = COUNTRY_LOCATION_MAP[countryCode.toLowerCase()]
  if (!terms) return true
  return terms.some((t) => loc.toLowerCase().includes(t))
}

// -----------------------------------------------------------------------------
// Jobs – Jooble external API (proxy to keep key server-side)
// POST https://jooble.org/api/{key} with body: { keywords, location, page?, radius?, companysearch? }
// -----------------------------------------------------------------------------
// GET /api/jobs/jooble/search?keywords=&location=&page=&country=
app.get('/api/jobs/jooble/search', async (req, res) => {
  if (!JOOBLE_API_KEY) {
    return res.status(503).json({ error: 'Jooble job search not configured (set JOOBLE_API_KEY in .env)' })
  }
  const keywords = (req.query.keywords || '').toString().trim()
  const location = (req.query.location || '').toString().trim()
  const country = (req.query.country || '').toString().trim().toLowerCase().replace(/[^a-z]/g, '') || null
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)

  const url = `https://jooble.org/api/${JOOBLE_API_KEY}`
  const body = JSON.stringify({
    keywords: keywords || 'jobs',
    location: location || ' ',
    page: String(page),
    companysearch: 'false',
  })

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    })
    const text = await resp.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (parseErr) {
      console.error('Jooble API returned non-JSON. First 200 chars:', text.slice(0, 200))
      return res.status(502).json({
        error: 'Job API returned invalid response. Check that the backend is running and Jooble key is set.',
      })
    }
    if (!resp.ok) {
      const msg = data?.message || data?.error || (resp.status === 403 ? 'Invalid Jooble API key' : 'Jooble API error')
      return res.status(resp.status === 403 ? 401 : resp.status).json(data || { error: msg })
    }
    let results = Array.isArray(data.jobs) ? data.jobs : []
    if (country) {
      results = results.filter((job) => locationMatchesCountry(job.location, country))
    }
    const totalCount = typeof data.totalCount === 'number' ? data.totalCount : results.length
    res.json({ count: totalCount, results })
  } catch (err) {
    console.error('Jooble proxy error:', err.message)
    return res.status(502).json({ error: 'Could not fetch jobs. Check backend is running and try again.' })
  }
})

// -----------------------------------------------------------------------------
// Jobs – Arbeitnow (no API key, full descriptions in response)
// GET https://www.arbeitnow.com/api/job-board-api
// -----------------------------------------------------------------------------
// GET /api/jobs/arbeitnow/search?keywords=&location=&country=
app.get('/api/jobs/arbeitnow/search', async (req, res) => {
  const keywords = (req.query.keywords || '').toString().trim().toLowerCase()
  const location = (req.query.location || '').toString().trim().toLowerCase()
  const country = (req.query.country || '').toString().trim().toLowerCase().replace(/[^a-z]/g, '') || null
  const url = 'https://www.arbeitnow.com/api/job-board-api'
  try {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } })
    const text = await resp.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (parseErr) {
      console.error('Arbeitnow API returned non-JSON. First 200 chars:', text.slice(0, 200))
      return res.status(502).json({
        error: 'Job API returned invalid response. Check that the backend is running.',
      })
    }
    if (!resp.ok) {
      return res.status(resp.status).json(data || { error: 'Arbeitnow API error' })
    }
    let results = Array.isArray(data?.data) ? data.data : []
    if (keywords || location) {
      results = results.filter((job) => {
        const title = (job.title || '').toLowerCase()
        const desc = (job.description || '').toLowerCase()
        const company = (job.company_name || '').toLowerCase()
        const loc = (job.location || '').toLowerCase()
        const matchKw = !keywords || title.includes(keywords) || desc.includes(keywords) || company.includes(keywords)
        const matchLoc = !location || loc.includes(location)
        return matchKw && matchLoc
      })
    }
    if (country) {
      results = results.filter((job) => locationMatchesCountry(job.location, country))
    }
    res.json({ count: results.length, results })
  } catch (err) {
    console.error('Arbeitnow proxy error:', err.message)
    return res.status(502).json({ error: 'Could not fetch jobs. Check backend is running and try again.' })
  }
})

// -----------------------------------------------------------------------------
// Jobs – Reed.co.uk (UK portal, Basic auth: API key as username)
// GET https://www.reed.co.uk/api/1.0/search?keywords=&locationName=&resultsToTake=&resultsToSkip=
// -----------------------------------------------------------------------------
// GET /api/jobs/reed/search?keywords=&locationName=&resultsToTake=&resultsToSkip=
app.get('/api/jobs/reed/search', async (req, res) => {
  if (!REED_API_KEY) {
    return res.status(503).json({ error: 'Reed job search not configured (set REED_API_KEY in .env)' })
  }
  const keywords = (req.query.keywords || '').toString().trim()
  const locationName = (req.query.locationName || req.query.location || '').toString().trim()
  const resultsToTake = Math.min(100, Math.max(1, parseInt(req.query.resultsToTake, 10) || 20))
  const resultsToSkip = Math.max(0, parseInt(req.query.resultsToSkip, 10) || 0)
  const params = new URLSearchParams()
  if (keywords) params.set('keywords', keywords)
  if (locationName) params.set('locationName', locationName)
  params.set('resultsToTake', String(resultsToTake))
  params.set('resultsToSkip', String(resultsToSkip))
  const url = `https://www.reed.co.uk/api/1.0/search?${params}`
  const auth = Buffer.from(`${REED_API_KEY}:`, 'utf8').toString('base64')
  try {
    const resp = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
    })
    const text = await resp.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (parseErr) {
      console.error('Reed API returned non-JSON. First 200 chars:', text.slice(0, 200))
      return res.status(502).json({
        error: 'Job API returned invalid response. Check that the backend is running and Reed key is set.',
      })
    }
    if (!resp.ok) {
      const msg = data?.message || data?.error || (resp.status === 401 ? 'Invalid Reed API key' : 'Reed API error')
      return res.status(resp.status === 401 ? 401 : resp.status).json(data || { error: msg })
    }
    const results = Array.isArray(data?.results) ? data.results : []
    const total = typeof data.totalResults === 'number' ? data.totalResults : results.length
    res.json({ count: total, results })
  } catch (err) {
    console.error('Reed proxy error:', err.message)
    return res.status(502).json({ error: 'Could not fetch jobs. Check backend is running and try again.' })
  }
})

// -----------------------------------------------------------------------------
// AI – Gemini (skill suggestions, resume generation)
// -----------------------------------------------------------------------------
let skillSuggestionsQuotaLogged = false
async function geminiGenerate(prompt, systemInstruction = null) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured')
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
  }
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] }
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const url = GEMINI_URL(model) + '?key=' + encodeURIComponent(GEMINI_API_KEY)
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  if (!resp.ok) {
    const msg = data?.error?.message || 'Gemini API error'
    const isQuota = resp.status === 429 ||
      data?.error?.status === 'RESOURCE_EXHAUSTED' ||
      /quota|exceeded|rate.limit|retry in/i.test(msg)
    const err = new Error(msg)
    err.isGeminiQuota = !!isQuota
    throw err
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')
  return text
}

// POST /api/ai/skill-suggestions – body: { query: string }
app.post('/api/ai/skill-suggestions', express.json(), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : ''
  if (!query || query.length < 2) return res.json({ suggestions: [] })
  try {
    const prompt = `Suggest up to 10 industry-standard professional skills (job market / resume standard names) that match or relate to: "${query}". If the query is already a standard skill name, include it and add related ones. Return ONLY a JSON array of strings, no other text. Example: ["JavaScript", "React", "Node.js"]`
    const text = await geminiGenerate(prompt)
    const cleaned = text.replace(/```json?\s*|\s*```/g, '').trim()
    const arr = JSON.parse(cleaned)
    const suggestions = Array.isArray(arr) ? arr.filter((s) => typeof s === 'string').slice(0, 10) : []
    res.json({ suggestions })
  } catch (err) {
    if (err.isGeminiQuota) {
      if (!skillSuggestionsQuotaLogged) {
        skillSuggestionsQuotaLogged = true
        console.warn('Gemini quota exceeded: skill suggestions disabled until quota resets. See https://ai.google.dev/gemini-api/docs/rate-limits')
      }
      return res.json({ suggestions: [], message: 'AI suggestions are temporarily unavailable. Try again later or check your Gemini API quota.' })
    }
    console.error('Skill suggestions:', err.message)
    res.status(502).json({ error: err.message || 'Could not get suggestions' })
  }
})

// POST /api/ai/generate-resume – body: { personal, summary, education, experience, skills, languages, certifications }
app.post('/api/ai/generate-resume', express.json(), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const body = req.body || {}
  try {
    const systemInstruction = 'You are a professional US resume writer. Output a single, clean HTML document for a US-style resume. Use only simple HTML: h1, h2, h3, p, ul, li, strong, br. No CSS in style tags. Use clear section headings: Summary, Education, Experience, Skills, Languages, Certifications. Format dates in US style (e.g. January 2020). Keep it concise and professional.'
    const prompt = `Generate a US-format resume as HTML from this data. Use industry-standard section titles and formatting.\n\nPersonal: ${JSON.stringify(body.personal || {})}\n\nProfessional summary: ${body.summary || ''}\n\nEducation: ${JSON.stringify(body.education || [])}\n\nExperience: ${JSON.stringify(body.experience || [])}\n\nSkills: ${body.skills || ''}\n\nLanguages: ${body.languages || ''}\n\nCertifications: ${body.certifications || ''}\n\nOutput only the HTML document body content (no <html> or <body> tags), ready to display.`
    const content = await geminiGenerate(prompt, systemInstruction)
    res.json({ content })
  } catch (err) {
    if (err.isGeminiQuota) {
      console.warn('Gemini quota exceeded: resume generation unavailable.')
      return res.status(503).json({ error: 'AI is temporarily unavailable due to rate limits. Please try again later or check your Gemini API quota at https://ai.google.dev/gemini-api/docs/rate-limits' })
    }
    console.error('Generate resume:', err.message)
    res.status(502).json({ error: err.message || 'Could not generate resume' })
  }
})

// Free fallback: MyMemory API (no key). Max 500 bytes per request; we chunk and use de|en for German job posts.
async function translateWithMyMemory(text, langPair = 'de|en') {
  const maxChunkLen = 200
  const chunks = []
  for (let i = 0; i < text.length; i += maxChunkLen) {
    let end = i + maxChunkLen
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end)
      if (lastSpace > i) end = lastSpace + 1
    }
    chunks.push(text.slice(i, end))
  }
  const out = []
  for (const chunk of chunks) {
    if (!chunk.trim()) {
      out.push(chunk)
      continue
    }
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${langPair}`
      const resp = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = await resp.json().catch(() => null)
      const translated = data?.responseData?.translatedText
      out.push(typeof translated === 'string' && translated.trim() ? translated.trim() : chunk)
    } catch {
      out.push(chunk)
    }
  }
  return out.join('')
}

// POST /api/ai/translate – body: { text: string }. Detects language, translates to English if not already.
app.post('/api/ai/translate', express.json(), async (req, res) => {
  const raw = typeof req.body?.text === 'string' ? req.body.text : ''
  const text = raw.trim().slice(0, 8000)
  if (!text) {
    return res.status(400).json({ error: 'Missing or empty text', fallback: '' })
  }
  const systemInstruction = 'You are a translator. Detect the language of the user\'s text. If it is not English, translate the entire text to English. If it is already English, return it unchanged. Preserve HTML tags and structure; only translate the text content. Return ONLY the translated or original text, no explanation, no "Translation:" prefix, no language label.'
  try {
    let translated = await geminiGenerate(text, systemInstruction)
    translated = (translated && translated.trim()) || text
    return res.json({ translated })
  } catch (err) {
    try {
      const fallbackTranslated = await translateWithMyMemory(text, 'de|en')
      if (fallbackTranslated && fallbackTranslated !== text) {
        return res.json({ translated: fallbackTranslated })
      }
    } catch (fallbackErr) {
      console.error('Translate fallback (MyMemory):', fallbackErr.message)
    }
    if (err.isGeminiQuota) {
      return res.status(503).json({ error: 'Translation unavailable (quota exceeded).', fallback: text })
    }
    console.error('Translate:', err.message)
    return res.status(502).json({ error: err.message || 'Translation failed', fallback: text })
  }
})

// -----------------------------------------------------------------------------
// Jobs (list, get one, apply) – internal DB
// -----------------------------------------------------------------------------

// List jobs (optional search q, limit). Returns job + company name.
app.get('/api/jobs', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100)

  try {
    const query = q
      ? `select j.id, j.title, j.job_type, j.employment_type, j.location, j.is_remote, j.posted_at,
                j.company_id, c.name as company_name, c.logo_url as company_logo_url
         from public.jobs j
         join public.companies c on c.id = j.company_id
         where j.status = 'ACTIVE'
           and (j.title ilike $1 or c.name ilike $1)
         order by j.posted_at desc
         limit $2`
      : `select j.id, j.title, j.job_type, j.employment_type, j.location, j.is_remote, j.posted_at,
                j.company_id, c.name as company_name, c.logo_url as company_logo_url
         from public.jobs j
         join public.companies c on c.id = j.company_id
         where j.status = 'ACTIVE'
         order by j.posted_at desc
         limit $1`
    const params = q ? [`%${q}%`, limit] : [limit]
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (err) {
    return handleDbError(err, res, 'Jobs list')
  }
})

// Get single job with full description and company
app.get('/api/jobs/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const { id } = req.params

  try {
    const { rows } = await pool.query(
      `select j.id, j.company_id, j.title, j.description, j.job_type, j.employment_type,
              j.location, j.location_country, j.is_remote, j.salary_min, j.salary_max, j.salary_currency, j.salary_visible,
              j.metadata, j.posted_at, j.expires_at,
              c.name as company_name, c.logo_url as company_logo_url, c.industry, c.location as company_location
       from public.jobs j
       join public.companies c on c.id = j.company_id
       where j.id = $1 and j.status = 'ACTIVE'`,
      [id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Job not found' })
    res.json(rows[0])
  } catch (err) {
    return handleDbError(err, res, 'Job get')
  }
})

// List current user's resumes (for apply)
app.get('/api/resumes', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  try {
    const { rows } = await pool.query(
      'select id, name, file_url, is_primary, uploaded_at from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc',
      [userId]
    )
    res.json(rows)
  } catch (err) {
    return handleDbError(err, res, 'Resumes list')
  }
})

// Upload profile photo to Cloudinary (folder: profile-photos), update user_profiles.
app.post('/api/profile/photo', uploadPhoto.single('photo'), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded. Use PNG, JPEG, GIF, or WebP.' })
  if (!cloudName || !cloudKey || !cloudSecret) {
    return res.status(503).json({ error: 'Cloudinary not configured. Set cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret in .env' })
  }
  try {
    const url = await uploadToCloudinary(req.file.buffer, 'profile-photos', { public_id: `user-${userId}-${Date.now()}` })
    if (!pool) return res.status(503).json({ error: 'Database not configured' })
    const { rowCount, rows } = await pool.query(
      `update public.user_profiles set profile_image_url = $1, updated_at = now() where user_id = $2 returning profile_image_url`,
      [url, userId]
    )
    if (rowCount === 0) return res.status(404).json({ error: 'Profile not found. Save your profile (name, etc.) first.' })
    res.status(200).json({ profile_image_url: rows[0].profile_image_url })
  } catch (err) {
    console.error('Profile photo upload:', err)
    res.status(502).json({ error: err.message || 'Photo upload failed.' })
  }
}, (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Photo too large. Max 5 MB.' })
  res.status(400).json({ error: err.message || 'Invalid photo.' })
})

// Upload resume file to Cloudinary (folder: resumes). Returns file_url and name for POST /api/resumes.
app.post('/api/resumes/upload', uploadResume.single('file'), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  if (!req.file) return res.status(400).json({ error: 'No file uploaded. Upload a PDF or DOC/DOCX file.' })
  if (!cloudName || !cloudKey || !cloudSecret) {
    return res.status(503).json({ error: 'Cloudinary not configured. Set cloudinary_* in .env' })
  }
  try {
    const url = await uploadToCloudinary(req.file.buffer, 'resumes', {
      resource_type: 'raw',
      public_id: `user-${userId}-${Date.now()}-${(req.file.originalname || 'resume').replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 40)}`
    })
    res.status(201).json({ file_url: url, name: req.file.originalname || 'Resume' })
  } catch (err) {
    console.error('Resume upload:', err)
    res.status(502).json({ error: err.message || 'Resume upload failed.' })
  }
}, (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 10 MB.' })
  res.status(400).json({ error: err.message || 'Resume upload failed.' })
})

// Add resume (name + file_url; optional is_primary).
app.post('/api/resumes', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const fileUrl = typeof req.body?.file_url === 'string' ? req.body.file_url.trim() : ''
  const isPrimary = req.body?.is_primary === true || req.body?.is_primary === 'true'

  if (!name || name.length < 1) return res.status(400).json({ error: 'Resume name is required' })
  if (!fileUrl || fileUrl.length < 5) return res.status(400).json({ error: 'Resume file URL or data is required' })

  try {
    if (isPrimary) {
      await pool.query('update public.resumes set is_primary = false where user_id = $1', [userId])
    }
    const { rows } = await pool.query(
      `insert into public.resumes (user_id, name, file_url, is_primary)
       values ($1, $2, $3, $4)
       returning id, name, file_url, is_primary, uploaded_at`,
      [userId, name, fileUrl, isPrimary]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    return handleDbError(err, res, 'Resume add')
  }
})

// Delete resume
app.delete('/api/resumes/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  try {
    const { rowCount } = await pool.query('delete from public.resumes where id = $1 and user_id = $2', [id, userId])
    if (rowCount === 0) return res.status(404).json({ error: 'Resume not found' })
    res.status(204).send()
  } catch (err) {
    return handleDbError(err, res, 'Resume delete')
  }
})

// Set primary resume
app.patch('/api/resumes/:id/primary', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  try {
    const own = await pool.query('select id from public.resumes where id = $1 and user_id = $2', [id, userId])
    if (!own.rows[0]) return res.status(404).json({ error: 'Resume not found' })
    await pool.query('update public.resumes set is_primary = false where user_id = $1', [userId])
    await pool.query('update public.resumes set is_primary = true where id = $1 and user_id = $2', [id, userId])
    res.json({ success: true })
  } catch (err) {
    return handleDbError(err, res, 'Resume set primary')
  }
})

// -----------------------------------------------------------------------------
// Cover letters (multiple per user; optional job_id; files in Cloudinary cover-letters folder)
// -----------------------------------------------------------------------------
app.get('/api/cover-letters', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  try {
    const { rows } = await pool.query(
      'select id, user_id, job_id, title, file_url, created_at from public.cover_letters where user_id = $1 order by created_at desc',
      [userId]
    )
    res.json(rows)
  } catch (err) {
    if (err.code === '42P01') return res.json([])
    return handleDbError(err, res, 'Cover letters list')
  }
})

app.post('/api/cover-letters/upload', uploadCoverLetter.single('file'), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  if (!req.file) return res.status(400).json({ error: 'No file uploaded. Upload a PDF, DOC, or TXT file.' })
  if (!cloudName || !cloudKey || !cloudSecret) return res.status(503).json({ error: 'Cloudinary not configured' })
  const title = (req.body?.title && typeof req.body.title === 'string') ? req.body.title.trim() : (req.file.originalname || 'Cover letter')
  try {
    const url = await uploadToCloudinary(req.file.buffer, 'cover-letters', {
      resource_type: 'raw',
      public_id: `user-${userId}-${Date.now()}-${(req.file.originalname || 'cover').replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 40)}`
    })
    if (!pool) return res.status(503).json({ error: 'Database not configured' })
    const { rows } = await pool.query(
      `insert into public.cover_letters (user_id, title, file_url) values ($1, $2, $3) returning id, user_id, job_id, title, file_url, created_at`,
      [userId, title, url]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Run migration create_cover_letters.sql first.' })
    console.error('Cover letter upload:', err)
    res.status(502).json({ error: err.message || 'Upload failed.' })
  }
}, (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 5 MB.' })
  res.status(400).json({ error: err.message || 'Invalid file.' })
})

app.delete('/api/cover-letters/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  try {
    const { rowCount } = await pool.query('delete from public.cover_letters where id = $1 and user_id = $2', [id, userId])
    if (rowCount === 0) return res.status(404).json({ error: 'Cover letter not found' })
    res.status(204).send()
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Cover letters table not found. Run migration.' })
    return handleDbError(err, res, 'Cover letter delete')
  }
})

// Apply to job (resume_id optional; use primary or first if omitted)
app.post('/api/jobs/:id/apply', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id: jobId } = req.params
  const { resume_id: resumeId, cover_letter_text: coverLetterText } = req.body || {}

  try {
    const jobCheck = await pool.query('select id from public.jobs where id = $1 and status = $2', [jobId, 'ACTIVE'])
    if (!jobCheck.rows[0]) return res.status(404).json({ error: 'Job not found' })

    let resumeIdToUse = resumeId
    if (!resumeIdToUse) {
      const primary = await pool.query(
        'select id from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc limit 1',
        [userId]
      )
      if (!primary.rows[0]) return res.status(400).json({ error: 'Upload a resume in your profile before applying' })
      resumeIdToUse = primary.rows[0].id
    } else {
      const own = await pool.query('select id from public.resumes where id = $1 and user_id = $2', [resumeIdToUse, userId])
      if (!own.rows[0]) return res.status(400).json({ error: 'Resume not found' })
    }

    await pool.query(
      `insert into public.job_applications (user_id, job_id, resume_id, cover_letter_text, application_status, applied_at)
       values ($1, $2, $3, $4, 'SUBMITTED', now())
       on conflict (user_id, job_id) do update set resume_id = $3, cover_letter_text = $4, application_status = 'SUBMITTED', applied_at = now(), updated_at = now()`,
      [userId, jobId, resumeIdToUse, typeof coverLetterText === 'string' ? coverLetterText.trim() || null : null]
    )
    res.status(201).json({ success: true, message: 'Application submitted' })
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Invalid job or resume' })
    return handleDbError(err, res, 'Job apply')
  }
})

// Check if current user already applied to a job
app.get('/api/jobs/:id/applied', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id: jobId } = req.params

  try {
    const { rows } = await pool.query(
      'select 1 from public.job_applications where user_id = $1 and job_id = $2',
      [userId, jobId]
    )
    res.json({ applied: !!rows[0] })
  } catch (err) {
    return handleDbError(err, res, 'Job applied check')
  }
})

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})
