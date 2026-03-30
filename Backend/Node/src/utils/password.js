const { PASSWORD_SALT } = require('../config/env')

function saltedPassword(password) {
  return PASSWORD_SALT + password
}

module.exports = { saltedPassword }
