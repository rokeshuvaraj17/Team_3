import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/ui/modern-side-bar'
import { getStoredUser } from '@/lib/auth'
import { Puzzle } from 'lucide-react'

export function AppLayout() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [showExtensionModal, setShowExtensionModal] = useState(false)

  useEffect(() => {
    if (!user?.id) navigate('/', { replace: true })
  }, [user?.id, navigate])

  if (!user?.id) return null

  return (
    <div className="flex min-h-screen h-screen w-full bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="relative flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300 pt-20 pl-4 pr-4 pb-4 md:pt-6 md:px-6 md:pb-6">
        <header className="absolute top-4 right-6 md:top-4 md:right-6 flex justify-end z-10">
          <button
            type="button"
            onClick={() => setShowExtensionModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-slate-200/80 bg-white/60 shadow-sm transition-colors"
          >
            <Puzzle className="h-4 w-4" />
            Add extension…
          </button>
        </header>
        <div className="flex-1 flex min-h-0 min-w-0 overflow-auto">
          <Outlet />
        </div>
      </main>

      {showExtensionModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowExtensionModal(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="extension-modal-title"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4 bg-white rounded-xl shadow-xl border border-slate-200 p-6"
          >
            <h2 id="extension-modal-title" className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Puzzle className="h-5 w-5 text-blue-600" />
              Add JobFlow extension to Chrome
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 mb-6">
              <li>Download the extension using the button below.</li>
              <li>Unzip the file on your computer.</li>
              <li>Open Chrome and go to <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800">chrome://extensions</code>.</li>
              <li>Turn on <strong>Developer mode</strong> (toggle in the top-right).</li>
              <li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>
              <li>The JobFlow icon will appear in your toolbar.</li>
            </ol>
            <div className="flex flex-wrap gap-3">
              <a
                href="/jobflow-extension.zip"
                download="jobflow-extension.zip"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors no-underline"
              >
                Download
              </a>
              <button
                type="button"
                onClick={() => setShowExtensionModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
