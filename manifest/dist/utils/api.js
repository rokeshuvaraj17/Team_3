// Production backend. For local testing, switch to 'http://localhost:3000'.
export const API_BASE = 'http://localhost:3000';
/**
 * Reusable fetch wrapper. Optionally attaches stored auth (x-user-id).
 * Handles JSON parsing and error handling.
 */
export async function apiFetch(path, options = {}) {
    const { token, ...fetchOptions } = options;
    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(typeof fetchOptions.headers === 'object' ? fetchOptions.headers : {}),
    };
    if (token) {
        headers['x-user-id'] = token;
    }
    const init = { ...fetchOptions, headers };
    try {
        const res = await fetch(url, init);
        let data;
        const text = await res.text();
        if (text) {
            try {
                data = JSON.parse(text);
            }
            catch {
                // non-JSON response
            }
        }
        const errPayload = data;
        const error = !res.ok && errPayload && typeof errPayload.error === 'string'
            ? errPayload.error
            : !res.ok ? text || `Request failed: ${res.status}` : undefined;
        return {
            data,
            error,
            ok: res.ok,
            status: res.status,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            ok: false,
            status: 0,
            error: message,
        };
    }
}
