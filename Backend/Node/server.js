require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const cloudinary = require('cloudinary').v2
const resumake = require('./resumake')
const { compilePdfWithFallback: resumakeCompilePdf } = require('./resumake/compilePdf')

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

// Allow Vite dev server and production frontend origins (set ALLOWED_ORIGINS or FRONTEND_URL on Render)
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
]
const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const allowedOrigins = [...defaultOrigins, ...envOrigins]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    // Chrome extension: allow any chrome-extension:// origin
    if (origin.startsWith('chrome-extension://')) return cb(null, true)
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
// Autofill form fields (job application forms) – merge profile + custom data
// -----------------------------------------------------------------------------
const AUTOFILL_FIELD_KEYS = [
  'first_name', 'middle_name', 'last_name', 'suffix', 'full_name', 'preferred_name', 'pronouns',
  'email', 'phone', 'phone_alt', 'email_alt',
  'date_of_birth', 'age', 'place_of_birth', 'citizenship_country', 'nationality',
  'linkedin_url', 'website_url', 'portfolio_url', 'github_url', 'twitter_url',
  'address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country',
  'headline', 'summary', 'current_job_title', 'current_company', 'years_of_experience', 'job_type_preference',
  'work_authorization', 'requires_sponsorship', 'veteran_status', 'disability_status', 'race_ethnicity', 'gender',
  'salary_expectation_min', 'salary_expectation_max', 'salary_type', 'salary_currency',
  'highest_degree', 'university_name', 'graduation_year', 'major_field', 'gpa', 'second_degree', 'second_major',
  'how_did_you_hear', 'referral_employee_name', 'desired_start_date', 'willing_to_relocate', 'willing_to_travel', 'notice_period',
  'cover_letter_note', 'emergency_contact_name', 'emergency_contact_phone', 'driver_license_number', 'security_clearance', 'ssn_last4',
]

function mergeAutofillWithProfile(profileRow, userRow, autofillData) {
  const data = {}
  const fromProfile = []
  const displayName = profileRow?.display_name || ''
  const nameParts = displayName.trim().split(/\s+/)
  const first = nameParts[0] || ''
  const last = nameParts.slice(1).join(' ') || ''

  const profileMap = {
    full_name: profileRow?.display_name,
    first_name: first || autofillData?.first_name,
    last_name: last || autofillData?.last_name,
    email: userRow?.email,
    phone: profileRow?.phone,
    headline: profileRow?.headline,
    summary: profileRow?.summary,
    city: profileRow?.location,
    state: profileRow?.state,
    country: profileRow?.location_country,
    website_url: profileRow?.website_url,
    linkedin_url: profileRow?.linkedin_url,
    current_job_title: profileRow?.headline,
  }
  for (const key of AUTOFILL_FIELD_KEYS) {
    const fromP = profileMap[key]
    const fromA = autofillData && (autofillData[key] != null && autofillData[key] !== '') ? autofillData[key] : null
    if (fromP != null && fromP !== '') {
      data[key] = fromA != null ? fromA : fromP
      if (fromA == null) fromProfile.push(key)
    } else {
      data[key] = fromA != null ? fromA : ''
    }
  }
  return { data, from_profile: fromProfile }
}

app.get('/api/autofill', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  try {
    const [userRows, profileRows, autofillRows] = await Promise.all([
      pool.query('select email from public.users where id = $1', [userId]),
      pool.query('select display_name, headline, summary, location, location_country, state, phone, website_url, linkedin_url from public.user_profiles where user_id = $1', [userId]),
      pool.query('select data, excluded_field_keys from public.user_autofill where user_id = $1', [userId]),
    ])
    let customRows = { rows: [] }
    try {
      customRows = await pool.query('select id, field_key, field_value from public.user_autofill_custom_fields where user_id = $1 order by display_order asc, created_at asc', [userId])
    } catch (_) {}
    const userRow = userRows.rows[0] || null
    const profileRow = profileRows.rows[0] || null
    const autofillRow = autofillRows.rows[0] || null
    const autofillData = (autofillRow && autofillRow.data) || {}
    const excluded = (autofillRow && Array.isArray(autofillRow.excluded_field_keys)) ? autofillRow.excluded_field_keys : (autofillRow && autofillRow.excluded_field_keys && typeof autofillRow.excluded_field_keys === 'object' && !Array.isArray(autofillRow.excluded_field_keys) ? [] : [])
    const customPairs = (customRows.rows || []).map((r) => ({ id: r.id, field_key: r.field_key || '', field_value: r.field_value || '' }))

    const { data, from_profile } = mergeAutofillWithProfile(profileRow, userRow, autofillData)
    res.json({ data, excluded_field_keys: excluded, from_profile: from_profile, custom_pairs: customPairs })
  } catch (err) {
    return handleDbError(err, res, 'Autofill get')
  }
})

