# Team_3 – Job Application Portal

A production-oriented **job application portal** (similar to LinkedIn/Naukri) with a React + Vite frontend, Node.js backend, and PostgreSQL (Supabase) database.

---

## Tech Stack

| Layer      | Technologies |
|-----------|---------------|
| **Frontend** | React 19, Vite 7, TypeScript, Tailwind CSS 4, Framer Motion, Lucide React, React Router |
| **Backend**  | Node.js, Express 5, pg (PostgreSQL), bcrypt, dotenv, cors |
| **Database** | PostgreSQL (Supabase) – UUID PKs, ENUMs, JSONB where needed, indexes for scale |

---

## Project Structure

```
Project 1/
├── README.md                 # This file
├── Web_frontend/             # Vite + React SPA
│   ├── src/
│   │   ├── App.tsx           # Routes: /, /signup, /app
│   │   ├── main.tsx
│   │   ├── index.css         # Tailwind + base styles
│   │   ├── lib/
│   │   │   ├── api.ts        # apiUrl(), apiBase for API calls
│   │   │   ├── utils.ts      # cn() (shadcn-style class merge)
│   │   │   └── validation.ts # Sign-up validation (name, email, password, confirm)
│   │   ├── components/ui/
│   │   │   ├── sign-in-card-2.tsx   # Login page (3D card, purple theme)
│   │   │   └── sign-up-card.tsx     # Sign-up (name, email, password, confirm + validation)
│   │   └── pages/
│   │       └── WelcomePage.tsx      # Post-login welcome (shows user, email_verified)
│   ├── vite.config.ts        # Vite + Tailwind; proxy /api → backend
│   ├── package.json
│   └── .env.example           # Optional VITE_API_BASE_URL for production
│
├── Backend/
│   └── Node/
│       ├── server.js         # Express: /api/health, /api/signup, /api/login
│       ├── package.json
│       ├── .env              # DATABASE_URL, PASSWORD_SALT, PORT (not committed)
│       ├── .env.example      # Template for .env
│       └── schema/
│           └── job_portal_schema.sql   # Full PostgreSQL schema (job portal tables)
│
└── (Supabase)                # Database hosted on Supabase
    └── public: users, user_profiles, companies, jobs, job_applications, saved_jobs,
                work_experiences, education, skills, user_skills, certifications,
                projects, languages, resumes
```

---

## Features

- **Auth**: Sign up (name, email, password, confirm password with validation) and sign in; passwords hashed with bcrypt + `PASSWORD_SALT`; JWT/session can be added later.
- **Frontend**: Login and sign-up pages with purple gradient, glass card, 3D tilt, and animations; React Router for `/`, `/signup`, `/app`.
- **Backend**: REST API – `POST /api/signup`, `POST /api/login`, `GET /api/health`; connects to Supabase Postgres via `DATABASE_URL`.
- **Database**: Job portal schema in Supabase (extensions, ENUMs, 14 tables, indexes, triggers). Existing `users` table used for auth; job portal tables (user_profiles, companies, jobs, job_applications, etc.) created via migrations.

---

## Prerequisites

- **Node.js** (v18+)
- **npm**
- **Supabase** project (for PostgreSQL)
- **Git**

---

## Setup

### 1. Clone and install

```bash
git clone git@github.com:rokeshuvaraj17/Team_3.git
cd Team_3
```

### 2. Backend (Node)

```bash
cd Backend/Node
npm install
cp .env.example .env
```

Edit **`.env`**:

- `DATABASE_URL` – Supabase Postgres connection string (e.g. `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres`).
- `PASSWORD_SALT` – Secret string used when hashing passwords (required for signup/login).
- `PORT` – Optional; default `3000`.

```bash
npm start
# Backend runs at http://localhost:3000
```

### 3. Frontend (Vite)

In a **new terminal**:

```bash
cd Web_frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173; /api is proxied to backend
```

### 4. Database (Supabase)

- Tables are already created via Supabase migrations (see **Database schema** below).
- If you use a **new** Supabase project, run the SQL in `Backend/Node/schema/job_portal_schema.sql` in the SQL Editor (or apply the same migrations). Skip creating `users` if you already have an auth `users` table.

---

## Running the App

1. **Start backend**: `cd Backend/Node && npm start`
2. **Start frontend**: `cd Web_frontend && npm run dev`
3. Open **http://localhost:5173**
   - **Sign up** → `/signup` (validates name, email, password, confirm password) → creates user in DB → redirects to sign-in.
   - **Sign in** → `/` (email + password) → redirects to `/app` with user info.
   - **Welcome page** (`/app`) shows user name and email verification status.

---

## API Endpoints

| Method | Path          | Description |
|--------|---------------|-------------|
| GET    | /api/health   | Health check; returns `{ ok, message, timestamp }` |
| POST   | /api/signup   | Body: `{ name, email, password }`. Creates user (bcrypt + PASSWORD_SALT). Returns `201` + user or `409` if email exists. |
| POST   | /api/login    | Body: `{ email, password }`. Validates against DB. Returns user (id, name, email, email_verified) or `401`. |

Frontend uses relative URLs (e.g. `fetch('/api/signup')`); Vite proxies `/api` to `http://localhost:3000` in development.

---

## Database Schema (Supabase)

- **Extensions**: `citext`, `pgcrypto`
- **ENUMs**: `employment_type`, `application_status`, `job_type`, `proficiency_level`
- **Core**: `users` (auth; existing), `user_profiles`, `companies`
- **User-related**: `work_experiences`, `education`, `skills`, `user_skills`, `certifications`, `projects`, `languages`, `resumes`
- **Jobs**: `jobs`, `job_applications`, `saved_jobs`

All tables use **UUID** primary keys, **timestamptz** for timestamps, and appropriate indexes/FKs. File storage is **URLs only** (e.g. `resumes.file_url`). See `Backend/Node/schema/job_portal_schema.sql` for full DDL and design notes.

---

## Environment Variables

| Variable        | Where       | Description |
|----------------|-------------|-------------|
| `DATABASE_URL` | Backend/Node/.env | Supabase Postgres connection string |
| `PASSWORD_SALT`| Backend/Node/.env | Secret used for password hashing (required) |
| `PORT`         | Backend/Node/.env | Server port (default 3000) |
| `VITE_API_BASE_URL` | Web_frontend/.env | Optional; production API base URL (no trailing slash) |

---

## Scripts

**Backend** (`Backend/Node`):

- `npm start` / `npm run dev` – run Express server

**Frontend** (`Web_frontend`):

- `npm run dev` – Vite dev server
- `npm run build` – production build
- `npm run preview` – preview production build
- `npm run lint` – ESLint

---

## License

ISC (or as specified in package.json).

---

## Contributors

Team_3 – Job Application Portal project.
