require('dotenv').config()

const freeKey = process.env.FREE_JOB_API_KEY || process.env.free_job_api_key || ''

module.exports = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  PASSWORD_SALT: process.env.PASSWORD_SALT || '',
  ADZUNA_APP_ID: process.env.ADZUNA_APP_ID || freeKey,
  ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY || freeKey,
  JOOBLE_API_KEY: process.env.JOOBLE_API_KEY || '',
  REED_API_KEY: process.env.REED_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  GEMINI_URL: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  AUTOFILL_LLM_URL: (process.env.AUTOFILL_LLM_URL || '').trim(),
  AUTOFILL_LLM_API_KEY: (process.env.AUTOFILL_LLM_API_KEY || '').trim(),
  CLOUDINARY_CLOUD_NAME: process.env.cloudinary_cloud_name || process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.cloudinary_api_key || process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET || '',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
}
