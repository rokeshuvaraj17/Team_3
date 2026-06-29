# Automate & Apply - Backend (Node)

> **Subfolder note:** This is `backend/` inside a parent repo. All file creation, edits, and commits must stay within this folder. The `.git` directory lives in the parent (`Automate_Apply/`).

## What This Is

A job automation and application platform backend. Users search jobs (4 external APIs), manage resumes/cover letters, generate AI content (multi-provider LLM), track applications, and autofill forms via a browser extension.

## Tech Stack

- **Runtime:** Node.js (CommonJS)
- **Framework:** Express 5.2
- **Database:** PostgreSQL via `pg` (connection pool, parameterized queries)
- **Auth:** Header-based (`x-user-id`), bcrypt for passwords
- **File uploads:** multer (memory storage) + Cloudinary CDN
- **AI:** Multi-provider LLM support (Gemini, OpenAI, Anthropic, OpenRouter, Groq, Together, Mistral, Cohere)
- **Other:** pdf-parse, node-latex, archiver

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (nodemon) |
| `npm start` | Production start |
| `npm run start:legacy` | Legacy entry point (deprecated) |

No test framework is configured yet.

## Project Structure

```
src/
  app.js              # Express app, CORS, route mounting, error handler
  server.js           # Entry point (6 lines - just listens on PORT)
  config/             # env.js (all env vars), db.js (pg pool), cloudinary.js
  controllers/        # Request handlers - validation, orchestration, response
  models/             # Pure DB functions - parameterized queries, no business logic
  routes/             # Route definitions with per-route middleware composition
  middleware/         # auth, requireDb, errorHandler, upload (multer configs)
  services/           # External integrations (ai, jobSearch, cloudinary)
  utils/              # Constants (AUTOFILL_FIELD_KEYS, DEFAULT_API_KEY_PROVIDERS)
migrations/           # SQL migration files
schema/               # Database schema definitions
resumake/             # Legacy resume-making module
```

## Key Entry Points

- **App setup:** `src/app.js` - all route mounting and middleware
- **Server start:** `src/server.js` - just PORT listener
- **Config:** `src/config/env.js` - all environment variables with fallbacks
- **DB pool:** `src/config/db.js` - PostgreSQL pool with SSL detection

## Route Map

All routes mount under `/api/` (see `src/app.js:51-64`):

| Prefix | Auth | Purpose |
|--------|------|---------|
| `/health` | No | Health checks |
| `/signup`, `/login` | No | Authentication |
| `/profile` | Yes | User profile + photo |
| `/autofill` | Mixed | Form autofill data + semantic matching |
| `/jobs` | Mixed | Job search (proxy to external APIs) + applications |
| `/resumes` | Yes | Resume CRUD + PDF parsing |
| `/cover-letters` | Yes | Cover letter CRUD |
| `/ai` | Mixed | AI generation (resume, cover letter, skills, translate) |
| `/resumake` | Yes | Resume builder with templates |
| `/api-keys` | Yes | LLM API key management |
| `/api-key-providers` | No | Available LLM providers list |
| `/analytics` | Yes | Action tracking |
| `/job-tracker` | Yes | Application history |
| `/extension` | Yes | Browser extension state |

## Environment

See `.env.example` for required variables. Key groups:
- `PORT`, `DATABASE_URL` - server/database
- `ADZUNA_APP_ID`, `JOOBLE_API_KEY`, `REED_API_KEY` - job search APIs
- `GEMINI_API_KEY`, `AUTOFILL_LLM_*` - AI providers
- `CLOUDINARY_*` - file storage
- `ALLOWED_ORIGINS` - CORS origins (comma-separated)

## Additional Documentation

Check these files when working in the relevant areas:

| Document | When to check |
|----------|---------------|
| [Architectural Patterns](.claude/docs/architectural_patterns.md) | Adding new routes/controllers/models, understanding conventions |
