/*
AI-generated test assistance note:
Prompt used: "Create lightweight integration-style tests for a Node/Express MVC refactor that verify route mounting and middleware/controller composition without using a real database or opening a network listener."
*/

const assert = require('node:assert/strict')
const path = require('node:path')

const srcRoot = path.join(__dirname, '..', 'src')

function clearSrcModuleCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(srcRoot)) delete require.cache[key]
  }
}

function getRouteLayer(router, routePath, method) {
  return router.stack.find(
    (layer) => layer.route && layer.route.path === routePath && layer.route.methods[method]
  )
}

test('app mounts the refactored routers at the expected API prefixes', () => {
  clearSrcModuleCache()
  const app = require('../src/app')
  const routerLayers = app.router.stack.filter((layer) => layer.name === 'router')

  const mountedPrefixes = [
    '/api/health',
    '/api/profile',
    '/api/autofill',
    '/api/jobs',
    '/api/resumes',
    '/api/cover-letters',
    '/api/ai',
    '/api/resumake',
    '/api/extension',
    '/api/analytics',
    '/api/job-tracker',
    '/api/api-keys',
    '/api/api-key-providers',
  ]

  for (const prefix of mountedPrefixes) {
    assert.ok(
      routerLayers.some((layer) => layer.matchers.some((matcher) => matcher(prefix))),
      `Expected app to mount a router for ${prefix}`
    )
  }
})

test('health routes keep the MVC health check split between plain and DB-aware handlers', () => {
  clearSrcModuleCache()
  const router = require('../src/routes/health.routes')
  const ctrl = require('../src/controllers/health.controller')
  const requireDb = require('../src/middleware/requireDb')

  const rootGet = getRouteLayer(router, '/', 'get')
  const dbGet = getRouteLayer(router, '/db', 'get')

  assert.deepEqual(rootGet.route.stack.map((layer) => layer.handle), [ctrl.check])
  assert.deepEqual(dbGet.route.stack.map((layer) => layer.handle), [requireDb, ctrl.dbCheck])
})

test('auth routes run requireDb before signup and login controllers', () => {
  clearSrcModuleCache()
  const router = require('../src/routes/auth.routes')
  const ctrl = require('../src/controllers/auth.controller')
  const requireDb = require('../src/middleware/requireDb')

  const signupOtpPost = getRouteLayer(router, '/signup/otp', 'post')
  const signupPost = getRouteLayer(router, '/signup', 'post')
  const loginPost = getRouteLayer(router, '/login', 'post')
  const forgotPost = getRouteLayer(router, '/forgot-password', 'post')
  const resetPost = getRouteLayer(router, '/forgot-password/reset', 'post')

  assert.deepEqual(signupOtpPost.route.stack.map((layer) => layer.handle), [requireDb, ctrl.signupStart])
  assert.deepEqual(signupPost.route.stack.map((layer) => layer.handle), [requireDb, ctrl.signup])
  assert.deepEqual(loginPost.route.stack.map((layer) => layer.handle), [requireDb, ctrl.login])
  assert.deepEqual(forgotPost.route.stack.map((layer) => layer.handle), [requireDb, ctrl.forgotPassword])
  assert.deepEqual(resetPost.route.stack.map((layer) => layer.handle), [requireDb, ctrl.resetPassword])
})

test('profile routes compose auth, requireDb, and the expected controller handlers', () => {
  clearSrcModuleCache()
  const router = require('../src/routes/profile.routes')
  const auth = require('../src/middleware/auth')
  const requireDb = require('../src/middleware/requireDb')
  const ctrl = require('../src/controllers/profile.controller')

  const getProfile = getRouteLayer(router, '/', 'get')
  const putProfile = getRouteLayer(router, '/', 'put')
  const uploadPhoto = getRouteLayer(router, '/photo', 'post')

  assert.deepEqual(getProfile.route.stack.map((layer) => layer.handle), [auth, requireDb, ctrl.get])
  assert.deepEqual(putProfile.route.stack.map((layer) => layer.handle), [auth, requireDb, ctrl.update])
  assert.equal(uploadPhoto.route.stack[0].handle, auth)
  assert.equal(uploadPhoto.route.stack[1].handle, requireDb)
  assert.equal(uploadPhoto.route.stack[3].handle, ctrl.uploadPhoto)
})

test('job routes preserve public search endpoints and protected apply endpoints', () => {
  clearSrcModuleCache()
  const router = require('../src/routes/job.routes')
  const auth = require('../src/middleware/auth')
  const requireDb = require('../src/middleware/requireDb')
  const ctrl = require('../src/controllers/job.controller')

  const search = getRouteLayer(router, '/search', 'get')
  const list = getRouteLayer(router, '/', 'get')
  const apply = getRouteLayer(router, '/:id/apply', 'post')
  const applied = getRouteLayer(router, '/:id/applied', 'get')

  assert.deepEqual(search.route.stack.map((layer) => layer.handle), [ctrl.searchAdzuna])
  assert.deepEqual(list.route.stack.map((layer) => layer.handle), [requireDb, ctrl.list])
  assert.deepEqual(apply.route.stack.map((layer) => layer.handle), [auth, requireDb, ctrl.apply])
  assert.deepEqual(applied.route.stack.map((layer) => layer.handle), [auth, requireDb, ctrl.checkApplied])
})

test('API key routes keep providers public and user key routes protected', () => {
  clearSrcModuleCache()
  const { keysRouter, providersRouter } = require('../src/routes/apiKey.routes')
  const auth = require('../src/middleware/auth')
  const requireDb = require('../src/middleware/requireDb')
  const ctrl = require('../src/controllers/apiKey.controller')

  const listKeys = getRouteLayer(keysRouter, '/', 'get')
  const createKey = getRouteLayer(keysRouter, '/', 'post')
  const getProviders = getRouteLayer(providersRouter, '/', 'get')

  assert.deepEqual(listKeys.route.stack.map((layer) => layer.handle), [auth, requireDb, ctrl.listKeys])
  assert.deepEqual(createKey.route.stack.map((layer) => layer.handle), [auth, requireDb, ctrl.createKey])
  assert.deepEqual(getProviders.route.stack.map((layer) => layer.handle), [ctrl.listProviders])
})
