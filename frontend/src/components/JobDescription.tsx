import type { ReactNode } from 'react'
import DOMPurify from 'dompurify'

/** Allowed tags for job description HTML (no script, no iframe, no form) */
const ALLOWED_TAGS = [
  'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u',
  'h2', 'h3', 'h4', 'blockquote', 'div', 'span', 'a',
]

/** Strip HTML and normalize spaces for plain-text preview (e.g. in job cards) */
export function stripDescriptionToPlainText(html: string): string {
  if (!html?.trim()) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Strip HTML but keep newlines (for structured parsing so sections are detectable) */
function stripHtmlPreserveNewlines(html: string): string {
  if (!html?.trim()) return ''
  return html
    .replace(/<\/p>\s*<p/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripToPlainText(html: string): string {
  return stripDescriptionToPlainText(html)
}

function sanitizeDescription(html: string): string {
  if (!html || !html.trim()) return ''
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ADD_ATTR: ['target', 'rel'],
  })
  // Open all links in new tab safely
  return sanitized.replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" ')
}

function hasHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text)
}

interface JobDescriptionProps {
  description: string
  /** Use true for detail view (full content), false for card preview */
  full?: boolean
  /** When true, parse and show Responsibilities, Location, Requirements as titled sections with bullet points */
  structured?: boolean
  /** When structured, show this as the "Location" section (from job.locationDisplay) */
  locationDisplay?: string
  className?: string
}

const SECTION_HEADER_REGEX = /(?:^|\n)\s*((?:Key\s+)?Responsibilities?|(?:Essential\s+)?Requirements?|Qualifications?|(?:Work\s+)?Location|What\s+you'll\s+do|Your\s+role|What\s+we're\s+looking\s+for|You\s+have|About\s+the\s+role)\s*:?\s*[-–]?\s*\n?/gi

/** Inline patterns: "Responsibilities: ..." or "Work location - ..." mid-text */
const INLINE_SECTION_REGEX = /\s*((?:Key\s+)?Responsibilities?\s*:|(?:Essential\s+)?Requirements?\s*:|Qualifications?\s*:|(?:Work\s+)?Location\s*:?\s*[-–]?\s*|What\s+you'll\s+do\s*:|Your\s+role\s*:|What\s+we're\s+looking\s+for\s*:|You\s+have\s*:)\s*/gi

interface ParsedSection {
  title: string
  content: string
}

function normalizeSectionTitle(header: string): string {
  const t = header.replace(/\s*:?\s*[-–]\s*$/, '').trim()
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

function parseStructuredSections(plainText: string): { sections: ParsedSection[]; locationFromText: string | null } {
  const normalized = plainText.replace(/\r\n/g, '\n').trim()
  let locationFromText: string | null = null
  if (!normalized) return { sections: [], locationFromText }

  const re = new RegExp(SECTION_HEADER_REGEX.source, 'gi')
  const matches: { index: number; endIndex: number; title: string }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(normalized)) !== null) {
    const rawTitle = m[1].trim().replace(/\s*:?\s*$/, '').replace(/\s*[-–]\s*$/, '')
    const sectionTitle = normalizeSectionTitle(rawTitle)
    matches.push({ index: m.index, endIndex: re.lastIndex, title: sectionTitle })
  }

  let sections: ParsedSection[] = []
  if (matches.length > 0) {
    let lastIndex = 0
    for (let i = 0; i < matches.length; i++) {
      const curr = matches[i]
      if (curr.index > lastIndex) {
        const intro = normalized.slice(lastIndex, curr.index).trim()
        if (intro) sections.push({ title: '', content: intro })
      }
      const contentEnd = i + 1 < matches.length ? matches[i + 1].index : normalized.length
      const content = normalized.slice(curr.endIndex, contentEnd).trim()
      if (content) {
        if (curr.title.toLowerCase().includes('location')) {
          locationFromText = content
        } else {
          sections.push({ title: curr.title, content })
        }
      }
      lastIndex = contentEnd
    }
    if (lastIndex < normalized.length) {
      const tail = normalized.slice(lastIndex).trim()
      if (tail) sections.push({ title: '', content: tail })
    }
  }

  if (sections.length === 0 || (sections.length === 1 && !sections[0].title)) {
    const inlineRe = new RegExp(INLINE_SECTION_REGEX.source, 'gi')
    const parts: { matchIndex: number; contentStart: number; title: string }[] = []
    while ((m = inlineRe.exec(normalized)) !== null) {
      const raw = m[1].trim()
      let title = raw.replace(/\s*:?\s*$/, '').replace(/\s*[-–]\s*$/, '').trim()
      const contentStart = m.index + m[0].length
      if (/^work\s+location$/i.test(title)) {
        title = 'Location'
        const after = normalized.slice(contentStart).trim()
        const untilNext = after.split(/\s*(?:Responsibilities?|Requirements?|Qualifications?)\s*:/i)[0]?.trim()
        if (untilNext) locationFromText = untilNext.slice(0, 300)
      }
      parts.push({ matchIndex: m.index, contentStart, title: normalizeSectionTitle(title) })
    }
    if (parts.length > 0) {
      sections = []
      let lastIdx = 0
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        if (p.matchIndex > lastIdx) {
          const intro = normalized.slice(lastIdx, p.matchIndex).trim()
          if (intro) sections.push({ title: '', content: intro })
        }
        const contentEnd = i + 1 < parts.length ? parts[i + 1].matchIndex : normalized.length
        const content = normalized.slice(p.contentStart, contentEnd).trim()
        if (content && !p.title.toLowerCase().includes('location')) {
          sections.push({ title: p.title, content })
        }
        lastIdx = contentEnd
      }
      if (lastIdx < normalized.length) {
        const tail = normalized.slice(lastIdx).trim()
        if (tail) sections.push({ title: '', content: tail })
      }
    }
  }

  if (sections.length === 0 && normalized) {
    sections = [{ title: '', content: normalized }]
  }

  const locMatch = normalized.match(/(?:work\s+location|location)\s*:?\s*[-–]?\s*([^\n.]+)/i)
  if (locMatch && !locationFromText) locationFromText = locMatch[1].trim()

  return { sections, locationFromText }
}

