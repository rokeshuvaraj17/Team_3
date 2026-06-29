const pool = require('../config/db')

async function create(userId, fields) {
  const { rows } = await pool.query(
    `insert into public.job_tracker (
      user_id, company_name, position_title, location,
      min_salary, max_salary, currency, salary_period, job_type,
      job_description, notes, application_status, job_posting_url
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    returning id, company_name, position_title, location, created_at`,
    [
      userId,
      fields.company_name ?? null,
      fields.position_title ?? null,
      fields.location ?? null,
      fields.min_salary != null ? Number(fields.min_salary) : null,
      fields.max_salary != null ? Number(fields.max_salary) : null,
      fields.currency ?? null,
      fields.salary_period ?? null,
      fields.job_type ?? null,
      fields.job_description ?? null,
      fields.notes ?? null,
      fields.application_status ?? 'not_applied',
      fields.job_posting_url ?? null,
    ]
  )
  return rows[0]
}

async function listByUserId(userId) {
  const { rows } = await pool.query(
    `select id, company_name, position_title, location, min_salary, max_salary, currency, salary_period, job_type,
     job_description, notes, application_status, job_posting_url, created_at, updated_at
     from public.job_tracker where user_id = $1 order by created_at desc`,
    [userId]
  )
  return rows
}

module.exports = { create, listByUserId }
