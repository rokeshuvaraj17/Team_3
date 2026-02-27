import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Briefcase, FileCheck, Loader2, Save, KeyRound, Check, FileDown } from 'lucide-react'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'

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

const JOB_STEPS = [
  { id: 1, title: 'Template', icon: FileCheck },
  { id: 2, title: 'Keywords', icon: Briefcase },
  { id: 3, title: 'Options', icon: FileCheck },
  { id: 4, title: 'Generate', icon: FileCheck },
]

export function JobBasedResumePage() {
  const [searchParams] = useSearchParams()
  const fromExtension = searchParams.get('from') === 'extension'
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [step, setStep] = useState(1)
  const [template, setTemplate] = useState('modern_minimal')
  const [apiKeys, setApiKeys] = useState<{ id: string; provider_name: string; label: string | null; is_active?: boolean }[]>([])
  const [selectedApiKeyId, setSelectedApiKeyId] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())
  const [pageLimit, setPageLimit] = useState<1 | null>(1)
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatedLatex, setGeneratedLatex] = useState('')
  const [resumeViewMode, setResumeViewMode] = useState<'edit' | 'latex'>('edit')
  const [saveModal, setSaveModal] = useState<'choose' | 'add' | null>(null)
  const [addResumeName, setAddResumeName] = useState('')
  const [saving, setSaving] = useState(false)
  const [apiKeyModal, setApiKeyModal] = useState<'add' | 'choose' | null>(null)
  const resumeEditorRef = useRef<HTMLDivElement>(null)
  const initialEditorContentSet = useRef(false)
  const navigate = useNavigate()
  const user = getStoredUser()

  useEffect(() => {
    if (step === 4 && generatedContent && resumeEditorRef.current && !initialEditorContentSet.current) {
      resumeEditorRef.current.innerHTML = generatedContent
      initialEditorContentSet.current = true
    }
    if (!generatedContent) initialEditorContentSet.current = false
  }, [step, generatedContent])

  useEffect(() => {
    if (!user?.id) return
    if (fromExtension) {
      fetch(apiUrl('/api/extension/job-resume-context'), { headers: { 'x-user-id': user.id } })
        .then((r) => r.json())
        .then((data: { resume?: string; job_description?: string; company_name?: string; job_title?: string }) => {
          if (data?.resume) setResumeText(data.resume)
          if (data?.job_description) setJobDescription(data.job_description)
          if (data?.company_name) setCompanyName(data.company_name)
          if (data?.job_title) setJobTitle(data.job_title)
        })
        .catch(() => {})
    }
  }, [user?.id, fromExtension])

  useEffect(() => {
    if (!user?.id) return
    fetch(apiUrl('/api/api-keys'), { headers: { 'x-user-id': user.id } })
      .then((r) => (r.ok ? r.json() : []))
      .then((keys: { id: string; provider_name: string; label: string | null; is_active?: boolean }[]) => {
        const active = Array.isArray(keys) ? keys.filter((k) => k.is_active !== false) : []
        setApiKeys(active)
        if (active.length && !selectedApiKeyId) setSelectedApiKeyId(active[0].id)
      })
      .catch(() => {})
  }, [user?.id])

  const loadSuggestions = useCallback(async () => {
    if (!user?.id || !jobDescription.trim() || !selectedApiKeyId) return
    setSuggestionsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/ai/skill-suggestions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ job_description: jobDescription.trim(), api_key_id: selectedApiKeyId }),
      })
      const data = await res.json().catch(() => ({}))
      const list = Array.isArray(data?.suggestions) ? data.suggestions.filter((s: unknown) => typeof s === 'string') : []
      setSuggestions(list)
    } catch {
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }, [user?.id, jobDescription, selectedApiKeyId])

  const toggleKeyword = (k: string) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const doGenerate = useCallback(async () => {
    if (!user?.id || !resumeText.trim() || !jobDescription.trim()) return
    setGenerating(true)
    setApiKeyModal(null)
    try {
      const res = await fetch(apiUrl('/api/ai/generate-resume'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          api_key_id: selectedApiKeyId,
          resume_text: resumeText.trim(),
          job_description: jobDescription.trim(),
          skills: Array.from(selectedKeywords),
          template,
          page_limit: pageLimit,
        }),
      })
      const text = await res.text()
      if (text.trimStart().startsWith('<')) throw new Error('Could not reach the server.')
      let data: { content?: string; latex?: string; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Invalid response from server.')
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
  }, [user?.id, resumeText, jobDescription, selectedKeywords, template, pageLimit, selectedApiKeyId])

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
      const editorHtml = el.innerHTML
      await fetch(apiUrl('/api/resumes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          name: name || 'Resume',
          file_url: uploadData.file_url,
          is_primary: asPrimary,
          html_content: editorHtml,
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

  const downloadResumePdf = async () => {
    const el = resumeEditorRef.current
    if (!el) {
      alert('No resume content to export.')
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
      pdf.save('resume.pdf')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'PDF download failed')
    }
  }

  const hasContext = resumeText.trim().length > 0 && jobDescription.trim().length > 0
  const canGenerate = hasContext && selectedApiKeyId && apiKeys.length > 0

  if (!user?.id) {
    return (
      <div className="w-full max-w-none py-8 px-4">
        <Link to="/app/generate-resume" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Generate Resume
        </Link>
        <p className="text-slate-600">Please log in to use the job-based resume flow.</p>
      </div>
    )
  }

  if (!hasContext && !generatedContent) {
    return (
      <div className="w-full max-w-none py-8 px-4">
        <Link to="/app/generate-resume" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Generate Resume
        </Link>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Job-based resume</h1>
          <p className="text-slate-600 mt-1.5">
            {fromExtension
              ? 'Loading resume and job description…'
              : 'Select a job from your dashboard or use the extension “Update resume for this job” to open this page with your resume and job description.'}
          </p>
          <Link to="/app" className="inline-flex items-center gap-2 mt-5 px-5 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700">
            Go to job search
          </Link>
        </div>
      </div>
    )
  }

  if (generatedContent) {
    return (
      <div className="w-full max-w-none py-4 px-4 pb-8">
        <Link to="/app/generate-resume/job-based" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to job-based flow
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Your tailored resume</h1>
        <p className="text-sm text-slate-600 mb-4">Edit below, then download or save to your account.</p>
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
              className="min-h-[400px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="LaTeX source"
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
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 mt-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Export</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadResumePdf} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100">
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
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            type="button"
            onClick={() => {
              setGeneratedContent(null)
              setGeneratedLatex('')
              setResumeViewMode('edit')
            }}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Back to flow
          </button>
          <button type="button" onClick={() => setSaveModal('choose')} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
            <Save className="h-4 w-4" />
            Save resume
          </button>
        </div>

        {saveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saving && setSaveModal(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              {saveModal === 'choose' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900">How do you want to save?</h3>
                  <p className="text-sm text-slate-600">Replace your primary resume or add this as an additional resume.</p>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => handleSaveResume(true, 'Resume')} disabled={saving} className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-70">
                      {saving ? 'Saving...' : 'Replace primary resume'}
                    </button>
                    <button type="button" onClick={() => setSaveModal('add')} disabled={saving} className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50">
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
                    <button type="button" onClick={() => handleSaveResume(false, addResumeName || 'Resume')} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-70">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => { setSaveModal('choose'); setAddResumeName('') }} disabled={saving} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-slate-50">
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-none py-4 px-4 pb-8">
      <Link to="/app/generate-resume" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Generate Resume
      </Link>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Job-based resume</h1>
        <p className="text-slate-600 mt-0.5">Step {step} of 4</p>
        <div className="flex gap-1 mt-3">
          {JOB_STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s.id ? 'bg-blue-500' : 'bg-slate-200'}`}
              aria-label={`Step ${s.id}`}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              {(() => {
                const Icon = JOB_STEPS[step - 1].icon
                return <Icon className="h-4 w-4" />
              })()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{JOB_STEPS[step - 1].title}</h2>
              <p className="text-xs text-slate-500">
                {step === 1 && 'Choose a resume template'}
                {step === 2 && 'Select keywords to add (from job description)'}
                {step === 3 && 'One page or more'}
                {step === 4 && 'Generate tailored resume'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              {companyName.trim() || jobTitle.trim() ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Job from extension</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {jobTitle.trim() || 'Job title unknown'}
                      {companyName.trim() ? ` · ${companyName.trim()}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="self-start mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white"
                    onClick={() => {
                      // allow user to clear if they don't want it
                      setCompanyName('')
                      setJobTitle('')
                    }}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
              <p className="text-sm text-slate-600">Select a template for your tailored resume.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ maxWidth: '100%' }}>
                {RESUME_TEMPLATES.map((t) => {
                  const selected = template === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplate(t.id)}
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
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Get keyword suggestions from the job description, then select which to add to your resume.</p>
              {apiKeys.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Add an API key</p>
                    <p className="text-xs text-slate-600">You need an API key to get keyword suggestions. Add one in API Connection.</p>
                    <button type="button" onClick={() => navigate('/app/api-connection')} className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                      Go to API Connection
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">API key for suggestions</label>
                    <select
                      value={selectedApiKeyId}
                      onChange={(e) => setSelectedApiKeyId(e.target.value)}
                      className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {apiKeys.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.provider_name}{k.label ? ` (${k.label})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={loadSuggestions}
                    disabled={suggestionsLoading || !jobDescription.trim()}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
                  >
                    {suggestionsLoading ? 'Loading…' : 'Get keyword suggestions'}
                  </button>
                  {suggestions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Select keywords to add to your resume</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                          <label key={s} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                            <input type="checkbox" checked={selectedKeywords.has(s)} onChange={() => toggleKeyword(s)} className="rounded border-slate-300 text-blue-600" />
                            <span className="text-sm text-slate-800">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Choose one page or allow multiple pages.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPageLimit(1)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${pageLimit === 1 ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  One page
                </button>
                <button
                  type="button"
                  onClick={() => setPageLimit(null)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${pageLimit === null ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  More than one page
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Generate a tailored resume from your content and the job description. We’ll use the template and keywords you selected.</p>
              {apiKeys.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Add an API key in API Connection to generate.</p>
                  <button type="button" onClick={() => navigate('/app/api-connection')} className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                    Go to API Connection
                  </button>
                </div>
              ) : (
                <>
                  {apiKeys.length > 1 && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">API key for generation</label>
                      <select
                        value={selectedApiKeyId}
                        onChange={(e) => setSelectedApiKeyId(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        {apiKeys.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.provider_name}{k.label ? ` (${k.label})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={doGenerate}
                    disabled={generating || !canGenerate}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {generating ? 'Generating…' : 'Generate resume'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
            disabled={step === 1}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-white disabled:opacity-50 disabled:pointer-events-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          {step < 4 && (
            <button type="button" onClick={() => setStep((s) => Math.min(s + 1, 4))} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {apiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setApiKeyModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            {apiKeyModal === 'add' && (
              <>
                <div className="flex items-center gap-2 text-amber-600">
                  <KeyRound className="h-5 w-5 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-slate-900">Add an API key</h3>
                </div>
                <p className="text-sm text-slate-600">Add your key in API Connection, then come back.</p>
                <button type="button" onClick={() => navigate('/app/api-connection')} className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700">
                  Go to API Connection
                </button>
                <button type="button" onClick={() => setApiKeyModal(null)} className="w-full py-2 text-slate-500 text-sm hover:text-slate-700">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
