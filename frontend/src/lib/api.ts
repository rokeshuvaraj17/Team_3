/**
 * Base URL for API requests.
 * Same-origin /api on the hosted site. A localhost API base is ignored when the
 * page is not itself on localhost, so a local .env cannot break production login.
 */
function resolveApiBase(): string {
  const raw =
    typeof import.meta.env.VITE_API_BASE_URL === 'string'
      ? import.meta.env.VITE_API_BASE_URL.trim().replace(/\/$/, '')
      : ''
  if (!raw) return ''
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const pageIsLocal = host === 'localhost' || host === '127.0.0.1'
    const apiIsLocal = /localhost|127\.0\.0\.1/.test(raw)
    if (apiIsLocal && !pageIsLocal) return ''
  }
  return raw
}

export const apiBase = resolveApiBase()

/** e.g. fetch(apiUrl('/api/health')) */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${apiBase}${p}`
}
