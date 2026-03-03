"use strict";
(() => {
  // scraper.ts
  function scrapeJobPage() {
    function getText(el) {
      if (!el) return "";
      const h = el;
      return (h.innerText != null ? h.innerText : el.textContent || "").trim();
    }
    const url = window.location.href;
    let title = "", company = "", location = "", description = "", source = "";
    try {
      if (url.includes("linkedin.com")) {
        source = "LinkedIn";
        title = document.querySelector(
          '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.t-bold, [data-tracking-control-name="public_jobs_topcard-title"]'
        )?.textContent?.trim() || document.querySelector("h1")?.textContent?.trim() || "";
        company = document.querySelector(
          '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-unified-top-card__subtitle-primary-grouping a, [data-tracking-control-name="public_jobs_topcard-org"]'
        )?.textContent?.trim() || "";
        location = document.querySelector(
          '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, [data-tracking-control-name="public_jobs_topcard-location"]'
        )?.textContent?.trim() || "";
        const descSelectors = [
          ".jobs-description__content",
          ".jobs-description-content",
          ".jobs-box__html-content",
          "#job-details",
          "[data-job-details]",
          ".jobs-description",
          "section.jobs-description-content__container",
          ".jobs-description-content__container",
          'div[class*="jobs-description"]',
          "article .jobs-box__html-content"
        ];
        for (const sel of descSelectors) {
          const t = getText(document.querySelector(sel));
          if (t) {
            description = t;
            break;
          }
        }
        if (!description) {
          const main = document.querySelector('main, [role="main"], #main');
          if (main) description = getText(main).substring(0, 15e3);
        }
      } else if (url.includes("naukri.com")) {
        source = "Naukri";
        title = document.querySelector('h1.title, h1[itemprop="title"], .jd-header-title')?.textContent?.trim() || document.querySelector("h1")?.textContent?.trim() || "";
        company = document.querySelector('.jd-header-comp-name a, .company-name, [itemprop="hiringOrganization"]')?.textContent?.trim() || "";
        location = document.querySelector('.loc, .location, [itemprop="jobLocation"]')?.textContent?.trim() || "";
        const descEl = document.querySelector('.job-description, #jobDescriptionText, .description, [class*="job-desc"]');
        description = getText(descEl) || getText(document.querySelector(".detail-desc")) || "";
      } else if (url.includes("indeed.com")) {
        source = "Indeed";
        title = document.querySelector('.jobsearch-JobInfoHeader-title, h1[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim() || "";
        company = document.querySelector('[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating-companyHeader a')?.textContent?.trim() || "";
        location = document.querySelector('[data-testid="inlineHeader-companyLocation"], .jobsearch-InlineCompanyRating-companyHeader + div')?.textContent?.trim() || "";
        const descEl = document.querySelector("#jobDescriptionText, .jobsearch-jobDescriptionText");
        description = getText(descEl) || "";
      } else if (url.includes("greenhouse.io")) {
        source = "Greenhouse";
        title = document.querySelector(".app-title, h1.heading")?.textContent?.trim() || "";
        company = document.querySelector(".company-name, span.company-name")?.textContent?.trim() || "";
        location = document.querySelector(".location, .body--metadata")?.textContent?.trim() || "";
        const descEl = document.querySelector("#content, .content");
        description = getText(descEl) || "";
      } else if (url.includes("lever.co")) {
        source = "Lever";
        title = document.querySelector(".posting-headline h2")?.textContent?.trim() || "";
        company = "";
        location = document.querySelector(".posting-categories .sort-by-time, .location")?.textContent?.trim() || "";
        const sections = document.querySelectorAll(".posting-page .section-wrapper");
        description = Array.from(sections).map((s) => getText(s)).join("\n\n").trim();
      } else if (url.includes("myworkdayjobs.com")) {
        source = "Workday";
        title = document.querySelector('[data-automation-id="jobPostingHeader"], h2')?.textContent?.trim() || "";
        company = document.querySelector('[data-automation-id="company"]')?.textContent?.trim() || "";
        location = document.querySelector('[data-automation-id="locations"]')?.textContent?.trim() || "";
        const descEl = document.querySelector('[data-automation-id="jobPostingDescription"]');
        description = getText(descEl) || "";
      } else if (url.includes("glassdoor.com")) {
        source = "Glassdoor";
        title = document.querySelector('[data-test="job-title"], .e1tk4kwz4')?.textContent?.trim() || "";
        company = document.querySelector('[data-test="employer-name"], .e1tk4kwz1')?.textContent?.trim() || "";
        location = document.querySelector('[data-test="location"]')?.textContent?.trim() || "";
        const descEl = document.querySelector('.jobDescriptionContent, [data-test="jobDescriptionContent"]');
        description = getText(descEl) || "";
      } else {
        source = "Unknown";
        title = document.querySelector("h1")?.textContent?.trim() || document.title;
        description = getText(document.body).substring(0, 5e3);
        return {
          title,
          company,
          location,
          description,
          source,
          error: "Unsupported site. Extracted page text \u2014 you may want to clean it up."
        };
      }
      if (!description) {
        return { title, company, location, description: "", source, error: "Could not find job description on this page." };
      }
      return { title, company, location, description, source };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return { title: "", company: "", location: "", description: "", source: "", error: "Scraping failed: " + err.message };
    }
  }

  // content.ts
  var ATTR = "data-team3-autofilled";
  function safeSendResponse(sendResponse, response) {
    try {
      sendResponse(response);
    } catch {
    }
    if (chrome.runtime.lastError) ;
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "APPLY_AUTOFILL") {
      if (message.data?.fields && Array.isArray(message.data.excluded)) {
        applyAutofillEngineRef(message.data);
      } else if (message.data && (message.data.resumeText !== void 0 || message.data.profile !== void 0)) {
        applyFullAutofillRef(message.data);
      } else {
        onShortcutRef();
      }
      safeSendResponse(sendResponse, { ok: true });
      return true;
    }
    return false;
  });
  var applyAutofillEngineRef = () => {
  };
  var applyFullAutofillRef = () => {
  };
  var onShortcutRef = () => {
  };
  var JOB_SITE_PATTERNS = [
    "linkedin.com",
    "naukri.com",
    "indeed.com",
    "greenhouse.io",
    "lever.co",
    "myworkdayjobs.com",
    "glassdoor.com"
  ];
  function isJobSite() {
    const href = window.location.href;
    return JOB_SITE_PATTERNS.some((p) => href.includes(p));
  }
  function injectFAB() {
    if (document.getElementById("team3-job-fab")) return;
    const fab = document.createElement("button");
    fab.id = "team3-job-fab";
    fab.type = "button";
    fab.title = "Save job to Team 3";
    fab.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <rect x="2" y="3" width="20" height="18" rx="3"/>
      <path d="M8 7h8M8 11h8M8 15h5"/>
    </svg>
    <span>Save to Team 3</span>
  `;
    fab.addEventListener("click", () => {
      const result = scrapeJobPage();
      chrome.runtime.sendMessage(
        { type: "JOB_SCRAPED", data: { ...result, url: window.location.href } },
        () => {
          fab.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>Saved!</span>
        `;
          fab.classList.add("team3-fab-success");
          setTimeout(() => {
            fab.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <rect x="2" y="3" width="20" height="18" rx="3"/>
              <path d="M8 7h8M8 11h8M8 15h5"/>
            </svg>
            <span>Save to Team 3</span>
          `;
            fab.classList.remove("team3-fab-success");
          }, 2e3);
        }
      );
    });
    document.body.appendChild(fab);
  }
  try {
    if (isJobSite()) injectFAB();
  } catch (e) {
    console.warn("Team 3 extension: injectFAB failed", e);
  }
  function injectSidebarIcons() {
    if (window !== window.top) return;
    if (document.getElementById("team3-sidebar-strip")) return;
    const strip = document.createElement("div");
    strip.id = "team3-sidebar-strip";
    strip.className = "team3-sidebar-strip";
    strip.setAttribute("aria-label", "Team 3");
    strip.innerHTML = `
    <button type="button" class="team3-sidebar-icon team3-sidebar-icon-t" title="Team 3 \u2013 open side panel" aria-label="Open Team 3">
      <span class="team3-sidebar-icon-letter">T</span>
    </button>
    <button type="button" class="team3-sidebar-icon team3-sidebar-icon-circle" title="Team 3 \u2013 open side panel" aria-label="Open Team 3">
      <span class="team3-sidebar-icon-circle-svg"></span>
    </button>
  `;
    const openPanel = () => {
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" }, () => {
        if (chrome.runtime.lastError) ;
      });
    };
    strip.querySelector(".team3-sidebar-icon-t")?.addEventListener("click", openPanel);
    strip.querySelector(".team3-sidebar-icon-circle")?.addEventListener("click", openPanel);
    const target = document.body || document.documentElement;
    target.appendChild(strip);
  }
  function tryInjectSidebarIcons() {
    if (document.body) {
      injectSidebarIcons();
    } else {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => injectSidebarIcons());
      } else {
        injectSidebarIcons();
      }
    }
  }
  try {
    tryInjectSidebarIcons();
  } catch (e) {
    console.warn("Team 3 extension: tryInjectSidebarIcons failed", e);
  }
  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
  }
  function triggerInputEvents(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }
  function normalize(str) {
    return str.toLowerCase().replace(/[_\-\s]/g, "");
  }
  function getFieldMeta(el, doc) {
    let label = "";
    if (el.id) {
      try {
        const labelEl = doc.querySelector(`label[for="${el.id}"]`);
        label = (labelEl?.innerText ?? "").trim();
      } catch {
      }
    }
    const parts = [
      el.name,
      el.id,
      el.placeholder,
      el.getAttribute("aria-label"),
      el.getAttribute("data-automation-id"),
      label
    ].filter(Boolean);
    return normalize(parts.join(" "));
  }
  var FIELD_SYNONYMS = {
    zip_code: ["zip", "zipcode", "postal", "postalcode", "postalcode"],
    phone: ["phone", "mobile", "contactnumber", "telephone", "tel"],
    first_name: ["firstname", "givenname", "first"],
    last_name: ["lastname", "surname", "familyname", "family", "last"],
    work_authorization: ["workauthorization", "legallyauthorized", "authorizedtowork"],
    email: ["email", "e-mail", "emailaddress"],
    address_line1: ["address", "street", "addressline1"],
    city: ["city", "town"],
    state: ["state", "region", "province"],
    country: ["country", "nation"],
    date_of_birth: ["dob", "dateofbirth", "birthdate"],
    current_job_title: ["jobtitle", "job title", "title", "position"],
    current_company: ["company", "employer", "organization", "company name"]
  };
  var STATE_ABBREV = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY",
    "district of columbia": "DC"
  };
  function normalizeState(value) {
    const v = value.trim();
    if (!v) return v;
    const lower = v.toLowerCase();
    if (STATE_ABBREV[lower]) return STATE_ABBREV[lower];
    if (v.length === 2) return v.toUpperCase();
    return v;
  }
  function findMatchingKey(meta, fields) {
    const keys = Object.keys(fields).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      const normalizedKey = normalize(key);
      const exact = meta === normalizedKey;
      const wordBoundary = meta.includes(" " + normalizedKey) || meta.startsWith(normalizedKey + " ") || meta.endsWith(" " + normalizedKey);
      if (exact || wordBoundary || meta.includes(normalizedKey)) {
        return key;
      }
      const synonyms = FIELD_SYNONYMS[key];
      if (synonyms) {
        for (const syn of synonyms) {
          const n = normalize(syn);
          if (meta === n || meta.includes(" " + n) || meta.includes(n)) return key;
        }
      }
    }
    return null;
  }
  function normalizeValueForField(el, key, value, meta) {
    if (value == null || typeof value !== "string" && typeof value !== "number") return String(value ?? "");
    const str = String(value).trim();
    if (!str) return str;
    const type = el.type || "";
    const metaLower = meta.toLowerCase();
    if (metaLower.includes("phone") || type === "tel") {
      const digits = str.replace(/\D/g, "");
      if (digits.length > 10) return digits.slice(-10);
      return digits;
    }
    if (metaLower.includes("zip") || metaLower.includes("postal")) {
      const digits = str.replace(/\D/g, "");
      if (digits.length < 5) return "";
      return digits;
    }
    if (type === "number") {
      return str.replace(/[^\d.]/g, "");
    }
    return str;
  }
  function retryWithAlternativeFormatting(el, rawValue, _key, meta) {
    const metaLower = meta.toLowerCase();
    let next = "";
    if (metaLower.includes("phone") || el.type === "tel") {
      const digits = rawValue.replace(/\D/g, "");
      next = digits.length > 10 ? digits.slice(-10) : digits;
    } else if (metaLower.includes("zip") || metaLower.includes("postal")) {
      next = rawValue.replace(/\D/g, "");
    }
    if (!next) return;
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, next);
    else el.value = next;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
  }
  var semanticCache = {};
  async function semanticMatch(meta, availableKeys, apiBase, userId) {
    const cacheKey = `${window.location.hostname}:${meta}`;
    if (cacheKey in semanticCache) return semanticCache[cacheKey];
    try {
      const url = `${apiBase.replace(/\/$/, "")}/api/autofill/semantic-match`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ fieldMeta: meta, availableKeys })
      });
      const json = await res.json().catch(() => ({}));
      const matched = json?.matchedKey && availableKeys.includes(json.matchedKey) ? json.matchedKey : null;
      semanticCache[cacheKey] = matched;
      return matched;
    } catch {
      semanticCache[cacheKey] = null;
      return null;
    }
  }
  async function semanticOptionMatch(fieldLabel, value, options, apiBase, userId) {
    const cacheKey = `${window.location.hostname}:opt:${fieldLabel}:${value}`;
    if (cacheKey in semanticCache) return semanticCache[cacheKey];
    try {
      const url = `${apiBase.replace(/\/$/, "")}/api/autofill/semantic-option-match`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ fieldLabel, value, options })
      });
      const json = await res.json().catch(() => ({}));
      const best = json?.bestOption && options.includes(json.bestOption) ? json.bestOption : null;
      semanticCache[cacheKey] = best;
      return best;
    } catch {
      semanticCache[cacheKey] = null;
      return null;
    }
  }
  function getFieldType(el) {
    const tag = el.tagName.toUpperCase();
    const role = el.getAttribute("role") || "";
    const type = el.type || "";
    if (tag === "SELECT") return "select";
    if (role === "combobox" || el.closest('[role="combobox"]')) return "combobox";
    if (type === "radio") return "radio";
    if (type === "checkbox") return "checkbox";
    if (type === "tel") return "tel";
    if (type === "email") return "email";
    return "text";
  }
  var AUTOFILL_DEBUG = true;
  async function runAutofillEngineViaAPI(payload, root) {
    const doc = root instanceof Document ? root : root.getRootNode();
    const apiBase = payload.apiBase;
    const userId = payload.userId ?? "";
    if (!apiBase || !userId) return false;
    const allFields = Array.from(root.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='image']), textarea, select, [role='combobox']"));
    const elements = allFields.filter((el) => !el.hasAttribute(ATTR));
    if (elements.length === 0) {
      if (AUTOFILL_DEBUG) console.log("[Team3 Autofill] No unfilled fields found (all may already have data-team3-autofilled).");
      return true;
    }
    const fields = elements.map((el) => ({
      meta: getFieldMeta(el, doc),
      type: getFieldType(el)
    }));
    if (AUTOFILL_DEBUG) {
      console.log("[Team3 Autofill] Sending to API:", elements.length, "fields. Metas (in order):", fields.map((f, i) => `${i + 1}. "${f.meta}" (${f.type})`));
    }
    try {
      const url = `${apiBase.replace(/\/$/, "")}/api/autofill/match-fields`;
      const body = {
        fields,
        userData: payload.fields,
        excluded: payload.excluded,
        includeDebug: true
      };
      if (payload.resumeText && payload.resumeText.trim()) body.resumeText = payload.resumeText.trim();
      if (payload.coverLetterText && payload.coverLetterText.trim()) body.coverLetterText = payload.coverLetterText.trim();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      const values = Array.isArray(json?.values) ? json.values : [];
      if (AUTOFILL_DEBUG) {
        console.log("[Team3 Autofill] API status:", res.status, "| values count:", values.length, "| expected:", elements.length);
        console.log("[Team3 Autofill] Values returned:", values.map((v, i) => `${i + 1}. ${v === "" ? "(empty)" : `"${String(v).slice(0, 50)}${String(v).length > 50 ? "\u2026" : ""}"`}`));
        if (json?.debug) console.log("[Team3 Autofill] Debug from server:", json.debug);
      }
      if (values.length !== elements.length) {
        if (AUTOFILL_DEBUG) console.warn("[Team3 Autofill] Length mismatch: API returned", values.length, "values for", elements.length, "fields. Aborting fill.");
        return false;
      }
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const rawValue = values[i];
        const meta = fields[i].meta;
        if (rawValue == null || typeof rawValue === "string" && !rawValue.trim() && rawValue !== "0") {
          if (AUTOFILL_DEBUG) console.log("[Team3 Autofill] Skip", i + 1, 'meta="' + meta + '" (empty value)');
          continue;
        }
        const cleanedValue = normalizeValueForField(el, "", rawValue, meta);
        const isStateLike = meta.includes("state") || meta.includes("region") || meta.includes("province");
        const valueToFill = isStateLike ? normalizeState(rawValue) || cleanedValue : cleanedValue;
        if (!valueToFill && valueToFill !== "0") {
          if (AUTOFILL_DEBUG) console.log("[Team3 Autofill] Skip", i + 1, 'meta="' + meta + '" (normalized to empty)');
          continue;
        }
        await fillFieldByType(el, String(valueToFill), doc);
        el.setAttribute(ATTR, "1");
        if (AUTOFILL_DEBUG) console.log("[Team3 Autofill] Filled", i + 1, 'meta="' + meta + '" with', '"' + String(valueToFill).slice(0, 40) + (String(valueToFill).length > 40 ? "\u2026" : "") + '"');
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          const input = el;
          setTimeout(() => {
            if (input.classList.contains("error") || input.getAttribute("aria-invalid") === "true") {
              retryWithAlternativeFormatting(input, rawValue, "", meta);
            }
          }, 500);
        }
      }
      return true;
    } catch (err) {
      if (AUTOFILL_DEBUG) console.error("[Team3 Autofill] API or fill error:", err);
      return false;
    }
  }
  function setNativeValueAndTrigger(element, value) {
    const proto = Object.getPrototypeOf(element);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.blur();
  }
  function fillSelectEngine(select, value) {
    const options = Array.from(select.options);
    const valLower = value.toLowerCase().trim();
    if (select.multiple) {
      const toSelect = value.split(/[,;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      options.forEach((opt) => {
        const optVal = (opt.value || opt.textContent || "").trim().toLowerCase();
        const match2 = toSelect.some((v) => optVal === v || optVal.includes(v) || (opt.textContent || "").toLowerCase().includes(v));
        opt.selected = match2;
      });
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    const match = options.find(
      (opt) => (opt.textContent || "").toLowerCase().includes(valLower) || (opt.value || "").toLowerCase() === valLower
    );
    if (match) {
      select.value = match.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    return false;
  }
  function fillRadioEngine(name, value, doc) {
    const radios = Array.from(doc.querySelectorAll('input[type="radio"]')).filter((r) => r.name === name);
    const valLower = value.toLowerCase().trim();
    radios.forEach((radio) => {
      if ((radio.value || "").toLowerCase().includes(valLower) || valLower.includes((radio.value || "").toLowerCase())) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        radio.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }
  function fillCheckboxEngine(checkbox, value) {
    const shouldCheck = value === true || typeof value === "string" && (value.toLowerCase() === "yes" || value.toLowerCase() === "true" || value.trim() === "1");
    if (shouldCheck) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      checkbox.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  async function fillWorkdayCombobox(el, value) {
    const combobox = el.getAttribute("role") === "combobox" ? el : el.closest('[role="combobox"]') || el;
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
    for (const opt of options) {
      const el2 = opt;
      const text = (el2.textContent || el2.innerText || "").toLowerCase();
      const dataVal = (el2.getAttribute("data-value") || el2.getAttribute("value") || "").toLowerCase();
      if (text.includes(valLower) || dataVal.includes(valLower) || valLower.includes(text) || valLower.includes(dataVal)) {
        el2.click();
        return;
      }
    }
  }
  function isCombobox(el) {
    return el.getAttribute("role") === "combobox" || !!el.closest('[role="combobox"]');
  }
  async function fillFieldByType(el, value, doc) {
    if (!value && value !== "0") return;
    const tag = el.tagName.toUpperCase();
    const type = el.type || "";
    if (tag === "SELECT") {
      fillSelectEngine(el, value);
      return;
    }
    if (type === "radio") {
      const name = el.name;
      if (name) fillRadioEngine(name, value, doc);
      return;
    }
    if (type === "checkbox") {
      fillCheckboxEngine(el, value);
      return;
    }
    if (isCombobox(el)) {
      const combobox = el.getAttribute("role") === "combobox" ? el : el.closest('[role="combobox"]') || el;
      await fillWorkdayCombobox(combobox, value);
      return;
    }
    if (tag === "INPUT" || tag === "TEXTAREA") {
      const input = el;
      if (input.type === "hidden" || input.type === "submit" || input.type === "button" || input.type === "image") return;
      setNativeValueAndTrigger(input, value);
    }
  }
  var lastTablePayload = null;
  var autofillMutationObserver = null;
  var autofillDebounceTimer = null;
  var AUTOFILL_DEBOUNCE_MS = 500;
  function isWorkdayOrMultiStepApply() {
    const h = window.location.hostname.toLowerCase();
    return h.includes("myworkdayjobs") || h.includes("workday.com") || h.includes("greenhouse.io") || h.includes("lever.co");
  }
  async function runAutofillEngine(payload, root) {
    const doc = root instanceof Document ? root : root.getRootNode();
    const allFields = Array.from(root.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='image']), textarea, select, [role='combobox']"));
    for (const el of allFields) {
      if (el.hasAttribute(ATTR)) continue;
      const meta = getFieldMeta(el, doc);
      const matchKey = findMatchingKey(meta, payload.fields);
      if (!matchKey || payload.excluded.includes(matchKey)) continue;
      const rawValue = payload.fields[matchKey];
      if (rawValue == null || typeof rawValue === "string" && !rawValue.trim() && rawValue !== "0") continue;
      let cleanedValue = normalizeValueForField(el, matchKey, rawValue, meta);
      if (matchKey === "state") cleanedValue = normalizeState(rawValue) || cleanedValue;
      if (!cleanedValue && cleanedValue !== "0") continue;
      await fillFieldByType(el, String(cleanedValue), doc);
      el.setAttribute(ATTR, "1");
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        setTimeout(() => {
          const input = el;
          if (input.classList.contains("error") || input.getAttribute("aria-invalid") === "true") {
            retryWithAlternativeFormatting(input, rawValue, matchKey, meta);
          }
        }, 500);
      }
    }
  }
  async function runAutofillEngineAsync(payload, root) {
    const doc = root instanceof Document ? root : root.getRootNode();
    const allFields = Array.from(root.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='image']), textarea, select, [role='combobox']"));
    const apiBase = payload.apiBase;
    const userId = payload.userId ?? "";
    for (const el of allFields) {
      if (el.hasAttribute(ATTR)) continue;
      const meta = getFieldMeta(el, doc);
      let matchKey = findMatchingKey(meta, payload.fields);
      if (!matchKey && meta.length > 4 && apiBase && userId) {
        const keys = Object.keys(payload.fields);
        if (keys.length) matchKey = await semanticMatch(meta, keys, apiBase, userId) ?? null;
      }
      if (!matchKey || payload.excluded.includes(matchKey)) continue;
      const rawValue = payload.fields[matchKey];
      if (rawValue == null || typeof rawValue === "string" && !rawValue.trim() && rawValue !== "0") continue;
      let cleanedValue = normalizeValueForField(el, matchKey, rawValue, meta);
      if (matchKey === "state") cleanedValue = normalizeState(rawValue) || cleanedValue;
      if (!cleanedValue && cleanedValue !== "0") continue;
      if (el.tagName === "SELECT") {
        const select = el;
        let filled = fillSelectEngine(select, String(cleanedValue));
        if (!filled && apiBase && userId) {
          const options = Array.from(select.options).map((o) => (o.textContent || o.value || "").trim()).filter(Boolean);
          if (options.length >= 2) {
            const bestOption = await semanticOptionMatch(meta, String(cleanedValue), options, apiBase, userId);
            if (bestOption) filled = fillSelectEngine(select, bestOption);
          }
        }
        if (filled) el.setAttribute(ATTR, "1");
        continue;
      }
      await fillFieldByType(el, String(cleanedValue), doc);
      el.setAttribute(ATTR, "1");
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        setTimeout(() => {
          const input = el;
          if (input.classList.contains("error") || input.getAttribute("aria-invalid") === "true") {
            retryWithAlternativeFormatting(input, rawValue, matchKey, meta);
          }
        }, 500);
      }
    }
  }
  function scheduleEngineRun() {
    if (autofillDebounceTimer) clearTimeout(autofillDebounceTimer);
    autofillDebounceTimer = setTimeout(() => {
      autofillDebounceTimer = null;
      if (!lastTablePayload) return;
      if (lastTablePayload.apiBase && lastTablePayload.userId) {
        runAutofillEngineViaAPI(lastTablePayload, document).then((ok) => {
          if (!ok) runAutofillEngineAsync(lastTablePayload, document).then(() => {
          });
        });
      } else {
        runAutofillEngine(lastTablePayload, document).then(() => {
        });
      }
    }, AUTOFILL_DEBOUNCE_MS);
  }
  function applyAutofillEngine(payload) {
    lastTablePayload = payload;
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
        if (!ok) runAutofillEngineAsync(payload, document).then(() => {
        });
      });
    } else {
      runAutofillEngine(payload, document).then(() => {
      });
    }
    const observer = new MutationObserver(() => {
      if (!lastTablePayload) return;
      scheduleEngineRun();
    });
    autofillMutationObserver = observer;
    const target = document.body || document.documentElement;
    if (target) observer.observe(target, { childList: true, subtree: true });
    const keepAliveMs = isWorkdayOrMultiStepApply() ? 10 * 60 * 1e3 : 15e3;
    setTimeout(() => {
      if (autofillMutationObserver === observer) {
        observer.disconnect();
        autofillMutationObserver = null;
      }
    }, keepAliveMs);
  }
  function fillField(doc, selectors, value) {
    if (!value) return false;
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA") && !el.hasAttribute(ATTR)) {
        setNativeValue(el, value);
        triggerInputEvents(el);
        el.setAttribute(ATTR, "1");
        return true;
      }
    }
    return false;
  }
  function fillByName(doc, name, value) {
    if (!value) return false;
    const el = doc.querySelector(
      `input[name="${name}"], textarea[name="${name}"]`
    );
    if (el && !el.hasAttribute(ATTR)) {
      setNativeValue(el, value);
      triggerInputEvents(el);
      el.setAttribute(ATTR, "1");
      return true;
    }
    return false;
  }
  function fillByLabel(doc, labelPatterns, value) {
    if (!value) return false;
    const labels = Array.from(doc.querySelectorAll("label"));
    for (const label of labels) {
      const text = (label.textContent || "").trim().toLowerCase();
      if (!labelPatterns.some((re) => re.test(text))) continue;
      let input = null;
      const forId = label.getAttribute("for");
      if (forId) {
        const el = doc.getElementById(forId);
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) input = el;
      }
      if (!input) input = label.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
      if (!input) {
        const next = label.nextElementSibling;
        if (next && (next.tagName === "INPUT" || next.tagName === "TEXTAREA")) input = next;
      }
      if (!input) {
        const parent = label.closest("div, fieldset, td");
        if (parent) input = parent.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
      }
      if (input && !input.hasAttribute(ATTR) && (input.tagName === "INPUT" || input.tagName === "TEXTAREA")) {
        setNativeValue(input, value);
        triggerInputEvents(input);
        input.setAttribute(ATTR, "1");
        return true;
      }
    }
    return false;
  }
  function fillByDataOrAria(doc, automationIds, ariaPlaceholderPatterns, value) {
    if (!value) return false;
    for (const id of automationIds) {
      const el = doc.querySelector(`input[data-automation-id="${id}"], input[data-automation-id*="${id}"], textarea[data-automation-id="${id}"]`);
      if (el && !el.hasAttribute(ATTR)) {
        setNativeValue(el, value);
        triggerInputEvents(el);
        el.setAttribute(ATTR, "1");
        return true;
      }
    }
    const all = Array.from(doc.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
    for (const el of all) {
      if (el.hasAttribute(ATTR)) continue;
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
      const automation = (el.getAttribute("data-automation-id") || "").toLowerCase();
      const combined = `${aria} ${placeholder} ${automation}`;
      if (ariaPlaceholderPatterns.some((re) => re.test(combined))) {
        setNativeValue(el, value);
        triggerInputEvents(el);
        el.setAttribute(ATTR, "1");
        return true;
      }
    }
    return false;
  }
  function fillSelect(doc, nameIdPlaceholderPatterns, value) {
    if (!value) return false;
    const selects = Array.from(doc.querySelectorAll("select"));
    for (const sel of selects) {
      if (sel.hasAttribute(ATTR)) continue;
      const name = (sel.getAttribute("name") || "").toLowerCase();
      const id = (sel.getAttribute("id") || "").toLowerCase();
      const placeholder = (sel.getAttribute("placeholder") || "").toLowerCase();
      const label = (sel.getAttribute("aria-label") || "").toLowerCase();
      const text = [name, id, placeholder, label].join(" ");
      const matches = nameIdPlaceholderPatterns.some((re) => re.test(text));
      if (!matches) continue;
      const val = value.trim().toLowerCase();
      const options = Array.from(sel.options);
      for (const opt of options) {
        const optVal = (opt.getAttribute("value") || "").trim().toLowerCase();
        const optText = (opt.textContent || "").trim().toLowerCase();
        if (optVal === val || optText === val || optText.includes(val) || optVal.includes(val)) {
          sel.value = opt.getAttribute("value") ?? opt.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          sel.dispatchEvent(new Event("input", { bubbles: true }));
          sel.setAttribute(ATTR, "1");
          return true;
        }
      }
      try {
        sel.value = value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        sel.setAttribute(ATTR, "1");
        return true;
      } catch {
      }
    }
    return false;
  }
  function fillDateFields(doc, dateValue) {
    if (!dateValue) return false;
    const normalized = dateValue.replace(/\s+/g, "").trim();
    const patterns = [
      /dob|dateofbirth|birth\s*date|date\s*of\s*birth/i,
      /birthday|bday/i
    ];
    let filled = false;
    doc.querySelectorAll('input[type="text"], input[type="date"], input:not([type])').forEach((el) => {
      if (el.hasAttribute(ATTR)) return;
      const name = (el.getAttribute("name") || "").toLowerCase();
      const id = (el.getAttribute("id") || "").toLowerCase();
      const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      const text = [name, id, placeholder, label].join(" ");
      if (!patterns.some((re) => re.test(text))) return;
      setNativeValue(el, normalized);
      triggerInputEvents(el);
      el.setAttribute(ATTR, "1");
      filled = true;
    });
    return filled;
  }
  function fillResumeOrCoverLetterAreas(doc, resumeText, coverLetterText) {
    const resumePatterns = [
      /resume|paste\s*(your\s*)?resume|paste\s*resume|resume\s*paste|attach\s*resume|resume\s*text/i,
      /cv\s*text|paste\s*cv|curriculum/i
    ];
    const coverPatterns = [
      /cover\s*letter|paste\s*(your\s*)?cover|cover\s*letter\s*text|letter\s*paste/i,
      /motivation\s*letter|message\s*to\s*employer/i
    ];
    doc.querySelectorAll("textarea").forEach((el) => {
      if (el.hasAttribute(ATTR)) return;
      const name = (el.getAttribute("name") || "").toLowerCase();
      const id = (el.getAttribute("id") || "").toLowerCase();
      const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      const text = [name, id, placeholder, label].join(" ");
      if (resumeText && resumePatterns.some((re) => re.test(text))) {
        setNativeValue(el, resumeText);
        triggerInputEvents(el);
        el.setAttribute(ATTR, "1");
        return;
      }
      if (coverLetterText && coverPatterns.some((re) => re.test(text))) {
        setNativeValue(el, coverLetterText);
        triggerInputEvents(el);
        el.setAttribute(ATTR, "1");
      }
    });
  }
  function tryFillSkills(doc, skills) {
    if (!skills.length) return;
    const skillPatterns = [/skill|keyword|competenc|expertise/i];
    doc.querySelectorAll('input[type="text"]').forEach((input) => {
      const name = (input.getAttribute("name") || "").toLowerCase();
      const placeholder = (input.getAttribute("placeholder") || "").toLowerCase();
      const label = (input.getAttribute("aria-label") || "").toLowerCase();
      const text = [name, placeholder, label].join(" ");
      if (!skillPatterns.some((re) => re.test(text))) return;
      if (input.hasAttribute(ATTR)) return;
      const toAdd = skills.slice(0, 5).join(", ");
      setNativeValue(input, toAdd);
      triggerInputEvents(input);
      input.setAttribute(ATTR, "1");
    });
  }
  function parseResume(resumeText) {
    const text = resumeText.trim();
    const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const phoneRe = /(\+?\d[\d\s\-().]{8,20}\d)/;
    const linkedInRe = /https?:\/\/(www\.)?linkedin\.com\/[^\s]+/i;
    const githubRe = /https?:\/\/(www\.)?github\.com\/[^\s]+/i;
    const email = (text.match(emailRe)?.[0] ?? "").trim();
    const phone = (text.match(phoneRe)?.[0] ?? "").replace(/\s+/g, " ").trim();
    const linkedinUrl = (text.match(linkedInRe)?.[0] ?? "").trim();
    const githubUrl = (text.match(githubRe)?.[0] ?? "").trim();
    let firstName = "";
    let lastName = "";
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0];
      const words = firstLine.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        firstName = words[0];
        lastName = words.slice(1).join(" ");
      } else if (words.length === 1) {
        firstName = words[0];
      }
    }
    let skills = [];
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
      linkedinUrl: linkedinUrl || void 0,
      githubUrl: githubUrl || void 0,
      skills: skills.length > 0 ? skills : void 0
    };
  }
  function showFileUploadHint(coverLetterFileUrl) {
    const existing = document.getElementById("team3-autofill-file-hint");
    if (existing) existing.remove();
    const div = document.createElement("div");
    div.id = "team3-autofill-file-hint";
    div.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483646;
    max-width: 280px; padding: 12px 14px; border-radius: 10px;
    background: #1e293b; color: #e2e8f0; font-size: 12px; font-family: system-ui, sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
    div.innerHTML = coverLetterFileUrl ? `Resume/cover letter <strong>file uploads</strong> must be done manually. <a href="${coverLetterFileUrl}" target="_blank" rel="noopener" style="color: #93c5fd;">Download cover letter</a>` : "Resume and cover letter <strong>file uploads</strong> must be done manually (e.g. from Documents).";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 8e3);
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
      'input[data-automation-id*="first"]',
      'input[aria-label*="First"]',
      'input[aria-label*="first name"]'
    ];
    const lastSelectors = [
      'input[name="lastName"]',
      'input[name="last_name"]',
      'input[id="lastName"]',
      'input[id="last_name"]',
      'input[placeholder*="Last"]',
      'input[data-automation-id*="last"]',
      'input[aria-label*="Last"]',
      'input[aria-label*="last name"]'
    ];
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      'input[id="email"]',
      'input[data-automation-id*="email"]',
      'input[aria-label*="email"]'
    ];
    const phoneSelectors = [
      'input[name="phone"]',
      'input[name="tel"]',
      'input[type="tel"]',
      'input[id="phone"]',
      'input[data-automation-id*="phone"]',
      'input[data-automation-id*="tel"]',
      'input[aria-label*="phone"]',
      'input[aria-label*="telephone"]'
    ];
    fillField(d, firstSelectors, profile.firstName);
    fillField(d, lastSelectors, profile.lastName);
    fillField(d, emailSelectors, profile.email);
    fillField(d, phoneSelectors, profile.phone);
    fillByName(d, "firstName", profile.firstName);
    fillByName(d, "first_name", profile.firstName);
    fillByName(d, "lastName", profile.lastName);
    fillByName(d, "last_name", profile.lastName);
    fillByName(d, "email", profile.email);
    fillByName(d, "phone", profile.phone);
    fillByLabel(d, [/first\s*name|given\s*name|firstname/i], profile.firstName);
    fillByLabel(d, [/last\s*name|surname|family\s*name|lastname/i], profile.lastName);
    fillByLabel(d, [/email|e-?mail\s*address/i], profile.email);
    fillByLabel(d, [/phone|telephone|mobile|contact\s*number|phone\s*number/i], profile.phone);
    fillByDataOrAria(d, ["input-firstName", "firstName", "input-first_name"], [/first\s*name|firstname/i], profile.firstName);
    fillByDataOrAria(d, ["input-lastName", "lastName", "input-last_name"], [/last\s*name|lastname/i], profile.lastName);
    fillByDataOrAria(d, ["input-email", "email"], [/email/i], profile.email);
    fillByDataOrAria(d, ["input-phone", "input-telephone", "phone"], [/phone|telephone/i], profile.phone);
    if (profile.dateOfBirth) fillDateFields(d, profile.dateOfBirth);
    if (profile.address) fillByName(d, "address", profile.address) || fillField(d, ['input[name="address"]', 'input[id="address"]'], profile.address);
    if (profile.city) fillByName(d, "city", profile.city) || fillSelect(d, [/city|location\s*city/i], profile.city);
    if (profile.state) fillSelect(d, [/state|region|province/i], profile.state);
    if (profile.zip) fillByName(d, "zip", profile.zip) || fillByName(d, "postal", profile.zip) || fillField(d, ['input[name="zip"]', 'input[id="zipCode"]'], profile.zip);
    if (profile.linkedinUrl) fillField(d, ['input[name*="linkedin"]', 'input[id*="linkedin"]', 'input[placeholder*="LinkedIn"]'], profile.linkedinUrl);
    if (profile.githubUrl) fillField(d, ['input[name*="github"]', 'input[id*="github"]', 'input[placeholder*="GitHub"]'], profile.githubUrl);
    if (profile.skills?.length) tryFillSkills(d, profile.skills);
  }
  function applyFullAutofill(payload) {
    const doc = document;
    const profile = payload.resumeText ? parseResume(payload.resumeText) : payload.profile ?? { firstName: "", lastName: "", email: "", phone: "" };
    applyProfile(profile);
    fillResumeOrCoverLetterAreas(doc, payload.resumeText ?? void 0, payload.coverLetterText);
    if (profile.state) fillSelect(doc, [/state|region|province/i], profile.state);
    if (profile.city) fillSelect(doc, [/city|location\s*city/i], profile.city);
    const allSkills = [...profile.skills ?? [], ...payload.skills ?? []];
    if (allSkills.length) tryFillSkills(doc, allSkills);
    if (payload.coverLetterFileUrl) showFileUploadHint(payload.coverLetterFileUrl);
    else showFileUploadHint(void 0);
    tryFillResumeFileUpload(doc, payload.resumeFileUrl);
  }
  function tryFillResumeFileUpload(doc, resumeFileUrl) {
    if (!resumeFileUrl) return;
    const fileInputs = Array.from(doc.querySelectorAll('input[type="file"]'));
    for (const input of fileInputs) {
      if (input.hasAttribute(ATTR)) continue;
      const name = (input.getAttribute("name") || "").toLowerCase();
      const id = (input.getAttribute("id") || "").toLowerCase();
      const accept = (input.getAttribute("accept") || "").toLowerCase();
      const label = (input.getAttribute("aria-label") || "").toLowerCase();
      const text = [name, id, accept, label].join(" ");
      if (!/resume|cv|curriculum|attachment|upload|pdf/.test(text)) continue;
      (async () => {
        try {
          const response = await fetch(resumeFileUrl, { mode: "cors" });
          if (!response.ok) return;
          const blob = await response.blob();
          const file = new File([blob], "resume.pdf", { type: blob.type || "application/pdf" });
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.setAttribute(ATTR, "1");
        } catch {
        }
      })();
      return;
    }
  }
  function onShortcut() {
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Team 3 extension:", chrome.runtime.lastError.message);
        return;
      }
      if (response?.error) {
        console.warn("Team 3 extension:", response.error);
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
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "F") {
      e.preventDefault();
      onShortcut();
    }
  });
})();
