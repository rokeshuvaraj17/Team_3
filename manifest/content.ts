import type { AutofillProfile, AutofillPayload } from './types';
import { scrapeJobPage } from './scraper';

const ATTR = 'data-team3-autofilled';
const DATA_UPLOADED = 'data-team3-uploaded';

type TablePayload = { fields: Record<string, string>; excluded: string[]; userId?: string; apiBase?: string; api_key_id?: string | null; resumeText?: string; coverLetterText?: string; resumeFileUrl?: string };

// Safe sendResponse: avoid "Unchecked runtime.lastError" when tab is bfcached or port closed
function safeSendResponse(
  sendResponse: (r?: object) => void,
  response: object
): void {
  try {
    sendResponse(response);
  } catch {
    // ignore if channel already closed
  }
  if (chrome.runtime.lastError) void 0; // consume so Chrome doesn't log "Unchecked runtime.lastError"
}

// Register autofill listener first so popup can always reach us (even if later code throws)
chrome.runtime.onMessage.addListener((message: { type?: string; data?: AutofillPayload }, _sender, sendResponse) => {
  if (message?.type === 'APPLY_AUTOFILL') {
    if (message.data?.fields && Array.isArray(message.data.excluded)) {
      applyAutofillEngineRef(message.data as TablePayload);
    } else if (message.data && (message.data.resumeText !== undefined || message.data.profile !== undefined)) {
      applyFullAutofillRef(message.data);
    } else {
      onShortcutRef();
    }
    safeSendResponse(sendResponse, { ok: true });
    return true;
  }
  return false;
});

// Refs set below so listener can stay at top
let applyAutofillEngineRef: (payload: TablePayload) => void = () => {};
let applyFullAutofillRef: (payload: AutofillPayload) => void = () => {};
let onShortcutRef: () => void = () => {};

const JOB_SITE_PATTERNS = [
  'linkedin.com',
  'naukri.com',
  'indeed.com',
  'greenhouse.io',
  'lever.co',
  'myworkdayjobs.com',
  'glassdoor.com',
];

function isJobSite(): boolean {
  const host = window.location.hostname.toLowerCase();
  return JOB_SITE_PATTERNS.some((p) => host === p || host.endsWith('.' + p));
}

function injectFAB(): void {
  if (document.getElementById('team3-job-fab')) return;
  const fab = document.createElement('button');
  fab.id = 'team3-job-fab';
  fab.type = 'button';
  fab.title = 'Save job to MR_Rokesh Job Portal';
  fab.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <rect x="2" y="3" width="20" height="18" rx="3"/>
      <path d="M8 7h8M8 11h8M8 15h5"/>
    </svg>
    <span>Save to MR_Rokesh Job Portal</span>
  `;
  const FAB_ICON = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <rect x="2" y="3" width="20" height="18" rx="3"/>
      <path d="M8 7h8M8 11h8M8 15h5"/>
    </svg>
    <span>Save to MR_Rokesh Job Portal</span>
  `;
  const CHECK_ICON = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  `;
  const flash = (label: string, ok: boolean): void => {
    fab.innerHTML = `${CHECK_ICON}<span>${label}</span>`;
    fab.classList.toggle('team3-fab-success', ok);
    setTimeout(() => {
      fab.innerHTML = FAB_ICON;
      fab.classList.remove('team3-fab-success');
    }, 2000);
  };
  fab.addEventListener('click', () => {
    const result = scrapeJobPage();
    if (!result.description) {
      flash("Couldn't read this job", false);
      return;
    }
    chrome.runtime.sendMessage(
      { type: 'JOB_SCRAPED', data: { ...result, url: window.location.href } },
      () => {
        if (chrome.runtime.lastError) {
          flash('Save failed - reload page', false);
          return;
        }
        flash('Saved!', true);
      }
    );
  });
  document.body.appendChild(fab);
}

try {
  if (isJobSite()) injectFAB();
} catch (e) {
  console.warn('MR_Rokesh Job Portal extension: injectFAB failed', e);
}

/** Simplify-style floating icon strip on the right: T + circle, opens side panel on click. Only in top frame. */
function injectSidebarIcons(): void {
  if (window !== window.top) return;
  if (document.getElementById('team3-sidebar-strip')) return;
  const strip = document.createElement('div');
  strip.id = 'team3-sidebar-strip';
  strip.className = 'team3-sidebar-strip';
  strip.setAttribute('aria-label', 'MR_Rokesh Job Portal');
  strip.innerHTML = `
    <button type="button" class="team3-sidebar-icon team3-sidebar-icon-t" title="MR_Rokesh Job Portal – open side panel" aria-label="Open MR_Rokesh Job Portal">
      <span class="team3-sidebar-icon-letter">M</span>
    </button>
    <button type="button" class="team3-sidebar-icon team3-sidebar-icon-circle" title="MR_Rokesh Job Portal – open side panel" aria-label="Open MR_Rokesh Job Portal">
      <span class="team3-sidebar-icon-circle-svg"></span>
    </button>
  `;
  const openPanel = (): void => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }, () => {
      if (chrome.runtime.lastError) void 0;
    });
  };
  strip.querySelector('.team3-sidebar-icon-t')?.addEventListener('click', openPanel);
  strip.querySelector('.team3-sidebar-icon-circle')?.addEventListener('click', openPanel);
  const target = document.body || document.documentElement;
  target.appendChild(strip);
}

function tryInjectSidebarIcons(): void {
  if (document.body) {
    injectSidebarIcons();
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => injectSidebarIcons());
    } else {
      injectSidebarIcons();
    }
  }
}

try {
  tryInjectSidebarIcons();
} catch (e) {
  console.warn('MR_Rokesh Job Portal extension: tryInjectSidebarIcons failed', e);
}

/** React-safe: use native value setter so frameworks see the change. Never assign element.value directly. */
function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }
}

function triggerInputEvents(el: HTMLInputElement | HTMLTextAreaElement): void {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
}

// --- Table-based autofill engine (GET /api/autofill: user_autofill.data + custom_pairs, excluded_field_keys) ---
function normalize(str: string): string {
  return str.toLowerCase().replace(/[_\-\s]/g, '');
}

function getFieldMeta(el: Element, doc: Document): string {
  let label = '';
  if (el.id) {
    try {
      const labelEl = doc.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`);
      label = (labelEl?.innerText ?? '').trim();
    } catch {
      // id may contain characters that break selector
    }
  }
  const parts = [
    (el as HTMLInputElement).name,
    el.id,
    (el as HTMLInputElement).placeholder,
    el.getAttribute('aria-label'),
    el.getAttribute('data-automation-id'),
    label,
  ].filter(Boolean) as string[];
  // Normalize each part separately and keep a space between them so whole-token matching works.
  return parts.map(normalize).filter(Boolean).join(' ');
}

