import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import {
  FileText,
  ArrowLeft,
  PenLine,
  Save,
  Download,
  FileDown,
  FileCode,
  Loader2,
  ChevronRight,
  Mail,
  Trash2,
} from 'lucide-react'
import { RichTextToolbar } from '@/components/RichTextToolbar'
// PDF.js worker for text extraction (only loaded when editing a PDF)
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

type Resume = {
  id: string
  name: string
  file_url: string
  is_primary: boolean
  uploaded_at: string
  html_content?: string | null
}

type CoverLetter = {
  id: string
  title: string
  file_url: string
  created_at: string
  html_content?: string | null
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DocumentsPage() {
  const user = getStoredUser()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [coverLettersLoading, setCoverLettersLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null)
  const [docSection, setDocSection] = useState<'resumes' | 'cover-letters'>('resumes')
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view')
  const [editedHtml, setEditedHtml] = useState<string>('')
  const [savePromptOpen, setSavePromptOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const [viewModeCover, setViewModeCover] = useState<'view' | 'edit'>('view')
  const [editedHtmlCover, setEditedHtmlCover] = useState<string>('')
  const [saveCoverPromptOpen, setSaveCoverPromptOpen] = useState(false)
  const [savingCover, setSavingCover] = useState(false)
  const [coverExtracting, setCoverExtracting] = useState(false)
  const coverEditorRef = useRef<HTMLDivElement>(null)

  const selected = resumes.find((r) => r.id === selectedId)
  const selectedCover = coverLetters.find((c) => c.id === selectedCoverId)
  const hasEditableContent = selected?.html_content != null && selected.html_content.length > 0
  const isPdfOnly = selected && !hasEditableContent && selected.file_url
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)
  const [pdfExtracting, setPdfExtracting] = useState(false)
  const [coverLetterBlobUrl, setCoverLetterBlobUrl] = useState<string | null>(null)
  const [coverLetterLoadError, setCoverLetterLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/resumes'), { headers: { 'x-user-id': user.id } })
        if (res.ok) {
          const list = await res.json()
          setResumes(Array.isArray(list) ? list : [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/cover-letters'), { headers: { 'x-user-id': user.id } })
        if (res.ok) {
          const list = await res.json()
          setCoverLetters(Array.isArray(list) ? list : [])
        }
      } finally {
        setCoverLettersLoading(false)
      }
    }
    load()
  }, [user?.id])

  useEffect(() => {
    if (!selected) return
    setEditedHtml(selected.html_content || '')
    setViewMode('view')
    setPdfLoadError(null)
  }, [selected?.id])

  useEffect(() => {
    if (!selectedCover) return
    setEditedHtmlCover(selectedCover.html_content || '')
    setViewModeCover('view')
    setCoverLetterLoadError(null)
  }, [selectedCover?.id])

  // Sync content into cover letter editor only when entering edit mode (avoids cursor jump on every keystroke)
  useLayoutEffect(() => {
    if (viewModeCover === 'edit' && coverEditorRef.current) {
      coverEditorRef.current.innerHTML = editedHtmlCover
    }
  }, [viewModeCover])

  // Sync content into resume editor only when entering edit mode (avoids cursor jump on every keystroke)
  useLayoutEffect(() => {
    if (viewMode === 'edit' && editorRef.current) {
      editorRef.current.innerHTML = editedHtml
    }
  }, [viewMode])

  // Fetch PDF via proxy for viewing (avoids CORS/embedding "Failed to load PDF")
  useEffect(() => {
    if (!user?.id || !selectedId || !isPdfOnly) {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
        setPdfBlobUrl(null)
      }
      return
    }
    let revoked = false
    const load = async () => {
      setPdfLoadError(null)
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
        setPdfBlobUrl(null)
      }
      try {
        const res = await fetch(apiUrl(`/api/resumes/${selectedId}/file`), {
          headers: { 'x-user-id': user.id },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const msg = data?.error || `Could not load file (${res.status})`
          if (!revoked) {
            setPdfLoadError(msg)
            setPdfBlobUrl(null)
          }
          return
        }
        const blob = await res.blob()
        if (revoked) return
        if (blob.size === 0) {
          setPdfLoadError('File is empty')
          return
        }
        const url = URL.createObjectURL(blob)
        setPdfBlobUrl(url)
      } catch (e) {
        if (!revoked) {
          setPdfLoadError(e instanceof Error ? e.message : 'Network or server error. Check that the backend is running.')
          setPdfBlobUrl(null)
        }
      }
    }
    load()
    return () => {
      revoked = true
    }
  }, [user?.id, selectedId, isPdfOnly])

  // Fetch cover letter file for live preview (proxy avoids CORS)
  useEffect(() => {
    if (!user?.id || !selectedCoverId) {
      if (coverLetterBlobUrl) {
        URL.revokeObjectURL(coverLetterBlobUrl)
        setCoverLetterBlobUrl(null)
      }
      setCoverLetterLoadError(null)
      return
    }
    let revoked = false
    const load = async () => {
      setCoverLetterLoadError(null)
      if (coverLetterBlobUrl) {
        URL.revokeObjectURL(coverLetterBlobUrl)
        setCoverLetterBlobUrl(null)
      }
      try {
        const res = await fetch(apiUrl(`/api/cover-letters/${selectedCoverId}/file`), {
          headers: { 'x-user-id': user.id },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const msg = data?.error || `Could not load file (${res.status})`
          if (!revoked) {
            setCoverLetterLoadError(msg)
            setCoverLetterBlobUrl(null)
          }
          return
        }
        const blob = await res.blob()
        if (revoked) return
        if (blob.size === 0) {
          setCoverLetterLoadError('File is empty')
          return
        }
        const url = URL.createObjectURL(blob)
        setCoverLetterBlobUrl(url)
      } catch (e) {
        if (!revoked) {
          setCoverLetterLoadError(e instanceof Error ? e.message : 'Network or server error. Check that the backend is running.')
          setCoverLetterBlobUrl(null)
        }
      }
    }
    load()
    return () => {
      revoked = true
    }
  }, [user?.id, selectedCoverId])

  const startEdit = () => {
    if (hasEditableContent) {
      setEditedHtml(selected?.html_content || '')
      setViewMode('edit')
      setSavePromptOpen(false)
      setDownloadMenuOpen(false)
      return
    }
    if (!isPdfOnly) return
    startEditFromPdf()
  }

  const startEditFromPdf = async () => {
    if (!user?.id || !selectedId) return
    setPdfExtracting(true)
    try {
      const res = await fetch(apiUrl(`/api/resumes/${selectedId}/file`), {
        headers: { 'x-user-id': user.id },
      })
      if (!res.ok) throw new Error('Failed to load PDF')
      const blob = await res.blob()
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
      GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl
      const data = new Uint8Array(await blob.arrayBuffer())
      const pdf = await getDocument({ data }).promise
      const numPages = pdf.numPages
      const parts: string[] = []
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent({})
        const lines: string[] = []
        let lastY: number | null = null
        for (const item of textContent.items) {
          if ('str' in item) {
            const y = item.transform ? item.transform[5] : 0
            if (lastY !== null && Math.abs(y - lastY) > 5) lines.push('<br/>')
            lines.push(escapeHtml(item.str))
            lastY = y
          }
        }
        parts.push('<p style="margin-bottom: 1em;">' + lines.join(' ') + '</p>')
      }
      const html = parts.length ? parts.join('') : '<p>No text could be extracted from this PDF.</p>'
      setEditedHtml(html)
      setViewMode('edit')
      setSavePromptOpen(false)
      setDownloadMenuOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not extract text from PDF')
    } finally {
      setPdfExtracting(false)
    }
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  const handleSaveClick = () => {
    setSavePromptOpen(true)
  }

  const hasEditableCoverContent = selectedCover?.html_content != null && selectedCover.html_content.length > 0

  const startCoverEdit = async () => {
    if (!selectedCover || !user?.id) return
    if (hasEditableCoverContent) {
      setEditedHtmlCover(selectedCover.html_content || '')
      setViewModeCover('edit')
      return
    }
    setCoverExtracting(true)
    try {
      const res = await fetch(apiUrl(`/api/cover-letters/${selectedCover.id}/file`), {
        headers: { 'x-user-id': user.id },
      })
      if (!res.ok) throw new Error('Failed to load cover letter file')
      const contentType = res.headers.get('content-type') || ''
      const text = await res.text()
      if (contentType.includes('text/plain') || text.trim().length > 0) {
        const html = text.trim()
          ? '<p>' + text.trim().replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>') + '</p>'
          : '<p>No content.</p>'
        setEditedHtmlCover(html)
        setViewModeCover('edit')
      } else {
        alert('Edit is available for text-based cover letters. Save as text from Generate Cover Letter to edit here.')
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not load cover letter for editing')
    } finally {
      setCoverExtracting(false)
    }
  }

  const handleSaveCoverClick = () => {
    setSaveCoverPromptOpen(true)
  }

  const confirmSaveCover = async () => {
    if (!user?.id || !selectedCoverId) return
    setSavingCover(true)
    try {
      const htmlToSave = viewModeCover === 'edit' && coverEditorRef.current
        ? coverEditorRef.current.innerHTML
        : editedHtmlCover
      const res = await fetch(apiUrl(`/api/cover-letters/${selectedCoverId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ html_content: htmlToSave }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Save failed')
      }
      const updated = await res.json()
      setCoverLetters((prev) => prev.map((c) => (c.id === selectedCoverId ? { ...c, ...updated } : c)))
      setEditedHtmlCover(updated.html_content ?? '')
      setViewModeCover('view')
      setSaveCoverPromptOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingCover(false)
    }
  }

  const confirmSave = async () => {
    if (!user?.id || !selectedId) return
    setSaving(true)
    try {
      const htmlToSave = viewMode === 'edit' && editorRef.current
        ? editorRef.current.innerHTML
        : editedHtml
      const res = await fetch(apiUrl(`/api/resumes/${selectedId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ html_content: htmlToSave }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Save failed')
      }
      const updated = await res.json()
      setResumes((prev) => prev.map((r) => (r.id === selectedId ? { ...r, ...updated } : r)))
      setEditedHtml(updated.html_content ?? '')
      setViewMode('view')
      setSavePromptOpen(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const getEditorHtml = (): string => {
    if (viewMode === 'edit' && editorRef.current) return editorRef.current.innerHTML
    return editedHtml
  }

  const downloadPdf = async () => {
    const html = getEditorHtml()
    if (!html && !selected?.file_url) {
      alert('No content to export. Edit the resume first or use the PDF file.')
      return
    }
    if (!html) {
      window.open(selected!.file_url, '_blank')
      setDownloadMenuOpen(false)
      return
    }
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const el = editorRef.current
      if (!el) {
        const wrap = document.createElement('div')
        wrap.innerHTML = html
        wrap.style.position = 'absolute'
        wrap.style.left = '-9999px'
        wrap.style.width = '210mm'
        wrap.style.background = 'white'
        wrap.style.padding = '20px'
        document.body.appendChild(wrap)
        const canvas = await html2canvas(wrap, { scale: 2, useCORS: true })
        document.body.removeChild(wrap)
        const img = canvas.toDataURL('image/png')
        const pdf = new jsPDF({ format: 'a4', unit: 'mm' })
        const w = pdf.internal.pageSize.getWidth()
        const h = (canvas.height * w) / canvas.width
        pdf.addImage(img, 'PNG', 0, 0, w, h)
        pdf.save((selected?.name || 'resume').replace(/\s+/g, '_') + '.pdf')
      } else {
        const canvas = await html2canvas(el, { scale: 2, useCORS: true })
        const img = canvas.toDataURL('image/png')
        const pdf = new jsPDF({ format: 'a4', unit: 'mm' })
        const w = pdf.internal.pageSize.getWidth()
        const h = (canvas.height * w) / canvas.width
        pdf.addImage(img, 'PNG', 0, 0, w, h)
        pdf.save((selected?.name || 'resume').replace(/\s+/g, '_') + '.pdf')
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'PDF export failed')
    }
    setDownloadMenuOpen(false)
  }

  const downloadWord = () => {
    const html = getEditorHtml()
    if (!html) {
      alert('No editable content. Edit the resume first to export as Word.')
      setDownloadMenuOpen(false)
      return
    }
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="ProgId" content="Word.Document"></head><body>${html}</body></html>`
    const blob = new Blob(['\ufeff' + doc], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (selected?.name || 'resume').replace(/\s+/g, '_') + '.doc'
    a.click()
    URL.revokeObjectURL(url)
    setDownloadMenuOpen(false)
  }

  const downloadLatex = () => {
    const html = getEditorHtml()
    if (!html) {
      alert('No editable content. Edit the resume first to export as LaTeX.')
      setDownloadMenuOpen(false)
      return
    }
    const div = document.createElement('div')
    div.innerHTML = html
    const text = div.innerText || div.textContent || ''
    const escaped = text
      .replace(/\\/g, '\\\\')
      .replace(/#/g, '\\#')
      .replace(/\$/g, '\\$')
      .replace(/%/g, '\\%')
      .replace(/&/g, '\\&')
      .replace(/_/g, '\\_')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
    const lines = escaped.split(/\n/).filter((s) => s.trim().length > 0)
    const body = lines.map((l) => `  ${l.trim()} \\\\`).join('\n')
    const tex = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{parskip}
\\begin{document}
${body}
\\end{document}
`
    const blob = new Blob([tex], { type: 'application/x-tex' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (selected?.name || 'resume').replace(/\s+/g, '_') + '.tex'
    a.click()
    URL.revokeObjectURL(url)
    setDownloadMenuOpen(false)
  }

  if (!user?.id) {
    return (
      <div className="p-6">
        <p className="text-slate-700 dark:text-slate-300">Please sign in to view your documents.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl py-4 px-4 pb-8 mx-auto">
      <Link
        to="/app"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar: list of resumes */}
        <aside className="w-full md:w-80 flex-shrink-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Documents</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Resumes and cover letters. Click to view or download.
          </p>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setDocSection('resumes'); setSelectedCoverId(null) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                docSection === 'resumes'
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Resumes
            </button>
            <button
              type="button"
              onClick={() => { setDocSection('cover-letters'); setSelectedId(null) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                docSection === 'cover-letters'
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Cover letters
            </button>
          </div>
          {docSection === 'resumes' && (
            <>
              {loading ? (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading…</span>
                </div>
              ) : resumes.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  No resumes yet. Create one from Generate Resume.
                </p>
              ) : (
                <ul className="space-y-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/60 overflow-hidden">
                  {resumes.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedId(r.id); setSelectedCoverId(null) }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          selectedId === r.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-600 dark:border-blue-400'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700/70'
                        }`}
                      >
                        <FileText className="h-5 w-5 text-slate-500 dark:text-slate-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{r.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(r.uploaded_at)}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {docSection === 'cover-letters' && (
            <>
              {coverLettersLoading ? (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading…</span>
                </div>
              ) : coverLetters.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  No cover letters yet. Generate one from Generate Cover Letter, then save it here.
                </p>
              ) : (
                <ul className="space-y-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/60 overflow-hidden">
                  {coverLetters.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedCoverId(c.id); setSelectedId(null) }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          selectedCoverId === c.id
                            ? 'bg-violet-50 dark:bg-violet-900/30 border-l-4 border-violet-600 dark:border-violet-400'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700/70'
                        }`}
                      >
                        <Mail className="h-5 w-5 text-slate-500 dark:text-slate-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{c.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(c.created_at)}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>

        {/* Main: view or edit selected resume / cover letter */}
        <main className="flex-1 min-w-0">
          {selectedCover ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/70">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{selectedCover.title}</h2>
                <div className="flex items-center gap-2">
                  {viewModeCover === 'view' && (
                    <button
                      type="button"
                      onClick={startCoverEdit}
                      disabled={coverExtracting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                      title="Edit cover letter"
                    >
                      {coverExtracting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PenLine className="h-4 w-4" />
                      )}
                      {coverExtracting ? 'Loading…' : 'Edit'}
                    </button>
                  )}
                  {viewModeCover === 'edit' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedHtmlCover(selectedCover?.html_content ?? '')
                          setViewModeCover('view')
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                        title="Cancel editing"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCoverClick}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
                        title="Save changes"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                    </>
                  )}
                  <a
                    href={selectedCover.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user?.id || !selectedCover) return
                      if (!confirm('Delete this cover letter?')) return
                      const res = await fetch(apiUrl(`/api/cover-letters/${selectedCover.id}`), { method: 'DELETE', headers: { 'x-user-id': user.id } })
                      if (res.ok) {
                        setCoverLetters((prev) => prev.filter((c) => c.id !== selectedCover.id))
                        setSelectedCoverId(null)
                      } else {
                        const data = await res.json().catch(() => ({}))
                        alert(data?.error || 'Delete failed')
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
              <div className="p-4 min-h-[360px]">
                {coverLetterLoadError && viewModeCover !== 'edit' && (
                  <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg mb-2">
                    {coverLetterLoadError}
                  </p>
                )}
                {viewModeCover === 'edit' ? (
                  <>
                    <RichTextToolbar editorRef={coverEditorRef} />
                    <div
                      key={`cover-${selectedCover.id}-edit`}
                      ref={coverEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() => setEditedHtmlCover(coverEditorRef.current?.innerHTML ?? '')}
                      className="min-h-[400px] w-full rounded-b-lg border border-t-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-sm text-slate-800 dark:text-slate-100 prose prose-slate dark:prose-invert max-w-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </>
                ) : (hasEditableCoverContent || editedHtmlCover) ? (
                  <div
                    className="prose prose-slate max-w-none p-6 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/40 dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: editedHtmlCover || selectedCover?.html_content || '' }}
                  />
                ) : (
                  <>
                    {!coverLetterBlobUrl && !coverLetterLoadError && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-8">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading cover letter…</span>
                      </div>
                    )}
                    {coverLetterBlobUrl && (
                      <iframe
                        src={coverLetterBlobUrl}
                        title={selectedCover.title}
                        className="w-full h-[70vh] min-h-[400px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    )}
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Use <strong>Edit</strong> to change the text and save. Content saved from Generate Cover Letter (as text) can be edited here.
                    </p>
                  </>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  <Link
                    to="/app/generate-cover-letter"
                    className="font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                  >
                    Generate another cover letter →
                  </Link>
                </p>
              </div>
            </div>
          ) : !selected ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 p-8 text-center text-slate-500 dark:text-slate-400">
              {docSection === 'cover-letters'
                ? (coverLetters.length === 0 ? 'No cover letters yet.' : 'Select a cover letter.')
                : (resumes.length === 0 ? 'Create a resume to see it here.' : 'Select a resume to view or edit.')}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/70">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{selected.name}</h2>
                <div className="flex items-center gap-2">
                  {viewMode === 'view' && (hasEditableContent || isPdfOnly) && (
                    <button
                      type="button"
                      onClick={startEdit}
                      disabled={pdfExtracting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                      title={isPdfOnly ? 'Extract text from PDF to edit' : 'Edit resume'}
                    >
                      {pdfExtracting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PenLine className="h-4 w-4" />
                      )}
                      {pdfExtracting ? 'Extracting…' : 'Edit'}
                    </button>
                  )}
                  {viewMode === 'edit' && (hasEditableContent || editedHtml) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedHtml(selected?.html_content ?? '')
                          setViewMode('view')
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                        title="Cancel editing"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveClick}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                        title="Save changes"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                    </>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDownloadMenuOpen((o) => !o)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                    {downloadMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          aria-hidden
                          onClick={() => setDownloadMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 py-1 w-48 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
                          <button
                            type="button"
                            onClick={downloadPdf}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <FileDown className="h-4 w-4" />
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={downloadWord}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <FileText className="h-4 w-4" />
                            Word
                          </button>
                          <button
                            type="button"
                            onClick={downloadLatex}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <FileCode className="h-4 w-4" />
                            LaTeX
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 min-h-[360px]">
                {!hasEditableContent && !(viewMode === 'edit' && editedHtml) ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      This resume is a PDF. Use <strong>Edit</strong> to extract text and edit it; then save and download as PDF, Word, or LaTeX.
                    </p>
                    {pdfLoadError && (
                      <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                        {pdfLoadError}
                      </p>
                    )}
                    {!pdfBlobUrl && !pdfLoadError && isPdfOnly && (
                      <div className="flex items-center gap-2 text-slate-500 py-8">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading PDF…</span>
                      </div>
                    )}
                    {pdfBlobUrl && (
                      <iframe
                        src={pdfBlobUrl}
                        title={selected.name}
                        className="w-full h-[70vh] min-h-[400px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    )}
                  </div>
                ) : viewMode === 'view' ? (
                  <div
                    className="prose prose-slate max-w-none p-6 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/40 dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: editedHtml }}
                  />
                ) : (
                  <>
                    <RichTextToolbar editorRef={editorRef} />
                    <div
                      key={`${selectedId}-${viewMode}`}
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() => setEditedHtml(editorRef.current?.innerHTML ?? '')}
                      className="min-h-[400px] w-full rounded-b-lg border border-t-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-sm text-slate-800 dark:text-slate-100 prose prose-slate dark:prose-invert max-w-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Save confirmation modal (resume) */}
      {savePromptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !saving && setSavePromptOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Save changes?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Your edits will be saved to this resume.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSavePromptOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save confirmation modal (cover letter) */}
      {saveCoverPromptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !savingCover && setSaveCoverPromptOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Save changes?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Your edits will be saved to this cover letter.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSaveCoverPromptOpen(false)}
                disabled={savingCover}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSaveCover}
                disabled={savingCover}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {savingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingCover ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
