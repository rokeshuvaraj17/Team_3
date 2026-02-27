const API_BASE = 'http://localhost:3000';
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
                sendResponse(undefined);
            }).catch(() => sendResponse(undefined));
        });
        return true;
    }
    if (message.type === 'OPEN_SIDE_PANEL') {
        const tabId = message.data?.tabId ?? _sender.tab?.id;
        if (tabId)
            chrome.sidePanel.open({ tabId }).catch(() => { });
        sendResponse(undefined);
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
        }).then(() => sendResponse({ success: true }));
        return true;
    }
    if (message.type !== 'GET_PROFILE')
        return false;
    (async () => {
        const stored = await chrome.storage.local.get(['userId', 'user']);
        const { userId, user } = stored;
        if (!userId || !user?.email) {
            sendResponse({ error: 'Not logged in. Open the extension and log in first.' });
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/profile`, {
                method: 'GET',
                headers: { 'x-user-id': userId },
            });
            const profile = res.ok ? await res.json() : null;
            const [firstName, lastName] = splitName(profile?.display_name ?? user.name);
            sendResponse({
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
            sendResponse({ error: msg });
        }
    })();
    return true; // keep channel open for async sendResponse
});
export {};
