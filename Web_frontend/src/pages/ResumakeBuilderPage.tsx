import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  FileText,
  Loader2,
  FileDown,
  FileJson,
  LayoutTemplate,
  User,
  GraduationCap,
  Briefcase,
  Award,
  FolderGit2,
  Trophy,
  X,
  FileCheck,
} from 'lucide-react'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'

const STEPS = [
  { id: 1, title: 'Choose Template', icon: LayoutTemplate },
  { id: 2, title: 'Personal Info', icon: User },
  { id: 3, title: 'Education', icon: GraduationCap },
  { id: 4, title: 'Work Experience', icon: Briefcase },
  { id: 5, title: 'Skills', icon: Award },
  { id: 6, title: 'Projects', icon: FolderGit2 },
  { id: 7, title: 'Awards', icon: Trophy },
  { id: 8, title: 'Make & Export', icon: FileCheck },
] as const

const RESUMAKE_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'work', label: 'Work Experience', icon: Briefcase },
  { id: 'skills', label: 'Skills', icon: Award },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'awards', label: 'Awards', icon: Trophy },
] as const

const DEFAULT_SECTIONS: (typeof RESUMAKE_SECTIONS)[number]['id'][] = ['profile', 'education', 'work', 'skills', 'projects', 'awards']

type SectionId = (typeof RESUMAKE_SECTIONS)[number]['id']

const emptyBasics = {
  name: '',
  email: '',
  phone: '',
  website: '',
  location: { address: '' },
  summaries: [''] as string[],
}

const emptySchool = {
  institution: '',
  location: '',
  area: '',
  studyType: '',
  startDate: '',
  endDate: '',
  gpa: '',
}

const emptyJob = {
  company: '',
  location: '',
  position: '',
  website: '',
  startDate: '',
  endDate: '',
  highlights: [''] as string[],
}

const emptySkill = { name: '', keywords: [''] as string[] }
const emptyProject = { name: '', description: '', url: '', keywords: [''] as string[] }
const emptyAward = { title: '', date: '', awarder: '', summary: '' }

const TEMPLATE_IMAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `/resumake-templates/${n}.png`)

function SectionCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </label>
  )
}

