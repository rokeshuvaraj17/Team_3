const bcrypt = require('bcrypt')
const { PASSWORD_SALT } = require('../config/env')
const { saltedPassword } = require('../utils/password')
const { handleDbError } = require('../middleware/errorHandler')
const userModel = require('../models/user.model')
const notify = require('../services/notify.service')

function requireSalt(res) {
  if (PASSWORD_SALT) return true
  res.status(503).json({ error: 'Server configuration error (PASSWORD_SALT not set)' })
  return false
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function signupStart(req, res) {
  if (!requireSalt(res)) return
  const { name, email, password } = req.body || {}
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  const trimmedEmail = typeof email === 'string' ? email.trim() : ''

  if (!trimmedName || trimmedName.length < 2) {
    return res.status(400).json({ error: 'Name is required and must be at least 2 characters' })
  }
  if (!trimmedEmail) {
    return res.status(400).json({ error: 'Email is required' })
  }
  if (!validEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const existing = await userModel.findByEmail(trimmedEmail)
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }
    await notify.sendOtp(trimmedEmail, 'signup')
    res.json({
      success: true,
      requiresOtp: true,
      email: trimmedEmail,
      emailMasked: notify.maskEmail(trimmedEmail),
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    const { status, body } = handleDbError(err, 'Signup')
    return res.status(status).json(body)
  }
}

async function signup(req, res) {
  if (!requireSalt(res)) return
  const { name, email, password, code } = req.body || {}
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  const trimmedEmail = typeof email === 'string' ? email.trim() : ''
  const trimmedCode = typeof code === 'string' ? code.trim() : String(code || '').trim()

  if (!trimmedName || trimmedName.length < 2) {
    return res.status(400).json({ error: 'Name is required and must be at least 2 characters' })
  }
  if (!trimmedEmail || !validEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  if (!trimmedCode) {
    return res.status(400).json({ error: 'Verification code is required' })
  }

  try {
    const existing = await userModel.findByEmail(trimmedEmail)
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    const result = await notify.verifyOtp(trimmedEmail, 'signup', trimmedCode)
    if (!result?.valid) {
      return res.status(401).json({ error: notify.otpErrorMessage(result) })
    }

    const password_hash = await bcrypt.hash(saltedPassword(password), 10)
    const user = await userModel.createUser(trimmedName, trimmedEmail, password_hash, true)
    res.status(201).json({
      success: true,
      user: notify.publicUser(user),
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    const { status, body } = handleDbError(err, 'Signup')
    return res.status(status).json(body)
  }
}

async function login(req, res) {
  if (!requireSalt(res)) return
  const { email, password } = req.body || {}
  const trimmedEmail = typeof email === 'string' ? email.trim() : ''
  if (!trimmedEmail || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    const user = await userModel.findByEmail(trimmedEmail)
    if (!user || !(await bcrypt.compare(saltedPassword(password), user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    res.json({
      success: true,
      user: notify.publicUser(user),
    })
  } catch (err) {
    const { status, body } = handleDbError(err, 'Login')
    return res.status(status).json(body)
  }
}

async function forgotPassword(req, res) {
  const { email } = req.body || {}
  const trimmedEmail = typeof email === 'string' ? email.trim() : ''
  if (!trimmedEmail || !validEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }

  try {
    const user = await userModel.findByEmail(trimmedEmail)
    if (user) await notify.sendOtp(user.email, 'reset')
    res.json({
      success: true,
      emailMasked: notify.maskEmail(trimmedEmail),
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    const { status, body } = handleDbError(err, 'Forgot password')
    return res.status(status).json(body)
  }
}

async function resetPassword(req, res) {
  if (!requireSalt(res)) return
  const { email, code, password } = req.body || {}
  const trimmedEmail = typeof email === 'string' ? email.trim() : ''
  const trimmedCode = typeof code === 'string' ? code.trim() : String(code || '').trim()
  if (!trimmedEmail || !validEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }
  if (!trimmedCode) {
    return res.status(400).json({ error: 'Verification code is required' })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    const user = await userModel.findByEmail(trimmedEmail)
    if (!user) {
      return res.status(401).json({ error: notify.otpErrorMessage({ reason: 'not_found' }) })
    }
    const result = await notify.verifyOtp(user.email, 'reset', trimmedCode)
    if (!result?.valid) {
      return res.status(401).json({ error: notify.otpErrorMessage(result) })
    }
    const password_hash = await bcrypt.hash(saltedPassword(password), 10)
    const updated = await userModel.updatePasswordByEmail(user.email, password_hash)
    res.json({
      success: true,
      user: notify.publicUser(updated || user),
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    const { status, body } = handleDbError(err, 'Reset password')
    return res.status(status).json(body)
  }
}

module.exports = { signupStart, signup, login, forgotPassword, resetPassword }