app.put('/api/autofill', express.json(), async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  const body = req.body || {}
  let data = body.data
  let excluded = body.excluded_field_keys
  let customPairs = body.custom_pairs
  if (data != null && typeof data !== 'object') data = {}
  if (!Array.isArray(excluded)) excluded = []
  if (!Array.isArray(customPairs)) customPairs = []
  data = data || {}
  const allowedKeys = new Set(AUTOFILL_FIELD_KEYS)
  const cleaned = {}
  for (const [k, v] of Object.entries(data)) {
    if (allowedKeys.has(k)) cleaned[k] = v == null ? '' : String(v).trim()
  }
  const excludedCleaned = excluded.filter((k) => typeof k === 'string' && allowedKeys.has(k))
  const customCleaned = customPairs
    .slice(0, 100)
    .map((p, i) => ({
      field_key: typeof p.field_key === 'string' ? p.field_key.trim().slice(0, 200) : '',
      field_value: typeof p.field_value === 'string' ? String(p.field_value).slice(0, 2000) : '',
    }))
    .filter((p) => p.field_key.length > 0)

  try {
    await pool.query(
      `insert into public.user_autofill (user_id, data, excluded_field_keys, updated_at)
       values ($1, $2::jsonb, $3::jsonb, now())
       on conflict (user_id) do update set data = $2::jsonb, excluded_field_keys = $3::jsonb, updated_at = now()`,
      [userId, JSON.stringify(cleaned), JSON.stringify(excludedCleaned)]
    )
    try {
      await pool.query('delete from public.user_autofill_custom_fields where user_id = $1', [userId])
      for (let i = 0; i < customCleaned.length; i++) {
        const p = customCleaned[i]
        await pool.query(
          `insert into public.user_autofill_custom_fields (user_id, field_key, field_value, display_order, updated_at)
           values ($1, $2, $3, $4, now())`,
          [userId, p.field_key, p.field_value, i]
        )
      }
    } catch (_) {}
    let customPairsOut = customCleaned.map((p, i) => ({ id: '', field_key: p.field_key, field_value: p.field_value }))
    try {
      const customRes = await pool.query('select id, field_key, field_value from public.user_autofill_custom_fields where user_id = $1 order by display_order asc, created_at asc', [userId])
      customPairsOut = (customRes.rows || []).map((r) => ({ id: r.id, field_key: r.field_key || '', field_value: r.field_value || '' }))
    } catch (_) {}
    const [profileRes, userRes] = await Promise.all([
      pool.query('select display_name, headline, summary, location, location_country, state, phone, website_url, linkedin_url from public.user_profiles where user_id = $1', [userId]),
      pool.query('select email from public.users where id = $1', [userId]),
    ])
    const { data: mergedData, from_profile } = mergeAutofillWithProfile(
      profileRes.rows[0] || null,
      userRes.rows[0] || null,
      cleaned
    )
    res.json({ data: mergedData, excluded_field_keys: excludedCleaned, from_profile, custom_pairs: customPairsOut })
  } catch (err) {
    return handleDbError(err, res, 'Autofill put')
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
  const country = (req.query.country || 'us').toString().toLowerCase().replace(/[^a-z]/g, '') || 'us'
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
// Country code -> location string for Jooble API (so we request country-specific results when user picks a country but no city)
const COUNTRY_TO_JOOBLE_LOCATION = {
  in: 'India',
  gb: 'United Kingdom',
  us: 'United States',
  au: 'Australia',
  de: 'Germany',
  br: 'Brazil',
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

  // When user selected a country but no city, ask Jooble for that country so we get relevant results (avoids empty list + wrong count)
  const joobleLocation = location || (country && COUNTRY_TO_JOOBLE_LOCATION[country]) || ' '

  const url = `https://jooble.org/api/${JOOBLE_API_KEY}`
  const body = JSON.stringify({
    keywords: keywords || 'jobs',
    location: joobleLocation,
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
    // Only filter by country when we did not already pass country as Jooble location (e.g. user typed a city)
    const alreadySearchedByCountry = !location && country && COUNTRY_TO_JOOBLE_LOCATION[country]
    if (country && !alreadySearchedByCountry) {
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
// AI – Resume generation using user's stored API key (Gemini or OpenAI-compatible)
// -----------------------------------------------------------------------------
const OPENAI_COMPATIBLE_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  openrouter: 'openai/gpt-4o-mini',
  groq: 'llama-3.1-70b-versatile',
  together: 'meta-llama/Llama-3-70b-chat-hf',
  mistral: 'mistral-small-latest',
  cohere: 'command',
}

async function generateWithUserKey(prompt, systemInstruction, providerSlug, apiKey, optionalModel) {
  if (!apiKey || !providerSlug) throw new Error('Provider and API key required')
  const trimmedKey = String(apiKey).trim()
  if (!trimmedKey) throw new Error('API key required')

  if (providerSlug === 'gemini') {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    }
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] }
    const model = optionalModel || process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    const url = GEMINI_URL(model) + '?key=' + encodeURIComponent(trimmedKey)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error?.message || 'Gemini API error')
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('No response from Gemini')
    return text
  }

  if (providerSlug === 'anthropic') {
    const url = 'https://api.anthropic.com/v1/messages'
    const body = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 8192,
      system: systemInstruction || '',
      messages: [{ role: 'user', content: prompt }],
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': trimmedKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error?.message || 'Anthropic API error')
    const text = data?.content?.[0]?.text
    if (!text) throw new Error('No response from Anthropic')
    return text
  }

  const baseUrls = {
    openai: 'https://api.openai.com/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    groq: 'https://api.groq.com/openai/v1',
    together: 'https://api.together.xyz/v1',
    mistral: 'https://api.mistral.ai/v1',
    cohere: 'https://api.cohere.ai/v1',
  }
  const baseUrl = baseUrls[providerSlug] || baseUrls.openai
  const model = optionalModel || OPENAI_COMPATIBLE_MODELS[providerSlug] || OPENAI_COMPATIBLE_MODELS.openai
  const url = baseUrl + '/chat/completions'
  const messages = []
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction })
  messages.push({ role: 'user', content: prompt })
  const body = { model, messages, temperature: 0.4, max_tokens: 8192 }
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + trimmedKey }
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data?.error?.message || data?.message || 'API error')
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('No response from API')
  return text
}

// Extension: store resume + job description so web app job-based page can pick them up
const extensionJobResumeContext = new Map()

app.post('/api/extension/job-resume-context', express.json(), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const resume = typeof req.body?.resume === 'string' ? req.body.resume.trim() : ''
  const job_description = typeof req.body?.job_description === 'string' ? req.body.job_description.trim() : ''
  const company_name = typeof req.body?.company_name === 'string' ? req.body.company_name.trim() : ''
  const job_title = typeof req.body?.job_title === 'string' ? req.body.job_title.trim() : ''
  if (!resume || !job_description) return res.status(400).json({ error: 'resume and job_description required' })
  extensionJobResumeContext.set(userId, { resume, job_description, company_name, job_title })
  res.json({ ok: true })
})

app.get('/api/extension/job-resume-context', async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const data = extensionJobResumeContext.get(userId)
  extensionJobResumeContext.delete(userId)
  return res.json(data || { resume: '', job_description: '' })
})

// Extension: download zip of manifest (stream binary so proxy doesn't corrupt it)
app.get('/api/extension/download', (req, res) => {
  const candidates = [
    path.join(__dirname, '../../Web_frontend/public/team3-extension.zip'),
    path.join(process.cwd(), 'Web_frontend/public/team3-extension.zip'),
    path.join(process.cwd(), 'public/team3-extension.zip'),
  ]
  const zipPath = candidates.find((p) => fs.existsSync(p))
  if (!zipPath) {
    return res.status(404).json({
      error: 'Extension zip not built. From project root run: cd Web_frontend && npm run extension:zip',
    })
  }
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', 'attachment; filename="team3-extension.zip"')
  const stream = fs.createReadStream(zipPath)
  stream.on('error', (err) => {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to read extension zip' })
  })
  stream.pipe(res)
})

// Extension: store resume + job description for cover letter web page
const extensionCoverLetterContext = new Map()

