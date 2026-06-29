const path = require('path')
const fs = require('fs')

const extensionJobResumeContext = new Map()
const extensionCoverLetterContext = new Map()

function postJobResumeContext(req, res) {
  const userId = req.userId
  const resume = typeof req.body?.resume === 'string' ? req.body.resume.trim() : ''
  const job_description = typeof req.body?.job_description === 'string' ? req.body.job_description.trim() : ''
  const company_name = typeof req.body?.company_name === 'string' ? req.body.company_name.trim() : ''
  const job_title = typeof req.body?.job_title === 'string' ? req.body.job_title.trim() : ''
  if (!resume || !job_description) return res.status(400).json({ error: 'resume and job_description required' })
  extensionJobResumeContext.set(userId, { resume, job_description, company_name, job_title })
  res.json({ ok: true })
}

function getJobResumeContext(req, res) {
  const userId = req.userId
  const data = extensionJobResumeContext.get(userId)
  extensionJobResumeContext.delete(userId)
  return res.json(data || { resume: '', job_description: '' })
}

function download(req, res) {
  const projectRoot = path.join(__dirname, '../../../')
  const candidates = [
    path.join(projectRoot, 'frontend/public/team3-extension.zip'),
    path.join(process.cwd(), 'frontend/public/team3-extension.zip'),
    path.join(process.cwd(), 'public/team3-extension.zip'),
  ]
  const zipPath = candidates.find((p) => fs.existsSync(p))
  if (!zipPath) {
    return res.status(404).json({
      error: 'Extension zip not built. From project root run: cd frontend && npm run extension:zip',
    })
  }
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', 'attachment; filename="team3-extension.zip"')
  const stream = fs.createReadStream(zipPath)
  stream.on('error', (err) => {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to read extension zip' })
  })
  stream.pipe(res)
}

function postCoverLetterContext(req, res) {
  const userId = req.userId
  const resume = typeof req.body?.resume === 'string' ? req.body.resume.trim() : ''
  const job_description = typeof req.body?.job_description === 'string' ? req.body.job_description.trim() : ''
  const company_name = typeof req.body?.company_name === 'string' ? req.body.company_name.trim() : ''
  const job_title = typeof req.body?.job_title === 'string' ? req.body.job_title.trim() : ''
  if (!resume || !job_description) return res.status(400).json({ error: 'resume and job_description required' })
  extensionCoverLetterContext.set(userId, { resume, job_description, company_name, job_title })

  // #region agent log
  fetch('http://127.0.0.1:7432/ingest/ef57fcee-7603-40e6-8f59-4c9f287b5350', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '652fa8',
    },
    body: JSON.stringify({
      sessionId: '652fa8',
      runId: 'cover-letter-flow',
      hypothesisId: 'A',
      location: 'extension.controller.js:postCoverLetterContext',
      message: 'Stored extension cover letter context',
      data: { hasResume: !!resume, hasJobDescription: !!job_description, company_name, job_title },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  res.json({ ok: true })
}

function getCoverLetterContext(req, res) {
  const userId = req.userId
  const data = extensionCoverLetterContext.get(userId)
  extensionCoverLetterContext.delete(userId)

  // #region agent log
  fetch('http://127.0.0.1:7432/ingest/ef57fcee-7603-40e6-8f59-4c9f287b5350', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '652fa8',
    },
    body: JSON.stringify({
      sessionId: '652fa8',
      runId: 'cover-letter-flow',
      hypothesisId: 'B',
      location: 'extension.controller.js:getCoverLetterContext',
      message: 'Returned extension cover letter context',
      data: {
        hasData: !!data,
        company_name: data?.company_name || '',
        job_title: data?.job_title || '',
        hasResume: !!data?.resume,
        hasJobDescription: !!data?.job_description,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  return res.json(data || { resume: '', job_description: '' })
}

module.exports = { postJobResumeContext, getJobResumeContext, download, postCoverLetterContext, getCoverLetterContext }
