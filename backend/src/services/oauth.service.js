const crypto = require('crypto')

const CODE_TTL_MS = 5 * 60 * 1000
const codes = new Map()

const EXTENSION_CLIENT_ID = 'mrrokesh-job-portal-extension'
const DEFAULT_SCOPES = ['profile', 'autofill', 'job_tracker', 'api_keys']

function isAllowedRedirect(uri) {
  if (typeof uri !== 'string' || uri.length > 500) return false
  try {
    const parsed = new URL(uri)
    if (parsed.protocol === 'https:' && /\.chromiumapp\.org$/i.test(parsed.hostname)) return true
    if (parsed.protocol === 'chrome-extension:') return true
    return false
  } catch {
    return false
  }
}

function sweep() {
  const now = Date.now()
  for (const [code, entry] of codes) {
    if (entry.expiresAt <= now) codes.delete(code)
  }
}

function createAuthorizationCode({ userId, state, redirectUri, scopes }) {
  sweep()
  const code = crypto.randomBytes(24).toString('hex')
  codes.set(code, {
    userId: String(userId),
    state: String(state || ''),
    redirectUri,
    scopes: Array.isArray(scopes) && scopes.length ? scopes : DEFAULT_SCOPES,
    expiresAt: Date.now() + CODE_TTL_MS,
  })
  return code
}

function consumeAuthorizationCode(code, state) {
  sweep()
  const entry = codes.get(code)
  if (!entry) return null
  codes.delete(code)
  if (entry.expiresAt <= Date.now()) return null
  if (state && entry.state && entry.state !== state) return null
  return entry
}

module.exports = {
  EXTENSION_CLIENT_ID,
  DEFAULT_SCOPES,
  isAllowedRedirect,
  createAuthorizationCode,
  consumeAuthorizationCode,
}
