import { Briefcase, MapPin, DollarSign, Bookmark, EyeOff } from 'lucide-react'
import type { UnifiedJob } from '@/types/jobs'
import { stripDescriptionToPlainText } from '@/components/JobDescription'

interface JobCardProps {
  job: UnifiedJob
  isSelected: boolean
  onSelect: () => void
  onSave: () => void
  onHide: () => void
  saved: boolean
}

function formatPosted(created: string): string {
  const d = new Date(created)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} wk ago`
  return d.toLocaleDateString()
}

export function JobCard({ job, isSelected, onSelect, onSave, onHide, saved }: JobCardProps) {
  const initials = (job.companyDisplay || '?').trim().slice(0, 2).toUpperCase()
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className={`group text-left w-full rounded-lg border bg-white dark:bg-slate-800 p-4 cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
        isSelected
          ? 'border-blue-600 shadow-[inset_4px_0_0_#0a66c2] shadow-md'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold text-sm">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-blue-600 dark:text-blue-300 text-base leading-snug group-hover:underline">{job.title}</h3>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSave() }}
              aria-label={saved ? 'Unsave job' : 'Save job'}
              className={`p-1.5 -m-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ${saved ? 'text-blue-600' : 'text-slate-500'}`}
            >
              <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
          <p className="text-slate-900 dark:text-slate-100 text-sm mt-0.5">{job.companyDisplay}</p>
          {job.locationDisplay && (
            <p className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {job.locationDisplay}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <DollarSign className="h-3 w-3" />
              {job.salaryDisplay}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <Briefcase className="h-3 w-3" />
              {job.contractDisplay}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 capitalize">{job.source}</span>
          </div>
          {job.description && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 line-clamp-2">{stripDescriptionToPlainText(job.description)}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-500">{formatPosted(job.created)}{job.categoryLabel ? ` · ${job.categoryLabel}` : ''}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onHide() }}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Hide
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
