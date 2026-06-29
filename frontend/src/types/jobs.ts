/** Adzuna API job result (from search) */
export interface AdzunaJob {
  id: string
  title: string
  description: string
  created: string
  redirect_url: string
  location?: { display_name?: string; area?: string[] }
  company?: { display_name?: string }
  salary_min?: number | null
  salary_max?: number | null
  salary_is_predicted?: number
  category?: { label?: string; tag?: string }
  contract_type?: string
  contract_time?: string
}

export interface AdzunaSearchResponse {
  count?: number
  results?: AdzunaJob[]
}

/** Jooble API job result (from search) */
export interface JoobleJob {
  id: number
  title: string
  company?: string
  location?: string
  snippet?: string
  salary?: string
  type?: string
  link: string
  updated?: string
  source?: string
}

export interface JoobleSearchResponse {
  totalCount?: number
  jobs?: JoobleJob[]
}

/** Arbeitnow API job (no key, full description in response) */
export interface ArbeitnowJob {
  slug?: string
  company_name?: string
  title: string
  description?: string
  location?: string
  url?: string
  remote?: boolean
  job_types?: string[]
  tags?: string[]
  created_at?: string
}

/** Reed.co.uk API job (UK portal) */
export interface ReedJob {
  jobId?: number
  employerId?: number
  employerName?: string
  jobTitle?: string
  jobDescription?: string
  locationName?: string
  minimumSalary?: number | null
  maximumSalary?: number | null
  currency?: string
  expirationDate?: string
  date?: string
  jobUrl?: string
}

/** JSearch (RapidAPI) job result — aggregates Google for Jobs */
export interface JsearchJob {
  job_id?: string
  job_title?: string
  employer_name?: string
  employer_logo?: string | null
  employer_website?: string | null
  job_publisher?: string
  job_employment_type?: string
  job_apply_link?: string
  job_description?: string
  job_is_remote?: boolean
  job_city?: string | null
  job_state?: string | null
  job_country?: string | null
  job_location?: string | null
  job_posted_at_datetime_utc?: string | null
  job_min_salary?: number | null
  job_max_salary?: number | null
  job_salary_currency?: string | null
  job_salary_period?: string | null
}

/** Normalized job for display (any source) */
export type JobSource = 'adzuna' | 'jooble' | 'arbeitnow' | 'reed' | 'jsearch'

export interface UnifiedJob {
  id: string
  title: string
  description: string
  redirect_url: string
  locationDisplay: string
  companyDisplay: string
  salaryDisplay: string
  contractDisplay: string
  created: string
  source: JobSource
  categoryLabel?: string
}

export function toUnifiedAdzuna(j: AdzunaJob): UnifiedJob {
  const locationName = j.location?.display_name || (j.location?.area && j.location.area.join(', ')) || ''
  const companyName = j.company?.display_name || 'Company'
  return {
    id: j.id,
    title: j.title,
    description: j.description || '',
    redirect_url: j.redirect_url,
    locationDisplay: locationName,
    companyDisplay: companyName,
    salaryDisplay: '', // filled by component using formatSalaryByCountry(country, j.salary_min, j.salary_max)
    contractDisplay: j.contract_time ? j.contract_time.replace(/_/g, ' ') : j.contract_type || '—',
    created: j.created,
    source: 'adzuna',
    categoryLabel: j.category?.label,
  }
}

/** Adzuna job + preformatted salary for unified list (avoids passing country everywhere) */
export function toUnifiedAdzunaWithSalary(j: AdzunaJob, salaryDisplay: string): UnifiedJob {
  const u = toUnifiedAdzuna(j)
  u.salaryDisplay = salaryDisplay
  return u
}

export function toUnifiedJooble(j: JoobleJob): UnifiedJob {
  return {
    id: String(j.id),
    title: j.title,
    description: j.snippet || '',
    redirect_url: j.link,
    locationDisplay: j.location || '',
    companyDisplay: j.company || 'Company',
    salaryDisplay: j.salary || 'Not disclosed',
    contractDisplay: j.type || '—',
    created: j.updated || new Date().toISOString(),
    source: 'jooble',
  }
}