const FIELD_SYNONYMS: Record<string, string[]> = {
  zip_code: ['zip', 'zipcode', 'postal', 'postalcode', 'postalcode'],
  phone: ['phone', 'mobile', 'contactnumber', 'telephone', 'tel'],
  first_name: ['firstname', 'givenname', 'first'],
  last_name: ['lastname', 'surname', 'familyname', 'family', 'last'],
  work_authorization: ['workauthorization', 'legallyauthorized', 'authorizedtowork'],
  email: ['email', 'e-mail', 'emailaddress'],
  address_line1: ['address', 'street', 'addressline1'],
  city: ['city', 'town'],
  state: ['state', 'region', 'province'],
  country: ['country', 'nation'],
  date_of_birth: ['dob', 'dateofbirth', 'birthdate'],
  current_job_title: ['jobtitle', 'currenttitle', 'position'],
  current_company: ['company', 'employer', 'organization', 'company name'],
};

/** US state name → abbreviation for Workday-style "VA - Virginia" options. */
const STATE_ABBREV: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN',
  iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA',
  michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};

function normalizeState(value: string): string {
  const v = value.trim();
  if (!v) return v;
  const lower = v.toLowerCase();
  if (STATE_ABBREV[lower]) return STATE_ABBREV[lower];
  if (v.length === 2) return v.toUpperCase();
  return v;
}

/**
 * Match a field's metadata (space-separated normalized parts) to a user-data key.
 * Whole-part matches win over substring matches, and longer tokens win over shorter ones,
 * so an "Email address" field is never filled with the street address.
 */
function findMatchingKey(meta: string, fields: Record<string, string>): string | null {
  const parts = meta.split(' ').filter(Boolean);
  const candidates: { token: string; key: string }[] = [];
  for (const key of Object.keys(fields)) {
    candidates.push({ token: normalize(key), key });
    for (const syn of FIELD_SYNONYMS[key] ?? []) candidates.push({ token: normalize(syn), key });
  }
  candidates.sort((a, b) => b.token.length - a.token.length);
  for (const c of candidates) if (c.token && parts.includes(c.token)) return c.key;
  for (const c of candidates) if (c.token.length >= 5 && meta.includes(c.token)) return c.key;
  return null;
}

/** Normalize value for the field type (phone digits-only, zip digits, number inputs, etc.). */
function normalizeValueForField(el: Element, key: string, value: string, meta: string): string {
  if (value == null || (typeof value !== 'string' && typeof value !== 'number')) return String(value ?? '');
  const str = String(value).trim();
  if (!str) return str;
  const type = (el as HTMLInputElement).type || '';
  const metaLower = meta.toLowerCase();

  if (metaLower.includes('phone') || type === 'tel') {
    const digits = str.replace(/\D/g, '');
    if (digits.length > 10) return digits.slice(-10);
    return digits;
  }
  if (metaLower.includes('zip') || metaLower.includes('postal')) {
    // Only strip separators from purely numeric codes; keep alphanumeric ones (UK, CA) intact.
    return /^[\d\s-]+$/.test(str) ? str.replace(/\D/g, '') : str;
  }
  if (type === 'number') {
    return str.replace(/[^\d.]/g, '');
  }
  return str;
}

/** Try alternative formats when validation fails (e.g. phone digits-only, last 10). */
function retryWithAlternativeFormatting(
  el: HTMLInputElement | HTMLTextAreaElement,
  rawValue: string,
  _key: string,
  meta: string
): void {
  const metaLower = meta.toLowerCase();
  let next = '';
  if (metaLower.includes('phone') || (el as HTMLInputElement).type === 'tel') {
    const digits = rawValue.replace(/\D/g, '');
    next = digits.length > 10 ? digits.slice(-10) : digits;
  } else if ((metaLower.includes('zip') || metaLower.includes('postal')) && /^[\d\s-]+$/.test(rawValue.trim())) {
    next = rawValue.replace(/\D/g, '');
  }
  if (!next) return;
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, next);
  else el.value = next;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
}

const semanticCache: Record<string, string | null> = {};

/**
 * Route backend calls through the background service worker so requests use the
 * extension origin (which the backend allows) instead of the job site's page
 * origin. This avoids CORS failures when autofilling on third-party sites.
 */
async function autofillApi<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  userId: string
): Promise<{ ok: boolean; status: number; data: T | null }> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'AUTOFILL_API', data: { path, body, userId } }, (resp) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, status: 0, data: null });
          return;
        }
        const r = resp as { success?: boolean; status?: number; data?: T } | undefined;
        resolve({ ok: !!r?.success, status: r?.status ?? 0, data: (r?.data ?? null) as T | null });
      });
    } catch {
      resolve({ ok: false, status: 0, data: null });
    }
  });
}

async function semanticMatch(
  meta: string,
  availableKeys: string[],
  apiBase: string,
  userId: string,
  apiKeyId?: string | null
): Promise<string | null> {
  const cacheKey = `${window.location.hostname}:${meta}`;
  if (cacheKey in semanticCache) return semanticCache[cacheKey];
  try {
    const body: { fieldMeta: string; availableKeys: string[]; api_key_id?: string } = { fieldMeta: meta, availableKeys };
    if (apiKeyId) body.api_key_id = apiKeyId;
    const { data } = await autofillApi<{ matchedKey?: string }>('/api/autofill/semantic-match', body, userId);
    const json = data ?? {};
    const matched = json?.matchedKey && availableKeys.includes(json.matchedKey) ? json.matchedKey : null;
    semanticCache[cacheKey] = matched;
    return matched;
  } catch {
    semanticCache[cacheKey] = null;
    return null;
  }
}

