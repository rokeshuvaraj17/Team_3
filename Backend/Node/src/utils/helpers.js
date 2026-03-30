const { AUTOFILL_FIELD_KEYS, COUNTRY_LOCATION_MAP } = require('./constants')

function mergeAutofillWithProfile(profileRow, userRow, autofillData) {
  const data = {}
  const fromProfile = []
  const displayName = profileRow?.display_name || ''
  const nameParts = displayName.trim().split(/\s+/)
  const first = nameParts[0] || ''
  const last = nameParts.slice(1).join(' ') || ''

  const profileMap = {
    full_name: profileRow?.display_name,
    first_name: first || autofillData?.first_name,
    last_name: last || autofillData?.last_name,
    email: userRow?.email,
    phone: profileRow?.phone,
    headline: profileRow?.headline,
    summary: profileRow?.summary,
    city: profileRow?.location,
    state: profileRow?.state,
    country: profileRow?.location_country,
    website_url: profileRow?.website_url,
    linkedin_url: profileRow?.linkedin_url,
    current_job_title: profileRow?.headline,
  }
  for (const key of AUTOFILL_FIELD_KEYS) {
    const fromP = profileMap[key]
    const fromA = autofillData && (autofillData[key] != null && autofillData[key] !== '') ? autofillData[key] : null
    if (fromP != null && fromP !== '') {
      data[key] = fromA != null ? fromA : fromP
      if (fromA == null) fromProfile.push(key)
    } else {
      data[key] = fromA != null ? fromA : ''
    }
  }
  return { data, from_profile: fromProfile }
}

function locationMatchesCountry(jobLocation, countryCode) {
  if (!countryCode) return true
  const loc = (jobLocation || '').trim()
  if (!loc) return false
  const terms = COUNTRY_LOCATION_MAP[countryCode.toLowerCase()]
  if (!terms) return true
  return terms.some((t) => loc.toLowerCase().includes(t))
}

function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '••••••••'
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '••••••••'
  return trimmed.slice(0, 4) + '••••••••' + trimmed.slice(-4)
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function extractJsonObject(str) {
  if (!str || typeof str !== 'string') return null
  const start = str.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  let quote = ''
  for (let i = start; i < str.length; i++) {
    const c = str[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (inString) {
      if (c === quote) inString = false
      continue
    }
    if (c === '"' || c === "'") { inString = true; quote = c; continue }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return str.slice(start, i + 1)
    }
  }
  return null
}

async function translateWithMyMemory(text, langPair = 'de|en') {
  const maxChunkLen = 200
  const chunks = []
  for (let i = 0; i < text.length; i += maxChunkLen) {
    let end = i + maxChunkLen
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end)
      if (lastSpace > i) end = lastSpace + 1
    }
    chunks.push(text.slice(i, end))
  }
  const out = []
  for (const chunk of chunks) {
    if (!chunk.trim()) {
      out.push(chunk)
      continue
    }
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${langPair}`
      const resp = await fetch(url, { headers: { Accept: 'application/json' } })
      const data = await resp.json().catch(() => null)
      const translated = data?.responseData?.translatedText
      out.push(typeof translated === 'string' && translated.trim() ? translated.trim() : chunk)
    } catch {
      out.push(chunk)
    }
  }
  return out.join('')
}

module.exports = {
  mergeAutofillWithProfile,
  locationMatchesCountry,
  maskApiKey,
  pickRandom,
  extractJsonObject,
  translateWithMyMemory,
}
