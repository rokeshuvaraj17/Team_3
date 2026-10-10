import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { Sidebar } from '@/components/ui/modern-side-bar'
import { getStoredUser } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { Puzzle, X, Sun, Moon, Search } from 'lucide-react'
import logoUrl from '@/images/transparent.png'

/** Header job search: sends the keyword to the dashboard (?q=) which runs the search. */
function JobSearchForm({ className }: { className: string }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  return (
    <form
      role="search"
      key={searchParams.get('q') ?? ''}
      onSubmit={(e) => {
        e.preventDefault()
        const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
        navigate(q ? `/app?q=${encodeURIComponent(q)}` : '/app')
      }}
      className={`items-center ${className}`}
    >
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="search"
          name="q"
          defaultValue={searchParams.get('q') ?? ''}
          aria-label="Search jobs"
          placeholder="Search jobs, titles or companies"
          className="w-full h-9 pl-9 pr-3 rounded bg-blue-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 border border-transparent focus:bg-white dark:focus:bg-slate-700 focus:border-blue-600 focus:outline-none transition-colors"
        />
      </div>
    </form>
  )
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getStoredUser()
  const { theme, toggleTheme } = useTheme()
  const isExtensionOpen = location.pathname === '/app/extension'

  useEffect(() => {
    if (!user?.id) navigate('/', { replace: true })
  }, [user?.id, navigate])

  if (!user?.id) return null

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-black overflow-hidden transition-colors">
      <header className="shrink-0 h-14 flex items-center gap-3 px-4 md:px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-20">
        <Link to="/app" className="flex items-center gap-2 no-underline shrink-0 pl-12 md:pl-0">
          <img src={logoUrl} alt="MR_Rokesh logo" className="h-8 w-8 object-contain" />
          <span className="hidden sm:block font-semibold text-slate-900 dark:text-slate-100 text-base tracking-tight">
            MR_Rokesh <span className="text-blue-600 dark:text-blue-400">Jobs</span>
          </span>
        </Link>

        <JobSearchForm className="hidden md:flex flex-1 max-w-md ml-2" />

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <a
            href="/team3-extension.zip"
            download="team3-extension.zip"
            className="flex items-center gap-2 h-9 px-4 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-300 border border-blue-600 dark:border-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-2 transition-colors no-underline"
          >
            <Puzzle className="h-4 w-4" />
            <span className="hidden sm:inline">Get extension</span>
          </a>
        </div>
      </header>

      <JobSearchForm className="md:hidden shrink-0 px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700" />

      <div className="flex flex-1 min-h-0 min-w-0">
        <Sidebar />
        <main className="relative flex-1 flex flex-col min-w-0 min-h-0 p-4 md:p-6">
        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          <div className="flex-1 min-w-0 min-h-0 overflow-auto">
            <div className="mx-auto w-full max-w-[1600px] min-h-full flex flex-col">
              <Outlet />
            </div>
          </div>

          {/* Right-side extension panel (like Simplify extension) */}
          <div
            className={`flex-col flex-shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden ${
              isExtensionOpen
                ? 'flex fixed inset-x-0 bottom-0 top-14 z-30 md:static md:z-auto md:h-full md:w-[400px] md:ml-4 md:rounded-lg md:shadow-sm'
                : 'hidden'
            }`}
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
    </div>
  )
}
