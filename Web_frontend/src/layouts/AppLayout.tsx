import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/ui/modern-side-bar'
import { getStoredUser } from '@/lib/auth'
import { useEffect } from 'react'

export function AppLayout() {
  const navigate = useNavigate()
  const user = getStoredUser()

  useEffect(() => {
    if (!user?.id) navigate('/', { replace: true })
  }, [user?.id, navigate])

  if (!user?.id) return null

  return (
    <div className="flex min-h-screen h-screen w-full bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto transition-all duration-300 pt-20 pl-4 pr-4 pb-4 md:pt-6 md:px-6 md:pb-6">
        <Outlet />
      </main>
    </div>
  )
}
