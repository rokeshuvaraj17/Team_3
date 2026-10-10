const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

let mode = 'none'
let fileState = { users: [] }
let ready = Promise.resolve()

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

function startFile() {
  loadFile()
  mode = 'file'
  console.log(`[db] embedded file store ready at ${filePath()}`)
}

async function start() {
  startFile()
}

function startInBackground() {
  ready = start()
  return ready
}

async function query(text, params) {
  await ready
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
