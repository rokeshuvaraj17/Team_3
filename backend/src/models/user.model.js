const pool = require('../config/db')

async function createUser(name, email, passwordHash, emailVerified = false) {
  const { rows } = await pool.query(
    `insert into public.users (name, email, password_hash, email_verified)
     values ($1, $2, $3, $4)
     returning id, name, email, email_verified, created_at`,
    [name, email, passwordHash, emailVerified]
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

async function findById(userId) {
  const { rows } = await pool.query(
    'select id, name, email, email_verified from public.users where id = $1',
    [userId]
  )
  return rows[0] || null
}

async function getEmailById(userId) {
  const { rows } = await pool.query('select email from public.users where id = $1', [userId])
  return rows[0] || null
}

async function updatePasswordByEmail(email, passwordHash) {
  const { rows } = await pool.query(
    `update public.users
     set password_hash = $1
     where email = $2
     returning id, name, email, email_verified`,
    [passwordHash, email]
  )
  return rows[0] || null
}

module.exports = { createUser, findByEmail, findById, getEmailById, updatePasswordByEmail }