export function ResumakeBuilderPage() {
  const user = getStoredUser()
  const [selectedTemplate, setSelectedTemplate] = useState(1)
  const [sections] = useState<SectionId[]>(DEFAULT_SECTIONS)
  const [headings, setHeadings] = useState({
    work: '',
    education: '',
    skills: '',
    projects: '',
    awards: '',
  })
  const [basics, setBasics] = useState(emptyBasics)
  const [education, setEducation] = useState([{ ...emptySchool }])
  const [work, setWork] = useState([{ ...emptyJob }])
  const [skills, setSkills] = useState([{ ...emptySkill }])
  const [projects, setProjects] = useState([{ ...emptyProject }])
  const [awards, setAwards] = useState([{ ...emptyAward }])
  const [generatedLatex, setGeneratedLatex] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [step, setStep] = useState(1)
  const [pdfCompiling, setPdfCompiling] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    fetch(apiUrl('/api/profile'), { headers: { 'x-user-id': user.id } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        const name = (data.display_name || '').trim()
        const locationParts = [data.location, data.state, data.location_country].filter(Boolean)
        setBasics((b) => ({
          ...b,
          name: name || b.name,
          email: (user?.email ?? data?.email ?? b.email) || b.email,
          phone: data.phone ?? b.phone,
          website: data.website_url ?? b.website,
          location: { address: locationParts.length ? locationParts.join(', ') : b.location?.address ?? '' },
          summaries: (data.summary || data.headline) ? [data.summary || data.headline || ''] : b.summaries,
        }))
      })
      .catch(() => {})
  }, [user?.id])

  const addEducation = () => setEducation((e) => [...e, { ...emptySchool }])
  const removeEducation = (i: number) => setEducation((e) => e.filter((_, j) => j !== i))
  const updateEducation = (i: number, field: keyof typeof emptySchool, value: string) => {
    setEducation((e) => e.map((entry, j) => (j === i ? { ...entry, [field]: value } : entry)))
  }

  const addWork = () => setWork((w) => [...w, { ...emptyJob }])
  const removeWork = (i: number) => setWork((w) => w.filter((_, j) => j !== i))
  const updateWork = (i: number, field: keyof typeof emptyJob, value: string | string[]) => {
    setWork((w) => w.map((entry, j) => (j === i ? { ...entry, [field]: value } : entry)))
  }
  const addHighlight = (jobIndex: number) => {
    setWork((w) =>
      w.map((entry, j) =>
        j === jobIndex ? { ...entry, highlights: [...entry.highlights, ''] } : entry
      )
    )
  }
  const removeHighlight = (jobIndex: number, hiIndex: number) => {
    setWork((w) =>
      w.map((entry, j) =>
        j === jobIndex && entry.highlights.length > 1
          ? { ...entry, highlights: entry.highlights.filter((_, k) => k !== hiIndex) }
          : entry
      )
    )
  }
  const updateHighlight = (jobIndex: number, hiIndex: number, value: string) => {
    setWork((w) =>
      w.map((entry, j) =>
        j === jobIndex
          ? { ...entry, highlights: entry.highlights.map((h, k) => (k === hiIndex ? value : h)) }
          : entry
      )
    )
  }

  const addSkill = () => setSkills((s) => [...s, { ...emptySkill }])
  const removeSkill = (i: number) => setSkills((s) => s.filter((_, j) => j !== i))
  const updateSkill = (i: number, field: 'name' | 'keywords', value: string | string[]) => {
    setSkills((s) => s.map((entry, j) => (j === i ? { ...entry, [field]: value } : entry)))
  }
  const addSkillKeyword = (skillIndex: number) => {
    setSkills((s) =>
      s.map((entry, j) =>
        j === skillIndex ? { ...entry, keywords: [...entry.keywords, ''] } : entry
      )
    )
  }
  const removeSkillKeyword = (skillIndex: number, kwIndex: number) => {
    setSkills((s) =>
      s.map((entry, j) =>
        j === skillIndex && entry.keywords.length > 1
          ? { ...entry, keywords: entry.keywords.filter((_, k) => k !== kwIndex) }
          : entry
      )
    )
  }
  const updateSkillKeyword = (skillIndex: number, kwIndex: number, value: string) => {
    setSkills((s) =>
      s.map((entry, j) =>
        j === skillIndex
          ? { ...entry, keywords: entry.keywords.map((k, ki) => (ki === kwIndex ? value : k)) }
          : entry
      )
    )
  }

  const addProject = () => setProjects((p) => [...p, { ...emptyProject }])
  const removeProject = (i: number) => setProjects((p) => p.filter((_, j) => j !== i))
  const updateProject = (i: number, field: keyof typeof emptyProject, value: string | string[]) => {
    setProjects((p) => p.map((entry, j) => (j === i ? { ...entry, [field]: value } : entry)))
  }
  const addProjectKeyword = (projIndex: number) => {
    setProjects((p) =>
      p.map((entry, j) =>
        j === projIndex ? { ...entry, keywords: [...entry.keywords, ''] } : entry
      )
    )
  }
  const removeProjectKeyword = (projIndex: number, kwIndex: number) => {
    setProjects((p) =>
      p.map((entry, j) =>
        j === projIndex && entry.keywords.length > 1
          ? { ...entry, keywords: entry.keywords.filter((_, k) => k !== kwIndex) }
          : entry
      )
    )
  }
  const updateProjectKeyword = (projIndex: number, kwIndex: number, value: string) => {
    setProjects((p) =>
      p.map((entry, j) =>
        j === projIndex
          ? { ...entry, keywords: entry.keywords.map((k, ki) => (ki === kwIndex ? value : k)) }
          : entry
      )
    )
  }

  const addAward = () => setAwards((a) => [...a, { ...emptyAward }])
  const removeAward = (i: number) => setAwards((a) => a.filter((_, j) => j !== i))
  const updateAward = (i: number, field: keyof typeof emptyAward, value: string) => {
    setAwards((a) => a.map((entry, j) => (j === i ? { ...entry, [field]: value } : entry)))
  }

  const buildPayload = useCallback(() => {
    return {
      selectedTemplate,
      sections,
      headings: {
        work: headings.work || undefined,
        education: headings.education || undefined,
        skills: headings.skills || undefined,
        projects: headings.projects || undefined,
        awards: headings.awards || undefined,
      },
      basics: basics.name || basics.email || basics.phone || basics.website || basics.location?.address
        ? {
            name: basics.name || undefined,
            email: basics.email || undefined,
            phone: basics.phone || undefined,
            website: basics.website || undefined,
            location: basics.location?.address ? { address: basics.location.address } : undefined,
            summaries: basics.summaries?.filter(Boolean).length ? basics.summaries : undefined,
          }
        : undefined,
      education: education.filter((e) => e.institution || e.area || e.studyType).length ? education : [],
      work: work.filter((w) => w.company || w.position).length ? work : [],
      skills: skills.filter((s) => s.name || s.keywords?.some(Boolean)).length ? skills : [],
      projects: projects.filter((p) => p.name || p.description).length ? projects : [],
      awards: awards.filter((a) => a.title || a.awarder).length ? awards : [],
    }
  }, [selectedTemplate, sections, headings, basics, education, work, skills, projects, awards])

  const handleMake = async () => {
    if (!user?.id) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(apiUrl('/api/resumake/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(buildPayload()),
      })
      let data: { error?: string; latex?: string } = {}
      try {
        data = await res.json()
      } catch {
        setError(res.ok ? 'Invalid response from server.' : `Server error (${res.status}). Check that the backend is running on port 3000 and try again.`)
        return
      }
      if (!res.ok) {
        setError(data?.error || `Failed to generate (${res.status})`)
        return
      }
      setGeneratedLatex(data?.latex ?? '')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed'
      setError(msg.includes('fetch') || msg.includes('Network') ? 'Could not reach the server. Is the backend running on port 3000?' : msg)
    } finally {
      setGenerating(false)
    }
  }

  const downloadTex = () => {
    if (!generatedLatex) return
    const blob = new Blob([generatedLatex], { type: 'application/x-tex' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.tex'
    a.click()
    URL.revokeObjectURL(url)
  }

  const viewPdf = async () => {
    if (!generatedLatex?.trim() || !user?.id) return
    setPdfCompiling(true)
    setPdfError(null)
    try {
      const res = await fetch(apiUrl('/api/resumake/compile-pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ latex: generatedLatex }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setPdfError(data?.error || `Failed to compile PDF (${res.status})`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setPdfCompiling(false)
    }
  }

  const downloadJson = () => {
    const json = buildPayload()
    const str = JSON.stringify(json, null, 2)
    const blob = new Blob([str], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const next = () => setStep((s) => Math.min(s + 1, 8))
  const prev = () => setStep((s) => Math.max(s - 1, 1))

  if (!user?.id) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Please sign in to use the resume builder.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-6 pb-8">
      <Link
        to="/app/generate-resume"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Generate Resume
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Resume Builder</h1>
        <p className="text-slate-600 mt-0.5">Step {step} of 8</p>
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
                {step === 1 && 'Choose a LaTeX resume template'}
                {step === 2 && 'Your contact and basic information'}
                {step === 3 && 'Education history'}
                {step === 4 && 'Work experience'}
                {step === 5 && 'Skills'}
                {step === 6 && 'Projects'}
                {step === 7 && 'Honors and awards'}
                {step === 8 && 'Generate LaTeX and download'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <SectionCard title="Choose a Template" icon={LayoutTemplate}>
          <p className="text-sm text-slate-600 mb-4">Click a preview to see full size. Click the button below to select that template.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {TEMPLATE_IMAGES.map((src, i) => {
              const num = i + 1
              const isSelected = selectedTemplate === num
              return (
                <div key={num} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className={`relative w-full rounded-lg border-2 overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center bg-slate-100 min-h-[140px] max-h-[180px] ${
                      isSelected ? 'border-blue-600 shadow-lg shadow-blue-200/50' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <img
                      src={src}
                      alt={`Template ${num} preview`}
                      className={`max-w-full max-h-[172px] w-auto h-auto object-contain ${!isSelected ? 'opacity-85 hover:opacity-100' : ''}`}
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-500 bg-white/90 px-2 py-0.5 rounded">
                      Click to expand
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(num)}
                    className={`mt-2 w-full min-w-0 px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    Template {num}
                  </button>
                </div>
              )
            })}
          </div>
          {lightboxIndex !== null && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setLightboxIndex(null)}
              role="dialog"
              aria-modal="true"
              aria-label="Template preview"
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={TEMPLATE_IMAGES[lightboxIndex]}
                alt={`Template ${lightboxIndex + 1} preview`}
                className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/90 text-sm">
                Template {lightboxIndex + 1}
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-4">Only Template 1 is available for LaTeX generation right now. Others coming soon.</p>
            </SectionCard>
          )}

          {step === 2 && (
        <SectionCard title="Your Personal Info" icon={User}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Full Name" value={basics.name} onChange={(v) => setBasics((b) => ({ ...b, name: v }))} placeholder="John Smith" />
            <Input label="Email" value={basics.email} onChange={(v) => setBasics((b) => ({ ...b, email: v }))} placeholder="john@example.com" type="email" />
            <Input label="Phone" value={basics.phone} onChange={(v) => setBasics((b) => ({ ...b, phone: v }))} placeholder="(555) 123-4567" />
            <Input label="Location" value={basics.location?.address ?? ''} onChange={(v) => setBasics((b) => ({ ...b, location: { address: v } }))} placeholder="New York, NY" />
            <Input label="Website / Portfolio" value={basics.website} onChange={(v) => setBasics((b) => ({ ...b, website: v }))} placeholder="https://..." className="sm:col-span-2" />
          </div>
          <div className="mt-3">
            <span className="text-sm font-medium text-slate-700">Profile summary (one or more lines)</span>
            {basics.summaries?.map((line, i) => (
              <div key={i} className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={line}
                  onChange={(e) =>
                    setBasics((b) => ({
                      ...b,
                      summaries: b.summaries?.map((s, j) => (j === i ? e.target.value : s)) ?? [''],
                    }))
                  }
                  placeholder="Experienced professional..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                {basics.summaries && basics.summaries.length > 1 && (
                  <button type="button" onClick={() => setBasics((b) => ({ ...b, summaries: b.summaries?.filter((_, j) => j !== i) ?? [''] }))} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setBasics((b) => ({ ...b, summaries: [...(b.summaries || ['']), ''] }))}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add summary line
            </button>
          </div>
        </SectionCard>
          )}

          {step === 3 && (
        <SectionCard title="Education" icon={GraduationCap} action={<Input label="Section heading" value={headings.education} onChange={(v) => setHeadings((h) => ({ ...h, education: v }))} placeholder="Education" className="max-w-[180px]" />}>
          {education.map((entry, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 mb-4">
              {education.length > 1 && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeEducation(i)} className="text-slate-400 hover:text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Input label="School / Institution" value={entry.institution} onChange={(v) => updateEducation(i, 'institution', v)} placeholder="Stanford University" />
                <Input label="Location" value={entry.location} onChange={(v) => updateEducation(i, 'location', v)} placeholder="Stanford, CA" />
                <Input label="Degree (e.g. BS, MS)" value={entry.studyType} onChange={(v) => updateEducation(i, 'studyType', v)} placeholder="BS" />
                <Input label="Major / Area" value={entry.area} onChange={(v) => updateEducation(i, 'area', v)} placeholder="Computer Science" />
                <Input label="GPA" value={entry.gpa} onChange={(v) => updateEducation(i, 'gpa', v)} placeholder="3.6" />
                <Input label="Start date" value={entry.startDate} onChange={(v) => updateEducation(i, 'startDate', v)} placeholder="Sep 2015" />
                <Input label="End date" value={entry.endDate} onChange={(v) => updateEducation(i, 'endDate', v)} placeholder="Jun 2019" className="sm:col-span-2" />
              </div>
            </div>
          ))}
          <button type="button" onClick={addEducation} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add education
          </button>
        </SectionCard>
          )}

          {step === 4 && (
        <SectionCard title="Work Experience" icon={Briefcase} action={<Input label="Section heading" value={headings.work} onChange={(v) => setHeadings((h) => ({ ...h, work: v }))} placeholder="Experience" className="max-w-[180px]" />}>
          {work.map((entry, j) => (
            <div key={j} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 mb-4">
              {work.length > 1 && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeWork(j)} className="text-slate-400 hover:text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Input label="Company" value={entry.company} onChange={(v) => updateWork(j, 'company', v)} placeholder="Google" />
                <Input label="Job title" value={entry.position} onChange={(v) => updateWork(j, 'position', v)} placeholder="Software Engineer" />
                <Input label="Location" value={entry.location} onChange={(v) => updateWork(j, 'location', v)} placeholder="Mountain View, CA" />
                <Input label="Start date" value={entry.startDate} onChange={(v) => updateWork(j, 'startDate', v)} placeholder="May 2015" />
                <Input label="End date" value={entry.endDate} onChange={(v) => updateWork(j, 'endDate', v)} placeholder="Present" />
              </div>
              <div className="mt-2">
                <span className="text-sm font-medium text-slate-700">Responsibilities / highlights</span>
                {entry.highlights.map((h, hi) => (
                  <div key={hi} className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={h}
                      onChange={(e) => updateHighlight(j, hi, e.target.value)}
                      placeholder="Achievement or responsibility..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    {entry.highlights.length > 1 && (
                      <button type="button" onClick={() => removeHighlight(j, hi)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addHighlight(j)} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  + Add highlight
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addWork} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add job
          </button>
        </SectionCard>
          )}

          {step === 5 && (
        <SectionCard title="Skills" icon={Award} action={<Input label="Section heading" value={headings.skills} onChange={(v) => setHeadings((h) => ({ ...h, skills: v }))} placeholder="Skills" className="max-w-[180px]" />}>
          {skills.map((entry, si) => (
            <div key={si} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 mb-4">
              {skills.length > 1 && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeSkill(si)} className="text-slate-400 hover:text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <Input label="Skill category (e.g. Programming)" value={entry.name} onChange={(v) => updateSkill(si, 'name', v)} placeholder="Programming Languages" />
              <div>
                <span className="text-sm font-medium text-slate-700">Keywords</span>
                {entry.keywords.map((kw, ki) => (
                  <div key={ki} className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={kw}
                      onChange={(e) => updateSkillKeyword(si, ki, e.target.value)}
                      placeholder="Java, Python..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    {entry.keywords.length > 1 && (
                      <button type="button" onClick={() => removeSkillKeyword(si, ki)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addSkillKeyword(si)} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  + Add keyword
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSkill} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add skill group
          </button>
        </SectionCard>
          )}

          {step === 6 && (
        <SectionCard title="Projects" icon={FolderGit2} action={<Input label="Section heading" value={headings.projects} onChange={(v) => setHeadings((h) => ({ ...h, projects: v }))} placeholder="Projects" className="max-w-[180px]" />}>
          {projects.map((entry, pi) => (
            <div key={pi} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 mb-4">
              {projects.length > 1 && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeProject(pi)} className="text-slate-400 hover:text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <Input label="Project name" value={entry.name} onChange={(v) => updateProject(pi, 'name', v)} placeholder="Piper Chat" />
              <Input label="Description" value={entry.description} onChange={(v) => updateProject(pi, 'description', v)} placeholder="A video chat app..." />
              <Input label="URL" value={entry.url} onChange={(v) => updateProject(pi, 'url', v)} placeholder="https://..." />
              <div>
                <span className="text-sm font-medium text-slate-700">Tools / keywords</span>
                {entry.keywords.map((kw, ki) => (
                  <div key={ki} className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={kw}
                      onChange={(e) => updateProjectKeyword(pi, ki, e.target.value)}
                      placeholder="Java, React..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    {entry.keywords.length > 1 && (
                      <button type="button" onClick={() => removeProjectKeyword(pi, ki)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addProjectKeyword(pi)} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  + Add keyword
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addProject} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add project
          </button>
        </SectionCard>
          )}

          {step === 7 && (
        <SectionCard title="Honors & Awards" icon={Trophy} action={<Input label="Section heading" value={headings.awards} onChange={(v) => setHeadings((h) => ({ ...h, awards: v }))} placeholder="Awards" className="max-w-[180px]" />}>
          {awards.map((entry, ai) => (
            <div key={ai} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 mb-4">
              {awards.length > 1 && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeAward(ai)} className="text-slate-400 hover:text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Input label="Award name" value={entry.title} onChange={(v) => updateAward(ai, 'title', v)} placeholder="Supreme Hacker" />
                <Input label="Date" value={entry.date} onChange={(v) => updateAward(ai, 'date', v)} placeholder="May 2015" />
                <Input label="Awarder" value={entry.awarder} onChange={(v) => updateAward(ai, 'awarder', v)} placeholder="HackNY" />
                <Input label="Summary" value={entry.summary} onChange={(v) => updateAward(ai, 'summary', v)} placeholder="Brief description" className="sm:col-span-2" />
              </div>
            </div>
          ))}
          <button type="button" onClick={addAward} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <Plus className="h-4 w-4" /> Add award
          </button>
        </SectionCard>
          )}

          {step === 8 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Sections in the generated resume: {sections.map((id) => RESUMAKE_SECTIONS.find((s) => s.id === id)?.label ?? id).join(' → ')}</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-6">
          <h2 className="font-semibold text-slate-900 mb-2">Make & Export</h2>
          <p className="text-sm text-slate-600 mb-4">Generate LaTeX from your data (Template 1). Download .tex and compile with pdflatex or use Overleaf.</p>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleMake}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-70"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generating ? 'Generating...' : 'Make'}
            </button>
            <button type="button" onClick={downloadJson} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
              <FileJson className="h-4 w-4" />
              Download JSON
            </button>
          </div>

          {generatedLatex && (
            <div className="mt-6">
              <p className="text-sm font-medium text-slate-700 mb-2">LaTeX source</p>
              {pdfError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-2">{pdfError}</p>}
              <textarea
                readOnly
                value={generatedLatex}
                className="w-full min-h-[300px] px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" onClick={viewPdf} disabled={pdfCompiling} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70">
                  {pdfCompiling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {pdfCompiling ? 'Compiling PDF…' : 'View PDF'}
                </button>
                <button type="button" onClick={downloadTex} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                  <FileDown className="h-4 w-4" />
                  Download .tex
                </button>
                <button type="button" onClick={() => { void navigator.clipboard.writeText(generatedLatex).then(() => alert('Copied to clipboard')) }} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                  Copy LaTeX
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">View PDF requires pdflatex (e.g. TeX Live) installed on the server. If it fails, use Download .tex and compile in Overleaf.</p>
            </div>
          )}
        </div>
        </div>
          )}
        </div>

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
          {step < 8 ? (
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
