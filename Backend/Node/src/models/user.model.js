const pool = require('../config/db')

async function createUser(name, email, passwordHash) {
  const { rows } = await pool.query(
    `insert into public.users (name, email, password_hash)
     values ($1, $2, $3)
     returning id, name, email, email_verified, created_at`,
    [name, email, passwordHash]
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

async function getEmailById(userId) {
  const { rows } = await pool.query('select email from public.users where id = $1', [userId])
  return rows[0] || null
}

module.exports = { createUser, findByEmail, getEmailById }
