import { useState, useEffect, useCallback } from 'react'
import { Search, Briefcase, MapPin, Building2 } from 'lucide-react'
import { apiUrl } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'

export interface JobListItem {
  id: string
  title: string
  job_type: string
  employment_type: string
  location: string | null
  is_remote: boolean
  posted_at: string
  company_id: string
  company_name: string
  company_logo_url: string | null
}

interface JobsSidebarProps {
  selectedJobId: string | null
  onSelectJob: (id: string | null) => void
  className?: string
}

export function JobsSidebar({ selectedJobId, onSelectJob, className = '' }: JobsSidebarProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const user = getStoredUser()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set('q', debouncedQuery)
      params.set('limit', '30')
      const res = await fetch(apiUrl(`/api/jobs?${params}`))
      if (!res.ok) throw new Error('Failed to load jobs')
      const data = await res.json()
      setJobs(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load jobs')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, user?.id])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const formatPosted = (posted_at: string) => {
    const d = new Date(posted_at)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} wk ago`
    return d.toLocaleDateString()
  }

  return (
    <aside
      className={`flex flex-col w-full max-w-md bg-white border-l border-slate-200 overflow-hidden ${className}`}
    >
      <div className="p-4 border-b border-slate-200 bg-slate-50/60">
        <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-blue-600" />
          Jobs
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs or companies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="p-6 flex flex-col items-center justify-center text-slate-500 text-sm">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-2" />
            Loading jobs...
          </div>
        )}
        {error && (
          <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg mx-3 mt-3">
            {error}
          </div>
        )}
        {!loading && !error && jobs.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">
            No jobs found. Try a different search.
          </div>
        )}
        {!loading && jobs.length > 0 && (
          <ul className="p-2 space-y-1">
            {jobs.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => onSelectJob(job.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors border ${
                    selectedJobId === job.id
                      ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                      {job.company_logo_url ? (
                        <img
                          src={job.company_logo_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 text-sm truncate">{job.title}</p>
                      <p className="text-xs text-slate-500 truncate">{job.company_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {job.location && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
                            <MapPin className="h-3 w-3" />
                            {job.is_remote ? 'Remote' : job.location}
                          </span>
                        )}
                        {job.is_remote && !job.location && (
                          <span className="text-xs text-slate-500">Remote</span>
                        )}
                        <span className="text-xs text-slate-400">{formatPosted(job.posted_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
