import { useState, useEffect, useCallback } from 'react'
import { apiUrl } from '@/lib/api'
import type {
  AdzunaJob,
  AdzunaSearchResponse,
  UnifiedJob,
  JoobleJob,
  ArbeitnowJob,
  ReedJob,
} from '@/types/jobs'
import {
  toUnifiedAdzunaWithSalary,
  toUnifiedJooble,
  toUnifiedArbeitnow,
  toUnifiedReed,
  getJobStorageId,
  JOB_SOURCE_OPTIONS,
  type JobSource,
} from '@/types/jobs'
import { formatSalaryByCountry } from '@/lib/currency'
import type { JobFiltersState } from '@/components/JobSearchFilters'
import { JobSearchFilters } from '@/components/JobSearchFilters'
import { JobCard } from '@/components/JobCard'
import { AdzunaJobDetail } from '@/components/AdzunaJobDetail'
import { getSavedJobIds, getHiddenJobIds, getSavedJobsData, toggleSaved, hideJob } from '@/lib/savedJobs'

const DEFAULT_FILTERS: JobFiltersState = {
  what: '',
  where: '',
  salary_min: '',
  salary_max: '',
  job_type: 'all',
  sort: 'relevance',
  country: 'us',
}

function buildAdzunaParams(filters: JobFiltersState, page: number): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.what) p.set('what', filters.what)
  if (filters.where) p.set('where', filters.where)
  if (filters.country) p.set('country', filters.country)
  if (filters.salary_min) p.set('salary_min', filters.salary_min)
  if (filters.salary_max) p.set('salary_max', filters.salary_max)
  if (filters.job_type === 'full_time') {
    p.set('full_time', '1')
    p.set('permanent', '1')
  }
  if (filters.job_type === 'contract') p.set('permanent', '0')
  if (filters.sort === 'salary_desc') p.set('sort_by', 'salary')
  if (filters.sort === 'salary_asc') p.set('sort_by', 'salary_asc')
  if (filters.sort === 'date') p.set('sort_by', 'date')
  p.set('page', String(page))
  p.set('results_per_page', '20')
  return p
}

