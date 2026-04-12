/*
AI-generated test assistance note:
Prompt used: "Create small Node built-in tests for the PM2.1 MVC refactor. Focus on pure backend helpers and middleware, avoid external APIs and real database calls, and keep the tests easy for a student team to maintain."
*/

const assert = require('node:assert/strict')

const { PASSWORD_SALT } = require('../src/config/env')
const { saltedPassword } = require('../src/utils/password')
const auth = require('../src/middleware/auth')
const { handleDbError } = require('../src/middleware/errorHandler')
const {
  mergeAutofillWithProfile,
  locationMatchesCountry,
  maskApiKey,
  pickRandom,
  extractJsonObject,
} = require('../src/utils/helpers')

test('saltedPassword prefixes the configured salt', () => {
  assert.equal(saltedPassword('secret123'), `${PASSWORD_SALT}secret123`)
})

test('mergeAutofillWithProfile merges profile defaults and tracks profile-derived fields', () => {
  const profileRow = {
    display_name: 'Jane Smith',
    phone: '555-111-2222',
    headline: 'Software Engineer',
    summary: 'Builds reliable apps',
    location: 'Boston',
    state: 'MA',
    location_country: 'US',
    website_url: 'https://janesmith.dev',
    linkedin_url: 'https://linkedin.com/in/janesmith',
  }
  const userRow = { email: 'jane@example.com' }
  const autofillData = { first_name: 'Janey', city: 'Cambridge', github_url: 'https://github.com/jane' }

  const result = mergeAutofillWithProfile(profileRow, userRow, autofillData)

  assert.equal(result.data.full_name, 'Jane Smith')
  assert.equal(result.data.first_name, 'Janey')
  assert.equal(result.data.last_name, 'Smith')
  assert.equal(result.data.city, 'Cambridge')
  assert.equal(result.data.email, 'jane@example.com')
  assert.equal(result.data.github_url, 'https://github.com/jane')
  assert.ok(result.from_profile.includes('full_name'))
  assert.ok(result.from_profile.includes('last_name'))
  assert.ok(result.from_profile.includes('email'))
})

test('locationMatchesCountry handles matching, missing, and unknown country codes', () => {
  assert.equal(locationMatchesCountry('Austin, United States', 'us'), true)
  assert.equal(locationMatchesCountry('Berlin, Germany', 'us'), false)
  assert.equal(locationMatchesCountry('', 'us'), false)
  assert.equal(locationMatchesCountry('Tokyo, Japan', 'jp'), true)
  assert.equal(locationMatchesCountry('Anywhere', ''), true)
})

test('maskApiKey masks long keys and falls back for empty values', () => {
  assert.equal(maskApiKey('abcd1234wxyz5678'), 'abcd••••••••5678')
  assert.equal(maskApiKey('short'), '••••••••')
  assert.equal(maskApiKey(''), '••••••••')
})

test('pickRandom returns a deterministic item when Math.random is stubbed', () => {
  const originalRandom = Math.random
  Math.random = () => 0.74

  try {
    assert.equal(pickRandom(['alpha', 'beta', 'gamma']), 'gamma')
  } finally {
    Math.random = originalRandom
  }
})

test('extractJsonObject finds the first complete JSON object inside text', () => {
  const input = 'Model output: {"ok":true,"nested":{"value":"brace } inside string"}} trailing text'

  assert.equal(
    extractJsonObject(input),
    '{"ok":true,"nested":{"value":"brace } inside string"}}'
  )
  assert.equal(extractJsonObject('no json here'), null)
})

test('auth middleware rejects missing x-user-id headers', () => {
  let statusCode = null
  let jsonBody = null
  let nextCalled = false

  const req = { headers: {} }
  const res = {
    status(code) {
      statusCode = code
      return this
    },
    json(body) {
      jsonBody = body
      return this
    },
  }

  auth(req, res, () => {
    nextCalled = true
  })

  assert.equal(statusCode, 401)
  assert.deepEqual(jsonBody, { error: 'User ID required' })
  assert.equal(nextCalled, false)
})

test('auth middleware stores x-user-id and calls next when present', () => {
  let nextCalled = false

  const req = { headers: { 'x-user-id': 'user-123' } }
  const res = {
    status() {
      throw new Error('status should not be called when auth succeeds')
    },
    json() {
      throw new Error('json should not be called when auth succeeds')
    },
  }

  auth(req, res, () => {
    nextCalled = true
  })

  assert.equal(req.userId, 'user-123')
  assert.equal(nextCalled, true)
})

test('handleDbError maps common database errors to user-facing responses', () => {
  const hostNotFound = handleDbError({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND db.host' }, 'Health check')
  const duplicateEmail = handleDbError({ code: '23505', message: 'duplicate key value' }, 'Signup')
  const unknown = handleDbError({ code: '99999', message: 'unexpected failure' }, 'Other')

  assert.deepEqual(hostNotFound, {
    status: 503,
    body: { error: 'Database unavailable. Check connection settings and network.' },
  })
  assert.deepEqual(duplicateEmail, {
    status: 409,
    body: { error: 'An account with this email already exists' },
  })
  assert.deepEqual(unknown, {
    status: 500,
    body: { error: 'Something went wrong. Please try again.' },
  })
})