app.post('/api/extension/cover-letter-context', express.json(), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const resume = typeof req.body?.resume === 'string' ? req.body.resume.trim() : ''
  const job_description = typeof req.body?.job_description === 'string' ? req.body.job_description.trim() : ''
  const company_name = typeof req.body?.company_name === 'string' ? req.body.company_name.trim() : ''
  const job_title = typeof req.body?.job_title === 'string' ? req.body.job_title.trim() : ''
  if (!resume || !job_description) return res.status(400).json({ error: 'resume and job_description required' })
  extensionCoverLetterContext.set(userId, { resume, job_description, company_name, job_title })

  // #region agent log
  fetch('http://127.0.0.1:7432/ingest/ef57fcee-7603-40e6-8f59-4c9f287b5350', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '652fa8',
    },
    body: JSON.stringify({
      sessionId: '652fa8',
      runId: 'cover-letter-flow',
      hypothesisId: 'A',
      location: 'server.js:/api/extension/cover-letter-context POST',
      message: 'Stored extension cover letter context',
      data: { hasResume: !!resume, hasJobDescription: !!job_description, company_name, job_title },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  res.json({ ok: true })
})

app.get('/api/extension/cover-letter-context', async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const data = extensionCoverLetterContext.get(userId)
  extensionCoverLetterContext.delete(userId)
  // #region agent log
  fetch('http://127.0.0.1:7432/ingest/ef57fcee-7603-40e6-8f59-4c9f287b5350', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '652fa8',
    },
    body: JSON.stringify({
      sessionId: '652fa8',
      runId: 'cover-letter-flow',
      hypothesisId: 'B',
      location: 'server.js:/api/extension/cover-letter-context GET',
      message: 'Returned extension cover letter context',
      data: {
        hasData: !!data,
        company_name: data?.company_name || '',
        job_title: data?.job_title || '',
        hasResume: !!data?.resume,
        hasJobDescription: !!data?.job_description,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  return res.json(data || { resume: '', job_description: '' })
})

// POST /api/ai/skill-suggestions – body: { job_description: string, api_key_id: string }
// Suggests skills/keywords from job description using user's API key. If api_key_id is missing, returns [] (e.g. custom resume form).
app.post('/api/ai/skill-suggestions', express.json(), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const body = req.body || {}
  const jobDescription = (typeof body.job_description === 'string' ? body.job_description.trim() : '') || (typeof body.query === 'string' ? body.query.trim() : '')
  const apiKeyId = body.api_key_id
  if (!jobDescription) return res.status(400).json({ error: 'job_description required' })
  if (!apiKeyId) return res.json({ suggestions: [] })
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  try {
    const keyRow = await pool.query(
      `select k.api_key_enc, p.slug as provider_slug from public.user_api_keys k
       join public.api_key_providers p on p.id = k.provider_id
       where k.user_id = $1 and k.id = $2 and k.is_active = true`,
      [userId, apiKeyId]
    )
    if (!keyRow.rows[0]) return res.status(400).json({ error: 'Invalid API key' })
    const { api_key_enc, provider_slug } = keyRow.rows[0]
    const trimmedKey = String(api_key_enc).trim()
    const prompt = `Based on this job description, list 15–25 specific skills, technologies, or keywords that a strong candidate would have or mention on their resume. Output only a JSON array of strings, no other text.

Job description:
${jobDescription.slice(0, 6000)}

Example format: ["JavaScript", "React", "REST APIs", "Agile", "Team leadership", ...]`
    let text = ''
    if (provider_slug === 'gemini') {
      const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
      const url = GEMINI_URL(model) + '?key=' + encodeURIComponent(trimmedKey)
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error?.message || 'Gemini API error')
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else {
      text = await generateWithUserKey(prompt, null, provider_slug, api_key_enc, null)
    }
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    const list = Array.isArray(suggestions) ? suggestions.filter((s) => typeof s === 'string' && s.trim()).map((s) => String(s).trim()) : []
    return res.json({ suggestions: list })
  } catch (err) {
    console.error('Skill suggestions error:', err.message)
    return res.status(502).json({ error: err.message || 'Could not get suggestions' })
  }
})

// POST /api/ai/generate-cover-letter – extension or web: API key, resume, job_description; optional company_name, job_title, tone, template, keywords; returns { text, latex? }
// Body: { api_key_id, resume, job_description, company_name?, job_title?, tone?, model?, additional_instructions?, template?, keywords? (array), want_latex? }
app.post('/api/ai/generate-cover-letter', express.json(), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const body = req.body || {}
  const apiKeyId = body.api_key_id
  const resume = typeof body.resume === 'string' ? body.resume.trim() : ''
  const jobDescription = typeof body.job_description === 'string' ? body.job_description.trim() : ''
  const companyName = typeof body.company_name === 'string' ? body.company_name.trim() : ''
  const jobTitle = typeof body.job_title === 'string' ? body.job_title.trim() : ''
  const tone = typeof body.tone === 'string' ? body.tone.trim() : 'professional'
  const model = typeof body.model === 'string' ? body.model.trim() : null
  const additionalInstructions = typeof body.additional_instructions === 'string' ? body.additional_instructions.trim() : ''
  const template = typeof body.template === 'string' ? body.template.trim() : 'professional'
  const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k) => typeof k === 'string').map((k) => String(k).trim()) : []
  const wantLatex = body.want_latex === true || body.want_latex === 'true'
  if (!apiKeyId) return res.status(400).json({ error: 'api_key_id required' })
  if (!resume || !jobDescription) return res.status(400).json({ error: 'resume and job_description required' })
  try {
    const keyRow = await pool.query(
      `select k.api_key_enc, p.slug as provider_slug
       from public.user_api_keys k
       join public.api_key_providers p on p.id = k.provider_id
       where k.user_id = $1 and k.id = $2 and k.is_active = true`,
      [userId, apiKeyId]
    )
    if (!keyRow.rows[0]) return res.status(400).json({ error: 'Invalid or inactive API key' })
    const { api_key_enc, provider_slug } = keyRow.rows[0]
    const keywordsLine = keywords.length > 0 ? `\nWeave in these keywords/phrases naturally where they fit: ${keywords.join(', ')}.` : ''
    const companyJobLine = [companyName, jobTitle].filter(Boolean).length > 0
      ? `\nCompany name (use at top of letter): ${companyName || '[infer from job description]'}. Job title: ${jobTitle || '[infer from job description]'}.`
      : ''
    const prompt = `You are an expert career coach. Create a cover letter based on a top company interview cover letter template: professional, concise, and tailored to the role.

--- RESUME ---
${resume.slice(0, 8000)}

--- JOB DESCRIPTION ---
${jobDescription.slice(0, 6000)}

--- INSTRUCTIONS ---
Tone: ${tone}. Template style: ${template}.${companyJobLine}${keywordsLine}
${additionalInstructions ? `Additional: ${additionalInstructions}` : ''}

FORMAT REQUIREMENTS (strict):
1. Start at the very top with the company name (and job title if known), then a blank line, then the date, then the salutation (e.g. Dear Hiring Manager). Do not start with "Dear Hiring Manager" only—the letter must begin with the company/role block at the top.
2. Keep the letter to exactly one page (about 300–400 words). Be concise and impactful; every sentence should add value.
3. Sound human and specific to this role. Map the candidate's experience to the job requirements.
4. Output the letter only—no meta labels or headers beyond the company/date/salutation block.`
    const modelArg = model || (provider_slug === 'gemini' ? 'gemini-2.0-flash' : null)
    if (wantLatex) {
      const systemInstruction = 'Output valid JSON only with two keys: "text" (plain cover letter: company name and job title at top, then date, then Dear Hiring Manager, then body; no extra labels) and "latex" (complete compilable LaTeX document: \\documentclass{article}, \\begin{document}, same letter content with company at top, \\end{document}). One page only. Use a simple article with geometry and font. Escape double quotes in JSON. No code fence.'
      const latexPrompt = prompt + '\n\nRespond with a single JSON object: "text" = the letter as plain text (company name at top, then date, salutation, body). "latex" = the same letter as a full LaTeX document (\\documentclass through \\end{document}), one page. Output only the JSON.'
      const raw = await generateWithUserKey(latexPrompt, systemInstruction, provider_slug, api_key_enc, modelArg)
      const trimmed = (raw && typeof raw === 'string' ? raw.trim() : '')
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
      let text = ''
      let latex = ''
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          text = typeof parsed.text === 'string' ? parsed.text.trim() : trimmed
          latex = typeof parsed.latex === 'string' ? parsed.latex.trim() : ''
        } catch (e) {
          text = trimmed
        }
      } else {
        text = trimmed
      }
      return res.json({ text, latex })
    }
    const text = await generateWithUserKey(prompt, null, provider_slug, api_key_enc, modelArg)
    res.json({ text })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: message })
  }
})

