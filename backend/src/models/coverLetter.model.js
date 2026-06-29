const pool = require('../config/db')

async function listByUserId(userId) {
  try {
    const { rows } = await pool.query(
      'select id, user_id, job_id, title, file_url, created_at, html_content from public.cover_letters where user_id = $1 order by created_at desc',
      [userId]
    )
    return rows
  } catch (err) {
    if (err.code === '42P01') return []
    throw err
  }
}

async function create(userId, title, fileUrl) {
  const { rows } = await pool.query(
    `insert into public.cover_letters (user_id, title, file_url) values ($1, $2, $3) returning id, user_id, job_id, title, file_url, created_at`,
    [userId, title, fileUrl]
  )
  return rows[0]
}

async function getContentById(id, userId) {
  const { rows } = await pool.query(
    'select html_content, file_url from public.cover_letters where id = $1 and user_id = $2',
    [id, userId]
  )
  return rows[0] || null
}

async function getFileUrlById(id, userId) {
  const { rows } = await pool.query(
    'select file_url from public.cover_letters where id = $1 and user_id = $2',
    [id, userId]
  )
  return rows[0] || null
}

async function update(id, userId, fields) {
  const updates = []
  const values = []
  let v = 1
  if (fields.title !== undefined) {
    updates.push(`title = $${v++}`)
    values.push(fields.title)
  }
  if (fields.htmlContent !== undefined) {
    updates.push(`html_content = $${v++}`)
    values.push(fields.htmlContent)
  }
  values.push(id, userId)
  const { rows } = await pool.query(
    `update public.cover_letters set ${updates.join(', ')} where id = $${v} and user_id = $${v + 1} returning id, title, file_url, created_at, html_content`,
    values
  )
  return rows[0] || null
}

async function deleteById(id, userId) {
  const { rowCount } = await pool.query(
    'delete from public.cover_letters where id = $1 and user_id = $2',
    [id, userId]
  )
  return rowCount > 0
}

module.exports = { listByUserId, create, getContentById, getFileUrlById, update, deleteById }
