/**
 * Base URL for API requests.
 * In dev, use relative /api (Vite proxies to backend).
 * In production, set VITE_API_BASE_URL in .env if backend is on another origin.
 */
export const apiBase =
  typeof import.meta.env.VITE_API_BASE_URL === 'string' && import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : ''

/** e.g. fetch(apiUrl('/api/health')) */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${apiBase}${p}`
}
