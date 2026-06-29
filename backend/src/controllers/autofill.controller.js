const autofillModel = require('../models/autofill.model')
const profileModel = require('../models/profile.model')
const userModel = require('../models/user.model')
const apiKeyModel = require('../models/apiKey.model')
const { autofillGenerate } = require('../services/ai.service')
const { mergeAutofillWithProfile } = require('../utils/helpers')
const { AUTOFILL_FIELD_KEYS } = require('../utils/constants')
const { handleDbError } = require('../middleware/errorHandler')

async function get(req, res) {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  try {
    const [userRow, profileRow, autofillRow, customPairs] = await Promise.all([
      userModel.getEmailById(userId),
      profileModel.getAutofillFields(userId),
      autofillModel.getByUserId(userId),
      autofillModel.getCustomFields(userId),
    ])
    const autofillData = (autofillRow && autofillRow.data) || {}
    const excluded = (autofillRow && Array.isArray(autofillRow.excluded_field_keys))
      ? autofillRow.excluded_field_keys
      : (autofillRow && autofillRow.excluded_field_keys && typeof autofillRow.excluded_field_keys === 'object' && !Array.isArray(autofillRow.excluded_field_keys) ? [] : [])
    const customPairsOut = (customPairs || []).map((r) => ({ id: r.id, field_key: r.field_key || '', field_value: r.field_value || '' }))

    const { data, from_profile } = mergeAutofillWithProfile(profileRow, userRow, autofillData)
    res.json({ data, excluded_field_keys: excluded, from_profile, custom_pairs: customPairsOut })
  } catch (err) {
    const { status, body } = handleDbError(err, 'Autofill get')
    return res.status(status).json(body)
  }
}

async function update(req, res) {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: 'User ID required' })

  const reqBody = req.body || {}
  let data = reqBody.data
  let excluded = reqBody.excluded_field_keys
  let customPairs = reqBody.custom_pairs
  if (data != null && typeof data !== 'object') data = {}
  if (!Array.isArray(excluded)) excluded = []
  if (!Array.isArray(customPairs)) customPairs = []
  data = data || {}
  const allowedKeys = new Set(AUTOFILL_FIELD_KEYS)
  const cleaned = {}
  for (const [k, v] of Object.entries(data)) {
    if (allowedKeys.has(k)) cleaned[k] = v == null ? '' : String(v).trim()
  }
  const excludedCleaned = excluded.filter((k) => typeof k === 'string' && allowedKeys.has(k))
  const customCleaned = customPairs
    .slice(0, 100)
    .map((p) => ({
      field_key: typeof p.field_key === 'string' ? p.field_key.trim().slice(0, 200) : '',
      field_value: typeof p.field_value === 'string' ? String(p.field_value).slice(0, 2000) : '',
    }))
    .filter((p) => p.field_key.length > 0)

  try {
    await autofillModel.upsert(userId, cleaned, excludedCleaned)
    await autofillModel.replaceCustomFields(userId, customCleaned)

    let customPairsOut = customCleaned.map((p) => ({ id: '', field_key: p.field_key, field_value: p.field_value }))
    const freshCustom = await autofillModel.getCustomFields(userId)
    if (freshCustom.length > 0) {
      customPairsOut = freshCustom.map((r) => ({ id: r.id, field_key: r.field_key || '', field_value: r.field_value || '' }))
    }
    const [profileRow, userRow] = await Promise.all([
      profileModel.getAutofillFields(userId),
      userModel.getEmailById(userId),
    ])
    const { data: mergedData, from_profile } = mergeAutofillWithProfile(profileRow, userRow, cleaned)
    res.json({ data: mergedData, excluded_field_keys: excludedCleaned, from_profile, custom_pairs: customPairsOut })
  } catch (err) {
    const { status, body } = handleDbError(err, 'Autofill put')
    return res.status(status).json(body)
  }
}