export function toUnifiedArbeitnow(j: ArbeitnowJob): UnifiedJob {
  const jobUrl = j.url || (j.slug ? `https://www.arbeitnow.com/view/job/${j.slug}` : '')
  const contractDisplay = Array.isArray(j.job_types) && j.job_types.length
    ? j.job_types.join(', ')
    : j.remote ? 'Remote' : '—'
  return {
    id: j.slug || `arbeitnow-${Math.random().toString(36).slice(2)}`,
    title: j.title,
    description: j.description || '',
    redirect_url: jobUrl,
    locationDisplay: j.location || (j.remote ? 'Remote' : ''),
    companyDisplay: j.company_name || 'Company',
    salaryDisplay: 'Not disclosed',
    contractDisplay,
    created: j.created_at || new Date().toISOString(),
    source: 'arbeitnow',
  }
}

export function toUnifiedReed(j: ReedJob): UnifiedJob {
  const jobId = j.jobId ?? 0
  const jobUrl = j.jobUrl || `https://www.reed.co.uk/jobs/job/${jobId}`
  const min = j.minimumSalary
  const max = j.maximumSalary
  let salaryDisplay = 'Not disclosed'
  if (min != null || max != null) {
    const curr = j.currency || 'GBP'
    if (min != null && max != null) salaryDisplay = `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}`
    else if (min != null) salaryDisplay = `${curr} ${min.toLocaleString()}+`
    else if (max != null) salaryDisplay = `Up to ${curr} ${max.toLocaleString()}`
  }
  return {
    id: String(jobId),
    title: j.jobTitle || '',
    description: j.jobDescription || '',
    redirect_url: jobUrl,
    locationDisplay: j.locationName || '',
    companyDisplay: j.employerName || 'Company',
    salaryDisplay,
    contractDisplay: '—',
    created: j.date || j.expirationDate || new Date().toISOString(),
    source: 'reed',
  }
}

export function toUnifiedJsearch(j: JsearchJob): UnifiedJob {
  const location =
    j.job_location ||
    [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') ||
    (j.job_is_remote ? 'Remote' : '')
  const min = j.job_min_salary
  const max = j.job_max_salary
  let salaryDisplay = 'Not disclosed'
  if (min != null || max != null) {
    const curr = j.job_salary_currency || 'USD'
    const period = j.job_salary_period ? `/${j.job_salary_period.toLowerCase()}` : ''
    if (min != null && max != null) salaryDisplay = `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}${period}`
    else if (min != null) salaryDisplay = `${curr} ${min.toLocaleString()}+${period}`
    else if (max != null) salaryDisplay = `Up to ${curr} ${max!.toLocaleString()}${period}`
  }
  return {
    id: j.job_id || `jsearch-${Math.random().toString(36).slice(2)}`,
    title: j.job_title || '',
    description: j.job_description || '',
    redirect_url: j.job_apply_link || '',
    locationDisplay: location,
    companyDisplay: j.employer_name || 'Company',
    salaryDisplay,
    contractDisplay: j.job_employment_type ? j.job_employment_type.replace(/_/g, ' ') : j.job_is_remote ? 'Remote' : '—',
    created: j.job_posted_at_datetime_utc || new Date().toISOString(),
    source: 'jsearch',
  }
}

/** Unique storage key for saved/hidden lists (avoids id collision across sources) */
export function getJobStorageId(job: UnifiedJob): string {
  return `${job.source}-${job.id}`
}

/** Options for the job source dropdown */
export const JOB_SOURCE_OPTIONS: { value: JobSource; label: string }[] = [
  { value: 'adzuna', label: 'Adzuna' },
  { value: 'jooble', label: 'Jooble' },
  { value: 'arbeitnow', label: 'Arbeitnow (ease of use)' },
  { value: 'reed', label: 'Reed (UK)' },
  { value: 'jsearch', label: 'JSearch (Google for Jobs)' },
]

export type JobTypeFilter = 'all' | 'full_time' | 'part_time' | 'contract'
export type SortOption = 'relevance' | 'date' | 'salary_desc' | 'salary_asc'

export const COUNTRY_OPTIONS = [
  { value: 'in', label: 'India' },
  { value: 'gb', label: 'UK' },
  { value: 'us', label: 'USA' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'br', label: 'Brazil' },
] as const

export const SALARY_BANDS = [
  { value: '', label: 'Any salary' },
  { value: '0', label: '0+' },
  { value: '10000', label: '10k+' },
  { value: '25000', label: '25k+' },
  { value: '50000', label: '50k+' },
  { value: '100000', label: '100k+' },
  { value: '150000', label: '150k+' },
  { value: '200000', label: '200k+' },
] as const

export const JOB_TYPE_OPTIONS: { value: JobTypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
]
