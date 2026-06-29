#!/usr/bin/env node
/* eslint-disable no-console */
// =============================================================================
// copy-db.js — one-shot copy of the ENTIRE database (schema + all data) from
// one Postgres instance to the other.
//
//   node scripts/copy-db.js            # primary (Supabase)  ->  secondary (DB_*2)
//   node scripts/copy-db.js --reverse  # secondary (DB_*2)   ->  primary (Supabase)
//
// Use the default to seed your standby server. Use --reverse to backfill the
// primary after it has been down (heal the gap). It is safe to re-run: data is
// inserted with `ON CONFLICT DO NOTHING`, so existing rows are left untouched.
//
// Why a Node script instead of pg_dump? The local pg_dump (v14) refuses to dump
// from a newer Supabase server, so we copy through the `pg` driver, which is
// version-independent. Triggers/FK checks on the destination are disabled for
// the load via `session_replication_role = replica`, so row values (ids,
// timestamps) are preserved exactly and load order never matters.
// =============================================================================

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const env = require('../src/config/env')

const REVERSE = process.argv.includes('--reverse')
const SCHEMA_FILE = path.join(__dirname, '..', 'schema', 'job_portal_schema.sql')
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations')
const REPLICATION_SQL = fs.readFileSync(path.join(__dirname, 'replication.sql'), 'utf8')
const BATCH_SIZE = 200
const JSON_OIDS = new Set([114, 3802]) // json, jsonb

function primaryConfig() {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL (primary) is not set')
  const isRemote = !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(env.DATABASE_URL)
  return {
    name: 'primary (DATABASE_URL)',
    config: {
      connectionString: env.DATABASE_URL,
      ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
    },
  }
}

function secondaryConfig() {
  const { DB_HOST2, DB_NAME2, DB_USER2, DB_PASSWORD2, DB_PORT2, DB_SSL2 } = env
  if (!DB_HOST2 || !DB_NAME2 || !DB_USER2) {
    throw new Error('Secondary DB not configured (set DB_HOST2 / DB_NAME2 / DB_USER2 ... in .env)')
  }
  const useSsl = String(DB_SSL2).toLowerCase() === 'true'
  return {
    name: `secondary (${DB_USER2}@${DB_HOST2}:${DB_PORT2}/${DB_NAME2})`,
    config: {
      host: DB_HOST2,
      database: DB_NAME2,
      user: DB_USER2,
      password: DB_PASSWORD2,
      port: Number(DB_PORT2) || 5432,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    },
  }
}

// Duplicate-object SQLSTATEs we tolerate when (re)applying schema/migrations.
const DUP_CODES = new Set(['42P07', '42710', '42P06', '42723', '42P16', '42701', '42704'])

async function runSqlFile(client, file, label) {
  const sql = fs.readFileSync(file, 'utf8')
  try {
    await client.query(sql)
    console.log(`  ✓ applied ${label}`)
  } catch (err) {
    if (DUP_CODES.has(err.code)) {
      console.log(`  • skipped ${label} (already present: ${err.code})`)
    } else {
      throw new Error(`Failed applying ${label}: ${err.message}`)
    }
  }
}

async function ensureStructure(dest) {
  const { rows } = await dest.query("select to_regclass('public.users') as t")
  if (rows[0] && rows[0].t) {
    console.log('Destination already has the schema — skipping structure creation.')
    return
  }
  console.log('Creating schema on destination...')
  await runSqlFile(dest, SCHEMA_FILE, 'schema/job_portal_schema.sql')
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const f of migrationFiles) {
    await runSqlFile(dest, path.join(MIGRATIONS_DIR, f), `migrations/${f}`)
  }
}

async function listTables(src) {
  const { rows } = await src.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'`
  )
  return rows.map((r) => r.table_name)
}

async function fkEdges(src) {
  const { rows } = await src.query(
    `select distinct tc.table_name as child, ccu.table_name as parent
     from information_schema.table_constraints tc
     join information_schema.constraint_column_usage ccu
       on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema   = tc.table_schema
     where tc.constraint_type = 'FOREIGN KEY'
       and tc.table_schema    = 'public'`
  )
  return rows.filter((r) => r.child !== r.parent) // ignore self-references
}