async function semanticMatch(req, res) {
  const fieldMeta = typeof req.body?.fieldMeta === 'string' ? req.body.fieldMeta.trim().slice(0, 500) : ''
  const availableKeys = Array.isArray(req.body?.availableKeys) ? req.body.availableKeys.filter((k) => typeof k === 'string').slice(0, 100) : []
  let apiKeyId = typeof req.body?.api_key_id === 'string' ? req.body.api_key_id.trim() || null : null
  const userId = (req.headers['x-user-id'] || '').toString().trim()
  if (!apiKeyId && userId) apiKeyId = await apiKeyModel.getDefaultApiKeyId(userId)
  if (!fieldMeta || availableKeys.length === 0) return res.status(400).json({ error: 'fieldMeta and availableKeys required' })
  try {
    const list = availableKeys.join(', ')
    const prompt = `Form field label/description: "${fieldMeta}". Which ONE of these keys best matches it? Reply with exactly one key from this list, nothing else: ${list}`
    const system = 'You are a form field mapper. Reply with only the single key from the given list that best matches the field. No explanation, no quotes.'
    const out = await autofillGenerate(prompt, system, userId, apiKeyId, apiKeyModel.resolveUserKey)
    const matched = out && availableKeys.find((k) => out.toLowerCase().includes(k.toLowerCase()))
    return res.json({ matchedKey: matched || null })
  } catch (err) {
    console.error('Autofill semantic-match:', err.message)
    return res.status(502).json({ error: err.message || 'Semantic match failed', matchedKey: null })
  }
}

async function semanticOptionMatch(req, res) {
  const fieldLabel = typeof req.body?.fieldLabel === 'string' ? req.body.fieldLabel.trim().slice(0, 300) : ''
  const value = typeof req.body?.value === 'string' ? req.body.value.trim().slice(0, 200) : ''
  const options = Array.isArray(req.body?.options) ? req.body.options.filter((o) => typeof o === 'string').slice(0, 50) : []
  let apiKeyId = typeof req.body?.api_key_id === 'string' ? req.body.api_key_id.trim() || null : null
  const userId = (req.headers['x-user-id'] || '').toString().trim()
  if (!apiKeyId && userId) apiKeyId = await apiKeyModel.getDefaultApiKeyId(userId)
  if (!value || options.length === 0) return res.status(400).json({ error: 'value and options required' })
  try {
    const optsList = options.map((o) => `"${o.replace(/"/g, '\\"')}"`).join(', ')
    const prompt = `Field: "${fieldLabel}". User value: "${value}". Which ONE option best matches? Reply with the exact option text from: ${optsList}. Reply only that option, nothing else.`
    const system = 'You are a form option matcher. Reply with exactly one of the given options that best matches the user value. No explanation.'
    const out = await autofillGenerate(prompt, system, userId, apiKeyId, apiKeyModel.resolveUserKey)
    const outLower = out && out.trim().toLowerCase()
    const best = outLower && options.find((o) => outLower.includes(o.trim().toLowerCase()) || o.trim().toLowerCase().includes(outLower))
    return res.json({ bestOption: best || null })
  } catch (err) {
    console.error('Autofill semantic-option-match:', err.message)
    return res.status(502).json({ error: err.message || 'Semantic option match failed', bestOption: null })
  }
}

