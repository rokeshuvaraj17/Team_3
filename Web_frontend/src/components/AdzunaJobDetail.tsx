import { useState, useEffect, useRef } from 'react'
import { ExternalLink, MapPin, Building2, Briefcase, DollarSign, Bookmark, MousePointerClick, FileText, FileOutput, Languages } from 'lucide-react'
import type { UnifiedJob } from '@/types/jobs'
import { getJobStorageId } from '@/types/jobs'
import { JobDescription } from '@/components/JobDescription'
import { apiUrl } from '@/lib/api'

interface AdzunaJobDetailProps {
  job: UnifiedJob | null
  saved: boolean
  onSave: () => void
  onHide: () => void
  onClose: () => void
  className?: string
}

const SOURCE_LABEL: Record<string, string> = {
  adzuna: 'Adzuna',
  jooble: 'Jooble',
  arbeitnow: 'Arbeitnow',
  reed: 'Reed',
}

export function AdzunaJobDetail({ job, saved, onSave, onHide, onClose, className = '' }: AdzunaJobDetailProps) {
  const [displayDescription, setDisplayDescription] = useState('')
  const [translating, setTranslating] = useState(false)
  const translationCache = useRef<Map<string, string>>(new Map())

  const [translationError, setTranslationError] = useState<string | null>(null)
  const [wasTranslated, setWasTranslated] = useState(false)

  useEffect(() => {
    if (!job?.description?.trim()) {
      setDisplayDescription(job?.description || '')
      setTranslating(false)
      setTranslationError(null)
      setWasTranslated(false)
      return
    }
    const storageId = getJobStorageId(job)
    const cached = translationCache.current.get(storageId)
    if (cached !== undefined) {
      setDisplayDescription(cached)
      setTranslating(false)
      setTranslationError(null)
      setWasTranslated(true)
      return
    }
    setDisplayDescription(job.description)
    setTranslationError(null)
    setWasTranslated(false)
    let cancelled = false
    setTranslating(true)
    fetch(apiUrl('/api/ai/translate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: job.description }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && typeof data.translated === 'string' && data.translated.trim()) {
          translationCache.current.set(storageId, data.translated.trim())
          setDisplayDescription(data.translated.trim())
          setWasTranslated(true)
          setTranslationError(null)
        } else {
          const fallback = typeof data.fallback === 'string' ? data.fallback : job.description
          setDisplayDescription(fallback)
          setWasTranslated(false)
          setTranslationError(res.ok ? null : (data.error || 'Translation unavailable. Showing original.'))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayDescription(job.description)
          setTranslationError('Could not reach translation service. Showing original.')
          setWasTranslated(false)
        }
      })
      .finally(() => {
        if (!cancelled) setTranslating(false)
      })
    return () => { cancelled = true }
  }, [job?.id, job?.source, job?.description])

  if (!job) {
    return (
      <div
        className={`flex flex-1 flex-col items-center justify-center text-slate-500 p-8 min-h-0 ${className}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center animate-pulse" />
            <Briefcase className="absolute inset-0 m-auto w-8 h-8 text-slate-400" />
            <span className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-30" />
              <MousePointerClick className="relative inline-flex w-5 h-5 text-blue-500 animate-pulse" />
            </span>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-slate-600">Click on any job</p>
            <p className="text-xs text-slate-400">to view details here</p>
          </div>
        </div>
      </div>
    )
  }

  const sourceLabel = SOURCE_LABEL[job.source] || job.source

  return (
    <article className={`flex flex-col overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      <div className="p-5 border-b border-slate-100">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-slate-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-slate-900">{job.title}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">{job.source}</span>
            </div>
            <p className="text-slate-600 font-medium">{job.companyDisplay}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
              {job.locationDisplay && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3" />
                  {job.locationDisplay}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3" />
                {job.contractDisplay}
              </span>
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3.5 w-3" />
                {job.salaryDisplay}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <a
            href={job.redirect_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700"
          >
            Apply on {sourceLabel}
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onSave}
            className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${saved ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto min-h-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-800">About the job</h2>
            {translating && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                <Languages className="h-3.5 w-3.5" />
                Translating to English…
              </span>
            )}
            {!translating && wasTranslated && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                <Languages className="h-3.5 w-3.5" />
                Translated to English
              </span>
            )}
            {!translating && translationError && (
              <span className="text-xs text-amber-600" title={translationError}>
                {translationError}
              </span>
            )}
          </div>
          <JobDescription
            description={displayDescription || job.description || ''}
            full
            structured
            locationDisplay={job.locationDisplay || undefined}
            className="mb-4"
          />
          {job.redirect_url && (
            <a
              href={job.redirect_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View full job description on {sourceLabel}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {job.categoryLabel && (
            <p className="mt-3 text-sm text-slate-500">
              <span className="font-medium text-slate-600">Category:</span> {job.categoryLabel}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Generate cover letter
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <FileOutput className="h-4 w-4" />
            Generate resume
          </button>
        </div>
      </div>
    </article>
  )
}
