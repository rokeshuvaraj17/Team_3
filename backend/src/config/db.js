const { Pool } = require('pg')
const env = require('./env')

// =============================================================================
// Dual-database layer with automatic failover.
//
// - "primary"   = DATABASE_URL (Supabase).
// - "secondary" = DB_*2 (your own Postgres server), used as a hot standby.
//
// Every model in the app does `const pool = require('../config/db')` and then
// calls `pool.query(sql, params)`. This module keeps that exact interface, so
// nothing else has to change. Under the hood `query()` tries the preferred
// healthy database and, on a *connection-level* failure (DB down / network /
// shutdown — NOT a normal SQL error like a unique-violation), transparently
// fails over to the other database. A failed DB is parked for a short cooldown
// and then probed again, so recovery is automatic.
//
// Keeping both databases byte-for-byte identical (write replication + healing
// the gap after an outage) is handled by the replication worker — see
// `src/services/replication.service.js` and `scripts/copy-db.js`.
// =============================================================================

const FAILOVER_COOLDOWN_MS = Number(env.DB_FAILOVER_COOLDOWN_MS) || 15000

function buildPrimaryPool() {
  const url = env.DATABASE_URL
  if (!url) return null
  const isRemote = !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)
  return new Pool({
    connectionString: url,
    ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
    max: 10,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  })
}

function buildSecondaryPool() {
  const { DB_HOST2, DB_NAME2, DB_USER2, DB_PASSWORD2, DB_PORT2, DB_SSL2 } = env
  if (!DB_HOST2 || !DB_NAME2 || !DB_USER2) return null
  const useSsl = String(DB_SSL2).toLowerCase() === 'true'
  const isRemote = !/^(localhost|127\.0\.0\.1)$/.test(DB_HOST2)
  return new Pool({
    host: DB_HOST2,
    database: DB_NAME2,
    user: DB_USER2,
    password: DB_PASSWORD2,
    port: Number(DB_PORT2) || 5432,
    // Self-hosted servers often have SSL off; only force it when asked.
    ssl: useSsl ? { rejectUnauthorized: false } : (isRemote && DB_SSL2 === '' ? false : false),
    max: 10,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  })
}

const primaryPool = buildPrimaryPool()
const secondaryPool = buildSecondaryPool()

// Each node tracks its own health. `downUntil` is a timestamp; while it's in the
// future the node is skipped (except as a last resort if everything is down).
const nodes = []
if (primaryPool) nodes.push({ name: 'primary', pool: primaryPool, downUntil: 0 })
if (secondaryPool) nodes.push({ name: 'secondary', pool: secondaryPool, downUntil: 0 })

// Don't let an idle client error (e.g. a DB restarting) crash the process.
for (const node of nodes) {
  node.pool.on('error', (err) => {
    console.error(`[db] ${node.name} pool error:`, err.message)
    markDown(node, err)
  })
}

/**
 * Returns true when the error means the database itself is unreachable/unusable
 * (so we should fail over), as opposed to a normal query error (bad SQL, unique
 * violation, etc.) which must propagate unchanged to the caller.
 */
function isConnectionError(err) {
  if (!err) return false
  const code = err.code
  const msg = String(err.message || '')
  const netCodes = [
    'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET',
    'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'EAI_AGAIN',
  ]
  if (netCodes.includes(code)) return true
  if (typeof code === 'string') {
    // SQLSTATE class 08 = connection exception.
    if (code.startsWith('08')) return true
    // Operator intervention (shutdown / admin terminate) + resource exhaustion.
    if (['57P01', '57P02', '57P03', '53300', '53400'].includes(code)) return true
    // Supabase/Supavisor pooler reports an unreachable/paused/deleted project or
    // pool exhaustion as XX000 (e.g. "Tenant or user not found", "Max client
    // connections reached"). Treat these as the primary being unusable so we
    // fail over instead of surfacing a 500 to the user.
    if (
      code === 'XX000' &&
      /not found|tenant|pooler|max client|unavailable|timeout|terminat|ENOTFOUND|ECONN/i.test(msg)
    ) {
      return true
    }
  }
  // Pool acquisition / pooler failures that don't carry a usable SQLSTATE.
  if (/timeout|connect|terminat|ECONN|ENOTFOUND|EAI_AGAIN|socket hang up|Tenant or user not found|Max client connections/i.test(msg)) {
    return true
  }
  return false
}

function markDown(node, err) {
  const wasUp = node.downUntil <= Date.now()
  node.downUntil = Date.now() + FAILOVER_COOLDOWN_MS
  if (wasUp) {
    console.error(`[db] ${node.name} marked DOWN (failing over). Reason: ${err?.message || err}`)
  }
}

function markHealthy(node) {
  if (node.downUntil > Date.now()) {
    console.log(`[db] ${node.name} recovered and is healthy again.`)
  }
  node.downUntil = 0
}

/** Preferred order: healthy nodes first (primary before secondary), then any
 *  parked nodes as a last resort so we still try if everything looks down. */
function candidateOrder() {
  const now = Date.now()
  const up = nodes.filter((n) => n.downUntil <= now)
  const down = nodes.filter((n) => n.downUntil > now)
  return [...up, ...down]
}

async function query(text, params) {
  const order = candidateOrder()
  if (order.length === 0) throw new Error('No database configured')
  let lastErr
  for (let i = 0; i < order.length; i++) {
    const node = order[i]
    const hasAlternative = i < order.length - 1
    try {
      const res = await node.pool.query(text, params)
      markHealthy(node)
      return res
    } catch (err) {
      // Only fail over on connection-level errors, and only if another DB is
      // left to try. Real SQL errors propagate to the caller unchanged.
      if (isConnectionError(err) && hasAlternative) {
        markDown(node, err)
        lastErr = err
        continue
      }
      throw err
    }
  }
  throw lastErr || new Error('All databases unavailable')
}

/** Lightweight status snapshot (used by the health endpoint / sync worker). */
function getStatus() {
  const now = Date.now()
  return {
    primaryConfigured: Boolean(primaryPool),
    secondaryConfigured: Boolean(secondaryPool),
    nodes: nodes.map((n) => ({ name: n.name, up: n.downUntil <= now })),
  }
}

// Exported as a drop-in replacement for the old single `pool` object: it's
// truthy when at least one DB is configured and exposes `.query()`.
const db = nodes.length
  ? {
      query,
      getStatus,
      isConnectionError,
      primaryPool,
      secondaryPool,
    }
  : null

module.exports = db
