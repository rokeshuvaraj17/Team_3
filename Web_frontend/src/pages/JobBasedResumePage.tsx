import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Briefcase, FileCheck, Loader2, Save, KeyRound, Check, FileDown, PenLine } from 'lucide-react'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import { RichTextToolbar } from '@/components/RichTextToolbar'

const RESUME_TEMPLATES = [
  { id: 'modern_minimal', name: 'Modern Minimal', tags: 'Clean · Whitespace · ATS-Friendly' },
  { id: 'executive_classic', name: 'Executive Classic', tags: 'Professional · Corporate · Senior' },
  { id: 'technical_developer', name: 'Technical / Developer', tags: 'Dev · Engineer · Tech' },
  { id: 'bold_creative', name: 'Bold Creative', tags: 'Design · Marketing · Creative' },
  { id: 'academic_research', name: 'Academic / Research', tags: 'Academic · Research · PhD' },
  { id: 'compact_pro', name: 'Compact Pro', tags: 'Experienced · Dense · 1-Page' },
] as const

// Template preview images for job-based step 2 (1–6 map to RESUME_TEMPLATES; 7–10 repeat first four)
const JOB_TEMPLATE_IMAGES = [
  { imageNum: 1, id: 'modern_minimal', name: 'Template 1' },
  { imageNum: 2, id: 'executive_classic', name: 'Template 2' },
  { imageNum: 3, id: 'technical_developer', name: 'Template 3' },
  { imageNum: 4, id: 'bold_creative', name: 'Template 4' },
  { imageNum: 5, id: 'academic_research', name: 'Template 5' },
  { imageNum: 6, id: 'compact_pro', name: 'Template 6' },
  { imageNum: 7, id: 'modern_minimal', name: 'Template 7' },
  { imageNum: 8, id: 'executive_classic', name: 'Template 8' },
  { imageNum: 9, id: 'technical_developer', name: 'Template 9' },
  { imageNum: 10, id: 'bold_creative', name: 'Template 10' },
]

const JOB_STEPS = [
  { id: 1, title: 'Resume & Job', icon: PenLine },
  { id: 2, title: 'Template', icon: FileCheck },
  { id: 3, title: 'Keywords', icon: Briefcase },
  { id: 4, title: 'Options', icon: FileCheck },
  { id: 5, title: 'Generate', icon: FileCheck },
]

type ResumeItem = { id: string; name: string; is_primary?: boolean; uploaded_at?: string; html_content?: string | null }