// Multiple high-quality resume prompts; one is chosen at random per request.
const RESUME_SYSTEM_PROMPTS = [
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'You are an expert US resume writer and career coach. Produce a polished resume. Keep it ATS-friendly: use clear section headings, standard job titles, and keywords relevant to the target role; avoid complex layouts or graphics that break parsing. Output valid JSON only with exactly two keys: "latex" and "html". '
    s += '"latex": A complete, compilable LaTeX resume (\\documentclass through \\end{document}). Use a modern class (e.g. moderncv or article with geometry, fontenc, charter/libertine). '
    s += '"html": The same resume as HTML body content only (no <html> or <body>), with inline styles for a modern look. Use clear sections: Summary, Experience, Education, Skills, Languages, Certifications. Dates in US style (e.g. January 2020). Escape double quotes in JSON. Output only the JSON object, no code fence or explanation. '
    s += `Template style: ${templateDesc}. `
    if (pageLimit === 1) s += 'CRITICAL: Fit on ONE page. Be concise; reduce spacing and text. '
    else s += 'You may use multiple pages. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'When "Primary resume to match" is provided below, use that design, structure, and layout; only replace content with the new data. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'You are a professional resume writer specializing in US formats. Keep the resume ATS-friendly: clear headings, standard structure, and role-relevant keywords; avoid tables or images that confuse ATS. Your output must be a single valid JSON object with keys "latex" and "html". '
    s += 'For "latex": write a full LaTeX resume document (complete with \\documentclass and \\begin{document}...\\end{document}), modern and clean. '
    s += 'For "html": write the same resume as HTML document body only, using simple tags (h1, h2, h3, p, ul, li, strong, br) and inline styles. '
    s += `Follow this template style: ${templateDesc}. Format dates like January 2020. Output only JSON. `
    if (pageLimit === 1) s += 'The resume MUST be one page only. '
    else s += 'Multiple pages allowed. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'If a primary resume reference is given, replicate its design and structure; fill with the new content. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'Role: Expert resume writer. Task: Generate a US-format resume. Keep it ATS-friendly: use standard section names, scannable layout, and keywords for the target role. Output format: JSON with "latex" and "html" only. '
    s += '"latex" = complete compilable LaTeX (modern class, e.g. moderncv or article). "html" = same content as HTML body only, inline styles, modern look. '
    s += `Style to follow: ${templateDesc}. Dates: US style (e.g. January 2020). No markdown, no explanation—only the JSON object. `
    if (pageLimit === 1) s += 'Constraint: Exactly one page. Be concise. '
    else s += 'Page limit: none. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'When primary resume HTML is provided, match its layout and styling; substitute the new data. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'You are a senior career advisor. Create a compelling US resume. Make it ATS-friendly: clear headings, logical structure, and role-specific keywords; avoid graphics or complex formatting that ATS cannot read. Respond with valid JSON containing two keys: "latex" (full LaTeX document, modern design) and "html" (body-only HTML with inline styles). '
    s += `Apply this template: ${templateDesc}. Use sections: Summary, Experience, Education, Skills, Languages, Certifications. US date format. Output only the JSON. `
    if (pageLimit === 1) s += 'One page maximum—prioritize impact and brevity. '
    else s += 'Length: as many pages as needed. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'If the user supplies a reference resume, mirror its design and structure; use the new data for content. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'Act as a professional US resume writer. Keep the resume ATS-friendly: standard sections, scannable content, and keywords aligned to the target role; no images or complex tables. Generate one JSON object with "latex" and "html". '
    s += 'latex: Complete LaTeX resume (\\documentclass to \\end{document}), modern class, clean layout. '
    s += 'html: Same resume as HTML body content only; use inline styles for typography and spacing. '
    s += `Template: ${templateDesc}. Dates in US style. Return only the JSON—no code blocks or extra text. `
    if (pageLimit === 1) s += 'Must fit on one page. '
    else s += 'Multi-page OK. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'When a primary resume is provided, copy its layout and styling; replace only the text with the new data. '
    return s
  },
  (templateDesc, pageLimit, primaryResumeHtml) => {
    let s = 'You are an ATS-optimized resume writer. Keep the resume ATS-friendly: clear section headings, standard job titles, and keywords for the target role; use simple structure so applicant tracking systems parse correctly. Produce a single JSON object: "latex" (full LaTeX resume, modern and professional) and "html" (body-only HTML, inline styles). '
    s += `Design direction: ${templateDesc}. Standard sections; US date format. Output raw JSON only. `
    if (pageLimit === 1) s += 'Keep to one page. '
    else s += 'Pages: unlimited. '
    if (primaryResumeHtml && primaryResumeHtml.length > 50) s += 'If reference resume is included, match its design and structure; fill with the provided data. '
    return s
  },
]

const RESUME_USER_PROMPT_INTROS = [
  (template, templateDesc, pageRule) => `Generate a US-format resume from the data below. Output only a JSON object with keys "latex" and "html".\n\nTemplate (required): ${template} — ${templateDesc}\nPage length (required): ${pageRule}\n\nResume data:`,
  (template, templateDesc, pageRule) => `Create a resume from this information. Return valid JSON with "latex" and "html".\n\nTemplate: ${template} — ${templateDesc}\nPage length: ${pageRule}\n\nData:`,
  (template, templateDesc, pageRule) => `Using the following data, generate a resume. Output JSON with "latex" and "html" only.\n\nStyle: ${template} — ${templateDesc}\nLength: ${pageRule}\n\nInput:`,
  (template, templateDesc, pageRule) => `Build a resume from the data below. Response must be JSON: "latex" (full LaTeX doc) and "html" (body HTML).\n\nTemplate: ${template} — ${templateDesc}\nPages: ${pageRule}\n\nResume data:`,
  (template, templateDesc, pageRule) => `Generate a professional resume. Output a single JSON object with "latex" and "html".\n\nTemplate (required): ${template} — ${templateDesc}\nPage rule: ${pageRule}\n\nCandidate data:`,
]

