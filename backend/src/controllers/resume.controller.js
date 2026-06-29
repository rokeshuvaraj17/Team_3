const resumeModel = require('../models/resume.model')
const { uploadToCloudinary } = require('../services/cloudinary.service')
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require('../config/env')
const { handleDbError } = require('../middleware/errorHandler')

async function list(req, res) {
  try {
    const rows = await resumeModel.listByUserId(req.userId)
    res.json(rows)
  } catch (err) {
    const { status, body } = handleDbError(err, 'Resumes list')
    return res.status(status).json(body)
  }
}

async function create(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const fileUrl = typeof req.body?.file_url === 'string' ? req.body.file_url.trim() : ''
  const isPrimary = req.body?.is_primary === true || req.body?.is_primary === 'true'
  const htmlContent = typeof req.body?.html_content === 'string' ? req.body.html_content.trim() || null : null

  if (!name || name.length < 1) return res.status(400).json({ error: 'Resume name is required' })
  if (!fileUrl || fileUrl.length < 5) return res.status(400).json({ error: 'Resume file URL or data is required' })

  try {
    const row = await resumeModel.create(req.userId, name, fileUrl, isPrimary, htmlContent)
    res.status(201).json(row)
  } catch (err) {
    const { status, body } = handleDbError(err, 'Resume add')
    return res.status(status).json(body)
  }
}

async function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded. Upload a PDF or DOC/DOCX file.' })
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn('Resume upload skipped: Cloudinary not configured (set cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret in .env)')
    return res.status(503).json({ error: 'Cloudinary not configured. Set cloudinary_* in .env' })
  }
  const originalname = req.file.originalname || 'resume'
  try {
    const publicId = `user-${req.userId}-${Date.now()}-${originalname.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 40)}`
    const url = await uploadToCloudinary(req.file.buffer, 'resumes', {
      resource_type: 'raw',
      public_id: publicId,
    })
    if (!url || typeof url !== 'string') {
      console.error('Resume upload: Cloudinary returned no URL')
      return res.status(502).json({ error: 'Resume upload failed: no URL from storage.' })
    }
    console.log('Resume uploaded to Cloudinary:', { userId: req.userId, name: originalname, url, size: req.file.size })
    res.status(201).json({ file_url: url, name: originalname })
  } catch (err) {
    console.error('Resume upload error:', err.message || err)
    res.status(502).json({ error: err.message || 'Resume upload failed.' })
  }
}

async function getText(req, res) {
  const { id } = req.params
  try {
    const row = await resumeModel.getContentById(id, req.userId)
    if (!row) return res.status(404).json({ error: 'Resume not found' })
    const { html_content, file_url } = row
    if (html_content && typeof html_content === 'string' && html_content.trim().length > 0) {
      const text = html_content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      return res.json({ text: text || '' })
    }
    if (!file_url) return res.json({ text: '' })
    const resp = await fetch(file_url, { redirect: 'follow' })
    if (!resp.ok) {
      if (resp.status === 401 && file_url.includes('cloudinary')) {
        console.error('Resume text: Cloudinary returned 401. Enable "Allow delivery of PDF and ZIP files" in Cloudinary Dashboard > Settings > Security.')
      } else {
        console.error('Resume text: fetch failed', resp.status, file_url)
      }
      return res.status(502).json({ error: 'File could not be retrieved.' })
    }
    const buf = Buffer.from(await resp.arrayBuffer())
    const contentType = (resp.headers.get('content-type') || '').toLowerCase()
    const urlLooksPdf = file_url.toLowerCase().includes('.pdf')
    const bufferIsPdf = buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-'
    const treatAsPdf = contentType.includes('pdf') || urlLooksPdf || bufferIsPdf
    if (treatAsPdf) {
      try {
        const { PDFParse } = require('pdf-parse')
        const parser = new PDFParse({ data: buf })
        const result = await parser.getText()
        await parser.destroy()
        const text = (result && result.text) ? String(result.text).trim() : ''
        return res.json({ text })
      } catch (e) {
        console.error('PDF parse error:', e.message)
        return res.json({ text: '' })
      }
    }
    return res.json({ text: '' })
  } catch (err) {
    console.error('Resume text:', err)
    return res.status(502).json({ error: err.message || 'Failed to get resume text.' })
  }
}

async function getFile(req, res) {
  const { id } = req.params
  try {
    const row = await resumeModel.getFileUrlById(id, req.userId)
    if (!row) return res.status(404).json({ error: 'Resume not found' })
    const fileUrl = row.file_url
    if (!fileUrl) return res.status(404).json({ error: 'No file URL for this resume' })
    const resp = await fetch(fileUrl, { redirect: 'follow' })
    if (!resp.ok) {
      if (resp.status === 401 && fileUrl.includes('cloudinary')) {
        console.error('Resume file proxy: Cloudinary 401. Enable "Allow delivery of PDF and ZIP files" in Cloudinary Dashboard > Settings > Security.')
      } else {
        console.error('Resume file proxy: upstream returned', resp.status, fileUrl)
      }
      return res.status(502).json({ error: 'File could not be retrieved from storage. The link may have expired or be invalid.' })
    }
    const contentType = resp.headers.get('content-type') || 'application/pdf'
    res.setHeader('Content-Type', contentType)
    const buf = Buffer.from(await resp.arrayBuffer())
    res.send(buf)
  } catch (err) {
    console.error('Resume file proxy:', err)
    return res.status(502).json({ error: err.message || 'File could not be loaded. Check server logs.' })
  }
}

async function remove(req, res) {
  try {
    const deleted = await resumeModel.deleteById(req.params.id, req.userId)
    if (!deleted) return res.status(404).json({ error: 'Resume not found' })
    res.status(204).send()
  } catch (err) {
    const { status, body } = handleDbError(err, 'Resume delete')
    return res.status(status).json(body)
  }
}

async function update(req, res) {
  const { id } = req.params
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : null
  const htmlContent = req.body?.html_content !== undefined
    ? (typeof req.body.html_content === 'string' ? req.body.html_content.trim() || null : null)
    : undefined
  const fileUrl = typeof req.body?.file_url === 'string' ? req.body.file_url.trim() : null
  if (!name && htmlContent === undefined && !fileUrl) {
    return res.status(400).json({ error: 'Provide at least one of name, html_content, or file_url' })
  }
  try {
    const fields = {}
    if (name !== null) fields.name = name
    if (htmlContent !== undefined) fields.htmlContent = htmlContent
    if (fileUrl !== null) fields.fileUrl = fileUrl
    const row = await resumeModel.update(id, req.userId, fields)
    if (!row) {
      if (htmlContent !== undefined && !fileUrl && !name) {
        return res.status(400).json({ error: 'Provide name or file_url (html_content not available)' })
      }
      return res.status(404).json({ error: 'Resume not found' })
    }
    res.json(row)
  } catch (err) {
    const { status, body } = handleDbError(err, 'Resume update')
    return res.status(status).json(body)
  }
}

async function setPrimary(req, res) {
  try {
    const success = await resumeModel.setPrimary(req.params.id, req.userId)
    if (!success) return res.status(404).json({ error: 'Resume not found' })
    res.json({ success: true })
  } catch (err) {
    const { status, body } = handleDbError(err, 'Resume set primary')
    return res.status(status).json(body)
  }
}

module.exports = { list, create, upload, getText, getFile, remove, update, setPrimary }
