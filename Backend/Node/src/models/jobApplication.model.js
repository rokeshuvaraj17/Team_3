const pool = require('../config/db')

async function upsert(userId, jobId, resumeId, coverLetterText) {
  await pool.query(
    `insert into public.job_applications (user_id, job_id, resume_id, cover_letter_text, application_status, applied_at)
     values ($1, $2, $3, $4, 'SUBMITTED', now())
     on conflict (user_id, job_id) do update set resume_id = $3, cover_letter_text = $4, application_status = 'SUBMITTED', applied_at = now(), updated_at = now()`,
    [userId, jobId, resumeId, coverLetterText]
  )
}

async function hasApplied(userId, jobId) {
  const { rows } = await pool.query(
    'select 1 from public.job_applications where user_id = $1 and job_id = $2',
    [userId, jobId]
  )
  return !!rows[0]
}

module.exports = { upsert, hasApplied }
