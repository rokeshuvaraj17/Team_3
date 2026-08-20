// Production backend. For local testing, switch to 'http://localhost:3000'.
export const API_BASE = 'https://team-3-lvlf.onrender.com';
// export const API_BASE = 'http://localhost:3000';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  ok: boolean;
  status: number;
}

/**
 * Reusable fetch wrapper. Optionally attaches stored auth (x-user-id).
 * Handles JSON parsing and error handling.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<ApiResponse<T>> {
  const { token, ...fetchOptions } = options;
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(typeof (fetchOptions.headers as Record<string, string>) === 'object' ? (fetchOptions.headers as Record<string, string>) : {}),
  };
  if (token) {
    headers['x-user-id'] = token;
  }
  const init: RequestInit = { ...fetchOptions, headers };

  try {
    const res = await fetch(url, init);
    let data: T | undefined;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        // non-JSON response
      }
    }
    const errPayload = data as { error?: string } | undefined;
    const error = !res.ok && errPayload && typeof errPayload.error === 'string'
      ? errPayload.error
      : !res.ok ? text || `Request failed: ${res.status}` : undefined;
    return {
      data,
      error,
      ok: res.ok,
      status: res.status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 0,
      error: message,
    };
  }
}
