const DEFAULT_CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const DEFAULT_CORS_HEADERS = ['Content-Type', 'Authorization', 'x-user-id']

function parseAllowedOrigins(rawOrigins) {
  return new Set(
    String(rawOrigins || '')
      .split(',')
      .map((origin) => origin.trim())
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
  if (allowedOrigins?.has(origin)) return true
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