async function matchFields(req, res) {
  const fields = Array.isArray(req.body?.fields) ? req.body.fields.slice(0, 150) : []
  const userData = req.body?.userData && typeof req.body.userData === 'object' ? req.body.userData : {}
  const excluded = Array.isArray(req.body?.excluded) ? req.body.excluded : []
  const resumeText = typeof req.body?.resumeText === 'string' ? req.body.resumeText.trim().slice(0, 10000) : ''
  const coverLetterText = typeof req.body?.coverLetterText === 'string' ? req.body.coverLetterText.trim().slice(0, 6000) : ''
  const includeDebug = req.body?.includeDebug === true
  let apiKeyId = typeof req.body?.api_key_id === 'string' ? req.body.api_key_id.trim() || null : null
  const userId = (req.headers['x-user-id'] || '').toString().trim()
  if (!apiKeyId && userId) apiKeyId = await apiKeyModel.getDefaultApiKeyId(userId)
  if (fields.length === 0) return res.status(400).json({ error: 'fields array required' })
  const metas = fields.map((f) => (typeof f?.meta === 'string' ? f.meta.trim().slice(0, 300) : ''))
  const types = fields.map((f) => (typeof f?.type === 'string' ? f.type : 'text'))
  try {
    const userDataStr = JSON.stringify(userData)
    const excludedStr = excluded.length ? ` Excluded keys (do not use): ${excluded.join(', ')}.` : ''
    let contextBlocks = ''
    if (resumeText) {
      contextBlocks += `\n\nResume (use to infer job title, company, experience, skills, summary, education when not in user data; extract short answers):\n${resumeText}`
    }
    if (coverLetterText) {
      contextBlocks += `\n\nCover letter (use for message, "why us", cover letter, or motivation fields; extract or shorten as needed):\n${coverLetterText}`
    }
    const system = `You are a form autofill mapper. Given form field descriptions and the user's stored data (key: value), output a JSON array of values to fill. The array must have exactly ${metas.length} elements, one per field, in the same order. Prefer user data when a key matches the field. For job title, company, experience, skills, or long-form message fields, you may extract from the resume or cover letter text if provided. Keep each value concise (single line or short phrase unless the field clearly asks for a paragraph). Consider synonyms: zip_code = postal code, phone = telephone, current_job_title = job title, current_company = company. If no good match or key is excluded, use "". Do not invent data not in user data or the resume/cover letter. Output only a valid JSON array of strings, no markdown, no explanation.${excludedStr}`
    const prompt = `Field descriptions (one per line, in order):\n${metas.map((m, i) => `${i + 1}. ${m || '(empty)'}`).join('\n')}\n\nUser data (key: value):\n${userDataStr}${contextBlocks}\n\nReturn a JSON array of ${metas.length} strings, in the same order as the fields. Use "" for no match.`
    console.log('[Autofill match-fields] Field count:', metas.length, '| api_key_id:', apiKeyId || 'none', '| Metas:', metas.slice(0, 20))
    const out = await autofillGenerate(prompt, system, userId, apiKeyId, apiKeyModel.resolveUserKey)
    if (includeDebug && out) console.log('[Autofill match-fields] Raw model output (first 1500 chars):', out.slice(0, 1500))
    let values = []
    if (out) {
      const cleaned = out.replace(/^[\s\S]*?\[/, '[').replace(/\][\s\S]*$/, ']').trim()
      try {
        values = JSON.parse(cleaned)
      } catch (e) {
        const match = out.match(/\[[\s\S]*\]/)
        if (match) values = JSON.parse(match[0])
      }
    }
    if (!Array.isArray(values) || values.length !== metas.length) {
      console.warn('[Autofill match-fields] Values length', values.length, '!= metas length', metas.length, '- padding with empty strings')
      values = metas.map(() => '')
    }
    const normalized = values.slice(0, metas.length).map((v) => (v != null && typeof v !== 'string' ? String(v) : (v || '')))
    console.log('[Autofill match-fields] Returning values (first 15):', normalized.slice(0, 15).map((v) => (v ? v.slice(0, 30) + (v.length > 30 ? '...' : '') : '(empty)')))
    const response = { values: normalized }
    if (!out || normalized.every((v) => !v)) response.fallback = true
    if (includeDebug) {
      response.debug = {
        fieldCount: metas.length,
        metas: metas.slice(0, 50),
        rawOutputPreview: out ? out.slice(0, 800) : null,
        valuesPreview: normalized.slice(0, 30),
      }
    }
    return res.json(response)
  } catch (err) {
    console.error('Autofill match-fields:', err.message)
    const emptyValues = metas.map(() => '')
    return res.status(200).json({ values: emptyValues, fallback: true, error: err.message || 'Match fields failed' })
  }
}

module.exports = { get, update, semanticMatch, semanticOptionMatch, matchFields }
