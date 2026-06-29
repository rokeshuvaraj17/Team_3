const apiKeyModel = require('../models/apiKey.model')
const { maskApiKey } = require('../utils/helpers')
const { handleDbError } = require('../middleware/errorHandler')

async function listProviders(req, res) {
  try {
    const providers = await apiKeyModel.listProviders()
    res.json(providers)
  } catch (err) {
    res.json(apiKeyModel.getStaticProvidersList())
  }
}

async function listKeys(req, res) {
  try {
    const rows = await apiKeyModel.listByUserId(req.userId)
    res.json(
      rows.map(({ api_key_enc, ...rest }) => ({ ...rest, is_default: !!rest.is_default, api_key_masked: maskApiKey(api_key_enc) }))
    )
  } catch (err) {
    if (err.code === '42703') {
      const rows = await apiKeyModel.listByUserIdFallback(req.userId)
      return res.json(rows.map(({ api_key_enc, ...rest }) => ({ ...rest, is_default: false, api_key_masked: maskApiKey(api_key_enc) })))
    }
    const { status, body } = handleDbError(err, 'API keys list')
    return res.status(status).json(body)
  }
}

async function getDefault(req, res) {
  try {
    const id = await apiKeyModel.getDefaultApiKeyId(req.userId)
    if (!id) return res.status(404).json({ error: 'No default API key set. Set one in API Connection.' })
    return res.json({ id })
  } catch (err) {
    const { status, body } = handleDbError(err, 'API keys default')
    return res.status(status).json(body)
  }
}

async function createKey(req, res) {
  const { provider_id, label, api_key } = req.body || {}
  if (!provider_id) return res.status(400).json({ error: 'Provider is required' })
  const keyStr = typeof api_key === 'string' ? api_key.trim() : ''
  if (!keyStr) return res.status(400).json({ error: 'API key is required' })
  const labelVal = label && typeof label === 'string' ? label.trim() || null : null

  try {
    const providerId = await apiKeyModel.resolveProviderId(provider_id)
    const row = await apiKeyModel.createKey(req.userId, providerId, labelVal, keyStr)
    const provider = await apiKeyModel.getProviderInfo(row.provider_id)
    res.status(201).json({
      id: row.id,
      user_id: row.user_id,
      provider_id: row.provider_id,
      provider_slug: provider?.slug,
      provider_name: provider?.name,
      label: row.label,
      is_active: row.is_active,
      api_key_masked: maskApiKey(keyStr),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Invalid provider' })
    if (err.code === '23505') return res.status(409).json({ error: 'A key for this provider already exists with the same label' })
    if (err.code === '42P01' || (err.message && String(err.message).includes('does not exist'))) {
      return res.status(503).json({
        error: 'API key storage is not set up. Please run the database migration: backend/migrations/create_api_keys.sql in your Supabase SQL editor.',
      })
    }
    const { status, body } = handleDbError(err, 'API key create')
    return res.status(status).json(body)
  }
}

async function updateKey(req, res) {
  const { id } = req.params
  const { api_key, label, is_active, is_default } = req.body || {}

  try {
    if (is_default === true) {
      await apiKeyModel.clearDefaults(req.userId)
    }
    const row = await apiKeyModel.updateKey(id, req.userId, { api_key, label, is_active, is_default })
    if (!row) return res.status(404).json({ error: 'API key not found' })
    res.json({ ...row, is_default: !!row.is_default })
  } catch (err) {
    if (err.code === '42703') {
      const row = await apiKeyModel.updateKeyFallback(id, req.userId, { api_key, label, is_active })
      if (!row) return res.status(404).json({ error: 'API key not found' })
      return res.json(row)
    }
    const { status, body } = handleDbError(err, 'API key update')
    return res.status(status).json(body)
  }
}

async function deleteKey(req, res) {
  const { id } = req.params
  try {
    const deleted = await apiKeyModel.deleteKey(id, req.userId)
    if (!deleted) return res.status(404).json({ error: 'API key not found' })
    res.status(204).send()
  } catch (err) {
    const { status, body } = handleDbError(err, 'API key delete')
    return res.status(status).json(body)
  }
}

module.exports = { listProviders, listKeys, getDefault, createKey, updateKey, deleteKey }
