import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import { BarChart3, FileText, PenLine, Briefcase, Loader2, BookmarkCheck } from 'lucide-react'

type AnalyticsStats = {
  resume_count: number
  cover_letter_count: number
  jobs_applied_count: number
  jobs_tracked_count: number
}

export function AnalyticsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      navigate('/', { replace: true })
      return
    }
    const fetchStats = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiUrl('/api/analytics/stats'), {
          headers: { 'x-user-id': user.id },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || `Failed to load stats (${res.status})`)
        }
        const data = await res.json()
        setStats({
          resume_count: data.resume_count ?? 0,
          cover_letter_count: data.cover_letter_count ?? 0,
          jobs_applied_count: data.jobs_applied_count ?? 0,
          jobs_tracked_count: data.jobs_tracked_count ?? 0,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load analytics')
        setStats(null)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [user?.id, navigate])

  if (!user?.id) return null

  if (loading) {
    return (
      <div className="flex flex-1 w-full items-center justify-center min-h-[320px]">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin" />
          <span className="text-sm">Loading analytics…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-slate-600 dark:text-slate-400" />
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Analytics</h1>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20 p-8 text-center">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">Make sure the backend is running and the database is set up.</p>
        </div>
      </div>
    )
  }

  const cards = [
    {
      key: 'resumes',
      label: 'Resumes stored',
      description: 'Resumes generated or uploaded in your account',
      value: stats?.resume_count ?? 0,
      icon: FileText,
      color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/25 dark:text-blue-300 dark:border-blue-800/50',
      iconBg: 'bg-blue-100 dark:bg-blue-800/50',
    },
    {
      key: 'cover-letters',
      label: 'Cover letters stored',
      description: 'Cover letters generated or uploaded',
      value: stats?.cover_letter_count ?? 0,
      icon: PenLine,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/50',
      iconBg: 'bg-emerald-100 dark:bg-emerald-800/50',
    },
    {
      key: 'jobs-applied',
      label: 'Jobs applied for',
      description: 'Applications submitted through the app',
      value: stats?.jobs_applied_count ?? 0,
      icon: Briefcase,
      color: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/50',
      iconBg: 'bg-amber-100 dark:bg-amber-800/50',
    },
    {
      key: 'jobs-tracked',
      label: 'Jobs in tracker',
      description: 'View on Job Tracker page',
      value: stats?.jobs_tracked_count ?? 0,
      icon: BookmarkCheck,
      color: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/25 dark:text-violet-300 dark:border-violet-800/50',
      iconBg: 'bg-violet-100 dark:bg-violet-800/50',
      href: '/app/job-tracker',
    },
  ]

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 md:text-3xl">Analytics</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base max-w-2xl">
          Overview of your activity: documents stored and job applications tracked in the database.
        </p>
      </div>

      {/* Stat cards - full width grid */}
      <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, description, value, icon: Icon, color, iconBg, href }) => {
          const cardContent = (
            <div className={`rounded-2xl border ${color} p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] min-h-[160px] flex flex-col`}>
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
              <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{label}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex-1">
                {href ? <Link to={href} className="text-violet-600 dark:text-violet-400 hover:underline inline">{description}</Link> : description}
              </p>
            </div>
          )
          return href ? <Link key={key} to={href} className="block w-full">{cardContent}</Link> : <div key={key} className="w-full">{cardContent}</div>
        })}
      </div>

      {/* Summary - full width */}
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">How these numbers work</h2>
        <ul className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex gap-2">
            <span className="text-slate-400 dark:text-slate-500 shrink-0">•</span>
            <span>Resumes and cover letters are stored when you generate or upload them in Documents.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-slate-400 dark:text-slate-500 shrink-0">•</span>
            <span>Jobs applied is incremented when you apply to a job from the Dashboard.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-slate-400 dark:text-slate-500 shrink-0">•</span>
            <span>Tracked jobs: add or view them on the <Link to="/app/job-tracker" className="text-violet-600 dark:text-violet-400 hover:underline">Job Tracker</Link> page.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-slate-400 dark:text-slate-500 shrink-0">•</span>
            <span>All counts are for your account only and come from the database.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