function pickRandom (arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// POST /api/ai/generate-resume – body: api_key_id, personal, summary, education, experience, skills, languages, certifications, page_limit, template, primary_resume_html (optional)
// Or for job-based: resume_text, job_description, skills (array), page_limit, template
app.post('/api/ai/generate-resume', express.json(), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const body = req.body || {}
  const apiKeyId = body.api_key_id
  if (!apiKeyId) return res.status(400).json({ error: 'Please select an API key. Add one in API Connection if you have none.' })
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  try {
    const keyRow = await pool.query(
      `select k.id, k.api_key_enc, p.slug as provider_slug
       from public.user_api_keys k
       join public.api_key_providers p on p.id = k.provider_id
       where k.user_id = $1 and k.id = $2 and k.is_active = true`,
      [userId, apiKeyId]
    )
    if (!keyRow.rows[0]) return res.status(400).json({ error: 'Invalid or inactive API key. Choose another in API Connection.' })
    const { api_key_enc, provider_slug } = keyRow.rows[0]
    const pageLimit = body.page_limit === 1 || body.page_limit === '1' ? 1 : null
    const template = typeof body.template === 'string' ? body.template.trim() : 'modern_minimal'
    const resumeText = typeof body.resume_text === 'string' ? body.resume_text.trim() : ''
    const jobDescription = typeof body.job_description === 'string' ? body.job_description.trim() : ''
    const skillsList = Array.isArray(body.skills) ? body.skills.filter((s) => typeof s === 'string').map((s) => String(s).trim()) : []

    const templateDescriptions = {
      modern_minimal: 'Modern minimal: clean typography, ample whitespace, subtle dividers, no clutter. Single column, professional and contemporary.',
      professional: 'Professional: classic layout, clear sections, conservative styling. Ideal for corporate and traditional roles.',
      creative: 'Creative: distinctive layout, optional two-column, modern fonts, suitable for design and creative roles.',
      academic: 'Academic: emphasis on education, publications, and research. Formal and structured.',
      executive_classic: 'Executive: two-column layout with a dark sidebar (e.g. navy) for name and contact; main content for experience and education. Professional and corporate.',
      technical_developer: 'Technical/Developer: monospace or technical feel, skill tags as pills, clear section dividers. Suited for engineers and developers.',
      bold_creative: 'Bold creative: full-width colored header, large display name, asymmetric two-column. Suited for design and marketing.',
      academic_research: 'Academic/Research: emphasis on education, publications, research. Formal, serif optional.',
      compact_pro: 'Compact: dense layout, small fonts, tight spacing. Maximize content on one page for experienced professionals.',
    }
    const templateDesc = templateDescriptions[template] || templateDescriptions.modern_minimal

    const pageRule = pageLimit === 1 ? 'ONE page only. Be concise; fit everything on a single page.' : 'You may use as many pages as needed.'

    let rawContent
    if (resumeText && jobDescription) {
      const systemInstruction = `You are an expert US resume writer. Produce a tailored resume as valid JSON with exactly two keys: "latex" and "html".
"latex": A complete, compilable LaTeX resume (\\documentclass through \\end{document}). Use a modern class. ${templateDesc}. ${pageRule}
"html": The same resume as HTML body content only (no <html> or <body>), with inline styles. Escape double quotes in JSON. Output only the JSON object, no code fence or explanation.`
      const skillsLine = skillsList.length > 0 ? `\n\nInclude or emphasize these skills/keywords in the resume: ${skillsList.join(', ')}` : ''
      const prompt = `Tailor the following resume for this job. Keep it ATS-friendly. Output valid JSON with "latex" and "html" only.

--- RESUME ---
${resumeText.slice(0, 12000)}

--- JOB DESCRIPTION ---
${jobDescription.slice(0, 8000)}${skillsLine}

Apply template style: ${templateDesc}. ${pageRule}`
      rawContent = await generateWithUserKey(prompt, systemInstruction, provider_slug, api_key_enc)
    } else {
      const primaryResumeHtml = typeof body.primary_resume_html === 'string' ? body.primary_resume_html.trim() : null
      const systemInstruction = pickRandom(RESUME_SYSTEM_PROMPTS)(templateDesc, pageLimit, primaryResumeHtml)
      const promptIntro = pickRandom(RESUME_USER_PROMPT_INTROS)(template, templateDesc, pageRule)

      const targetRole = (body.personal && typeof body.personal.targetRole === 'string') ? body.personal.targetRole.trim() : ''
      let prompt = `${promptIntro}`
      if (targetRole) prompt += `\nTarget role (tailor the resume for this position): ${targetRole}\n\n`
      prompt += `
Personal: ${JSON.stringify(body.personal || {})}
Professional summary: ${body.summary || ''}
Education: ${JSON.stringify(body.education || [])}
Experience: ${JSON.stringify(body.experience || [])}
Skills: ${body.skills || ''}
Languages: ${body.languages || ''}
Certifications: ${body.certifications || ''}`
      if (primaryResumeHtml && primaryResumeHtml.length > 50) {
        prompt += `\n\nPrimary resume to match (use this design, structure, and layout; fill with the new data above):\n${primaryResumeHtml.slice(0, 12000)}`
      }
      rawContent = await generateWithUserKey(prompt, systemInstruction, provider_slug, api_key_enc)
    }
    let content = null
    let latex = null
    let trimmed = (rawContent && typeof rawContent === 'string' ? rawContent.trim() : '')
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlock) trimmed = codeBlock[1].trim()
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (typeof parsed.latex === 'string' && parsed.latex.trim()) latex = parsed.latex.trim()
        if (typeof parsed.html === 'string' && parsed.html.trim()) content = parsed.html.trim()
      } catch (e) {
        console.warn('Generate resume: JSON parse failed, falling back to raw as HTML', e.message)
      }
    }
    if (!content && rawContent && typeof rawContent === 'string') content = rawContent.trim()
    res.json({ content: content || '', latex: latex || '' })
  } catch (err) {
    console.error('Generate resume:', err.message)
    res.status(502).json({ error: err.message || 'Could not generate resume' })
  }
})

// POST /api/resumake/generate – template-based LaTeX (resumake.io style). Body: selectedTemplate, sections, headings, basics, education, work, skills, projects, awards.
app.post('/api/resumake/generate', express.json(), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  try {
    const result = resumake.generate(req.body || {})
    if (result.error) return res.status(400).json({ error: result.error })
    res.json({ latex: result.latex })
  } catch (err) {
    console.error('Resumake generate error:', err)
    return res.status(500).json({ error: err.message || 'LaTeX generation failed' })
  }
})

// POST /api/resumake/compile-pdf – compile LaTeX to PDF (local pdflatex, or LaTeX.Online fallback). Body: { latex: string }
app.post('/api/resumake/compile-pdf', express.json(), async (req, res) => {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const latexDoc = typeof req.body?.latex === 'string' ? req.body.latex : ''
  if (!latexDoc.trim()) return res.status(400).json({ error: 'Missing latex' })
  try {
    const pdfBuffer = await resumakeCompilePdf(latexDoc.trim(), { cmd: 'pdflatex', passes: 1 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"')
    res.send(pdfBuffer)
  } catch (err) {
    console.error('Resumake compile-pdf error:', err)
    return res.status(502).json({ error: err.message || 'PDF compilation failed' })
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
      'select id, name, file_url, is_primary, uploaded_at, html_content from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc',
      [userId]
    )
    res.json(rows)
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await pool.query(
        'select id, name, file_url, is_primary, uploaded_at from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc',
        [userId]
      )
      return res.json(rows)
    }
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
    console.warn('Resume upload skipped: Cloudinary not configured (set cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret in .env)')
    return res.status(503).json({ error: 'Cloudinary not configured. Set cloudinary_* in .env' })
  }
  const mimetype = req.file.mimetype || ''
  const originalname = req.file.originalname || 'resume'
  const isPdf = mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf')
  try {
    const publicId = `user-${userId}-${Date.now()}-${originalname.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 40)}`
    const url = await uploadToCloudinary(req.file.buffer, 'resumes', {
      resource_type: 'raw',
      public_id: publicId,
    })
    if (!url || typeof url !== 'string') {
      console.error('Resume upload: Cloudinary returned no URL')
      return res.status(502).json({ error: 'Resume upload failed: no URL from storage.' })
    }
    console.log('Resume uploaded to Cloudinary:', { userId, name: originalname, url, isPdf, size: req.file.size })
    res.status(201).json({ file_url: url, name: originalname })
  } catch (err) {
    console.error('Resume upload error:', err.message || err)
    res.status(502).json({ error: err.message || 'Resume upload failed.' })
  }
}, (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 10 MB.' })
  console.error('Resume upload multer/validation:', err.message)
  res.status(400).json({ error: err.message || 'Resume upload failed.' })
})

