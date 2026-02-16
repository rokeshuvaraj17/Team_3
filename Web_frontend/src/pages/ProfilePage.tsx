import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import { COUNTRIES } from '@/lib/countries'
import { Loader2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass =
  'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
const labelClass = 'text-sm font-medium text-slate-700'

type Profile = {
  display_name: string
  headline?: string
  summary?: string
  location?: string
  location_country?: string
  profile_image_url?: string
  phone?: string
  website_url?: string
  linkedin_url?: string
}

const emptyProfile: Profile = {
  display_name: '',
  headline: '',
  summary: '',
  location: '',
  location_country: '',
  profile_image_url: '',
  phone: '',
  website_url: '',
  linkedin_url: '',
}

export function ProfilePage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      navigate('/', { replace: true })
      return
    }
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/profile'), {
          headers: { 'x-user-id': user.id },
        })
        if (res.status === 404) {
          setProfile(emptyProfile)
          setLoading(false)
          return
        }
        if (!res.ok) {
          setError('Failed to load profile')
          setLoading(false)
          return
        }
        const data = await res.json()
        setProfile({
          display_name: data.display_name ?? '',
          headline: data.headline ?? '',
          summary: data.summary ?? '',
          location: data.location ?? '',
          location_country: data.location_country ?? '',
          profile_image_url: data.profile_image_url ?? '',
          phone: data.phone ?? '',
          website_url: data.website_url ?? '',
          linkedin_url: data.linkedin_url ?? '',
        })
      } catch {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, navigate])

  const handleChange = (field: keyof Profile, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }))
    setError(null)
    setSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    if (!profile.display_name.trim()) {
      setError('Display name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          display_name: profile.display_name.trim(),
          headline: profile.headline?.trim() || null,
          summary: profile.summary?.trim() || null,
          location: profile.location?.trim() || null,
          location_country: profile.location_country || null,
          profile_image_url: profile.profile_image_url?.trim() || null,
          phone: profile.phone?.trim() || null,
          website_url: profile.website_url?.trim() || null,
          linkedin_url: profile.linkedin_url?.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err?.message ?? 'Failed to save profile')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (!user?.id) return null
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Profile details</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
            Profile saved successfully.
          </div>
        )}

        {/* Email (read-only) */}
        <div className="space-y-2">
          <label htmlFor="email" className={labelClass}>Email</label>
          <input
            id="email"
            type="email"
            value={user.email ?? ''}
            readOnly
            disabled
            className={cn(inputClass, 'bg-slate-100 text-slate-600 cursor-not-allowed')}
          />
          <p className="text-xs text-slate-500">Email cannot be changed here.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-1">
          <div className="space-y-2">
            <label htmlFor="display_name" className={labelClass}>Display name *</label>
            <input
              id="display_name"
              value={profile.display_name}
              onChange={(e) => handleChange('display_name', e.target.value)}
              placeholder="Your display name"
              required
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="headline" className={labelClass}>Headline</label>
            <input
              id="headline"
              value={profile.headline ?? ''}
              onChange={(e) => handleChange('headline', e.target.value)}
              placeholder="e.g. Software Engineer"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="summary" className={labelClass}>Summary</label>
            <textarea
              id="summary"
              value={profile.summary ?? ''}
              onChange={(e) => handleChange('summary', e.target.value)}
              placeholder="Brief summary about you"
              rows={4}
              className={cn(inputClass, 'min-h-[80px] py-2 resize-y')}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="location_country" className={labelClass}>Country</label>
            <select
              id="location_country"
              value={profile.location_country ?? ''}
              onChange={(e) => handleChange('location_country', e.target.value)}
              className={inputClass}
            >
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="location" className={labelClass}>City / Region</label>
            <input
              id="location"
              value={profile.location ?? ''}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="City or region"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className={labelClass}>Phone</label>
            <input
              id="phone"
              type="tel"
              value={profile.phone ?? ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Phone number"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="profile_image_url" className={labelClass}>Profile image URL</label>
            <input
              id="profile_image_url"
              type="url"
              value={profile.profile_image_url ?? ''}
              onChange={(e) => handleChange('profile_image_url', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="website_url" className={labelClass}>Website</label>
            <input
              id="website_url"
              type="url"
              value={profile.website_url ?? ''}
              onChange={(e) => handleChange('website_url', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="linkedin_url" className={labelClass}>LinkedIn URL</label>
            <input
              id="linkedin_url"
              type="url"
              value={profile.linkedin_url ?? ''}
              onChange={(e) => handleChange('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
