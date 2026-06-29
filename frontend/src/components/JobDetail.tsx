import { useState, useEffect } from 'react'
import { MapPin, Building2, Briefcase, DollarSign, Calendar, CheckCircle } from 'lucide-react'
import { apiUrl } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'

export interface JobDetailData {
  id: string
  company_id: string
  title: string
  description: string
  job_type: string
  employment_type: string
  location: string | null
  location_country: string | null
  is_remote: boolean
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  salary_visible: boolean
  metadata: Record<string, unknown> | null
  posted_at: string
  expires_at: string | null
  company_name: string
  company_logo_url: string | null
  industry: string | null
  company_location: string | null
}

interface JobDetailProps {
  jobId: string | null
  onClose?: () => void
  className?: string
}

export function JobDetail({ jobId, onClose, className = '' }: JobDetailProps) {
  const [job, setJob] = useState<JobDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const user = getStoredUser()

  useEffect(() => {
    if (!jobId || !user?.id) {
      setJob(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    fetch(apiUrl(`/api/jobs/${jobId}`), { headers: { 'x-user-id': user.id } })
      .then((res) => {
        if (!res.ok) throw new Error('Job not found')
        return res.json()
      })
      .then((data) => {
        setJob(data)
        setApplied(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load job')
        setJob(null)
      })
      .finally(() => setLoading(false))
  }, [jobId, user?.id])

  useEffect(() => {
    if (!jobId || !user?.id) return
    fetch(apiUrl(`/api/jobs/${jobId}/applied`), { headers: { 'x-user-id': user.id } })
      .then((res) => res.ok && res.json())
      .then((data) => data?.applied && setApplied(true))
      .catch(() => {})
  }, [jobId, user?.id])

  const handleApply = async () => {
    if (!jobId || !user?.id || applied) return
    setApplying(true)
    setApplyError(null)
    try {
      const res = await fetch(apiUrl(`/api/jobs/${jobId}/apply`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Apply failed')
      setApplied(true)
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : 'Could not submit application')
    } finally {
      setApplying(false)
    }
  }

  const formatSalary = () => {
    if (!job?.salary_visible || (job.salary_min == null && job.salary_max == null)) return null
    const cur = job.salary_currency || 'USD'
    if (job.salary_min != null && job.salary_max != null) {
      return `${cur} ${Number(job.salary_min).toLocaleString()} - ${Number(job.salary_max).toLocaleString()}`
    }
    if (job.salary_min != null) return `${cur} ${Number(job.salary_min).toLocaleString()}+`
    if (job.salary_max != null) return `Up to ${cur} ${Number(job.salary_max).toLocaleString()}`
    return null
  }

  if (!jobId) {
    return (
      <div className={`flex flex-col items-center justify-center text-slate-500 p-8 ${className}`}>
        <Briefcase className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-sm">Select a job to view details</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 ${className}`}>
        <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm mt-3">Loading job...</p>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm">
          {error || 'Job not found'}
        </div>
      </div>
    )
  }

  const salaryStr = formatSalary()

  return (
    <article className={`flex flex-col overflow-hidden ${className}`}>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
              {job.company_logo_url ? (
                <img src={job.company_logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-7 w-7 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-slate-900">{job.title}</h1>
              <p className="text-slate-600 font-medium">{job.company_name}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                {(job.location || job.is_remote) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3" />
                    {job.is_remote && job.location ? `Remote · ${job.location}` : job.is_remote ? 'Remote' : job.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3" />
                  {job.employment_type.replace(/_/g, ' ')}
                </span>
                {job.posted_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3" />
                    Posted {new Date(job.posted_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || applied}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                applied
                  ? 'bg-green-100 text-green-800 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
              }`}
            >
              {applying && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {applied && <CheckCircle className="h-4 w-4" />}
              {applied ? 'Applied' : applying ? 'Applying...' : 'Apply'}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
              >
                Close
              </button>
            )}
          </div>
          {applyError && (
            <p className="mt-2 text-sm text-red-600">{applyError}</p>
          )}
          {salaryStr && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-600">
              <DollarSign className="h-4 w-4" />
              {salaryStr}
            </div>
          )}
        </div>

        <div className="p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">About the job</h2>
          <div className="prose prose-slate prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
            {job.description}
          </div>
          {job.industry && (
            <p className="mt-4 text-sm text-slate-500">
              <span className="font-medium text-slate-600">Industry:</span> {job.industry}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
