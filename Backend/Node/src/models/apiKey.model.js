const pool = require('../config/db')
const { DEFAULT_API_KEY_PROVIDERS } = require('../utils/constants')

async function getDefaultApiKeyId(userId) {
  if (!pool || !userId) return null
  try {
    const { rows } = await pool.query(
      'select id from public.user_api_keys where user_id = $1 and is_default = true and is_active = true limit 1',
      [userId]
    )
    return rows[0] ? rows[0].id : null
  } catch (e) {
    if (e.code === '42703') return null
    throw e
  }
}

async function resolveUserKey(userId, apiKeyId) {
  if (!pool) return null
  const { rows } = await pool.query(
    `select k.api_key_enc, p.slug as provider_slug from public.user_api_keys k
     join public.api_key_providers p on p.id = k.provider_id
     where k.user_id = $1 and k.id = $2`,
    [userId, apiKeyId]
  )
  return rows[0] || null
}

async function resolveActiveUserKey(userId, apiKeyId) {
  if (!pool) return null
  const { rows } = await pool.query(
    `select k.api_key_enc, p.slug as provider_slug
     from public.user_api_keys k
     join public.api_key_providers p on p.id = k.provider_id
     where k.user_id = $1 and k.id = $2 and k.is_active = true`,
    [userId, apiKeyId]
  )
  return rows[0] || null
}

function getStaticProvidersList() {
  return DEFAULT_API_KEY_PROVIDERS.map((p) => ({
    id: p.slug,
    slug: p.slug,
    name: p.name,
    description: p.description,
    base_url: p.base_url,
  }))
}

async function listProviders() {
  if (!pool) return getStaticProvidersList()
  try {
    let { rows } = await pool.query(
      'select id, slug, name, description, base_url from public.api_key_providers order by display_order, name'
    )
    if (rows.length === 0) {
      for (const p of DEFAULT_API_KEY_PROVIDERS) {
        await pool.query(
          `insert into public.api_key_providers (slug, name, description, base_url, display_order)
           values ($1, $2, $3, $4, $5) on conflict (slug) do nothing`,
          [p.slug, p.name, p.description || null, p.base_url || null, p.display_order]
        )
      }
      const result = await pool.query(
        'select id, slug, name, description, base_url from public.api_key_providers order by display_order, name'
      )
      rows = result.rows
    }
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name || r.slug || 'Unknown',
      description: r.description,
      base_url: r.base_url,
    }))
  } catch {
    return getStaticProvidersList()
  }
}

async function listByUserId(userId) {
  const { rows } = await pool.query(
    `select k.id, k.user_id, k.provider_id, k.label, k.is_active, k.is_default, k.last_used_at, k.created_at, k.updated_at,
            k.api_key_enc, p.slug as provider_slug, p.name as provider_name
     from public.user_api_keys k
     join public.api_key_providers p on p.id = k.provider_id
     where k.user_id = $1
     order by (k.is_default = true) desc nulls last, p.display_order, p.name, k.created_at`,
    [userId]
  )
  return rows
}

async function listByUserIdFallback(userId) {
  const { rows } = await pool.query(
    `select k.id, k.user_id, k.provider_id, k.label, k.is_active, k.last_used_at, k.created_at, k.updated_at,
            k.api_key_enc, p.slug as provider_slug, p.name as provider_name
     from public.user_api_keys k
     join public.api_key_providers p on p.id = k.provider_id
     where k.user_id = $1
     order by p.display_order, p.name, k.created_at`,
    [userId]
  )
  return rows
}

