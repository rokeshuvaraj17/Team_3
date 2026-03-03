import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, User, GraduationCap, Briefcase, Award, FileCheck, Plus, Trash2, X, Loader2, Save, KeyRound, Check, FileDown, FileJson } from 'lucide-react'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Education', icon: GraduationCap },
  { id: 3, title: 'Experience', icon: Briefcase },
  { id: 4, title: 'Skills & More', icon: Award },
  { id: 5, title: 'Review & Generate', icon: FileCheck },
]

const ALL_SUGGESTED_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'SQL',
  'React', 'Node.js', 'Vue.js', 'Angular', 'Next.js', 'HTML', 'CSS', 'REST APIs',
  'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Agile', 'Scrum',
  'Data Structures', 'Algorithms', 'Machine Learning', 'MongoDB', 'PostgreSQL',
  'GraphQL', 'CI/CD', 'Testing', 'System Design',
  'CAD', 'AutoCAD', 'MATLAB', 'Simulink', 'SolidWorks', 'Fusion 360', 'Revit',
  'Figma', 'Adobe XD', 'Sketch', 'UI/UX Design', 'Prototyping', 'Blender',
  'ANSYS', 'LabVIEW', 'R', 'Excel', 'PCB Design', 'Embedded Systems',
]
const INITIAL_SKILLS_COUNT = 10
const MAX_FILTERED_SKILLS = 25

const RESUME_TEMPLATES = [
  { id: 'modern_minimal', name: 'Modern Minimal', tags: 'Clean · Whitespace · ATS-Friendly' },
  { id: 'executive_classic', name: 'Executive Classic', tags: 'Professional · Corporate · Senior' },
  { id: 'technical_developer', name: 'Technical / Developer', tags: 'Dev · Engineer · Tech' },
  { id: 'bold_creative', name: 'Bold Creative', tags: 'Design · Marketing · Creative' },
  { id: 'academic_research', name: 'Academic / Research', tags: 'Academic · Research · PhD' },
  { id: 'compact_pro', name: 'Compact Pro', tags: 'Experienced · Dense · 1-Page' },
] as const

const TEMPLATE_PREVIEW_SCALE = 0.28
const PREVIEW_W = 160
const PREVIEW_H = 157
const INNER_W = Math.ceil(PREVIEW_W / TEMPLATE_PREVIEW_SCALE)
const INNER_H = Math.ceil(PREVIEW_H / TEMPLATE_PREVIEW_SCALE)

