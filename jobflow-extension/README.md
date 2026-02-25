# JobFlow — Chrome Extension

Smart job application tracker with AI-powered cover letter generation.

## Features

- **Resume Input** — Paste and save your resume (stored locally in Chrome storage)
- **Job Description Scraper** — Auto-extracts JD from LinkedIn, Indeed, Greenhouse, Lever, Workday, Glassdoor
- **AI Cover Letter Generation** — Feeds resume + JD to Google Gemini (free tier) and generates a tailored cover letter
- **Floating Save Button** — Shows a "Save to JobFlow" button on supported job sites

## Setup

### 1. Get a Free Gemini API Key

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Copy the key — it starts with `AIza...`

The free tier gives you **15 requests per minute** on Gemini 2.0 Flash, which is more than enough.

### 2. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `jobflow-extension` folder
5. The JobFlow icon should appear in your toolbar

### 3. Configure the API Key

1. Click the JobFlow icon in the toolbar
2. Click the ⚙ gear icon in the top-right
3. Paste your Gemini API key
4. Click "Save Settings"

## Usage

### Save Your Resume
1. Click the extension → **Resume** tab
2. Paste your full resume text
3. Click **Save Resume**

### Scrape a Job Description
**Option A — Auto scrape:**
1. Navigate to a job posting on a supported site
2. Click the extension → **Job Scraper** tab → **Scrape This Page**

**Option B — Floating button:**
1. On supported sites, a blue "Save to JobFlow" button appears in the bottom-right
2. Click it to auto-save the JD

**Option C — Manual:**
1. Copy the job description text
2. Paste it in the manual input area on the Scraper tab

### Generate a Cover Letter
1. Go to the **Generate** tab
2. Verify all three checklist items are green ✓
3. Optionally add custom instructions and choose a tone
4. Click **Generate Cover Letter**
5. Copy the result!

## Supported Job Sites

| Site | Auto-scrape |
|------|------------|
| LinkedIn Jobs | ✅ |
| Indeed | ✅ |
| Greenhouse | ✅ |
| Lever | ✅ |
| Workday | ✅ |
| Glassdoor | ✅ |
| Other sites | Manual paste |

## File Structure

```
jobflow-extension/
├── manifest.json       # Extension config (Manifest V3)
├── popup.html          # Main UI
├── popup.css           # Styles
├── popup.js            # UI logic + Gemini API integration
├── background.js       # Service worker
├── content.js          # Injected script on job sites
├── content.css         # Floating button styles
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Tech Stack

- **Chrome Extension Manifest V3** (latest standard)
- **Vanilla JS** — no build step, no framework dependencies
- **Chrome Storage API** — all data stays local on user's machine
- **Google Gemini API** — free tier for AI generation
- **Zero cost** — no backend server needed

## Next Steps / TODOs

- [ ] Application tracker dashboard (save applied jobs, track status)
- [ ] Auto-fill form fields on job sites
- [ ] Multiple resume profiles
- [ ] Export cover letters as PDF
- [ ] Firebase backend for cross-device sync (optional)

## Team

- Rokeshuvaraj Nagarajan
- Kushal Chhetri
- Ali El Sayed
- William Tolley

CS 5704 — Virginia Tech