// Add resume (name + file_url; optional is_primary, html_content).
app.post('/api/resumes', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const fileUrl = typeof req.body?.file_url === 'string' ? req.body.file_url.trim() : ''
  const isPrimary = req.body?.is_primary === true || req.body?.is_primary === 'true'
  const htmlContent = typeof req.body?.html_content === 'string' ? req.body.html_content.trim() || null : null

  if (!name || name.length < 1) return res.status(400).json({ error: 'Resume name is required' })
  if (!fileUrl || fileUrl.length < 5) return res.status(400).json({ error: 'Resume file URL or data is required' })

  try {
    if (isPrimary) {
      await pool.query('update public.resumes set is_primary = false where user_id = $1', [userId])
    }
    const { rows } = await pool.query(
      `insert into public.resumes (user_id, name, file_url, is_primary, html_content)
       values ($1, $2, $3, $4, $5)
       returning id, name, file_url, is_primary, uploaded_at, html_content`,
      [userId, name, fileUrl, isPrimary, htmlContent]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await pool.query(
        `insert into public.resumes (user_id, name, file_url, is_primary)
         values ($1, $2, $3, $4)
         returning id, name, file_url, is_primary, uploaded_at`,
        [userId, name, fileUrl, isPrimary]
      )
      return res.status(201).json(rows[0])
    }
    return handleDbError(err, res, 'Resume add')
  }
})

// Get resume as plain text (from html_content or by extracting from PDF). Used by extension when html_content is missing.
app.get('/api/resumes/:id/text', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  try {
    const { rows } = await pool.query('select html_content, file_url from public.resumes where id = $1 and user_id = $2', [id, userId])
    if (!rows[0]) return res.status(404).json({ error: 'Resume not found' })
    const { html_content, file_url } = rows[0]
    if (html_content && typeof html_content === 'string' && html_content.trim().length > 0) {
      const text = html_content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      return res.json({ text: text || '' })
    }
    if (!file_url) return res.json({ text: '' })
    const resp = await fetch(file_url, { redirect: 'follow' })
    if (!resp.ok) {
      if (resp.status === 401 && file_url.includes('cloudinary')) {
        console.error('Resume text: Cloudinary returned 401. Enable "Allow delivery of PDF and ZIP files" in Cloudinary Dashboard > Settings > Security.')
      } else {
        console.error('Resume text: fetch failed', resp.status, file_url)
      }
      return res.status(502).json({ error: 'File could not be retrieved.' })
    }
    const buf = Buffer.from(await resp.arrayBuffer())
    const contentType = (resp.headers.get('content-type') || '').toLowerCase()
    const urlLooksPdf = file_url.toLowerCase().includes('.pdf')
    const bufferIsPdf = buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-'
    const treatAsPdf = contentType.includes('pdf') || urlLooksPdf || bufferIsPdf
    if (treatAsPdf) {
      try {
        const { PDFParse } = require('pdf-parse')
        const parser = new PDFParse({ data: buf })
        const result = await parser.getText()
        await parser.destroy()
        const text = (result && result.text) ? String(result.text).trim() : ''
        return res.json({ text })
      } catch (e) {
        console.error('PDF parse error:', e.message)
        return res.json({ text: '' })
      }
    }
    return res.json({ text: '' })
  } catch (err) {
    console.error('Resume text:', err)
    return res.status(502).json({ error: err.message || 'Failed to get resume text.' })
  }
})

