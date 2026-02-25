// =========================================
// JobFlow Extension — Popup Logic
// =========================================

// ---- State ----
let state = {
  resume: '',
  jobDescription: '',
  jobMeta: { title: '', company: '', location: '', source: '' },
  apiKey: '',
  model: 'gemini-2.0-flash',
};

// ---- DOM Elements ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Tabs
const tabs = $$('.tab');
const tabContents = $$('.tab-content');

// Resume
const resumeInput = $('#resumeInput');
const saveResumeBtn = $('#saveResume');
const clearResumeBtn = $('#clearResume');
const resumeStatus = $('#resumeStatus');
const resumePreview = $('#resumePreview');
const resumePreviewText = $('#resumePreviewText');
const editResumeBtn = $('#editResume');

// Scraper
const scrapeBtn = $('#scrapeBtn');
const scrapeResult = $('#scrapeResult');
const jobDescriptionEl = $('#jobDescription');
const manualJD = $('#manualJD');
const useForGenerationBtn = $('#useForGeneration');
const useManualJDBtn = $('#useManualJD');

// Generate
const generateBtn = $('#generateBtn');
const additionalNotes = $('#additionalNotes');
const toneSelect = $('#toneSelect');
const loadingIndicator = $('#loadingIndicator');
const generatedResult = $('#generatedResult');
const coverLetterOutput = $('#coverLetterOutput');
const copyResultBtn = $('#copyResult');
const regenerateBtn = $('#regenerateBtn');

// Settings
const settingsBtn = $('#settingsBtn');
const settingsPanel = $('#settingsPanel');
const apiKeyInput = $('#apiKey');
const modelSelect = $('#modelSelect');
const saveSettingsBtn = $('#saveSettings');

// Checklist
const checkResume = $('#checkResume');
const checkJD = $('#checkJD');
const checkAPI = $('#checkAPI');

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  updateUI();
});

// ---- Tab Navigation ----
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    tab.classList.add('active');
    $(`#tab-${target}`).classList.add('active');
    updateChecklist();
  });
});

// ---- Settings ----
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

saveSettingsBtn.addEventListener('click', async () => {
  state.apiKey = apiKeyInput.value.trim();
  state.model = modelSelect.value;
  await chrome.storage.local.set({
    apiKey: state.apiKey,
    model: state.model,
  });
  settingsPanel.classList.add('hidden');
  updateChecklist();
  showToast('Settings saved!');
});

// ---- Resume Tab ----
saveResumeBtn.addEventListener('click', async () => {
  const text = resumeInput.value.trim();
  if (!text) {
    showToast('Please paste your resume first.', true);
    return;
  }
  state.resume = text;
  await chrome.storage.local.set({ resume: text });
  updateResumeUI(true);
  showToast('Resume saved!');
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
  resumeInput.parentElement.classList.remove('hidden');
  saveResumeBtn.parentElement.classList.remove('hidden');
});

function updateResumeUI(hasSaved) {
  if (hasSaved && state.resume) {
    resumeStatus.textContent = 'Saved';
    resumeStatus.classList.add('saved');
    resumePreviewText.textContent = state.resume;
    resumePreview.classList.remove('hidden');
    resumeInput.parentElement.classList.add('hidden');
    saveResumeBtn.parentElement.classList.add('hidden');
  } else {
    resumeStatus.textContent = 'Not saved';
    resumeStatus.classList.remove('saved');
    resumePreview.classList.add('hidden');
    resumeInput.parentElement.classList.remove('hidden');
    saveResumeBtn.parentElement.classList.remove('hidden');
  }
  updateChecklist();
}

