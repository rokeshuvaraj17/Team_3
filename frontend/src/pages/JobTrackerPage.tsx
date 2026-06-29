import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import { BookmarkCheck, Loader2, Plus, ExternalLink, RefreshCw, MapPin, Briefcase } from 'lucide-react'

type TrackedJob = {
  id: string
  company_name: string | null
  position_title: string | null
  location: string | null
  min_salary: number | null
  max_salary: number | null
  currency: string | null
  salary_period: string | null
  job_type: string | null
  job_description: string | null
  notes: string | null
  application_status: string | null
  job_posting_url: string | null
  created_at: string
}

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
]
const PERIODS = ['Hourly', 'Monthly', 'Annually']
const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Temporary']
const STATUSES = [
  { value: 'not_applied', label: 'I have not yet applied' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer received' },
  { value: 'rejected', label: 'Rejected' },
]

export function JobTrackerPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [jobs, setJobs] = useState<TrackedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    company_name: '',
    position_title: '',
    location: '',
    min_salary: '',
    max_salary: '',
    currency: 'USD',
    salary_period: 'Hourly',
    job_type: 'Full-Time',
    job_description: '',
    notes: '',
    application_status: 'not_applied',
    job_posting_url: '',
  })

  const fetchTrackedJobs = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/job-tracker'), { headers: { 'x-user-id': user.id } })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Failed to load jobs (${res.status})`)
      }
      const data = await res.json()
      setJobs(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load tracked jobs')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      navigate('/', { replace: true })
      return
    }
    fetchTrackedJobs()
  }, [user?.id, navigate, fetchTrackedJobs])

  // Refetch when user returns to the tab (e.g. after tracking from extension)
  useEffect(() => {
    if (!user?.id) return
    const onFocus = () => fetchTrackedJobs()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user?.id, fetchTrackedJobs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/job-tracker'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          company_name: form.company_name.trim() || null,
          position_title: form.position_title.trim() || null,
          location: form.location.trim() || null,
          min_salary: form.min_salary ? Number(form.min_salary) : null,
          max_salary: form.max_salary ? Number(form.max_salary) : null,
          currency: form.currency || null,
          salary_period: form.salary_period || null,
          job_type: form.job_type || null,
          job_description: form.job_description.trim() || null,
          notes: form.notes.trim() || null,
          application_status: form.application_status || 'not_applied',
          job_posting_url: form.job_posting_url.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to save job')
      }
      const created = await res.json()
      const newJob: TrackedJob = {
        id: created.id,
        company_name: created.company_name ?? (form.company_name.trim() || null),
        position_title: created.position_title ?? (form.position_title.trim() || null),
        location: created.location ?? (form.location.trim() || null),
        min_salary: form.min_salary ? Number(form.min_salary) : null,
        max_salary: form.max_salary ? Number(form.max_salary) : null,
        currency: form.currency || null,
        salary_period: form.salary_period || null,
        job_type: form.job_type || null,
        job_description: form.job_description.trim() || null,
        notes: form.notes.trim() || null,
        application_status: form.application_status || null,
        job_posting_url: form.job_posting_url.trim() || null,
        created_at: created.created_at ?? new Date().toISOString(),
      }
      setJobs((prev) => [newJob, ...prev])
      setForm({
        company_name: '',
        position_title: '',
        location: '',
        min_salary: '',
        max_salary: '',
        currency: 'USD',
        salary_period: 'Hourly',
        job_type: 'Full-Time',
        job_description: '',
        notes: '',
        application_status: 'not_applied',
        job_posting_url: '',
      })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!user?.id) return null

  const statusLabel = (status: string | null) => status ? STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, ' ') : 'Not applied'
  const formatDate = (s: string) => {
    try {
      const d = new Date(s)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300">
              <BookmarkCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 md:text-3xl">Job Tracker</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base max-w-2xl">
            Jobs you track from the extension or add here appear below. All tracked jobs are visible and counted on Analytics.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchTrackedJobs()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cancel' : 'Add job'}
          </button>
        </div>
      </div>

      {error && !showForm && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-amber-800 dark:text-amber-200 text-sm">{error}</p>
          <button
            type="button"
            onClick={() => fetchTrackedJobs()}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 md:p-8 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Save job to tracker</h2>
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="jt-company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company</label>
              <input
                id="jt-company"
                type="text"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
                placeholder="Company name"
              />
            </div>
            <div>
              <label htmlFor="jt-position" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Position title</label>
              <input
                id="jt-position"
                type="text"
                value={form.position_title}
                onChange={(e) => setForm((f) => ({ ...f, position_title: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
                placeholder="Job title"
              />
            </div>
          </div>
          <div>
            <label htmlFor="jt-location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
            <input
              id="jt-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
              placeholder="e.g. City, State, Country"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="jt-min-salary" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Min. salary</label>
              <input
                id="jt-min-salary"
                type="number"
                min={0}
                value={form.min_salary}
                onChange={(e) => setForm((f) => ({ ...f, min_salary: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="jt-max-salary" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max. salary</label>
              <input
                id="jt-max-salary"
                type="number"
                min={0}
                value={form.max_salary}
                onChange={(e) => setForm((f) => ({ ...f, max_salary: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="jt-currency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
              <select
                id="jt-currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="jt-period" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Period</label>
              <select
                id="jt-period"
                value={form.salary_period}
                onChange={(e) => setForm((f) => ({ ...f, salary_period: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="jt-job-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job type</label>
              <select
                id="jt-job-type"
                value={form.job_type}
                onChange={(e) => setForm((f) => ({ ...f, job_type: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="jt-status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Application status</label>
            <select
              id="jt-status"
              value={form.application_status}
              onChange={(e) => setForm((f) => ({ ...f, application_status: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="jt-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job posting URL</label>
            <input
              id="jt-url"
              type="url"
              value={form.job_posting_url}
              onChange={(e) => setForm((f) => ({ ...f, job_posting_url: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
          <div>
            <label htmlFor="jt-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job description</label>
            <textarea
              id="jt-description"
              rows={3}
              value={form.job_description}
              onChange={(e) => setForm((f) => ({ ...f, job_description: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
              placeholder="Paste or type job description"
            />
          </div>
          <div>
            <label htmlFor="jt-notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
            <textarea
              id="jt-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
              placeholder="Optional notes"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save job
            </button>
          </div>
        </form>
      )}

      {/* Tracked jobs list - full width */}
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-4 md:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Tracked jobs {!loading && jobs.length > 0 && <span className="text-slate-500 dark:text-slate-400 font-normal">({jobs.length})</span>}
          </h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <Briefcase className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">No jobs tracked yet.</p>
            <p className="mt-1 text-slate-500 dark:text-slate-500 text-sm">Add one with the button above, or save jobs from the extension (Autofill tab → save to Job Tracker). They will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {jobs.map((job) => (
              <li key={job.id} className="p-4 md:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {job.position_title || 'Untitled'}
                      </div>
                      {job.company_name && (
                        <div className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">{job.company_name}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {job.application_status && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-600/50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {statusLabel(job.application_status)}
                        </span>
                      )}
                      {job.job_posting_url && (
                        <a
                          href={job.job_posting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View posting
                        </a>
                      )}
                    </div>
                  </div>
                  {(job.location || job.job_type) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      {job.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                      )}
                      {job.job_type && <span>{job.job_type}</span>}
                    </div>
                  )}
                  {(job.min_salary != null || job.max_salary != null) && (job.salary_period || job.currency) && (
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {job.currency || '$'}
                      {job.min_salary != null && job.max_salary != null
                        ? ` ${job.min_salary}–${job.max_salary}`
                        : job.min_salary != null
                          ? ` ${job.min_salary}+`
                          : job.max_salary != null
                            ? ` up to ${job.max_salary}`
                            : ''}{' '}
                      {job.salary_period}
                    </div>
                  )}
                  {job.created_at && (
                    <div className="text-xs text-slate-400 dark:text-slate-500">Added {formatDate(job.created_at)}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
