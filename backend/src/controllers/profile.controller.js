const profileModel = require('../models/profile.model')
const { uploadToCloudinary } = require('../services/cloudinary.service')
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require('../config/env')
const pool = require('../config/db')
const { handleDbError } = require('../middleware/errorHandler')

async function get(req, res) {
  try {
    const profile = await profileModel.getByUserId(req.userId)
    if (!profile) return res.status(404).json({ error: 'Profile not found' })
    res.json(profile)
  } catch (err) {
    const { status, body } = handleDbError(err, 'Profile get')
    return res.status(status).json(body)
  }
}

async function update(req, res) {
  const body = req.body || {}
  const display_name = typeof body.display_name === 'string' ? body.display_name.trim() : null
  if (display_name !== null && display_name.length < 2) return res.status(400).json({ error: 'Display name must be at least 2 characters' })
  const location_country = typeof body.location_country === 'string' ? body.location_country.trim() : null
  if (location_country && location_country.length !== 2) return res.status(400).json({ error: 'Country must be a 2-letter code' })
  const phoneRaw = body.phone != null && typeof body.phone === 'string' ? body.phone.trim() : null
  if (phoneRaw) {
    const digits = phoneRaw.replace(/\D/g, '')
    if (digits.length < 10) return res.status(400).json({ error: 'Phone number must be at least 10 digits' })
  }

  const getNull = (v) => (v != null && typeof v === 'string' ? v.trim() || null : null)

  try {
    const row = await profileModel.getAll(req.userId)
    const merged = {
      display_name: display_name ?? row?.display_name ?? '',
      headline: getNull(body.headline) ?? row?.headline ?? null,
      summary: getNull(body.summary) ?? row?.summary ?? null,
      location: getNull(body.location) ?? row?.location ?? null,
      location_country: location_country ?? row?.location_country ?? null,
      state: getNull(body.state) ?? row?.state ?? null,
      profile_image_url: getNull(body.profile_image_url) ?? row?.profile_image_url ?? null,
      phone: getNull(body.phone) ?? row?.phone ?? null,
      website_url: getNull(body.website_url) ?? row?.website_url ?? null,
      linkedin_url: getNull(body.linkedin_url) ?? row?.linkedin_url ?? null,
    }
    if (!merged.display_name) return res.status(400).json({ error: 'Display name is required' })

    const result = await profileModel.upsert(req.userId, merged)
    res.json(result)
  } catch (err) {
    const { status, body: errBody } = handleDbError(err, 'Profile put')
    return res.status(status).json(errBody)
  }
}

async function uploadPhoto(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded. Use PNG, JPEG, GIF, or WebP.' })
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(503).json({ error: 'Cloudinary not configured. Set cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret in .env' })
  }
  try {
    const url = await uploadToCloudinary(req.file.buffer, 'profile-photos', { public_id: `user-${req.userId}-${Date.now()}` })
    if (!pool) return res.status(503).json({ error: 'Database not configured' })
    const result = await profileModel.updatePhoto(req.userId, url)
    if (!result) return res.status(404).json({ error: 'Profile not found. Save your profile (name, etc.) first.' })
    res.status(200).json({ profile_image_url: result.profile_image_url })
  } catch (err) {
    console.error('Profile photo upload:', err)
    res.status(502).json({ error: err.message || 'Photo upload failed.' })
  }
}

module.exports = { get, update, uploadPhoto }
