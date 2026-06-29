const coverLetterModel = require('../models/coverLetter.model')
const { uploadToCloudinary } = require('../services/cloudinary.service')
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require('../config/env')
const pool = require('../config/db')
const { handleDbError } = require('../middleware/errorHandler')

async function list(req, res) {
  try {
    const rows = await coverLetterModel.listByUserId(req.userId)
    res.json(rows)
  } catch (err) {
    const { status, body } = handleDbError(err, 'Cover letters list')
    return res.status(status).json(body)
  }
}

async function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded. Upload a PDF, DOC, or TXT file.' })
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return res.status(503).json({ error: 'Cloudinary not configured' })
  const title = (req.body?.title && typeof req.body.title === 'string') ? req.body.title.trim() : (req.file.originalname || 'Cover letter')
  try {
    const url = await uploadToCloudinary(req.file.buffer, 'cover-letters', {
      resource_type: 'raw',
      public_id: `user-${req.userId}-${Date.now()}-${(req.file.originalname || 'cover').replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 40)}`
    })
    if (!pool) return res.status(503).json({ error: 'Database not configured' })
    const row = await coverLetterModel.create(req.userId, title, url)
    res.status(201).json(row)
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Run migration create_cover_letters.sql first.' })
    console.error('Cover letter upload:', err)
    res.status(502).json({ error: err.message || 'Upload failed.' })
  }
}

async function getText(req, res) {
  const { id } = req.params
  try {
    const row = await coverLetterModel.getContentById(id, req.userId)
    if (!row) return res.status(404).json({ error: 'Cover letter not found' })
    const { html_content, file_url } = row
    if (html_content && typeof html_content === 'string' && html_content.trim().length > 0) {
      const text = html_content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      return res.json({ text: text || '' })
    }
    if (!file_url) return res.json({ text: '' })
    const resp = await fetch(file_url, { redirect: 'follow' })
    if (!resp.ok) {
      if (resp.status === 401 && file_url.includes('cloudinary')) {
        console.error('Cover letter text: Cloudinary returned 401.')
      } else {
        console.error('Cover letter text: fetch failed', resp.status, file_url)
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
        console.error('Cover letter PDF parse error:', e.message)
        return res.json({ text: '' })
      }
    }
    return res.json({ text: '' })
  } catch (err) {
    console.error('Cover letter text:', err)
    return res.status(502).json({ error: err.message || 'Failed to get cover letter text.' })
  }
}

async function getFile(req, res) {
  const { id } = req.params
  try {
    const row = await coverLetterModel.getFileUrlById(id, req.userId)
    if (!row) return res.status(404).json({ error: 'Cover letter not found' })
    const fileUrl = row.file_url
    if (!fileUrl) return res.status(404).json({ error: 'No file URL for this cover letter' })
    const resp = await fetch(fileUrl, { redirect: 'follow' })
    if (!resp.ok) {
      if (resp.status === 401 && fileUrl.includes('cloudinary')) {
        console.error('Cover letter file proxy: Cloudinary 401. Enable "Allow delivery of PDF and ZIP files" in Cloudinary Dashboard > Settings > Security.')
      } else {
        console.error('Cover letter file proxy: upstream returned', resp.status, fileUrl)
      }
      return res.status(502).json({ error: 'File could not be retrieved from storage. The link may have expired or be invalid.' })
    }
    const contentType = resp.headers.get('content-type') || 'application/pdf'
    res.setHeader('Content-Type', contentType)
    const buf = Buffer.from(await resp.arrayBuffer())
    res.send(buf)
  } catch (err) {
    console.error('Cover letter file proxy:', err)
    return res.status(502).json({ error: err.message || 'File could not be loaded. Check server logs.' })
  }
}

async function update(req, res) {
  const { id } = req.params
  const title = req.body?.title !== undefined && typeof req.body.title === 'string' ? req.body.title.trim() || null : undefined
  const htmlContent = req.body?.html_content !== undefined
    ? (typeof req.body.html_content === 'string' ? req.body.html_content.trim() || null : null)
    : undefined
  if (title === undefined && htmlContent === undefined) {
    return res.status(400).json({ error: 'Provide at least one of title or html_content' })
  }
  try {
    const fields = {}
    if (title !== undefined) fields.title = title
    if (htmlContent !== undefined) fields.htmlContent = htmlContent
    const row = await coverLetterModel.update(id, req.userId, fields)
    if (!row) return res.status(404).json({ error: 'Cover letter not found' })
    res.json(row)
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Cover letters table not found. Run migration.' })
    const { status, body } = handleDbError(err, 'Cover letter update')
    return res.status(status).json(body)
  }
}

async function remove(req, res) {
  try {
    const deleted = await coverLetterModel.deleteById(req.params.id, req.userId)
    if (!deleted) return res.status(404).json({ error: 'Cover letter not found' })
    res.status(204).send()
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Cover letters table not found. Run migration.' })
    const { status, body } = handleDbError(err, 'Cover letter delete')
    return res.status(status).json(body)
  }
}

module.exports = { list, upload, getText, getFile, update, remove }
