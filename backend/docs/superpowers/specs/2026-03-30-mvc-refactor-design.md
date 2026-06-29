# Backend MVC Refactor Design Spec

**Issue:** #1 — Restructure backend to MVC architecture
**Date:** 2026-03-30
**Status:** Approved

## Problem

The entire backend is a monolithic 2,583-line `server.js` containing all 51 route handlers, business logic, SQL queries, external API calls, helpers, and configuration. This must be split into a proper MVC structure.

## Approach

Strict MVC: `routes/ → controllers/ → models/ + services/`

## Directory Structure

```
Backend/Node/
├── src/
│   ├── app.js                     # Express app setup (middleware, CORS, mount routes)
│   ├── server.js                  # Entry point (~10 lines: import app, listen)
│   ├── config/
│   │   ├── db.js                  # PostgreSQL pool creation + error handler
│   │   ├── cloudinary.js          # Cloudinary SDK config
│   │   └── env.js                 # All env var loading (API keys, salt, ports)
│   ├── middleware/
│   │   ├── auth.js                # Extract + validate x-user-id header → req.userId
│   │   ├── upload.js              # Multer instances (photo, resume, coverLetter)
│   │   ├── requireDb.js           # Early-exit 503 if pool is null
│   │   └── errorHandler.js        # Centralized error handler (handleDbError + multer errors)
│   ├── routes/
│   │   ├── health.routes.js
│   │   ├── auth.routes.js
│   │   ├── profile.routes.js
│   │   ├── resume.routes.js
│   │   ├── coverLetter.routes.js
│   │   ├── job.routes.js
│   │   ├── ai.routes.js
│   │   ├── autofill.routes.js
│   │   ├── apiKey.routes.js
│   │   ├── jobTracker.routes.js
│   │   ├── extension.routes.js
│   │   ├── analytics.routes.js
│   │   └── resumake.routes.js
│   ├── controllers/               # One file per route file
│   │   ├── health.controller.js
│   │   ├── auth.controller.js
│   │   ├── profile.controller.js
│   │   ├── resume.controller.js
│   │   ├── coverLetter.controller.js
│   │   ├── job.controller.js
│   │   ├── ai.controller.js
│   │   ├── autofill.controller.js
│   │   ├── apiKey.controller.js
│   │   ├── jobTracker.controller.js
│   │   ├── extension.controller.js
│   │   ├── analytics.controller.js
│   │   └── resumake.controller.js
│   ├── models/                    # All SQL queries
│   │   ├── user.model.js          # public.users queries
│   │   ├── profile.model.js       # public.user_profiles queries
│   │   ├── resume.model.js        # public.resumes queries
│   │   ├── coverLetter.model.js   # public.cover_letters queries
│   │   ├── job.model.js           # public.jobs queries
│   │   ├── jobApplication.model.js # public.job_applications queries
│   │   ├── jobTracker.model.js    # public.job_tracker queries
│   │   ├── autofill.model.js      # public.user_autofill + user_autofill_custom_fields
│   │   ├── apiKey.model.js        # public.user_api_keys + api_key_providers queries
│   │   └── analytics.model.js     # Cross-table analytics queries
│   ├── services/                  # External API calls only
│   │   ├── ai.service.js          # generateWithUserKey (Gemini, Anthropic, OpenAI-compatible)
│   │   ├── jobSearch.service.js   # Adzuna, Jooble, Arbeitnow, Reed API calls
│   │   └── cloudinary.service.js  # uploadToCloudinary helper
│   └── utils/
│       ├── password.js            # saltedPassword helper
│       ├── constants.js           # AUTOFILL_FIELD_KEYS, COUNTRY maps, provider lists, AI prompts
│       └── helpers.js             # maskApiKey, locationMatchesCountry, mergeAutofillWithProfile
├── resumake/                      # Untouched
├── migrations/                    # Untouched
├── schema/                        # Untouched
└── package.json                   # Scripts: server.js → src/server.js
```

## Layer Responsibilities

| Layer | Does | Does NOT |
|-------|------|----------|
| **Routes** | Define method + path, apply middleware, call controller | Contain any logic |
| **Middleware** | Auth extraction, DB availability check, file upload config, error mapping | Business logic |
| **Controllers** | Validate request body/params, call models/services, format response, `next(err)` on failure | Raw SQL, external API calls |
| **Models** | Execute SQL queries, return plain JS objects | HTTP concerns (req/res) |
| **Services** | Call external APIs, return processed results | SQL, HTTP concerns |
| **Utils** | Pure functions (hashing, masking, constants) | Side effects |

## Request Flow

```
Request → Route → [Middleware] → Controller → Model/Service → Response
```

## Middleware Details

- **auth.js:** Extracts `x-user-id` header, attaches as `req.userId`. Returns 401 if missing. Applied per-route (not globally — health/auth routes don't need it).
- **requireDb.js:** Checks if `pool` is non-null. Returns 503 if null. Applied per-route on DB-dependent routes.
- **upload.js:** Exports three multer instances: `uploadPhoto`, `uploadResume`, `uploadCoverLetter`.
- **errorHandler.js:** Express error middleware (`err, req, res, next`). Absorbs current `handleDbError` logic. Controllers call `next(err)` instead of handling DB errors inline.

## Cross-Cutting Concerns

- **AI controller + API keys:** `ai.controller.js` calls `apiKey.model.js` to resolve the user's API key before calling `ai.service.js`. Cross-model access happens through controllers, not model-to-model.
- **Autofill + AI:** `autofill.controller.js` calls both `autofill.model.js` and `ai.service.js` for semantic matching.
- **Jobs:** `job.controller.js` calls `jobSearch.service.js` (external search), `job.model.js` (saved jobs), and `jobApplication.model.js` (applications).
- **Extension state:** In-memory Maps (`extensionJobResumeContext`, `extensionCoverLetterContext`) live in `extension.controller.js`.

## What Does NOT Change

- All 51 endpoint paths (`/api/...`) — identical
- All request/response shapes — identical
- CORS configuration — identical
- All environment variable names — identical
- CommonJS (`require`) — no ESM conversion
- No new dependencies
- `resumake/`, `migrations/`, `schema/` directories — untouched

## What Changes Outside `src/`

- `package.json` scripts: `server.js` → `src/server.js`
- Root `server.js` replaced (original preserved in git history)

## Acceptance Criteria (from Issue #1)

- [ ] All 51 endpoints work identically after restructure
- [ ] No business logic in route files
- [ ] No SQL queries outside of `models/`
- [ ] No external API calls outside of `services/`
- [ ] `server.js` is under 20 lines
- [ ] Manual verification of endpoints
