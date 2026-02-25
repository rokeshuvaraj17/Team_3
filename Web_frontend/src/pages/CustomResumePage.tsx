import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, User, GraduationCap, Briefcase, Award, FileCheck, Plus, Trash2, X, Loader2, Save } from 'lucide-react'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Education', icon: GraduationCap },
  { id: 3, title: 'Experience', icon: Briefcase },
  { id: 4, title: 'Skills & More', icon: Award },
  { id: 5, title: 'Review & Generate', icon: FileCheck },
]

interface EducationEntry {
  degree: string
  school: string
  start: string
  end: string
  current: boolean
  description: string
}

interface ExperienceEntry {
  title: string
  company: string
  start: string
  end: string
  current: boolean
  description: string
}

export function CustomResumePage() {
  const [step, setStep] = useState(1)
  const [personal, setPersonal] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    dateOfBirth: '',
    linkedin: '',
    website: '',
  })
  const [summary, setSummary] = useState('')
  const [education, setEducation] = useState<EducationEntry[]>([{ degree: '', school: '', start: '', end: '', current: false, description: '' }])
  const [experience, setExperience] = useState<ExperienceEntry[]>([{ title: '', company: '', start: '', end: '', current: false, description: '' }])
  const [skillTags, setSkillTags] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([])
  const [skillSuggestionsLoading, setSkillSuggestionsLoading] = useState(false)
  const skillDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [languages, setLanguages] = useState('')
  const [certifications, setCertifications] = useState('')
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saveModal, setSaveModal] = useState<'choose' | 'add' | null>(null)
  const [addResumeName, setAddResumeName] = useState('')
  const [saving, setSaving] = useState(false)
  const resumeEditorRef = useRef<HTMLDivElement>(null)
  const initialEditorContentSet = useRef(false)
  useEffect(() => {
    if (step === 5 && generatedContent && resumeEditorRef.current && !initialEditorContentSet.current) {
      resumeEditorRef.current.innerHTML = generatedContent
      initialEditorContentSet.current = true
    }
    if (!generatedContent) initialEditorContentSet.current = false
  }, [step, generatedContent])

  const addEducation = () => setEducation((e) => [...e, { degree: '', school: '', start: '', end: '', current: false, description: '' }])
  const removeEducation = (i: number) => setEducation((e) => e.filter((_, idx) => idx !== i))
  const updateEducation = (i: number, field: keyof EducationEntry, value: string | boolean) => {
    setEducation((e) => e.map((entry, idx) => (idx === i ? { ...entry, [field]: value } : entry)))
  }

  const addExperience = () => setExperience((ex) => [...ex, { title: '', company: '', start: '', end: '', current: false, description: '' }])
  const removeExperience = (i: number) => setExperience((ex) => ex.filter((_, idx) => idx !== i))
  const updateExperience = (i: number, field: keyof ExperienceEntry, value: string | boolean) => {
    setExperience((ex) => ex.map((entry, idx) => (idx === i ? { ...entry, [field]: value } : entry)))
  }

  /** Format YYYY-MM-DD or YYYY-MM to "Month YYYY" for US resume */
  const formatDateForResume = (dateStr: string, isCurrent: boolean): string => {
    if (isCurrent) return 'Present'
    if (!dateStr?.trim()) return ''
    const [y, m] = dateStr.split('-')
    if (!y) return dateStr
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const monthNum = parseInt(m || '1', 10)
    const month = months[monthNum - 1] || m || ''
    return month ? `${month} ${y}` : `${y}`
  }

  const next = () => setStep((s) => Math.min(s + 1, 5))
  const prev = () => setStep((s) => Math.max(s - 1, 1))

  const user = getStoredUser()
  useEffect(() => {
    if (!user?.id) return
    fetch(apiUrl('/api/profile'), { headers: { 'x-user-id': user.id } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        const name = (data.display_name || '').trim()
        const space = name.indexOf(' ')
        const firstName = space > 0 ? name.slice(0, space) : name
        const lastName = space > 0 ? name.slice(space + 1) : ''
        const locationParts = [data.location, data.state, data.location_country].filter(Boolean)
        setPersonal((p) => ({
          ...p,
          firstName: firstName || p.firstName,
          lastName: lastName || p.lastName,
          email: user?.email ?? data?.email ?? p.email,
          phone: data.phone ?? p.phone,
          location: locationParts.length ? locationParts.join(', ') : p.location,
          linkedin: data.linkedin_url ?? p.linkedin,
          website: data.website_url ?? p.website,
        }))
        setSummary((s) => data.summary || data.headline || s)
      })
      .catch(() => {})
  }, [user?.id])

  const fetchSkillSuggestions = useCallback((query: string) => {
    if (!query.trim() || !user?.id) return
    setSkillSuggestionsLoading(true)
    fetch(apiUrl('/api/ai/skill-suggestions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
      body: JSON.stringify({ query: query.trim() }),
    })
      .then((r) => r.text())
      .then((text) => {
        if (text.trimStart().startsWith('<')) return []
        try {
          const data = JSON.parse(text)
          return Array.isArray(data?.suggestions) ? data.suggestions : []
        } catch {
          return []
        }
      })
      .then((suggestions) => setSkillSuggestions(suggestions))
      .catch(() => setSkillSuggestions([]))
      .finally(() => setSkillSuggestionsLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (skillDebounceRef.current) clearTimeout(skillDebounceRef.current)
    if (!skillInput.trim()) {
      setSkillSuggestions([])
      return
    }
    skillDebounceRef.current = setTimeout(() => fetchSkillSuggestions(skillInput), 300)
    return () => { if (skillDebounceRef.current) clearTimeout(skillDebounceRef.current) }
  }, [skillInput, fetchSkillSuggestions])

  const addSkill = (skill: string) => {
    const s = skill.trim()
    if (s && !skillTags.includes(s)) setSkillTags((t) => [...t, s])
    setSkillInput('')
    setSkillSuggestions([])
  }
  const removeSkill = (index: number) => setSkillTags((t) => t.filter((_, i) => i !== index))

  const handleGenerate = async () => {
    if (!user?.id) return
    setGenerating(true)
    try {
      const res = await fetch(apiUrl('/api/ai/generate-resume'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          personal,
          summary,
          education: education.filter((e) => e.degree || e.school).map((e) => ({
            ...e,
            start: formatDateForResume(e.start, false),
            end: formatDateForResume(e.end, e.current),
          })),
          experience: experience.filter((e) => e.title || e.company).map((e) => ({
            ...e,
            start: formatDateForResume(e.start, false),
            end: formatDateForResume(e.end, e.current),
          })),
          skills: skillTags.join(', ') || '',
          languages,
          certifications,
        }),
      })
      const text = await res.text()
      if (text.trimStart().startsWith('<')) {
        throw new Error('Could not reach the server. Is the backend running on port 3000? Check the terminal.')
      }
      let data: { content?: string; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Invalid response from server. Try again.')
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to generate')
      setGeneratedContent(data?.content ?? '')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not generate resume')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveResume = async (asPrimary: boolean, name: string) => {
    if (!user?.id) return
    setSaving(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const el = resumeEditorRef.current
      if (!el) throw new Error('Editor not found')
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      const img = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ format: 'a4', unit: 'mm' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(img, 'PNG', 0, 0, w, h)
      const blob = pdf.output('blob')
      const formData = new FormData()
      formData.append('file', blob, 'resume.pdf')
      const uploadRes = await fetch(apiUrl('/api/resumes/upload'), {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: formData,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData?.error || 'Upload failed')
      await fetch(apiUrl('/api/resumes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          name: name || 'Resume',
          file_url: uploadData.file_url,
          is_primary: asPrimary,
        }),
      })
      setSaveModal(null)
      setAddResumeName('')
      alert(asPrimary ? 'Resume saved as primary.' : 'Resume added.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-none py-4 px-4 pb-8">
      <Link
        to="/app/generate-resume"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Generate Resume
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Create your resume</h1>
        <p className="text-slate-600 mt-0.5">Step {step} of 5</p>
        <div className="flex gap-1 mt-3">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step >= s.id ? 'bg-blue-500' : 'bg-slate-200'
              }`}
              aria-label={`Step ${s.id}: ${s.title}`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-slate-500">
          {STEPS.map((s) => (
            <span key={s.id} className={step === s.id ? 'text-blue-600 font-medium' : ''}>
              {s.id}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              {(() => {
                const Icon = STEPS[step - 1].icon
                return <Icon className="h-4 w-4" />
              })()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{STEPS[step - 1].title}</h2>
              <p className="text-xs text-slate-500">
                {step === 1 && 'Your contact and basic information'}
                {step === 2 && 'Education history'}
                {step === 3 && 'Work experience'}
                {step === 4 && 'Skills, languages, and certifications'}
                {step === 5 && 'Review and download your resume'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Please provide your personal details.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">First name *</span>
                  <input
                    type="text"
                    value={personal.firstName}
                    onChange={(e) => setPersonal((p) => ({ ...p, firstName: e.target.value }))}
                    className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Last name *</span>
                  <input
                    type="text"
                    value={personal.lastName}
                    onChange={(e) => setPersonal((p) => ({ ...p, lastName: e.target.value }))}
                    className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email *</span>
                <input
                  type="email"
                  value={personal.email}
                  onChange={(e) => setPersonal((p) => ({ ...p, email: e.target.value }))}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Phone number</span>
                <input
                  type="tel"
                  value={personal.phone}
                  onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 234 567 8900"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Current location</span>
                <input
                  type="text"
                  value={personal.location}
                  onChange={(e) => setPersonal((p) => ({ ...p, location: e.target.value }))}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="City, State (e.g. San Francisco, CA)"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Date of birth</span>
                <input
                  type="text"
                  value={personal.dateOfBirth}
                  onChange={(e) => setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MM/DD/YYYY (e.g. 01/15/1990)"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">LinkedIn</span>
                <input
                  type="url"
                  value={personal.linkedin}
                  onChange={(e) => setPersonal((p) => ({ ...p, linkedin: e.target.value }))}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://linkedin.com/in/username"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Website / Portfolio</span>
                <input
                  type="url"
                  value={personal.website}
                  onChange={(e) => setPersonal((p) => ({ ...p, website: e.target.value }))}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://"
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Professional summary</span>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief overview of your background and career goals..."
                />
              </label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Education</span>
                  <button
                    type="button"
                    onClick={addEducation}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                {education.map((entry, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    {education.length > 1 && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeEducation(i)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Degree / Qualification</span>
                      <input
                        type="text"
                        value={entry.degree}
                        onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="e.g. Bachelor of Science in Computer Science"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">School / University</span>
                      <input
                        type="text"
                        value={entry.school}
                        onChange={(e) => updateEducation(i, 'school', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">Start date</span>
                        <input
                          type="date"
                          value={entry.start}
                          onChange={(e) => updateEducation(i, 'start', e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700">End date</span>
                        <input
                          type="date"
                          value={entry.end}
                          onChange={(e) => updateEducation(i, 'end', e.target.value)}
                          disabled={entry.current}
                          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={entry.current}
                        onChange={(e) => updateEducation(i, 'current', e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Currently studying here</span>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Description (optional)</span>
                      <textarea
                        value={entry.description}
                        onChange={(e) => updateEducation(i, 'description', e.target.value)}
                        rows={2}
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Work experience</span>
                <button
                  type="button"
                  onClick={addExperience}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              {experience.map((entry, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  {experience.length > 1 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeExperience(i)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Job title</span>
                    <input
                      type="text"
                      value={entry.title}
                      onChange={(e) => updateExperience(i, 'title', e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="e.g. Software Engineer"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Company</span>
                    <input
                      type="text"
                      value={entry.company}
                      onChange={(e) => updateExperience(i, 'company', e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Start date</span>
                      <input
                        type="date"
                        value={entry.start}
                        onChange={(e) => updateExperience(i, 'start', e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">End date</span>
                      <input
                        type="date"
                        value={entry.end}
                        onChange={(e) => updateExperience(i, 'end', e.target.value)}
                        disabled={entry.current}
                        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={entry.current}
                      onChange={(e) => updateExperience(i, 'current', e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Currently working here</span>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Description</span>
                    <textarea
                      value={entry.description}
                      onChange={(e) => updateExperience(i, 'description', e.target.value)}
                      rows={2}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Key responsibilities and achievements..."
                    />
                  </label>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Skills (type to see AI suggestions)</span>
                <div className="mt-0.5 relative">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && skillInput.trim()) {
                        e.preventDefault()
                        addSkill(skillInput)
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. JavaScript, React..."
                  />
                  {skillSuggestionsLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                  )}
                  {skillSuggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg py-1 max-h-48 overflow-auto">
                      {skillSuggestions.map((s, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => addSkill(s)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skillTags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 text-sm"
                    >
                      {tag}
                      <button type="button" onClick={() => removeSkill(i)} className="hover:text-blue-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Languages</span>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. English (Fluent), Hindi (Native)"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Certifications</span>
                <textarea
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  rows={2}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. AWS Certified, Google Analytics"
                />
              </label>
            </div>
          )}

          {step === 5 && !generatedContent && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Review your information below. Click Generate to create your resume.</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4 text-sm overflow-auto max-h-[50vh]">
                <section>
                  <h3 className="font-semibold text-slate-800 mb-2 border-b border-slate-200 pb-1">Personal</h3>
                  <ul className="space-y-1 text-slate-700">
                    {([personal.firstName, personal.lastName].filter(Boolean).join(' ') || '—') && <li><strong>Name:</strong> {[personal.firstName, personal.lastName].filter(Boolean).join(' ') || '—'}</li>}
                    {personal.email && <li><strong>Email:</strong> {personal.email}</li>}
                    {personal.phone && <li><strong>Phone:</strong> {personal.phone}</li>}
                    {personal.location && <li><strong>Location:</strong> {personal.location}</li>}
                    {personal.dateOfBirth && <li><strong>Date of birth:</strong> {personal.dateOfBirth}</li>}
                    {personal.linkedin && <li><strong>LinkedIn:</strong> {personal.linkedin}</li>}
                    {personal.website && <li><strong>Website:</strong> {personal.website}</li>}
                  </ul>
                </section>
                {summary && (
                  <section>
                    <h3 className="font-semibold text-slate-800 mb-2 border-b border-slate-200 pb-1">Summary</h3>
                    <p className="text-slate-700 whitespace-pre-wrap">{summary}</p>
                  </section>
                )}
                {education.some((e) => e.degree || e.school) && (
                  <section>
                    <h3 className="font-semibold text-slate-800 mb-2 border-b border-slate-200 pb-1">Education</h3>
                    <ul className="space-y-3">
                      {education.filter((e) => e.degree || e.school).map((entry, i) => (
                        <li key={i} className="pl-2 border-l-2 border-slate-200">
                          <p className="font-medium text-slate-800">{entry.degree || '—'}{entry.school && ` · ${entry.school}`}</p>
                          <p className="text-slate-600 text-xs mt-0.5">
                            {entry.start && formatDateForResume(entry.start, false)} – {entry.current ? 'Present' : (entry.end ? formatDateForResume(entry.end, false) : '—')}
                          </p>
                          {entry.description && <p className="text-slate-600 mt-1">{entry.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {experience.some((e) => e.title || e.company) && (
                  <section>
                    <h3 className="font-semibold text-slate-800 mb-2 border-b border-slate-200 pb-1">Experience</h3>
                    <ul className="space-y-3">
                      {experience.filter((e) => e.title || e.company).map((entry, i) => (
                        <li key={i} className="pl-2 border-l-2 border-slate-200">
                          <p className="font-medium text-slate-800">{entry.title || '—'}{entry.company && ` at ${entry.company}`}</p>
                          <p className="text-slate-600 text-xs mt-0.5">
                            {entry.start && formatDateForResume(entry.start, false)} – {entry.current ? 'Present' : (entry.end ? formatDateForResume(entry.end, false) : '—')}
                          </p>
                          {entry.description && <p className="text-slate-600 mt-1">{entry.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {(skillTags.length > 0 || languages || certifications) && (
                  <section>
                    <h3 className="font-semibold text-slate-800 mb-2 border-b border-slate-200 pb-1">Skills & more</h3>
                    <ul className="space-y-1 text-slate-700">
                      {skillTags.length > 0 && <li><strong>Skills:</strong> {skillTags.join(', ')}</li>}
                      {languages && <li><strong>Languages:</strong> {languages}</li>}
                      {certifications && <li><strong>Certifications:</strong> {certifications}</li>}
                    </ul>
                  </section>
                )}
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                {generating ? 'Generating...' : 'Generate resume'}
              </button>
            </div>
          )}
          {step === 5 && generatedContent && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Edit your resume below, then save to add it to your account.</p>
              <div
                ref={resumeEditorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setGeneratedContent(e.currentTarget.innerHTML)}
                className="min-h-[400px] w-full rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-800 prose prose-slate max-w-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setGeneratedContent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Back to form
                </button>
                <button
                  type="button"
                  onClick={() => setSaveModal('choose')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  Save resume
                </button>
              </div>
            </div>
          )}
        </div>

        {saveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saving && setSaveModal(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              {saveModal === 'choose' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900">How do you want to save?</h3>
                  <p className="text-sm text-slate-600">Replace your primary resume or add this as an additional resume.</p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveResume(true, 'Resume')}
                      disabled={saving}
                      className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-70"
                    >
                      {saving ? 'Saving...' : 'Replace primary resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveModal('add')}
                      disabled={saving}
                      className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50"
                    >
                      Add as new resume
                    </button>
                    <button type="button" onClick={() => setSaveModal(null)} className="w-full py-2 text-slate-500 text-sm hover:text-slate-700">
                      Cancel
                    </button>
                  </div>
                </>
              )}
              {saveModal === 'add' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900">Name this resume</h3>
                  <input
                    type="text"
                    value={addResumeName}
                    onChange={(e) => setAddResumeName(e.target.value)}
                    placeholder="e.g. Software Engineer 2024"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveResume(false, addResumeName || 'Resume')}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-70"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSaveModal('choose'); setAddResumeName('') }}
                      disabled={saving}
                      className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-slate-50"
                    >
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-200 flex justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={prev}
            disabled={step === 1}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-white disabled:opacity-50 disabled:pointer-events-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