export function JobBasedResumePage() {
  const [searchParams] = useSearchParams()
  const fromExtension = searchParams.get('from') === 'extension'
  const extensionUid = searchParams.get('uid') ?? ''
  const extensionApiBase = searchParams.get('api') ?? ''
  const jobContextFetchedRef = useRef(false)
  const contextFetchCompletedRef = useRef(false)
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [resumes, setResumes] = useState<ResumeItem[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [selectedTemplateImageNum, setSelectedTemplateImageNum] = useState(1)
  const [apiKeys, setApiKeys] = useState<{ id: string; provider_name: string; label: string | null; is_active?: boolean }[]>([])
  const [selectedApiKeyId, setSelectedApiKeyId] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())
  const [customKeywordInput, setCustomKeywordInput] = useState('')
  const [pageLimit, setPageLimit] = useState<1 | null>(1)
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatedLatex, setGeneratedLatex] = useState('')
  const [resumeViewMode, setResumeViewMode] = useState<'edit' | 'latex'>('edit')
  const [contentVersion, setContentVersion] = useState(0)
  const [saveModal, setSaveModal] = useState<'choose' | 'add' | null>(null)
  const [addResumeName, setAddResumeName] = useState('')
  const [saving, setSaving] = useState(false)
  const [apiKeyModal, setApiKeyModal] = useState<'add' | 'choose' | null>(null)
  const resumeEditorRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const user = getStoredUser()

  // Sync state into the editor when showing editable view (initial load and when switching back from LaTeX).
  // contentVersion increments when we first get generated content so this runs on initial display; [resumeViewMode] handles tab switch.
  useLayoutEffect(() => {
    if (resumeViewMode === 'edit' && resumeEditorRef.current && generatedContent !== undefined) {
      resumeEditorRef.current.innerHTML = generatedContent
    }
  }, [resumeViewMode, contentVersion])

  useEffect(() => {
    if (!fromExtension || jobContextFetchedRef.current) return
    const userIdForContext = user?.id || extensionUid
    if (!userIdForContext) return
    jobContextFetchedRef.current = true
    const contextUrl = extensionApiBase
      ? `${extensionApiBase.replace(/\/$/, '')}/api/extension/job-resume-context`
      : apiUrl('/api/extension/job-resume-context')
    fetch(contextUrl, { headers: { 'x-user-id': userIdForContext } })
      .then((r) => r.json())
      .then((data: { resume?: string; job_description?: string; company_name?: string; job_title?: string }) => {
        if (data?.resume) setResumeText(data.resume)
        if (data?.job_description) setJobDescription(data.job_description ?? '')
        if (data?.company_name) setCompanyName(data.company_name ?? '')
        if (data?.job_title) setJobTitle(data.job_title ?? '')
      })
      .catch(() => {})
      .finally(() => { contextFetchCompletedRef.current = true })
  }, [fromExtension, user?.id, extensionUid, extensionApiBase])

  useEffect(() => {
    if (!user?.id) return
    fetch(apiUrl('/api/resumes'), { headers: { 'x-user-id': user.id } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ResumeItem[]) => {
        const sorted = Array.isArray(list)
          ? [...list].sort((a, b) => {
              const ta = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0
              const tb = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0
              return tb - ta
            })
          : []
        setResumes(sorted)
      })
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !selectedResumeId) return
    const r = resumes.find((x) => x.id === selectedResumeId)
    if (!r) return
    const html = r?.html_content
    if (html && typeof html === 'string' && html.trim().length > 0) {
      const div = document.createElement('div')
      div.innerHTML = html
      const text = (div.textContent || div.innerText || '').trim()
      if (text) {
        setResumeText(text)
        return
      }
    }
    fetch(apiUrl(`/api/resumes/${selectedResumeId}/text`), { headers: { 'x-user-id': user.id } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { text?: string } | null) => {
        const t = data && typeof data.text === 'string' ? data.text.trim() : ''
        if (t) setResumeText(t)
      })
      .catch(() => {})
  }, [user?.id, selectedResumeId, resumes])

  useEffect(() => {
    if (!user?.id) return
    fetch(apiUrl('/api/api-keys'), { headers: { 'x-user-id': user.id } })
      .then((r) => (r.ok ? r.json() : []))
      .then((keys: { id: string; provider_name: string; label: string | null; is_active?: boolean; is_default?: boolean }[]) => {
        const active = Array.isArray(keys) ? keys.filter((k) => k.is_active !== false) : []
        setApiKeys(active)
        if (active.length && !selectedApiKeyId) {
          const defaultKey = active.find((k) => k.is_default)
          setSelectedApiKeyId(defaultKey ? defaultKey.id : active[0].id)
        }
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
          template: JOB_TEMPLATE_IMAGES.find((x) => x.imageNum === selectedTemplateImageNum)?.id ?? 'modern_minimal',
          page_limit: pageLimit,
        }),
      })
      const text = await res.text()
      if (text.trimStart().startsWith('<')) throw new Error('Could not reach the server.')
      let data: { content?: string; latex?: string; error?: string } | null = null
      try {
        data = JSON.parse(text)
      } catch {
        const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        const toParse = codeBlock ? codeBlock[1].trim() : text
        const jsonMatch = toParse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            data = JSON.parse(jsonMatch[0])
          } catch {
            // ignore
          }
        }
      }
      if (!data || typeof data !== 'object') throw new Error('Server returned an invalid response. Try again or check your API key.')
      if (!res.ok) throw new Error(data?.error || 'Failed to generate')
      setGeneratedContent(data?.content ?? '')
      setGeneratedLatex(typeof data?.latex === 'string' ? data.latex : '')
      setResumeViewMode('edit')
      setContentVersion((v) => v + 1)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not generate resume')
    } finally {
      setGenerating(false)
    }
  }, [user?.id, resumeText, jobDescription, selectedKeywords, selectedTemplateImageNum, pageLimit, selectedApiKeyId])

  /** Strip oklch() and other unsupported color functions from cloned doc so html2canvas can parse (it doesn't support oklch). */
  const stripUnsupportedColorsForCanvas = (originalEl: HTMLElement, clonedEl: HTMLElement) => {
    const fallback = 'rgb(128,128,128)'
    const replaceUnsupportedColors = (css: string) => css.replace(/oklch\s*\([^)]*\)/g, fallback).replace(/color-mix\s*\([^)]*\)/g, fallback)
    const doc = clonedEl.ownerDocument
    doc.querySelectorAll('style').forEach((style) => {
      if (style.textContent) style.textContent = replaceUnsupportedColors(style.textContent)
    })
    doc.querySelectorAll('[style]').forEach((el) => {
      const elHtml = el as HTMLElement
      if (elHtml.style?.cssText) elHtml.style.cssText = replaceUnsupportedColors(elHtml.style.cssText)
    })
    const styleProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor']
    const walk = (orig: Element, clone: Element) => {
      if (orig instanceof HTMLElement && clone instanceof HTMLElement) {
        const cs = getComputedStyle(orig)
        styleProps.forEach((prop) => {
          const k = prop.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
          const v = cs.getPropertyValue(k)
          if (v && !v.includes('oklch') && !v.includes('color-mix')) (clone.style as unknown as Record<string, string>)[prop] = v
        })
      }
      const origChildren = Array.from(orig.children)
      const cloneChildren = Array.from(clone.children)
      origChildren.forEach((origChild, i) => {
        const cloneChild = cloneChildren[i]
        if (cloneChild) walk(origChild, cloneChild)
      })
    }
    walk(originalEl, clonedEl)
  }

  const handleSaveResume = async (asPrimary: boolean, name: string) => {
    if (!user?.id) return
    setSaving(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const el = resumeEditorRef.current
      if (!el) throw new Error('Editor not found')
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        onclone: (_doc, clonedElement) => stripUnsupportedColorsForCanvas(el, clonedElement as HTMLElement),
      })
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
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        onclone: (_doc, clonedElement) => stripUnsupportedColorsForCanvas(el, clonedElement as HTMLElement),
      })
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

  if (fromExtension && !contextFetchCompletedRef.current && !generatedContent) {
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
          <p className="text-slate-600 mt-1.5">Loading resume and job description…</p>
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
          <>
            <RichTextToolbar editorRef={resumeEditorRef} />
            <div
              key="resume-editable"
              ref={resumeEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => resumeEditorRef.current && setGeneratedContent(resumeEditorRef.current.innerHTML)}
              className="min-h-[400px] w-full rounded-b-lg rounded-t-none border border-t-0 border-slate-200 bg-white p-6 text-sm text-slate-800 prose prose-slate max-w-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </>
        )}
        {resumeViewMode === 'latex' && (
          <div className="space-y-2 mt-2">
            <textarea
              value={generatedLatex}
              onChange={(e) => setGeneratedLatex(e.target.value)}
              className="min-h-[400px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={generatedLatex ? undefined : "LaTeX source will appear here. If the generated resume didn't include LaTeX, only the editable HTML view may have content."}
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
              setContentVersion(0)
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
        <p className="text-slate-600 mt-0.5">Step {step} of 5</p>
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
                {step === 1 && 'Resume and job description'}
                {step === 2 && 'Choose a resume template'}
                {step === 3 && 'Select keywords to add (from job description)'}
                {step === 4 && 'One page or more'}
                {step === 5 && 'Generate tailored resume'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Select a resume from your account or paste below. From the extension, resume and job description are prefilled.</p>
              {resumes.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Select a resume</label>
                  <select
                    value={selectedResumeId ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setSelectedResumeId(v || null)
                    }}
                    className="w-full max-w-md px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                    aria-label="Select a resume"
                  >
                    <option value="">— Select a resume or paste below —</option>
                    {resumes.map((r) => {
                      const label = r.name?.trim() || (r.uploaded_at ? `Resume · ${new Date(r.uploaded_at).toLocaleDateString()}` : `Resume ${r.id.slice(0, 8)}`)
                      return (
                        <option key={r.id} value={r.id}>{label}{r.is_primary ? ' (Primary)' : ''}</option>
                      )
                    })}
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Resume text *</label>
                <textarea
                  value={resumeText}
                  onChange={(e) => {
                    setResumeText(e.target.value)
                    if (e.target.value.trim()) setSelectedResumeId(null)
                  }}
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste your resume content or select a resume above..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Job description *</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste job description..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Company name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Acme Inc."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Job title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {companyName.trim() || jobTitle.trim() ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Job</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {jobTitle.trim() || 'Job title'}
                    {companyName.trim() ? ` · ${companyName.trim()}` : ''}
                  </p>
                </div>
              ) : null}
              <p className="text-sm text-slate-600">Select a template for your tailored resume.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {JOB_TEMPLATE_IMAGES.map((t) => {
                  const selected = selectedTemplateImageNum === t.imageNum
                  const src = `/resumake-templates/${t.imageNum}.png`
                  return (
                    <button
                      key={`${t.imageNum}-${t.id}`}
                      type="button"
                      onClick={() => setSelectedTemplateImageNum(t.imageNum)}
                      className={`relative flex flex-col items-center rounded-lg border-2 overflow-hidden bg-slate-50 transition-all hover:border-blue-400 hover:shadow-md ${selected ? 'border-blue-600 shadow-[0_0_0_3px_#dbeafe]' : 'border-slate-200'}`}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                      <div className="w-full flex items-center justify-center bg-slate-100 min-h-[120px] max-h-[160px] p-2">
                        <img
                          src={src}
                          alt={`${t.name} preview`}
                          className="max-w-full max-h-[152px] w-auto h-auto object-contain"
                        />
                      </div>
                      <span className="w-full py-2 text-center text-sm font-medium text-slate-700 bg-white border-t border-slate-200">
                        {t.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Get keyword suggestions from the job description, then select which to add to your resume.</p>
              {apiKeys.length === 0 ? (
                <>
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
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Or add custom keywords (no API needed)</p>
                    <div className="flex gap-2 flex-wrap items-center">
                      <input
                        type="text"
                        value={customKeywordInput}
                        onChange={(e) => setCustomKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const v = customKeywordInput.trim()
                            if (v) {
                              setSelectedKeywords((prev) => new Set(prev).add(v))
                              setCustomKeywordInput('')
                            }
                          }
                        }}
                        placeholder="e.g. Python, Agile, AWS"
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-48"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const v = customKeywordInput.trim()
                          if (v) {
                            setSelectedKeywords((prev) => new Set(prev).add(v))
                            setCustomKeywordInput('')
                          }
                        }}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
                      >
                        Add
                      </button>
                    </div>
                    {selectedKeywords.size > 0 && (
                      <p className="text-xs text-slate-500 mt-2">Selected: {Array.from(selectedKeywords).join(', ')}</p>
                    )}
                  </div>
                </>
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
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Add custom keyword</p>
                    <div className="flex gap-2 flex-wrap items-center">
                      <input
                        type="text"
                        value={customKeywordInput}
                        onChange={(e) => setCustomKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const v = customKeywordInput.trim()
                            if (v) {
                              setSelectedKeywords((prev) => new Set(prev).add(v))
                              setCustomKeywordInput('')
                            }
                          }
                        }}
                        placeholder="e.g. Python, Agile, AWS"
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-48"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const v = customKeywordInput.trim()
                          if (v) {
                            setSelectedKeywords((prev) => new Set(prev).add(v))
                            setCustomKeywordInput('')
                          }
                        }}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
                      >
                        Add
                      </button>
                    </div>
                    {selectedKeywords.size > 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        Selected: {Array.from(selectedKeywords).join(', ')} — these will be included in the resume.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
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

          {step === 5 && (
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
          {step < 5 && (
            <button type="button" onClick={() => setStep((s) => Math.min(s + 1, 5))} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
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
