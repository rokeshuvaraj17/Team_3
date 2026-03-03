# System Architecture — Team 3 Job Application Portal

High-level architecture of the job application portal: Chrome extension, web app, Node backend, and external services.

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Browser (Chrome)                    │  Browser (any)                              │
│  • Extension popup / side panel     │  • Web app (React SPA)                       │
│  • Content script on job sites      │  • localhost:5173 / Vercel                   │
└──────────────┬──────────────────────┴────────────────┬───────────────────────────┘
               │                                        │
               │ chrome.runtime.sendMessage             │ fetch (CORS)
               │ apiFetch(API_BASE + path)              │ apiUrl() / apiBase
               ▼                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js + Express)                                │
│                         localhost:3000 / Render                                    │
│  • Auth (signup, login, x-user-id)                                                │
│  • Profile, resumes, cover letters, job tracker                                   │
│  • Autofill API, job search (Adzuna, Jooble, Reed, Arbeitnow)                     │
│  • AI: Gemini / custom LLM (cover letter, resume, skill suggestions, translate)   │
│  • Resumake (PDF generation), file uploads → Cloudinary                           │
└──────────────┬───────────────────────────────────────────────────────────────────┘
               │
               │ pg Pool, SSL for remote
               ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL (Supabase)  │  Cloudinary  │  Adzuna / Jooble / Reed / Gemini APIs   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Components

### 2.1 Chrome Extension (Manifest V3)

| Part | File(s) | Role |
|------|--------|------|
| **Manifest** | `manifest/manifest.json` | Permissions: storage, activeTab, scripting, sidePanel, tabs; host permissions for backend + `<all_urls>`. |
| **Background (service worker)** | `manifest/background.ts` → `dist/background.js` | Handles messages (e.g. `SET_USE_SIDEBAR`, `OPEN_SIDE_PANEL`, `JOB_SCRAPED`), stores scraped job in `chrome.storage`, applies sidebar preference, fetches profile for autofill and responds to `GET_PROFILE`. |
| **Content script** | `manifest/content.ts` → `dist/content.js` | Injected on `<all_urls>`. On job sites: injects FAB “Save to Team 3” and sidebar strip; listens for `APPLY_AUTOFILL`; applies table-based or full autofill (profile/resume/cover letter); marks fields with `data-team3-autofilled`. |
| **Popup / side panel** | `manifest/popup/popup.ts` + `popup.html` | Login, profile, resume/cover letter context, scrape current page, generate cover letter, autofill trigger; uses `manifest/utils/api.ts` for all backend calls. |
| **Scraper** | `manifest/scraper.ts` | Self-contained scraper for job page (LinkedIn, Workday, Greenhouse, etc.); returns title, company, location, description, source. Used by content (FAB) and popup. |
| **API client** | `manifest/utils/api.ts` | `API_BASE` (e.g. `http://localhost:3000`), `apiFetch(path, { token })` with `x-user-id` for auth. |

**Extension ↔ Backend:** All HTTP via `apiFetch()` to backend; CORS allows `chrome-extension://` and HTTPS/localhost. Auth: `x-user-id` (stored after login).

---

### 2.2 Web Frontend (React SPA)

| Part | Location | Role |
|------|----------|------|
| **App & routing** | `Web_frontend/src/App.tsx`, `main.tsx` | Routes: `/`, `/signup`, `/app`, etc. |
| **API** | `Web_frontend/src/lib/api.ts` | `apiUrl()` / `apiBase` for backend; proxy in dev (e.g. `/api` → backend). |
| **Pages** | `Web_frontend/src/pages/` | Welcome, job search, documents, Resumake, notifications, API connection, extension instructions, etc. |
| **UI** | React 19, Vite 7, TypeScript, Tailwind 4, Framer Motion, Lucide | Components and styling. |

**Deployment:** Vite dev server (e.g. port 5173); production can be Vercel (`vercel.json`). Same backend for web and extension.

---

### 2.3 Backend (Node.js + Express)

