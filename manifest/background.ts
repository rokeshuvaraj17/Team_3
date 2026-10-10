import type { AutofillProfile } from './types';
import { API_BASE } from './utils/api.js';

const SIDEBAR_PREF_KEY = 'useSidebar';

async function applySidebarPreference() {
  const stored = await chrome.storage.local.get([SIDEBAR_PREF_KEY]);
  const useSidebar = stored[SIDEBAR_PREF_KEY] === true;
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: useSidebar }).catch(() => {});
}

// Default: normal popup. Sidebar only when user enables it in Account.
chrome.runtime.onInstalled.addListener(applySidebarPreference);
applySidebarPreference(); // apply saved preference when service worker loads

interface StoredUser {
  userId: string;
  user: { id: string; name?: string; email?: string };
}

function splitName(name: string | undefined): [string, string] {
  if (!name || typeof name !== 'string') return ['', ''];
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return ['', ''];
  if (parts.length === 1) return [parts[0], ''];
  return [parts[0], parts.slice(1).join(' ')];
}

// Safe sendResponse: avoid "disconnected port" / "Unchecked runtime.lastError" when sender tab is bfcached or closed
function safeSendResponse(
  sendResponse: (response: { profile?: AutofillProfile; error?: string; success?: boolean } | undefined) => void,
  response: { profile?: AutofillProfile; error?: string; success?: boolean } | undefined
): void {
  try {
    sendResponse(response);
  } catch {
    // port may be disconnected (e.g. tab in back/forward cache)
  }
  if (chrome.runtime.lastError) void 0;
}

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; data?: { title?: string; company?: string; location?: string; description?: string; source?: string; url?: string; useSidebar?: boolean; tabId?: number } },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { profile?: AutofillProfile; error?: string; success?: boolean } | undefined) => void
  ) => {
    if (message.type === 'SET_USE_SIDEBAR') {
      const useSidebar = message.data?.useSidebar === true;
      let tabId = message.data?.tabId;
      chrome.storage.local.set({ [SIDEBAR_PREF_KEY]: useSidebar }).then(() => {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: useSidebar }).then(() => {
          if (useSidebar) {
            const openPanel = (tId: number) => {
              chrome.sidePanel.open({ tabId: tId }).catch(() => {});
            };
            if (tabId) {
              openPanel(tabId);
            } else {
              chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs[0]?.id) openPanel(tabs[0].id);
              });
            }
          }
          safeSendResponse(sendResponse, undefined);
        }).catch(() => safeSendResponse(sendResponse, undefined));
      });
      return true;
    }
    if (message.type === 'OPEN_SIDE_PANEL') {
      const tabId = message.data?.tabId ?? (_sender as { tab?: { id?: number } }).tab?.id;
      if (tabId) chrome.sidePanel.open({ tabId }).catch(() => {});
      safeSendResponse(sendResponse, undefined);
      return false;
    }
    if (message.type === 'JOB_SCRAPED') {
      const d = message.data;
      chrome.storage.local.set({
        jobDescription: d?.description ?? '',
        jobMeta: {
          title: d?.title ?? '',
          company: d?.company ?? '',
          location: d?.location ?? '',
          source: d?.source ?? '',
        },
      }).then(() => safeSendResponse(sendResponse, { success: true }));
      return true;
    }
    if (message.type === 'FETCH_FILE') {
      // Content scripts run under the job site's origin, so cross-origin file fetches fail there; fetch here instead.
      const url = (message.data as { url?: string } | undefined)?.url ?? '';
      (async () => {
        try {
          if (!/^https?:\/\//i.test(url)) throw new Error('Invalid URL');
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const bytes = new Uint8Array(await res.arrayBuffer());
          let bin = '';
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          safeSendResponse(sendResponse, { success: true, base64: btoa(bin), mime: res.headers.get('content-type') || 'application/pdf' } as unknown as { success?: boolean });
        } catch (err) {
          safeSendResponse(sendResponse, { success: false, error: err instanceof Error ? err.message : String(err) } as unknown as { error?: string });
        }
      })();
      return true;
    }
    if (message.type === 'AUTOFILL_API') {
      const req = message.data as unknown as { path?: string; body?: unknown; userId?: string };
      (async () => {
        try {
          const res = await fetch(`${API_BASE}${req.path ?? ''}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': req.userId ?? '' },
            body: JSON.stringify(req.body ?? {}),
          });
          const text = await res.text();
          let data: unknown;
          try {
            data = text ? JSON.parse(text) : undefined;
          } catch {
            data = undefined;
          }
          safeSendResponse(sendResponse, { success: res.ok, status: res.status, data } as unknown as { success?: boolean });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          safeSendResponse(sendResponse, { success: false, status: 0, error: msg } as unknown as { error?: string });
        }
      })();
      return true; // keep channel open for async sendResponse
    }

    if (message.type !== 'GET_PROFILE') return false;

    (async () => {
      const stored = await chrome.storage.local.get(['userId', 'user']);
      const { userId, user } = stored as Partial<StoredUser>;
      if (!userId || !user?.email) {
        safeSendResponse(sendResponse, { error: 'Not logged in. Open the extension and log in first.' });
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/profile`, {
          method: 'GET',
          headers: { 'x-user-id': userId },
        });
        const profile = res.ok ? await res.json() : null;
        const [firstName, lastName] = splitName(profile?.display_name ?? user.name);
        safeSendResponse(sendResponse, {
          profile: {
            firstName: firstName || (user.name ?? '').trim(),
            lastName,
            email: user.email ?? '',
            phone: (profile?.phone ?? '') || '',
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        safeSendResponse(sendResponse, { error: msg });
      }
    })();

    return true; // keep channel open for async sendResponse
  }
);
