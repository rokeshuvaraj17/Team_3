const path = require('path')
const dotenv = require('dotenv')
const { Pool } = require('pg')

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') })

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    await pool.query(`
      INSERT INTO users (id, name, email, password_hash)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Test User',
        'test@example.com',
        'hashed_password'
      )
      ON CONFLICT (email) DO NOTHING;
    `)

    console.log('Test DB seed complete')
  } finally {
    await pool.end()
  }
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})