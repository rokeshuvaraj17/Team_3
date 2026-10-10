import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import { COUNTRIES } from '@/lib/countries'
import { Loader2, Save, User, MapPin, Phone, Upload, FileText, Star, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow'
const labelClass = 'text-sm font-medium text-slate-700 mb-1.5 block'

type Profile = {
  display_name: string
  headline?: string
  summary?: string
  location?: string
  location_country?: string
  state?: string
  profile_image_url?: string
  phone?: string
  website_url?: string
  linkedin_url?: string
}

type Resume = { id: string; name: string; file_url: string; is_primary: boolean; uploaded_at: string }

const emptyProfile: Profile = {
  display_name: '',
  headline: '',
  summary: '',
  location: '',
  location_country: '',
  state: '',
  profile_image_url: '',
  phone: '',
  website_url: '',
  linkedin_url: '',
}

export function ProfilePage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [addingResume, setAddingResume] = useState(false)
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(null)
  const [photoDrag, setPhotoDrag] = useState(false)
  const [resumeDrag, setResumeDrag] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  const PHOTO_ACCEPT = 'image/png,image/jpeg,image/jpg,image/gif,image/webp'
  const PHOTO_FORMATS = 'PNG, JPEG, GIF, WebP'
  const RESUME_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const RESUME_FORMATS = 'PDF, DOC, DOCX'

  useEffect(() => {
    if (!user?.id) {
      navigate('/', { replace: true })
      return
    }
    const load = async () => {
      try {
        const [profileRes, resumesRes] = await Promise.all([
          fetch(apiUrl('/api/profile'), { headers: { 'x-user-id': user.id } }),
          fetch(apiUrl('/api/resumes'), { headers: { 'x-user-id': user.id } }),
        ])
        if (profileRes.status === 404) {
          setProfile(emptyProfile)
        } else if (profileRes.ok) {
          const data = await profileRes.json()
          setProfile({
            display_name: data.display_name ?? '',
            headline: data.headline ?? '',
            summary: data.summary ?? '',
            location: data.location ?? '',
            location_country: data.location_country ?? '',
            state: data.state ?? '',
            profile_image_url: data.profile_image_url ?? '',
            phone: data.phone ?? '',
            website_url: data.website_url ?? '',
            linkedin_url: data.linkedin_url ?? '',
          })
        } else {
          setError('Failed to load profile')
        }
        if (resumesRes.ok) {
          const list = await resumesRes.json()
          setResumes(Array.isArray(list) ? list : [])
        }
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

  const processPhotoFile = async (file: File | null) => {
    if (!file || !user?.id) return
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError(`Please use an image file. Allowed: ${PHOTO_FORMATS}.`)
      return
    }
    setPhotoUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await fetch(apiUrl('/api/profile/photo'), {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Photo upload failed.')
        return
      }
      if (data.profile_image_url) {
        setProfile((p) => ({ ...p, profile_image_url: data.profile_image_url }))
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      setError('Photo upload failed. Try again.')
    } finally {
      setPhotoUploading(false)
    }
  }

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    processPhotoFile(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  const onPhotoDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setPhotoDrag(false)
    processPhotoFile(e.dataTransfer.files?.[0] ?? null)
  }

  const onPhotoDragOver = (e: React.DragEvent) => { e.preventDefault(); setPhotoDrag(true) }
  const onPhotoDragLeave = () => setPhotoDrag(false)

  const processResumeFile = async (file: File | null) => {
    if (!file || !user?.id) return
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!allowed.includes(file.type) && !['.pdf', '.doc', '.docx'].includes(ext)) {
      setResumeUploadError(`Only ${RESUME_FORMATS} files are allowed.`)
      return
    }
    setResumeUploadError(null)
    setAddingResume(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const uploadRes = await fetch(apiUrl('/api/resumes/upload'), {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: form,
      })
      const uploadData = await uploadRes.json().catch(() => ({}))
      if (!uploadRes.ok) {
        setResumeUploadError(uploadData?.error ?? 'Upload failed.')
        return
      }
      const res = await fetch(apiUrl('/api/resumes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          name: uploadData.name || file.name,
          file_url: uploadData.file_url,
          is_primary: resumes.length === 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setResumeUploadError(err?.error ?? 'Failed to add resume')
        return
      }
      const added = await res.json()
      setResumes((prev) => [added, ...prev])
    } catch {
      setResumeUploadError('Upload failed. Try again.')
    } finally {
      setAddingResume(false)
    }
  }

  const handleResumeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    processResumeFile(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  const onResumeDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setResumeDrag(false)
    processResumeFile(e.dataTransfer.files?.[0] ?? null)
  }

  const onResumeDragOver = (e: React.DragEvent) => { e.preventDefault(); setResumeDrag(true) }
  const onResumeDragLeave = () => setResumeDrag(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    if (!profile.display_name.trim()) {
      setError('Display name is required')
      return
    }
    const phoneTrim = profile.phone?.trim()
    if (phoneTrim) {
      const digits = phoneTrim.replace(/\D/g, '')
      if (digits.length < 10) {
        setError('Phone number must be at least 10 digits')
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/profile'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          display_name: profile.display_name.trim(),
          headline: profile.headline?.trim() || null,
          summary: profile.summary?.trim() || null,
          location: profile.location?.trim() || null,
          location_country: profile.location_country || null,
          state: profile.state?.trim() || null,
          profile_image_url: profile.profile_image_url?.trim() || null,
          phone: profile.phone?.trim() || null,
          website_url: profile.website_url?.trim() || null,
          linkedin_url: profile.linkedin_url?.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err?.error ?? err?.message ?? 'Failed to save profile')
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


  const setPrimaryResume = async (id: string) => {
    if (!user?.id) return
    try {
      const res = await fetch(apiUrl(`/api/resumes/${id}/primary`), {
        method: 'PATCH',
        headers: { 'x-user-id': user.id },
      })
      if (res.ok) setResumes((prev) => prev.map((r) => ({ ...r, is_primary: r.id === id })))
    } catch {}
  }

  const deleteResume = async (id: string) => {
    if (!user?.id) return
    try {
      const res = await fetch(apiUrl(`/api/resumes/${id}`), {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      })
      if (res.ok) setResumes((prev) => prev.filter((r) => r.id !== id))
    } catch {}
  }

  if (!user?.id) return null
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full overflow-y-auto lg:overflow-visible">
      <input
        ref={photoInputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        className="hidden"
        onChange={handlePhotoFile}
      />
      <input
        ref={resumeInputRef}
        type="file"
        accept={RESUME_ACCEPT}
        className="hidden"
        onChange={handleResumeFile}
      />
      {/* Left: form - scrollable */}
      <div className="lg:flex-1 min-w-0 lg:overflow-auto">
        <div className="max-w-xl mx-auto px-4 py-6 lg:py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your details. Photo and resumes are below on small screens, on the right on large ones.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-xl bg-green-50 border border-green-100 text-green-700 px-4 py-3 text-sm">
                Profile saved.
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  Basic info
                </h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label htmlFor="email" className={labelClass}>Email</label>
                  <input
                    id="email"
                    type="email"
                    value={user.email ?? ''}
                    readOnly
                    disabled
                    className={cn(inputClass, 'bg-slate-50 text-slate-500 cursor-not-allowed')}
                  />
                </div>
                <div>
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
                <div>
                  <label htmlFor="headline" className={labelClass}>Headline</label>
                  <input
                    id="headline"
                    value={profile.headline ?? ''}
                    onChange={(e) => handleChange('headline', e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="summary" className={labelClass}>Summary</label>
                  <textarea
                    id="summary"
                    value={profile.summary ?? ''}
                    onChange={(e) => handleChange('summary', e.target.value)}
                    placeholder="Brief summary about you..."
                    rows={3}
                    className={cn(inputClass, 'min-h-[80px] py-2 resize-y')}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <h2 className="text-base font-semibold text-slate-800">Location</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label htmlFor="location_country" className={labelClass}>Country</label>
                  <select
                    id="location_country"
                    value={profile.location_country ?? ''}
                    onChange={(e) => handleChange('location_country', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="location" className={labelClass}>City / Region</label>
                    <input
                      id="location"
                      value={profile.location ?? ''}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="City or region"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className={labelClass}>State</label>
                    <input
                      id="state"
                      value={profile.state ?? ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                      placeholder="State"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <h2 className="text-base font-semibold text-slate-800">Contact & links</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label htmlFor="phone" className={labelClass}>Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={profile.phone ?? ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="At least 10 digits"
                    className={inputClass}
                  />
                </div>
                <div>
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
                <div>
                  <label htmlFor="linkedin_url" className={labelClass}>LinkedIn</label>
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
            </section>

            <div className="pb-6">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>

          {/* Mobile: photo + resume below form */}
          <div className="lg:hidden space-y-5 pt-4">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-slate-500" />
                  Photo upload
                </h2>
                <p className="text-xs text-slate-500 mt-1">Allowed: {PHOTO_FORMATS}</p>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => photoInputRef.current?.click()}
                onDragOver={onPhotoDragOver}
                onDragLeave={onPhotoDragLeave}
                onDrop={onPhotoDrop}
                className={cn(
                  'p-5 flex flex-col items-center cursor-pointer',
                  photoDrag && 'bg-blue-50'
                )}
              >
                <div className={cn(
                  'w-28 h-28 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden',
                  photoDrag ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'
                )}>
                  {photoUploading ? (
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  ) : profile.profile_image_url ? (
                    <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">Drag & drop or tap. PNG, JPEG, GIF, WebP</p>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Resume upload
                </h2>
                <p className="text-xs text-slate-500 mt-1">Allowed: {RESUME_FORMATS} only</p>
              </div>
              <div className="p-4 space-y-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => resumeInputRef.current?.click()}
                  onDragOver={onResumeDragOver}
                  onDragLeave={onResumeDragLeave}
                  onDrop={onResumeDrop}
                  className={cn(
                    'rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 flex flex-col items-center cursor-pointer',
                    resumeDrag && 'border-blue-400 bg-blue-50'
                  )}
                >
                  {addingResume ? (
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-1" />
                      <span className="text-xs font-medium text-slate-600">Drag & drop or tap</span>
                      <span className="text-xs text-slate-500">PDF, DOC, DOCX only</span>
                    </>
                  )}
                </div>
                {resumeUploadError && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{resumeUploadError}</p>
                )}
                {resumes.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                      {r.is_primary && <span className="text-xs text-blue-600">Primary</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {!r.is_primary && (
                        <button type="button" onClick={() => setPrimaryResume(r.id)} className="text-xs text-slate-500 hover:text-amber-500">
                          Set primary
                        </button>
                      )}
                      <a href={r.file_url.startsWith('http') ? r.file_url : apiUrl(r.file_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600">Open</a>
                      <button type="button" onClick={() => deleteResume(r.id)} className="text-xs text-red-500">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Right: photo + resumes - sticky sidebar */}
      <div className="flex flex-col w-full lg:w-[320px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/50">
        <div className="lg:sticky lg:top-0 lg:overflow-auto py-6 px-4 sm:px-5 space-y-6">
          {/* Photo upload */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-500" />
                Photo upload
              </h2>
              <p className="text-xs text-slate-500 mt-1">Allowed: {PHOTO_FORMATS}</p>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => photoInputRef.current?.click()}
              onDragOver={onPhotoDragOver}
              onDragLeave={onPhotoDragLeave}
              onDrop={onPhotoDrop}
              className={cn(
                'p-5 flex flex-col items-center cursor-pointer transition-colors',
                photoDrag && 'bg-blue-50 border-blue-200'
              )}
            >
                <div
                  className={cn(
                  'w-36 h-36 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors',
                  photoDrag ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
                )}
              >
                {photoUploading ? (
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                ) : profile.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <User className="w-12 h-12" />
                    <span className="text-xs font-medium">Drag & drop or click</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">PNG, JPEG, GIF, WebP only</p>
            </div>
          </section>

          {/* Resume upload */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Resume upload
              </h2>
              <p className="text-xs text-slate-500 mt-1">Allowed: {RESUME_FORMATS} only. Used when you apply to jobs.</p>
            </div>
            <div className="p-4 space-y-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => resumeInputRef.current?.click()}
                onDragOver={onResumeDragOver}
                onDragLeave={onResumeDragLeave}
                onDrop={onResumeDrop}
                className={cn(
                  'rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-blue-300 hover:bg-blue-50/50',
                  resumeDrag && 'border-blue-400 bg-blue-50'
                )}
              >
                {addingResume ? (
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-600">Drag & drop or click to upload</span>
                    <span className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX only</span>
                  </>
                )}
              </div>
              {resumeUploadError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{resumeUploadError}</p>
              )}
              {resumes.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                >
                  <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                    {r.is_primary && <span className="text-xs text-blue-600 font-medium">Primary</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!r.is_primary && (
                      <button
                        type="button"
                        onClick={() => setPrimaryResume(r.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                        title="Set as primary"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <a
                      href={r.file_url.startsWith('http') ? r.file_url : apiUrl(r.file_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      title="Open"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => deleteResume(r.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