/** Turn section content into bullet points: by newline first, then by sentence or " · " if one line */
function contentToBulletItems(content: string): string[] {
  let lines = content.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const BULLET = /^\s*[-*•]\s+/
  const NUM = /^\s*\d+\.\s+/
  const out: string[] = []
  for (const line of lines) {
    const cleaned = line.replace(BULLET, '').replace(NUM, '').trim()
    if (!cleaned) continue
    if (cleaned.includes(' · ')) {
      out.push(...cleaned.split(' · ').map((s) => s.trim()).filter(Boolean))
    } else if (cleaned.length > 200) {
      const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
      out.push(...sentences.map((s) => s.trim()).filter(Boolean))
    } else {
      out.push(cleaned)
    }
  }
  if (out.length === 0 && content.trim()) {
    const bySentence = content.trim().split(/(?<=[.!?])\s+/).filter(Boolean)
    out.push(...bySentence.map((s) => s.trim()).filter(Boolean))
  }
  return out
}

function renderStructuredContentAsPoints(content: string): ReactNode {
  const items = contentToBulletItems(content)
  if (items.length === 0) return <p className="m-0 my-2 text-slate-600">{content.slice(0, 500)}</p>
  return (
    <ul className="job-description-list list-disc pl-5 space-y-1 my-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

/**
 * Renders job description: sanitizes HTML when present and applies readable typography.
 * When structured=true, parses Responsibilities, Location, Requirements into titled sections with bullet points.
 */
export function JobDescription({
  description,
  full = true,
  structured = false,
  locationDisplay,
  className = '',
}: JobDescriptionProps) {
  const raw = description?.trim() || ''
  if (!raw) {
    return <p className="text-slate-500 text-sm italic">No description available.</p>
  }

  if (structured && full) {
    const plain = hasHtml(raw) ? stripHtmlPreserveNewlines(raw) : raw.replace(/\r\n/g, '\n')
    const { sections, locationFromText } = parseStructuredSections(plain)
    const locationContent = [locationDisplay, locationFromText].filter(Boolean).join(locationDisplay && locationFromText ? ' · ' : '')
    return (
      <div className={`job-description job-description-structured text-slate-700 text-sm leading-relaxed space-y-4 ${className}`}>
        {sections.map((s, i) => (
          <section key={i} className="job-description-section">
            {s.title && (
              <h3 className="text-slate-800 font-semibold mt-4 mb-2 first:mt-0">
                {s.title}
              </h3>
            )}
            {renderStructuredContentAsPoints(s.content)}
          </section>
        ))}
        {(locationDisplay || locationFromText) && (
          <section className="job-description-section">
            <h3 className="text-slate-800 font-semibold mt-4 mb-2">Location</h3>
            {renderStructuredContentAsPoints(locationContent)}
          </section>
        )}
      </div>
    )
  }

  if (hasHtml(raw)) {
    const sanitized = sanitizeDescription(raw)
    if (!sanitized) {
      return (
        <div className={`text-slate-700 text-sm ${className}`}>
          {stripToPlainText(raw)}
        </div>
      )
    }
    return (
      <div
        className={`job-description text-slate-700 text-sm leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    )
  }

  const paragraphs = raw.split(/\n+/).filter((p) => p.trim())
  if (full && paragraphs.length > 1) {
    return (
      <div className={`text-slate-700 text-sm leading-relaxed space-y-3 ${className}`}>
        {paragraphs.map((p, i) => (
          <p key={i} className="mb-0">
            {p.trim()}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className={`text-slate-700 text-sm leading-relaxed whitespace-pre-wrap ${className}`}>
      {raw}
    </div>
  )
}
