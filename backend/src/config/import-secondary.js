const { Client } = require('pg')
const env = require('./env')
const migrate = require('./migrate')

const BATCH_SIZE = 200
const JSON_OIDS = new Set([114, 3802])

function destConfig() {
  const url = env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const host = (url.match(/@([^/:?]+)/) || [])[1] || ''
  const ssl = /\.supabase\.|neon\.tech|amazonaws\.com/i.test(host)
    ? { rejectUnauthorized: false }
    : false
  return { connectionString: url, ...(ssl ? { ssl } : {}) }
}

function srcConfig() {
  const { DB_HOST2, DB_NAME2, DB_USER2, DB_PASSWORD2, DB_PORT2, DB_SSL2 } = env
  if (!DB_HOST2 || !DB_NAME2 || !DB_USER2) {
    throw new Error('Secondary DB is not configured')
  }
  return {
    host: DB_HOST2,
    database: DB_NAME2,
    user: DB_USER2,
    password: DB_PASSWORD2,
    port: Number(DB_PORT2) || 5432,
    ssl: String(DB_SSL2).toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
  }
}

async function copyTable(src, dest, table) {
  const res = await src.query(`select * from public."${table}"`)
  if (res.rows.length === 0) {
    console.log(`[import] ${table}: 0 rows`)
    return 0
  }
  const cols = res.fields.map((f) => f.name)
  const jsonCols = new Set(res.fields.filter((f) => JSON_OIDS.has(f.dataTypeID)).map((f) => f.name))
  let copied = 0
  for (let i = 0; i < res.rows.length; i += BATCH_SIZE) {
    const batch = res.rows.slice(i, i + BATCH_SIZE)
    const values = []
    for (const row of batch) {
      for (const c of cols) {
        let v = row[c]
        if (jsonCols.has(c) && v !== null && typeof v !== 'string') v = JSON.stringify(v)
        values.push(v)
      }
    }
    const colList = cols.map((c) => `"${c}"`).join(', ')
    const tuples = []
    let p = 1
    for (let r = 0; r < batch.length; r++) {
      tuples.push(`(${cols.map(() => `$${p++}`).join(', ')})`)
    }
    const sql = `insert into public."${table}" (${colList}) values ${tuples.join(', ')} on conflict do nothing`
    try {
      const result = await dest.query(sql, values)
      copied += result.rowCount
    } catch (err) {
      console.error(`[import] ${table} batch failed:`, err.message)
    }
  }
  console.log(`[import] ${table}: ${copied}/${res.rows.length} rows copied`)
  return copied
}

async function run() {
  await migrate.ensure()
  const src = new Client({ ...srcConfig(), connectionTimeoutMillis: 15000 })
  const dest = new Client({ ...destConfig(), connectionTimeoutMillis: 15000 })
  await src.connect()
  await dest.connect()
  try {
    const { rows } = await src.query(`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `)
    let total = 0
    for (const { table_name: table } of rows) {
      const exists = await dest.query('select to_regclass($1) as t', [`public.${table}`])
      if (!exists.rows[0].t) {
        console.log(`[import] skip ${table}: missing on destination`)
        continue
      }
      total += await copyTable(src, dest, table)
    }
    console.log(`[import] done, ${total} new rows from secondary`)
    return total
  } finally {
    await src.end().catch(() => {})
    await dest.end().catch(() => {})
  }
}

module.exports = { run }
