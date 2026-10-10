const { NOTIFY_API_KEY, NOTIFY_API_BASE, NOTIFY_APP_NAME, NOTIFY_FROM } = require('../config/env')

function maskEmail(email) {
  const value = String(email || '')
  const at = value.indexOf('@')
  if (at < 1) return value
  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  return `${local.slice(0, 1)}***@${domain}`
}

function otpErrorMessage(result) {
  const reason = result?.reason
  if (reason === 'expired') return 'That code has expired. Request a new one.'
  if (reason === 'locked') return 'Too many attempts. Request a new code.'
  return 'Invalid or expired verification code'
}

async function notifyRequest(path, body) {
  if (!NOTIFY_API_KEY) {
    const err = new Error('Notification service is not configured (NOTIFY_API_KEY)')
    err.status = 503
    throw err
  }

  const resp = await fetch(`${NOTIFY_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const message = data?.error?.message || data.message || (typeof data.error === 'string' ? data.error : '') || 'Could not reach the notification service'
    const err = new Error(message)
    err.status = 502
    err.details = data
    throw err
  }
  return data
}

async function sendOtp(to, purpose) {
  return notifyRequest('/otp/send', {
    to,
    purpose,
    app_name: NOTIFY_APP_NAME,
    from: NOTIFY_FROM,
  })
}

async function verifyOtp(to, purpose, code) {
  return notifyRequest('/otp/verify', {
    to,
    purpose,
    code: String(code || '').trim(),
  })
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified: user.email_verified,
  }
}

module.exports = { maskEmail, otpErrorMessage, sendOtp, verifyOtp, publicUser }
