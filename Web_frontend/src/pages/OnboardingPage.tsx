import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Briefcase, MapPin, FileText, Phone, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiUrl } from '@/lib/api'
import { getStoredUser, clearStoredUser } from '@/lib/auth'
import { COUNTRIES } from '@/lib/countries'

const STEPS = [
  { id: 1, title: 'Display name', field: 'display_name', icon: User },
  { id: 2, title: 'Headline', field: 'headline', icon: Briefcase },
  { id: 3, title: 'Location', field: 'location', icon: MapPin },
  { id: 4, title: 'Summary', field: 'summary', icon: FileText },
  { id: 5, title: 'Contact', field: 'contact', icon: Phone },
] as const

const TOTAL_STEPS = STEPS.length

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border bg-white/5 border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-colors',
        className
      )}
      {...props}
    />
  )
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[100px] w-full rounded-lg border bg-white/5 border-white/10 px-3 py-2 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-colors resize-none',
        className
      )}
      {...props}
    />
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<Record<string, string | null>>({
    display_name: '',
    headline: '',
    location: '',
    location_country: '',
    state: '',
    summary: '',
    phone: '',
    website_url: '',
    linkedin_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      navigate('/', { replace: true })
      return
    }
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/profile'), { headers: { 'x-user-id': user.id } })
        if (res.ok) {
          const data = await res.json()
          setProfile((p) => ({
            ...p,
            display_name: data.display_name ?? '',
            headline: data.headline ?? '',
            location: data.location ?? '',
            location_country: data.location_country ?? '',
            state: data.state ?? '',
            summary: data.summary ?? '',
            phone: data.phone ?? '',
            website_url: data.website_url ?? '',
            linkedin_url: data.linkedin_url ?? '',
          }))
        }
      } catch {
        // ignore
      }
    }
    load()
  }, [user?.id, navigate])

  const saveStep = async (payload: Record<string, string | null>) => {
    if (!user?.id) return false
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return false
      }
      setProfile((p) => ({ ...p, ...payload }))
      return true
    } catch {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    if (step === 1) {
      const name = (profile.display_name ?? '').trim()
      if (!name || name.length < 2) {
        setError('Please enter at least 2 characters')
        return
      }
      const ok = await saveStep({ display_name: name })
      if (ok) setStep(2)
    } else if (step === 2) {
      await saveStep({ headline: (profile.headline ?? '').trim() || null })
      setStep(3)
    } else if (step === 3) {
      await saveStep({
        location: (profile.location ?? '').trim() || null,
        location_country: (profile.location_country ?? '').trim() || null,
        state: (profile.state ?? '').trim() || null,
      })
      setStep(4)
    } else if (step === 4) {
      await saveStep({ summary: (profile.summary ?? '').trim() || null })
      setStep(5)
    } else if (step === 5) {
      const phone = (profile.phone ?? '').trim().replace(/\D/g, '')
      if (!phone) {
        setError('Phone number is required')
        return
      }
      if (phone.length < 10) {
        setError('Phone number must be at least 10 digits')
        return
      }
      const ok = await saveStep({
        phone: (profile.phone ?? '').trim(),
        website_url: (profile.website_url ?? '').trim() || null,
        linkedin_url: (profile.linkedin_url ?? '').trim() || null,
      })
      if (ok) navigate('/app', { replace: true })
    }
  }

  const handleSkip = () => {
    if (step === 5) return
    if (step < TOTAL_STEPS) setStep(step + 1)
    else navigate('/app', { replace: true })
  }

  if (!user?.id) return null

  const currentStep = STEPS[step - 1]
  const Icon = currentStep?.icon

  return (
    <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center py-8 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/40 via-purple-700/50 to-black" />
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
      <div className="absolute top-0 left-1/2 w-[120vh] h-[60vh] -translate-x-1/2 rounded-b-[50%] bg-purple-400/20 blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.08] shadow-2xl p-6 sm:p-8">
          <div className="mb-6">
            <div className="flex justify-between text-xs text-white/50 mb-2">
              <span>Step {step} of {TOTAL_STEPS}</span>
              <button
                type="button"
                onClick={() => { clearStoredUser(); navigate('/', { replace: true }) }}
                className="text-white/40 hover:text-white"
              >
                Sign out
              </button>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-white/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <div className="text-center mb-6">
            {Icon && (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-white/5 mb-3">
                <Icon className="w-6 h-6 text-white/80" />
              </div>
            )}
            <h1 className="text-xl font-bold text-white">
              {step === 1 && "What's your name?"}
              {step === 2 && "What's your professional headline?"}
              {step === 3 && "Where are you based?"}
              {step === 4 && "Tell us a bit about yourself"}
              {step === 5 && "How can people reach you?"}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {step === 1 && "This is how you'll appear on your profile."}
              {step === 2 && "e.g. Software Engineer, Product Designer"}
              {step === 3 && "Select your country; city is optional."}
              {step === 4 && "A short bio (optional)"}
              {step === 5 && "Phone number is required. Website and LinkedIn are optional."}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center mb-4">{error}</p>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <Input
                  placeholder="Display name"
                  value={profile.display_name ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                  autoFocus
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <Input
                  placeholder="e.g. Software Engineer at Team3"
                  value={profile.headline ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, headline: e.target.value }))}
                  autoFocus
                />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <Input
                  placeholder="City, Region (optional)"
                  value={profile.location ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                  autoFocus
                />
                <Input
                  placeholder="State / Province (optional)"
                  value={profile.state ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value }))}
                />
                <select
                  value={profile.location_country ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, location_country: e.target.value || null }))}
                  className="flex h-10 w-full rounded-lg border bg-white/5 border-white/10 px-3 py-2 text-white text-sm outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-colors [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </motion.div>
            )}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <Textarea
                  placeholder="A few sentences about your experience and goals..."
                  value={profile.summary ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, summary: e.target.value }))}
                  autoFocus
                />
              </motion.div>
            )}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <Input
                  type="tel"
                  placeholder="Phone number (min 10 digits)"
                  value={profile.phone ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  autoFocus
                />
                <Input
                  type="url"
                  placeholder="Website URL"
                  value={profile.website_url ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, website_url: e.target.value }))}
                />
                <Input
                  type="url"
                  placeholder="LinkedIn profile URL"
                  value={profile.linkedin_url ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, linkedin_url: e.target.value }))}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-3 mt-8">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setStep((s) => Math.max(1, s - 1))
              }}
              disabled={step === 1}
              className={cn(
                'flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors',
                step === 1 && 'invisible'
              )}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex gap-2">
              {step < TOTAL_STEPS && step !== 5 && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex items-center gap-1 px-5 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : step === TOTAL_STEPS ? 'Finish' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
