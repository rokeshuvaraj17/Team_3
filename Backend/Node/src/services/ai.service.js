const { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_URL, AUTOFILL_LLM_URL, AUTOFILL_LLM_API_KEY } = require('../config/env')
const { OPENAI_COMPATIBLE_MODELS } = require('../utils/constants')

async function generateWithUserKey(prompt, systemInstruction, providerSlug, apiKey, optionalModel) {
  if (!apiKey || !providerSlug) throw new Error('Provider and API key required')
  const trimmedKey = String(apiKey).trim()
  if (!trimmedKey) throw new Error('API key required')

  if (providerSlug === 'gemini') {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    }
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] }
    const model = optionalModel || GEMINI_MODEL
    const url = GEMINI_URL(model) + '?key=' + encodeURIComponent(trimmedKey)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error?.message || 'Gemini API error')
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('No response from Gemini')
    return text
  }

  if (providerSlug === 'anthropic') {
    const url = 'https://api.anthropic.com/v1/messages'
    const body = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 8192,
      system: systemInstruction || '',
      messages: [{ role: 'user', content: prompt }],
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': trimmedKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data?.error?.message || 'Anthropic API error')
    const text = data?.content?.[0]?.text
    if (!text) throw new Error('No response from Anthropic')
    return text
  }

  const baseUrls = {
    openai: 'https://api.openai.com/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    groq: 'https://api.groq.com/openai/v1',
    together: 'https://api.together.xyz/v1',
    mistral: 'https://api.mistral.ai/v1',
    cohere: 'https://api.cohere.ai/v1',
  }
  const baseUrl = baseUrls[providerSlug] || baseUrls.openai
  const model = optionalModel || OPENAI_COMPATIBLE_MODELS[providerSlug] || OPENAI_COMPATIBLE_MODELS.openai
  const url = baseUrl + '/chat/completions'
  const messages = []
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction })
  messages.push({ role: 'user', content: prompt })
  const body = { model, messages, temperature: 0.4, max_tokens: 8192 }
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + trimmedKey }
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data?.error?.message || data?.message || 'API error')
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('No response from API')
  return text
}

async function autofillLlmGenerate(prompt, systemInstruction) {
  const timeoutMs = 25000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    if (AUTOFILL_LLM_URL) {
      const headers = { 'Content-Type': 'application/json' }
      if (AUTOFILL_LLM_API_KEY) headers.Authorization = 'Bearer ' + AUTOFILL_LLM_API_KEY
      const body = { prompt, system: systemInstruction || '' }
      const resp = await fetch(AUTOFILL_LLM_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        console.warn('Autofill custom API error:', resp.status, data?.error || data?.message)
        return null
      }
      const text = data?.text ?? data?.content ?? data?.choices?.[0]?.message?.content ?? data?.result ?? data?.output
      return typeof text === 'string' ? text.trim() : null
    }

    if (!GEMINI_API_KEY) {
      console.warn('Autofill: no AUTOFILL_LLM_URL and no GEMINI_API_KEY')
      return null
    }
    const model = GEMINI_MODEL
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    }
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] }
    const url = GEMINI_URL(model) + '?key=' + encodeURIComponent(GEMINI_API_KEY)
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const data = await resp.json()
    if (!resp.ok) {
      console.warn('Gemini API error:', data?.error?.message || resp.status)
      return null
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return text ? text.trim() : null
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('Autofill LLM request failed:', err.message)
    return null
  }
}

async function autofillGenerate(prompt, systemInstruction, userId, apiKeyId, resolveUserKey) {
  if (userId && apiKeyId && resolveUserKey) {
    try {
      const keyInfo = await resolveUserKey(userId, apiKeyId)
      if (keyInfo) {
        const text = await generateWithUserKey(prompt, systemInstruction, keyInfo.provider_slug, keyInfo.api_key_enc, null)
        return text ? text.trim() : null
      }
    } catch (err) {
      console.warn('Autofill user API key failed:', err.message)
    }
  }
  return await autofillLlmGenerate(prompt, systemInstruction)
}

async function geminiGenerate(prompt, systemInstruction) {
  if (!GEMINI_API_KEY) return null
  const model = GEMINI_MODEL
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
  }
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] }
  const url = GEMINI_URL(model) + '?key=' + encodeURIComponent(GEMINI_API_KEY)
  try {
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await resp.json()
    if (!resp.ok) return null
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return text ? text.trim() : null
  } catch {
    return null
  }
}

module.exports = {
  generateWithUserKey,
  autofillLlmGenerate,
  autofillGenerate,
  geminiGenerate,
}
