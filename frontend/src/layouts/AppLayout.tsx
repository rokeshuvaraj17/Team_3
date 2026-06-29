import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { Sidebar } from '@/components/ui/modern-side-bar'
import { getStoredUser } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { Puzzle, X, Sun, Moon } from 'lucide-react'

const EXTENSION_PANEL_WIDTH = 400

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getStoredUser()
  const isExtensionOpen = location.pathname === '/app/extension'

  useEffect(() => {
    if (!user?.id) navigate('/', { replace: true })
  }, [user?.id, navigate])

  if (!user?.id) return null

  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-screen h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors">
      <Sidebar />
      <main className="relative flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300 pt-20 pl-4 pr-4 pb-4 md:pt-6 md:px-6 md:pb-6">
        <header className="absolute top-4 right-6 md:top-4 md:right-6 flex items-center justify-end gap-2 z-10">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-600 bg-white/60 dark:bg-slate-800/80 shadow-sm transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <a
            href="/team3-extension.zip"
            download="team3-extension.zip"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-600 bg-white/60 dark:bg-slate-800/80 shadow-sm transition-colors no-underline"
          >
            <Puzzle className="h-4 w-4" />
            Add extension…
          </a>
        </header>
        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          <div className="flex-1 min-w-0 min-h-0 overflow-auto">
            <Outlet />
          </div>

          {/* Right-side extension panel (like Simplify extension) */}
          <div
            className={`flex flex-col h-full flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-lg transition-all duration-300 ease-out overflow-hidden ${
              isExtensionOpen ? 'opacity-100' : 'opacity-0 border-0'
            }`}
            style={{ width: isExtensionOpen ? EXTENSION_PANEL_WIDTH : 0 }}
          >
            {isExtensionOpen && (
              <>
                <div className="flex items-center justify-between shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80">
                  <h2 id="extension-panel-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Puzzle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Team 3 Extension
                  </h2>
                  <Link
                    to="/app"
                    className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Close extension panel"
                  >
                    <X className="h-5 w-5" />
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Add the Team 3 extension to Chrome to use resume and cover letter tools on job sites.
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
                    <li>Download the extension using the button below.</li>
                    <li>Unzip the file on your computer.</li>
                    <li>Open Chrome and go to <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800">chrome://extensions</code>.</li>
                    <li>Turn on <strong>Developer mode</strong> (toggle in the top-right).</li>
                    <li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>
                    <li>The Team 3 icon will appear in your toolbar.</li>
                  </ol>
                  <a
                    href="/team3-extension.zip"
                    download="team3-extension.zip"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors no-underline"
                  >
                    Download extension
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
