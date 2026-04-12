const path = require('path')
const dotenv = require('dotenv')
const { Pool } = require('pg')

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') })

async function reset() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    const { rows } = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `)

    const tables = rows
      .map((r) => `"public"."${r.tablename}"`)
      .filter((t) => !t.includes('spatial_ref_sys'))

    if (tables.length) {
      await pool.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE;`)
    }

    console.log('Test DB reset complete')
  } finally {
    await pool.end()
  }
}

reset().catch((err) => {
  console.error(err)
  process.exit(1)
})