#!/usr/bin/env node
/**
 * Fetch a resume URL from Cloudinary, check format, save to temp file, and open in PDF reader.
 * Usage: node check-cloudinary-pdf.js [resume_url]
 *   If no URL given, fetches first resume from DB.
 */
require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DATABASE_URL = process.env.DATABASE_URL
const isRemoteDb = DATABASE_URL && !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(DATABASE_URL)
const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
  ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {}),
}) : null

async function getFirstResumeUrl() {
  if (!pool) return null
  const { rows } = await pool.query(
    'select file_url from public.resumes order by uploaded_at desc limit 1'
  )
  return rows[0]?.file_url || null
}

async function main() {
  let url = process.argv[2]
  if (!url && pool) {
    url = await getFirstResumeUrl()
    if (url) console.log('Using first resume URL from DB:', url)
  }
  if (!url) {
    console.error('Usage: node check-cloudinary-pdf.js [resume_url]')
    console.error('  Or set DATABASE_URL and run without args to use first resume from DB.')
    process.exit(1)
  }

  console.log('Fetching:', url)
  const res = await fetch(url, { redirect: 'follow' })
  console.log('Status:', res.status)
  const contentType = res.headers.get('content-type') || ''
  const contentLength = res.headers.get('content-length') || '?'
  console.log('Content-Type:', contentType)
  console.log('Content-Length:', contentLength)
  const xCldError = res.headers.get('x-cld-error')
  if (xCldError) console.log('x-cld-error:', xCldError)

  const buf = Buffer.from(await res.arrayBuffer())
  console.log('Body length:', buf.length)

  if (res.status !== 200 || buf.length === 0) {
    if (res.status === 401 && url.includes('cloudinary')) {
      console.log('\n-> Cloudinary returned 401. Enable "Allow delivery of PDF and ZIP files" in Cloudinary Dashboard > Settings > Security.')
    }
    process.exit(1)
  }

  const isPdfMagic = buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-'
  console.log('PDF magic bytes (%PDF-):', isPdfMagic ? 'yes' : 'no')

  const tmpDir = path.join(require('os').tmpdir(), 'resume-check')
  fs.mkdirSync(tmpDir, { recursive: true })
  const ext = contentType.includes('pdf') || url.toLowerCase().includes('.pdf') ? '.pdf' : '.bin'
  const tmpFile = path.join(tmpDir, `resume-${Date.now()}${ext}`)
  fs.writeFileSync(tmpFile, buf)
  console.log('Saved to:', tmpFile)

  try {
    const fileOut = execSync(`file "${tmpFile}"`, { encoding: 'utf8' })
    console.log('file(1) says:', fileOut.trim())
  } catch (e) {
    // file command might not exist on some systems
  }

  const platform = process.platform
  if (isPdfMagic && (platform === 'darwin' || platform === 'win32' || platform === 'linux')) {
    try {
      if (platform === 'darwin') {
        execSync(`open "${tmpFile}"`, { stdio: 'inherit' })
        console.log('Opened in default PDF reader (Preview).')
      } else if (platform === 'win32') {
        execSync(`start "" "${tmpFile}"`, { stdio: 'inherit' })
        console.log('Opened in default PDF reader.')
      } else {
        execSync(`xdg-open "${tmpFile}"`, { stdio: 'inherit' })
        console.log('Opened in default PDF reader.')
      }
    } catch (e) {
      console.log('Could not open PDF reader:', e.message)
    }
  }

  if (pool) await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