// ---- Scraper Tab ----
scrapeBtn.addEventListener('click', async () => {
  scrapeBtn.disabled = true;
  scrapeBtn.textContent = 'Scraping...';

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      showToast('No active tab found.', true);
      return;
    }

    // Inject and execute the content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeJobPage,
    });

    if (results && results[0] && results[0].result) {
      const data = results[0].result;

      if (data.error) {
        showToast(data.error, true);
        return;
      }

      state.jobMeta = {
        title: data.title || '',
        company: data.company || '',
        location: data.location || '',
        source: data.source || '',
      };
      state.jobDescription = data.description || '';

      // Update UI
      $('#scrapedTitle').textContent = state.jobMeta.title || '—';
      $('#scrapedCompany').textContent = state.jobMeta.company || '—';
      $('#scrapedLocation').textContent = state.jobMeta.location || '—';
      $('#scrapedSource').textContent = state.jobMeta.source || '—';
      jobDescriptionEl.value = state.jobDescription;
      scrapeResult.classList.remove('hidden');

      showToast('Job description scraped!');
    } else {
      showToast('Could not scrape this page. Try pasting manually.', true);
    }
  } catch (err) {
    console.error('Scrape error:', err);
    showToast('Scraping failed. Try pasting manually.', true);
  } finally {
    scrapeBtn.disabled = false;
    scrapeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3"/>
      </svg>
      Scrape This Page
    `;
  }
});

// This function runs IN the web page context
function scrapeJobPage() {
  const url = window.location.href;
  let title = '', company = '', location = '', description = '', source = '';

  try {
    // ---- LinkedIn ----
    if (url.includes('linkedin.com')) {
      source = 'LinkedIn';
      title = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.t-bold, [data-tracking-control-name="public_jobs_topcard-title"]')?.textContent?.trim() ||
        document.querySelector('h1')?.textContent?.trim() || '';
      company = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-unified-top-card__subtitle-primary-grouping a, [data-tracking-control-name="public_jobs_topcard-org"]')?.textContent?.trim() || '';
      location = document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, [data-tracking-control-name="public_jobs_topcard-location"]')?.textContent?.trim() || '';

      // Job description: try many selectors (LinkedIn changes DOM often)
      const descSelectors = [
        '.jobs-description__content',
        '.jobs-description-content',
        '.jobs-box__html-content',
        '#job-details',
        '[data-job-details]',
        '.jobs-description',
        'section.jobs-description-content__container',
        '.jobs-description-content__container',
        'div[class*="jobs-description"]',
        'article .jobs-box__html-content',
      ];
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el?.innerText?.trim()) {
          description = el.innerText.trim();
          break;
        }
      }
      // Fallback: main content area
      if (!description) {
        const main = document.querySelector('main, [role="main"], #main');
        if (main) description = main.innerText.trim().substring(0, 15000);
      }
    }

    // ---- Naukri ----
    else if (url.includes('naukri.com')) {
      source = 'Naukri';
      title = document.querySelector('h1.title, h1[itemprop="title"], .jd-header-title')?.textContent?.trim() || document.querySelector('h1')?.textContent?.trim() || '';
      company = document.querySelector('.jd-header-comp-name a', '.company-name', '[itemprop="hiringOrganization"]')?.textContent?.trim() || '';
      location = document.querySelector('.loc', '.location', '[itemprop="jobLocation"]')?.textContent?.trim() || '';
      const descEl = document.querySelector('.job-description', '#jobDescriptionText', '.description', '[class*="job-desc"]');
      description = descEl?.innerText?.trim() || document.querySelector('.detail-desc')?.innerText?.trim() || '';
    }

    // ---- Indeed ----
    else if (url.includes('indeed.com')) {
      source = 'Indeed';
      title = document.querySelector('.jobsearch-JobInfoHeader-title, h1[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim() || '';
      company = document.querySelector('[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating-companyHeader a')?.textContent?.trim() || '';
      location = document.querySelector('[data-testid="inlineHeader-companyLocation"], .jobsearch-InlineCompanyRating-companyHeader + div')?.textContent?.trim() || '';
      const descEl = document.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText');
      description = descEl?.innerText?.trim() || '';
    }

    // ---- Greenhouse ----
    else if (url.includes('greenhouse.io')) {
      source = 'Greenhouse';
      title = document.querySelector('.app-title, h1.heading')?.textContent?.trim() || '';
      company = document.querySelector('.company-name, span.company-name')?.textContent?.trim() || '';
      location = document.querySelector('.location, .body--metadata')?.textContent?.trim() || '';
      const descEl = document.querySelector('#content, .content');
      description = descEl?.innerText?.trim() || '';
    }

    // ---- Lever ----
    else if (url.includes('lever.co')) {
      source = 'Lever';
      title = document.querySelector('.posting-headline h2')?.textContent?.trim() || '';
      company = ''; // Lever often has company in the subdomain
      location = document.querySelector('.posting-categories .sort-by-time, .location')?.textContent?.trim() || '';
      const sections = document.querySelectorAll('.posting-page .section-wrapper');
      description = Array.from(sections).map(s => s.innerText).join('\n\n').trim();
    }

    // ---- Workday ----
    else if (url.includes('myworkdayjobs.com')) {
      source = 'Workday';
      title = document.querySelector('[data-automation-id="jobPostingHeader"], h2')?.textContent?.trim() || '';
      company = document.querySelector('[data-automation-id="company"]')?.textContent?.trim() || '';
      location = document.querySelector('[data-automation-id="locations"]')?.textContent?.trim() || '';
      const descEl = document.querySelector('[data-automation-id="jobPostingDescription"]');
      description = descEl?.innerText?.trim() || '';
    }

    // ---- Glassdoor ----
    else if (url.includes('glassdoor.com')) {
      source = 'Glassdoor';
      title = document.querySelector('[data-test="job-title"], .e1tk4kwz4')?.textContent?.trim() || '';
      company = document.querySelector('[data-test="employer-name"], .e1tk4kwz1')?.textContent?.trim() || '';
      location = document.querySelector('[data-test="location"]')?.textContent?.trim() || '';
      const descEl = document.querySelector('.jobDescriptionContent, [data-test="jobDescriptionContent"]');
      description = descEl?.innerText?.trim() || '';
    }

    // ---- Fallback ----
    else {
      source = 'Unknown';
      // Try generic selectors
      title = document.querySelector('h1')?.textContent?.trim() || document.title;
      const bodyText = document.body.innerText;
      description = bodyText.substring(0, 5000);
      return { title, company, location, description, source, error: 'Unsupported site. Extracted page text — you may want to clean it up.' };
    }

    if (!description) {
      return { title, company, location, description: '', source, error: 'Could not find job description on this page.' };
    }

    return { title, company, location, description, source };
  } catch (e) {
    return { error: 'Scraping failed: ' + e.message };
  }
}

// Use scraped JD
useForGenerationBtn.addEventListener('click', () => {
  state.jobDescription = jobDescriptionEl.value.trim();
  switchToTab('generate');
  updateChecklist();
  showToast('Job description loaded!');
});

// Use manual JD
useManualJDBtn.addEventListener('click', () => {
  const text = manualJD.value.trim();
  if (!text) {
    showToast('Please paste a job description first.', true);
    return;
  }
  state.jobDescription = text;
  state.jobMeta = { title: '', company: '', location: '', source: 'Manual' };
  switchToTab('generate');
  updateChecklist();
  showToast('Job description loaded!');
});

function switchToTab(tabName) {
  tabs.forEach(t => t.classList.remove('active'));
  tabContents.forEach(tc => tc.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  $(`#tab-${tabName}`).classList.add('active');
}