// Get resume file (proxy for PDF view/edit; avoids CORS/embedding issues)
app.get('/api/resumes/:id/file', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  try {
    const { rows } = await pool.query('select file_url from public.resumes where id = $1 and user_id = $2', [id, userId])
    if (!rows[0]) return res.status(404).json({ error: 'Resume not found' })
    const fileUrl = rows[0].file_url
    if (!fileUrl) return res.status(404).json({ error: 'No file URL for this resume' })
    const resp = await fetch(fileUrl, { redirect: 'follow' })
    if (!resp.ok) {
      if (resp.status === 401 && fileUrl.includes('cloudinary')) {
        console.error('Resume file proxy: Cloudinary 401. Enable "Allow delivery of PDF and ZIP files" in Cloudinary Dashboard > Settings > Security.')
      } else {
        console.error('Resume file proxy: upstream returned', resp.status, fileUrl)
      }
      return res.status(502).json({ error: 'File could not be retrieved from storage. The link may have expired or be invalid.' })
    }
    const contentType = resp.headers.get('content-type') || 'application/pdf'
    res.setHeader('Content-Type', contentType)
    const buf = Buffer.from(await resp.arrayBuffer())
    res.send(buf)
  } catch (err) {
    console.error('Resume file proxy:', err)
    return res.status(502).json({ error: err.message || 'File could not be loaded. Check server logs.' })
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

// Update resume (name, html_content, optional file_url)
app.patch('/api/resumes/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : null
  const htmlContent = req.body?.html_content !== undefined
    ? (typeof req.body.html_content === 'string' ? req.body.html_content.trim() || null : null)
    : null
  const fileUrl = typeof req.body?.file_url === 'string' ? req.body.file_url.trim() : null
  if (!name && htmlContent === null && !fileUrl) {
    return res.status(400).json({ error: 'Provide at least one of name, html_content, or file_url' })
  }
  try {
    const own = await pool.query('select id, name, file_url, html_content from public.resumes where id = $1 and user_id = $2', [id, userId])
    if (!own.rows[0]) return res.status(404).json({ error: 'Resume not found' })
    const updates = []
    const values = []
    let v = 1
    if (name !== null) { updates.push(`name = $${v++}`); values.push(name) }
    if (htmlContent !== null) { updates.push(`html_content = $${v++}`); values.push(htmlContent) }
    if (fileUrl !== null) { updates.push(`file_url = $${v++}`); values.push(fileUrl) }
    values.push(id, userId)
    const { rows } = await pool.query(
      `update public.resumes set ${updates.join(', ')} where id = $${v} and user_id = $${v + 1} returning id, name, file_url, is_primary, uploaded_at, html_content`,
      values
    )
    res.json(rows[0])
  } catch (err) {
    if (err.code === '42703') {
      const updates = []
      const values = []
      let v = 1
      if (name !== null) { updates.push(`name = $${v++}`); values.push(name) }
      if (fileUrl !== null) { updates.push(`file_url = $${v++}`); values.push(fileUrl) }
      if (updates.length === 0) return res.status(400).json({ error: 'Provide name or file_url (html_content not available)' })
      values.push(id, userId)
      const { rows } = await pool.query(
        `update public.resumes set ${updates.join(', ')} where id = $${v} and user_id = $${v + 1} returning id, name, file_url, is_primary, uploaded_at`,
        values
      )
      return res.json(rows[0])
    }
    return handleDbError(err, res, 'Resume update')
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
      'select id, user_id, job_id, title, file_url, created_at, html_content from public.cover_letters where user_id = $1 order by created_at desc',
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

// Get cover letter file (proxy from storage for in-page preview, avoids CORS)
app.get('/api/cover-letters/:id/file', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  try {
    const { rows } = await pool.query('select file_url from public.cover_letters where id = $1 and user_id = $2', [id, userId])
    if (!rows[0]) return res.status(404).json({ error: 'Cover letter not found' })
    const fileUrl = rows[0].file_url
    if (!fileUrl) return res.status(404).json({ error: 'No file URL for this cover letter' })
    const resp = await fetch(fileUrl, { redirect: 'follow' })
    if (!resp.ok) {
      if (resp.status === 401 && fileUrl.includes('cloudinary')) {
        console.error('Cover letter file proxy: Cloudinary 401. Enable "Allow delivery of PDF and ZIP files" in Cloudinary Dashboard > Settings > Security.')
      } else {
        console.error('Cover letter file proxy: upstream returned', resp.status, fileUrl)
      }
      return res.status(502).json({ error: 'File could not be retrieved from storage. The link may have expired or be invalid.' })
    }
    const contentType = resp.headers.get('content-type') || 'application/pdf'
    res.setHeader('Content-Type', contentType)
    const buf = Buffer.from(await resp.arrayBuffer())
    res.send(buf)
  } catch (err) {
    console.error('Cover letter file proxy:', err)
    return res.status(502).json({ error: err.message || 'File could not be loaded. Check server logs.' })
  }
})

// Update cover letter (title, html_content)
app.patch('/api/cover-letters/:id', express.json(), async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  const title = req.body?.title !== undefined && typeof req.body.title === 'string' ? req.body.title.trim() || null : undefined
  const htmlContent = req.body?.html_content !== undefined
    ? (typeof req.body.html_content === 'string' ? req.body.html_content.trim() || null : null)
    : undefined
  if (title === undefined && htmlContent === undefined) {
    return res.status(400).json({ error: 'Provide at least one of title or html_content' })
  }
  try {
    const updates = []
    const values = []
    let v = 1
    if (title !== undefined) {
      updates.push(`title = $${v++}`)
      values.push(title)
    }
    if (htmlContent !== undefined) {
      updates.push(`html_content = $${v++}`)
      values.push(htmlContent)
    }
    values.push(id, userId)
    const { rows } = await pool.query(
      `update public.cover_letters set ${updates.join(', ')} where id = $${v} and user_id = $${v + 1} returning id, title, file_url, created_at, html_content`,
      values
    )
    if (!rows[0]) return res.status(404).json({ error: 'Cover letter not found' })
    res.json(rows[0])
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Cover letters table not found. Run migration.' })
    return handleDbError(err, res, 'Cover letter update')
  }
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

// Analytics: counts for current user (resumes, cover letters, jobs applied)
app.get('/api/analytics/stats', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  try {
    let resumeCount = 0
    let coverLetterCount = 0
    let jobsAppliedCount = 0

    const r = await pool.query('select count(*)::int as c from public.resumes where user_id = $1', [userId])
    if (r.rows[0]) resumeCount = r.rows[0].c

    try {
      const c = await pool.query('select count(*)::int as c from public.cover_letters where user_id = $1', [userId])
      if (c.rows[0]) coverLetterCount = c.rows[0].c
    } catch (e) {
      if (e.code !== '42P01') throw e
    }

    try {
      const j = await pool.query('select count(*)::int as c from public.job_applications where user_id = $1', [userId])
      if (j.rows[0]) jobsAppliedCount = j.rows[0].c
    } catch (e) {
      if (e.code !== '42P01') throw e
    }

    let jobsTrackedCount = 0
    try {
      const t = await pool.query('select count(*)::int as c from public.job_tracker where user_id = $1', [userId])
      if (t.rows[0]) jobsTrackedCount = t.rows[0].c
    } catch (e) {
      if (e.code !== '42P01') throw e
    }

    res.json({
      resume_count: resumeCount,
      cover_letter_count: coverLetterCount,
      jobs_applied_count: jobsAppliedCount,
      jobs_tracked_count: jobsTrackedCount,
    })
  } catch (err) {
    return handleDbError(err, res, 'Analytics stats')
  }
})

// --- Job Tracker (extension autofill) ---
app.post('/api/job-tracker', express.json(), async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  const {
    company_name,
    position_title,
    location,
    min_salary,
    max_salary,
    currency,
    salary_period,
    job_type,
    job_description,
    notes,
    application_status,
    job_posting_url,
  } = req.body || {}

  try {
    const r = await pool.query(
      `insert into public.job_tracker (
        user_id, company_name, position_title, location,
        min_salary, max_salary, currency, salary_period, job_type,
        job_description, notes, application_status, job_posting_url
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      returning id, company_name, position_title, location, created_at`,
      [
        userId,
        company_name ?? null,
        position_title ?? null,
        location ?? null,
        min_salary != null ? Number(min_salary) : null,
        max_salary != null ? Number(max_salary) : null,
        currency ?? null,
        salary_period ?? null,
        job_type ?? null,
        job_description ?? null,
        notes ?? null,
        application_status ?? 'not_applied',
        job_posting_url ?? null,
      ]
    )
    const row = r.rows[0]
    res.status(201).json({ id: row.id, company_name: row.company_name, position_title: row.position_title, location: row.location, created_at: row.created_at })
  } catch (err) {
    return handleDbError(err, res, 'Job tracker save')
  }
})

app.get('/api/job-tracker', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  try {
    const r = await pool.query(
      `select id, company_name, position_title, location, min_salary, max_salary, currency, salary_period, job_type,
       job_description, notes, application_status, job_posting_url, created_at, updated_at
       from public.job_tracker where user_id = $1 order by created_at desc`,
      [userId]
    )
    res.json(r.rows)
  } catch (err) {
    if (err.code === '42P01') return res.json([])
    return handleDbError(err, res, 'Job tracker list')
  }
})

// --- API Key Providers & User API Keys ---

function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '••••••••'
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '••••••••'
  return trimmed.slice(0, 4) + '••••••••' + trimmed.slice(-4)
}