async function semanticOptionMatch(
  fieldLabel: string,
  value: string,
  options: string[],
  apiBase: string,
  userId: string,
  apiKeyId?: string | null
): Promise<string | null> {
  const cacheKey = `${window.location.hostname}:opt:${fieldLabel}:${value}`;
  if (cacheKey in semanticCache) return semanticCache[cacheKey];
  try {
    const body: { fieldLabel: string; value: string; options: string[]; api_key_id?: string } = { fieldLabel, value, options };
    if (apiKeyId) body.api_key_id = apiKeyId;
    const { data } = await autofillApi<{ bestOption?: string }>('/api/autofill/semantic-option-match', body, userId);
    const json = data ?? {};
    const best = json?.bestOption && options.includes(json.bestOption) ? json.bestOption : null;
    semanticCache[cacheKey] = best;
    return best;
  } catch {
    semanticCache[cacheKey] = null;
    return null;
  }
}

function getFieldType(el: Element): string {
  const tag = el.tagName.toUpperCase();
  const role = el.getAttribute('role') || '';
  const type = (el as HTMLInputElement).type || '';
  if (tag === 'SELECT') return 'select';
  if (role === 'combobox' || el.closest('[role="combobox"]')) return 'combobox';
  if (type === 'radio') return 'radio';
  if (type === 'checkbox') return 'checkbox';
  if (type === 'tel') return 'tel';
  if (type === 'email') return 'email';
  return 'text';
}

// Logs include the user's personal values on third-party pages; keep off outside local debugging.
const AUTOFILL_DEBUG = false;

/** Call API with form field descriptors + user data; get back values and fill. Uses AI so matching is not exact. */
let apiMatchUnavailable = false;

async function runAutofillEngineViaAPI(payload: TablePayload, root: Document | ShadowRoot): Promise<boolean> {
  if (apiMatchUnavailable) return false;
  const doc = root instanceof Document ? root : (root.getRootNode() as Document);
  const apiBase = payload.apiBase;
  const userId = payload.userId ?? '';
  if (!apiBase || !userId) return false;

  const allFields = Array.from(root.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='image']), textarea, select, [role='combobox']"));
  const elements = allFields.filter((el) => !el.hasAttribute(ATTR));
  if (elements.length === 0) {
    if (AUTOFILL_DEBUG) console.log('[MR_Rokesh Job Portal Autofill] No unfilled fields found (all may already have data-team3-autofilled).');
    return true;
  }

  const fields = elements.map((el) => ({
    meta: getFieldMeta(el, doc),
    type: getFieldType(el),
  }));

  if (AUTOFILL_DEBUG) {
    console.log('[MR_Rokesh Job Portal Autofill] Sending to API:', elements.length, 'fields. Metas (in order):', fields.map((f, i) => `${i + 1}. "${f.meta}" (${f.type})`));
  }

  try {
    const body: { fields: { meta: string; type: string }[]; userData: Record<string, string>; excluded: string[]; api_key_id?: string; resumeText?: string; coverLetterText?: string; includeDebug?: boolean } = {
      fields,
      userData: payload.fields,
      excluded: payload.excluded,
      includeDebug: AUTOFILL_DEBUG,
    };
    if (payload.api_key_id) body.api_key_id = payload.api_key_id;
    if (payload.resumeText && payload.resumeText.trim()) body.resumeText = payload.resumeText.trim();
    if (payload.coverLetterText && payload.coverLetterText.trim()) body.coverLetterText = payload.coverLetterText.trim();
    const { status, data: respData } = await autofillApi<{ values?: string[]; fallback?: boolean; debug?: unknown; error?: string }>('/api/autofill/match-fields', body, userId);
    const json = (respData ?? {}) as { values?: string[]; fallback?: boolean; debug?: unknown; error?: string };
    const values: string[] = Array.isArray(json?.values) ? json.values : [];
    const useFallback = json?.fallback === true;

    if (AUTOFILL_DEBUG) {
      console.log('[MR_Rokesh Job Portal Autofill] API status:', status, '| values count:', values.length, '| expected:', elements.length, useFallback ? '| fallback requested' : '');
      console.log('[MR_Rokesh Job Portal Autofill] Values returned:', values.map((v, i) => `${i + 1}. ${v === '' ? '(empty)' : `"${String(v).slice(0, 50)}${String(v).length > 50 ? '…' : ''}"`}`));
      if (json?.debug) console.log('[MR_Rokesh Job Portal Autofill] Debug from server:', json.debug);
      if (json?.error) console.log('[MR_Rokesh Job Portal Autofill] API message:', json.error);
    }

    if (useFallback || values.length !== elements.length) {
      if (AUTOFILL_DEBUG && useFallback) console.log('[MR_Rokesh Job Portal Autofill] Using client-side fill (API returned fallback).');
      if (values.length !== elements.length && !useFallback) {
        if (AUTOFILL_DEBUG) console.warn('[MR_Rokesh Job Portal Autofill] Length mismatch: API returned', values.length, 'values for', elements.length, 'fields.');
      }
      apiMatchUnavailable = true;
      return false;
    }

    // Mark every field in this batch as handled so later DOM mutations don't re-send them to the AI.
    elements.forEach((el) => el.setAttribute(ATTR, '1'));

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const rawValue = values[i];
      const meta = fields[i].meta;
      if (rawValue == null || (typeof rawValue === 'string' && !rawValue.trim() && rawValue !== '0')) {
        if (AUTOFILL_DEBUG) console.log('[MR_Rokesh Job Portal Autofill] Skip', i + 1, 'meta="' + meta + '" (empty value)');
        continue;
      }
      const cleanedValue = normalizeValueForField(el, '', rawValue, meta);
      const isStateLike = meta.includes('state') || meta.includes('region') || meta.includes('province');
      const valueToFill = isStateLike ? normalizeState(rawValue) || cleanedValue : cleanedValue;
      if (!valueToFill && valueToFill !== '0') {
        if (AUTOFILL_DEBUG) console.log('[MR_Rokesh Job Portal Autofill] Skip', i + 1, 'meta="' + meta + '" (normalized to empty)');
        continue;
      }
      await fillFieldByType(el, String(valueToFill), doc);
      el.setAttribute(ATTR, '1');
      if (AUTOFILL_DEBUG) console.log('[MR_Rokesh Job Portal Autofill] Filled', i + 1, 'meta="' + meta + '" with', '"' + String(valueToFill).slice(0, 40) + (String(valueToFill).length > 40 ? '…' : '') + '"');
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        setTimeout(() => {
          if (input.classList.contains('error') || input.getAttribute('aria-invalid') === 'true') {
            retryWithAlternativeFormatting(input, rawValue, '', meta);
          }
        }, 500);
      }
    }
    return true;
  } catch (err) {
    if (AUTOFILL_DEBUG) console.error('[MR_Rokesh Job Portal Autofill] API or fill error:', err);
    return false;
  }
}