// ---- Generate Tab ----
generateBtn.addEventListener('click', () => generateCoverLetter());
regenerateBtn.addEventListener('click', () => generateCoverLetter());

async function generateCoverLetter() {
  if (!state.resume || !state.jobDescription || !state.apiKey) {
    showToast('Missing resume, job description, or API key.', true);
    return;
  }

  // Show loading
  generateBtn.classList.add('hidden');
  generatedResult.classList.add('hidden');
  loadingIndicator.classList.remove('hidden');

  const tone = toneSelect.value;
  const notes = additionalNotes.value.trim();

  const jobInfo = state.jobMeta.title
    ? `Job Title: ${state.jobMeta.title}\nCompany: ${state.jobMeta.company}\nLocation: ${state.jobMeta.location}\n\n`
    : '';

  const prompt = `You are an expert career coach and cover letter writer. Generate a tailored, compelling cover letter based on the following:

--- RESUME ---
${state.resume}

--- JOB DESCRIPTION ---
${jobInfo}${state.jobDescription}

--- INSTRUCTIONS ---
Tone: ${tone}
${notes ? `Additional instructions: ${notes}` : ''}

Write a cover letter that:
1. Directly addresses the key requirements from the job description
2. Maps the candidate's specific experiences to what the employer needs
3. Sounds authentically human — not generic or AI-written
4. Is concise (250-350 words unless instructed otherwise)
5. Opens with something more engaging than "I am writing to apply for..."
6. Ends with a confident, forward-looking closing

Output ONLY the cover letter text. No headers, labels, or markdown formatting.`;

  try {
    // Use v1 API for stable model support (v1beta can return "model not found" for older model IDs)
    const modelId = state.model || 'gemini-2.0-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${state.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API error (${response.status})`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No content generated. Try again.');
    }

    coverLetterOutput.textContent = text;
    generatedResult.classList.remove('hidden');
    showToast('Cover letter generated!');

  } catch (err) {
    console.error('Generation error:', err);
    showToast(`Error: ${err.message}`, true);
  } finally {
    loadingIndicator.classList.add('hidden');
    generateBtn.classList.remove('hidden');
  }
}

// Copy to clipboard
copyResultBtn.addEventListener('click', async () => {
  const text = coverLetterOutput.textContent;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied!');
  }
});

// ---- Checklist ----
function updateChecklist() {
  const hasResume = !!state.resume;
  const hasJD = !!state.jobDescription;
  const hasAPI = !!state.apiKey;

  checkResume.classList.toggle('ready', hasResume);
  checkJD.classList.toggle('ready', hasJD);
  checkAPI.classList.toggle('ready', hasAPI);

  generateBtn.disabled = !(hasResume && hasJD && hasAPI);
}

// ---- Persistence ----
async function loadState() {
  const data = await chrome.storage.local.get(['resume', 'apiKey', 'model', 'jobDescription', 'jobMeta']);
  state.resume = data.resume || '';
  state.apiKey = data.apiKey || '';
  // Migrate deprecated model IDs that cause "model not found" on v1beta
  const savedModel = data.model || 'gemini-2.0-flash';
  state.model = ['gemini-1.5-flash', 'gemini-1.5-pro'].includes(savedModel) ? 'gemini-2.0-flash' : savedModel;
  state.jobDescription = data.jobDescription || '';
  state.jobMeta = data.jobMeta || { title: '', company: '', location: '', source: '' };

  // Populate fields
  apiKeyInput.value = state.apiKey;
  if (modelSelect.querySelector(`option[value="${state.model}"]`)) {
    modelSelect.value = state.model;
  } else {
    modelSelect.value = 'gemini-2.0-flash';
    state.model = 'gemini-2.0-flash';
  }
  if (state.resume) {
    resumeInput.value = state.resume;
  }
}

function updateUI() {
  updateResumeUI(!!state.resume);
  updateChecklist();
}

// ---- Toast ----
function showToast(message, isError = false) {
  // Remove existing
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
