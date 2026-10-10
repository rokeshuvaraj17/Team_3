const userModel = require('../models/user.model')
const notify = require('../services/notify.service')
const oauth = require('../services/oauth.service')
const { handleDbError } = require('../middleware/errorHandler')

function authorizeRedirect(req, res) {
  const clientId = String(req.query.client_id || req.body?.client_id || '')
  const redirectUri = String(req.query.redirect_uri || req.body?.redirect_uri || '')
  const state = String(req.query.state || req.body?.state || '')
  if (clientId !== oauth.EXTENSION_CLIENT_ID) {
    return res.status(400).json({ error: 'Unknown client' })
  }
  if (!oauth.isAllowedRedirect(redirectUri)) {
    return res.status(400).json({ error: 'Invalid redirect URI' })
  }
  if (!state) {
    return res.status(400).json({ error: 'Missing state' })
  }
  res.json({
    client: {
      id: oauth.EXTENSION_CLIENT_ID,
      name: 'MR_Rokesh Job Portal Extension',
    },
    scopes: oauth.DEFAULT_SCOPES,
    redirectUri,
    state,
  })
}

async function approve(req, res) {
  const redirectUri = String(req.body?.redirect_uri || '')
  const state = String(req.body?.state || '')
  const clientId = String(req.body?.client_id || '')
  if (clientId !== oauth.EXTENSION_CLIENT_ID) {
    return res.status(400).json({ error: 'Unknown client' })
  }
  if (!oauth.isAllowedRedirect(redirectUri)) {
    return res.status(400).json({ error: 'Invalid redirect URI' })
  }
  if (!state) {
    return res.status(400).json({ error: 'Missing state' })
  }

  try {
    const user = await userModel.findById(req.userId)
    if (!user) return res.status(401).json({ error: 'Sign in to approve this connection' })

    const code = oauth.createAuthorizationCode({
      userId: user.id,
      state,
      redirectUri,
      scopes: oauth.DEFAULT_SCOPES,
    })
    const redirect = new URL(redirectUri)
    redirect.searchParams.set('code', code)
    redirect.searchParams.set('state', state)
    res.json({ success: true, redirect: redirect.toString() })
  } catch (err) {
    const { status, body } = handleDbError(err, 'OAuth approve')
    return res.status(status).json(body)
  }
}

function deny(req, res) {
  const redirectUri = String(req.body?.redirect_uri || '')
  const state = String(req.body?.state || '')
  if (!oauth.isAllowedRedirect(redirectUri)) {
    return res.status(400).json({ error: 'Invalid redirect URI' })
  }
  const redirect = new URL(redirectUri)
  redirect.searchParams.set('error', 'access_denied')
  if (state) redirect.searchParams.set('state', state)
  res.json({ success: true, redirect: redirect.toString() })
}

async function token(req, res) {
  const code = String(req.body?.code || '')
  const state = String(req.body?.state || '')
  if (!code) return res.status(400).json({ error: 'Authorization code required' })

  const entry = oauth.consumeAuthorizationCode(code, state)
  if (!entry) return res.status(401).json({ error: 'Invalid or expired authorization code' })

  try {
    const user = await userModel.findById(entry.userId)
    if (!user) return res.status(401).json({ error: 'User not found' })
    res.json({
      success: true,
      user: notify.publicUser(user),
      scopes: entry.scopes,
    })
  } catch (err) {
    const { status, body } = handleDbError(err, 'OAuth token')
    return res.status(status).json(body)
  }
}

module.exports = { authorizeRedirect, approve, deny, token }
