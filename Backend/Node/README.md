# Backend — Node.js API Server

Express 5 REST API powering the Job Application Portal. Handles authentication, profile management, resume/cover letter generation, job search aggregation, AI-powered autofill, and Chrome extension integration.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js (v18+) |
| Framework | Express 5 |
| Database | PostgreSQL via Supabase |
| Auth | bcrypt + salt-based password hashing |
| File Storage | Cloudinary (photos, resumes, cover letters) |
| PDF Generation | LaTeX templates + node-latex (pdflatex) with LaTeX.Online fallback |
| AI/LLM | Multi-provider (Gemini, OpenAI, Anthropic, OpenRouter, Groq, Together, Mistral, Cohere) |

---

## Project Structure

```
Backend/Node/
├── src/                       # Main application source (MVC)
│   ├── app.js                 # Express app — CORS, route mounting, error handler
│   ├── server.js              # Entry point — listens on PORT
│   ├── config/                # env.js, db.js (pg pool), cloudinary.js
│   ├── controllers/           # Request handlers — validation, orchestration, response
│   ├── models/                # Pure DB functions — parameterized queries
│   ├── routes/                # Route definitions with per-route middleware
│   ├── middleware/            # auth, requireDb, errorHandler, upload (multer)
│   ├── services/              # External integrations (ai, jobSearch, cloudinary)
│   └── utils/                 # Constants and helpers
│
├── server.js                  # Legacy entry point (deprecated, use src/server.js)
├── run-migration.js           # Runs SQL migrations against the database
├── package.json
├── .env                       # Local config (not committed)
├── .env.example               # Template for .env
│
├── schema/
│   └── job_portal_schema.sql  # Base PostgreSQL schema (14 core tables)
│
├── migrations/                # Incremental schema changes (run in order)
│   ├── 001_create_cover_letters.sql
│   ├── 002_create_api_keys.sql
│   ├── 003_create_autofill.sql
│   ├── 004_create_autofill_custom_fields.sql
│   ├── 005_create_job_tracker.sql
│   ├── 006_add_cover_letter_html_content.sql
│   ├── 007_add_default_api_key.sql
│   ├── 008_add_resume_html_content.sql
│   └── 009_add_state_to_user_profiles.sql
│
└── resumake/                  # Resume PDF generator
    ├── index.js               # Generates LaTeX from resume data
    ├── compilePdf.js          # LaTeX → PDF (local pdflatex or LaTeX.Online)
    ├── template1.js – template10.js  # 10 LaTeX resume templates
    └── utils.js
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
PASSWORD_SALT=your_secret_salt_string

```

> **Important:** If your Supabase password contains special characters (`^`, `$`, `@`, etc.), URL-encode them (e.g. `^` → `%5E`, `$` → `%24`).

### 3. Set up the database (Already done) 
No setup needed as the database is already set up. Jump to step 4.

Run the base schema first, then migrations:

```bash
# Option A: via psql
psql "$DATABASE_URL" -f schema/job_portal_schema.sql

# Option B: paste schema/job_portal_schema.sql into Supabase SQL Editor
```

Then run migrations:

```bash
node run-migration.js
```

Migrations are numbered and run in order. They are idempotent (`IF NOT EXISTS`) so safe to re-run.

### 4. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

### 5. Verify

```bash
curl http://localhost:5001/api/health       # Server health
curl http://localhost:5001/api/health/db     # Database connectivity
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase) |
| `PASSWORD_SALT` | Yes | Secret string prepended to passwords before hashing |
| `PORT` | No | Server port (default: `3000`) |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name for file uploads |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `GEMINI_API_KEY` | No | Google Gemini API key (AI features) |
| `AUTOFILL_LLM_URL` | No | Custom LLM endpoint (takes precedence over Gemini) |
| `AUTOFILL_LLM_API_KEY` | No | Bearer token for custom LLM |
| `JOOBLE_API_KEY` | No | Jooble job search API |
| `REED_API_KEY` | No | Reed.co.uk job search API |
| `ADZUNA_APP_ID` | No | Adzuna job search app ID |
| `ADZUNA_APP_KEY` | No | Adzuna job search app key |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: localhost:5173) |

---

## Database Schema

### Base tables (via `schema/job_portal_schema.sql`)

`users` · `user_profiles` · `companies` · `work_experiences` · `education` · `skills` · `user_skills` · `certifications` · `projects` · `languages` · `resumes` · `jobs` · `job_applications` · `saved_jobs`

### Migration tables

`cover_letters` · `api_key_providers` · `user_api_keys` · `user_autofill` · `user_autofill_custom_fields` · `job_tracker`

All tables use UUID primary keys, `timestamptz` timestamps with auto-update triggers, and foreign keys with cascading deletes.

---

## API Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signup` | Create account (`{ name, email, password }`) |
| POST | `/api/login` | Authenticate (`{ email, password }`) → returns user object |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Create/update profile |
| POST | `/api/profile/photo` | Upload profile photo |

### Resumes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resumes` | List user resumes |
| POST | `/api/resumes` | Create resume |
| POST | `/api/resumes/upload` | Upload resume file (PDF/DOC/DOCX, 10MB max) |
| GET | `/api/resumes/:id/text` | Extract resume text |
| GET | `/api/resumes/:id/file` | Download resume file |
| PATCH | `/api/resumes/:id` | Update resume metadata |
| PATCH | `/api/resumes/:id/primary` | Set as primary resume |
| DELETE | `/api/resumes/:id` | Delete resume |

### Cover Letters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cover-letters` | List cover letters |
| POST | `/api/cover-letters/upload` | Upload cover letter file |
| GET | `/api/cover-letters/:id/text` | Extract text |
| GET | `/api/cover-letters/:id/file` | Download file |
| PATCH | `/api/cover-letters/:id` | Update metadata/HTML |
| DELETE | `/api/cover-letters/:id` | Delete cover letter |