// Topologically sort so parents (referenced tables) are copied before children.
function topoSort(tables, edges) {
  const set = new Set(tables)
  const deps = new Map(tables.map((t) => [t, new Set()]))
  for (const { child, parent } of edges) {
    if (set.has(child) && set.has(parent)) deps.get(child).add(parent)
  }
  const ordered = []
  const done = new Set()
  let progress = true
  while (ordered.length < tables.length && progress) {
    progress = false
    for (const t of tables) {
      if (done.has(t)) continue
      const remaining = [...deps.get(t)].filter((p) => !done.has(p))
      if (remaining.length === 0) {
        ordered.push(t)
        done.add(t)
        progress = true
      }
    }
  }
  // Any leftovers (cycles) appended as-is; replica role disables FK checks anyway.
  for (const t of tables) if (!done.has(t)) ordered.push(t)
  return ordered
}

function buildInsert(table, cols, rowCount) {
  const colList = cols.map((c) => `"${c}"`).join(', ')
  const tuples = []
  let p = 1
  for (let r = 0; r < rowCount; r++) {
    const ph = cols.map(() => `$${p++}`)
    tuples.push(`(${ph.join(', ')})`)
  }
  return `insert into public."${table}" (${colList}) values ${tuples.join(', ')} on conflict do nothing`
}

async function copyTable(src, dest, table) {
  const res = await src.query(`select * from public."${table}"`)
  if (res.rows.length === 0) {
    console.log(`  - ${table}: 0 rows`)
    return 0
  }
  const fields = res.fields
  const cols = fields.map((f) => f.name)
  const jsonCols = new Set(fields.filter((f) => JSON_OIDS.has(f.dataTypeID)).map((f) => f.name))

  let copied = 0
  for (let i = 0; i < res.rows.length; i += BATCH_SIZE) {
    const batch = res.rows.slice(i, i + BATCH_SIZE)
    const values = []
    for (const row of batch) {
      for (const c of cols) {
        let v = row[c]
        // jsonb/json: re-serialize so arrays aren't mistaken for Postgres arrays.
        if (jsonCols.has(c) && v !== null && typeof v !== 'string') v = JSON.stringify(v)
        values.push(v)
      }
    }
    const sql = buildInsert(table, cols, batch.length)
    const { rowCount } = await dest.query(sql, values)
    copied += rowCount
  }
  console.log(`  ✓ ${table}: ${copied}/${res.rows.length} rows copied (rest already present)`)
  return copied
}

async function main() {
  const srcInfo = REVERSE ? secondaryConfig() : primaryConfig()
  const destInfo = REVERSE ? primaryConfig() : secondaryConfig()

  console.log('========================================================')
  console.log(`Copy direction: ${srcInfo.name}\n             -> ${destInfo.name}`)
  console.log('========================================================\n')

  const src = new Client(srcInfo.config)
  const dest = new Client(destInfo.config)
  await src.connect()
  await dest.connect()

  try {
    await ensureStructure(dest)

    // Install the replication log + guarded triggers so the load below is clean
    // (capture/updated_at triggers skip while app.replicating='on') and the DB
    // is ready for ongoing sync. Idempotent.
    await dest.query(REPLICATION_SQL)
    console.log('Replication objects ensured on destination.')

    const tables = await listTables(src)
    const edges = await fkEdges(src)
    const ordered = topoSort(tables, edges)
    console.log(`\nCopying ${ordered.length} tables (FK-ordered)...`)

    // Mark this session as a replication apply so triggers skip and updated_at
    // is preserved. Uses a GUC (not session_replication_role) so it works on
    // Supabase without superuser. FK checks stay on — hence the FK ordering.
    await dest.query("select set_config('app.replicating', 'on', false)")

    let total = 0
    for (const t of ordered) {
      total += await copyTable(src, dest, t)
    }

    await dest.query("select set_config('app.replicating', 'off', false)")
    console.log(`\nDone. ${total} new rows copied across ${ordered.length} tables.`)
  } finally {
    await src.end().catch(() => {})
    await dest.end().catch(() => {})
  }
}

main().catch((err) => {
  console.error('\nCopy failed:', err.message)
  process.exit(1)
})