export function DashboardJobList() {
  const [jobSource, setJobSource] = useState<JobSource>('arbeitnow')
  const [filters, setFilters] = useState<JobFiltersState>(DEFAULT_FILTERS)
  const [jobs, setJobs] = useState<UnifiedJob[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<UnifiedJob | null>(null)
  const [tab, setTab] = useState<'all' | 'saved'>('all')
  const [savedIds, setSavedIds] = useState<Set<string>>(getSavedJobIds())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(getHiddenJobIds())
  const [page, setPage] = useState(1)

  const runSearch = useCallback(
    async (pageNum = 1, append = false) => {
      setLoading(true)
      setError(null)
      try {
        if (jobSource === 'adzuna') {
          const params = buildAdzunaParams(filters, pageNum)
          const res = await fetch(apiUrl(`/api/jobs/search?${params}`))
          const text = await res.text()
          let data: AdzunaSearchResponse
          try {
            data = text ? JSON.parse(text) : { results: [] }
          } catch {
            setError(
              res.ok
                ? 'Invalid response from server.'
                : 'Backend may be down or returned an error page. Check that the Node server is running on port 3000.'
            )
            if (!append) setJobs([])
            setLoading(false)
            return
          }
          if (!res.ok) {
            throw new Error((data as { error?: string })?.error || 'Failed to fetch jobs')
          }
          const list = Array.isArray(data.results) ? data.results : []
          const unified = list.map((j: AdzunaJob) =>
            toUnifiedAdzunaWithSalary(j, formatSalaryByCountry(filters.country, j.salary_min, j.salary_max))
          )
          setJobs((prev) => (append && pageNum > 1 ? [...prev, ...unified] : unified))
          setTotalCount(typeof data.count === 'number' ? data.count : unified.length)
        } else if (jobSource === 'jooble') {
          const params = new URLSearchParams()
          params.set('keywords', filters.what || 'jobs')
          params.set('location', filters.where || '')
          params.set('page', String(pageNum))
          if (filters.country) params.set('country', filters.country)
          const res = await fetch(apiUrl(`/api/jobs/jooble/search?${params}`))
          const text = await res.text()
          let data: { count?: number; results?: JoobleJob[]; error?: string }
          try {
            data = text ? JSON.parse(text) : { results: [] }
          } catch {
            setError(
              res.ok
                ? 'Invalid response from server.'
                : 'Backend may be down. Check that the Node server is running on port 3000.'
            )
            if (!append) setJobs([])
            setLoading(false)
            return
          }
          if (!res.ok) {
            throw new Error(data?.error || 'Failed to fetch jobs')
          }
          const list = Array.isArray(data.results) ? data.results : []
          const unified = list.map((j: JoobleJob) => toUnifiedJooble(j))
          setJobs((prev) => (append && pageNum > 1 ? [...prev, ...unified] : unified))
          setTotalCount(typeof data.count === 'number' ? data.count : unified.length)
        } else if (jobSource === 'arbeitnow') {
          const params = new URLSearchParams()
          if (filters.what) params.set('keywords', filters.what)
          if (filters.where) params.set('location', filters.where)
          if (filters.country) params.set('country', filters.country)
          const res = await fetch(apiUrl(`/api/jobs/arbeitnow/search?${params}`))
          const text = await res.text()
          let data: { count?: number; results?: ArbeitnowJob[]; error?: string }
          try {
            data = text ? JSON.parse(text) : { results: [] }
          } catch {
            setError(
              res.ok
                ? 'Invalid response from server.'
                : 'Backend may be down. Check that the Node server is running on port 3000.'
            )
            if (!append) setJobs([])
            setLoading(false)
            return
          }
          if (!res.ok) {
            throw new Error(data?.error || 'Failed to fetch jobs')
          }
          const list = Array.isArray(data.results) ? data.results : []
          const unified = list.map((j: ArbeitnowJob) => toUnifiedArbeitnow(j))
          setJobs((prev) => (append && pageNum > 1 ? [...prev, ...unified] : unified))
          setTotalCount(typeof data.count === 'number' ? data.count : unified.length)
        } else {
          // Reed (UK)
          const params = new URLSearchParams()
          params.set('keywords', filters.what || '')
          params.set('locationName', filters.where || '')
          params.set('resultsToTake', '20')
          params.set('resultsToSkip', String((pageNum - 1) * 20))
          const res = await fetch(apiUrl(`/api/jobs/reed/search?${params}`))
          const text = await res.text()
          let data: { count?: number; results?: ReedJob[]; error?: string }
          try {
            data = text ? JSON.parse(text) : { results: [] }
          } catch {
            setError(
              res.ok
                ? 'Invalid response from server.'
                : 'Backend may be down. Check that the Node server is running on port 3000.'
            )
            if (!append) setJobs([])
            setLoading(false)
            return
          }
          if (!res.ok) {
            throw new Error(data?.error || 'Failed to fetch jobs')
          }
          const list = Array.isArray(data.results) ? data.results : []
          const unified = list.map((j: ReedJob) => toUnifiedReed(j))
          setJobs((prev) => (append && pageNum > 1 ? [...prev, ...unified] : unified))
          setTotalCount(typeof data.count === 'number' ? data.count : unified.length)
        }
        setPage(pageNum)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load jobs')
        if (!append) setJobs([])
      } finally {
        setLoading(false)
      }
    },
    [filters, jobSource]
  )

  useEffect(() => {
    runSearch(1)
  }, [jobSource])

  const handleSearch = () => runSearch(1, false)

  const visibleJobs = jobs.filter((j) => !hiddenIds.has(getJobStorageId(j)))
  const savedJobsData = getSavedJobsData()
  const savedJobsList: UnifiedJob[] =
    tab === 'saved'
      ? Object.entries(savedJobsData)
          .filter(([id]) => savedIds.has(id))
          .map(([, payload]) => payload as UnifiedJob)
          .filter((j) => j?.id && j?.source && !hiddenIds.has(getJobStorageId(j)))
      : []
  const displayedJobs = tab === 'saved' ? savedJobsList : visibleJobs

  const handleSave = (job: UnifiedJob) => {
    const storageId = getJobStorageId(job)
    toggleSaved(storageId, job)
    setSavedIds(getSavedJobIds())
    if (selectedJob && getJobStorageId(selectedJob) === storageId) {
      setSelectedJob(selectedJob)
    }
  }

  const handleHide = (job: UnifiedJob) => {
    const storageId = getJobStorageId(job)
    hideJob(storageId)
    setHiddenIds(getHiddenJobIds())
    if (selectedJob && getJobStorageId(selectedJob) === storageId) setSelectedJob(null)
  }

  return (
    <div className="flex flex-1 min-h-0 w-full gap-0 flex-col">
      {/* Job source dropdown */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label htmlFor="job-source-select" className="text-sm font-medium text-slate-600">
          Job source:
        </label>
        <select
          id="job-source-select"
          value={jobSource}
          onChange={(e) => setJobSource(e.target.value as JobSource)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
        >
          {JOB_SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 min-h-0 w-full gap-0">
        {/* 1/2: search bar + job list */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <JobSearchFilters
            filters={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            loading={loading}
          />

          <div className="mt-4 flex items-center gap-4 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              All jobs ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('saved')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'saved'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved ({savedIds.size})
            </button>
          </div>

          <div className="flex-1 overflow-auto mt-4 space-y-3 pb-6">
            {error && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm">
                {error}
              </div>
            )}
            {!error && loading && jobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                <p className="mt-3 text-sm">Loading jobs...</p>
              </div>
            )}
            {!error && !loading && displayedJobs.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">
                {tab === 'saved'
                  ? 'No saved jobs. Save jobs from the list to see them here.'
                  : 'No jobs found. Try different filters or search terms.'}
              </div>
            )}
            {!error && displayedJobs.length > 0 && (
              <>
                {displayedJobs.map((job) => {
                  const storageId = getJobStorageId(job)
                  return (
                    <JobCard
                      key={storageId}
                      job={job}
                      isSelected={selectedJob !== null && getJobStorageId(selectedJob) === storageId}
                      onSelect={() => setSelectedJob(job)}
                      onSave={() => handleSave(job)}
                      onHide={() => handleHide(job)}
                      saved={savedIds.has(storageId)}
                    />
                  )
                })}
                {tab === 'all' && jobs.length >= 20 && jobSource !== 'arbeitnow' && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => runSearch(page + 1, true)}
                      disabled={loading}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 1/2: job description */}
        <div className="hidden lg:flex flex-col flex-1 min-w-0 border-l border-slate-200 pl-6 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 pt-4 overflow-auto">
            <AdzunaJobDetail
              job={selectedJob}
              saved={selectedJob ? savedIds.has(getJobStorageId(selectedJob)) : false}
              onSave={() => selectedJob && handleSave(selectedJob)}
              onHide={() => selectedJob && handleHide(selectedJob)}
              onClose={() => setSelectedJob(null)}
              className="flex-1 flex flex-col min-h-0"
            />
          </div>
        </div>

        {/* Mobile: full-screen job detail overlay */}
        {selectedJob && (
          <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col">
            <div className="flex-1 overflow-auto p-4 pb-8">
              <AdzunaJobDetail
                job={selectedJob}
                saved={savedIds.has(getJobStorageId(selectedJob))}
                onSave={() => handleSave(selectedJob)}
                onHide={() => handleHide(selectedJob)}
                onClose={() => setSelectedJob(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
