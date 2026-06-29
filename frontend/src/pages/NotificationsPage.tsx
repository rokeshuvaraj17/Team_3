import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { Bell, Loader2, ChevronRight } from 'lucide-react'
import { useNotifications } from '@/lib/useNotifications'

export function NotificationsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const { notifications, count, loading } = useNotifications()

  useEffect(() => {
    if (!user?.id) navigate('/', { replace: true })
  }, [user?.id, navigate])

  if (!user?.id) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Notifications</h1>
        {count > 0 && (
          <span className="px-2.5 py-1 text-sm font-medium rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
            {count} new
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : count === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400">
            <Bell className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">You&apos;re all caught up</h2>
          <p className="mt-2 max-w-sm mx-auto text-sm text-slate-500 dark:text-slate-400">
            When you have alerts or updates, they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => {
            const content = (
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                    n.tone === 'action'
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  <Bell className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{n.body}</p>}
                </div>
                {n.href && <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-slate-400" />}
              </div>
            )
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link
                    to={n.href}
                    className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                    {content}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
