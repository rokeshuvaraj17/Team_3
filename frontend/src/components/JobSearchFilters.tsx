import { Search } from 'lucide-react'
import type { JobTypeFilter, SortOption } from '@/types/jobs'
import { COUNTRY_OPTIONS, SALARY_BANDS, JOB_TYPE_OPTIONS } from '@/types/jobs'

export interface JobFiltersState {
  what: string
  where: string
  salary_min: string
  salary_max: string
  job_type: JobTypeFilter
  sort: SortOption
  country: string
}

interface JobSearchFiltersProps {
  filters: JobFiltersState
  onChange: (f: JobFiltersState) => void
  onSearch: () => void
  loading?: boolean
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Date' },
  { value: 'salary_desc', label: 'Salary: High to Low' },
  { value: 'salary_asc', label: 'Salary: Low to High' },
]

export function JobSearchFilters({ filters, onChange, onSearch, loading }: JobSearchFiltersProps) {
  const update = (part: Partial<JobFiltersState>) => onChange({ ...filters, ...part })

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Job title, role, or keywords..."
            value={filters.what}
            onChange={(e) => update({ what: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="City or location..."
            value={filters.where}
            onChange={(e) => update({ where: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-60 flex-shrink-0"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filters.country}
          onChange={(e) => update({ country: e.target.value })}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={filters.salary_min}
          onChange={(e) => update({ salary_min: e.target.value })}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SALARY_BANDS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <select
          value={filters.job_type}
          onChange={(e) => update({ job_type: e.target.value as JobTypeFilter })}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {JOB_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as SortOption })}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onChange({
            what: '',
            where: '',
            salary_min: '',
            salary_max: '',
            job_type: 'all',
            sort: 'relevance',
            country: 'us',
          })}
          className="text-sm text-slate-600 hover:text-slate-800 font-medium"
        >
          Clear filters
        </button>
      </div>
    </div>
  )
}
