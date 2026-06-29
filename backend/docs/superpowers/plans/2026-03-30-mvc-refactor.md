# MVC Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the monolithic 2,583-line `server.js` into a layered MVC architecture under `src/`.

**Architecture:** Strict MVC — routes define endpoints, controllers handle request/response logic, models encapsulate SQL, services wrap external APIs. Shared config, middleware, and utils in dedicated directories.

**Tech Stack:** Node.js, Express 5, PostgreSQL (pg), Cloudinary, Multer, bcrypt, CommonJS

**Spec:** `docs/superpowers/specs/2026-03-30-mvc-refactor-design.md`

---

## File Map

### Create (new files under `src/`)

| File | Responsibility |
|------|---------------|
| `src/server.js` | Entry point: load dotenv, import app, listen |
| `src/app.js` | Express app: middleware, CORS, mount all route routers, error handler |
| `src/config/env.js` | All env var loading and exports |
| `src/config/db.js` | Pool creation, SSL config, pool error handler |
| `src/config/cloudinary.js` | Cloudinary SDK config |
| `src/middleware/auth.js` | Extract `x-user-id` → `req.userId` |
| `src/middleware/requireDb.js` | 503 if pool is null |
| `src/middleware/upload.js` | Multer instances (photo, resume, coverLetter) |
| `src/middleware/errorHandler.js` | `handleDbError` as Express error middleware |
| `src/utils/password.js` | `saltedPassword` |
| `src/utils/constants.js` | Field keys, country maps, provider defaults, AI prompts |
| `src/utils/helpers.js` | `maskApiKey`, `locationMatchesCountry`, `mergeAutofillWithProfile`, `pickRandom`, `extractJsonObject`, `translateWithMyMemory` |
| `src/services/cloudinary.service.js` | `uploadToCloudinary` |
| `src/services/ai.service.js` | `generateWithUserKey`, `autofillLlmGenerate`, `autofillGenerate`, `geminiGenerate` |
| `src/services/jobSearch.service.js` | Adzuna, Jooble, Arbeitnow, Reed API calls |
| `src/models/user.model.js` | `public.users` queries |
| `src/models/profile.model.js` | `public.user_profiles` queries |
| `src/models/autofill.model.js` | `public.user_autofill` + `user_autofill_custom_fields` queries |
| `src/models/resume.model.js` | `public.resumes` queries |
| `src/models/coverLetter.model.js` | `public.cover_letters` queries |
| `src/models/job.model.js` | `public.jobs` queries |
| `src/models/jobApplication.model.js` | `public.job_applications` queries |
| `src/models/jobTracker.model.js` | `public.job_tracker` queries |
| `src/models/apiKey.model.js` | `public.user_api_keys` + `api_key_providers` queries |
| `src/models/analytics.model.js` | Cross-table analytics queries |
| `src/controllers/health.controller.js` | Health check handlers |
| `src/controllers/auth.controller.js` | Signup, login |
| `src/controllers/profile.controller.js` | Profile CRUD + photo upload |
| `src/controllers/autofill.controller.js` | Autofill get/put + semantic match endpoints |
| `src/controllers/resume.controller.js` | Resume CRUD + file proxy + text extraction |
| `src/controllers/coverLetter.controller.js` | Cover letter CRUD + file proxy + text extraction |
| `src/controllers/job.controller.js` | Job search (all providers) + list/get + apply |
| `src/controllers/ai.controller.js` | Skill suggestions, cover letter gen, resume gen, translate |
| `src/controllers/resumake.controller.js` | Resumake generate + compile PDF |
| `src/controllers/extension.controller.js` | Extension context store/retrieve + download |
| `src/controllers/jobTracker.controller.js` | Job tracker CRUD |
| `src/controllers/apiKey.controller.js` | API key providers + user keys CRUD |
| `src/controllers/analytics.controller.js` | Analytics stats |
| `src/routes/health.routes.js` | Mount health endpoints |
| `src/routes/auth.routes.js` | Mount auth endpoints |
| `src/routes/profile.routes.js` | Mount profile endpoints |
| `src/routes/autofill.routes.js` | Mount autofill endpoints |
| `src/routes/resume.routes.js` | Mount resume endpoints |
| `src/routes/coverLetter.routes.js` | Mount cover letter endpoints |
| `src/routes/job.routes.js` | Mount job endpoints |
| `src/routes/ai.routes.js` | Mount AI endpoints |
| `src/routes/resumake.routes.js` | Mount resumake endpoints |
| `src/routes/extension.routes.js` | Mount extension endpoints |
| `src/routes/jobTracker.routes.js` | Mount job tracker endpoints |
| `src/routes/apiKey.routes.js` | Mount API key endpoints |
| `src/routes/analytics.routes.js` | Mount analytics endpoints |

### Modify

| File | Change |
|------|--------|
| `package.json` | Update `start` and `dev` scripts to `src/server.js` |

### Preserve (no changes)

`resumake/`, `migrations/`, `schema/`, `.env`, `.env.example`

---

### Task 1: Config layer — `env.js`, `db.js`, `cloudinary.js`

**Files:**
- Create: `src/config/env.js`
- Create: `src/config/db.js`
- Create: `src/config/cloudinary.js`

- [ ] **Step 1: Create `src/config/env.js`**

```js
require('dotenv').config()

const freeKey = process.env.FREE_JOB_API_KEY || process.env.free_job_api_key || ''

module.exports = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  PASSWORD_SALT: process.env.PASSWORD_SALT || '',
  ADZUNA_APP_ID: process.env.ADZUNA_APP_ID || freeKey,
  ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY || freeKey,
  JOOBLE_API_KEY: process.env.JOOBLE_API_KEY || '',
  REED_API_KEY: process.env.REED_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  GEMINI_URL: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  AUTOFILL_LLM_URL: (process.env.AUTOFILL_LLM_URL || '').trim(),
  AUTOFILL_LLM_API_KEY: (process.env.AUTOFILL_LLM_API_KEY || '').trim(),
  CLOUDINARY_CLOUD_NAME: process.env.cloudinary_cloud_name || process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.cloudinary_api_key || process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET || '',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '',
}
```

- [ ] **Step 2: Create `src/config/db.js`**

```js
const { Pool } = require('pg')
const { DATABASE_URL } = require('./env')

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

module.exports = pool
```

- [ ] **Step 3: Create `src/config/cloudinary.js`**

```js
const cloudinary = require('cloudinary').v2
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require('./env')

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  })
}

module.exports = cloudinary
```

- [ ] **Step 4: Commit**

```bash
git add Backend/Node/src/config/
git commit -m "refactor: extract config layer (env, db, cloudinary)"
```

---

### Task 2: Utils — `password.js`, `constants.js`, `helpers.js`

**Files:**
- Create: `src/utils/password.js`
- Create: `src/utils/constants.js`
- Create: `src/utils/helpers.js`

- [ ] **Step 1: Create `src/utils/password.js`**

```js
const { PASSWORD_SALT } = require('../config/env')

function saltedPassword(password) {
  return PASSWORD_SALT + password
}

module.exports = { saltedPassword }
```

- [ ] **Step 2: Create `src/utils/constants.js`**

Copy from server.js lines 344-356 (`AUTOFILL_FIELD_KEYS`), lines 755-771 (`COUNTRY_LOCATION_MAP`, `COUNTRY_TO_JOOBLE_LOCATION`), lines 940-948 (`OPENAI_COMPATIBLE_MODELS`), lines 2297-2306 (`DEFAULT_API_KEY_PROVIDERS`), lines 1275-1339 (`RESUME_SYSTEM_PROMPTS`, `RESUME_USER_PROMPT_INTROS`), and lines 1398-1408 (`templateDescriptions`).