### Resume Generation (Resumake)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resumake/generate` | Generate LaTeX from resume data |
| POST | `/api/resumake/compile-pdf` | Compile LaTeX → PDF |

### Job Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs/search` | Internal job search |
| GET | `/api/jobs/jooble/search` | Jooble API |
| GET | `/api/jobs/arbeitnow/search` | ArbeitsNow API |
| GET | `/api/jobs/reed/search` | Reed.co.uk API |

### Autofill

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/autofill` | Get autofill data (merged with profile) |
| PUT | `/api/autofill` | Save autofill data |
| POST | `/api/autofill/semantic-match` | AI-powered field matching |
| POST | `/api/autofill/semantic-option-match` | Match dropdown options |
| POST | `/api/autofill/match-fields` | Match form fields to autofill schema |

### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/skill-suggestions` | Generate skill suggestions |
| POST | `/api/ai/generate-cover-letter` | AI cover letter generation |
| POST | `/api/ai/generate-resume` | AI resume generation |
| POST | `/api/ai/translate` | Text translation |

### Job Tracker & Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/job-tracker` | Save job to tracker |
| GET | `/api/job-tracker` | Get tracked jobs |
| POST | `/api/jobs/:id/apply` | Submit job application |
| GET | `/api/jobs/:id/applied` | Check application status |

### API Key Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/api-key-providers` | List LLM providers |
| GET | `/api/api-keys` | Get user API keys |
| GET | `/api/api-keys/default` | Get default API key |
| POST | `/api/api-keys` | Add API key |
| PATCH | `/api/api-keys/:id` | Update API key |
| DELETE | `/api/api-keys/:id` | Delete API key |

### Extension Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/extension/job-resume-context` | Set context for extension |
| GET | `/api/extension/job-resume-context` | Get context |
| POST | `/api/extension/cover-letter-context` | Set cover letter context |
| GET | `/api/extension/cover-letter-context` | Get context |
| GET | `/api/extension/download` | Download extension zip |

### Health & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/health/db` | Database connectivity check |
| GET | `/api/analytics/stats` | User statistics |

All authenticated endpoints use the `x-user-id` header to identify the user.

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `npm start` | Run server with Node |
| `dev` | `npm run dev` | Run server with nodemon (auto-reload) |
| `test` | `npm test` | Run Jest tests once (serial mode for DB safety) |
| `test:watch` | `npm run test:watch` | Run Jest in watch mode |
| `test:coverage` | `npm run test:coverage` | Run Jest with coverage report |
| `test:db:prepare` | `npm run test:db:prepare` | Load `.env.test` and run migrations for test DB |
| `test:db:reset` | `npm run test:db:reset` | Truncate all public tables in test DB |
| `test:db:seed` | `npm run test:db:seed` | Insert baseline test fixtures |

---

## Testing

This backend uses Jest and Supertest for unit/integration tests.

### Test files and helpers

- `test/app.integration.test.js` — route mounting and middleware composition checks
- `test/utils-and-middleware.test.js` — utility and middleware unit tests
- `test/setup.smoke.test.js` — smoke test for app + DB connectivity
- `test/helpers/request.js` — authenticated request helper (`x-user-id` header)
- `test/helpers/db.js` — shared DB query/cleanup helpers
- `test/jest.setup.js` — loads `.env.test` before test files execute

### Environment isolation

Tests should use `.env.test`, not `.env`.

Example `.env.test` (Supabase):

```env
PORT=5002
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
PASSWORD_SALT=test_salt

GEMINI_API_KEY=dummy
JOOBLE_API_KEY=dummy
REED_API_KEY=dummy
ADZUNA_APP_ID=dummy
ADZUNA_APP_KEY=dummy
CLOUDINARY_CLOUD_NAME=dummy
CLOUDINARY_API_KEY=dummy
CLOUDINARY_API_SECRET=dummy
ALLOWED_ORIGINS=http://localhost:5173
```

Notes:

- Use a dedicated Supabase project/database for tests.
- URL-encode special characters in the password section of the connection string.
- Keep `.env.test` out of source control.

### Recommended local workflow

Run from `Backend/Node`:

```bash
npm run test:db:prepare
npm run test:db:reset
npm run test:db:seed
npm test
```

For active development:

```bash
npm run test:watch
```

For coverage:

```bash
npm run test:coverage
```

### Current expectations

- If the test DB is reachable, all test suites should pass.
- If only `test/setup.smoke.test.js` fails with `ECONNREFUSED`, your test DB connection in `.env.test` is not reachable.
- `console.error` output from error-path tests is expected and does not mean the test failed.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `password authentication failed` | URL-encode special characters in `DATABASE_URL` (`^`→`%5E`, `$`→`%24`) |
| `Connection refused` on port 5432 | Try the Supabase **pooler** connection string (port 6543) or force IPv4 with `psql -h <host> -U postgres` |
| CORS errors from `localhost:5173` | Check the server is actually running on the configured `PORT` — macOS AirPlay uses port 5000 |
| `relation "X" does not exist` | Run `schema/job_portal_schema.sql` before `node run-migration.js` |
| Migration order errors | Migrations are prefixed with numbers (`001_`, `002_`...) to ensure correct execution order |
| `npm run test:db:prepare` fails with `ECONNREFUSED` | The host/port in `.env.test` is unreachable. Verify Supabase project is active and connection string is correct. |
| Jest passes unit tests but smoke test fails | DB helper is working, but test DB is unavailable. Recheck `.env.test` and rerun prepare/reset/seed. |
