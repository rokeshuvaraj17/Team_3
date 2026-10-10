import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Shield } from 'lucide-react'
import { apiUrl } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import logoUrl from '@/images/transparent.png'

const SCOPE_COPY: Record<string, string> = {
  profile: 'See your name, email, and saved profile details',
  autofill: 'Autofill job applications with your saved answers',
  job_tracker: 'Save jobs from websites into your Job Tracker',
  api_keys: 'Use API keys you already connected in the portal',
}

export function AuthorizeExtensionPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const user = getStoredUser()
  const [error, setError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const request = useMemo(() => ({
    clientId: params.get('client_id') || '',
    redirectUri: params.get('redirect_uri') || '',
    state: params.get('state') || '',
  }), [params])

  const nextPath = `/oauth/extension?${params.toString()}`

  useEffect(() => {
    if (!user?.id) {
      navigate(`/?next=${encodeURIComponent(nextPath)}`, { replace: true })
    }
  }, [user?.id, navigate, nextPath])

  const post = async (path: string) => {
    setError(null)
    setIsWorking(true)
    try {
      const res = await fetch(apiUrl(path), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-user-id': user.id } : {}),
        },
        body: JSON.stringify({
          client_id: request.clientId,
          redirect_uri: request.redirectUri,
          state: request.state,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.redirect) {
        setError(data.error || 'Could not complete the request')
        return
      }
      window.location.href = data.redirect
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsWorking(false)
    }
  }

  if (!user?.id) {
    return null
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <header className="h-16 px-6 md:px-12 flex items-center gap-2">
        <img src={logoUrl} alt="MR_Rokesh logo" className="h-9 w-9 object-contain" />
        <span className="font-semibold text-slate-900 text-lg tracking-tight">
          MR_Rokesh <span className="text-blue-600">Jobs</span>
        </span>
      </header>
      <main className="flex-1 flex justify-center px-4 pb-16">
        <section className="w-full max-w-lg bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-8 mt-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-700 font-semibold">OAuth approval</p>
              <h1 className="text-2xl font-semibold text-slate-900">Connect the browser extension</h1>
            </div>
          </div>

          <p className="text-slate-600 mb-5">
            Signed in as <span className="font-medium text-slate-900">{user.email || user.name}</span>.
            The <span className="font-medium">MR_Rokesh Job Portal Extension</span> wants permission to:
          </p>

          <ul className="space-y-3 mb-6">
            {Object.entries(SCOPE_COPY).map(([key, label]) => (
              <li key={key} className="flex gap-3 text-sm text-slate-700">
                <Check className="h-5 w-5 text-green-600 shrink-0" />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-slate-500 mb-6">
            This does not share your password. You can disconnect later by signing out of the extension.
          </p>

          {error && (
            <p role="alert" className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={isWorking}
              onClick={() => post('/api/oauth/extension/deny')}
              className="flex-1 h-12 rounded-full border border-slate-400 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              Deny
            </button>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => post('/api/oauth/extension/approve')}
              className="flex-1 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
            >
              {isWorking ? 'Working…' : 'Allow access'}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Not you? <Link to="/" className="font-semibold text-blue-600 hover:underline">Use a different account</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
