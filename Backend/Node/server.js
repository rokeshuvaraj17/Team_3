require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')

const app = express()
const PORT = process.env.PORT || 3000
const DATABASE_URL = process.env.DATABASE_URL
const PASSWORD_SALT = process.env.PASSWORD_SALT || ''

/** Combine salt + password for hashing (same order must be used in signup and login) */
function saltedPassword(password) {
  return PASSWORD_SALT + password
}

const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null

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
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }
    console.error('Signup error:', err)
    res.status(500).json({ error: 'Registration failed. Please try again.' })
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
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

// Get current user profile (x-user-id header)
app.get('/api/profile', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  try {
    const { rows } = await pool.query(
      'select id, user_id, display_name, headline, summary, location, location_country, profile_image_url, phone, website_url, linkedin_url, created_at, updated_at from public.user_profiles where user_id = $1',
      [userId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Profile not found' })
    res.json(rows[0])
  } catch (err) {
    console.error('Profile get error:', err)
    res.status(500).json({ error: 'Failed to load profile' })
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
      profile_image_url: getNull(body.profile_image_url) ?? row?.profile_image_url ?? null,
      phone: getNull(body.phone) ?? row?.phone ?? null,
      website_url: getNull(body.website_url) ?? row?.website_url ?? null,
      linkedin_url: getNull(body.linkedin_url) ?? row?.linkedin_url ?? null,
    }
    if (!merged.display_name) return res.status(400).json({ error: 'Display name is required' })

    const { rows } = await pool.query(
      `insert into public.user_profiles (user_id, display_name, headline, summary, location, location_country, profile_image_url, phone, website_url, linkedin_url)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (user_id) do update set
         display_name = $2, headline = $3, summary = $4, location = $5, location_country = $6,
         profile_image_url = $7, phone = $8, website_url = $9, linkedin_url = $10, updated_at = now()
       returning id, user_id, display_name, headline, summary, location, location_country, profile_image_url, phone, website_url, linkedin_url, created_at, updated_at`,
      [
        userId,
        merged.display_name,
        merged.headline,
        merged.summary,
        merged.location,
        merged.location_country,
        merged.profile_image_url,
        merged.phone,
        merged.website_url,
        merged.linkedin_url,
      ]
    )
    res.json(rows[0])
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'User not found' })
    console.error('Profile put error:', err)
    res.status(500).json({ error: 'Failed to save profile' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})
