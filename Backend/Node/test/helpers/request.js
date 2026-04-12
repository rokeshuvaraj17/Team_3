const request = require('supertest')
const app = require('../../src/app')

function asUser(userId = '00000000-0000-0000-0000-000000000001') {
  return request(app).set('x-user-id', userId)
}

module.exports = { request: request(app), asUser }