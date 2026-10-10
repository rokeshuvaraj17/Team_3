import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiUrl } from '@/lib/api'
import logoUrl from '@/images/transparent.png'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [emailMasked, setEmailMasked] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const requestCode = async () => {
    const res = await fetch(apiUrl('/api/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Could not send a reset code')
      return
    }
    setEmailMasked(data.emailMasked || email.trim())
    setCode('')
    setStep('reset')
  }

  const reset = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    const res = await fetch(apiUrl('/api/forgot-password/reset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), code: code.trim(), password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Could not reset the password')
      return
    }
    navigate('/', { state: { passwordReset: true, email: data.user?.email || email.trim() } })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setIsLoading(true)
    try {
      if (step === 'email') await requestCode()
      else await reset()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = 'h-11 w-full rounded border border-slate-400 px-3 text-slate-900 text-base focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-600/30'

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <header className="h-16 px-6 md:px-12 flex items-center gap-2">
        <img src={logoUrl} alt="MR_Rokesh logo" className="h-9 w-9 object-contain" />
        <span className="font-semibold text-slate-900 text-lg tracking-tight">
          MR_Rokesh <span className="text-blue-600">Jobs</span>
        </span>
      </header>
      <main className="flex-1 flex flex-col items-center px-4 pb-12">
        <h1 className="text-3xl font-light text-slate-900 text-center mt-4 mb-6">Reset your password</h1>
        <form onSubmit={handleSubmit} className="w-full max-w-[400px] bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={step === 'reset'}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          {step === 'reset' && (
            <>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">Verification code</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className={`${inputClass} tracking-[0.3em]`}
                  placeholder="000000"
                />
                <p className="mt-2 text-sm text-slate-600">
                  If an account exists, we sent a code to <span className="font-medium text-slate-800">{emailMasked}</span>.
                </p>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">New password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-base"
          >
            {isLoading ? 'Please wait…' : step === 'email' ? 'Send reset code' : 'Update password'}
          </button>
        </form>
        <p className="text-sm text-slate-700 mt-6">
          Remembered it?{' '}
          <Link to="/" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">Sign in</Link>
        </p>
      </main>
    </div>
  )
}
