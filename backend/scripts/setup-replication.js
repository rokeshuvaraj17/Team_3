#!/usr/bin/env node
/* eslint-disable no-console */
// =============================================================================
// setup-replication.js — install the replication log + triggers on BOTH
// databases. Idempotent; safe to re-run. The server also does this on boot,
// so this is mainly for setting things up ahead of time / manually.
//
//   node scripts/setup-replication.js
// =============================================================================

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const env = require('../src/config/env')

const SQL = fs.readFileSync(path.join(__dirname, 'replication.sql'), 'utf8')

function primaryConfig() {
  if (!env.DATABASE_URL) return null
  const isRemote = !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(env.DATABASE_URL)
  return {
    name: 'primary (DATABASE_URL)',
    config: { connectionString: env.DATABASE_URL, ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}) },
  }
}

function secondaryConfig() {
  const { DB_HOST2, DB_NAME2, DB_USER2, DB_PASSWORD2, DB_PORT2, DB_SSL2 } = env
  if (!DB_HOST2 || !DB_NAME2 || !DB_USER2) return null
  const useSsl = String(DB_SSL2).toLowerCase() === 'true'
  return {
    name: `secondary (${DB_USER2}@${DB_HOST2}:${DB_PORT2}/${DB_NAME2})`,
    config: {
      host: DB_HOST2, database: DB_NAME2, user: DB_USER2,
      password: DB_PASSWORD2, port: Number(DB_PORT2) || 5432,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    },
  }
}

async function install(info) {
  if (!info) return
  const client = new Client(info.config)
  await client.connect()
  try {
    await client.query(SQL)
    console.log(`  ✓ replication objects installed on ${info.name}`)
  } finally {
    await client.end().catch(() => {})
  }
}

async function main() {
  const targets = [primaryConfig(), secondaryConfig()].filter(Boolean)
  if (targets.length === 0) throw new Error('No databases configured')
  console.log('Installing replication objects...')
  for (const t of targets) {
    try {
      await install(t)
    } catch (err) {
      console.error(`  ✗ ${t.name}: ${err.message}`)
    }
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error('Setup failed:', err.message)
  process.exit(1)
})