async function resolveProviderId(providerIdOrSlug) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(String(providerIdOrSlug))) return providerIdOrSlug

  const slug = String(providerIdOrSlug).trim()
  const bySlug = await pool.query(
    'select id, slug, name from public.api_key_providers where slug = $1',
    [slug]
  )
  if (bySlug.rows[0]) return bySlug.rows[0].id

  const def = DEFAULT_API_KEY_PROVIDERS.find((p) => p.slug === slug)
  if (def) {
    const ins = await pool.query(
      `insert into public.api_key_providers (slug, name, description, base_url, display_order)
       values ($1, $2, $3, $4, $5) on conflict (slug) do update set name = $2 returning id`,
      [def.slug, def.name, def.description || null, def.base_url || null, def.display_order]
    )
    return ins.rows[0].id
  }
  return providerIdOrSlug
}

async function createKey(userId, providerId, label, apiKeyEnc) {
  const { rows } = await pool.query(
    `insert into public.user_api_keys (user_id, provider_id, label, api_key_enc)
     values ($1, $2, $3, $4)
     returning id, user_id, provider_id, label, is_active, created_at, updated_at`,
    [userId, providerId, label, apiKeyEnc]
  )
  return rows[0]
}

async function getProviderInfo(providerId) {
  const { rows } = await pool.query(
    'select slug, name from public.api_key_providers where id = $1',
    [providerId]
  )
  return rows[0] || null
}

async function clearDefaults(userId) {
  try {
    await pool.query(
      'update public.user_api_keys set is_default = false, updated_at = now() where user_id = $1',
      [userId]
    )
  } catch (e) {
    if (e.code !== '42703') throw e
  }
}

async function updateKey(id, userId, fields) {
  const updates = []
  const values = []
  let idx = 1
  if (typeof fields.api_key === 'string' && fields.api_key.trim()) {
    updates.push(`api_key_enc = $${idx++}`)
    values.push(fields.api_key.trim())
  }
  if (fields.label !== undefined) {
    updates.push(`label = $${idx++}`)
    values.push(typeof fields.label === 'string' ? fields.label.trim() || null : null)
  }
  if (typeof fields.is_active === 'boolean') {
    updates.push(`is_active = $${idx++}`)
    values.push(fields.is_active)
  }
  if (typeof fields.is_default === 'boolean') {
    updates.push(`is_default = $${idx++}`)
    values.push(fields.is_default)
  }
  updates.push('updated_at = now()')
  values.push(id, userId)
  const idParam = idx
  const userIdParam = idx + 1
  const { rows } = await pool.query(
    `update public.user_api_keys set ${updates.join(', ')} where id = $${idParam} and user_id = $${userIdParam} returning id, provider_id, label, is_active, is_default, updated_at`,
    values
  )
  return rows[0] || null
}

async function updateKeyFallback(id, userId, fields) {
  const updates = []
  const values = []
  let idx = 1
  if (typeof fields.api_key === 'string' && fields.api_key.trim()) {
    updates.push(`api_key_enc = $${idx++}`)
    values.push(fields.api_key.trim())
  }
  if (fields.label !== undefined) {
    updates.push(`label = $${idx++}`)
    values.push(typeof fields.label === 'string' ? fields.label.trim() || null : null)
  }
  if (typeof fields.is_active === 'boolean') {
    updates.push(`is_active = $${idx++}`)
    values.push(fields.is_active)
  }
  updates.push('updated_at = now()')
  values.push(id, userId)
  const { rows } = await pool.query(
    `update public.user_api_keys set ${updates.join(', ')} where id = $${idx} and user_id = $${idx + 1} returning id, provider_id, label, is_active, updated_at`,
    values
  )
  return rows[0] || null
}

async function deleteKey(id, userId) {
  const { rowCount } = await pool.query(
    'delete from public.user_api_keys where id = $1 and user_id = $2',
    [id, userId]
  )
  return rowCount > 0
}

module.exports = {
  getDefaultApiKeyId,
  resolveUserKey,
  resolveActiveUserKey,
  getStaticProvidersList,
  listProviders,
  listByUserId,
  listByUserIdFallback,
  resolveProviderId,
  createKey,
  getProviderInfo,
  clearDefaults,
  updateKey,
  updateKeyFallback,
  deleteKey,
}