```js
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

const COUNTRY_LOCATION_MAP = {
  in: ['india'],
  gb: ['united kingdom', 'uk', 'england', 'scotland', 'wales'],
  us: ['united states', 'usa', ' u.s.', ' u.s.a.'],
  au: ['australia'],
  de: ['germany', 'deutschland'],
  br: ['brazil', 'brasil'],
}

const COUNTRY_TO_JOOBLE_LOCATION = {
  in: 'India',
  gb: 'United Kingdom',
  us: 'United States',
  au: 'Australia',
  de: 'Germany',
  br: 'Brazil',
}

const OPENAI_COMPATIBLE_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  openrouter: 'openai/gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Llama-3-70b-chat-hf',
  mistral: 'mistral-small-latest',
  cohere: 'command',
}

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

const TEMPLATE_DESCRIPTIONS = {
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

module.exports = {
  AUTOFILL_FIELD_KEYS,
  COUNTRY_LOCATION_MAP,
  COUNTRY_TO_JOOBLE_LOCATION,
  OPENAI_COMPATIBLE_MODELS,
  DEFAULT_API_KEY_PROVIDERS,
  RESUME_SYSTEM_PROMPTS,
  RESUME_USER_PROMPT_INTROS,
  TEMPLATE_DESCRIPTIONS,
}
```

- [ ] **Step 3: Create `src/utils/helpers.js`**

```js
const { AUTOFILL_FIELD_KEYS, COUNTRY_LOCATION_MAP } = require('./constants')

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

function locationMatchesCountry(jobLocation, countryCode) {
  if (!countryCode) return true
  const loc = (jobLocation || '').trim()
  if (!loc) return false
  const terms = COUNTRY_LOCATION_MAP[countryCode.toLowerCase()]
  if (!terms) return true
  return terms.some((t) => loc.toLowerCase().includes(t))
}

function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '••••••••'
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '••••••••'
  return trimmed.slice(0, 4) + '••••••••' + trimmed.slice(-4)
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function extractJsonObject(str) {
  if (!str || typeof str !== 'string') return null
  const start = str.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  let quote = ''
  for (let i = start; i < str.length; i++) {
    const c = str[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (inString) {
      if (c === quote) inString = false
      continue
    }
    if (c === '"' || c === "'") { inString = true; quote = c; continue }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return str.slice(start, i + 1)
    }
  }
  return null
}

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

module.exports = {
  mergeAutofillWithProfile,
  locationMatchesCountry,
  maskApiKey,
  pickRandom,
  extractJsonObject,
  translateWithMyMemory,
}
```

- [ ] **Step 4: Commit**

```bash
git add Backend/Node/src/utils/
git commit -m "refactor: extract utils (password, constants, helpers)"
```

---

### Task 3: Middleware — `auth.js`, `requireDb.js`, `upload.js`, `errorHandler.js`

**Files:**
- Create: `src/middleware/auth.js`
- Create: `src/middleware/requireDb.js`
- Create: `src/middleware/upload.js`
- Create: `src/middleware/errorHandler.js`

- [ ] **Step 1: Create `src/middleware/auth.js`**

```js
function auth(req, res, next) {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })
  req.userId = userId
  next()
}

module.exports = auth
```

- [ ] **Step 2: Create `src/middleware/requireDb.js`**

```js
const pool = require('../config/db')

function requireDb(req, res, next) {
  if (!pool) return res.status(503).json({ error: 'Database not configured' })
  next()
}

module.exports = requireDb
```

- [ ] **Step 3: Create `src/middleware/upload.js`**

```js
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
```

- [ ] **Step 4: Create `src/middleware/errorHandler.js`**

```js
const multer = require('multer')

function handleDbError(err, context) {
  const code = err.code || (err.errno && String(err.errno))
  const message = err.message || ''

  if (code === 'ENOTFOUND' || code === 'ENOENT' || message.includes('getaddrinfo')) {
    console.error(`${context}: Database host not found (check DATABASE_URL and network)`, err.message)
    return { status: 503, body: { error: 'Database unavailable. Check connection settings and network.' } }
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    console.error(`${context}: Database connection failed`, err.message)
    return { status: 503, body: { error: 'Database unavailable. Cannot reach the database server.' } }
  }
  if (code === 'EADDRNOTAVAIL' || code === 'ENETUNREACH') {
    console.error(`${context}: Database network error`, err.message)
    return { status: 503, body: { error: 'Database unavailable. Network or SSL configuration issue.' } }
  }
  if (code === '28P01' || message.includes('password')) {
    console.error(`${context}: Database authentication failed`, err.message)
    return { status: 503, body: { error: 'Database configuration error. Check credentials.' } }
  }
  if (code === '23505') return { status: 409, body: { error: 'An account with this email already exists' } }
  if (code === '23503') return { status: 400, body: { error: 'User not found' } }

  console.error(`${context}:`, err)
  return { status: 500, body: { error: 'Something went wrong. Please try again.' } }
}

function errorHandler(err, req, res, next) {
  // Multer file size errors
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large.' })
  }
  // Multer / file filter errors
  if (err.message && (err.message.includes('Only') || err.message.includes('allowed'))) {
    return res.status(400).json({ error: err.message })
  }
  // DB errors tagged with context
  if (err.dbContext) {
    const { status, body } = handleDbError(err, err.dbContext)
    return res.status(status).json(body)
  }
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}

module.exports = { handleDbError, errorHandler }
```

- [ ] **Step 5: Commit**

```bash
git add Backend/Node/src/middleware/
git commit -m "refactor: extract middleware (auth, requireDb, upload, errorHandler)"
```

---

### Task 4: Services — `cloudinary.service.js`, `ai.service.js`, `jobSearch.service.js`

**Files:**
- Create: `src/services/cloudinary.service.js`
- Create: `src/services/ai.service.js`
- Create: `src/services/jobSearch.service.js`

- [ ] **Step 1: Create `src/services/cloudinary.service.js`**

```js
const cloudinary = require('../config/cloudinary')

function uploadToCloudinary(buffer, folder, options = {}) {
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

module.exports = { uploadToCloudinary }
```

- [ ] **Step 2: Create `src/services/ai.service.js`**

Extract `generateWithUserKey` (lines 950-1021), `autofillLlmGenerate` (lines 489-547), `autofillGenerate` (lines 550-569), and `geminiGenerate` (lines 572-590) from server.js. These functions call external AI APIs. `autofillGenerate` needs to call `getDefaultApiKeyId` from the apiKey model, so we pass the pool-query function as a dependency rather than importing the model directly (to avoid circular deps).

