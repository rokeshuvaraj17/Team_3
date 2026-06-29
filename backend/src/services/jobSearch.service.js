const { ADZUNA_APP_ID, ADZUNA_APP_KEY, JOOBLE_API_KEY, REED_API_KEY, JSEARCH_API_KEY, JSEARCH_API_HOST } = require('../config/env')
const { COUNTRY_TO_JOOBLE_LOCATION } = require('../utils/constants')
const { locationMatchesCountry } = require('../utils/helpers')

async function searchAdzuna({ country = 'us', page = 1, what, where, salary_min, salary_max, full_time, permanent, sort_by, results_per_page }) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return { error: 'Job search not configured (set FREE_JOB_API_KEY or ADZUNA_APP_ID/ADZUNA_APP_KEY in .env)', status: 503 }
  }
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    'content-type': 'application/json',
    results_per_page: String(Math.min(50, Math.max(10, parseInt(results_per_page, 10) || 20))),
  })
  if (what) params.set('what', what.toString().trim())
  if (where) params.set('where', where.toString().trim())
  if (salary_min) params.set('salary_min', salary_min.toString())
  if (salary_max) params.set('salary_max', salary_max.toString())
  if (full_time === '1' || full_time === 'true') params.set('full_time', '1')
  if (permanent === '1' || permanent === 'true') params.set('permanent', '1')
  if (sort_by) params.set('sort_by', sort_by.toString())

  const cleanCountry = country.toLowerCase().replace(/[^a-z]/g, '') || 'us'
  const cleanPage = Math.max(1, parseInt(page, 10) || 1)
  const url = `https://api.adzuna.com/v1/api/jobs/${cleanCountry}/search/${cleanPage}?${params}`
  try {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } })
    const text = await resp.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (parseErr) {
      console.error('Adzuna API returned non-JSON. First 200 chars:', text.slice(0, 200))
      return { error: 'Job API returned invalid response. Check that the backend is running and Adzuna credentials are set.', status: 502 }
    }
    if (!resp.ok) {
      if (resp.status === 401 || (data && (data.exception === 'AUTH_FAIL' || data.exception === 'Unauthorized'))) {
        console.error('Adzuna auth failed. Get separate app_id and app_key from https://developer.adzuna.com')
        return { error: 'Job API credentials invalid. Get app_id and app_key from https://developer.adzuna.com (login → API dashboard).', status: 401 }
      }
      return { data: data || { error: data?.display || data?.error || data?.exception || 'Adzuna API error' }, status: resp.status }
    }
    return { data }
  } catch (err) {
    console.error('Adzuna proxy error:', err.message)
    return { error: 'Could not fetch jobs. Check backend is running and try again.', status: 502 }
  }
}

async function searchJooble({ keywords = '', location = '', country = null, page = 1 }) {
  if (!JOOBLE_API_KEY) {
    return { error: 'Jooble job search not configured (set JOOBLE_API_KEY in .env)', status: 503 }
  }
  const cleanCountry = country ? country.toLowerCase().replace(/[^a-z]/g, '') : null
  const joobleLocation = location || (cleanCountry && COUNTRY_TO_JOOBLE_LOCATION[cleanCountry]) || ' '
  const url = `https://jooble.org/api/${JOOBLE_API_KEY}`
  const body = JSON.stringify({
    keywords: keywords || 'jobs',
    location: joobleLocation,
    page: String(Math.max(1, parseInt(page, 10) || 1)),
    companysearch: 'false',
  })

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    })
    const text = await resp.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (parseErr) {
      console.error('Jooble API returned non-JSON. First 200 chars:', text.slice(0, 200))
      return { error: 'Job API returned invalid response. Check that the backend is running and Jooble key is set.', status: 502 }
    }
    if (!resp.ok) {
      const msg = data?.message || data?.error || (resp.status === 403 ? 'Invalid Jooble API key' : 'Jooble API error')
      return { data: data || { error: msg }, status: resp.status === 403 ? 401 : resp.status }
    }
    let results = Array.isArray(data.jobs) ? data.jobs : []
    const alreadySearchedByCountry = !location && cleanCountry && COUNTRY_TO_JOOBLE_LOCATION[cleanCountry]
    if (cleanCountry && !alreadySearchedByCountry) {
      results = results.filter((job) => locationMatchesCountry(job.location, cleanCountry))
    }
    const totalCount = typeof data.totalCount === 'number' ? data.totalCount : results.length
    return { data: { count: totalCount, results } }
  } catch (err) {
    console.error('Jooble proxy error:', err.message)
    return { error: 'Could not fetch jobs. Check backend is running and try again.', status: 502 }
  }
}

