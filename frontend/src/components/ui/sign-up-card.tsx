import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import logoUrl from '@/images/transparent.png'
import { cn } from '@/lib/utils'
import { validateSignUp, type SignUpErrors } from '@/lib/validation'
import { apiUrl } from '@/lib/api'

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

export function SignUpCard() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<SignUpErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [otp, setOtp] = useState('')
  const [otpEmailMasked, setOtpEmailMasked] = useState('')
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const values = { name, email, password, confirmPassword }
    const nextErrors = validateSignUp(values)
    setErrors(nextErrors)
    setTouched({ name: true, email: true, password: true, confirmPassword: true })

    if (Object.keys(nextErrors).length > 0) return
    if (step === 'otp' && !otp.trim()) {
      setSubmitError('Enter the verification code sent to your email')
      return
    }

    setIsLoading(true)
    try {
      if (step === 'details') {
        const res = await fetch(apiUrl('/api/signup/otp'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (res.status === 409) setErrors((prev) => ({ ...prev, email: data.error || 'An account with this email already exists' }))
          else setSubmitError(data.error || 'Something went wrong. Please try again.')
          return
        }
        setOtp('')
        setOtpEmailMasked(data.emailMasked || email.trim())
        setStep('otp')
        return
      }

      const res = await fetch(apiUrl('/api/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, code: otp.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) setErrors((prev) => ({ ...prev, email: data.error || 'An account with this email already exists' }))
        else setSubmitError(data.error || 'Something went wrong. Please try again.')
        return
      }
      navigate('/', { state: { signedUp: true, email: data.user?.email } })
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const showError = (field: keyof SignUpErrors) => touched[field] && errors[field]

  const inputBase = 'h-11 rounded border-slate-400 text-slate-900 text-base focus-visible:border-blue-600 focus-visible:ring-blue-600/30'
  const inputError = 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30'

  const field = (
    id: 'name' | 'email',
    label: string,
    type: string,
    value: string,
    set: (v: string) => void,
    autoComplete: string,
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => {
          set(e.target.value)
          if (errors[id]) setErrors((prev) => ({ ...prev, [id]: undefined }))
        }}
        onBlur={() => setTouched((t) => ({ ...t, [id]: true }))}
        className={cn(inputBase, showError(id) && inputError)}
        aria-invalid={!!showError(id)}
      />
      {showError(id) && <p className="mt-1 text-xs text-red-600">{errors[id]}</p>}
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <header className="h-16 px-6 md:px-12 flex items-center gap-2">
        <img src={logoUrl} alt="MR_Rokesh logo" className="h-9 w-9 object-contain" />
        <span className="font-semibold text-slate-900 text-lg tracking-tight">
          MR_Rokesh <span className="text-blue-600">Jobs</span>
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-12">
        <h1 className="text-3xl font-light text-slate-900 text-center mt-4 mb-6">Make the most of your professional life</h1>
        <form onSubmit={handleSubmit} noValidate className="w-full max-w-[400px] bg-white rounded-lg shadow-md p-6 space-y-4">
          {field('name', 'Full name', 'text', name, setName, 'name')}
          {field('email', 'Email', 'email', email, setEmail, 'email')}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password (8+ characters)</label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                  if (errors.confirmPassword && e.target.value !== confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }))
                  else if (errors.confirmPassword && e.target.value === confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                }}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                className={cn(inputBase, 'pr-10', showError('password') && inputError)}
                aria-invalid={!!showError('password')}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {showError('password') && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                }}
                onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                className={cn(inputBase, 'pr-10', showError('confirmPassword') && inputError)}
                aria-invalid={!!showError('confirmPassword')}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {showError('confirmPassword') && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>

          {step === 'otp' && (
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1">Verification code</label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className={cn(inputBase, 'tracking-[0.3em]')}
                placeholder="000000"
              />
              <p className="mt-2 text-sm text-slate-600">
                We sent a one-time code to <span className="font-medium text-slate-800">{otpEmailMasked}</span>.
              </p>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setStep('details')
                    setOtp('')
                    setSubmitError(null)
                  }}
                  className="font-semibold text-slate-600 hover:text-slate-800 hover:underline disabled:opacity-60"
                >
                  Edit details
                </button>
              </div>
            </div>
          )}

          {submitError && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-base transition-colors flex items-center justify-center"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" /> : step === 'otp' ? 'Verify and create account' : 'Agree & Join'}
          </button>
        </form>

        <p className="text-sm text-slate-700 mt-6">
          Already on MR_Rokesh Jobs?{' '}
          <Link to="/" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">Sign in</Link>
        </p>
      </main>
    </div>
  )
}
