const bcrypt = require('bcrypt')
const { PASSWORD_SALT } = require('../config/env')
const { saltedPassword } = require('../utils/password')
const { handleDbError } = require('../middleware/errorHandler')
const userModel = require('../models/user.model')

async function signup(req, res) {
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
    const user = await userModel.createUser(trimmedName, trimmedEmail, password_hash)
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
    const { status, body } = handleDbError(err, 'Signup')
    return res.status(status).json(body)
  }
}

async function login(req, res) {
  if (!PASSWORD_SALT) {
    return res.status(503).json({ error: 'Server configuration error (PASSWORD_SALT not set)' })
  }
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
      },
    })
  } catch (err) {
    const { status, body } = handleDbError(err, 'Login')
    return res.status(status).json(body)
  }
}

module.exports = { signup, login }
