import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileText,
  FileOutput,
  Bell,
  KeyRound,
  Search,
  HelpCircle,
  PenLine,
  Puzzle,
  BookmarkCheck,
  FormInput,
} from 'lucide-react'
import { getStoredUser, clearStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import { useNotifications } from '@/lib/useNotifications'
import logoUrl from '@/images/transparent.png'

interface NavigationItem {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: string
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: Home, href: '/app' },
  { id: 'generate-resume', name: 'Generate Resume', icon: FileOutput, href: '/app/generate-resume' },
  { id: 'generate-cover-letter', name: 'Generate Cover Letter', icon: PenLine, href: '/app/generate-cover-letter' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, href: '/app/analytics' },
  { id: 'job-tracker', name: 'Job Tracker', icon: BookmarkCheck, href: '/app/job-tracker' },
  { id: 'documents', name: 'Documents', icon: FileText, href: '/app/documents' },
  { id: 'notifications', name: 'Notifications', icon: Bell, href: '/app/notifications' },
  { id: 'extension', name: 'Extension', icon: Puzzle, href: '/app/extension' },
  { id: 'api-connection', name: 'API Connection', icon: KeyRound, href: '/app/api-connection' },
  { id: 'autofill-form-fields', name: 'Autofill Form Fields', icon: FormInput, href: '/app/autofill-form-fields' },
  { id: 'settings', name: 'Settings', icon: Settings, href: '/app/settings' },
  { id: 'help', name: 'Help & Support', icon: HelpCircle, href: '/app/help' },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className = '' }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getStoredUser()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const { count: notificationCount } = useNotifications()

  const activeItem =
    navigationItems.find((item) => {
      if (item.href === '/app') return location.pathname === '/app'
      return location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    })?.id ?? 'dashboard'
  const isProfile = location.pathname === '/app/profile'

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsOpen(true)
      else setIsOpen(false)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetch(apiUrl('/api/profile'), { headers: { 'x-user-id': user.id } })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.display_name) setProfileName(data.display_name)
        if (data?.profile_image_url) setProfileImageUrl(data.profile_image_url)
      })
      .catch(() => {})
  }, [user?.id])

  const toggleSidebar = () => setIsOpen(!isOpen)
  const toggleCollapse = () => setIsCollapsed(!isCollapsed)

  const handleLogout = () => {
    clearStoredUser()
    navigate('/', { replace: true })
  }

  const closeOnMobile = () => {
    if (window.innerWidth < 768) setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={toggleSidebar}
        className="fixed top-6 left-6 z-50 p-3 rounded-lg bg-white dark:bg-slate-800 shadow-md border border-slate-100 dark:border-slate-700 md:hidden hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="h-5 w-5 text-slate-600 dark:text-slate-300" /> : <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
          aria-hidden
        />
      )}

      <aside
        className={`
          flex flex-col flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out
          h-screen fixed top-0 left-0 z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-28' : 'w-72'}
          md:translate-x-0 md:relative md:h-full md:z-auto
          ${className}
        `}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80">
          {!isCollapsed && (
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600 overflow-hidden">
                <img src={logoUrl} alt="MR_Rokesh logo" className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                  MR_Rokesh
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">Job Portal</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center mx-auto flex-shrink-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600 overflow-hidden">
              <img src={logoUrl} alt="MR_Rokesh logo" className="w-full h-full object-contain p-1" />
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            )}
          </button>
        </div>

        {!isCollapsed && (
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-0.5">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.id
              const badge =
                item.id === 'notifications'
                  ? notificationCount > 0
                    ? String(notificationCount)
                    : undefined
                  : item.badge
              return (
                <li key={item.id} className="relative">
                  <Link
                    to={item.href}
                    onClick={closeOnMobile}
                    className={`
                      relative
                      w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-left transition-all duration-200 group
                      ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'}
                      ${isCollapsed ? 'justify-center px-2' : ''}
                    `}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center justify-center min-w-[24px]">
                      <Icon
                        className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}
                      />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-sm ${isActive ? 'font-medium' : 'font-normal'}`}>{item.name}</span>
                        {badge && (
                          <span
                            className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                              isActive ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </div>
                    )}
                    {isCollapsed && badge && (
                      <div className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-blue-100 border border-white">
                        <span className="text-[10px] font-medium text-blue-700">
                          {parseInt(badge) > 9 ? '9+' : badge}
                        </span>
                      </div>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                        {item.name}
                        {badge && (
                          <span className="ml-1.5 px-1 py-0.5 bg-slate-700 rounded-full text-[10px]">{badge}</span>
                        )}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45" />
                      </div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-auto border-t border-slate-200 dark:border-slate-700">
          <div className={`border-b border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/50 ${isCollapsed ? 'py-3 px-2' : 'p-3'}`}>
            {!isCollapsed ? (
              <Link
                to="/app/profile"
                onClick={closeOnMobile}
                className={`flex items-center px-3 py-2 rounded-md transition-colors duration-200 ${
                  isProfile ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800' : 'bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">
                      {(profileName || (user?.name ?? user?.email ?? 'U')).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 ml-2.5">
                  <p className={`text-sm font-medium truncate ${isProfile ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-100'}`}>
                    {(profileName || user?.name) ?? 'User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email ?? ''}</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full ml-2 flex-shrink-0" title="Online" />
              </Link>
            ) : (
              <Link
                to="/app/profile"
                onClick={closeOnMobile}
                className="flex justify-center"
                title="Profile"
              >
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ${
                    isProfile ? 'ring-2 ring-blue-500 ring-offset-2' : 'bg-slate-200 dark:bg-slate-600'
                  }`}>
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">
                        {(profileName || (user?.name ?? user?.email ?? 'U')).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                </div>
              </Link>
            )}
          </div>

          <div className="p-3">
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center rounded-md text-left transition-all duration-200 group
                text-red-600 hover:bg-red-50 hover:text-red-700
                ${isCollapsed ? 'justify-center p-2.5' : 'space-x-2.5 px-3 py-2.5'}
              `}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <div className="flex items-center justify-center min-w-[24px]">
                <LogOut className="h-4.5 w-4.5 flex-shrink-0 text-red-500 group-hover:text-red-600" />
              </div>
              {!isCollapsed && <span className="text-sm">Logout</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  Logout
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45" />
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
