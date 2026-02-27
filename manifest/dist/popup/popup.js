import { apiFetch, API_BASE } from '../utils/api.js';
// Web app base URL for Job Tracker and profile edit (dev: same host, frontend port)
const FRONTEND_BASE = API_BASE.replace(/:3000\/?$/, ':5173');
import { scrapeJobPage } from '../scraper.js';
const THEME_KEY = 'team3-extension-theme';
function applyTheme(theme) {
    document.body.dataset.theme = theme;
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☾' : '☀';
    }
}
// --- DOM refs ---
const loginView = document.getElementById('loginView');
const loggedInView = document.getElementById('loggedInView');
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const statusEl = document.getElementById('status');
const profileImage = document.getElementById('profileImage');
const profileInitials = document.getElementById('profileInitials');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const logoutBtn = document.getElementById('logoutBtn');
const useSidebarCheckbox = document.getElementById('useSidebarCheckbox');
const appRoot = document.getElementById('appRoot');
const minimizeBtn = document.getElementById('minimizeBtn');
const expandBtn = document.getElementById('expandBtn');
const minimizedBar = document.getElementById('minimizedBar');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const storedKeysList = document.getElementById('storedKeysList');
const customKeyBtn = document.getElementById('customKeyBtn');
const customKeyForm = document.getElementById('customKeyForm');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('modelSelect');
const saveCustomKey = document.getElementById('saveCustomKey');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const resumeInput = document.getElementById('resumeInput');
const saveResumeBtn = document.getElementById('saveResume');
const clearResumeBtn = document.getElementById('clearResume');
const resumeStatus = document.getElementById('resumeStatus');
const resumeListBtn = document.getElementById('resumeListBtn');
const resumeCustomBtn = document.getElementById('resumeCustomBtn');
const resumeListPanel = document.getElementById('resumeListPanel');
const resumeCustomPanel = document.getElementById('resumeCustomPanel');
const resumeAccountList = document.getElementById('resumeAccountList');
const resumeAccountHint = document.getElementById('resumeAccountHint');
const resumeEditArea = document.getElementById('resumeEditArea');
const resumePreview = document.getElementById('resumePreview');
const resumePreviewText = document.getElementById('resumePreviewText');
const editResumeBtn = document.getElementById('editResume');
const scrapeBtn = document.getElementById('scrapeBtn');
const scrapeResult = document.getElementById('scrapeResult');
const jobDescriptionEl = document.getElementById('jobDescription');
const manualJD = document.getElementById('manualJD');
const saveJDBtn = document.getElementById('saveJDBtn');
const saveManualJDBtn = document.getElementById('saveManualJDBtn');
const scrapedTitle = document.getElementById('scrapedTitle');
const scrapedCompany = document.getElementById('scrapedCompany');
const scrapedLocation = document.getElementById('scrapedLocation');
const scrapedSource = document.getElementById('scrapedSource');
const generateBtn = document.getElementById('generateBtn');
const additionalNotes = document.getElementById('additionalNotes');
const toneSelect = document.getElementById('toneSelect');
const loadingIndicator = document.getElementById('loadingIndicator');
const generatedResult = document.getElementById('generatedResult');
const coverLetterOutput = document.getElementById('coverLetterOutput');
const copyResultBtn = document.getElementById('copyResult');
const regenerateBtn = document.getElementById('regenerateBtn');
const checkResume = document.getElementById('checkResume');
const checkJD = document.getElementById('checkJD');
const checkAPI = document.getElementById('checkAPI');
const updateResumeBtn = document.getElementById('updateResumeBtn');
const resumeGenerateWebBtn = document.getElementById('resumeGenerateWebBtn');
const coverLetterWebBtn = document.getElementById('coverLetterWebBtn');
const resumeJDHint = document.getElementById('resumeJDHint');
const resumeNoTextWarning = document.getElementById('resumeNoTextWarning');
const autofillBtn = document.getElementById('autofillBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const autofillResumeSelect = document.getElementById('autofillResumeSelect');
const autofillCoverLetterSelect = document.getElementById('autofillCoverLetterSelect');
const jobTrackerToggleBtn = document.getElementById('jobTrackerToggleBtn');
const jobTrackerPanel = document.getElementById('jobTrackerPanel');
const jobTrackerForm = document.getElementById('jobTrackerForm');
const jobTrackerSaveBtn = document.getElementById('jobTrackerSaveBtn');
let state = {
    resume: '',
    jobDescription: '',
    jobMeta: { title: '', company: '', location: '', source: '' },
    apiKey: '',
    model: 'gemini-2.0-flash',
    selectedApiKeyId: null,
    useCustom: true,
    storedKeys: [],
    resumeSource: 'custom',
    selectedResumeId: null,
    storedResumes: [],
    resumeView: null,
    theme: 'dark',
    autofillResumes: [],
    autofillCoverLetters: [],
    autofillResumeId: null,
    autofillCoverLetterId: null,
};
// --- Helpers ---
function showView(which) {
    loginView.classList.toggle('hidden', which !== 'login');
    loggedInView.classList.toggle('hidden', which !== 'loggedIn');
}
function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = type;
}
function getInitials(name, email) {
    if (name?.trim()) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2)
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : '?';
}
function drawDefaultIconToImageData() {
    const sizes = [19, 38];
    const result = {};
    for (const size of sizes) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const r = size / 2;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(r, r, r - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = Math.max(1, size / 12);
        ctx.stroke();
        ctx.fillStyle = '#2563eb';
        ctx.font = `bold ${Math.round(size * 0.55)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('T', r, r);
        result[size] = ctx.getImageData(0, 0, size, size);
    }
    return result;
}
async function imageUrlToIconData(url) {
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok)
            return null;
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);
        const sizes = [19, 38];
        const result = {};
        for (const size of sizes) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const s = Math.min(bitmap.width, bitmap.height);
            ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, size, size);
            result[size] = ctx.getImageData(0, 0, size, size);
        }
        bitmap.close();
        return result;
    }
    catch {
        return null;
    }
}
function setDefaultExtensionIcon() {
    chrome.action.setIcon({ imageData: drawDefaultIconToImageData() });
}
async function setExtensionIconFromProfile(profileImageUrl) {
    if (profileImageUrl?.startsWith('http')) {
        const imageData = await imageUrlToIconData(profileImageUrl);
        if (imageData) {
            chrome.action.setIcon({ imageData });
            return;
        }
    }
    setDefaultExtensionIcon();
}
function renderLoggedIn(user, profile) {
    const name = profile?.display_name?.trim() || user.name || user.email || 'User';
    const email = user.email || '';
    profileName.textContent = name;
    profileEmail.textContent = email;
    const initials = getInitials(name, email);
    if (profile?.profile_image_url) {
        profileImage.src = profile.profile_image_url;
        profileImage.alt = name;
        profileImage.style.display = 'block';
        profileInitials.style.display = 'none';
    }
    else {
        profileInitials.textContent = initials;
        profileInitials.style.display = 'flex';
        profileImage.style.display = 'none';
    }
}
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing)
        existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}
function switchToTab(tabName) {
    tabs.forEach((t) => t.classList.remove('active'));
    tabContents.forEach((tc) => tc.classList.remove('active'));
    const tab = document.querySelector(`[data-tab="${tabName}"]`);
    const content = document.getElementById(`tab-${tabName}`);
    if (tab)
        tab.classList.add('active');
    if (content)
        content.classList.add('active');
    if (tabName === 'resume') {
        showResumePanels();
        if (state.resumeView === 'list')
            loadResumeAccountList();
        else
            updateResumeUI(state.resumeView === 'custom' && !!state.resume);
    }
    if (tabName === 'autofill')
        loadAutofillLists();
    if (tabName === 'account')
        loadProfileTab();
    chrome.storage.local.set({ activeTab: tabName });
    updateChecklist();
}
async function loadAutofillLists() {
    const stored = await chrome.storage.local.get(['userId']);
    const userId = stored.userId;
    if (!autofillResumeSelect || !autofillCoverLetterSelect)
        return;
    autofillResumeSelect.innerHTML = '<option value="">None</option>';
    autofillCoverLetterSelect.innerHTML = '<option value="">None</option>';
    if (!userId)
        return;
    const [resumesRes, lettersRes] = await Promise.all([
        apiFetch('/api/resumes', { token: userId }),
        apiFetch('/api/cover-letters', { token: userId }),
    ]);
    const resumes = resumesRes.ok && Array.isArray(resumesRes.data) ? resumesRes.data : [];
    const letters = lettersRes.ok && Array.isArray(lettersRes.data) ? lettersRes.data : [];
    state.autofillResumes = resumes;
    state.autofillCoverLetters = letters;
    resumes.forEach((r) => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        autofillResumeSelect.appendChild(opt);
    });
    letters.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.title;
        autofillCoverLetterSelect.appendChild(opt);
    });
    if (state.autofillResumeId && resumes.some((r) => r.id === state.autofillResumeId)) {
        autofillResumeSelect.value = state.autofillResumeId;
    }
    if (state.autofillCoverLetterId && letters.some((c) => c.id === state.autofillCoverLetterId)) {
        autofillCoverLetterSelect.value = state.autofillCoverLetterId;
    }
}
async function loadProfileTab() {
    const profileCard = document.getElementById('profileCard');
    if (!profileCard)
        return;
    const stored = await chrome.storage.local.get(['userId', 'user']);
    const userId = stored.userId;
    const user = stored.user;
    if (!userId) {
        profileCard.classList.add('hidden');
        return;
    }
    const [profileRes, resumesRes, lettersRes] = await Promise.all([
        apiFetch('/api/profile', { token: userId }),
        apiFetch('/api/resumes', { token: userId }),
        apiFetch('/api/cover-letters', { token: userId }),
    ]);
    const profile = profileRes.ok ? profileRes.data ?? null : null;
    const resumes = resumesRes.ok && Array.isArray(resumesRes.data) ? resumesRes.data : [];
    const coverLetters = lettersRes.ok && Array.isArray(lettersRes.data) ? lettersRes.data : [];
    renderProfileTab(profile, resumes, coverLetters, user?.email ?? '');
    profileCard.classList.remove('hidden');
}
function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
        showToast('Copied!');
    }
}
function renderProfileTab(profile, resumes, coverLetters, userEmail) {
    const displayNameEl = document.getElementById('profileDisplayName');
    const refreshBtn = document.getElementById('profileRefreshBtn');
    const editLink = document.getElementById('profileEditLink');
    const avatarEl = document.getElementById('profileAvatar');
    const locationEl = document.getElementById('profileLocation');
    const emailEl = document.getElementById('profileCardEmail');
    const phoneEl = document.getElementById('profilePhone');
    const headlineEl = document.getElementById('profileHeadline');
    const summaryEl = document.getElementById('profileSummary');
    const linksSection = document.getElementById('profileLinksSection');
    const linksContainer = document.getElementById('profileLinks');
    const resumesContainer = document.getElementById('profileResumes');
    const coverLettersContainer = document.getElementById('profileCoverLetters');
    if (!displayNameEl || !avatarEl || !locationEl || !emailEl || !phoneEl || !linksContainer || !resumesContainer || !coverLettersContainer)
        return;
    const name = profile?.display_name?.trim() || 'No name';
    displayNameEl.textContent = name;
    displayNameEl.title = 'Click to copy';
    displayNameEl.onclick = () => copyToClipboard(name);
    if (refreshBtn)
        refreshBtn.onclick = () => loadProfileTab();
    if (editLink) {
        editLink.href = `${FRONTEND_BASE.replace(/\/$/, '')}/app/profile`;
        editLink.target = '_blank';
    }
    if (profile?.profile_image_url) {
        avatarEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = profile.profile_image_url;
        img.alt = name;
        avatarEl.appendChild(img);
    }
    else {
        const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
        avatarEl.innerHTML = '';
        avatarEl.textContent = initials;
    }
    const loc = profile?.location?.trim() || '';
    locationEl.textContent = loc || '—';
    locationEl.style.display = loc ? '' : 'none';
    locationEl.title = 'Click to copy';
    if (loc)
        locationEl.onclick = () => copyToClipboard(loc);
    emailEl.textContent = userEmail || '—';
    emailEl.style.display = userEmail ? '' : 'none';
    emailEl.title = 'Click to copy';
    if (userEmail)
        emailEl.onclick = () => copyToClipboard(userEmail);
    const phone = profile?.phone?.trim() || '';
    phoneEl.textContent = phone || '—';
    phoneEl.style.display = phone ? '' : 'none';
    phoneEl.title = 'Click to copy';
    if (phone)
        phoneEl.onclick = () => copyToClipboard(phone);
    if (headlineEl) {
        const headline = profile?.headline?.trim() || '';
        headlineEl.textContent = headline;
        headlineEl.classList.toggle('hidden', !headline);
        if (headline) {
            headlineEl.title = 'Click to copy';
            headlineEl.onclick = () => copyToClipboard(headline);
        }
    }
    if (summaryEl) {
        const summary = profile?.summary?.trim() || '';
        summaryEl.textContent = summary;
        summaryEl.classList.toggle('hidden', !summary);
        if (summary) {
            summaryEl.title = 'Click to copy';
            summaryEl.onclick = () => copyToClipboard(summary);
        }
    }
    const hasLinks = !!(profile?.linkedin_url?.trim() || profile?.website_url?.trim());
    if (linksSection)
        linksSection.classList.toggle('hidden', !hasLinks);
    linksContainer.innerHTML = '';
    if (profile?.linkedin_url?.trim()) {
        const a = document.createElement('a');
        a.className = 'profile-link-item';
        a.href = profile.linkedin_url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = `LinkedIn · ${profile.linkedin_url}`;
        linksContainer.appendChild(a);
    }
    if (profile?.website_url?.trim()) {
        const a = document.createElement('a');
        a.className = 'profile-link-item';
        a.href = profile.website_url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = `Website · ${profile.website_url}`;
        linksContainer.appendChild(a);
    }
    resumesContainer.innerHTML = '';
    resumes.forEach((r) => {
        const div = document.createElement('div');
        div.className = 'profile-upload-item';
        const label = document.createElement('span');
        label.textContent = r.name;
        div.appendChild(label);
        const previewLink = document.createElement('a');
        previewLink.href = '#';
        previewLink.textContent = 'Preview';
        previewLink.addEventListener('click', (e) => {
            e.preventDefault();
            const base = API_BASE.replace(/\/$/, '');
            window.open(`${base}/documents`, '_blank');
        });
        div.appendChild(previewLink);
        resumesContainer.appendChild(div);
    });
    if (resumes.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'profile-contact-line';
        empty.style.marginBottom = '8px';
        empty.textContent = 'No resumes. Add one in the web app.';
        resumesContainer.appendChild(empty);
    }
    coverLettersContainer.innerHTML = '';
    coverLetters.forEach((c) => {
        const div = document.createElement('div');
        div.className = 'profile-upload-item';
        div.innerHTML = `<span>${escapeHtml(c.title)}</span>`;
        if (c.file_url) {
            const a = document.createElement('a');
            a.href = c.file_url;
            a.target = '_blank';
            a.textContent = 'Open';
            div.appendChild(a);
        }
        coverLettersContainer.appendChild(div);
    });
    if (coverLetters.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'profile-contact-line';
        empty.style.marginBottom = '8px';
        empty.textContent = 'No cover letters.';
        coverLettersContainer.appendChild(empty);
    }
}
function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
function updateChecklist() {
    const usingStoredKey = state.selectedApiKeyId != null && !state.useCustom;
    const hasResume = (state.resumeView === 'list' && state.resumeSource === 'account' && !!state.selectedResumeId) ||
        (state.resumeView === 'custom' && !!state.resume);
    const hasJD = !!state.jobDescription;
    const hasAPI = state.selectedApiKeyId != null || (state.useCustom && !!state.apiKey);
    checkResume.classList.toggle('ready', hasResume);
    checkJD.classList.toggle('ready', hasJD);
    checkAPI.classList.toggle('ready', hasAPI);
    generateBtn.disabled = !(hasResume && hasJD && hasAPI);
    if (updateResumeBtn)
        updateResumeBtn.disabled = !(hasResume && hasJD);
    if (resumeGenerateWebBtn)
        resumeGenerateWebBtn.disabled = !(hasResume && hasJD);
    if (coverLetterWebBtn)
        coverLetterWebBtn.disabled = !(hasResume && hasJD);
    if (resumeJDHint)
        resumeJDHint.textContent = hasJD ? 'Job description loaded. You can open the website to generate a resume or cover letter.' : 'Load a job description in the Scraper tab to enable.';
}
function updateResumeUI(hasSaved) {
    if (state.resumeView === 'list' && state.resumeSource === 'account' && state.selectedResumeId) {
        const r = state.storedResumes.find((x) => x.id === state.selectedResumeId);
        resumeStatus.textContent = r ? `Account: ${r.name}` : 'Account';
        resumeStatus.classList.add('saved');
    }
    else if (state.resumeView === 'custom' && state.resume) {
        resumeStatus.textContent = hasSaved ? 'Saved (custom)' : 'Custom';
        resumeStatus.classList.add('saved');
        resumePreviewText.textContent = state.resume;
        resumePreview.classList.toggle('hidden', !hasSaved);
        resumeEditArea.classList.toggle('hidden', hasSaved);
    }
    else {
        resumeStatus.textContent = 'None selected';
        resumeStatus.classList.remove('saved');
        resumePreview.classList.add('hidden');
        resumeEditArea.classList.remove('hidden');
    }
    updateChecklist();
}
function showResumePanels() {
    if (resumeListPanel)
        resumeListPanel.classList.toggle('hidden', state.resumeView !== 'list');
    if (resumeCustomPanel)
        resumeCustomPanel.classList.toggle('hidden', state.resumeView !== 'custom');
    resumeListBtn?.classList.toggle('selected', state.resumeView === 'list');
    resumeCustomBtn?.classList.toggle('selected', state.resumeView === 'custom');
}
async function loadResumeAccountList() {
    const stored = await chrome.storage.local.get(['userId']);
    const userId = stored.userId;
    resumeAccountList.innerHTML = '';
    if (!userId) {
        resumeAccountHint.classList.remove('hidden');
        return;
    }
    resumeAccountHint.classList.add('hidden');
    const res = await apiFetch('/api/resumes', { token: userId });
    const list = res.ok && Array.isArray(res.data) ? res.data : [];
    state.storedResumes = list;
    if (list.length === 0) {
        const p = document.createElement('p');
        p.className = 'settings-desc';
        p.textContent = 'No resumes in your account. Add one in the web app or use Custom below.';
        resumeAccountList.appendChild(p);
        return;
    }
    // Keep existing selection only if it's still in the list; otherwise leave nothing selected
    const currentSelectedValid = state.selectedResumeId && list.some((r) => r.id === state.selectedResumeId);
    if (!currentSelectedValid) {
        state.selectedResumeId = null;
        state.resumeSource = 'account';
        chrome.storage.local.set({ selectedResumeId: null, resumeSource: 'account' });
    }
    updateResumeUI(false);
    list.forEach((r) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-ghost btn-full';
        if (state.resumeSource === 'account' && state.selectedResumeId === r.id)
            btn.classList.add('selected');
        const primaryBadge = r.is_primary ? '<span class="resume-primary-badge">Primary</span>' : '';
        btn.innerHTML = `${r.name}${primaryBadge}`;
        btn.dataset.resumeId = r.id;
        btn.addEventListener('click', async () => {
            state.resumeSource = 'account';
            state.selectedResumeId = r.id;
            await chrome.storage.local.set({ resumeSource: 'account', selectedResumeId: r.id });
            renderResumeListSelection();
            updateResumeUI(false);
            updateResumeNoTextWarning();
        });
        resumeAccountList.appendChild(btn);
    });
    showResumePanels();
    updateResumeNoTextWarning();
}
function renderResumeListSelection() {
    resumeAccountList.querySelectorAll('button[data-resume-id]').forEach((btn) => {
        const id = btn.getAttribute('data-resume-id');
        if (state.resumeSource === 'account' && state.selectedResumeId === id)
            btn.classList.add('selected');
        else
            btn.classList.remove('selected');
    });
}
/** Show or hide the "could not load resume text" warning when an account resume is selected. */
async function updateResumeNoTextWarning() {
    if (!resumeNoTextWarning)
        return;
    const hasAccountResume = state.resumeView === 'list' && state.resumeSource === 'account' && !!state.selectedResumeId;
    if (!hasAccountResume) {
        resumeNoTextWarning.classList.add('hidden');
        return;
    }
    const stored = await chrome.storage.local.get(['userId']);
    const userId = stored.userId;
    if (!userId) {
        resumeNoTextWarning.classList.add('hidden');
        return;
    }
    const { text, hadSelection } = await getCurrentResumeText(userId);
    if (hadSelection && !text)
        resumeNoTextWarning.classList.remove('hidden');
    else
        resumeNoTextWarning.classList.add('hidden');
}
// --- Account ---
async function loadLoggedInState() {
    const stored = await chrome.storage.local.get(['userId', 'user']);
    const { userId, user } = stored;
    if (!userId || !user?.id) {
        showView('login');
        return;
    }
    showView('loggedIn');
    const res = await apiFetch('/api/profile', { token: userId });
    const profile = res.ok ? res.data ?? null : null;
    renderLoggedIn(user, profile);
    await setExtensionIconFromProfile(profile?.profile_image_url ?? null);
}
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
        setStatus('Email and password required.', 'error');
        return;
    }
    submitBtn.disabled = true;
    setStatus('Signing in…', '');
    const res = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    if (res.ok && res.data?.success && res.data.user?.id) {
        const user = {
            id: res.data.user.id,
            name: res.data.user.name ?? '',
            email: res.data.user.email ?? email,
        };
        await chrome.storage.local.set({ userId: res.data.user.id, user });
        setStatus('Logged in.', 'success');
        const profileRes = await apiFetch('/api/profile', { token: res.data.user.id });
        const profile = profileRes.ok ? profileRes.data ?? null : null;
        showView('loggedIn');
        renderLoggedIn(user, profile);
        await setExtensionIconFromProfile(profile?.profile_image_url ?? null);
    }
    else {
        setStatus(res.error || 'Invalid email or password.', 'error');
    }
    submitBtn.disabled = false;
});
logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['userId', 'user']);
    setDefaultExtensionIcon();
    showView('login');
    setStatus('', '');
    emailInput.value = '';
    passwordInput.value = '';
});
// --- Settings ---
async function loadStoredKeys() {
    const stored = await chrome.storage.local.get(['userId']);
    const userId = stored.userId;
    storedKeysList.innerHTML = '';
    if (!userId) {
        const p = document.createElement('p');
        p.className = 'settings-desc';
        p.textContent = 'Log in to see stored API connections.';
        storedKeysList.appendChild(p);
        return;
    }
    const res = await apiFetch('/api/api-keys', { token: userId });
    const keys = res.ok && Array.isArray(res.data) ? res.data : [];
    state.storedKeys = keys;
    if (keys.length === 0) {
        const p = document.createElement('p');
        p.className = 'settings-desc';
        p.textContent = 'No API keys in your account. Add one in the web app (API Connection) or use Custom below.';
        storedKeysList.appendChild(p);
        return;
    }
    keys.forEach((k) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-ghost btn-full';
        if (state.selectedApiKeyId === k.id && !state.useCustom)
            btn.classList.add('selected');
        btn.textContent = k.label ? `${k.provider_name} — ${k.label}` : k.provider_name;
        btn.dataset.keyId = k.id;
        btn.addEventListener('click', async () => {
            state.selectedApiKeyId = k.id;
            state.useCustom = false;
            await chrome.storage.local.set({ selectedApiKeyId: k.id, useCustom: false });
            renderStoredKeyButtons();
            customKeyForm.classList.add('hidden');
            updateChecklist();
            showToast('Using stored connection.');
        });
        storedKeysList.appendChild(btn);
    });
}
function renderStoredKeyButtons() {
    storedKeysList.querySelectorAll('button[data-key-id]').forEach((btn) => {
        const id = btn.getAttribute('data-key-id');
        if (id === state.selectedApiKeyId && !state.useCustom)
            btn.classList.add('selected');
        else
            btn.classList.remove('selected');
    });
}
settingsBtn.addEventListener('click', async () => {
    settingsPanel.classList.toggle('hidden');
    if (!settingsPanel.classList.contains('hidden')) {
        await loadStoredKeys();
        customKeyForm.classList.add('hidden');
    }
});
customKeyBtn.addEventListener('click', () => {
    customKeyForm.classList.toggle('hidden');
    if (!customKeyForm.classList.contains('hidden')) {
        state.useCustom = true;
        state.selectedApiKeyId = null;
        chrome.storage.local.set({ useCustom: true, selectedApiKeyId: null });
        renderStoredKeyButtons();
        updateChecklist();
    }
});
saveCustomKey.addEventListener('click', async () => {
    state.apiKey = apiKeyInput.value.trim();
    state.model = modelSelect.value;
    state.useCustom = true;
    state.selectedApiKeyId = null;
    await chrome.storage.local.set({ apiKey: state.apiKey, model: state.model, useCustom: true, selectedApiKeyId: null });
    renderStoredKeyButtons();
    customKeyForm.classList.add('hidden');
    updateChecklist();
    showToast('Custom key saved.');
});
// --- Tabs ---
tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        if (target)
            switchToTab(target);
    });
});
// --- Resume ---
resumeListBtn.addEventListener('click', async () => {
    state.resumeView = 'list';
    await chrome.storage.local.set({ resumeView: 'list' });
    showResumePanels();
    loadResumeAccountList();
    showToast('Select a resume from the list.');
});
resumeCustomBtn.addEventListener('click', () => {
    state.resumeView = 'custom';
    chrome.storage.local.set({ resumeView: 'custom' });
    showResumePanels();
    updateResumeUI(!!state.resume);
    updateResumeNoTextWarning();
});
saveResumeBtn.addEventListener('click', async () => {
    const text = resumeInput.value.trim();
    if (!text) {
        showToast('Paste your resume first.', true);
        return;
    }
    state.resumeSource = 'custom';
    state.selectedResumeId = null;
    state.resume = text;
    await chrome.storage.local.set({ resumeSource: 'custom', selectedResumeId: null, resume: text });
    renderResumeListSelection();
    updateResumeUI(true);
    showToast('Resume saved.');
});
clearResumeBtn.addEventListener('click', async () => {
    state.resume = '';
    resumeInput.value = '';
    await chrome.storage.local.set({ resume: '' });
    updateResumeUI(false);
    showToast('Resume cleared.');
});
editResumeBtn.addEventListener('click', () => {
    resumeInput.value = state.resume;
    resumePreview.classList.add('hidden');
    resumeEditArea.classList.remove('hidden');
});
// --- Scraper ---
scrapeBtn.addEventListener('click', async () => {
    scrapeBtn.disabled = true;
    scrapeBtn.textContent = 'Scraping...';
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
            showToast('No active tab.', true);
            return;
        }
        const url = tab.url || '';
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            showToast('Cannot scrape this page. Open a job posting (e.g. LinkedIn, Indeed).', true);
            return;
        }
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapeJobPage,
        });
        const data = results?.[0]?.result;
        if (!data || results?.[0]?.exceptionDetails) {
            const msg = results?.[0]?.exceptionDetails?.exception?.description || 'Script failed. Try refreshing the job page.';
            showToast(msg, true);
            return;
        }
        if (data.error && !data.description) {
            showToast(data.error, true);
            return;
        }
        state.jobMeta = { title: data?.title ?? '', company: data?.company ?? '', location: data?.location ?? '', source: data?.source ?? '' };
        state.jobDescription = data?.description ?? '';
        await chrome.storage.local.set({ jobDescription: state.jobDescription, jobMeta: state.jobMeta });
        scrapedTitle.textContent = state.jobMeta.title || '—';
        scrapedCompany.textContent = state.jobMeta.company || '—';
        scrapedLocation.textContent = state.jobMeta.location || '—';
        scrapedSource.textContent = state.jobMeta.source || '—';
        jobDescriptionEl.value = state.jobDescription;
        scrapeResult.classList.remove('hidden');
        showToast('Scraped.');
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Scraping failed. Paste manually.';
        showToast(msg, true);
    }
    finally {
        scrapeBtn.disabled = false;
        scrapeBtn.textContent = 'Scrape This Page';
    }
});
saveJDBtn.addEventListener('click', () => {
    state.jobDescription = jobDescriptionEl.value.trim();
    chrome.storage.local.set({ jobDescription: state.jobDescription });
    updateChecklist();
    showToast('Saved. Use in Resume or Cover Letter tab.');
});
saveManualJDBtn.addEventListener('click', () => {
    const text = manualJD.value.trim();
    if (!text) {
        showToast('Paste a job description first.', true);
        return;
    }
    state.jobDescription = text;
    const prev = state.jobMeta;
    state.jobMeta = {
        title: prev?.title || '',
        company: prev?.company || '',
        location: prev?.location || '',
        source: prev?.source || 'Manual',
    };
    chrome.storage.local.set({ jobDescription: state.jobDescription, jobMeta: state.jobMeta });
    updateChecklist();
    showToast('Saved. Use in Resume or Cover Letter tab.');
});
// --- Generate ---
/** Fetch resume text by id: use html_content from list, or GET /api/resumes/:id/text (extracts from PDF if needed). */
async function getAccountResumeText(userId, resumeId) {
    const listRes = await apiFetch('/api/resumes', { token: userId });
    if (listRes.ok && Array.isArray(listRes.data)) {
        const r = listRes.data.find((x) => x.id === resumeId);
        const html = r?.html_content;
        if (html && typeof html === 'string') {
            const text = getResumeTextFromHtml(html);
            if (text)
                return text;
        }
    }
    const textRes = await apiFetch(`/api/resumes/${resumeId}/text`, { token: userId });
    if (!textRes.ok)
        return null;
    const text = typeof textRes.data?.text === 'string' ? textRes.data.text.trim() : '';
    return text.length > 0 ? text : null;
}
async function generateCoverLetter() {
    const hasStored = state.selectedApiKeyId != null && !state.useCustom;
    const hasCustom = state.useCustom && !!state.apiKey;
    const hasResume = (state.resumeView === 'list' && state.resumeSource === 'account' && !!state.selectedResumeId) ||
        (state.resumeView === 'custom' && !!state.resume);
    if (!state.jobDescription || (!hasStored && !hasCustom)) {
        showToast('Missing JD or API. Open Settings and pick a connection or add a custom key.', true);
        return;
    }
    if (!hasResume) {
        showToast('Select a resume in the Resume tab (from account or paste custom).', true);
        return;
    }
    generateBtn.classList.add('hidden');
    generatedResult.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
    const tone = toneSelect.value;
    const additional = additionalNotes.value.trim();
    const modelToUse = hasStored ? undefined : state.model;
    try {
        if (hasStored) {
            const stored = await chrome.storage.local.get(['userId']);
            const userId = stored.userId;
            if (!userId) {
                showToast('Not logged in. Use Custom key or log in.', true);
                return;
            }
            let resumeText = null;
            if (state.resumeView === 'list' && state.resumeSource === 'account' && state.selectedResumeId) {
                const fromStored = state.storedResumes.find((r) => r.id === state.selectedResumeId);
                const html = fromStored?.html_content;
                if (html && typeof html === 'string')
                    resumeText = getResumeTextFromHtml(html);
                if (!resumeText)
                    resumeText = await getAccountResumeText(userId, state.selectedResumeId);
            }
            if (!resumeText && state.resumeView === 'custom')
                resumeText = state.resume || null;
            if (!resumeText) {
                showToast('Select a resume in the Resume tab (from account or paste custom).', true);
                return;
            }
            const res = await apiFetch('/api/ai/generate-cover-letter', {
                method: 'POST',
                token: userId,
                body: JSON.stringify({
                    api_key_id: state.selectedApiKeyId,
                    resume: resumeText,
                    job_description: state.jobDescription,
                    tone,
                    model: modelToUse,
                    additional_instructions: additional || undefined,
                }),
            });
            if (!res.ok)
                throw new Error(res.error || 'Backend error');
            const text = res.data?.text;
            if (!text)
                throw new Error('No content.');
            coverLetterOutput.textContent = text;
            generatedResult.classList.remove('hidden');
            showToast('Generated.');
            return;
        }
        const jobInfo = state.jobMeta.title
            ? `Job: ${state.jobMeta.title}\nCompany: ${state.jobMeta.company}\nLocation: ${state.jobMeta.location}\n\n`
            : '';
        const prompt = `You are an expert career coach. Write a tailored cover letter.

--- RESUME ---
${state.resume}

--- JOB DESCRIPTION ---
${jobInfo}${state.jobDescription}

--- INSTRUCTIONS ---
Tone: ${tone}
${additional ? `Additional: ${additional}` : ''}

Write a cover letter that addresses the job requirements and maps the candidate's experience. Sound human, concise (250-350 words). No headers or labels. Output ONLY the letter.`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelToUse}:generateContent?key=${state.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.75, maxOutputTokens: 1024 },
            }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API ${response.status}`);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text)
            throw new Error('No content.');
        coverLetterOutput.textContent = text;
        generatedResult.classList.remove('hidden');
        showToast('Generated.');
    }
    catch (err) {
        showToast(err instanceof Error ? err.message : 'Generation failed.', true);
    }
    finally {
        loadingIndicator.classList.add('hidden');
        generateBtn.classList.remove('hidden');
    }
}
generateBtn.addEventListener('click', () => generateCoverLetter());
regenerateBtn.addEventListener('click', () => generateCoverLetter());
const WEB_APP_BASE = 'http://localhost:5173';
function getResumeTextFromHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
}
async function getCurrentResumeText(userId) {
    const hasResume = (state.resumeView === 'list' && state.resumeSource === 'account' && !!state.selectedResumeId) ||
        (state.resumeView === 'custom' && !!state.resume);
    if (!hasResume)
        return { text: null, hadSelection: false };
    if (state.resumeView === 'list' && state.resumeSource === 'account' && state.selectedResumeId) {
        const fromStored = state.storedResumes.find((r) => r.id === state.selectedResumeId);
        const html = fromStored?.html_content;
        if (html && typeof html === 'string') {
            const text = getResumeTextFromHtml(html);
            if (text)
                return { text, hadSelection: true };
        }
        const text = await getAccountResumeText(userId, state.selectedResumeId);
        return { text, hadSelection: true };
    }
    return { text: state.resumeView === 'custom' ? (state.resume || null) : null, hadSelection: false };
}
async function openJobResumeInWebsite() {
    const stored = await chrome.storage.local.get(['userId']);
    const userId = stored.userId;
    if (!userId) {
        showToast('Log in first to open in website.', true);
        return;
    }
    if (!state.jobDescription) {
        showToast('Load a job description in the Scraper tab first.', true);
        return;
    }
    const { text: resumeText, hadSelection } = await getCurrentResumeText(userId);
    if (!resumeText) {
        showToast(hadSelection ? 'Could not load resume text (e.g. scanned PDF). Use Custom resume and paste your text.' : 'Select a resume (account or paste custom) first.', true);
        return;
    }
    const res = await apiFetch('/api/extension/job-resume-context', {
        method: 'POST',
        token: userId,
        body: JSON.stringify({
            resume: resumeText,
            job_description: state.jobDescription,
            company_name: state.jobMeta?.company || '',
            job_title: state.jobMeta?.title || '',
        }),
    });
    if (!res.ok) {
        showToast(res.error || 'Failed to send context.', true);
        return;
    }
    chrome.tabs.create({ url: `${WEB_APP_BASE}/app/generate-resume/job-based?from=extension` });
    showToast('Opening website…');
}
updateResumeBtn?.addEventListener('click', openJobResumeInWebsite);
resumeGenerateWebBtn?.addEventListener('click', openJobResumeInWebsite);
coverLetterWebBtn?.addEventListener('click', async () => {
    const stored = await chrome.storage.local.get(['userId', 'jobDescription']);
    const userId = stored.userId;
    if (!userId) {
        showToast('Log in first to open in website.', true);
        return;
    }
    const jobDescription = stored.jobDescription || state.jobDescription || '';
    if (!jobDescription) {
        showToast('Load a job description in the Scraper tab first.', true);
        return;
    }
    const jobMeta = state.jobMeta;
    const { text: resumeText, hadSelection } = await getCurrentResumeText(userId);
    if (!resumeText) {
        showToast(hadSelection ? 'Could not load resume text (e.g. scanned PDF). Use Custom resume and paste your text.' : 'Select a resume (account or paste custom) first.', true);
        return;
    }
    const res = await apiFetch('/api/extension/cover-letter-context', {
        method: 'POST',
        token: userId,
        body: JSON.stringify({
            resume: resumeText,
            job_description: jobDescription,
            company_name: jobMeta?.company || '',
            job_title: jobMeta?.title || '',
        }),
    });
    if (!res.ok) {
        showToast(res.error || 'Failed to send context.', true);
        return;
    }
    chrome.tabs.create({ url: `${WEB_APP_BASE}/app/generate-cover-letter?from=extension` });
    showToast('Opening website…');
});
copyResultBtn.addEventListener('click', async () => {
    const text = coverLetterOutput.textContent || '';
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied.');
    }
    catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied.');
    }
});
// --- Init ---
async function loadState() {
    setDefaultExtensionIcon();
    const data = await chrome.storage.local.get([
        'resume',
        'apiKey',
        'model',
        'jobDescription',
        'jobMeta',
        'userId',
        'user',
        'selectedApiKeyId',
        'useCustom',
        'resumeSource',
        'selectedResumeId',
        'resumeView',
        'activeTab',
        'useSidebar',
        'sidebarMinimized',
        THEME_KEY,
        'autofillResumeId',
        'autofillCoverLetterId',
    ]);
    state.resume = data.resume || '';
    state.apiKey = data.apiKey || '';
    state.model = data.model || 'gemini-2.0-flash';
    state.selectedApiKeyId = data.selectedApiKeyId ?? null;
    state.useCustom = state.selectedApiKeyId == null && data.useCustom !== false;
    state.resumeSource = data.resumeSource === 'account' ? 'account' : 'custom';
    state.selectedResumeId = data.selectedResumeId ?? null;
    state.resumeView = data.resumeView === 'list' || data.resumeView === 'custom' ? data.resumeView : null;
    state.jobDescription = data.jobDescription || '';
    state.jobMeta = data.jobMeta || { title: '', company: '', location: '', source: '' };
    state.theme = (data[THEME_KEY] === 'light' ? 'light' : 'dark');
    applyTheme(state.theme);
    state.autofillResumeId = data.autofillResumeId || null;
    state.autofillCoverLetterId = data.autofillCoverLetterId || null;
    apiKeyInput.value = state.apiKey;
    modelSelect.value = state.model;
    if (state.resume)
        resumeInput.value = state.resume;
    jobDescriptionEl.value = state.jobDescription;
    manualJD.value = '';
    showResumePanels();
    updateResumeUI(state.resumeView === 'custom' && !!state.resume);
    updateChecklist();
    if (state.jobDescription) {
        scrapedTitle.textContent = state.jobMeta.title || '—';
        scrapedCompany.textContent = state.jobMeta.company || '—';
        scrapedLocation.textContent = state.jobMeta.location || '—';
        scrapedSource.textContent = state.jobMeta.source || '—';
        scrapeResult.classList.remove('hidden');
    }
    await loadLoggedInState();
    if (state.resumeSource === 'account' && state.selectedResumeId && state.storedResumes.length === 0 && data.userId) {
        const r = await apiFetch('/api/resumes', { token: data.userId });
        if (r.ok && Array.isArray(r.data))
            state.storedResumes = r.data;
    }
    const savedTab = data.activeTab === 'profile' ? 'account' : data.activeTab;
    if (savedTab && ['account', 'scraper', 'resume', 'generate', 'autofill'].includes(savedTab)) {
        switchToTab(savedTab);
    }
    else {
        loadProfileTab();
    }
    if (useSidebarCheckbox) {
        useSidebarCheckbox.checked = data.useSidebar === true;
        useSidebarCheckbox.addEventListener('change', onUseSidebarChange);
    }
    if (appRoot) {
        appRoot.classList.toggle('minimized', data.sidebarMinimized === true);
    }
    if (minimizeBtn)
        minimizeBtn.addEventListener('click', setSidebarMinimizedTrue);
    if (expandBtn)
        expandBtn.addEventListener('click', setSidebarMinimizedFalse);
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', async () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme(state.theme);
            await chrome.storage.local.set({ [THEME_KEY]: state.theme });
        });
    }
    if (autofillResumeSelect) {
        autofillResumeSelect.addEventListener('change', () => {
            state.autofillResumeId = autofillResumeSelect.value || null;
            chrome.storage.local.set({ autofillResumeId: state.autofillResumeId });
        });
    }
    if (autofillCoverLetterSelect) {
        autofillCoverLetterSelect.addEventListener('change', () => {
            state.autofillCoverLetterId = autofillCoverLetterSelect.value || null;
            chrome.storage.local.set({ autofillCoverLetterId: state.autofillCoverLetterId });
        });
    }
    if (autofillBtn) {
        autofillBtn.addEventListener('click', async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) {
                    showToast('No active tab.', true);
                    return;
                }
                const stored = await chrome.storage.local.get(['userId', 'user']);
                const userId = stored.userId;
                const user = stored.user;
                if (!userId || !user?.email) {
                    showToast('Log in first to use autofill.', true);
                    return;
                }
                const profileRes = await apiFetch('/api/profile', { token: userId });
                const profileData = profileRes.ok ? profileRes.data : null;
                const displayName = profileData?.display_name?.trim() || user.name || '';
                const parts = displayName.split(/\s+/).filter(Boolean);
                const firstName = parts[0] || '';
                const lastName = parts.slice(1).join(' ') || '';
                const profile = {
                    firstName,
                    lastName,
                    email: user.email ?? '',
                    phone: (profileData?.phone ?? '') || '',
                };
                let resumeText = null;
                if (state.autofillResumeId) {
                    resumeText = await getAccountResumeText(userId, state.autofillResumeId);
                }
                let coverLetterFileUrl;
                if (state.autofillCoverLetterId) {
                    const letter = state.autofillCoverLetters.find((c) => c.id === state.autofillCoverLetterId);
                    if (letter?.file_url)
                        coverLetterFileUrl = letter.file_url;
                }
                const payload = { profile, resumeText: resumeText || undefined, coverLetterFileUrl };
                const sendAutofill = () => new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(tab.id, { type: 'APPLY_AUTOFILL', data: payload }, (err) => {
                        if (chrome.runtime.lastError)
                            reject(new Error(chrome.runtime.lastError?.message));
                        else
                            resolve();
                    });
                });
                try {
                    await sendAutofill();
                }
                catch (e) {
                    const isNoReceiver = e instanceof Error &&
                        (e.message.includes('Receiving end does not exist') || e.message.includes('Could not establish connection'));
                    if (isNoReceiver) {
                        try {
                            await chrome.scripting.executeScript({
                                target: { tabId: tab.id, allFrames: true },
                                files: ['content.js'],
                            });
                            await new Promise((r) => setTimeout(r, 150));
                            await sendAutofill();
                        }
                        catch (injectErr) {
                            showToast('Refresh the job page and try again, or check that the extension can run on this site.', true);
                            return;
                        }
                    }
                    else {
                        showToast(e instanceof Error ? e.message : 'Could not talk to the page.', true);
                        return;
                    }
                }
                showToast('Autofill applied.');
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : 'Could not talk to the page.';
                showToast(msg, true);
            }
        });
    }
    // Job Tracker: inline form toggle + save
    if (jobTrackerToggleBtn && jobTrackerPanel) {
        jobTrackerToggleBtn.addEventListener('click', async () => {
            const stored = await chrome.storage.local.get(['userId', 'user']);
            const userId = stored.userId;
            const user = stored.user;
            if (!userId || !user?.email) {
                showToast('Log in first to use Job Tracker.', true);
                return;
            }
            // Optional prefill from current tab and scraped job/meta
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                const getEl = (id) => document.getElementById(id);
                const urlEl = getEl('jtUrl');
                if (urlEl && tab?.url && !urlEl.value)
                    urlEl.value = tab.url;
                const posEl = getEl('jtPosition');
                if (posEl && state.jobMeta?.title && !posEl.value)
                    posEl.value = state.jobMeta.title;
                const companyEl = getEl('jtCompany');
                if (companyEl && state.jobMeta?.company && !companyEl.value)
                    companyEl.value = state.jobMeta.company;
                const locEl = getEl('jtLocation');
                if (locEl && state.jobMeta?.location && !locEl.value)
                    locEl.value = state.jobMeta.location;
                const descEl = getEl('jtDescription');
                if (descEl && state.jobDescription && !descEl.value)
                    descEl.value = state.jobDescription;
            }
            catch {
                // ignore prefill errors
            }
            jobTrackerPanel.classList.toggle('hidden');
            if (!jobTrackerPanel.classList.contains('hidden')) {
                jobTrackerPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        });
    }
    if (jobTrackerForm && jobTrackerSaveBtn) {
        jobTrackerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const stored = await chrome.storage.local.get(['userId']);
            const userId = stored.userId;
            if (!userId) {
                showToast('Log in first to save a job.', true);
                return;
            }
            const get = (id) => document.getElementById(id)?.value ??
                '';
            const minSal = document.getElementById('jtMinSalary')?.value;
            const maxSal = document.getElementById('jtMaxSalary')?.value;
            const payload = {
                company_name: get('jtCompany').trim() || null,
                position_title: get('jtPosition').trim() || null,
                location: get('jtLocation').trim() || null,
                min_salary: minSal !== '' ? Number(minSal) : null,
                max_salary: maxSal !== '' ? Number(maxSal) : null,
                currency: get('jtCurrency') || null,
                salary_period: get('jtPeriod') || null,
                job_type: get('jtJobType') || null,
                job_description: get('jtDescription').trim() || null,
                notes: get('jtNotes').trim() || null,
                application_status: get('jtStatus') || 'not_applied',
                job_posting_url: get('jtUrl').trim() || null,
            };
            jobTrackerSaveBtn.disabled = true;
            const res = await apiFetch('/api/job-tracker', {
                method: 'POST',
                token: userId,
                body: JSON.stringify(payload),
            });
            jobTrackerSaveBtn.disabled = false;
            if (!res.ok) {
                showToast(res.error || 'Failed to save job', true);
                return;
            }
            showToast('Job saved to tracker.');
            jobTrackerForm.reset();
            jobTrackerPanel?.classList.add('hidden');
        });
    }
}
function setSidebarMinimizedTrue() {
    chrome.storage.local.set({ sidebarMinimized: true });
    if (appRoot)
        appRoot.classList.add('minimized');
}
function setSidebarMinimizedFalse() {
    chrome.storage.local.set({ sidebarMinimized: false });
    if (appRoot)
        appRoot.classList.remove('minimized');
}
function onUseSidebarChange() {
    if (!useSidebarCheckbox)
        return;
    const useSidebar = useSidebarCheckbox.checked;
    chrome.storage.local.set({ useSidebar });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        chrome.runtime.sendMessage({ type: 'SET_USE_SIDEBAR', data: { useSidebar, tabId } }).catch(() => { });
    });
}
loadState();
