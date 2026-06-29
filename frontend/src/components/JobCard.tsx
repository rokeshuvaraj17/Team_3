import { Briefcase, MapPin, Building2, DollarSign, Bookmark, EyeOff } from 'lucide-react'
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
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className={`text-left w-full rounded-xl border bg-white p-4 transition-all hover:shadow-md ${
        isSelected ? 'border-blue-400 ring-2 ring-blue-200 shadow-md' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 text-base leading-tight">{job.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">{job.source}</span>
          </div>
          <p className="text-slate-600 text-sm mt-0.5">{job.companyDisplay}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
            {job.locationDisplay && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3 flex-shrink-0" />
                {job.locationDisplay}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3.5 w-3 flex-shrink-0" />
              {job.contractDisplay}
            </span>
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3.5 w-3 flex-shrink-0" />
              {job.salaryDisplay}
            </span>
          </div>
          {job.description && (
            <p className="text-slate-600 text-sm mt-2 line-clamp-2">{stripDescriptionToPlainText(job.description)}</p>
          )}
          {job.categoryLabel && (
            <p className="text-xs text-slate-500 mt-2">{job.categoryLabel}</p>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">{formatPosted(job.created)}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onHide() }}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 text-xs font-medium"
              >
                <EyeOff className="h-3.5 w-3" />
                Hide
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSave() }}
                className={`inline-flex items-center gap-1 text-xs font-medium ${saved ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Bookmark className={`h-3.5 w-3 ${saved ? 'fill-current' : ''}`} />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
