import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, PenLine, FileCheck, Loader2, KeyRound, Check } from 'lucide-react'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'

const COVER_LETTER_TEMPLATES = [
  { id: 'top_company', name: 'Top company interview', tags: 'Interview-ready · Polished · One page' },
  { id: 'professional', name: 'Professional', tags: 'Formal · Business · Standard' },
  { id: 'enthusiastic', name: 'Enthusiastic', tags: 'Energetic · Passionate · Warm' },
  { id: 'confident', name: 'Confident', tags: 'Assertive · Results-driven · Strong' },
  { id: 'concise', name: 'Concise', tags: 'Short · Direct · Scannable' },
] as const

const COVER_STEPS = [
  { id: 1, title: 'Resume & Job', icon: PenLine },
  { id: 2, title: 'Template', icon: FileCheck },
  { id: 3, title: 'Keywords', icon: FileCheck },
  { id: 4, title: 'Generate', icon: PenLine },
]

type ResumeItem = { id: string; name: string; is_primary?: boolean; uploaded_at?: string; html_content?: string | null }

export function GenerateCoverLetterPage() {
  const [searchParams] = useSearchParams()
  const fromExtension = searchParams.get('from') === 'extension'
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [step, setStep] = useState(1)
  const [resumes, setResumes] = useState<ResumeItem[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [template, setTemplate] = useState('top_company')
  const [apiKeys, setApiKeys] = useState<{ id: string; provider_name: string; label: string | null }[]>([])
  const [selectedApiKeyId, setSelectedApiKeyId] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [generatedLatex, setGeneratedLatex] = useState('')
  const [viewMode, setViewMode] = useState<'text' | 'latex'>('text')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const user = getStoredUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) return
    if (fromExtension) {
      fetch(apiUrl('/api/extension/cover-letter-context'), { headers: { 'x-user-id': user.id } })
        .then((r) => r.json())
        .then((data: { resume?: string; job_description?: string; company_name?: string; job_title?: string }) => {
          if (data?.resume) setResumeText(data.resume)
          if (data?.job_description) setJobDescription(data.job_description)
          if (data?.company_name) setCompanyName(data.company_name)
          if (data?.job_title) setJobTitle(data.job_title)
          // #region agent log
          fetch('http://127.0.0.1:7432/ingest/ef57fcee-7603-40e6-8f59-4c9f287b5350', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': '652fa8',
            },
            body: JSON.stringify({
              sessionId: '652fa8',
              runId: 'cover-letter-flow',
              hypothesisId: 'C',
              location: 'GenerateCoverLetterPage.tsx:extensionContext',
              message: 'Loaded extension context into state',
              data: {
                hasResume: !!data?.resume,
                hasJobDescription: !!data?.job_description,
                company_name: data?.company_name || '',
                job_title: data?.job_title || '',
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {})
          // #endregion
        })
        .catch(() => {})
    }
  }, [user?.id, fromExtension])

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
        if (sorted.length && !selectedResumeId) setSelectedResumeId(sorted[0].id)
      })
      .catch(() => {})
  }, [user?.id])

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

  const getResumeTextForApi = useCallback(async (): Promise<string> => {
    if (resumeText.trim()) return resumeText.trim()
    if (!user?.id || !selectedResumeId) return ''
    const r = resumes.find((x) => x.id === selectedResumeId)
    const html = r?.html_content
    if (html && typeof html === 'string') {
      const div = document.createElement('div')
      div.innerHTML = html
      return (div.textContent || div.innerText || '').trim()
    }
    const res = await fetch(apiUrl('/api/resumes'), { headers: { 'x-user-id': user.id } })
    const list = res.ok ? await res.json() : []
    const item = Array.isArray(list) ? list.find((x: ResumeItem) => x.id === selectedResumeId) : null
    const h = item?.html_content
    if (h && typeof h === 'string') {
      const d = document.createElement('div')
      d.innerHTML = h
      return (d.textContent || d.innerText || '').trim()
    }
    return ''
  }, [user?.id, resumeText, selectedResumeId, resumes])

  const doGenerate = useCallback(async () => {
    if (!user?.id || !jobDescription.trim()) return
    setGenerating(true)
    try {
      const resume = await getResumeTextForApi()
      if (!resume) {
        alert('Select a resume or paste resume text.')
        return
      }
      const res = await fetch(apiUrl('/api/ai/generate-cover-letter'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          api_key_id: selectedApiKeyId,
          resume,
          job_description: jobDescription.trim(),
          company_name: companyName.trim() || undefined,
          job_title: jobTitle.trim() || undefined,
          tone: template,
          template,
          keywords: Array.from(selectedKeywords),
          want_latex: true,
        }),
      })
      const text = await res.text()
      if (text.trimStart().startsWith('<')) throw new Error('Could not reach the server.')
      let data: { text?: string; latex?: string; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Invalid response.')
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to generate')
      setGeneratedText(data?.text ?? '')
      setGeneratedLatex(typeof data?.latex === 'string' ? data.latex : '')
      setViewMode('text')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not generate cover letter')
    } finally {
      setGenerating(false)
    }
  }, [user?.id, jobDescription, companyName, jobTitle, selectedApiKeyId, selectedKeywords, template, getResumeTextForApi])

  const hasContext = resumeText.trim().length > 0 || (selectedResumeId && resumes.length > 0)
  const canGenerate = hasContext && jobDescription.trim().length > 0 && selectedApiKeyId && apiKeys.length > 0

  if (!user?.id) {
    return (
      <div className="w-full max-w-none py-8 px-4">
        <Link to="/app" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <p className="text-slate-600">Please log in to generate cover letters.</p>
      </div>
    )
  }

  const defaultSaveName = [companyName.trim(), jobTitle.trim()].filter(Boolean).length > 0
    ? ['Cover letter', companyName.trim(), jobTitle.trim()].filter(Boolean).join(' - ')
    : 'Cover letter'

  const openSaveModal = () => {
    setSaveName(defaultSaveName)
    setSaveModalOpen(true)
  }

  const saveToCoverLetters = async () => {
    if (!user?.id || !saveName.trim()) return
    setSaving(true)
    try {
      const content = viewMode === 'text' ? generatedText : generatedLatex
      const blob = new Blob([content], { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', blob, 'cover-letter.txt')
      formData.append('title', saveName.trim())
      const res = await fetch(apiUrl('/api/cover-letters/upload'), {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Save failed')
      setSaveModalOpen(false)
      setSaveName('')
      alert('Saved to Cover letters. You can find it in Documents.')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (generatedText || generatedLatex) {
    return (
      <div className="w-full max-w-none py-4 px-4 pb-8">
        <Link to="/app/generate-cover-letter" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to flow
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Your cover letter</h1>
        {companyName.trim() && (
          <p className="text-sm text-slate-600 mb-1">For: {companyName.trim()}{jobTitle.trim() ? ` · ${jobTitle.trim()}` : ''}</p>
        )}
        <p className="text-sm text-slate-600 mb-4">Edit below, then copy, download, or save to Cover letters.</p>
        <div className="flex gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('text')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${viewMode === 'text' ? 'bg-slate-100 text-slate-900 border border-slate-200 border-b-0 -mb-px' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => setViewMode('latex')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${viewMode === 'latex' ? 'bg-slate-100 text-slate-900 border border-slate-200 border-b-0 -mb-px' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            LaTeX
          </button>
        </div>
        {viewMode === 'text' && (
          <textarea
            ref={textAreaRef}
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            className="min-h-[360px] w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
            spellCheck={true}
          />
        )}
        {viewMode === 'latex' && (
          <textarea
            value={generatedLatex}
            onChange={(e) => setGeneratedLatex(e.target.value)}
            className="min-h-[360px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
            spellCheck={false}
          />
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={openSaveModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
          >
            Save to Cover letters
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(viewMode === 'text' ? generatedText : generatedLatex).then(() => alert('Copied.'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([generatedLatex], { type: 'application/x-tex' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'cover-letter.tex'
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100"
          >
            Download .tex
          </button>
          <button
            type="button"
            onClick={() => { setGeneratedText(''); setGeneratedLatex('') }}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Back to flow
          </button>
        </div>

        {saveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !saving && setSaveModalOpen(false)}>
            <div className="bg-white rounded-xl shadow-lg p-5 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Save to Cover letters</h3>
              <p className="text-sm text-slate-600 mb-3">Enter a name for this cover letter. It will appear in Documents under Cover letters.</p>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Cover letter - Acme Inc"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => !saving && setSaveModalOpen(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="button" onClick={saveToCoverLetters} disabled={saving || !saveName.trim()} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-none py-4 px-4 pb-8">
      <Link to="/app" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Generate Cover Letter</h1>
        <p className="text-slate-600 mt-0.5">Step {step} of 4</p>
        <div className="flex gap-1 mt-3">
          {COVER_STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s.id ? 'bg-violet-500' : 'bg-slate-200'}`}
              aria-label={`Step ${s.id}`}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
              {(() => {
                const Icon = COVER_STEPS[step - 1].icon
                return <Icon className="h-4 w-4" />
              })()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{COVER_STEPS[step - 1].title}</h2>
              <p className="text-xs text-slate-500">
                {step === 1 && 'Resume and job description'}
                {step === 2 && 'Choose a tone/template'}
                {step === 3 && 'Keywords from job description'}
                {step === 4 && 'Generate'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Use resume and job description from the extension, or pick a saved resume and paste the job description.</p>
              {resumes.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Resume (recent first)</label>
                  <div className="flex flex-wrap gap-2">
                    {resumes.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setSelectedResumeId(r.id); setResumeText('') }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selectedResumeId === r.id && !resumeText ? 'bg-violet-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Or paste resume text</label>
                <textarea
                  value={resumeText}
                  onChange={(e) => { setResumeText(e.target.value); if (e.target.value.trim()) setSelectedResumeId(null) }}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                  placeholder="Paste resume content..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Job description *</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                    placeholder="e.g. Acme Inc."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Job title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Select a tone/template for the cover letter.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COVER_LETTER_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${template === t.id ? 'border-violet-500 bg-violet-50/50' : 'border-slate-200 hover:border-violet-200'}`}
                  >
                    {template === t.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                        <Check className="h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.tags}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Get keyword suggestions from the job description and optionally select which to weave in.</p>
              {apiKeys.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Add an API key</p>
                    <p className="text-xs text-slate-600">Needed for keyword suggestions. Add one in API Connection.</p>
                    <button type="button" onClick={() => navigate('/app/api-connection')} className="mt-2 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">
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
                      className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
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
                      <p className="text-sm font-medium text-slate-700 mb-2">Select keywords to include</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                          <label key={s} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                            <input type="checkbox" checked={selectedKeywords.has(s)} onChange={() => toggleKeyword(s)} className="rounded border-slate-300 text-violet-600" />
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

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Generate the cover letter with your selected API key. You will get both text and LaTeX.</p>
              {apiKeys.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Add an API key in API Connection to generate.</p>
                  <button type="button" onClick={() => navigate('/app/api-connection')} className="mt-2 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">
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
                        className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
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
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {generating ? 'Generating…' : 'Generate cover letter'}
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
            <button type="button" onClick={() => setStep((s) => Math.min(s + 1, 4))} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
