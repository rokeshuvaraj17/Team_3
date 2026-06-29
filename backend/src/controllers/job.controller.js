const jobSearchService = require('../services/jobSearch.service')
const jobModel = require('../models/job.model')
const jobApplicationModel = require('../models/jobApplication.model')
const resumeModel = require('../models/resume.model')
const { handleDbError } = require('../middleware/errorHandler')

async function searchAdzuna(req, res) {
  try {
    const result = await jobSearchService.searchAdzuna({
      country: (req.query.country || 'us').toString(),
      page: req.query.page,
      what: req.query.what,
      where: req.query.where,
      salary_min: req.query.salary_min,
      salary_max: req.query.salary_max,
      full_time: req.query.full_time,
      permanent: req.query.permanent,
      sort_by: req.query.sort_by,
      results_per_page: req.query.results_per_page,
    })
    if (result.error) return res.status(result.status).json({ error: result.error })
    if (result.status && result.status !== 200) return res.status(result.status).json(result.data)
    res.json(result.data)
  } catch (err) {
    console.error('Adzuna proxy error:', err.message)
    return res.status(502).json({ error: 'Could not fetch jobs. Check backend is running and try again.' })
  }
}

async function searchJooble(req, res) {
  try {
    const result = await jobSearchService.searchJooble({
      keywords: (req.query.keywords || '').toString().trim(),
      location: (req.query.location || '').toString().trim(),
      country: (req.query.country || '').toString().trim().toLowerCase().replace(/[^a-z]/g, '') || null,
      page: req.query.page,
    })
    if (result.error) return res.status(result.status).json({ error: result.error })
    if (result.status && result.status !== 200) return res.status(result.status).json(result.data)
    res.json(result.data)
  } catch (err) {
    console.error('Jooble proxy error:', err.message)
    return res.status(502).json({ error: 'Could not fetch jobs. Check backend is running and try again.' })
  }
}

async function searchArbeitnow(req, res) {
  try {
    const result = await jobSearchService.searchArbeitnow({
      keywords: (req.query.keywords || '').toString().trim(),
      location: (req.query.location || '').toString().trim(),
      country: (req.query.country || '').toString().trim().toLowerCase().replace(/[^a-z]/g, '') || null,
    })
    if (result.error) return res.status(result.status).json({ error: result.error })
    if (result.status && result.status !== 200) return res.status(result.status).json(result.data)
    res.json(result.data)
  } catch (err) {
    console.error('Arbeitnow proxy error:', err.message)
    return res.status(502).json({ error: 'Could not fetch jobs. Check backend is running and try again.' })
  }
}

async function searchReed(req, res) {
  try {
    const result = await jobSearchService.searchReed({
      keywords: (req.query.keywords || '').toString().trim(),
      locationName: (req.query.locationName || req.query.location || '').toString().trim(),
      resultsToTake: req.query.resultsToTake,
      resultsToSkip: req.query.resultsToSkip,
    })
    if (result.error) return res.status(result.status).json({ error: result.error })
    if (result.status && result.status !== 200) return res.status(result.status).json(result.data)
    res.json(result.data)
  } catch (err) {
    console.error('Reed proxy error:', err.message)
    return res.status(502).json({ error: 'Could not fetch jobs. Check backend is running and try again.' })
  }
}

async function searchJsearch(req, res) {
  try {
    const result = await jobSearchService.searchJsearch({
      query: (req.query.query || req.query.q || req.query.keywords || '').toString().trim(),
      page: req.query.page,
      num_pages: req.query.num_pages,
      country: (req.query.country || '').toString().trim().toLowerCase().replace(/[^a-z]/g, '') || null,
      date_posted: req.query.date_posted,
      employment_types: req.query.employment_types,
      remote_jobs_only: req.query.remote_jobs_only,
    })
    if (result.error) return res.status(result.status).json({ error: result.error })
    if (result.status && result.status !== 200) return res.status(result.status).json(result.data)
    res.json(result.data)
  } catch (err) {
    console.error('JSearch proxy error:', err.message)
    return res.status(502).json({ error: 'Could not fetch jobs. Check backend is running and try again.' })
  }
}

async function list(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const limit = req.query.limit
  try {
    const rows = await jobModel.list(q, limit)
    res.json(rows)
  } catch (err) {
    const { status, body } = handleDbError(err, 'Jobs list')
    return res.status(status).json(body)
  }
}

async function getOne(req, res) {
  try {
    const job = await jobModel.getById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    res.json(job)
  } catch (err) {
    const { status, body } = handleDbError(err, 'Job get')
    return res.status(status).json(body)
  }
}

async function apply(req, res) {
  const { id: jobId } = req.params
  const { resume_id: resumeId, cover_letter_text: coverLetterText } = req.body || {}

  try {
    const jobExists = await jobModel.exists(jobId)
    if (!jobExists) return res.status(404).json({ error: 'Job not found' })

    let resumeIdToUse = resumeId
    if (!resumeIdToUse) {
      const primary = await resumeModel.getPrimaryOrFirst(req.userId)
      if (!primary) return res.status(400).json({ error: 'Upload a resume in your profile before applying' })
      resumeIdToUse = primary.id
    } else {
      const owns = await resumeModel.existsForUser(resumeIdToUse, req.userId)
      if (!owns) return res.status(400).json({ error: 'Resume not found' })
    }

    await jobApplicationModel.upsert(
      req.userId,
      jobId,
      resumeIdToUse,
      typeof coverLetterText === 'string' ? coverLetterText.trim() || null : null
    )
    res.status(201).json({ success: true, message: 'Application submitted' })
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Invalid job or resume' })
    const { status, body } = handleDbError(err, 'Job apply')
    return res.status(status).json(body)
  }
}

async function checkApplied(req, res) {
  try {
    const applied = await jobApplicationModel.hasApplied(req.userId, req.params.id)
    res.json({ applied })
  } catch (err) {
    const { status, body } = handleDbError(err, 'Job applied check')
    return res.status(status).json(body)
  }
}

module.exports = { searchAdzuna, searchJooble, searchArbeitnow, searchReed, searchJsearch, list, getOne, apply, checkApplied }