async function searchArbeitnow({ keywords = '', location = '', country = null }) {
  const kw = keywords.toLowerCase()
  const loc = location.toLowerCase()
  const cleanCountry = country ? country.toLowerCase().replace(/[^a-z]/g, '') : null
  const url = 'https://www.arbeitnow.com/api/job-board-api'
  try {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } })
    const text = await resp.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (parseErr) {
      console.error('Arbeitnow API returned non-JSON. First 200 chars:', text.slice(0, 200))
      return { error: 'Job API returned invalid response. Check that the backend is running.', status: 502 }
    }
    if (!resp.ok) {
      return { data: data || { error: 'Arbeitnow API error' }, status: resp.status }
    }
    let results = Array.isArray(data?.data) ? data.data : []
    if (kw || loc) {
      results = results.filter((job) => {
        const title = (job.title || '').toLowerCase()
        const desc = (job.description || '').toLowerCase()
        const company = (job.company_name || '').toLowerCase()
        const jobLoc = (job.location || '').toLowerCase()
        const matchKw = !kw || title.includes(kw) || desc.includes(kw) || company.includes(kw)
        const matchLoc = !loc || jobLoc.includes(loc)
        return matchKw && matchLoc
      })
    }
    if (cleanCountry) {
      results = results.filter((job) => locationMatchesCountry(job.location, cleanCountry))
    }
    return { data: { count: results.length, results } }
  } catch (err) {
    console.error('Arbeitnow proxy error:', err.message)
    return { error: 'Could not fetch jobs. Check backend is running and try again.', status: 502 }
  }
}

async function searchReed({ keywords = '', locationName = '', resultsToTake = 20, resultsToSkip = 0 }) {
  if (!REED_API_KEY) {
    return { error: 'Reed job search not configured (set REED_API_KEY in .env)', status: 503 }
  }
  const params = new URLSearchParams()
  if (keywords) params.set('keywords', keywords.trim())
  if (locationName) params.set('locationName', locationName.trim())
  params.set('resultsToTake', String(Math.min(100, Math.max(1, parseInt(resultsToTake, 10) || 20))))
  params.set('resultsToSkip', String(Math.max(0, parseInt(resultsToSkip, 10) || 0)))
  const url = `https://www.reed.co.uk/api/1.0/search?${params}`
  const auth = Buffer.from(`${REED_API_KEY}:`, 'utf8').toString('base64')
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Basic ${auth}` },
    })
    const text = await resp.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (parseErr) {
      console.error('Reed API returned non-JSON. First 200 chars:', text.slice(0, 200))
      return { error: 'Job API returned invalid response. Check that the backend is running and Reed key is set.', status: 502 }
    }
    if (!resp.ok) {
      const msg = data?.message || data?.error || (resp.status === 401 ? 'Invalid Reed API key' : 'Reed API error')
      return { data: data || { error: msg }, status: resp.status === 401 ? 401 : resp.status }
    }
    const results = Array.isArray(data?.results) ? data.results : []
    const total = typeof data.totalResults === 'number' ? data.totalResults : results.length
    return { data: { count: total, results } }
  } catch (err) {
    console.error('Reed proxy error:', err.message)
    return { error: 'Could not fetch jobs. Check backend is running and try again.', status: 502 }
  }
}

// JSearch (RapidAPI) — aggregates Google for Jobs results.
// Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
async function searchJsearch({ query = '', page = 1, num_pages = 1, country = null, date_posted = null, employment_types = null, remote_jobs_only = null }) {
  if (!JSEARCH_API_KEY) {
    return { error: 'JSearch job search not configured (set JSEARCH_API_KEY in .env)', status: 503 }
  }
  const params = new URLSearchParams({
    query: (query || 'jobs').toString().trim(),
    page: String(Math.max(1, parseInt(page, 10) || 1)),
    num_pages: String(Math.min(20, Math.max(1, parseInt(num_pages, 10) || 1))),
  })
  const cleanCountry = country ? country.toString().toLowerCase().replace(/[^a-z]/g, '') : null
  if (cleanCountry) params.set('country', cleanCountry)
  if (date_posted) params.set('date_posted', date_posted.toString())
  if (employment_types) params.set('employment_types', employment_types.toString())
  if (remote_jobs_only === '1' || remote_jobs_only === 'true' || remote_jobs_only === true) params.set('remote_jobs_only', 'true')

  const url = `https://${JSEARCH_API_HOST}/search?${params}`
  try {
    const resp = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-RapidAPI-Key': JSEARCH_API_KEY,
        'X-RapidAPI-Host': JSEARCH_API_HOST,
      },
    })
    const text = await resp.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (parseErr) {
      console.error('JSearch API returned non-JSON. First 200 chars:', text.slice(0, 200))
      return { error: 'Job API returned invalid response. Check that the backend is running and JSearch key is set.', status: 502 }
    }
    if (!resp.ok) {
      const apiMsg = data?.message || data?.error || ''
      let friendly
      if (resp.status === 403 && /not subscribed/i.test(apiMsg)) {
        friendly = 'Not subscribed to JSearch on RapidAPI. Open the JSearch API page on RapidAPI and subscribe (Basic/Free plan), then retry.'
      } else if (resp.status === 429) {
        friendly = 'JSearch rate limit reached on your RapidAPI plan. Try again later or upgrade the plan.'
      } else {
        friendly = apiMsg || ((resp.status === 401 || resp.status === 403) ? 'Invalid JSearch (RapidAPI) key' : 'JSearch API error')
      }
      return { error: friendly, status: (resp.status === 401 || resp.status === 403) ? 401 : resp.status }
    }
    const results = Array.isArray(data?.data) ? data.data : []
    return { data: { count: results.length, results } }
  } catch (err) {
    console.error('JSearch proxy error:', err.message)
    return { error: 'Could not fetch jobs. Check backend is running and try again.', status: 502 }
  }
}

module.exports = { searchAdzuna, searchJooble, searchArbeitnow, searchReed, searchJsearch }
