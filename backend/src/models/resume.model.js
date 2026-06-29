const pool = require('../config/db')

async function listByUserId(userId) {
  try {
    const { rows } = await pool.query(
      'select id, name, file_url, is_primary, uploaded_at, html_content from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc',
      [userId]
    )
    return rows
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await pool.query(
        'select id, name, file_url, is_primary, uploaded_at from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc',
        [userId]
      )
      return rows
    }
    throw err
  }
}

async function create(userId, name, fileUrl, isPrimary, htmlContent) {
  if (isPrimary) {
    await pool.query('update public.resumes set is_primary = false where user_id = $1', [userId])
  }
  try {
    const { rows } = await pool.query(
      `insert into public.resumes (user_id, name, file_url, is_primary, html_content)
       values ($1, $2, $3, $4, $5)
       returning id, name, file_url, is_primary, uploaded_at, html_content`,
      [userId, name, fileUrl, isPrimary, htmlContent]
    )
    return rows[0]
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await pool.query(
        `insert into public.resumes (user_id, name, file_url, is_primary)
         values ($1, $2, $3, $4)
         returning id, name, file_url, is_primary, uploaded_at`,
        [userId, name, fileUrl, isPrimary]
      )
      return rows[0]
    }
    throw err
  }
}

async function getContentById(id, userId) {
  const { rows } = await pool.query(
    'select html_content, file_url from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  return rows[0] || null
}

async function getFileUrlById(id, userId) {
  const { rows } = await pool.query(
    'select file_url from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  return rows[0] || null
}

async function deleteById(id, userId) {
  const { rowCount } = await pool.query(
    'delete from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  return rowCount > 0
}

async function update(id, userId, fields) {
  const own = await pool.query(
    'select id, name, file_url, html_content from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  if (!own.rows[0]) return null
  const updates = []
  const values = []
  let v = 1
  if (fields.name !== undefined) { updates.push(`name = $${v++}`); values.push(fields.name) }
  if (fields.htmlContent !== undefined) { updates.push(`html_content = $${v++}`); values.push(fields.htmlContent) }
  if (fields.fileUrl !== undefined) { updates.push(`file_url = $${v++}`); values.push(fields.fileUrl) }
  values.push(id, userId)
  try {
    const { rows } = await pool.query(
      `update public.resumes set ${updates.join(', ')} where id = $${v} and user_id = $${v + 1} returning id, name, file_url, is_primary, uploaded_at, html_content`,
      values
    )
    return rows[0]
  } catch (err) {
    if (err.code === '42703') {
      const updates2 = []
      const values2 = []
      let v2 = 1
      if (fields.name !== undefined) { updates2.push(`name = $${v2++}`); values2.push(fields.name) }
      if (fields.fileUrl !== undefined) { updates2.push(`file_url = $${v2++}`); values2.push(fields.fileUrl) }
      if (updates2.length === 0) return null
      values2.push(id, userId)
      const { rows } = await pool.query(
        `update public.resumes set ${updates2.join(', ')} where id = $${v2} and user_id = $${v2 + 1} returning id, name, file_url, is_primary, uploaded_at`,
        values2
      )
      return rows[0]
    }
    throw err
  }
}

async function setPrimary(id, userId) {
  const own = await pool.query('select id from public.resumes where id = $1 and user_id = $2', [id, userId])
  if (!own.rows[0]) return false
  await pool.query('update public.resumes set is_primary = false where user_id = $1', [userId])
  await pool.query('update public.resumes set is_primary = true where id = $1 and user_id = $2', [id, userId])
  return true
}

async function getPrimaryOrFirst(userId) {
  const { rows } = await pool.query(
    'select id from public.resumes where user_id = $1 order by is_primary desc, uploaded_at desc limit 1',
    [userId]
  )
  return rows[0] || null
}

async function existsForUser(id, userId) {
  const { rows } = await pool.query(
    'select id from public.resumes where id = $1 and user_id = $2',
    [id, userId]
  )
  return !!rows[0]
}

module.exports = { listByUserId, create, getContentById, getFileUrlById, deleteById, update, setPrimary, getPrimaryOrFirst, existsForUser }
