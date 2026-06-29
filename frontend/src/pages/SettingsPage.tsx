import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '@/lib/auth'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Settings,
  Globe,
  Bell,
  Palette,
  Save,
  Sun,
  Moon,
} from 'lucide-react'

const STORAGE_KEY = 'team3-settings'

type StoredSettings = {
  language: string
  dateFormat: string
  timezone: string
  dashboardDensity: 'compact' | 'comfortable' | 'spacious'
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyDigest: boolean
  jobAlerts: boolean
}

const defaultSettings: StoredSettings = {
  language: 'en',
  dateFormat: 'MM/DD/YYYY',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  dashboardDensity: 'comfortable',
  emailNotifications: true,
  pushNotifications: true,
  weeklyDigest: false,
  jobAlerts: true,
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredSettings>
      return { ...defaultSettings, ...parsed }
    }
  } catch {}
  return defaultSettings
}

function saveSettings(s: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

export function SettingsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<StoredSettings>(defaultSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user?.id) navigate('/', { replace: true })
  }, [user?.id, navigate])

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  const update = <K extends keyof StoredSettings>(key: K, value: StoredSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!user?.id) return null

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Settings className="h-7 w-7 text-slate-600 dark:text-slate-400" />
          Settings
        </h1>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {/* Appearance / Theme */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          Appearance
        </h2>
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose how Team 3 looks. You can also switch theme with the icon in the top-right corner.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'light' as const, label: 'Light', icon: Sun },
              { value: 'dark' as const, label: 'Dark', icon: Moon },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  theme === value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Website / App preferences */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          Website & app preferences
        </h2>
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => update('language', e.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Date format
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => update('dateFormat', e.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern (US)</option>
              <option value="America/Los_Angeles">Pacific (US)</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Kolkata">India (IST)</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Dashboard density
            </label>
            <select
              value={settings.dashboardDensity}
              onChange={(e) => update('dashboardDensity', e.target.value as StoredSettings['dashboardDensity'])}
              className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Controls how much content is shown per row on the dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* General / Notifications */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          General & notifications
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => update('emailNotifications', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Email notifications</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) => update('pushNotifications', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Browser push notifications</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.weeklyDigest}
              onChange={(e) => update('weeklyDigest', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Weekly digest email</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.jobAlerts}
              onChange={(e) => update('jobAlerts', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Job match alerts</span>
          </label>
        </div>
      </section>
    </div>
  )
}
