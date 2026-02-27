import { useEffect, useState } from 'react'
import { getStoredUser } from '@/lib/auth'
import { apiUrl } from '@/lib/api'
import {
  KeyRound,
  Plus,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react'

const inputClass =
  'flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow'
const labelClass = 'text-sm font-medium text-slate-700 mb-1.5 block'

type Provider = {
  id: string
  slug: string
  name: string
  description?: string
  base_url?: string
}

const FALLBACK_PROVIDERS: Provider[] = [
  { id: 'openai', slug: 'openai', name: 'OpenAI', description: 'GPT-4, GPT-3.5, and other OpenAI models' },
  { id: 'gemini', slug: 'gemini', name: 'Google Gemini', description: 'Gemini Pro and other Google AI models' },
  { id: 'anthropic', slug: 'anthropic', name: 'Anthropic', description: 'Claude models' },
  { id: 'openrouter', slug: 'openrouter', name: 'OpenRouter', description: 'Unified API for many models (OpenAI, Anthropic, etc.)' },
  { id: 'groq', slug: 'groq', name: 'Groq', description: 'Fast inference (Llama, Mixtral)' },
  { id: 'together', slug: 'together', name: 'Together AI', description: 'Open-source and custom models' },
  { id: 'mistral', slug: 'mistral', name: 'Mistral AI', description: 'Mistral and Mixtral models' },
  { id: 'cohere', slug: 'cohere', name: 'Cohere', description: 'Command and embed models' },
]

type UserApiKey = {
  id: string
  provider_id: string
  provider_slug: string
  provider_name: string
  label: string | null
  is_active: boolean
  api_key_masked: string
  created_at: string
  updated_at: string
}

export function ApiConnectionPage() {
  const user = getStoredUser()
  const [providers, setProviders] = useState<Provider[]>([])
  const [keys, setKeys] = useState<UserApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [label, setLabel] = useState('')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const [provRes, keysRes] = await Promise.all([
          fetch(apiUrl('/api/api-key-providers')),
          fetch(apiUrl('/api/api-keys'), { headers: { 'x-user-id': user.id } }),
        ])
        let list: Provider[] = []
        if (provRes.ok) {
          try {
            const data = await provRes.json()
            const raw = Array.isArray(data) ? data : []
            list = raw.map((p: { id: string; slug?: string; name?: string; description?: string; base_url?: string }) => ({
              id: String(p.id),
              slug: p.slug ?? '',
              name: p.name ?? p.slug ?? 'Unknown',
              description: p.description,
              base_url: p.base_url,
            }))
          } catch {
            list = FALLBACK_PROVIDERS
          }
        }
        if (list.length === 0) list = FALLBACK_PROVIDERS
        setProviders(list)
        if (list.length && !selectedProviderId) setSelectedProviderId(list[0].id)
        if (keysRes.ok) {
          try {
            const data = await keysRes.json()
            setKeys(Array.isArray(data) ? data : [])
          } catch {
            setKeys([])
          }
        }
      } catch {
        setProviders(FALLBACK_PROVIDERS)
        if (FALLBACK_PROVIDERS.length) setSelectedProviderId(FALLBACK_PROVIDERS[0].id)
        setError('Could not load saved keys. You can still add a new API key below.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const resetForm = () => {
    setApiKeyValue('')
    setLabel('')
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !selectedProviderId || !apiKeyValue.trim()) {
      setError('Please select a provider and enter an API key.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(apiUrl('/api/api-keys'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          provider_id: selectedProviderId,
          api_key: apiKeyValue.trim(),
          label: label.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to save API key')
        return
      }
      setKeys((prev) => [
        ...prev,
        {
          id: data.id,
          provider_id: data.provider_id,
          provider_slug: data.provider_slug,
          provider_name: data.provider_name,
          label: data.label ?? null,
          is_active: data.is_active,
          api_key_masked: data.api_key_masked,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
      ])
      setSuccess('API key connected successfully.')
      resetForm()
    } catch {
      setError('Failed to save API key')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user?.id || !confirm('Remove this API key? It will no longer be used for this provider.')) return
    try {
      const res = await fetch(apiUrl(`/api/api-keys/${id}`), {
        method: 'DELETE',
        headers: { 'x-user-id': user.id },
      })
      if (res.ok || res.status === 204) {
        setKeys((prev) => prev.filter((k) => k.id !== id))
        setSuccess('API key removed.')
        setError(null)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to remove key')
      }
    } catch {
      setError('Failed to remove API key')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-slate-800">API Connection</h1>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            Connect an API key
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add your API keys to use AI models for resume and cover letter generation. Keys are stored securely and never shared.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
              <Check className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2">
            <div>
              <label htmlFor="provider" className={labelClass}>
                Provider
              </label>
              <select
                id="provider"
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className={inputClass}
                required
                aria-required="true"
              >
                <option value="">Select a provider</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.slug || 'Unknown'}
                    {p.description ? ` — ${String(p.description).slice(0, 40)}…` : ''}
                  </option>
                ))}
              </select>
              {providers.find((p) => p.id === selectedProviderId)?.description && (
                <p className="mt-1.5 text-xs text-slate-500">
                  {providers.find((p) => p.id === selectedProviderId)?.description}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="label" className={labelClass}>
                Label <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Work, Personal"
                className={inputClass}
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label htmlFor="api_key" className={labelClass}>
              API key
            </label>
            <div className="relative">
              <input
                id="api_key"
                type={showKey ? 'text' : 'password'}
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
                placeholder="Paste your API key here"
                className={`${inputClass} pr-11`}
                required
                autoComplete="off"
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Shield className="h-3.5 w-3.5" />
              Your key is stored securely and only a masked version is shown after saving.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !apiKeyValue.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {saving ? 'Connecting…' : 'Connect API key'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Connected keys</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage API keys by provider. You can have one key per provider (or use labels to store multiple).
          </p>
        </div>
        {keys.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No API keys connected yet. Add one above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left font-medium text-slate-700 px-6 py-3">Provider</th>
                  <th className="text-left font-medium text-slate-700 px-6 py-3">Label</th>
                  <th className="text-left font-medium text-slate-700 px-6 py-3">Key</th>
                  <th className="text-left font-medium text-slate-700 px-6 py-3">Status</th>
                  <th className="text-right font-medium text-slate-700 px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-medium text-slate-800">{k.provider_name}</td>
                    <td className="px-6 py-3 text-slate-600">{k.label || '—'}</td>
                    <td className="px-6 py-3 font-mono text-slate-500 text-xs">{k.api_key_masked}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          k.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {k.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(k.id)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-red-600 hover:bg-red-50"
                        aria-label={`Remove ${k.provider_name} key`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
