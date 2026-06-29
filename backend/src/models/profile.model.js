const pool = require('../config/db')

async function getByUserId(userId) {
  const { rows } = await pool.query(
    'select id, user_id, display_name, headline, summary, location, location_country, state, profile_image_url, phone, website_url, linkedin_url, created_at, updated_at from public.user_profiles where user_id = $1',
    [userId]
  )
  return rows[0] || null
}

async function getAutofillFields(userId) {
  const { rows } = await pool.query(
    'select display_name, headline, summary, location, location_country, state, phone, website_url, linkedin_url from public.user_profiles where user_id = $1',
    [userId]
  )
  return rows[0] || null
}

async function getAll(userId) {
  const { rows } = await pool.query('select * from public.user_profiles where user_id = $1', [userId])
  return rows[0] || null
}

async function upsert(userId, fields) {
  const { rows } = await pool.query(
    `insert into public.user_profiles (user_id, display_name, headline, summary, location, location_country, state, profile_image_url, phone, website_url, linkedin_url)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (user_id) do update set
       display_name = $2, headline = $3, summary = $4, location = $5, location_country = $6,
       state = $7, profile_image_url = $8, phone = $9, website_url = $10, linkedin_url = $11, updated_at = now()
     returning id, user_id, display_name, headline, summary, location, location_country, state, profile_image_url, phone, website_url, linkedin_url, created_at, updated_at`,
    [
      userId,
      fields.display_name,
      fields.headline,
      fields.summary,
      fields.location,
      fields.location_country,
      fields.state,
      fields.profile_image_url,
      fields.phone,
      fields.website_url,
      fields.linkedin_url,
    ]
  )
  return rows[0]
}

async function updatePhoto(userId, url) {
  const { rowCount, rows } = await pool.query(
    'update public.user_profiles set profile_image_url = $1, updated_at = now() where user_id = $2 returning profile_image_url',
    [url, userId]
  )
  return rowCount > 0 ? rows[0] : null
}

module.exports = { getByUserId, getAutofillFields, getAll, upsert, updatePhoto }
