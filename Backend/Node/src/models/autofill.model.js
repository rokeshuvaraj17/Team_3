const pool = require('../config/db')

async function getByUserId(userId) {
  const { rows } = await pool.query(
    'select data, excluded_field_keys from public.user_autofill where user_id = $1',
    [userId]
  )
  return rows[0] || null
}

async function upsert(userId, data, excludedFieldKeys) {
  await pool.query(
    `insert into public.user_autofill (user_id, data, excluded_field_keys, updated_at)
     values ($1, $2::jsonb, $3::jsonb, now())
     on conflict (user_id) do update set data = $2::jsonb, excluded_field_keys = $3::jsonb, updated_at = now()`,
    [userId, JSON.stringify(data), JSON.stringify(excludedFieldKeys)]
  )
}

async function getCustomFields(userId) {
  try {
    const { rows } = await pool.query(
      'select id, field_key, field_value from public.user_autofill_custom_fields where user_id = $1 order by display_order asc, created_at asc',
      [userId]
    )
    return rows
  } catch (_) {
    return []
  }
}

async function replaceCustomFields(userId, customFields) {
  try {
    await pool.query('delete from public.user_autofill_custom_fields where user_id = $1', [userId])
    for (let i = 0; i < customFields.length; i++) {
      const p = customFields[i]
      await pool.query(
        `insert into public.user_autofill_custom_fields (user_id, field_key, field_value, display_order, updated_at)
         values ($1, $2, $3, $4, now())`,
        [userId, p.field_key, p.field_value, i]
      )
    }
  } catch (_) {}
}

module.exports = { getByUserId, upsert, getCustomFields, replaceCustomFields }
