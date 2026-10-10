const multer = require('multer')

function handleDbError(err, context) {
  const code = err.code || (err.errno && String(err.errno))
  const message = err.message || ''

  if (code === 'ENOTFOUND' || code === 'ENOENT' || message.includes('getaddrinfo')) {
    console.error(`${context}: Database host not found (check DATABASE_URL and network)`, err.message)
    return { status: 503, body: { error: 'Database unavailable. Check connection settings and network.' } }
  }
  if (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    /timeout|terminat|ECONN|ENOTFOUND|unavailable/i.test(message)
  ) {
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
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large.' })
  }
  if (err.message && (err.message.includes('Only') || err.message.includes('allowed'))) {
    return res.status(400).json({ error: err.message })
  }
  if (err.dbContext) {
    const { status, body } = handleDbError(err, err.dbContext)
    return res.status(status).json(body)
  }
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}

module.exports = { handleDbError, errorHandler }
