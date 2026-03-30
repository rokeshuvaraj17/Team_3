const pool = require('../config/db')

async function getStats(userId) {
  let resumeCount = 0
  let coverLetterCount = 0
  let jobsAppliedCount = 0
  let jobsTrackedCount = 0

  const r = await pool.query('select count(*)::int as c from public.resumes where user_id = $1', [userId])
  if (r.rows[0]) resumeCount = r.rows[0].c

  try {
    const c = await pool.query('select count(*)::int as c from public.cover_letters where user_id = $1', [userId])
    if (c.rows[0]) coverLetterCount = c.rows[0].c
  } catch (e) {
    if (e.code !== '42P01') throw e
  }

  try {
    const j = await pool.query('select count(*)::int as c from public.job_applications where user_id = $1', [userId])
    if (j.rows[0]) jobsAppliedCount = j.rows[0].c
  } catch (e) {
    if (e.code !== '42P01') throw e
  }

  try {
    const tr = await pool.query(
      "select count(*)::int as c from public.job_tracker where user_id = $1 and application_status = 'applied'",
      [userId]
    )
    if (tr.rows[0]) jobsAppliedCount += tr.rows[0].c
  } catch (e) {
    if (e.code !== '42P01') throw e
  }

  try {
    const t = await pool.query('select count(*)::int as c from public.job_tracker where user_id = $1', [userId])
    if (t.rows[0]) jobsTrackedCount = t.rows[0].c
  } catch (e) {
    if (e.code !== '42P01') throw e
  }

  return {
    resume_count: resumeCount,
    cover_letter_count: coverLetterCount,
    jobs_applied_count: jobsAppliedCount,
    jobs_tracked_count: jobsTrackedCount,
  }
}

module.exports = { getStats }