| Concern | Implementation |
|--------|----------------|
| **Runtime** | Node.js, Express 5, `dotenv`, `cors`. |
| **Database** | `pg` Pool; `DATABASE_URL` (Supabase); SSL for non-local. |
| **Auth** | `POST /api/signup`, `POST /api/login`; bcrypt + `PASSWORD_SALT`; stateless auth via `x-user-id` header. |
| **Profile & files** | `GET/PUT /api/profile`, `POST /api/profile/photo`; resumes and cover letters (CRUD, upload); Cloudinary for photo/resume/cover letter files. |
| **Autofill** | `GET /api/autofill`, `PUT /api/autofill` (user_autofill); `POST /api/autofill/semantic-match`, `semantic-option-match`, `match-fields` (AI). |
| **Jobs** | `GET /api/jobs/search` (Adzuna), Jooble, Arbeitnow, Reed; `GET/POST /api/job-tracker`; `GET /api/jobs`, `GET /api/jobs/:id`, apply/applied. |
| **Extension** | `POST/GET /api/extension/job-resume-context`, `cover-letter-context`, `GET /api/extension/download`. |
| **AI** | `POST /api/ai/skill-suggestions`, `generate-cover-letter`, `generate-resume`, `translate`; Gemini (or custom `AUTOFILL_LLM_URL`). |
| **Resumake** | `POST /api/resumake/generate`, `POST /api/resumake/compile-pdf`. |
| **Other** | Analytics, API keys (providers, CRUD), health (`/api/health`, `/api/health/db`). |

**CORS:** Allows `chrome-extension://`, `localhost:5173`, and configured origins (e.g. Render frontend URL).

---

### 2.4 Data Layer

| System | Purpose |
|--------|---------|
| **PostgreSQL (Supabase)** | Users, profiles, resumes, cover letters, jobs, job applications, job tracker, user_autofill, API keys, etc. |
| **Cloudinary** | Profile photos, resume/cover letter file storage; backend uploads via multer → memory → Cloudinary. |

---

### 2.5 External APIs

| Service | Use |
|---------|-----|
| **Adzuna** | Job search (`FREE_JOB_API_KEY` or `ADZUNA_APP_ID` + `ADZUNA_APP_KEY`). |
| **Jooble / Reed / Arbeitnow** | Additional job search when API keys set. |
| **Gemini** | Autofill LLM, cover letter/resume generation, skill suggestions, translate (or custom `AUTOFILL_LLM_URL`). |

---

## 3. Data Flows

### 3.1 Extension: Save job from job site

1. User on job site (e.g. LinkedIn) → content script shows “Save to Team 3” FAB.
2. User clicks FAB → content runs `scrapeJobPage()`, sends `JOB_SCRAPED` to background with scraped data + URL.
3. Background stores job in `chrome.storage.local`.
4. (Optional) Popup or web app can send this job to backend (e.g. job tracker) via API.

### 3.2 Extension: Autofill application form

1. User opens popup/side panel, selects resume/cover letter, clicks “Autofill”.
2. Popup gets profile + autofill data from backend (`GET /api/autofill`, profile, resume/cover letter text or URLs).
3. Popup sends `APPLY_AUTOFILL` to content script with payload (e.g. `fields`, `excluded`, `resumeText`, `profile`, `resumeFileUrl`).
4. Content script on the job page receives message, matches form fields (table-based or AI semantic match via backend), fills inputs, sets `data-team3-autofilled`, optionally uploads file to file inputs.

### 3.3 Web app: Login and profile

1. User signs up or logs in via web app → `POST /api/signup` or `POST /api/login`.
2. Backend validates, returns user id (and optionally token); frontend stores auth (e.g. for `x-user-id`).
3. Profile and documents (resumes, cover letters) loaded via `GET /api/profile`, `GET /api/resumes`, etc.; uploads go to backend → Cloudinary.

### 3.4 Cover letter / resume generation

1. Web or extension sends job context + resume/cover letter text to backend.
2. Backend calls Gemini (or custom LLM) for generation; returns generated text or file.
3. Resumake PDF: backend uses `resumake` + `compilePdf`; upload/store as needed.

---

## 4. Security Summary

- **Auth:** Passwords hashed with bcrypt + server-side salt; API auth via `x-user-id`.
- **CORS:** Backend restricts origins (web + extension).
- **DB:** Parameterized queries via `pg`; Supabase over SSL for remote.
- **Secrets:** `DATABASE_URL`, `PASSWORD_SALT`, API keys, Cloudinary credentials in env (e.g. `.env`); extension uses same backend URL (dev/prod).

---

## 5. Deployment

| Component | Local | Production |
|-----------|--------|------------|
| **Backend** | `PORT=3000` (e.g. Render) | `https://team-3-lvlf.onrender.com` (or similar) |
| **Web frontend** | Vite dev 5173 | e.g. Vercel, same host or subdomain |
| **Extension** | Load unpacked from `manifest/dist` | Pack and publish to Chrome Web Store; set `API_BASE` to production backend |
| **Database** | Supabase (dev/prod) | Supabase project |
| **Files** | Cloudinary | Same Cloudinary account |

Extension `manifest/utils/api.ts` and background use same `API_BASE` (e.g. switch to production URL for release build).
