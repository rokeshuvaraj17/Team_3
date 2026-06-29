import { useEffect, useState } from 'react'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'

export interface AppNotification {
  id: string
  title: string
  body?: string
  href?: string
  tone?: 'info' | 'action'
}

interface AnalyticsStats {
  resume_count?: number
  cover_letter_count?: number
  jobs_applied_count?: number
  jobs_tracked_count?: number
}

// Derive a live notifications list from the user's real account activity.
// There is no dedicated notifications backend yet, so we build meaningful,
// per-user items from the analytics the app already exposes. This keeps the
// sidebar badge and the Notifications page driven by the same real data.
function buildNotifications(stats: AnalyticsStats): AppNotification[] {
  const items: AppNotification[] = []
  const resumes = stats.resume_count ?? 0
  const coverLetters = stats.cover_letter_count ?? 0
  const tracked = stats.jobs_tracked_count ?? 0
  const applied = stats.jobs_applied_count ?? 0

  if (resumes === 0) {
    items.push({
      id: 'no-resume',
      title: 'Create your first resume',
      body: 'Generate or upload a resume to start applying to jobs.',
      href: '/app/generate-resume',
      tone: 'action',
    })
  }
  if (coverLetters === 0) {
    items.push({
      id: 'no-cover-letter',
      title: 'Generate a cover letter',
      body: 'Create a tailored cover letter for your applications.',
      href: '/app/generate-cover-letter',
      tone: 'action',
    })
  }
  if (tracked > 0) {
    items.push({
      id: 'tracked',
      title: `You're tracking ${tracked} job${tracked === 1 ? '' : 's'}`,
      body: 'Review your job tracker for status updates.',
      href: '/app/job-tracker',
      tone: 'info',
    })
  }
  if (applied > 0) {
    items.push({
      id: 'applied',
      title: `${applied} application${applied === 1 ? '' : 's'} submitted`,
      body: 'See how your applications are progressing.',
      href: '/app/analytics',
      tone: 'info',
    })
  }
  return items
}

export function useNotifications() {
  const user = getStoredUser()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(apiUrl('/api/analytics/stats'), { headers: { 'x-user-id': user.id } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AnalyticsStats | null) => {
        if (cancelled) return
        setNotifications(data ? buildNotifications(data) : [])
      })
      .catch(() => {
        if (!cancelled) setNotifications([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return { notifications, count: notifications.length, loading }
}
