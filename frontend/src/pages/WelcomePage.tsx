import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getStoredUser, setStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import { DashboardJobList } from '@/components/DashboardJobList'

type User = { id: string; name?: string; email?: string; email_verified?: boolean }

export function WelcomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const stateUser = location.state?.user as User | undefined
  const storedUser = getStoredUser()
  const user = stateUser ?? storedUser

  const [checking, setChecking] = useState(!!user)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      navigate('/', { replace: true })
      return
    }
    if (stateUser) setStoredUser(stateUser)

    const check = async () => {
      try {
        const res = await fetch(apiUrl('/api/profile'), {
          headers: { 'x-user-id': user.id },
        })
        if (res.status === 404) {
          navigate('/onboarding', { replace: true })
          return
        }
        if (res.ok) {
          const profile = await res.json()
          if (!profile?.display_name?.trim()) {
            navigate('/onboarding', { replace: true })
            return
          }
        }
        setReady(true)
      } catch {
        setReady(true)
      } finally {
        setChecking(false)
      }
    }

    check()
  }, [user?.id, stateUser, navigate])

  if (!user?.id) return null
  if (checking) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-500 mt-4 text-sm">Loading...</p>
      </div>
    )
  }
  if (!ready) return null

  return (
    <div className="flex flex-1 min-h-0 w-full">
      <DashboardJobList />
    </div>
  )
}
