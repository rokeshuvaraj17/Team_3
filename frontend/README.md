# Automate & Apply - Web Frontend

A job search automation and career management platform that helps job seekers search for jobs, generate tailored resumes and cover letters, track applications, and autofill job forms via a Chrome extension.

## Tech Stack

- **React 19** with **TypeScript**
- **Vite** - build tool and dev server
- **Tailwind CSS** - utility-first styling with dark mode support
- **React Router DOM** - client-side routing
- **Framer Motion** - animations
- **jsPDF / html2canvas / pdfjs-dist** - PDF generation and viewing
- **DOMPurify** - HTML sanitization
- **Lucide React** - icons

## Features

- **Multi-source Job Search** - aggregates listings from Adzuna, Jooble, Arbeitnow, and Reed.co.uk
- **Job Filtering** - filter by country, salary, job type, and contract type
- **AI Resume Generation** - generate resumes tailored to specific job postings or custom criteria
- **Resume Builder** - build resumes using LaTeX-based templates
- **Cover Letter Generation** - AI-powered cover letters
- **Job Tracker** - track application status from "Not Applied" through "Offer Received"
- **Analytics Dashboard** - job search statistics and insights
- **Chrome Extension Integration** - autofill job application forms and save jobs from any site
- **Light/Dark Theme** - persistent theme toggle with system preference detection
- **Responsive Design** - mobile-friendly with collapsible sidebar

## Project Structure

```
src/
├── assets/          # Static images and SVGs
├── components/      # Reusable UI components
│   └── ui/          # Sign-in/sign-up cards, sidebar
├── contexts/        # React Context providers (ThemeContext)
├── layouts/         # AppLayout with sidebar + extension panel
├── lib/             # Utilities (API, auth, validation, currency, etc.)
├── pages/           # Page components (one per route)
├── types/           # TypeScript type definitions
├── App.tsx          # Root component with route definitions
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- The backend server running at `http://localhost:5001` (see `../backend`)

### Installation

```bash
npm install
```

### Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

In development, Vite proxies `/api` requests to `http://localhost:5001` (configured in `vite.config.ts`). For production, set:

```
VITE_API_BASE_URL=https://your-api.example.com
```

### Development

```bash
npm run dev
```

Opens the app at `http://localhost:5173` with hot module replacement.

### Build

```bash
npm run build
```

This will:
1. Build the Chrome extension from `../manifest`
2. Package the extension as a downloadable zip
3. Type-check with TypeScript
4. Build the production bundle with Vite

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Sign in |
| `/signup` | Sign up |
| `/onboarding` | First-time user setup |
| `/app` | Dashboard with job search |
| `/app/profile` | User profile management |
| `/app/generate-resume` | Resume generation options |
| `/app/generate-resume/job-based` | AI resume from job posting |
| `/app/generate-resume/custom` | Custom resume generation |
| `/app/generate-resume/builder` | Template-based resume builder |
| `/app/generate-cover-letter` | Cover letter generation |
| `/app/job-tracker` | Application tracking |
| `/app/documents` | Saved resumes and cover letters |
| `/app/analytics` | Job search analytics |
| `/app/extension` | Chrome extension download |
| `/app/api-connection` | API key settings |
| `/app/autofill-form-fields` | Form autofill configuration |
| `/app/settings` | User preferences |
| `/app/help` | Help and support |

## Backend API

The frontend communicates with a Node.js backend via REST API. Authentication uses a `x-user-id` header with the user ID stored in `localStorage`.

Key endpoints:
- `GET/POST /api/profile` - user profile
- `GET/POST /api/job-tracker` - job application tracking
- `GET /api/analytics/stats` - analytics data
- `GET /api/health` - health check