function TemplatePreviewMini({ templateId }: { templateId: string }) {
  const base = { width: INNER_W, height: INNER_H, transform: `scale(${TEMPLATE_PREVIEW_SCALE})`, transformOrigin: '0 0' } as const
  // Font sizes are ~3.5x larger so that after scale(0.28) they remain readable in the thumbnail
  if (templateId === 'modern_minimal') {
    return (
      <div style={base} className="bg-white border border-slate-200 rounded overflow-hidden flex flex-col text-left">
        <div className="p-4 pb-1">
          <div className="text-[78px] font-light text-slate-800 tracking-tight leading-tight">Jane Doe</div>
          <div className="text-[29px] text-slate-500 mt-1">email · phone · location</div>
        </div>
        <hr className="border-t-2 border-slate-200 my-2 mx-4" />
        <div className="px-4 py-1">
          <div className="text-[32px] font-semibold text-slate-700 uppercase tracking-wide">Experience</div>
          <div className="text-[29px] text-slate-600 mt-1">Role — Company · Date</div>
        </div>
        <hr className="border-t-2 border-slate-200 my-2 mx-4" />
        <div className="px-4 py-1">
          <div className="text-[32px] font-semibold text-slate-700 uppercase tracking-wide">Education</div>
          <div className="text-[29px] text-slate-600 mt-1">Degree — School</div>
        </div>
      </div>
    )
  }
  if (templateId === 'executive_classic') {
    return (
      <div style={base} className="flex border border-slate-200 rounded overflow-hidden bg-white">
        <div className="w-[32%] bg-[#1e3a5f] text-white p-3">
          <div className="text-[43px] font-semibold leading-tight">Jane Doe</div>
          <div className="text-[21px] mt-2 opacity-90">email · phone</div>
          <div className="text-[21px] opacity-90">location</div>
        </div>
        <div className="flex-1 p-2">
          <div className="text-[29px] font-semibold text-slate-800">Experience</div>
          <div className="text-[25px] text-slate-600">Role — Company</div>
          <div className="text-[29px] font-semibold text-slate-800 mt-2">Education</div>
          <div className="text-[25px] text-slate-600">Degree — School</div>
        </div>
      </div>
    )
  }
  if (templateId === 'technical_developer') {
    return (
      <div style={base} className="bg-slate-900 text-slate-300 font-mono border border-slate-700 rounded overflow-hidden p-3 text-left">
        <div className="text-[39px] font-mono">jane_doe</div>
        <div className="text-[21px] text-slate-500">email · github</div>
        <div className="border-t-2 border-slate-600 my-2" />
        <div className="text-[25px]">EXPERIENCE</div>
        <div className="text-[21px] mt-1">Role @ Company</div>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="px-2 py-1 rounded bg-slate-700 text-[21px]">JS</span>
          <span className="px-2 py-1 rounded bg-slate-700 text-[21px]">React</span>
        </div>
        <div className="border-t-2 border-slate-600 my-2" />
        <div className="text-[25px]">EDUCATION</div>
        <div className="text-[21px] mt-1">Degree — School</div>
      </div>
    )
  }
  if (templateId === 'bold_creative') {
    return (
      <div style={base} className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="bg-teal-500 text-white p-3 text-center">
          <div className="text-[57px] font-bold leading-tight">JANE DOE</div>
          <div className="text-[21px] opacity-90">Designer · Creative</div>
        </div>
        <div className="flex p-2">
          <div className="w-1/2 pr-1">
            <div className="text-[25px] font-semibold text-slate-800">Experience</div>
            <div className="text-[21px] text-slate-600">Role — Company</div>
          </div>
          <div className="w-1/2 pl-1 border-l-2 border-slate-200">
            <div className="text-[25px] font-semibold text-slate-800">Skills</div>
            <div className="text-[21px] text-slate-600">Design · Brand</div>
          </div>
        </div>
      </div>
    )
  }
  if (templateId === 'academic_research') {
    return (
      <div style={base} className="bg-white border border-slate-200 rounded overflow-hidden p-3 text-left font-serif">
        <div className="text-[50px] font-serif font-semibold text-slate-800">Jane Doe</div>
        <div className="text-[25px] text-slate-600 mt-1">Department · University</div>
        <div className="text-[29px] font-semibold text-slate-800 mt-3">Education</div>
        <div className="text-[25px] text-slate-600">Ph.D. — University, Year</div>
        <div className="text-[29px] font-semibold text-slate-800 mt-2">Publications</div>
        <div className="text-[21px] text-slate-600 italic">Author (Year). Title. Journal.</div>
      </div>
    )
  }
  if (templateId === 'compact_pro') {
    return (
      <div style={base} className="bg-white border border-slate-200 rounded overflow-hidden p-2 text-left">
        <div className="text-[36px] font-semibold text-slate-800">Jane Doe</div>
        <div className="text-[18px] text-slate-500">email · phone · location</div>
        <div className="text-[21px] font-semibold text-slate-700 mt-2">Experience</div>
        <div className="text-[18px] text-slate-600 leading-tight">Role, Company · Dates. Brief bullet.</div>
        <div className="text-[21px] font-semibold text-slate-700 mt-1">Education</div>
        <div className="text-[18px] text-slate-600 leading-tight">Degree, School · Year. Skills: A, B, C.</div>
      </div>
    )
  }
  return null
}

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
    targetRole: '',
  })
  const [summary, setSummary] = useState('')
  const [education, setEducation] = useState<EducationEntry[]>([{ degree: '', school: '', start: '', end: '', current: false, description: '' }])
  const [experience, setExperience] = useState<ExperienceEntry[]>([{ title: '', company: '', start: '', end: '', current: false, description: '' }])
  const [skillTags, setSkillTags] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([])
  const [skillSuggestionsLoading, setSkillSuggestionsLoading] = useState(false)
  const skillDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showDefaultSkills, setShowDefaultSkills] = useState(false)
  const skillBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [languages, setLanguages] = useState('')
  const [certifications, setCertifications] = useState('')
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatedLatex, setGeneratedLatex] = useState<string>('')
  const [resumeViewMode, setResumeViewMode] = useState<'edit' | 'latex'>('edit')
  const [generating, setGenerating] = useState(false)
  const [saveModal, setSaveModal] = useState<'choose' | 'add' | null>(null)
  const [addResumeName, setAddResumeName] = useState('')
  const [saving, setSaving] = useState(false)
  const [apiKeyModal, setApiKeyModal] = useState<'add' | 'choose' | 'options' | null>(null)
  const [userApiKeys, setUserApiKeys] = useState<{ id: string; provider_name: string; label: string | null; is_active?: boolean }[]>([])
  const [selectedApiKeyId, setSelectedApiKeyId] = useState('')
  const [resumePageLimit, setResumePageLimit] = useState<1 | null>(1)
  const [resumeTemplate, setResumeTemplate] = useState('modern_minimal')
  const [usePrimaryResume, setUsePrimaryResume] = useState(false)
  const resumeEditorRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const initialEditorContentSet = useRef(false)
  useEffect(() => {
    if (step === 5 && generatedContent && resumeEditorRef.current && !initialEditorContentSet.current) {
      resumeEditorRef.current.innerHTML = generatedContent
      initialEditorContentSet.current = true
    }
    if (!generatedContent) initialEditorContentSet.current = false
  }, [step, generatedContent])

  useEffect(() => () => {
    if (skillBlurTimeoutRef.current) clearTimeout(skillBlurTimeoutRef.current)
  }, [])

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

  /** Convert form state to JSONResume schema (resumake.io / jsonresume.org compatible) */
  const buildJSONResume = useCallback(() => {
    const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ').trim() || undefined
    const profiles: { network: string; url: string }[] = []
    if (personal.linkedin?.trim()) profiles.push({ network: 'LinkedIn', url: personal.linkedin.trim() })
    const basics: Record<string, unknown> = {
      ...(fullName && { name: fullName }),
      ...(personal.email?.trim() && { email: personal.email.trim() }),
      ...(personal.phone?.trim() && { phone: personal.phone.trim() }),
      ...(personal.website?.trim() && { url: personal.website.trim() }),
      ...(personal.targetRole?.trim() && { label: personal.targetRole.trim() }),
      ...(summary?.trim() && { summary: summary.trim() }),
      ...(personal.location?.trim() && { location: { address: personal.location.trim() } }),
      ...(profiles.length > 0 && { profiles }),
    }
    const work = experience
      .filter((e) => e.title || e.company)
      .map((e) => ({
        name: e.company?.trim() || undefined,
        position: e.title?.trim() || undefined,
        startDate: e.start?.trim() || undefined,
        endDate: e.current ? undefined : (e.end?.trim() || undefined),
        summary: e.description?.trim() || undefined,
      }))
    const educationSchema = education
      .filter((e) => e.degree || e.school)
      .map((e) => ({
        institution: e.school?.trim() || undefined,
        studyType: e.degree?.trim() || undefined,
        startDate: e.start?.trim() || undefined,
        endDate: e.current ? undefined : (e.end?.trim() || undefined),
      }))
    const skillsSchema = skillTags.length
      ? [{ name: 'Skills', keywords: skillTags }]
      : undefined
    const certs = certifications
      ?.split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const certificatesSchema = certs?.length
      ? certs.map((name) => ({ name }))
      : undefined
    const languagesSchema = languages
      ?.split(/[,;]+/)
      .map((s) => {
        const match = s.trim().match(/^(.+?)\s*\((.+)\)\s*$/)
        return match ? { language: match[1].trim(), fluency: match[2].trim() } : { language: s.trim(), fluency: '' }
      })
      .filter((o) => o.language)
    return {
      $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      basics: Object.keys(basics).length ? basics : undefined,
      work: work.length ? work : undefined,
      education: educationSchema.length ? educationSchema : undefined,
      skills: skillsSchema,
      certificates: certificatesSchema,
      languages: languagesSchema?.length ? languagesSchema : undefined,
    }
  }, [personal, summary, education, experience, skillTags, languages, certifications])

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

  type GenerateOptions = { page_limit?: 1 | null; template?: string; primary_resume_html?: string | null }
  const doGenerate = useCallback(async (apiKeyId: string, options?: GenerateOptions) => {
    if (!user?.id) return
    setGenerating(true)
    setApiKeyModal(null)
    const pageLimit = options?.page_limit !== undefined ? options.page_limit : resumePageLimit
    const template = options?.template ?? resumeTemplate
    const primaryResumeHtml = options?.primary_resume_html !== undefined ? options.primary_resume_html : null
    try {
      const res = await fetch(apiUrl('/api/ai/generate-resume'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          api_key_id: apiKeyId,
          page_limit: pageLimit,
          template,
          primary_resume_html: primaryResumeHtml || undefined,
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
      let data: { content?: string; latex?: string; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Invalid response from server. Try again.')
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to generate')
      setGeneratedContent(data?.content ?? '')
      setGeneratedLatex(typeof data?.latex === 'string' ? data.latex : '')
      setResumeViewMode('edit')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not generate resume')
    } finally {
      setGenerating(false)
    }
  }, [user?.id, personal, summary, education, experience, skillTags, languages, certifications, resumePageLimit, resumeTemplate])

  const handleGenerate = async () => {
    if (!user?.id) return
    try {
      const keysRes = await fetch(apiUrl('/api/api-keys'), { headers: { 'x-user-id': user.id } })
      const keys: { id: string; provider_name: string; label: string | null; is_active?: boolean; is_default?: boolean }[] = keysRes.ok ? await keysRes.json() : []
      const activeKeys = Array.isArray(keys) ? keys.filter((k) => k.is_active !== false) : []
      if (activeKeys.length === 0) {
        setApiKeyModal('add')
        return
      }
      const defaultKey = activeKeys.find((k) => k.is_default)
      const preferredId = defaultKey ? defaultKey.id : activeKeys[0].id
      if (activeKeys.length === 1) {
        setSelectedApiKeyId(preferredId)
        setApiKeyModal('options')
        return
      }
      setUserApiKeys(activeKeys)
      setSelectedApiKeyId(preferredId)
      setApiKeyModal('choose')
    } catch {
      setApiKeyModal('add')
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
      const editorHtml = el ? el.innerHTML : null
      await fetch(apiUrl('/api/resumes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          name: name || 'Resume',
          file_url: uploadData.file_url,
          is_primary: asPrimary,
          html_content: editorHtml || undefined,
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

  /** Download current resume as PDF (resumake-style: no save to account) */
  const downloadResumePdf = async () => {
    const el = resumeEditorRef.current
    if (!el) {
      alert('No resume content to export. Generate a resume first.')
      return
    }
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      const img = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ format: 'a4', unit: 'mm' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(img, 'PNG', 0, 0, w, h)
      const name = [personal.firstName, personal.lastName].filter(Boolean).join('_') || 'resume'
      pdf.save(`${name.replace(/\s+/g, '_')}_resume.pdf`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'PDF download failed')
    }
  }

  /** Download form data as JSONResume (resumake.io / jsonresume.org compatible) */
  const downloadResumeJson = () => {
    const json = buildJSONResume()
    const str = JSON.stringify(json, null, 2)
    const blob = new Blob([str], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.json'
    a.click()
    URL.revokeObjectURL(url)
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
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Target role</span>
                <input
                  type="text"
                  value={personal.targetRole}
                  onChange={(e) => setPersonal((p) => ({ ...p, targetRole: e.target.value }))}
                  className="mt-0.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Software Engineer, Product Manager, Data Analyst"
                />
                <span className="text-xs text-slate-500 mt-0.5 block">The job title or role you're targeting (we'll tailor the resume for it).</span>
              </label>
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
                <span className="text-sm font-medium text-slate-700">Skills</span>
                <div className="mt-0.5 relative">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onFocus={() => {
                      if (skillBlurTimeoutRef.current) {
                        clearTimeout(skillBlurTimeoutRef.current)
                        skillBlurTimeoutRef.current = null
                      }
                      setShowDefaultSkills(true)
                    }}
                    onBlur={() => {
                      skillBlurTimeoutRef.current = setTimeout(() => setShowDefaultSkills(false), 200)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && skillInput.trim()) {
                        e.preventDefault()
                        addSkill(skillInput)
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type to filter suggestions (e.g. cad, matlab, react)..."
                  />
                  {showDefaultSkills && (() => {
                    const available = ALL_SUGGESTED_SKILLS.filter((s) => !skillTags.includes(s))
                    const q = skillInput.trim().toLowerCase()
                    const toShow = q
                      ? available.filter((s) => s.toLowerCase().includes(q)).slice(0, MAX_FILTERED_SKILLS)
                      : available.slice(0, INITIAL_SKILLS_COUNT)
                    return (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg p-2 max-h-48 overflow-auto">
                        <p className="text-xs text-slate-500 mb-2 px-1">
                          {q ? `Matches for "${skillInput.trim()}" — click to add` : 'Popular skills — type to filter more'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {toShow.map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => addSkill(skill)}
                              className="px-2.5 py-1 rounded-md text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                        {toShow.length === 0 && (
                          <p className="text-xs text-slate-400 py-1 px-1">No matching skills. Type your own and press Enter.</p>
                        )}
                      </div>
                    )
                  })()}
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
                      {personal.targetRole && <li><strong>Target role:</strong> {personal.targetRole}</li>}
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
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <button
                  type="button"
                  onClick={downloadResumeJson}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  <FileJson className="h-4 w-4" />
                  Export as JSON (JSONResume)
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 min-w-[200px] py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {generating ? 'Generating...' : 'Generate resume'}
                </button>
              </div>
            </div>
          )}
          {step === 5 && generatedContent && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Edit your resume below (AI-generated from your API). Download as PDF, TeX, or JSON (JSONResume compatible — use with <a href="https://resumake.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resumake.io</a> and other tools). Save to add it to your account.</p>
              <div className="flex gap-2 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setResumeViewMode('edit')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${resumeViewMode === 'edit' ? 'bg-slate-100 text-slate-900 border border-slate-200 border-b-0 -mb-px' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Editable view (HTML)
                </button>
                <button
                  type="button"
                  onClick={() => setResumeViewMode('latex')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${resumeViewMode === 'latex' ? 'bg-slate-100 text-slate-900 border border-slate-200 border-b-0 -mb-px' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  LaTeX source
                </button>
              </div>
              {resumeViewMode === 'edit' && (
                <div
                  ref={resumeEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setGeneratedContent(e.currentTarget.innerHTML)}
                  className="min-h-[400px] w-full rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-800 prose prose-slate max-w-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {resumeViewMode === 'latex' && (
                <div className="space-y-2">
                  <textarea
                    value={generatedLatex}
                    onChange={(e) => setGeneratedLatex(e.target.value)}
                    className="min-h-[400px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="LaTeX source from AI will appear here…"
                    spellCheck={false}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLatex)
                        alert('LaTeX copied to clipboard.')
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                    >
                      Copy LaTeX
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([generatedLatex], { type: 'application/x-tex' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'resume.tex'
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                    >
                      Download .tex
                    </button>
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Export (PDF, TeX, or JSON — <a href="https://jsonresume.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">JSONResume</a> compatible)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={downloadResumePdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100"
                  >
                    <FileDown className="h-4 w-4" />
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([generatedLatex], { type: 'application/x-tex' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'resume.tex'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100"
                  >
                    Download .tex
                  </button>
                  <button
                    type="button"
                    onClick={downloadResumeJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100"
                  >
                    <FileJson className="h-4 w-4" />
                    Download JSON
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => { setGeneratedContent(null); setGeneratedLatex(''); setResumeViewMode('edit') }}
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

        {apiKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !generating && setApiKeyModal(null)}>
            <div
              className={`bg-white rounded-2xl shadow-xl w-full p-6 ${apiKeyModal === 'options' ? 'max-w-[860px] max-h-[90vh] flex flex-col overflow-hidden' : 'max-w-md space-y-4'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {apiKeyModal === 'add' && (
                <>
                  <div className="flex items-center gap-2 text-amber-600">
                    <KeyRound className="h-5 w-5 flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-slate-900">Add an API key</h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    You need at least one API key to generate resumes. Add your key in API Connection, then come back to generate.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/app/api-connection')}
                      className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700"
                    >
                      Go to API Connection
                    </button>
                    <button type="button" onClick={() => setApiKeyModal(null)} className="w-full py-2 text-slate-500 text-sm hover:text-slate-700">
                      Cancel
                    </button>
                  </div>
                </>
              )}
              {apiKeyModal === 'choose' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900">Choose API to use</h3>
                  <p className="text-sm text-slate-600">You have multiple API keys. Select which one to use for this resume.</p>
                  <select
                    value={selectedApiKeyId}
                    onChange={(e) => setSelectedApiKeyId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {userApiKeys.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.provider_name}{k.label ? ` (${k.label})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setApiKeyModal('options')}
                      className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700"
                    >
                      Next: set options
                    </button>
                    <button type="button" onClick={() => setApiKeyModal(null)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </>
              )}
              {apiKeyModal === 'options' && (
                <>
                  <div className="overflow-y-auto flex-1 min-h-0 pr-1 -mr-1">
                    <h3 className="text-lg font-semibold text-slate-900">Resume options</h3>
                    <p className="text-sm text-slate-600">Choose length, template, and whether to match your primary resume.</p>
                    <div className="space-y-6 mt-4">
                      <div>
                        <span className="text-sm font-medium text-slate-700 block mb-2">Page length</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setResumePageLimit(1)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium ${resumePageLimit === 1 ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                          >
                            One page
                          </button>
                          <button
                            type="button"
                            onClick={() => setResumePageLimit(null)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium ${resumePageLimit === null ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                          >
                            More than one page
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700 block mb-3">Template</span>
                        <div
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                          style={{ maxWidth: '100%' }}
                        >
                          {RESUME_TEMPLATES.map((t) => {
                            const selected = resumeTemplate === t.id
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setResumeTemplate(t.id)}
                                className={`relative w-full text-left rounded-[12px] bg-white transition-all hover:border-[#93c5fd] hover:shadow-md ${selected ? 'border-[3px] border-[#2563EB] shadow-[0_0_0_3px_#dbeafe]' : 'border-[1.5px] border-[#e5e7eb]'}`}
                                style={{ width: 160, minHeight: 210 }}
                              >
                                {selected && (
                                  <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
                                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                                  </div>
                                )}
                                <div className="overflow-hidden rounded-t-xl flex items-start justify-start bg-slate-50 flex-shrink-0" style={{ height: PREVIEW_H, width: PREVIEW_W }}>
                                  <TemplatePreviewMini templateId={t.id} />
                                </div>
                                <div className="p-2.5 border-t border-slate-100">
                                  <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{t.tags}</div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700 block mb-2">Use primary resume as reference?</span>
                        <p className="text-xs text-slate-500 mb-2">Match the design and layout of your saved primary resume (if you have one).</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setUsePrimaryResume(true)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium ${usePrimaryResume ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setUsePrimaryResume(false)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium ${!usePrimaryResume ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 mt-4 border-t border-slate-200 flex-shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        // Required for generation: resume data (in doGenerate), page_limit, template, and primary resume when user opts in
                        let primaryHtml: string | null = null
                        if (usePrimaryResume && user?.id) {
                          try {
                            const r = await fetch(apiUrl('/api/resumes'), { headers: { 'x-user-id': user.id } })
                            const list = r.ok ? await r.json() : []
                            const primary = Array.isArray(list) ? list.find((x: { is_primary?: boolean }) => x.is_primary) : null
                            if (primary?.html_content) primaryHtml = primary.html_content
                          } catch {
                            primaryHtml = null
                          }
                        }
                        await doGenerate(selectedApiKeyId, {
                          page_limit: resumePageLimit,
                          template: resumeTemplate,
                          primary_resume_html: primaryHtml,
                        })
                      }}
                      disabled={generating}
                      className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                      {generating ? 'Generating...' : 'Generate resume'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setApiKeyModal(userApiKeys.length > 1 ? 'choose' : null)}
                      disabled={generating}
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
