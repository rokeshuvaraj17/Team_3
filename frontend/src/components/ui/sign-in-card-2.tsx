import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Briefcase, FileText, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiUrl } from '@/lib/api'
import { setStoredUser } from '@/lib/auth'
import logoUrl from '@/images/transparent.png'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  )
}

function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

export function SignInCard2() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    if (!email.trim() || !password) {
      setLoginError('Email and password are required')
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoginError(data.error || 'Invalid email or password')
        return
      }
      setStoredUser({ id: data.user.id, name: data.user.name, email: data.user.email, email_verified: data.user.email_verified })
      navigate(next || '/app', { state: { user: data.user } })
    } catch {
      setLoginError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      <header className="h-16 px-6 md:px-12 flex items-center gap-2">
        <img src={logoUrl} alt="MR_Rokesh logo" className="h-9 w-9 object-contain" />
        <span className="font-semibold text-slate-900 text-lg tracking-tight">
          MR_Rokesh <span className="text-blue-600">Jobs</span>
        </span>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 gap-10 items-center max-w-6xl w-full mx-auto px-6 md:px-12 pb-16">
        <section className="max-w-md w-full mx-auto lg:mx-0">
          <h1 className="text-3xl md:text-4xl font-light text-blue-800 leading-tight mb-6">
            Welcome to your professional job search
          </h1>
          {next?.startsWith('/oauth/extension') && (
            <p className="mb-4 text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              Sign in to approve the browser extension.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4 bg-white" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded border-slate-400 text-slate-900 text-base focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded border-slate-400 text-slate-900 text-base pr-16 focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Link to="/forgot-password" className="inline-block text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline">
              Forgot password?
            </Link>

            {loginError && (
              <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-base transition-colors flex items-center justify-center"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" /> : 'Sign in'}
            </button>
          </form>

          <p className="text-center lg:text-left text-sm text-slate-700 mt-8">
            New to MR_Rokesh Jobs?{' '}
            <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">Join now</Link>
          </p>
        </section>

        <aside className="hidden lg:block">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 space-y-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Apply smarter, not harder</p>
            {[
              { icon: Briefcase, title: 'One place for every application', text: 'Search openings and track each application from saved to offer.' },
              { icon: FileText, title: 'Tailored resumes & cover letters', text: 'Generate documents matched to each job description in seconds.' },
              { icon: Zap, title: 'Autofill with the extension', text: 'Fill long application forms on any job site with one click.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="h-11 w-11 shrink-0 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-600 mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}
