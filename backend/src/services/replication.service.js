// =============================================================================
// Replication worker: keeps the primary and secondary databases identical.
//
// Strategy (active/standby with a change log, bidirectional + self-healing):
//   * Every committed write is recorded in `replication_log` by DB triggers
//     (see scripts/replication.sql).
//   * This worker periodically ships unshipped log rows from each DB to the
//     other and applies them with the `app.replicating` GUC set, so the apply
//     does NOT get re-logged (no echo) and updated_at is preserved.
//   * If a peer is down, its changes simply stay unshipped and are replayed
//     automatically once it comes back — that's the "store it elsewhere and
//     copy back when it returns" behaviour.
//
// Applies are upserts keyed on `id`, so the worker is idempotent and crash-safe.
// =============================================================================

const fs = require('fs')
const path = require('path')
const db = require('../config/db')

const REPLICATION_SQL = fs.readFileSync(
  path.join(__dirname, '..', '..', 'scripts', 'replication.sql'),
  'utf8'
)

const BATCH = Number(process.env.REPLICATION_BATCH) || 200
const INTERVAL_MS = Number(process.env.REPLICATION_INTERVAL_MS) || 5000
const RETENTION_HOURS = Number(process.env.REPLICATION_RETENTION_HOURS) || 72
const CLEANUP_MS = 60 * 60 * 1000

let cycleRunning = false
let intervalTimer = null
let cleanupTimer = null

async function ensureObjects(pool, label) {
  await pool.query(REPLICATION_SQL)
  console.log(`[replication] objects ensured on ${label}`)
}

async function isUp(pool) {
  try {
    await pool.query('select 1')
    return true
  } catch {
    return false
  }
}

// Apply a single log entry to the destination inside its own transaction, with
// the replication guard set so destination triggers don't re-log it.
async function applyEntry(dstPool, entry) {
  const client = await dstPool.connect()
  try {
    await client.query('begin')
    await client.query("select set_config('app.replicating', 'on', true)")

    if (entry.op === 'D') {
      await client.query(`delete from public."${entry.table_name}" where id = $1`, [entry.row_id])
    } else {
      const data = entry.row_data || {}
      const cols = Object.keys(data)
      if (cols.length === 0) {
        await client.query('commit')
        return
      }
      const values = cols.map((c) => {
        const v = data[c]
        // jsonb/json columns arrive as JS objects/arrays; re-serialize them.
        return v !== null && typeof v === 'object' ? JSON.stringify(v) : v
      })
      const colList = cols.map((c) => `"${c}"`).join(', ')
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
      const nonId = cols.filter((c) => c !== 'id')
      const setList = nonId.map((c) => `"${c}" = excluded."${c}"`).join(', ')
      const sql = setList
        ? `insert into public."${entry.table_name}" (${colList}) values (${placeholders})
           on conflict ("id") do update set ${setList}`
        : `insert into public."${entry.table_name}" (${colList}) values (${placeholders})
           on conflict ("id") do nothing`
      await client.query(sql, values)
    }

    await client.query('commit')
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

// Ship every unshipped entry from src -> dst. Returns count shipped.
// Throws if the destination looks down (so the caller stops this direction).
async function shipDirection(srcPool, dstPool, srcName, dstName) {
  let shipped = 0
  for (;;) {
    const { rows } = await srcPool.query(
      `select seq, table_name, op, row_id, row_data
         from public.replication_log
        where shipped = false
        order by seq asc
        limit $1`,
      [BATCH]
    )
    if (rows.length === 0) break

    let stop = false
    for (const entry of rows) {
      try {
        await applyEntry(dstPool, entry)
      } catch (err) {
        if (db.isConnectionError(err)) throw err // peer down: bubble up
        // Non-connection error (e.g. a transient FK during a split-brain merge):
        // stop here so ordering is preserved; retried on the next cycle.
        console.warn(
          `[replication] ${srcName}->${dstName} seq ${entry.seq} (${entry.table_name}/${entry.op}) failed: ${err.message}`
        )
        stop = true
        break
      }
      await srcPool.query('update public.replication_log set shipped = true where seq = $1', [entry.seq])
      shipped++
    }
    if (stop || rows.length < BATCH) break
  }
  if (shipped > 0) console.log(`[replication] ${srcName} -> ${dstName}: ${shipped} change(s) replicated`)
  return shipped
}

async function runOnce() {
  if (cycleRunning) return
  cycleRunning = true
  try {
    const { primaryPool, secondaryPool } = db
    if (!primaryPool || !secondaryPool) return

    const [pUp, sUp] = await Promise.all([isUp(primaryPool), isUp(secondaryPool)])
    if (!pUp || !sUp) {
      // One side is down — keep buffering; we heal once both are reachable.
      return
    }

    try {
      await shipDirection(primaryPool, secondaryPool, 'primary', 'secondary')
    } catch (err) {
      console.warn('[replication] primary->secondary halted:', err.message)
    }
    try {
      await shipDirection(secondaryPool, primaryPool, 'secondary', 'primary')
    } catch (err) {
      console.warn('[replication] secondary->primary halted:', err.message)
    }
  } finally {
    cycleRunning = false
  }
}

async function cleanup() {
  const { primaryPool, secondaryPool } = db
  for (const pool of [primaryPool, secondaryPool]) {
    if (!pool) continue
    try {
      await pool.query(
        `delete from public.replication_log
          where shipped = true
            and changed_at < now() - ($1 || ' hours')::interval`,
        [String(RETENTION_HOURS)]
      )
    } catch {
      // best-effort; ignore (likely the DB is temporarily down)
    }
  }
}

async function start() {
  const { primaryPool, secondaryPool } = db
  if (!primaryPool || !secondaryPool) {
    console.log('[replication] secondary DB not configured — running single-database mode.')
    return
  }

  for (const [pool, name] of [
    [primaryPool, 'primary'],
    [secondaryPool, 'secondary'],
  ]) {
    try {
      await ensureObjects(pool, name)
    } catch (err) {
      console.warn(`[replication] could not initialize ${name}: ${err.message}`)
    }
  }

  // Heal any backlog immediately, then poll.
  runOnce().catch((err) => console.error('[replication] initial cycle error:', err.message))

  intervalTimer = setInterval(() => {
    runOnce().catch((err) => console.error('[replication] cycle error:', err.message))
  }, INTERVAL_MS)
  if (intervalTimer.unref) intervalTimer.unref()

  cleanupTimer = setInterval(() => {
    cleanup().catch(() => {})
  }, CLEANUP_MS)
  if (cleanupTimer.unref) cleanupTimer.unref()

  console.log(`[replication] worker started (interval ${INTERVAL_MS}ms, batch ${BATCH}).`)
}

function stop() {
  if (intervalTimer) clearInterval(intervalTimer)
  if (cleanupTimer) clearInterval(cleanupTimer)
  intervalTimer = null
  cleanupTimer = null
}

module.exports = { start, stop, runOnce, ensureObjects, REPLICATION_SQL }
