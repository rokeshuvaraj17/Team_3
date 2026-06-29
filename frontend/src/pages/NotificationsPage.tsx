import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { Bell } from 'lucide-react'

export function NotificationsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()

  useEffect(() => {
    if (!user?.id) navigate('/', { replace: true })
  }, [user?.id, navigate])

  if (!user?.id) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Notifications</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Bell className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-800">No notifications yet</h2>
        <p className="mt-2 max-w-sm mx-auto text-sm text-slate-500">
          When you have alerts or updates, they&apos;ll show up here.
        </p>
      </div>
    </div>
  )
}
