const request = require('supertest')
const app = require('../src/app')
const { query } = require('./helpers/db')

test('test foundation: app is reachable and DB is reachable', async () => {
  const res = await request(app).get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body.ok).toBe(true)

  const dbRes = await query('select 1 as ok')
  expect(dbRes.rows[0].ok).toBe(1)
})