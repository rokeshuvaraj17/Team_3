require('dotenv').config()

const freeKey = process.env.FREE_JOB_API_KEY || process.env.free_job_api_key || ''

module.exports = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  // Secondary database (failover standby). Used automatically if the primary
  // (DATABASE_URL) is unreachable, and kept in sync by the replication worker.
  DB_USER2: process.env.DB_USER2 || '',
  DB_HOST2: process.env.DB_HOST2 || '',
  DB_NAME2: process.env.DB_NAME2 || '',
  DB_PASSWORD2: process.env.DB_PASSWORD2 || '',
  DB_PORT2: process.env.DB_PORT2 || '5432',
  // Set DB_SSL2=true only if your secondary Postgres server requires SSL.
  DB_SSL2: process.env.DB_SSL2 || '',
  // How long (ms) to stop sending traffic to a DB after a connection failure
  // before retrying it again (auto-recovery probe interval).
  DB_FAILOVER_COOLDOWN_MS: process.env.DB_FAILOVER_COOLDOWN_MS || '15000',
  PASSWORD_SALT: process.env.PASSWORD_SALT || '',
  ADZUNA_APP_ID: process.env.ADZUNA_APP_ID || freeKey,
  ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY || freeKey,
  JOOBLE_API_KEY: process.env.JOOBLE_API_KEY || '',
  REED_API_KEY: process.env.REED_API_KEY || '',
  JSEARCH_API_KEY: process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY || '',
  JSEARCH_API_HOST: process.env.JSEARCH_API_HOST || 'jsearch.p.rapidapi.com',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  GEMINI_URL: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  AUTOFILL_LLM_URL: (process.env.AUTOFILL_LLM_URL || '').trim(),
  AUTOFILL_LLM_API_KEY: (process.env.AUTOFILL_LLM_API_KEY || '').trim(),
  CLOUDINARY_CLOUD_NAME: process.env.cloudinary_cloud_name || process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.cloudinary_api_key || process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.cloudinary_api_secret || process.env.CLOUDINARY_API_SECRET || '',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
  NOTIFY_API_KEY: (process.env.NOTIFY_API_KEY || '').trim(),
  NOTIFY_API_BASE: (process.env.NOTIFY_API_BASE || 'https://notifications.rokeshcloud.com/v1').replace(/\/$/, ''),
  NOTIFY_APP_NAME: process.env.NOTIFY_APP_NAME || 'Rokesh Job Portal',
  NOTIFY_FROM: process.env.NOTIFY_FROM || 'MR Rokesh Softwares <noreply@notifications.rokeshcloud.com>',
}
