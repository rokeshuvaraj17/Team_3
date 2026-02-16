import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getStoredUser, setStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'

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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-white/50 mt-4 text-sm">Loading...</p>
      </div>
    )
  }
  if (!ready) return null

  return (
    <div className="p-6 max-w-2xl">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Welcome, {user.name ?? user.email}
        </h1>
        {user.email_verified === false && (
          <p className="text-amber-600 text-sm mb-4">Your email is not verified yet.</p>
        )}
        <p className="text-slate-600 text-sm">Use the sidebar to open Profile, Settings, and more.</p>
      </div>
    </div>
  )
}
