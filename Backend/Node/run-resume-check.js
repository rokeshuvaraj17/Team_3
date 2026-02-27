#!/usr/bin/env node
/**
 * List all resumes from the database and show file_url and format (PDF/DOC/other).
 * Usage: node run-resume-check.js [--check-url]
 *   --check-url  Fetch HEAD for each file_url to verify it's reachable and get Content-Type (slower).
 */
require('dotenv').config()
const { Pool } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env')
  process.exit(1)
}

const checkUrl = process.argv.includes('--check-url')
const isRemoteDb = !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(DATABASE_URL)
const pool = new Pool({
  connectionString: DATABASE_URL,
  ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {}),
})

function inferFormat(name, fileUrl) {
  const n = (name || '').toLowerCase()
  const u = (fileUrl || '').toLowerCase()
  if (n.endsWith('.pdf') || u.endsWith('.pdf') || u.includes('/pdf')) return 'PDF'
  if (n.endsWith('.doc') || u.endsWith('.doc')) return 'DOC'
  if (n.endsWith('.docx') || u.endsWith('.docx')) return 'DOCX'
  return 'unknown'
}

async function headUrl(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    const ct = resp.headers.get('content-type') || ''
    return { ok: resp.ok, status: resp.status, contentType: ct }
  } catch (e) {
    return { ok: false, status: 0, contentType: '', error: e.message }
  }
}

async function run() {
  try {
    const hasHtmlCol = await pool.query(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'resumes' and column_name = 'html_content'
    `).then(r => r.rows.length > 0)

    const cols = hasHtmlCol
      ? 'id, user_id, name, file_url, is_primary, uploaded_at, html_content'
      : 'id, user_id, name, file_url, is_primary, uploaded_at'
    const { rows } = await pool.query(
      `select ${cols} from public.resumes order by uploaded_at desc`
    )

    console.log('Resumes in database:', rows.length)
    console.log('')

    for (const r of rows) {
      const format = inferFormat(r.name, r.file_url)
      const hasHtml = hasHtmlCol && r.html_content != null && String(r.html_content).trim().length > 0
      console.log('---')
      console.log('id:         ', r.id)
      console.log('user_id:    ', r.user_id)
      console.log('name:       ', r.name)
      console.log('file_url:   ', r.file_url || '(empty)')
      console.log('inferred:   ', format, hasHtml ? '(has html_content)' : '')
      if (checkUrl && r.file_url) {
        const head = await headUrl(r.file_url)
        console.log('HEAD check: ', head.ok ? `OK ${head.status}` : `FAIL ${head.status}`, head.contentType ? `Content-Type: ${head.contentType}` : '', head.error || '')
      }
      console.log('')
    }
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

run()
