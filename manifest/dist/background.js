// Must match manifest/utils/api.ts. Production backend; for local use http://localhost:3000.
const API_BASE = 'https://team-3-lvlf.onrender.com';
const SIDEBAR_PREF_KEY = 'useSidebar';
async function applySidebarPreference() {
    const stored = await chrome.storage.local.get([SIDEBAR_PREF_KEY]);
    const useSidebar = stored[SIDEBAR_PREF_KEY] === true;
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: useSidebar }).catch(() => { });
}
// Default: normal popup. Sidebar only when user enables it in Account.
chrome.runtime.onInstalled.addListener(applySidebarPreference);
applySidebarPreference(); // apply saved preference when service worker loads
function splitName(name) {
    if (!name || typeof name !== 'string')
        return ['', ''];
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0)
        return ['', ''];
    if (parts.length === 1)
        return [parts[0], ''];
    return [parts[0], parts.slice(1).join(' ')];
}
// Safe sendResponse: avoid "disconnected port" / "Unchecked runtime.lastError" when sender tab is bfcached or closed
function safeSendResponse(sendResponse, response) {
    try {
        sendResponse(response);
    }
    catch {
        // port may be disconnected (e.g. tab in back/forward cache)
    }
    if (chrome.runtime.lastError)
        void 0;
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SET_USE_SIDEBAR') {
        const useSidebar = message.data?.useSidebar === true;
        let tabId = message.data?.tabId;
        chrome.storage.local.set({ [SIDEBAR_PREF_KEY]: useSidebar }).then(() => {
            chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: useSidebar }).then(() => {
                if (useSidebar) {
                    const openPanel = (tId) => {
                        chrome.sidePanel.open({ tabId: tId }).catch(() => { });
                    };
                    if (tabId) {
                        openPanel(tabId);
                    }
                    else {
                        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                            if (tabs[0]?.id)
                                openPanel(tabs[0].id);
                        });
                    }
                }
                safeSendResponse(sendResponse, undefined);
            }).catch(() => safeSendResponse(sendResponse, undefined));
        });
        return true;
    }
    if (message.type === 'OPEN_SIDE_PANEL') {
        const tabId = message.data?.tabId ?? _sender.tab?.id;
        if (tabId)
            chrome.sidePanel.open({ tabId }).catch(() => { });
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
    if (message.type === 'AUTOFILL_API') {
        const req = message.data;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}${req.path ?? ''}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': req.userId ?? '' },
                    body: JSON.stringify(req.body ?? {}),
                });
                const text = await res.text();
                let data;
                try {
                    data = text ? JSON.parse(text) : undefined;
                }
                catch {
                    data = undefined;
                }
                safeSendResponse(sendResponse, { success: res.ok, status: res.status, data });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                safeSendResponse(sendResponse, { success: false, status: 0, error: msg });
            }
        })();
        return true; // keep channel open for async sendResponse
    }
    if (message.type !== 'GET_PROFILE')
        return false;
    (async () => {
        const stored = await chrome.storage.local.get(['userId', 'user']);
        const { userId, user } = stored;
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            safeSendResponse(sendResponse, { error: msg });
        }
    })();
    return true; // keep channel open for async sendResponse
});
export {};
