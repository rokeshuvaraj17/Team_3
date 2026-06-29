const { Router } = require('express')
const auth = require('../middleware/auth')
const requireDb = require('../middleware/requireDb')
const ctrl = require('../controllers/apiKey.controller')

const keysRouter = Router()

keysRouter.get('/', auth, requireDb, ctrl.listKeys)
keysRouter.get('/default', auth, requireDb, ctrl.getDefault)
keysRouter.post('/', auth, requireDb, ctrl.createKey)
keysRouter.patch('/:id', auth, requireDb, ctrl.updateKey)
keysRouter.delete('/:id', auth, requireDb, ctrl.deleteKey)

// Providers is mounted separately at /api/api-key-providers in app.js
const providersRouter = Router()
providersRouter.get('/', ctrl.listProviders)

module.exports = { keysRouter, providersRouter }
