// AI-assisted implementation note:
// The CORS issue was presented to AI with the requirement to remove the broad
// `https://` wildcard, use explicit origins from `ALLOWED_ORIGINS`, keep
// `chrome-extension://` support for the browser extension, allow localhost only
// during development, and document the required environment variable.

const DEFAULT_CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const DEFAULT_CORS_HEADERS = ['Content-Type', 'Authorization', 'x-user-id']

// Normalize an origin for comparison: trim whitespace and drop any trailing
// slash(es). Browsers send the `Origin` header without a trailing slash, but
// it's a common mistake to configure ALLOWED_ORIGINS with one (e.g. copied
// from a browser address bar), so we tolerate it on both sides.
function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '')
}

function parseAllowedOrigins(rawOrigins) {
  return new Set(
    String(rawOrigins || '')
      .split(',')
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  )
}

function isLocalhostOrigin(origin) {
  try {
    const { protocol, hostname } = new URL(origin)
    return ['http:', 'https:'].includes(protocol) && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname)
  } catch {
    return false
  }
}

function isOriginAllowed(origin, { allowedOrigins, allowLocalhost = false } = {}) {
  if (!origin) return true
  const normalized = normalizeOrigin(origin)
  if (allowedOrigins?.has(origin) || allowedOrigins?.has(normalized)) return true
  if (origin.startsWith('chrome-extension://')) return true
  if (allowLocalhost && isLocalhostOrigin(origin)) return true
  return false
}

function createCorsOptions({ allowedOrigins, nodeEnv } = {}) {
  const parsedAllowedOrigins = allowedOrigins instanceof Set
    ? allowedOrigins
    : parseAllowedOrigins(allowedOrigins)
  const allowLocalhost = nodeEnv !== 'production'

  return {
    origin: (origin, cb) => {
      if (isOriginAllowed(origin, { allowedOrigins: parsedAllowedOrigins, allowLocalhost })) {
        return cb(null, true)
      }
      cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: DEFAULT_CORS_METHODS,
    allowedHeaders: DEFAULT_CORS_HEADERS,
  }
}

module.exports = {
  createCorsOptions,
  isLocalhostOrigin,
  isOriginAllowed,
  parseAllowedOrigins,
}
