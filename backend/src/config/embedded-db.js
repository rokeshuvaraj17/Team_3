const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

let client = null
let mode = 'none'
let fileState = { users: [] }
let ready = Promise.resolve()

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text NOT NULL,
  password_hash   text NOT NULL,
  email_verified  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_email UNIQUE (email)
);
CREATE TABLE IF NOT EXISTS user_profiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE,
  display_name      text NOT NULL,
  headline          text,
  summary           text,
  location          text,
  location_country  text,
  state             text,
  profile_image_url text,
  phone             text,
  website_url       text,
  linkedin_url      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_autofill (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE,
  data                jsonb NOT NULL DEFAULT '{}',
  excluded_field_keys jsonb NOT NULL DEFAULT '[]',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS job_tracker (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL,
  company_name       text,
  position_title     text,
  location           text,
  min_salary         numeric(12, 2),
  max_salary         numeric(12, 2),
  currency           text,
  salary_period      text,
  job_type           text,
  job_description    text,
  notes              text,
  application_status text DEFAULT 'not_applied',
  job_posting_url    text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS resumes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  name         text NOT NULL,
  file_url     text NOT NULL,
  is_primary   boolean NOT NULL DEFAULT false,
  html_content text,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cover_letters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  job_id       uuid,
  title        text NOT NULL,
  file_url     text NOT NULL,
  html_content text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS api_key_providers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  base_url      text,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  provider_id  uuid NOT NULL,
  label        text,
  api_key_enc  text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
INSERT INTO api_key_providers (slug, name, description, base_url, display_order)
VALUES
  ('openai', 'OpenAI', 'GPT-4, GPT-3.5, and other OpenAI models', 'https://api.openai.com/v1', 10),
  ('gemini', 'Google Gemini', 'Gemini Pro and other Google AI models', 'https://generativelanguage.googleapis.com', 20),
  ('anthropic', 'Anthropic', 'Claude models', 'https://api.anthropic.com', 30),
  ('openrouter', 'OpenRouter', 'Unified API for many models', 'https://openrouter.ai/api/v1', 40)
ON CONFLICT (slug) DO NOTHING;
`

function isEnabled() {
  const raw = String(process.env.EMBEDDED_PG || '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

function filePath() {
  const dir = process.env.EMBEDDED_PG_DIR || path.join(process.cwd(), 'data')
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'users.json')
}

function loadFile() {
  try {
    fileState = JSON.parse(fs.readFileSync(filePath(), 'utf8'))
    if (!Array.isArray(fileState.users)) fileState = { users: [] }
  } catch {
    fileState = { users: [] }
  }
}

function saveFile() {
  fs.writeFileSync(filePath(), JSON.stringify(fileState, null, 2))
}

function fileQuery(text, params = []) {
  const sql = String(text).replace(/\s+/g, ' ').trim()
  const lower = sql.toLowerCase()

  if (lower.startsWith('insert into public.users') || lower.startsWith('insert into users')) {
    const [name, email, passwordHash, emailVerified] = params
    if (fileState.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      const err = new Error('duplicate key')
      err.code = '23505'
      throw err
    }
    const row = {
      id: crypto.randomUUID(),
      name,
      email,
      password_hash: passwordHash,
      email_verified: Boolean(emailVerified),
      created_at: new Date().toISOString(),
    }
    fileState.users.push(row)
    saveFile()
    return { rows: [row] }
  }

  if (lower.includes('from public.users') || lower.includes('from users')) {
    if (lower.includes('where email')) {
      const email = String(params[0] || '')
      const row = fileState.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      return { rows: row ? [row] : [] }
    }
    if (lower.includes('where id') || lower.includes('where email =') === false) {
      const id = String(params[0] || '')
      const row = fileState.users.find((u) => u.id === id)
      if (lower.includes('select email')) {
        return { rows: row ? [{ email: row.email }] : [] }
      }
      return { rows: row ? [row] : [] }
    }
  }

  if (lower.startsWith('update public.users') || lower.startsWith('update users')) {
    const [passwordHash, email] = params
    const row = fileState.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase())
    if (!row) return { rows: [] }
    row.password_hash = passwordHash
    saveFile()
    return { rows: [row] }
  }

  return { rows: [] }
}

async function startPglite() {
  const { PGlite } = require('@electric-sql/pglite')
  const dataDir = process.env.EMBEDDED_PG_DIR || path.join(process.cwd(), 'data', 'pglite')
  fs.mkdirSync(dataDir, { recursive: true })
  const pg = new PGlite(dataDir)
  await Promise.race([
    pg.waitReady,
    new Promise((_, reject) => setTimeout(() => reject(new Error('PGlite startup timeout')), 8000)),
  ])
  await pg.exec(BOOTSTRAP_SQL)
  client = pg
  mode = 'pglite'
  console.log(`[db] embedded PGlite ready at ${dataDir}`)
}

function startFile() {
  loadFile()
  mode = 'file'
  console.log(`[db] embedded file store ready at ${filePath()}`)
}

async function start() {
  try {
    await startPglite()
  } catch (err) {
    console.error('[db] PGlite unavailable, using file store:', err.message)
    startFile()
  }
  return client
}

function startInBackground() {
  ready = start()
  return ready
}

async function query(text, params) {
  await ready
  if (mode === 'pglite') return client.query(text, params)
  if (mode === 'file') return fileQuery(text, params)
  throw new Error('Embedded database not started')
}

const adapter = {
  query,
  getStatus() {
    return {
      primaryConfigured: true,
      secondaryConfigured: false,
      embedded: true,
      mode,
      nodes: [{ name: 'embedded', up: mode !== 'none' }],
    }
  },
  isConnectionError() {
    return false
  },
}

module.exports = { isEnabled, start, startInBackground, adapter }
