import { type RefObject } from 'react'
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react'

const FONT_SIZES = [
  { value: '1', label: 'Small' },
  { value: '2', label: 'Normal' },
  { value: '3', label: 'Medium' },
  { value: '4', label: 'Large' },
  { value: '5', label: 'X-Large' },
]

const FONT_FAMILIES = [
  { value: '', label: 'Default' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: '"Segoe UI", Tahoma, sans-serif', label: 'Segoe UI' },
]

function execCommand(editorRef: RefObject<HTMLDivElement | null>, command: string, value?: string) {
  const el = editorRef.current
  if (!el) return
  el.focus()
  document.execCommand(command, false, value ?? undefined)
}

type RichTextToolbarProps = {
  editorRef: RefObject<HTMLDivElement | null>
  className?: string
}

export function RichTextToolbar({ editorRef, className = '' }: RichTextToolbarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1 p-2 rounded-t-lg border border-b-0 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 ${className}`}
      role="toolbar"
      aria-label="Text formatting"
    >
      <button
        type="button"
        onClick={() => execCommand(editorRef, 'bold')}
        className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
        title="Bold"
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => execCommand(editorRef, 'italic')}
        className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
        title="Italic"
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => execCommand(editorRef, 'underline')}
        className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
        title="Underline"
        aria-label="Underline"
      >
        <Underline className="h-4 w-4" />
      </button>
      <span className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-0.5" aria-hidden />
      <select
        onChange={(e) => {
          const v = e.target.value
          execCommand(editorRef, 'fontSize', v ? `${v}` : undefined)
          e.target.value = ''
        }}
        className="text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-1.5 px-2 min-w-0"
        title="Font size"
        aria-label="Font size"
      >
        <option value="">Size</option>
        {FONT_SIZES.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select
        onChange={(e) => {
          const v = e.target.value
          execCommand(editorRef, 'fontName', v || undefined)
          e.target.value = ''
        }}
        className="text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-1.5 px-2 min-w-0"
        title="Font"
        aria-label="Font family"
      >
        <option value="">Font</option>
        {FONT_FAMILIES.map(({ value, label }) => (
          <option key={value || 'default'} value={value}>{label}</option>
        ))}
      </select>
      <span className="w-px h-6 bg-slate-200 dark:bg-slate-600 mx-0.5" aria-hidden />
      <button
        type="button"
        onClick={() => execCommand(editorRef, 'insertUnorderedList')}
        className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
        title="Bullet list"
        aria-label="Bullet list"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => execCommand(editorRef, 'insertOrderedList')}
        className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
        title="Numbered list"
        aria-label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </button>
    </div>
  )
}