```js
const { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_URL, AUTOFILL_LLM_URL, AUTOFILL_LLM_API_KEY } = require('../config/env')
const { OPENAI_COMPATIBLE_MODELS } = require('../utils/constants')

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
    const model = optionalModel || GEMINI_MODEL
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

async function autofillLlmGenerate(prompt, systemInstruction) {
  const timeoutMs = 25000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    if (AUTOFILL_LLM_URL) {
      const headers = { 'Content-Type': 'application/json' }
      if (AUTOFILL_LLM_API_KEY) headers.Authorization = 'Bearer ' + AUTOFILL_LLM_API_KEY
      const body = { prompt, system: systemInstruction || '' }
      const resp = await fetch(AUTOFILL_LLM_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        console.warn('Autofill custom API error:', resp.status, data?.error || data?.message)
        return null
      }
      const text = data?.text ?? data?.content ?? data?.choices?.[0]?.message?.content ?? data?.result ?? data?.output
      return typeof text === 'string' ? text.trim() : null
    }

    if (!GEMINI_API_KEY) {
      console.warn('Autofill: no AUTOFILL_LLM_URL and no GEMINI_API_KEY')
      return null
    }
    const model = GEMINI_MODEL
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    }
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] }
    const url = GEMINI_URL(model) + '?key=' + encodeURIComponent(GEMINI_API_KEY)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const data = await resp.json()
    if (!resp.ok) {
      console.warn('Gemini API error:', data?.error?.message || resp.status)
      return null
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return text ? text.trim() : null
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('Autofill LLM request failed:', err.message)
    return null
  }
}

async function autofillGenerate(prompt, systemInstruction, userId, apiKeyId, resolveUserKey) {
  if (userId && apiKeyId && resolveUserKey) {
    try {
      const keyInfo = await resolveUserKey(userId, apiKeyId)
      if (keyInfo) {
        const text = await generateWithUserKey(prompt, systemInstruction, keyInfo.provider_slug, keyInfo.api_key_enc, null)
        return text ? text.trim() : null
      }
    } catch (err) {
      console.warn('Autofill user API key failed:', err.message)
    }
  }
  return await autofillLlmGenerate(prompt, systemInstruction)
}

async function geminiGenerate(prompt, systemInstruction) {
  if (!GEMINI_API_KEY) return null
  const model = GEMINI_MODEL
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
  }
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] }
  const url = GEMINI_URL(model) + '?key=' + encodeURIComponent(GEMINI_API_KEY)
  try {
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await resp.json()
    if (!resp.ok) return null
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return text ? text.trim() : null
  } catch {
    return null
  }
}

module.exports = {
  generateWithUserKey,
  autofillLlmGenerate,
  autofillGenerate,
  geminiGenerate,
}
```

- [ ] **Step 3: Create `src/services/jobSearch.service.js`**

```js
const { ADZUNA_APP_ID, ADZUNA_APP_KEY, JOOBLE_API_KEY, REED_API_KEY } = require('../config/env')
const { COUNTRY_TO_JOOBLE_LOCATION } = require('../utils/constants')
const { locationMatchesCountry } = require('../utils/helpers')

async function searchAdzuna({ country = 'us', page = 1, what, where, salary_min, salary_max, full_time, permanent, sort_by, results_per_page }) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return { error: 'Job search not configured (set FREE_JOB_API_KEY or ADZUNA_APP_ID/ADZUNA_APP_KEY in .env)', status: 503 }
  }
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    'content-type': 'application/json',
    results_per_page: String(Math.min(50, Math.max(10, parseInt(results_per_page, 10) || 20))),
  })
  if (what) params.set('what', what.toString().trim())
  if (where) params.set('where', where.toString().trim())
  if (salary_min) params.set('salary_min', salary_min.toString())
  if (salary_max) params.set('salary_max', salary_max.toString())
  if (full_time === '1' || full_time === 'true') params.set('full_time', '1')
  if (permanent === '1' || permanent === 'true') params.set('permanent', '1')
  if (sort_by) params.set('sort_by', sort_by.toString())

  const cleanCountry = country.toLowerCase().replace(/[^a-z]/g, '') || 'us'
  const cleanPage = Math.max(1, parseInt(page, 10) || 1)
  const url = `https://api.adzuna.com/v1/api/jobs/${cleanCountry}/search/${cleanPage}?${params}`
  const resp = await fetch(url, { headers: { Accept: 'application/json' } })
  const text = await resp.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch (parseErr) {
    console.error('Adzuna API returned non-JSON. First 200 chars:', text.slice(0, 200))
    return { error: 'Job API returned invalid response. Check that the backend is running and Adzuna credentials are set.', status: 502 }
  }
  if (!resp.ok) {
    const msg = data?.display || data?.error || data?.exception || 'Adzuna API error'
    if (resp.status === 401 || (data && (data.exception === 'AUTH_FAIL' || data.exception === 'Unauthorized'))) {
      console.error('Adzuna auth failed. Get separate app_id and app_key from https://developer.adzuna.com')
      return { error: 'Job API credentials invalid. Get app_id and app_key from https://developer.adzuna.com (login → API dashboard).', status: 401 }
    }
    return { data: data || { error: msg }, status: resp.status }
  }
  return { data }
}

async function searchJooble({ keywords = '', location = '', country = null, page = 1 }) {
  if (!JOOBLE_API_KEY) {
    return { error: 'Jooble job search not configured (set JOOBLE_API_KEY in .env)', status: 503 }
  }
  const cleanCountry = country ? country.toLowerCase().replace(/[^a-z]/g, '') : null
  const joobleLocation = location || (cleanCountry && COUNTRY_TO_JOOBLE_LOCATION[cleanCountry]) || ' '
  const url = `https://jooble.org/api/${JOOBLE_API_KEY}`
  const body = JSON.stringify({
    keywords: keywords || 'jobs',
    location: joobleLocation,
    page: String(Math.max(1, parseInt(page, 10) || 1)),
    companysearch: 'false',
  })

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
    return { error: 'Job API returned invalid response. Check that the backend is running and Jooble key is set.', status: 502 }
  }
  if (!resp.ok) {
    const msg = data?.message || data?.error || (resp.status === 403 ? 'Invalid Jooble API key' : 'Jooble API error')
    return { data: data || { error: msg }, status: resp.status === 403 ? 401 : resp.status }
  }
  let results = Array.isArray(data.jobs) ? data.jobs : []
  const alreadySearchedByCountry = !location && cleanCountry && COUNTRY_TO_JOOBLE_LOCATION[cleanCountry]
  if (cleanCountry && !alreadySearchedByCountry) {
    results = results.filter((job) => locationMatchesCountry(job.location, cleanCountry))
  }
  const totalCount = typeof data.totalCount === 'number' ? data.totalCount : results.length
  return { data: { count: totalCount, results } }
}

async function searchArbeitnow({ keywords = '', location = '', country = null }) {
  const kw = keywords.toLowerCase()
  const loc = location.toLowerCase()
  const cleanCountry = country ? country.toLowerCase().replace(/[^a-z]/g, '') : null
  const url = 'https://www.arbeitnow.com/api/job-board-api'
  const resp = await fetch(url, { headers: { Accept: 'application/json' } })
  const text = await resp.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch (parseErr) {
    console.error('Arbeitnow API returned non-JSON. First 200 chars:', text.slice(0, 200))
    return { error: 'Job API returned invalid response. Check that the backend is running.', status: 502 }
  }
  if (!resp.ok) {
    return { data: data || { error: 'Arbeitnow API error' }, status: resp.status }
  }
  let results = Array.isArray(data?.data) ? data.data : []
  if (kw || loc) {
    results = results.filter((job) => {
      const title = (job.title || '').toLowerCase()
      const desc = (job.description || '').toLowerCase()
      const company = (job.company_name || '').toLowerCase()
      const jobLoc = (job.location || '').toLowerCase()
      const matchKw = !kw || title.includes(kw) || desc.includes(kw) || company.includes(kw)
      const matchLoc = !loc || jobLoc.includes(loc)
      return matchKw && matchLoc
    })
  }
  if (cleanCountry) {
    results = results.filter((job) => locationMatchesCountry(job.location, cleanCountry))
  }
  return { data: { count: results.length, results } }
}

