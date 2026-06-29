import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { Puzzle, ExternalLink, Download } from 'lucide-react'
import { useEffect } from 'react'

const EXTENSION_MANIFEST_PATH = 'manifest/manifest.json'
const EXTENSION_DIST_PATH = 'manifest/dist'

export function ExtensionPage() {
  const navigate = useNavigate()
  const user = getStoredUser()

  useEffect(() => {
    if (!user?.id) navigate('/', { replace: true })
  }, [user?.id, navigate])

  if (!user?.id) return null

  return (
    <div className="flex flex-1 items-center justify-center min-h-[200px] px-4">
      <div className="max-w-xl w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm p-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 mb-4">
          <Puzzle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">MR_Rokesh Job Portal Extension</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Use the Chrome extension to use your resumes and cover letters directly on job application pages.
        </p>

        <div className="mt-6 text-left space-y-4">
          <section>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Extension & manifest location
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              In this project the extension lives in the <strong>manifest</strong> folder:
            </p>
            <ul className="mt-2 text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>Manifest file: <code className="rounded bg-slate-100 dark:bg-slate-700 px-1">{EXTENSION_MANIFEST_PATH}</code></li>
              <li>Built extension (load this in Chrome): <code className="rounded bg-slate-100 dark:bg-slate-700 px-1">{EXTENSION_DIST_PATH}</code></li>
            </ul>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Clone or download the repo and use the <code className="rounded bg-slate-100 dark:bg-slate-700 px-0.5">manifest</code> folder at the project root.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Download className="h-4 w-4" />
              How to add the extension in Chrome
            </h2>
            <ol className="mt-2 text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
              <li>Open a terminal in the project root and go to the manifest folder: <code className="rounded bg-slate-100 dark:bg-slate-700 px-1 block mt-1">cd manifest</code></li>
              <li>Install and build: <code className="rounded bg-slate-100 dark:bg-slate-700 px-1 block mt-1">npm install && npm run build</code></li>
              <li>In Chrome, open <strong>chrome://extensions</strong>.</li>
              <li>Turn <strong>Developer mode</strong> on (toggle in the top-right).</li>
              <li>Click <strong>Load unpacked</strong>.</li>
              <li>Select the <strong>dist</strong> folder inside the project’s <code className="rounded bg-slate-100 dark:bg-slate-700 px-0.5">manifest</code> folder (the full path to <code className="rounded bg-slate-100 dark:bg-slate-700 px-0.5">manifest/dist</code>).</li>
            </ol>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              After loading, the extension icon appears in the toolbar. Log in with the same email and password as the web app. Use <kbd className="rounded border border-slate-300 dark:border-slate-600 px-1 text-xs">Ctrl+Shift+F</kbd> (Windows/Linux) or <kbd className="rounded border border-slate-300 dark:border-slate-600 px-1 text-xs">Cmd+Shift+F</kbd> (Mac) on job pages to autofill profile fields.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