/** React-safe: set value via descriptor setter, then dispatch input/change/blur. */
function setNativeValueAndTrigger(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = Object.getPrototypeOf(element);
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();
}

/** Pick the best option: exact text/value, then whole-word match, then substring (never the blank placeholder). */
function pickOption(options: HTMLOptionElement[], value: string): HTMLOptionElement | null {
  const val = value.toLowerCase().trim();
  if (!val) return null;
  const text = (o: HTMLOptionElement) => (o.textContent || '').trim().toLowerCase();
  const usable = options.filter((o) => o.value !== '' || text(o) !== '');
  const exact = usable.find((o) => text(o) === val || (o.value || '').trim().toLowerCase() === val);
  if (exact) return exact;
  const word = new RegExp('(^|[^a-z0-9])' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)', 'i');
  const wordMatch = usable.find((o) => word.test(text(o)));
  if (wordMatch) return wordMatch;
  return usable.find((o) => o.value !== '' && text(o).includes(val)) ?? null;
}

/** Returns true if a matching option was found and set. */
function fillSelectEngine(select: HTMLSelectElement, value: string): boolean {
  const options = Array.from(select.options);
  if (select.multiple) {
    const toSelect = value.split(/[,;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    options.forEach((opt) => {
      const optVal = (opt.value || opt.textContent || '').trim().toLowerCase();
      const match = toSelect.some((v) => optVal === v || optVal.includes(v) || (opt.textContent || '').toLowerCase().includes(v));
      opt.selected = match;
    });
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  const match = pickOption(options, value);
  if (match) {
    select.value = match.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
}

function fillRadioEngine(name: string, value: string, doc: Document): void {
  const radios = Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter((r) => r.name === name);
  const valLower = value.toLowerCase().trim();
  if (!valLower) return;
  const labelOf = (r: HTMLInputElement) => (r.labels?.[0]?.textContent || '').trim().toLowerCase();
  const candidates = (r: HTMLInputElement) => [(r.value || '').trim().toLowerCase(), labelOf(r)].filter(Boolean);
  const match =
    radios.find((r) => candidates(r).some((c) => c === valLower)) ??
    radios.find((r) => candidates(r).some((c) => new RegExp('(^|[^a-z0-9])' + valLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)').test(c)));
  if (match) {
    match.checked = true;
    match.dispatchEvent(new Event('change', { bubbles: true }));
    match.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function fillCheckboxEngine(checkbox: HTMLInputElement, value: string | boolean): void {
  const shouldCheck =
    value === true ||
    (typeof value === 'string' && (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true' || value.trim() === '1'));
  if (shouldCheck) {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/** Workday-style combobox: role="combobox" (often input inside div), dynamic listbox with role="option". */
async function fillWorkdayCombobox(el: HTMLElement, value: string): Promise<void> {
  const combobox = el.getAttribute('role') === 'combobox' ? el : el.closest<HTMLElement>('[role="combobox"]') || el;
  if (!combobox) return;
  combobox.click();
  await new Promise((r) => setTimeout(r, 400));
  let listbox = document.querySelector('[role="listbox"]');
  if (!listbox) {
    await new Promise((r) => setTimeout(r, 300));
    listbox = document.querySelector('[role="listbox"]');
  }
  if (!listbox) return;
  const options = Array.from(listbox.querySelectorAll('[role="option"]'));
  const valLower = value.toLowerCase().trim();
  const read = (o: Element) => ({
    text: ((o as HTMLElement).textContent || '').trim().toLowerCase(),
    dataVal: (o.getAttribute('data-value') || o.getAttribute('value') || '').trim().toLowerCase(),
  });
  // Exact match first, then substring; blank options must never match.
  const target =
    options.find((o) => { const r = read(o); return r.text === valLower || r.dataVal === valLower; }) ??
    options.find((o) => { const r = read(o); return (r.text && r.text.includes(valLower)) || (r.dataVal && r.dataVal.includes(valLower)); });
  (target as HTMLElement | undefined)?.click();
}

function isCombobox(el: Element): boolean {
  return el.getAttribute('role') === 'combobox' || !!el.closest('[role="combobox"]');
}

async function fillFieldByType(
  el: Element,
  value: string,
  doc: Document
): Promise<void> {
  if (!value && value !== '0') return;
  const tag = el.tagName.toUpperCase();
  const type = (el as HTMLInputElement).type || '';

  if (tag === 'SELECT') {
    fillSelectEngine(el as HTMLSelectElement, value);
    return;
  }
  if (type === 'radio') {
    const name = (el as HTMLInputElement).name;
    if (name) fillRadioEngine(name, value, doc);
    return;
  }
  if (type === 'checkbox') {
    fillCheckboxEngine(el as HTMLInputElement, value);
    return;
  }
  if (isCombobox(el)) {
    const combobox = (el.getAttribute('role') === 'combobox' ? el : el.closest('[role="combobox"]') || el) as HTMLElement;
    await fillWorkdayCombobox(combobox, value);
    return;
  }
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'image') return;
    setNativeValueAndTrigger(input, value);
  }
}

let lastTablePayload: TablePayload | null = null;
let autofillMutationObserver: MutationObserver | null = null;
let autofillDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const AUTOFILL_DEBOUNCE_MS = 500;

function isWorkdayOrMultiStepApply(): boolean {
  const h = window.location.hostname.toLowerCase();
  return h.includes('myworkdayjobs') || h.includes('workday.com') || h.includes('greenhouse.io') || h.includes('lever.co');
}

async function runAutofillEngine(payload: TablePayload, root: Document | ShadowRoot): Promise<void> {
  const doc = root instanceof Document ? root : (root.getRootNode() as Document);
  const allFields = Array.from(root.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='image']), textarea, select, [role='combobox']"));
  for (const el of allFields) {
    if (el.hasAttribute(ATTR)) continue;
    const meta = getFieldMeta(el, doc);
    const matchKey = findMatchingKey(meta, payload.fields);
    if (!matchKey || payload.excluded.includes(matchKey)) continue;
    const rawValue = payload.fields[matchKey];
    if (rawValue == null || (typeof rawValue === 'string' && !rawValue.trim() && rawValue !== '0')) continue;
    let cleanedValue = normalizeValueForField(el, matchKey, rawValue, meta);
    if (matchKey === 'state') cleanedValue = normalizeState(rawValue) || cleanedValue;
    if (!cleanedValue && cleanedValue !== '0') continue;
    await fillFieldByType(el, String(cleanedValue), doc);
    el.setAttribute(ATTR, '1');
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      setTimeout(() => {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        if (input.classList.contains('error') || input.getAttribute('aria-invalid') === 'true') {
          retryWithAlternativeFormatting(input, rawValue, matchKey, meta);
        }
      }, 500);
    }
  }
}

async function runAutofillEngineAsync(payload: TablePayload, root: Document | ShadowRoot): Promise<void> {
  const doc = root instanceof Document ? root : (root.getRootNode() as Document);
  const allFields = Array.from(root.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='image']), textarea, select, [role='combobox']"));
  const apiBase = payload.apiBase;
  const userId = payload.userId ?? '';

  for (const el of allFields) {
    if (el.hasAttribute(ATTR)) continue;
    const meta = getFieldMeta(el, doc);
    let matchKey = findMatchingKey(meta, payload.fields);
    if (!matchKey && meta.length > 4 && apiBase && userId) {
      const keys = Object.keys(payload.fields);
      if (keys.length) matchKey = (await semanticMatch(meta, keys, apiBase, userId, payload.api_key_id)) ?? null;
    }
    if (!matchKey || payload.excluded.includes(matchKey)) continue;
    const rawValue = payload.fields[matchKey];
    if (rawValue == null || (typeof rawValue === 'string' && !rawValue.trim() && rawValue !== '0')) continue;
    let cleanedValue = normalizeValueForField(el, matchKey, rawValue, meta);
    if (matchKey === 'state') cleanedValue = normalizeState(rawValue) || cleanedValue;
    if (!cleanedValue && cleanedValue !== '0') continue;

    if (el.tagName === 'SELECT') {
      const select = el as HTMLSelectElement;
      let filled = fillSelectEngine(select, String(cleanedValue));
      if (!filled && apiBase && userId) {
        const options = Array.from(select.options).map((o) => (o.textContent || o.value || '').trim()).filter(Boolean);
        if (options.length >= 2) {
          const bestOption = await semanticOptionMatch(meta, String(cleanedValue), options, apiBase, userId, payload.api_key_id);
          if (bestOption) filled = fillSelectEngine(select, bestOption);
        }
      }
      if (filled) el.setAttribute(ATTR, '1');
      continue;
    }

    await fillFieldByType(el, String(cleanedValue), doc);
    el.setAttribute(ATTR, '1');
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      setTimeout(() => {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        if (input.classList.contains('error') || input.getAttribute('aria-invalid') === 'true') {
          retryWithAlternativeFormatting(input, rawValue, matchKey, meta);
        }
      }, 500);
    }
  }
}

function scheduleEngineRun(): void {
  if (autofillDebounceTimer) clearTimeout(autofillDebounceTimer);
  autofillDebounceTimer = setTimeout(() => {
    autofillDebounceTimer = null;
    if (!lastTablePayload) return;
    if (lastTablePayload.apiBase && lastTablePayload.userId) {
      runAutofillEngineViaAPI(lastTablePayload, document).then((ok) => {
        if (!ok) runAutofillEngineAsync(lastTablePayload!, document).then(() => {});
      });
    } else {
      runAutofillEngine(lastTablePayload, document).then(() => {});
    }
    if (lastTablePayload.resumeFileUrl) {
      setTimeout(() => runResumeUploadAndFallback(document, lastTablePayload!.resumeFileUrl!), 600);
    }
  }, AUTOFILL_DEBOUNCE_MS);
}

function applyAutofillEngine(payload: TablePayload): void {
  lastTablePayload = payload;
  apiMatchUnavailable = false;
  if (autofillMutationObserver) {
    autofillMutationObserver.disconnect();
    autofillMutationObserver = null;
  }
  if (autofillDebounceTimer) {
    clearTimeout(autofillDebounceTimer);
    autofillDebounceTimer = null;
  }
  if (payload.apiBase && payload.userId) {
    runAutofillEngineViaAPI(payload, document).then((ok) => {
      if (!ok) runAutofillEngineAsync(payload, document).then(() => {});
    });
  } else {
    runAutofillEngine(payload, document).then(() => {});
  }
  const observer = new MutationObserver(() => {
    if (!lastTablePayload) return;
    scheduleEngineRun();
  });
  autofillMutationObserver = observer;
  const target = document.body || document.documentElement;
  if (target) observer.observe(target, { childList: true, subtree: true });
  const keepAliveMs = isWorkdayOrMultiStepApply() ? 10 * 60 * 1000 : 15000;
  setTimeout(() => {
    if (autofillMutationObserver === observer) {
      observer.disconnect();
      autofillMutationObserver = null;
    }
  }, keepAliveMs);

  if (payload.resumeFileUrl) {
    setTimeout(() => runResumeUploadAndFallback(document, payload.resumeFileUrl!), 500);
  }
}

function fillField(
  doc: Document,
  selectors: string[],
  value: string
): boolean {
  if (!value) return false;
  for (const sel of selectors) {
    const el = doc.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.hasAttribute(ATTR)) {
      setNativeValue(el, value);
      triggerInputEvents(el);
      el.setAttribute(ATTR, '1');
      return true;
    }
  }
  return false;
}

function fillByName(doc: Document, name: string, value: string): boolean {
  if (!value) return false;
  const el = doc.querySelector(
    `input[name="${name}"], textarea[name="${name}"]`
  ) as HTMLInputElement | HTMLTextAreaElement | null;
  if (el && !el.hasAttribute(ATTR)) {
    setNativeValue(el, value);
    triggerInputEvents(el);
    el.setAttribute(ATTR, '1');
    return true;
  }
  return false;
}

/** Find an input by label text (e.g. "First name", "Email") and fill it. Works for Workday and other ATS that use labels instead of predictable name/id. */
function fillByLabel(
  doc: Document,
  labelPatterns: RegExp[],
  value: string
): boolean {
  if (!value) return false;
  const labels = Array.from(doc.querySelectorAll<HTMLLabelElement>('label'));
  for (const label of labels) {
    const text = (label.textContent || '').trim().toLowerCase();
    if (!labelPatterns.some((re) => re.test(text))) continue;
    let input: HTMLInputElement | HTMLTextAreaElement | null = null;
    const forId = label.getAttribute('for');
    if (forId) {
      const el = doc.getElementById(forId);
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) input = el as HTMLInputElement | HTMLTextAreaElement;
    }
    if (!input) input = label.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea') as HTMLInputElement | HTMLTextAreaElement | null;
    if (!input) {
      const next = label.nextElementSibling;
      if (next && (next.tagName === 'INPUT' || next.tagName === 'TEXTAREA')) input = next as HTMLInputElement | HTMLTextAreaElement;
    }
    if (!input) {
      const parent = label.closest('div, fieldset, td');
      if (parent) input = parent.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea') as HTMLInputElement | HTMLTextAreaElement | null;
    }
    if (input && !input.hasAttribute(ATTR) && (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA')) {
      setNativeValue(input, value);
      triggerInputEvents(input);
      input.setAttribute(ATTR, '1');
      return true;
    }
  }
  return false;
}

/** Fill a single input/textarea by data-automation-id, aria-label, or placeholder (e.g. Workday). */
function fillByDataOrAria(
  doc: Document,
  automationIds: string[],
  ariaPlaceholderPatterns: RegExp[],
  value: string
): boolean {
  if (!value) return false;
  for (const id of automationIds) {
    const el = doc.querySelector(`input[data-automation-id="${id}"], input[data-automation-id*="${id}"], textarea[data-automation-id="${id}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el && !el.hasAttribute(ATTR)) {
      setNativeValue(el, value);
      triggerInputEvents(el);
      el.setAttribute(ATTR, '1');
      return true;
    }
  }
  const all = Array.from(doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
  for (const el of all) {
    if (el.hasAttribute(ATTR)) continue;
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
    const automation = (el.getAttribute('data-automation-id') || '').toLowerCase();
    const combined = `${aria} ${placeholder} ${automation}`;
    if (ariaPlaceholderPatterns.some((re) => re.test(combined))) {
      setNativeValue(el, value);
      triggerInputEvents(el);
      el.setAttribute(ATTR, '1');
      return true;
    }
  }
  return false;
}

/** Fill a &lt;select&gt; by matching option text or value (case-insensitive partial match). */
function fillSelect(
  doc: Document,
  nameIdPlaceholderPatterns: RegExp[],
  value: string
): boolean {
  if (!value) return false;
  const selects = Array.from(doc.querySelectorAll<HTMLSelectElement>('select'));
  for (const sel of selects) {
    if (sel.hasAttribute(ATTR)) continue;
    const name = (sel.getAttribute('name') || '').toLowerCase();
    const id = (sel.getAttribute('id') || '').toLowerCase();
    const placeholder = (sel.getAttribute('placeholder') || '').toLowerCase();
    const label = (sel.getAttribute('aria-label') || '').toLowerCase();
    const text = [name, id, placeholder, label].join(' ');
    const matches = nameIdPlaceholderPatterns.some((re) => re.test(text));
    if (!matches) continue;
    const match = pickOption(Array.from(sel.options), value);
    if (!match) continue;
    sel.value = match.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.setAttribute(ATTR, '1');
    return true;
  }
  return false;
}

/** Fill date inputs (dob, birth date, etc.). */
function fillDateFields(doc: Document, dateValue: string): boolean {
  if (!dateValue) return false;
  const normalized = dateValue.replace(/\s+/g, '').trim();
  const patterns = [
    /dob|dateofbirth|birth\s*date|date\s*of\s*birth/i,
    /birthday|bday/i,
  ];
  let filled = false;
  doc.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="date"], input:not([type])').forEach((el) => {
    if (el.hasAttribute(ATTR)) return;
    const name = (el.getAttribute('name') || '').toLowerCase();
    const id = (el.getAttribute('id') || '').toLowerCase();
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    const text = [name, id, placeholder, label].join(' ');
    if (!patterns.some((re) => re.test(text))) return;
    setNativeValue(el, normalized);
    triggerInputEvents(el);
    el.setAttribute(ATTR, '1');
    filled = true;
  });
  return filled;
}

/** Fill textareas that look like resume or cover letter paste areas. */
function fillResumeOrCoverLetterAreas(
  doc: Document,
  resumeText: string | undefined,
  coverLetterText: string | undefined
): void {
  const resumePatterns = [
    /resume|paste\s*(your\s*)?resume|paste\s*resume|resume\s*paste|attach\s*resume|resume\s*text/i,
    /cv\s*text|paste\s*cv|curriculum/i,
  ];
  const coverPatterns = [
    /cover\s*letter|paste\s*(your\s*)?cover|cover\s*letter\s*text|letter\s*paste/i,
    /motivation\s*letter|message\s*to\s*employer/i,
  ];
  doc.querySelectorAll<HTMLTextAreaElement>('textarea').forEach((el) => {
    if (el.hasAttribute(ATTR)) return;
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
function tryFillSkills(doc: Document, skills: string[]): void {
  if (!skills.length) return;
  const skillPatterns = [/skill|keyword|competenc|expertise/i];
  doc.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach((input) => {
    const name = (input.getAttribute('name') || '').toLowerCase();
    const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
    const label = (input.getAttribute('aria-label') || '').toLowerCase();
    const text = [name, placeholder, label].join(' ');
    if (!skillPatterns.some((re) => re.test(text))) return;
    if (input.hasAttribute(ATTR)) return;
    const toAdd = skills.slice(0, 5).join(', ');
    setNativeValue(input, toAdd);
    triggerInputEvents(input);
    input.setAttribute(ATTR, '1');
  });
}

/**
 * Parse raw resume text (e.g. from PDF extraction) into structured profile.
 * Uses regex for email, phone, LinkedIn, GitHub; assumes first line or first two words for name; finds Skills section.
 */
function parseResume(resumeText: string): AutofillProfile {
  const text = resumeText.trim();
  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phoneRe = /(\+?\d[\d\s\-().]{8,20}\d)/;
  const linkedInRe = /https?:\/\/(www\.)?linkedin\.com\/[^\s]+/i;
  const githubRe = /https?:\/\/(www\.)?github\.com\/[^\s]+/i;

  const email = (text.match(emailRe)?.[0] ?? '').trim();
  // Skip date ranges like "2019 - 2023": a phone number has 10-15 digits.
  const phoneMatch = Array.from(text.matchAll(new RegExp(phoneRe.source, 'g'))).find((m) => {
    const n = m[0].replace(/\D/g, '').length;
    return n >= 10 && n <= 15;
  });
  const phone = (phoneMatch?.[0] ?? '').replace(/\s+/g, ' ').trim();
  const linkedinUrl = (text.match(linkedInRe)?.[0] ?? '').trim();
  const githubUrl = (text.match(githubRe)?.[0] ?? '').trim();

  let firstName = '';
  let lastName = '';
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const firstLine = lines[0];
    const words = firstLine.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      firstName = words[0];
      lastName = words.slice(1).join(' ');
    } else if (words.length === 1) {
      firstName = words[0];
    }
  }

  let skills: string[] = [];
  const skillsSection = text.match(/\b(?:skills?|competencies?|expertise)\s*[:\-]*\s*([\s\S]*?)(?=\n\n|\n[A-Z][a-z]+:|\n(?:experience|education|work|employment)|$)/i);
  if (skillsSection?.[1]) {
    const block = skillsSection[1];
    skills = block.split(/[,;|\n]/).map((s) => s.trim()).filter((s) => s.length > 0 && s.length < 80);
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    linkedinUrl: linkedinUrl || undefined,
    githubUrl: githubUrl || undefined,
    skills: skills.length > 0 ? skills : undefined,
  };
}

/** Show a small floating hint for file upload (resume/cover letter) with optional download link. */
function showFileUploadHint(coverLetterFileUrl: string | undefined): void {
  const existing = document.getElementById('team3-autofill-file-hint');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'team3-autofill-file-hint';
  div.style.cssText = `
    position: fixed; bottom: 84px; right: 20px; z-index: 2147483646;
    max-width: 280px; padding: 12px 14px; border-radius: 10px;
    background: #1e293b; color: #e2e8f0; font-size: 12px; font-family: system-ui, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  const note = document.createElement('span');
  note.textContent = 'Resume and cover letter file uploads must be done manually (e.g. from Documents).';
  div.appendChild(note);
  if (coverLetterFileUrl && /^https?:\/\//i.test(coverLetterFileUrl)) {
    div.appendChild(document.createTextNode(' '));
    const link = document.createElement('a');
    link.href = coverLetterFileUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.color = '#93c5fd';
    link.textContent = 'Download cover letter';
    div.appendChild(link);
  }
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 8000);
}

function applyProfile(profile: AutofillProfile): void {
  const doc = document;
  const d = doc as Document;

  const firstSelectors = [
    'input[name="firstName"]',
    'input[name="first_name"]',
    'input[id="firstName"]',
    'input[id="first_name"]',
    'input[placeholder*="First"]',
    'input[data-automation-id*="first"]',
    'input[aria-label*="First"]',
    'input[aria-label*="first name"]',
  ];
  const lastSelectors = [
    'input[name="lastName"]',
    'input[name="last_name"]',
    'input[id="lastName"]',
    'input[id="last_name"]',
    'input[placeholder*="Last"]',
    'input[data-automation-id*="last"]',
    'input[aria-label*="Last"]',
    'input[aria-label*="last name"]',
  ];
  const emailSelectors = [
    'input[name="email"]',
    'input[type="email"]',
    'input[id="email"]',
    'input[data-automation-id*="email"]',
    'input[aria-label*="email"]',
  ];
  const phoneSelectors = [
    'input[name="phone"]',
    'input[name="tel"]',
    'input[type="tel"]',
    'input[id="phone"]',
    'input[data-automation-id*="phone"]',
    'input[data-automation-id*="tel"]',
    'input[aria-label*="phone"]',
    'input[aria-label*="telephone"]',
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

  // Workday and similar ATS: match by visible label text
  fillByLabel(d, [/first\s*name|given\s*name|firstname/i], profile.firstName);
  fillByLabel(d, [/last\s*name|surname|family\s*name|lastname/i], profile.lastName);
  fillByLabel(d, [/email|e-?mail\s*address/i], profile.email);
  fillByLabel(d, [/phone|telephone|mobile|contact\s*number|phone\s*number/i], profile.phone);

  // data-automation-id and aria-label (Workday / Greenhouse style)
  fillByDataOrAria(d, ['input-firstName', 'firstName', 'input-first_name'], [/first\s*name|firstname/i], profile.firstName);
  fillByDataOrAria(d, ['input-lastName', 'lastName', 'input-last_name'], [/last\s*name|lastname/i], profile.lastName);
  fillByDataOrAria(d, ['input-email', 'email'], [/email/i], profile.email);
  fillByDataOrAria(d, ['input-phone', 'input-telephone', 'phone'], [/phone|telephone/i], profile.phone);

  if (profile.dateOfBirth) fillDateFields(d, profile.dateOfBirth);
  if (profile.address) fillByName(d, 'address', profile.address) || fillField(d, ['input[name="address"]', 'input[id="address"]'], profile.address);
  if (profile.city) fillByName(d, 'city', profile.city) || fillSelect(d, [/city|location\s*city/i], profile.city);
  if (profile.state) fillSelect(d, [/state|region|province/i], profile.state);
  if (profile.zip) fillByName(d, 'zip', profile.zip) || fillByName(d, 'postal', profile.zip) || fillField(d, ['input[name="zip"]', 'input[id="zipCode"]'], profile.zip);
  if (profile.linkedinUrl) fillField(d, ['input[name*="linkedin"]', 'input[id*="linkedin"]', 'input[placeholder*="LinkedIn"]'], profile.linkedinUrl);
  if (profile.githubUrl) fillField(d, ['input[name*="github"]', 'input[id*="github"]', 'input[placeholder*="GitHub"]'], profile.githubUrl);
  if (profile.skills?.length) tryFillSkills(d, profile.skills);
}

function applyFullAutofill(payload: AutofillPayload): void {
  const doc = document;
  const profile: AutofillProfile = payload.resumeText
    ? parseResume(payload.resumeText)
    : (payload.profile ?? { firstName: '', lastName: '', email: '', phone: '' });
  applyProfile(profile);
  fillResumeOrCoverLetterAreas(doc, payload.resumeText ?? undefined, payload.coverLetterText);
  if (profile.state) fillSelect(doc, [/state|region|province/i], profile.state);
  if (profile.city) fillSelect(doc, [/city|location\s*city/i], profile.city);
  const allSkills = [...(profile.skills ?? []), ...(payload.skills ?? [])];
  if (allSkills.length) tryFillSkills(doc, allSkills);
  if (payload.coverLetterFileUrl) showFileUploadHint(payload.coverLetterFileUrl);
  else showFileUploadHint(undefined);
  tryFillResumeFileUpload(doc, payload.resumeFileUrl);
}

const resumeFileCache = new Map<string, Promise<File | null>>();

/** Fetch the resume through the background worker so third-party page CORS rules don't block it. */
function fetchResumeFile(url: string): Promise<File | null> {
  const cached = resumeFileCache.get(url);
  if (cached) return cached;
  const p = new Promise<File | null>((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_FILE', data: { url } }, (resp: { success?: boolean; base64?: string; mime?: string } | undefined) => {
        if (chrome.runtime.lastError || !resp?.success || !resp.base64) {
          resolve(null);
          return;
        }
        const bin = atob(resp.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        resolve(new File([bytes], 'resume.pdf', { type: resp.mime || 'application/pdf' }));
      });
    } catch {
      resolve(null);
    }
  });
  resumeFileCache.set(url, p);
  p.then((f) => { if (!f) resumeFileCache.delete(url); });
  return p;
}

/** Upload resume from URL into a single file input. Returns true if successful. */
async function uploadResumeToInput(fileInput: HTMLInputElement, resumeFileUrl: string): Promise<boolean> {
  if (fileInput.hasAttribute(DATA_UPLOADED)) return false;
  try {
    const file = await fetchResumeFile(resumeFileUrl);
    if (!file) return false;
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    fileInput.setAttribute(DATA_UPLOADED, '1');
    return true;
  } catch {
    return false;
  }
}

function removeDraggableResumeCard(): void {
  const card = document.getElementById('team3-resume-drag');
  if (card) card.remove();
}

/** Create floating draggable resume card for manual drop into portal dropzones (Workday, etc.). */
async function createDraggableResumeCard(resumeFileUrl: string): Promise<void> {
  if (document.getElementById('team3-resume-drag')) return;
  let file: File | null = null;
  try {
    file = await fetchResumeFile(resumeFileUrl);
  } catch {
    return;
  }
  if (!file) return;
  const card = document.createElement('div');
  card.id = 'team3-resume-drag';
  card.style.cssText =
    'position:fixed;bottom:20px;right:20px;z-index:999999;background:#1f2937;color:#fff;padding:12px 36px 12px 12px;border-radius:8px;cursor:grab;font-family:system-ui,sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);user-select:none;';
  card.textContent = 'Drag Resume to Upload';
  card.draggable = true;
  card.setAttribute('aria-label', 'Drag resume to upload area');

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = '×';
  dismiss.draggable = false;
  dismiss.style.cssText = 'position:absolute;top:4px;right:6px;background:transparent;border:none;color:#9ca3af;cursor:pointer;font-size:18px;line-height:1;padding:0;';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.addEventListener('click', (e) => {
    e.preventDefault();
    removeDraggableResumeCard();
  });

  card.addEventListener('dragstart', (e: DragEvent) => {
    if (!e.dataTransfer || !file) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/pdf', file.name);
    e.dataTransfer.items.add(file);
  });

  card.appendChild(dismiss);
  document.body.appendChild(card);
}

/** Try to auto-upload resume to file inputs; if none found or upload fails, show draggable card for manual drop. */
async function runResumeUploadAndFallback(doc: Document, resumeFileUrl: string): Promise<void> {
  const allFileInputs = Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  const fileInputs = allFileInputs.filter((el) => !el.hasAttribute(DATA_UPLOADED));
  let anyUploaded = allFileInputs.some((el) => el.hasAttribute(DATA_UPLOADED));
  for (const input of fileInputs) {
    const name = (input.getAttribute('name') || '').toLowerCase();
    const id = (input.getAttribute('id') || '').toLowerCase();
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    const label = (input.getAttribute('aria-label') || '').toLowerCase();
    const text = [name, id, accept, label].join(' ');
    if (!/resume|cv|curriculum|attachment|upload|pdf/.test(text)) continue;
    const ok = await uploadResumeToInput(input, resumeFileUrl);
    if (ok) anyUploaded = true;
  }
  if (anyUploaded) {
    removeDraggableResumeCard();
    return;
  }
  const dropzone = doc.querySelector("[data-automation-id*='file'], [data-automation-id*='upload'], [role='button'][aria-label*='upload'], [role='button'][aria-label*='resume']");
  if (allFileInputs.length === 0 || dropzone) {
    await createDraggableResumeCard(resumeFileUrl);
  }
}


/** If page has a resume/CV file input, try to set it from the given PDF URL (used by shortcut/full autofill path). */
function tryFillResumeFileUpload(doc: Document, resumeFileUrl: string | undefined): void {
  if (!resumeFileUrl) return;
  const fileInputs = Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  for (const input of fileInputs) {
    if (input.hasAttribute(DATA_UPLOADED)) continue;
    const name = (input.getAttribute('name') || '').toLowerCase();
    const id = (input.getAttribute('id') || '').toLowerCase();
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    const label = (input.getAttribute('aria-label') || '').toLowerCase();
    const text = [name, id, accept, label].join(' ');
    if (!/resume|cv|curriculum|attachment|upload|pdf/.test(text)) continue;
    (async () => {
      const ok = await uploadResumeToInput(input, resumeFileUrl);
      if (ok) removeDraggableResumeCard();
    })();
    return;
  }
}

function onShortcut(): void {
  chrome.runtime.sendMessage({ type: 'GET_PROFILE' }, (response: { profile?: AutofillProfile; error?: string } | undefined) => {
    if (chrome.runtime.lastError) {
      console.warn('MR_Rokesh Job Portal extension:', chrome.runtime.lastError.message);
      return;
    }
    if (response?.error) {
      console.warn('MR_Rokesh Job Portal extension:', response.error);
      return;
    }
    if (response?.profile) {
      applyProfile(response.profile);
    }
  });
}

applyAutofillEngineRef = applyAutofillEngine;
applyFullAutofillRef = applyFullAutofill;
onShortcutRef = onShortcut;

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    onShortcut();
  }
});
