const pool = require('../config/db')

async function list(q, limit) {
  const safeLimit = Math.min(parseInt(limit, 10) || 50, 100)
  if (q) {
    const { rows } = await pool.query(
      `select j.id, j.title, j.job_type, j.employment_type, j.location, j.is_remote, j.posted_at,
              j.company_id, c.name as company_name, c.logo_url as company_logo_url
       from public.jobs j
       join public.companies c on c.id = j.company_id
       where j.status = 'ACTIVE'
         and (j.title ilike $1 or c.name ilike $1)
       order by j.posted_at desc
       limit $2`,
      [`%${q}%`, safeLimit]
    )
    return rows
  }
  const { rows } = await pool.query(
    `select j.id, j.title, j.job_type, j.employment_type, j.location, j.is_remote, j.posted_at,
            j.company_id, c.name as company_name, c.logo_url as company_logo_url
     from public.jobs j
     join public.companies c on c.id = j.company_id
     where j.status = 'ACTIVE'
     order by j.posted_at desc
     limit $1`,
    [safeLimit]
  )
  return rows
}

async function getById(id) {
  const { rows } = await pool.query(
    `select j.id, j.company_id, j.title, j.description, j.job_type, j.employment_type,
            j.location, j.location_country, j.is_remote, j.salary_min, j.salary_max, j.salary_currency, j.salary_visible,
            j.metadata, j.posted_at, j.expires_at,
            c.name as company_name, c.logo_url as company_logo_url, c.industry, c.location as company_location
     from public.jobs j
     join public.companies c on c.id = j.company_id
     where j.id = $1 and j.status = 'ACTIVE'`,
    [id]
  )
  return rows[0] || null
}

async function exists(id) {
  const { rows } = await pool.query(
    "select id from public.jobs where id = $1 and status = 'ACTIVE'",
    [id]
  )
  return !!rows[0]
}

module.exports = { list, getById, exists }