async function searchReed({ keywords = '', locationName = '', resultsToTake = 20, resultsToSkip = 0 }) {
  if (!REED_API_KEY) {
    return { error: 'Reed job search not configured (set REED_API_KEY in .env)', status: 503 }
  }
  const params = new URLSearchParams()
  if (keywords) params.set('keywords', keywords.trim())
  if (locationName) params.set('locationName', locationName.trim())
  params.set('resultsToTake', String(Math.min(100, Math.max(1, parseInt(resultsToTake, 10) || 20))))
  params.set('resultsToSkip', String(Math.max(0, parseInt(resultsToSkip, 10) || 0)))
  const url = `https://www.reed.co.uk/api/1.0/search?${params}`
  const auth = Buffer.from(`${REED_API_KEY}:`, 'utf8').toString('base64')
  const resp = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Basic ${auth}` },
  })
  const text = await resp.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch (parseErr) {
    console.error('Reed API returned non-JSON. First 200 chars:', text.slice(0, 200))
    return { error: 'Job API returned invalid response. Check that the backend is running and Reed key is set.', status: 502 }
  }
  if (!resp.ok) {
    const msg = data?.message || data?.error || (resp.status === 401 ? 'Invalid Reed API key' : 'Reed API error')
    return { data: data || { error: msg }, status: resp.status === 401 ? 401 : resp.status }
  }
  const results = Array.isArray(data?.results) ? data.results : []
  const total = typeof data.totalResults === 'number' ? data.totalResults : results.length
  return { data: { count: total, results } }
}

module.exports = { searchAdzuna, searchJooble, searchArbeitnow, searchReed }
```

- [ ] **Step 4: Commit**

```bash
git add Backend/Node/src/services/
git commit -m "refactor: extract services (cloudinary, ai, jobSearch)"
```

---

### Task 5: Models — all model files

**Files:** Create all 10 model files under `src/models/`

Each model file imports pool from `../config/db` and exports functions that execute SQL queries and return plain results. No HTTP concerns.

- [ ] **Step 1: Create `src/models/user.model.js`**

```js
const pool = require('../config/db')

async function createUser(name, email, passwordHash) {
  const { rows } = await pool.query(
    `insert into public.users (name, email, password_hash)
     values ($1, $2, $3)
     returning id, name, email, email_verified, created_at`,
    [name, email, passwordHash]
  )
  return rows[0]
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    'select id, name, email, password_hash, email_verified from public.users where email = $1',
    [email]
  )
  return rows[0] || null
}

async function getEmailById(userId) {
  const { rows } = await pool.query('select email from public.users where id = $1', [userId])
  return rows[0] || null
}

module.exports = { createUser, findByEmail, getEmailById }
```

- [ ] **Step 2: Create `src/models/profile.model.js`**

```js
const pool = require('../config/db')

async function getByUserId(userId) {
  const { rows } = await pool.query(
    'select id, user_id, display_name, headline, summary, location, location_country, state, profile_image_url, phone, website_url, linkedin_url, created_at, updated_at from public.user_profiles where user_id = $1',
    [userId]
  )
  return rows[0] || null
}

async function getAutofillFields(userId) {
  const { rows } = await pool.query(
    'select display_name, headline, summary, location, location_country, state, phone, website_url, linkedin_url from public.user_profiles where user_id = $1',
    [userId]
  )
  return rows[0] || null
}

async function upsert(userId, fields) {
  const { rows } = await pool.query(
    `insert into public.user_profiles (user_id, display_name, headline, summary, location, location_country, state, profile_image_url, phone, website_url, linkedin_url)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (user_id) do update set
       display_name = $2, headline = $3, summary = $4, location = $5, location_country = $6,
       state = $7, profile_image_url = $8, phone = $9, website_url = $10, linkedin_url = $11, updated_at = now()
     returning id, user_id, display_name, headline, summary, location, location_country, state, profile_image_url, phone, website_url, linkedin_url, created_at, updated_at`,
    [
      userId,
      fields.display_name,
      fields.headline,
      fields.summary,
      fields.location,
      fields.location_country,
      fields.state,
      fields.profile_image_url,
      fields.phone,
      fields.website_url,
      fields.linkedin_url,
    ]
  )
  return rows[0]
}

async function updatePhoto(userId, url) {
  const { rowCount, rows } = await pool.query(
    'update public.user_profiles set profile_image_url = $1, updated_at = now() where user_id = $2 returning profile_image_url',
    [url, userId]
  )
  return rowCount > 0 ? rows[0] : null
}

module.exports = { getByUserId, getAutofillFields, upsert, updatePhoto }
```

- [ ] **Step 3: Create `src/models/autofill.model.js`**

```js
const pool = require('../config/db')

async function getByUserId(userId) {
  const { rows } = await pool.query(
    'select data, excluded_field_keys from public.user_autofill where user_id = $1',
    [userId]
  )
  return rows[0] || null
}

async function upsert(userId, data, excludedFieldKeys) {
  await pool.query(
    `insert into public.user_autofill (user_id, data, excluded_field_keys, updated_at)
     values ($1, $2::jsonb, $3::jsonb, now())
     on conflict (user_id) do update set data = $2::jsonb, excluded_field_keys = $3::jsonb, updated_at = now()`,
    [userId, JSON.stringify(data), JSON.stringify(excludedFieldKeys)]
  )
}

async function getCustomFields(userId) {
  try {
    const { rows } = await pool.query(
      'select id, field_key, field_value from public.user_autofill_custom_fields where user_id = $1 order by display_order asc, created_at asc',
      [userId]
    )
    return rows
  } catch (_) {
    return []
  }
}

async function replaceCustomFields(userId, customFields) {
  try {
    await pool.query('delete from public.user_autofill_custom_fields where user_id = $1', [userId])
    for (let i = 0; i < customFields.length; i++) {
      const p = customFields[i]
      await pool.query(
        `insert into public.user_autofill_custom_fields (user_id, field_key, field_value, display_order, updated_at)
         values ($1, $2, $3, $4, now())`,
        [userId, p.field_key, p.field_value, i]
      )
    }
  } catch (_) {}
}

module.exports = { getByUserId, upsert, getCustomFields, replaceCustomFields }
```

- [ ] **Step 4: Create `src/models/resume.model.js`**

```js
const pool = require('../config/db')

async function listByUserId(userId) {
  try {
    const { rows } = await pool.query(
      'select id, name, file_url, is_primary, uploaded_at, html_content from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc',
      [userId]
    )
    return rows
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await pool.query(
        'select id, name, file_url, is_primary, uploaded_at from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc',
        [userId]
      )
      return rows
    }
    throw err
  }
}

async function create(userId, name, fileUrl, isPrimary, htmlContent) {
  if (isPrimary) {
    await pool.query('update public.resumes set is_primary = false where user_id = $1', [userId])
  }
  try {
    const { rows } = await pool.query(
      `insert into public.resumes (user_id, name, file_url, is_primary, html_content)
       values ($1, $2, $3, $4, $5)
       returning id, name, file_url, is_primary, uploaded_at, html_content`,
      [userId, name, fileUrl, isPrimary, htmlContent]
    )
    return rows[0]
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await pool.query(
        `insert into public.resumes (user_id, name, file_url, is_primary)
         values ($1, $2, $3, $4)
         returning id, name, file_url, is_primary, uploaded_at`,
        [userId, name, fileUrl, isPrimary]
      )
      return rows[0]
    }
    throw err
  }
}

async function getContentById(id, userId) {
  const { rows } = await pool.query(
    'select html_content, file_url from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  return rows[0] || null
}

async function getFileUrlById(id, userId) {
  const { rows } = await pool.query(
    'select file_url from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  return rows[0] || null
}

async function deleteById(id, userId) {
  const { rowCount } = await pool.query(
    'delete from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  return rowCount > 0
}

async function update(id, userId, fields) {
  const own = await pool.query(
    'select id, name, file_url, html_content from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  if (!own.rows[0]) return null
  const updates = []
  const values = []
  let v = 1
  if (fields.name !== undefined) { updates.push(`name = $${v++}`); values.push(fields.name) }
  if (fields.htmlContent !== undefined) { updates.push(`html_content = $${v++}`); values.push(fields.htmlContent) }
  if (fields.fileUrl !== undefined) { updates.push(`file_url = $${v++}`); values.push(fields.fileUrl) }
  values.push(id, userId)
  try {
    const { rows } = await pool.query(
      `update public.resumes set ${updates.join(', ')} where id = $${v} and user_id = $${v + 1} returning id, name, file_url, is_primary, uploaded_at, html_content`,
      values
    )
    return rows[0]
  } catch (err) {
    if (err.code === '42703') {
      const updates2 = []
      const values2 = []
      let v2 = 1
      if (fields.name !== undefined) { updates2.push(`name = $${v2++}`); values2.push(fields.name) }
      if (fields.fileUrl !== undefined) { updates2.push(`file_url = $${v2++}`); values2.push(fields.fileUrl) }
      if (updates2.length === 0) return null
      values2.push(id, userId)
      const { rows } = await pool.query(
        `update public.resumes set ${updates2.join(', ')} where id = $${v2} and user_id = $${v2 + 1} returning id, name, file_url, is_primary, uploaded_at`,
        values2
      )
      return rows[0]
    }
    throw err
  }
}

async function setPrimary(id, userId) {
  const own = await pool.query('select id from public.resumes where id = $1 and user_id = $2', [id, userId])
  if (!own.rows[0]) return false
  await pool.query('update public.resumes set is_primary = false where user_id = $1', [userId])
  await pool.query('update public.resumes set is_primary = true where id = $1 and user_id = $2', [id, userId])
  return true
}

async function getPrimaryOrFirst(userId) {
  const { rows } = await pool.query(
    'select id from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc limit 1',
    [userId]
  )
  return rows[0] || null
}

async function existsForUser(id, userId) {
  const { rows } = await pool.query(
    'select id from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  return !!rows[0]
}

module.exports = { listByUserId, create, getContentById, getFileUrlById, deleteById, update, setPrimary, getPrimaryOrFirst, existsForUser }
```

- [ ] **Step 5: Create `src/models/coverLetter.model.js`**

```js
const pool = require('../config/db')

async function listByUserId(userId) {
  try {
    const { rows } = await pool.query(
      'select id, user_id, job_id, title, file_url, created_at, html_content from public.cover_letters where user_id = $1 order by created_at desc',
      [userId]
    )
    return rows
  } catch (err) {
    if (err.code === '42P01') return []
    throw err
  }
}

async function create(userId, title, fileUrl) {
  const { rows } = await pool.query(
    `insert into public.cover_letters (user_id, title, file_url) values ($1, $2, $3) returning id, user_id, job_id, title, file_url, created_at`,
    [userId, title, fileUrl]
  )
  return rows[0]
}

async function getContentById(id, userId) {
  const { rows } = await pool.query(
    'select html_content, file_url from public.cover_letters where id = $1 and user_id = $2',
    [id, userId]
  )
  return rows[0] || null
}

async function getFileUrlById(id, userId) {
  const { rows } = await pool.query(
    'select file_url from public.cover_letters where id = $1 and user_id = $2',
    [id, userId]
  )
  return rows[0] || null
}

async function update(id, userId, fields) {
  const updates = []
  const values = []
  let v = 1
  if (fields.title !== undefined) {
    updates.push(`title = $${v++}`)
    values.push(fields.title)
  }
  if (fields.htmlContent !== undefined) {
    updates.push(`html_content = $${v++}`)
    values.push(fields.htmlContent)
  }
  values.push(id, userId)
  const { rows } = await pool.query(
    `update public.cover_letters set ${updates.join(', ')} where id = $${v} and user_id = $${v + 1} returning id, title, file_url, created_at, html_content`,
    values
  )
  return rows[0] || null
}

async function deleteById(id, userId) {
  const { rowCount } = await pool.query(
    'delete from public.cover_letters where id = $1 and user_id = $2',
    [id, userId]
  )
  return rowCount > 0
}

module.exports = { listByUserId, create, getContentById, getFileUrlById, update, deleteById }
```

- [ ] **Step 6: Create `src/models/job.model.js`**

```js
const pool = require('../config/db')

async function list(q, limit) {
  const safeLimit = Math.min(parseInt(limit, 10) || 50, 100)
  if (q) {
    const { rows } = await pool.query(
      `select j.id, j.title, j.job_type, j.employment_type, j.location, j.is_remote, j.posted_at,
              j.company_id, c.name as company_name, c.logo_url as company_logo_url
       from public.jobs j
       join public.companies c on c.id = j.company_id
       where j.status = 'ACTIVE'
         and (j.title ilike $1 or c.name ilike $1)
       order by j.posted_at desc
       limit $2`,
      [`%${q}%`, safeLimit]
    )
    return rows
  }
  const { rows } = await pool.query(
    `select j.id, j.title, j.job_type, j.employment_type, j.location, j.is_remote, j.posted_at,
            j.company_id, c.name as company_name, c.logo_url as company_logo_url
     from public.jobs j
     join public.companies c on c.id = j.company_id
     where j.status = 'ACTIVE'
     order by j.posted_at desc
     limit $1`,
    [safeLimit]
  )
  return rows
}

async function getById(id) {
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
  return rows[0] || null
}

async function exists(id) {
  const { rows } = await pool.query(
    "select id from public.jobs where id = $1 and status = 'ACTIVE'",
    [id]
  )
  return !!rows[0]
}

module.exports = { list, getById, exists }
```

- [ ] **Step 7: Create `src/models/jobApplication.model.js`**

```js
const pool = require('../config/db')

async function upsert(userId, jobId, resumeId, coverLetterText) {
  await pool.query(
    `insert into public.job_applications (user_id, job_id, resume_id, cover_letter_text, application_status, applied_at)
     values ($1, $2, $3, $4, 'SUBMITTED', now())
     on conflict (user_id, job_id) do update set resume_id = $3, cover_letter_text = $4, application_status = 'SUBMITTED', applied_at = now(), updated_at = now()`,
    [userId, jobId, resumeId, coverLetterText]
  )
}

async function hasApplied(userId, jobId) {
  const { rows } = await pool.query(
    'select 1 from public.job_applications where user_id = $1 and job_id = $2',
    [userId, jobId]
  )
  return !!rows[0]
}

module.exports = { upsert, hasApplied }
```

- [ ] **Step 8: Create `src/models/jobTracker.model.js`**

```js
const pool = require('../config/db')

async function create(userId, fields) {
  const { rows } = await pool.query(
    `insert into public.job_tracker (
      user_id, company_name, position_title, location,
      min_salary, max_salary, currency, salary_period, job_type,
      job_description, notes, application_status, job_posting_url
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    returning id, company_name, position_title, location, created_at`,
    [
      userId,
      fields.company_name ?? null,
      fields.position_title ?? null,
      fields.location ?? null,
      fields.min_salary != null ? Number(fields.min_salary) : null,
      fields.max_salary != null ? Number(fields.max_salary) : null,
      fields.currency ?? null,
      fields.salary_period ?? null,
      fields.job_type ?? null,
      fields.job_description ?? null,
      fields.notes ?? null,
      fields.application_status ?? 'not_applied',
      fields.job_posting_url ?? null,
    ]
  )
  return rows[0]
}

async function listByUserId(userId) {
  const { rows } = await pool.query(
    `select id, company_name, position_title, location, min_salary, max_salary, currency, salary_period, job_type,
     job_description, notes, application_status, job_posting_url, created_at, updated_at
     from public.job_tracker where user_id = $1 order by created_at desc`,
    [userId]
  )
  return rows
}

module.exports = { create, listByUserId }
```

- [ ] **Step 9: Create `src/models/apiKey.model.js`**

```js
const pool = require('../config/db')
const { DEFAULT_API_KEY_PROVIDERS } = require('../utils/constants')

async function getDefaultApiKeyId(userId) {
  if (!pool || !userId) return null
  try {
    const { rows } = await pool.query(
      'select id from public.user_api_keys where user_id = $1 and is_default = true and is_active = true limit 1',
      [userId]
    )
    return rows[0] ? rows[0].id : null
  } catch (e) {
    if (e.code === '42703') return null
    throw e
  }
}

async function resolveUserKey(userId, apiKeyId) {
  if (!pool) return null
  const { rows } = await pool.query(
    `select k.api_key_enc, p.slug as provider_slug from public.user_api_keys k
     join public.api_key_providers p on p.id = k.provider_id
     where k.user_id = $1 and k.id = $2`,
    [userId, apiKeyId]
  )
  return rows[0] || null
}

async function resolveActiveUserKey(userId, apiKeyId) {
  if (!pool) return null
  const { rows } = await pool.query(
    `select k.api_key_enc, p.slug as provider_slug
     from public.user_api_keys k
     join public.api_key_providers p on p.id = k.provider_id
     where k.user_id = $1 and k.id = $2 and k.is_active = true`,
    [userId, apiKeyId]
  )
  return rows[0] || null
}

function getStaticProvidersList() {
  return DEFAULT_API_KEY_PROVIDERS.map((p) => ({
    id: p.slug,
    slug: p.slug,
    name: p.name,
    description: p.description,
    base_url: p.base_url,
  }))
}

async function listProviders() {
  if (!pool) return getStaticProvidersList()
  try {
    let { rows } = await pool.query(
      'select id, slug, name, description, base_url from public.api_key_providers order by display_order, name'
    )
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
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name || r.slug || 'Unknown',
      description: r.description,
      base_url: r.base_url,
    }))
  } catch {
    return getStaticProvidersList()
  }
}

async function listByUserId(userId) {
  const { rows } = await pool.query(
    `select k.id, k.user_id, k.provider_id, k.label, k.is_active, k.is_default, k.last_used_at, k.created_at, k.updated_at,
            k.api_key_enc, p.slug as provider_slug, p.name as provider_name
     from public.user_api_keys k
     join public.api_key_providers p on p.id = k.provider_id
     where k.user_id = $1
     order by (k.is_default = true) desc nulls last, p.display_order, p.name, k.created_at`,
    [userId]
  )
  return rows
}

async function listByUserIdFallback(userId) {
  const { rows } = await pool.query(
    `select k.id, k.user_id, k.provider_id, k.label, k.is_active, k.last_used_at, k.created_at, k.updated_at,
            k.api_key_enc, p.slug as provider_slug, p.name as provider_name
     from public.user_api_keys k
     join public.api_key_providers p on p.id = k.provider_id
     where k.user_id = $1
     order by p.display_order, p.name, k.created_at`,
    [userId]
  )
  return rows
}

async function resolveProviderId(providerIdOrSlug) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(String(providerIdOrSlug))) return providerIdOrSlug

  const slug = String(providerIdOrSlug).trim()
  const bySlug = await pool.query(
    'select id, slug, name from public.api_key_providers where slug = $1',
    [slug]
  )
  if (bySlug.rows[0]) return bySlug.rows[0].id

  const def = DEFAULT_API_KEY_PROVIDERS.find((p) => p.slug === slug)
  if (def) {
    const ins = await pool.query(
      `insert into public.api_key_providers (slug, name, description, base_url, display_order)
       values ($1, $2, $3, $4, $5) on conflict (slug) do update set name = $2 returning id`,
      [def.slug, def.name, def.description || null, def.base_url || null, def.display_order]
    )
    return ins.rows[0].id
  }
  return providerIdOrSlug
}

async function createKey(userId, providerId, label, apiKeyEnc) {
  const { rows } = await pool.query(
    `insert into public.user_api_keys (user_id, provider_id, label, api_key_enc)
     values ($1, $2, $3, $4)
     returning id, user_id, provider_id, label, is_active, created_at, updated_at`,
    [userId, providerId, label, apiKeyEnc]
  )
  return rows[0]
}

async function getProviderInfo(providerId) {
  const { rows } = await pool.query(
    'select slug, name from public.api_key_providers where id = $1',
    [providerId]
  )
  return rows[0] || null
}

async function clearDefaults(userId) {
  try {
    await pool.query(
      'update public.user_api_keys set is_default = false, updated_at = now() where user_id = $1',
      [userId]
    )
  } catch (e) {
    if (e.code !== '42703') throw e
  }
}

async function updateKey(id, userId, fields) {
  const updates = []
  const values = []
  let idx = 1
  if (typeof fields.api_key === 'string' && fields.api_key.trim()) {
    updates.push(`api_key_enc = $${idx++}`)
    values.push(fields.api_key.trim())
  }
  if (fields.label !== undefined) {
    updates.push(`label = $${idx++}`)
    values.push(typeof fields.label === 'string' ? fields.label.trim() || null : null)
  }
  if (typeof fields.is_active === 'boolean') {
    updates.push(`is_active = $${idx++}`)
    values.push(fields.is_active)
  }
  if (typeof fields.is_default === 'boolean') {
    updates.push(`is_default = $${idx++}`)
    values.push(fields.is_default)
  }
  updates.push('updated_at = now()')
  values.push(id, userId)
  const idParam = idx
  const userIdParam = idx + 1
  const { rows } = await pool.query(
    `update public.user_api_keys set ${updates.join(', ')} where id = $${idParam} and user_id = $${userIdParam} returning id, provider_id, label, is_active, is_default, updated_at`,
    values
  )
  return rows[0] || null
}

async function updateKeyFallback(id, userId, fields) {
  const updates = []
  const values = []
  let idx = 1
  if (typeof fields.api_key === 'string' && fields.api_key.trim()) {
    updates.push(`api_key_enc = $${idx++}`)
    values.push(fields.api_key.trim())
  }
  if (fields.label !== undefined) {
    updates.push(`label = $${idx++}`)
    values.push(typeof fields.label === 'string' ? fields.label.trim() || null : null)
  }
  if (typeof fields.is_active === 'boolean') {
    updates.push(`is_active = $${idx++}`)
    values.push(fields.is_active)
  }
  updates.push('updated_at = now()')
  values.push(id, userId)
  const { rows } = await pool.query(
    `update public.user_api_keys set ${updates.join(', ')} where id = $${idx} and user_id = $${idx + 1} returning id, provider_id, label, is_active, updated_at`,
    values
  )
  return rows[0] || null
}

async function deleteKey(id, userId) {
  const { rowCount } = await pool.query(
    'delete from public.user_api_keys where id = $1 and user_id = $2',
    [id, userId]
  )
  return rowCount > 0
}

module.exports = {
  getDefaultApiKeyId,
  resolveUserKey,
  resolveActiveUserKey,
  getStaticProvidersList,
  listProviders,
  listByUserId,
  listByUserIdFallback,
  resolveProviderId,
  createKey,
  getProviderInfo,
  clearDefaults,
  updateKey,
  updateKeyFallback,
  deleteKey,
}
```

- [ ] **Step 10: Create `src/models/analytics.model.js`**

```js
const pool = require('../config/db')

async function getStats(userId) {
  let resumeCount = 0
  let coverLetterCount = 0
  let jobsAppliedCount = 0
  let jobsTrackedCount = 0

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

  try {
    const tr = await pool.query(
      "select count(*)::int as c from public.job_tracker where user_id = $1 and application_status = 'applied'",
      [userId]
    )
    if (tr.rows[0]) jobsAppliedCount += tr.rows[0].c
  } catch (e) {
    if (e.code !== '42P01') throw e
  }

  try {
    const t = await pool.query('select count(*)::int as c from public.job_tracker where user_id = $1', [userId])
    if (t.rows[0]) jobsTrackedCount = t.rows[0].c
  } catch (e) {
    if (e.code !== '42P01') throw e
  }

  return {
    resume_count: resumeCount,
    cover_letter_count: coverLetterCount,
    jobs_applied_count: jobsAppliedCount,
    jobs_tracked_count: jobsTrackedCount,
  }
}

module.exports = { getStats }
```

- [ ] **Step 11: Commit**

```bash
git add Backend/Node/src/models/
git commit -m "refactor: extract all models (user, profile, autofill, resume, coverLetter, job, jobApplication, jobTracker, apiKey, analytics)"
```

---

### Task 6: Controllers — all controller files

**Files:** Create all 13 controller files under `src/controllers/`

Each controller imports from models and services. Controllers handle request validation, call models/services, and return responses. They use `handleDbError` from the error handler for DB errors.

Due to the size of this task, controllers should be created by extracting the request handler logic from each route in `server.js` into the corresponding controller function. The controller function signature is `(req, res)` or `(req, res, next)`.

**Key pattern for every controller function:**
1. Read `req.userId` (set by auth middleware) instead of `req.headers['x-user-id']`
2. Do NOT check `if (!pool)` — that's handled by `requireDb` middleware
3. Do NOT check `if (!userId)` — that's handled by `auth` middleware
4. For DB errors, use try/catch with `handleDbError` and return `res.status(result.status).json(result.body)`
5. Extract request params, call model/service, return response

- [ ] **Step 1: Create all 13 controller files**

Create each controller by extracting the handler body from server.js for each endpoint. Each controller exports named functions matching the route handlers.

Controllers to create (each follows the pattern above):
- `src/controllers/health.controller.js` — `check`, `dbCheck`
- `src/controllers/auth.controller.js` — `signup`, `login`
- `src/controllers/profile.controller.js` — `get`, `update`, `uploadPhoto`
- `src/controllers/autofill.controller.js` — `get`, `update`, `semanticMatch`, `semanticOptionMatch`, `matchFields`
- `src/controllers/resume.controller.js` — `list`, `create`, `upload`, `getText`, `getFile`, `remove`, `update`, `setPrimary`
- `src/controllers/coverLetter.controller.js` — `list`, `upload`, `getText`, `getFile`, `update`, `remove`
- `src/controllers/job.controller.js` — `searchAdzuna`, `searchJooble`, `searchArbeitnow`, `searchReed`, `list`, `getOne`, `apply`, `checkApplied`
- `src/controllers/ai.controller.js` — `skillSuggestions`, `generateCoverLetter`, `generateResume`, `translate`
- `src/controllers/resumake.controller.js` — `generate`, `compilePdf`
- `src/controllers/extension.controller.js` — `postJobResumeContext`, `getJobResumeContext`, `download`, `postCoverLetterContext`, `getCoverLetterContext`
- `src/controllers/jobTracker.controller.js` — `create`, `list`
- `src/controllers/apiKey.controller.js` — `listProviders`, `listKeys`, `getDefault`, `createKey`, `updateKey`, `deleteKey`
- `src/controllers/analytics.controller.js` — `getStats`

Each controller function extracts the body of the corresponding `app.get/post/put/patch/delete` handler from server.js, replacing:
- `req.headers['x-user-id']` → `req.userId`
- `if (!pool)` checks → removed (handled by requireDb middleware)
- `if (!userId)` checks → removed (handled by auth middleware)
- Direct SQL queries → model function calls
- External API calls → service function calls
- `handleDbError(err, res, 'context')` → `const { status, body } = handleDbError(err, 'context'); return res.status(status).json(body)`

- [ ] **Step 2: Commit**

```bash
git add Backend/Node/src/controllers/
git commit -m "refactor: extract all controllers"
```

---

### Task 7: Routes — all route files

**Files:** Create all 13 route files under `src/routes/`

Each route file creates an Express Router, imports middleware and the matching controller, defines routes with method + path + middleware chain + controller function, and exports the router.

- [ ] **Step 1: Create all 13 route files**

Example pattern for each route file:

```js
const { Router } = require('express')
const auth = require('../middleware/auth')
const requireDb = require('../middleware/requireDb')
const controller = require('../controllers/example.controller')

const router = Router()

router.get('/', requireDb, auth, controller.list)
router.post('/', requireDb, auth, controller.create)

module.exports = router
```

Route files to create with their routes:

**`health.routes.js`:**
- `GET /` → `health.check` (no middleware)
- `GET /db` → `health.dbCheck` (no middleware — it checks pool itself)

**`auth.routes.js`:**
- `POST /signup` → `auth.signup` (requireDb only — no auth needed)
- `POST /login` → `auth.login` (requireDb only)

**`profile.routes.js`:**
- `GET /` → `profile.get` (requireDb, auth)
- `PUT /` → `profile.update` (requireDb, auth)
- `POST /photo` → uploadPhoto middleware + `profile.uploadPhoto` (auth — requireDb checked inside since photo goes to cloudinary first)

**`autofill.routes.js`:**
- `GET /` → `autofill.get` (requireDb, auth)
- `PUT /` → `autofill.update` (requireDb, auth)
- `POST /semantic-match` → `autofill.semanticMatch` (no requireDb — can work without DB)
- `POST /semantic-option-match` → `autofill.semanticOptionMatch`
- `POST /match-fields` → `autofill.matchFields`

**`resume.routes.js`:**
- `GET /` → `resume.list` (requireDb, auth)
- `POST /` → `resume.create` (requireDb, auth)
- `POST /upload` → uploadResume middleware + `resume.upload` (auth)
- `GET /:id/text` → `resume.getText` (requireDb, auth)
- `GET /:id/file` → `resume.getFile` (requireDb, auth)
- `DELETE /:id` → `resume.remove` (requireDb, auth)
- `PATCH /:id` → `resume.update` (requireDb, auth)
- `PATCH /:id/primary` → `resume.setPrimary` (requireDb, auth)

**`coverLetter.routes.js`:**
- `GET /` → `coverLetter.list` (requireDb, auth)
- `POST /upload` → uploadCoverLetter middleware + `coverLetter.upload` (auth)
- `GET /:id/text` → `coverLetter.getText` (requireDb, auth)
- `GET /:id/file` → `coverLetter.getFile` (requireDb, auth)
- `PATCH /:id` → `coverLetter.update` (requireDb, auth)
- `DELETE /:id` → `coverLetter.remove` (requireDb, auth)

**`job.routes.js`:**
- `GET /search` → `job.searchAdzuna` (no requireDb — external API)
- `GET /jooble/search` → `job.searchJooble`
- `GET /arbeitnow/search` → `job.searchArbeitnow`
- `GET /reed/search` → `job.searchReed`
- `GET /` → `job.list` (requireDb)
- `GET /:id` → `job.getOne` (requireDb)
- `POST /:id/apply` → `job.apply` (requireDb, auth)
- `GET /:id/applied` → `job.checkApplied` (requireDb, auth)

**`ai.routes.js`:**
- `POST /skill-suggestions` → `ai.skillSuggestions` (requireDb, auth)
- `POST /generate-cover-letter` → `ai.generateCoverLetter` (requireDb, auth)
- `POST /generate-resume` → `ai.generateResume` (requireDb, auth)
- `POST /translate` → `ai.translate` (no requireDb — uses Gemini/MyMemory)

**`resumake.routes.js`:**
- `POST /generate` → `resumake.generate` (auth)
- `POST /compile-pdf` → `resumake.compilePdf` (auth)

**`extension.routes.js`:**
- `POST /job-resume-context` → `extension.postJobResumeContext` (auth)
- `GET /job-resume-context` → `extension.getJobResumeContext` (auth)
- `GET /download` → `extension.download` (no auth)
- `POST /cover-letter-context` → `extension.postCoverLetterContext` (auth)
- `GET /cover-letter-context` → `extension.getCoverLetterContext` (auth)

**`jobTracker.routes.js`:**
- `POST /` → `jobTracker.create` (requireDb, auth)
- `GET /` → `jobTracker.list` (requireDb, auth)

**`apiKey.routes.js`:**
- `GET /providers` → `apiKey.listProviders` (no auth — static fallback OK)
- `GET /` → `apiKey.listKeys` (requireDb, auth)
- `GET /default` → `apiKey.getDefault` (requireDb, auth)
- `POST /` → `apiKey.createKey` (requireDb, auth)
- `PATCH /:id` → `apiKey.updateKey` (requireDb, auth)
- `DELETE /:id` → `apiKey.deleteKey` (requireDb, auth)

**`analytics.routes.js`:**
- `GET /stats` → `analytics.getStats` (requireDb, auth)

- [ ] **Step 2: Commit**

```bash
git add Backend/Node/src/routes/
git commit -m "refactor: extract all route files"
```

---

### Task 8: App entry points — `app.js` and `server.js`

**Files:**
- Create: `src/app.js`
- Create: `src/server.js`
- Modify: `package.json`

- [ ] **Step 1: Create `src/app.js`**

```js
const express = require('express')
const cors = require('cors')
const { ALLOWED_ORIGINS } = require('./config/env')
const { errorHandler } = require('./middleware/errorHandler')

const app = express()

// CORS
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
]
const envOrigins = ALLOWED_ORIGINS
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
app.use('/api/health', require('./routes/health.routes'))
app.use('/api', require('./routes/auth.routes'))
app.use('/api/profile', require('./routes/profile.routes'))
app.use('/api/autofill', require('./routes/autofill.routes'))
app.use('/api/resumes', require('./routes/resume.routes'))
app.use('/api/cover-letters', require('./routes/coverLetter.routes'))
app.use('/api/jobs', require('./routes/job.routes'))
app.use('/api/ai', require('./routes/ai.routes'))
app.use('/api/resumake', require('./routes/resumake.routes'))
app.use('/api/extension', require('./routes/extension.routes'))
app.use('/api/job-tracker', require('./routes/jobTracker.routes'))
app.use('/api/api-keys', require('./routes/apiKey.routes'))
app.use('/api/analytics', require('./routes/analytics.routes'))

// Error handler (must be after routes)
app.use(errorHandler)

module.exports = app
```

Note the route mounting paths:
- Auth routes mount at `/api` (since they define `/signup` and `/login`)
- API key providers are at `/api/api-keys/providers` — the route file defines `GET /providers` and mounts at `/api/api-keys`

- [ ] **Step 2: Create `src/server.js`**

```js
require('dotenv').config()
const app = require('./app')
const { PORT } = require('./config/env')

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})
```

- [ ] **Step 3: Update `package.json` scripts**

Change:
```json
"start": "node server.js",
"dev": "nodemon server.js"
```
To:
```json
"start": "node src/server.js",
"dev": "nodemon src/server.js"
```

- [ ] **Step 4: Commit**

```bash
git add Backend/Node/src/app.js Backend/Node/src/server.js Backend/Node/package.json
git commit -m "refactor: add app.js entry point, new server.js, update package.json scripts"
```

---

### Task 9: Verification and cleanup

- [ ] **Step 1: Verify the app starts**

Run: `cd Backend/Node && node src/server.js`
Expected: `Backend running at http://localhost:3000` (or configured PORT)

- [ ] **Step 2: Verify `src/server.js` is under 20 lines**

Run: `wc -l Backend/Node/src/server.js`
Expected: Under 20 lines

- [ ] **Step 3: Verify no SQL queries outside `models/`**

Run: `grep -rn "pool.query" Backend/Node/src/ --include="*.js" | grep -v "/models/" | grep -v "/config/db.js"`
Expected: No matches (controllers/services/routes should not have direct pool.query calls)

Note: `health.controller.js` will have one `pool.query('select 1')` for the DB health check — this is acceptable as it's a simple connectivity check, not a business query. If desired, it can be moved to a model.

- [ ] **Step 4: Verify no external API calls outside `services/`**

Run: `grep -rn "fetch(" Backend/Node/src/ --include="*.js" | grep -v "/services/" | grep -v "node_modules"`
Expected: Only the extension controller's debug/agent log fetch calls (which are optional telemetry, not business-critical external API calls). All Gemini, Adzuna, Jooble, Reed, Cloudinary, Anthropic, OpenAI calls should be in `services/`.

- [ ] **Step 5: Verify no business logic in route files**

Run: `wc -l Backend/Node/src/routes/*.js`
Expected: Each route file should be under ~30 lines (just imports + router definitions)

- [ ] **Step 6: Verify old server.js is no longer the entry point**

Run: `grep "server.js" Backend/Node/package.json`
Expected: `src/server.js` in both start and dev scripts

- [ ] **Step 7: Commit final state**

```bash
git add -A Backend/Node/
git commit -m "refactor: complete MVC restructure (issue #1)

Restructured monolithic 2,583-line server.js into layered MVC:
- src/config/ — env, db, cloudinary
- src/middleware/ — auth, requireDb, upload, errorHandler
- src/routes/ — 13 route files
- src/controllers/ — 13 controller files
- src/models/ — 10 model files
- src/services/ — 3 service files
- src/utils/ — password, constants, helpers
- src/server.js — entry point (6 lines)
- src/app.js — Express setup + route mounting"
```