// Default API key providers (seed when table is empty)
const DEFAULT_API_KEY_PROVIDERS = [
  { slug: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-3.5, and other OpenAI models', base_url: 'https://api.openai.com/v1', display_order: 10 },
  { slug: 'gemini', name: 'Google Gemini', description: 'Gemini Pro and other Google AI models', base_url: 'https://generativelanguage.googleapis.com', display_order: 20 },
  { slug: 'anthropic', name: 'Anthropic', description: 'Claude models', base_url: 'https://api.anthropic.com', display_order: 30 },
  { slug: 'openrouter', name: 'OpenRouter', description: 'Unified API for many models (OpenAI, Anthropic, etc.)', base_url: 'https://openrouter.ai/api/v1', display_order: 40 },
  { slug: 'groq', name: 'Groq', description: 'Fast inference (Llama, Mixtral)', base_url: 'https://api.groq.com/openai/v1', display_order: 50 },
  { slug: 'together', name: 'Together AI', description: 'Open-source and custom models', base_url: 'https://api.together.xyz/v1', display_order: 60 },
  { slug: 'mistral', name: 'Mistral AI', description: 'Mistral and Mixtral models', base_url: 'https://api.mistral.ai/v1', display_order: 70 },
  { slug: 'cohere', name: 'Cohere', description: 'Command and embed models', base_url: 'https://api.cohere.ai', display_order: 80 },
]

// Return static provider list (used when DB table is missing or query fails)
function getStaticProvidersList() {
  return DEFAULT_API_KEY_PROVIDERS.map((p) => ({
    id: p.slug,
    slug: p.slug,
    name: p.name,
    description: p.description,
    base_url: p.base_url,
  }))
}

// List all API key providers (for dropdown); seed table if empty; fallback to static list if table missing
app.get('/api/api-key-providers', async (req, res) => {
  if (!pool) {
    return res.json(getStaticProvidersList())
  }
  try {
    let rows
    try {
      const result = await pool.query(
        'select id, slug, name, description, base_url from public.api_key_providers order by display_order, name'
      )
      rows = result.rows
    } catch (tableErr) {
      return res.json(getStaticProvidersList())
    }
    if (rows.length === 0) {
      for (const p of DEFAULT_API_KEY_PROVIDERS) {
        await pool.query(
          `insert into public.api_key_providers (slug, name, description, base_url, display_order)
           values ($1, $2, $3, $4, $5) on conflict (slug) do nothing`,
          [p.slug, p.name, p.description || null, p.base_url || null, p.display_order]
        )
      }
      const result = await pool.query(
        'select id, slug, name, description, base_url from public.api_key_providers order by display_order, name'
      )
      rows = result.rows
    }
    return res.json(rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name || r.slug || 'Unknown',
      description: r.description,
      base_url: r.base_url,
    })))
  } catch (err) {
    return res.json(getStaticProvidersList())
  }
})

// List current user's API keys (masked)
app.get('/api/api-keys', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  try {
    const { rows } = await pool.query(
      `select k.id, k.user_id, k.provider_id, k.label, k.is_active, k.last_used_at, k.created_at, k.updated_at,
              k.api_key_enc, p.slug as provider_slug, p.name as provider_name
       from public.user_api_keys k
       join public.api_key_providers p on p.id = k.provider_id
       where k.user_id = $1
       order by p.display_order, p.name, k.created_at`,
      [userId]
    )
    res.json(
      rows.map(({ api_key_enc, ...rest }) => ({ ...rest, api_key_masked: maskApiKey(api_key_enc) }))
    )
  } catch (err) {
    return handleDbError(err, res, 'API keys list')
  }
})

// Create user API key (provider_id can be UUID or provider slug e.g. "openai")
app.post('/api/api-keys', async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      error: 'API key storage is not available. Database is not configured.',
    })
  }
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { provider_id, label, api_key } = req.body || {}
  if (!provider_id) return res.status(400).json({ error: 'Provider is required' })
  const keyStr = typeof api_key === 'string' ? api_key.trim() : ''
  if (!keyStr) return res.status(400).json({ error: 'API key is required' })

  const labelVal = label && typeof label === 'string' ? label.trim() || null : null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  try {
    let providerId = provider_id
    if (!uuidRegex.test(String(provider_id))) {
      const bySlug = await pool.query(
        'select id, slug, name from public.api_key_providers where slug = $1',
        [String(provider_id).trim()]
      )
      if (bySlug.rows[0]) {
        providerId = bySlug.rows[0].id
      } else {
        const def = DEFAULT_API_KEY_PROVIDERS.find((p) => p.slug === String(provider_id).trim())
        if (def) {
          const ins = await pool.query(
            `insert into public.api_key_providers (slug, name, description, base_url, display_order)
             values ($1, $2, $3, $4, $5) on conflict (slug) do update set name = $2 returning id, slug, name`,
            [def.slug, def.name, def.description || null, def.base_url || null, def.display_order]
          )
          providerId = ins.rows[0].id
        }
      }
    }

    const { rows } = await pool.query(
      `insert into public.user_api_keys (user_id, provider_id, label, api_key_enc)
       values ($1, $2, $3, $4)
       returning id, user_id, provider_id, label, is_active, created_at, updated_at`,
      [userId, providerId, labelVal, keyStr]
    )
    const r = rows[0]
    const provider = await pool.query(
      'select slug, name from public.api_key_providers where id = $1',
      [r.provider_id]
    )
    res.status(201).json({
      id: r.id,
      user_id: r.user_id,
      provider_id: r.provider_id,
      provider_slug: provider.rows[0]?.slug,
      provider_name: provider.rows[0]?.name,
      label: r.label,
      is_active: r.is_active,
      api_key_masked: maskApiKey(keyStr),
      created_at: r.created_at,
      updated_at: r.updated_at,
    })
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Invalid provider' })
    if (err.code === '23505') return res.status(409).json({ error: 'A key for this provider already exists with the same label' })
    if (err.code === '42P01' || (err.message && String(err.message).includes('does not exist'))) {
      return res.status(503).json({
        error: 'API key storage is not set up. Please run the database migration: Backend/Node/migrations/create_api_keys.sql in your Supabase SQL editor.',
      })
    }
    return handleDbError(err, res, 'API key create')
  }
})

// Update user API key (key, label, or is_active)
app.patch('/api/api-keys/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  const { api_key, label, is_active } = req.body || {}

  try {
    const updates = []
    const values = []
    let idx = 1
    if (typeof api_key === 'string' && api_key.trim()) {
      updates.push(`api_key_enc = $${idx++}`)
      values.push(api_key.trim())
    }
    if (label !== undefined) {
      updates.push(`label = $${idx++}`)
      values.push(typeof label === 'string' ? label.trim() || null : null)
    }
    if (typeof is_active === 'boolean') {
      updates.push(`is_active = $${idx++}`)
      values.push(is_active)
    }
    updates.push('updated_at = now()')
    values.push(id, userId)
    const idParam = idx
    const userIdParam = idx + 1
    const { rows } = await pool.query(
      `update public.user_api_keys set ${updates.join(', ')} where id = $${idParam} and user_id = $${userIdParam} returning id, provider_id, label, is_active, updated_at`,
      values
    )
    if (!rows[0]) return res.status(404).json({ error: 'API key not found' })
    res.json(rows[0])
  } catch (err) {
    return handleDbError(err, res, 'API key update')
  }
})

// Delete user API key
app.delete('/api/api-keys/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  const { id } = req.params
  try {
    const { rowCount } = await pool.query(
      'delete from public.user_api_keys where id = $1 and user_id = $2',
      [id, userId]
    )
    if (rowCount === 0) return res.status(404).json({ error: 'API key not found' })
    res.status(204).send()
  } catch (err) {
    return handleDbError(err, res, 'API key delete')
  }
})

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})
