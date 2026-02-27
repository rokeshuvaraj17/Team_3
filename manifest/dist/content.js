import { scrapeJobPage } from './scraper';
const ATTR = 'data-team3-autofilled';
const JOB_SITE_PATTERNS = [
    'linkedin.com',
    'naukri.com',
    'indeed.com',
    'greenhouse.io',
    'lever.co',
    'myworkdayjobs.com',
    'glassdoor.com',
];
function isJobSite() {
    const href = window.location.href;
    return JOB_SITE_PATTERNS.some((p) => href.includes(p));
}
function injectFAB() {
    if (document.getElementById('team3-job-fab'))
        return;
    const fab = document.createElement('button');
    fab.id = 'team3-job-fab';
    fab.type = 'button';
    fab.title = 'Save job to Team 3';
    fab.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <rect x="2" y="3" width="20" height="18" rx="3"/>
      <path d="M8 7h8M8 11h8M8 15h5"/>
    </svg>
    <span>Save to Team 3</span>
  `;
    fab.addEventListener('click', () => {
        const result = scrapeJobPage();
        chrome.runtime.sendMessage({ type: 'JOB_SCRAPED', data: { ...result, url: window.location.href } }, () => {
            fab.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>Saved!</span>
        `;
            fab.classList.add('team3-fab-success');
            setTimeout(() => {
                fab.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <rect x="2" y="3" width="20" height="18" rx="3"/>
              <path d="M8 7h8M8 11h8M8 15h5"/>
            </svg>
            <span>Save to Team 3</span>
          `;
                fab.classList.remove('team3-fab-success');
            }, 2000);
        });
    });
    document.body.appendChild(fab);
}
if (isJobSite())
    injectFAB();
/** Simplify-style floating icon strip on the right: T + circle, opens side panel on click. Only in top frame. */
function injectSidebarIcons() {
    if (window !== window.top)
        return;
    if (document.getElementById('team3-sidebar-strip'))
        return;
    const strip = document.createElement('div');
    strip.id = 'team3-sidebar-strip';
    strip.className = 'team3-sidebar-strip';
    strip.setAttribute('aria-label', 'Team 3');
    strip.innerHTML = `
    <button type="button" class="team3-sidebar-icon team3-sidebar-icon-t" title="Team 3 – open side panel" aria-label="Open Team 3">
      <span class="team3-sidebar-icon-letter">T</span>
    </button>
    <button type="button" class="team3-sidebar-icon team3-sidebar-icon-circle" title="Team 3 – open side panel" aria-label="Open Team 3">
      <span class="team3-sidebar-icon-circle-svg"></span>
    </button>
  `;
    const openPanel = () => {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }, () => {
            if (chrome.runtime.lastError)
                void 0;
        });
    };
    strip.querySelector('.team3-sidebar-icon-t')?.addEventListener('click', openPanel);
    strip.querySelector('.team3-sidebar-icon-circle')?.addEventListener('click', openPanel);
    const target = document.body || document.documentElement;
    target.appendChild(strip);
}
function tryInjectSidebarIcons() {
    if (document.body) {
        injectSidebarIcons();
    }
    else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => injectSidebarIcons());
        }
        else {
            injectSidebarIcons();
        }
    }
}
tryInjectSidebarIcons();
function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
        setter.call(el, value);
    }
    else {
        el.value = value;
    }
}
function triggerInputEvents(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}
function fillField(doc, selectors, value) {
    if (!value)
        return false;
    for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.hasAttribute(ATTR)) {
            setNativeValue(el, value);
            triggerInputEvents(el);
            el.setAttribute(ATTR, '1');
            return true;
        }
    }
    return false;
}
function fillByName(doc, name, value) {
    if (!value)
        return false;
    const el = doc.querySelector(`input[name="${name}"], textarea[name="${name}"]`);
    if (el && !el.hasAttribute(ATTR)) {
        setNativeValue(el, value);
        triggerInputEvents(el);
        el.setAttribute(ATTR, '1');
        return true;
    }
    return false;
}
/** Fill a &lt;select&gt; by matching option text or value (case-insensitive partial match). */
function fillSelect(doc, nameIdPlaceholderPatterns, value) {
    if (!value)
        return false;
    const selects = Array.from(doc.querySelectorAll('select'));
    for (const sel of selects) {
        if (sel.hasAttribute(ATTR))
            continue;
        const name = (sel.getAttribute('name') || '').toLowerCase();
        const id = (sel.getAttribute('id') || '').toLowerCase();
        const placeholder = (sel.getAttribute('placeholder') || '').toLowerCase();
        const label = (sel.getAttribute('aria-label') || '').toLowerCase();
        const text = [name, id, placeholder, label].join(' ');
        const matches = nameIdPlaceholderPatterns.some((re) => re.test(text));
        if (!matches)
            continue;
        const val = value.trim().toLowerCase();
        const options = Array.from(sel.options);
        for (const opt of options) {
            const optVal = (opt.getAttribute('value') || '').trim().toLowerCase();
            const optText = (opt.textContent || '').trim().toLowerCase();
            if (optVal === val || optText === val || optText.includes(val) || optVal.includes(val)) {
                sel.value = opt.getAttribute('value') ?? opt.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                sel.dispatchEvent(new Event('input', { bubbles: true }));
                sel.setAttribute(ATTR, '1');
                return true;
            }
        }
        // Try setting by value only
        try {
            sel.value = value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            sel.setAttribute(ATTR, '1');
            return true;
        }
        catch {
            // ignore
        }
    }
    return false;
}
/** Fill date inputs (dob, birth date, etc.). */
function fillDateFields(doc, dateValue) {
    if (!dateValue)
        return false;
    const normalized = dateValue.replace(/\s+/g, '').trim();
    const patterns = [
        /dob|dateofbirth|birth\s*date|date\s*of\s*birth/i,
        /birthday|bday/i,
    ];
    let filled = false;
    doc.querySelectorAll('input[type="text"], input[type="date"], input:not([type])').forEach((el) => {
        if (el.hasAttribute(ATTR))
            return;
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        const text = [name, id, placeholder, label].join(' ');
        if (!patterns.some((re) => re.test(text)))
            return;
        setNativeValue(el, normalized);
        triggerInputEvents(el);
        el.setAttribute(ATTR, '1');
        filled = true;
    });
    return filled;
}
/** Fill textareas that look like resume or cover letter paste areas. */
function fillResumeOrCoverLetterAreas(doc, resumeText, coverLetterText) {
    const resumePatterns = [
        /resume|paste\s*(your\s*)?resume|paste\s*resume|resume\s*paste|attach\s*resume|resume\s*text/i,
        /cv\s*text|paste\s*cv|curriculum/i,
    ];
    const coverPatterns = [
        /cover\s*letter|paste\s*(your\s*)?cover|cover\s*letter\s*text|letter\s*paste/i,
        /motivation\s*letter|message\s*to\s*employer/i,
    ];
    doc.querySelectorAll('textarea').forEach((el) => {
        if (el.hasAttribute(ATTR))
            return;
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        const text = [name, id, placeholder, label].join(' ');
        if (resumeText && resumePatterns.some((re) => re.test(text))) {
            setNativeValue(el, resumeText);
            triggerInputEvents(el);
            el.setAttribute(ATTR, '1');
            return;
        }
        if (coverLetterText && coverPatterns.some((re) => re.test(text))) {
            setNativeValue(el, coverLetterText);
            triggerInputEvents(el);
            el.setAttribute(ATTR, '1');
        }
    });
}
/** Try to add skills to tag-style or multi-select inputs. */
function tryFillSkills(doc, skills) {
    if (!skills.length)
        return;
    const skillPatterns = [/skill|keyword|competenc|expertise/i];
    doc.querySelectorAll('input[type="text"]').forEach((input) => {
        const name = (input.getAttribute('name') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const label = (input.getAttribute('aria-label') || '').toLowerCase();
        const text = [name, placeholder, label].join(' ');
        if (!skillPatterns.some((re) => re.test(text)))
            return;
        if (input.hasAttribute(ATTR))
            return;
        const toAdd = skills.slice(0, 5).join(', ');
        setNativeValue(input, toAdd);
        triggerInputEvents(input);
        input.setAttribute(ATTR, '1');
    });
}
/** Show a small floating hint for file upload (resume/cover letter) with optional download link. */
function showFileUploadHint(coverLetterFileUrl) {
    const existing = document.getElementById('team3-autofill-file-hint');
    if (existing)
        existing.remove();
    const div = document.createElement('div');
    div.id = 'team3-autofill-file-hint';
    div.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483646;
    max-width: 280px; padding: 12px 14px; border-radius: 10px;
    background: #1e293b; color: #e2e8f0; font-size: 12px; font-family: system-ui, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
    div.innerHTML = coverLetterFileUrl
        ? `Resume/cover letter <strong>file uploads</strong> must be done manually. <a href="${coverLetterFileUrl}" target="_blank" rel="noopener" style="color: #93c5fd;">Download cover letter</a>`
        : 'Resume and cover letter <strong>file uploads</strong> must be done manually (e.g. from Documents).';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 8000);
}
function applyProfile(profile) {
    const doc = document;
    const d = doc;
    const firstSelectors = [
        'input[name="firstName"]',
        'input[name="first_name"]',
        'input[id="firstName"]',
        'input[id="first_name"]',
        'input[placeholder*="First"]',
    ];
    const lastSelectors = [
        'input[name="lastName"]',
        'input[name="last_name"]',
        'input[id="lastName"]',
        'input[id="last_name"]',
        'input[placeholder*="Last"]',
    ];
    const emailSelectors = [
        'input[name="email"]',
        'input[type="email"]',
        'input[id="email"]',
    ];
    const phoneSelectors = [
        'input[name="phone"]',
        'input[name="tel"]',
        'input[type="tel"]',
        'input[id="phone"]',
    ];
    fillField(d, firstSelectors, profile.firstName);
    fillField(d, lastSelectors, profile.lastName);
    fillField(d, emailSelectors, profile.email);
    fillField(d, phoneSelectors, profile.phone);
    fillByName(d, 'firstName', profile.firstName);
    fillByName(d, 'first_name', profile.firstName);
    fillByName(d, 'lastName', profile.lastName);
    fillByName(d, 'last_name', profile.lastName);
    fillByName(d, 'email', profile.email);
    fillByName(d, 'phone', profile.phone);
    if (profile.dateOfBirth)
        fillDateFields(d, profile.dateOfBirth);
    if (profile.address)
        fillByName(d, 'address', profile.address) || fillField(d, ['input[name="address"]', 'input[id="address"]'], profile.address);
    if (profile.city)
        fillByName(d, 'city', profile.city) || fillSelect(d, [/city|location\s*city/i], profile.city);
    if (profile.state)
        fillSelect(d, [/state|region|province/i], profile.state);
    if (profile.zip)
        fillByName(d, 'zip', profile.zip) || fillByName(d, 'postal', profile.zip) || fillField(d, ['input[name="zip"]', 'input[id="zipCode"]'], profile.zip);
    if (profile.linkedinUrl)
        fillField(d, ['input[name*="linkedin"]', 'input[id*="linkedin"]', 'input[placeholder*="LinkedIn"]'], profile.linkedinUrl);
    if (profile.skills?.length)
        tryFillSkills(d, profile.skills);
}
function applyFullAutofill(payload) {
    const doc = document;
    applyProfile(payload.profile);
    fillResumeOrCoverLetterAreas(doc, payload.resumeText, payload.coverLetterText);
    if (payload.profile.state)
        fillSelect(doc, [/state|region|province/i], payload.profile.state);
    if (payload.profile.city)
        fillSelect(doc, [/city|location\s*city/i], payload.profile.city);
    if (payload.skills?.length)
        tryFillSkills(doc, payload.skills);
    if (payload.coverLetterFileUrl)
        showFileUploadHint(payload.coverLetterFileUrl);
    else
        showFileUploadHint(undefined);
}
function onShortcut() {
    chrome.runtime.sendMessage({ type: 'GET_PROFILE' }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn('Team 3 extension:', chrome.runtime.lastError.message);
            return;
        }
        if (response?.error) {
            console.warn('Team 3 extension:', response.error);
            return;
        }
        if (response?.profile) {
            applyProfile(response.profile);
        }
    });
}
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        onShortcut();
    }
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'APPLY_AUTOFILL') {
        if (message.data?.profile) {
            applyFullAutofill(message.data);
        }
        else {
            onShortcut();
        }
        sendResponse({ ok: true });
        return true;
    }
});
