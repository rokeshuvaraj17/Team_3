/**
 * Compile LaTeX string to PDF using node-latex (pdflatex), with fallback to LaTeX.Online when local LaTeX is not installed.
 */

const latex = require('node-latex')
const archiver = require('archiver')
const https = require('https')

/**
 * @param {string} texDoc - Full LaTeX document string
 * @param {{ cmd?: string, passes?: number }} opts - Optional: cmd (default 'pdflatex'), passes (default 1)
 * @returns {Promise<Buffer>} PDF buffer
 */
function compilePdf(texDoc, opts = {}) {
  const cmd = opts.cmd || 'pdflatex'
  const passes = opts.passes != null ? opts.passes : 1

  return new Promise((resolve, reject) => {
    const chunks = []
    const pdfStream = latex(texDoc, {
      cmd,
      passes,
      args: ['-halt-on-error'],
    })

    pdfStream.on('data', (chunk) => chunks.push(chunk))
    pdfStream.on('end', () => resolve(Buffer.concat(chunks)))
    pdfStream.on('error', (err) => {
      const msg = err.message || String(err)
      if (msg.includes('spawn') && msg.includes('ENOENT')) {
        reject(new Error('LaTeX is not installed. Install TeX Live (https://www.latex-project.org/get/) or MacTeX to generate PDFs.'))
      } else if (msg.includes('Unable to run') || (msg.includes('pdflatex') && msg.includes('command'))) {
        reject(new Error('LaTeX (pdflatex) is not installed or not in PATH. Install TeX Live or MacTeX to generate PDFs.'))
      } else {
        reject(err)
      }
    })
  })
}

/** Max LaTeX length for GET /compile (URL limit ~2048–8K; keep safe for all servers). */
const LATEX_ONLINE_GET_MAX_LEN = 1800

/**
 * LaTeX.Online GET /compile – simple REST: compile?text=... returns PDF. Use for short docs to avoid URL length limits.
 * @param {string} texDoc - Full LaTeX document string
 * @returns {Promise<Buffer>} PDF buffer
 */
function compileViaLatexOnlineGet(texDoc) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(texDoc)
    const path = '/compile?command=pdflatex&text=' + encoded

    const req = https.request(
      {
        hostname: 'latexonline.cc',
        path,
        method: 'GET',
      },
      (res) => {
        const buf = []
        res.on('data', (chunk) => buf.push(chunk))
        res.on('end', () => {
          const data = Buffer.concat(buf)
          if (res.statusCode === 414) {
            reject(new Error('Document too long for GET /compile (use tarball fallback).'))
            return
          }
          if (res.statusCode !== 200) {
            reject(new Error(`LaTeX.Online /compile returned ${res.statusCode}. Use "Download .tex" and compile in Overleaf or locally.`))
            return
          }
          const ct = (res.headers['content-type'] || '').toLowerCase()
          if (ct.includes('application/pdf')) {
            resolve(data)
            return
          }
          if (data.length < 500 && data.toString('utf8').includes('error')) {
            reject(new Error('LaTeX.Online compilation failed. Use "Download .tex" and compile in Overleaf or locally.'))
            return
          }
          resolve(data)
        })
      }
    )
    req.on('error', (err) => reject(new Error('LaTeX.Online unreachable: ' + (err.message || 'network error'))))
    req.end()
  })
}

/**
 * LaTeX.Online POST /data – tarball upload for long documents. Creates a tarball and POSTs to latexonline.cc/data.
 * @param {string} texDoc - Full LaTeX document string
 * @returns {Promise<Buffer>} PDF buffer
 */
function compileViaLatexOnlineTarball(texDoc) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const archive = archiver('tar', { gzip: true })
    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('error', reject)
    archive.on('end', () => {
      const tarball = Buffer.concat(chunks)
      const url = new URL('https://latexonline.cc/data')
      url.searchParams.set('command', 'pdflatex')
      url.searchParams.set('target', 'main.tex')

      const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
      const bodyStart = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="project.tar.gz"',
        'Content-Type: application/gzip',
        '',
      ].join('\r\n')
      const bodyEnd = `\r\n--${boundary}--\r\n`
      const body = Buffer.concat([
        Buffer.from(bodyStart, 'utf8'),
        tarball,
        Buffer.from(bodyEnd, 'utf8'),
      ])

      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + '?' + url.searchParams.toString(),
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
          },
        },
        (res) => {
          const buf = []
          res.on('data', (chunk) => buf.push(chunk))
          res.on('end', () => {
            const data = Buffer.concat(buf)
            if (res.statusCode !== 200) {
              reject(new Error(`LaTeX.Online returned ${res.statusCode}. Use "Download .tex" and compile in Overleaf or locally.`))
              return
            }
            const ct = (res.headers['content-type'] || '').toLowerCase()
            if (ct.includes('application/pdf')) {
              resolve(data)
              return
            }
            if (data.length < 500 && data.toString('utf8').includes('error')) {
              reject(new Error('LaTeX.Online compilation failed. Use "Download .tex" and compile in Overleaf or locally.'))
              return
            }
            resolve(data)
          })
        }
      )
      req.on('error', (err) => reject(new Error('LaTeX.Online unreachable: ' + (err.message || 'network error'))))
      req.write(body)
      req.end()
    })
    archive.append(texDoc, { name: 'main.tex' })
    archive.finalize()
  })
}

/**
 * Fallback: compile via LaTeX.Online. Prefer GET /compile for short docs (simple REST API); use POST /data tarball for longer.
 * @param {string} texDoc - Full LaTeX document string
 * @returns {Promise<Buffer>} PDF buffer
 */
async function compileViaLatexOnline(texDoc) {
  if (texDoc.length <= LATEX_ONLINE_GET_MAX_LEN) {
    try {
      return await compileViaLatexOnlineGet(texDoc)
    } catch (_) {
      // e.g. 414 or network; try tarball if GET failed (path might still be too long in practice)
      return await compileViaLatexOnlineTarball(texDoc)
    }
  }
  return await compileViaLatexOnlineTarball(texDoc)
}

/**
 * Compile LaTeX to PDF: try local pdflatex first; if that fails (e.g. LaTeX not installed), use LaTeX.Online.
 * @param {string} texDoc - Full LaTeX document string
 * @param {{ cmd?: string, passes?: number }} opts - Optional (used only for local compile)
 * @returns {Promise<Buffer>} PDF buffer
 */
async function compilePdfWithFallback(texDoc, opts = {}) {
  try {
    return await compilePdf(texDoc, opts)
  } catch (localErr) {
    try {
      return await compileViaLatexOnline(texDoc)
    } catch (onlineErr) {
      const localMsg = localErr.message || String(localErr)
      const onlineMsg = onlineErr.message || String(onlineErr)
      throw new Error(
        `Local PDF compile failed: ${localMsg}. Online fallback failed: ${onlineMsg}. You can still use "Download .tex" and compile in Overleaf or locally.`
      )
    }
  }
}

module.exports = {
  compilePdf,
  compilePdfWithFallback,
  compileViaLatexOnline,
  compileViaLatexOnlineGet,
  compileViaLatexOnlineTarball,
}
