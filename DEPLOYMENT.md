# Deploy to Vercel (Frontend) and Render (Backend)

Your app has two parts: **Web_frontend** (React/Vite) and **Backend/Node** (Express). Deploy the backend first so you have its URL for the frontend env.

---

## 1. Deploy Backend to Render

### 1.1 Create a Web Service

1. Go to [render.com](https://render.com) and sign in (or sign up with GitHub).
2. **Dashboard** → **New** → **Web Service**.
3. Connect your GitHub repo: **Team_3** (or your repo name).
4. Configure:
   - **Name:** `jobflow-api` (or any name).
   - **Region:** Choose closest to your users.
   - **Branch:** `main`.
   - **Root Directory:** `Backend/Node` (important).
   - **Runtime:** `Node`.
   - **Build Command:** `npm install` (or leave default).
   - **Start Command:** `npm start` (runs `node server.js`).
   - **Instance type:** Free (or paid if you need always-on).

### 1.2 Environment Variables (Render)

In the same Web Service → **Environment** tab, add:

| Key | Description | Example |
|-----|-------------|---------|
| `NODE_ENV` | Set to `production` | `production` |
| `PORT` | Render sets this automatically; you can leave it or set `10000` | (optional) |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `PASSWORD_SALT` | Secret used for password hashing (generate a long random string) | e.g. 32+ char string |
| `FREE_JOB_API_KEY` or `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | Adzuna job API | From [Adzuna API](https://developer.adzuna.com) |
| `GEMINI_API_KEY` | For AI features (resume/cover letter) | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Your Cloudinary dashboard |
| `JOOBLE_API_KEY` | (Optional) Job API | If you use Jooble |
| `REED_API_KEY` | (Optional) Job API | If you use Reed |
| `GEMINI_MODEL` | (Optional) Defaults to `gemini-2.0-flash` | e.g. `gemini-2.0-flash` |

**Database:** If you don’t have PostgreSQL yet, on Render: **New** → **PostgreSQL**, create a DB, then copy **Internal Database URL** into `DATABASE_URL`.

### 1.3 Deploy

Click **Create Web Service**. Render will build and deploy. Note the service URL, e.g.:

`https://jobflow-api.onrender.com`

Use this as the API base URL for the frontend (no trailing slash).

---

## 2. Deploy Frontend to Vercel

### 2.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New** → **Project**.
3. Import your GitHub repo (**Team_3** or your repo name).

### 2.2 Configure Build

- **Framework Preset:** Vite (Vercel usually detects it).
- **Root Directory:** Click **Edit** and set to `Web_frontend` (so Vercel builds only the frontend).
- **Build Command:** `npm run build` (default).
- **Output Directory:** `dist` (default for Vite).
- **Install Command:** `npm install` (default).

### 2.3 Environment Variable (Vercel)

Add one variable so the frontend talks to your Render backend:

| Key | Value |
|-----|--------|
| `VITE_API_BASE_URL` | Your Render backend URL, e.g. `https://jobflow-api.onrender.com` |

No trailing slash. This is used for all `/api/*` requests.

### 2.4 Deploy

Click **Deploy**. When it’s done, Vercel gives you a URL like:

`https://your-project.vercel.app`

---

## 3. After Deployment

- **Frontend:** Open the Vercel URL; the app will call the backend using `VITE_API_BASE_URL`.
- **CORS:** Your backend already uses `cors()`; if your frontend is on a different domain, ensure Render allows that origin (your Express app may need `origin: ['https://your-project.vercel.app']` if you restrict CORS).
- **Extension zip:** The file `Web_frontend/public/jobflow-extension.zip` is deployed with the frontend, so “Add extension” → “Download” will work from the live site.
- **Render free tier:** The backend may spin down after inactivity; the first request can be slow (cold start).

---

## Quick reference

| Platform | Root directory | Start / build |
|----------|----------------|----------------|
| **Render (backend)** | `Backend/Node` | `npm start` → `node server.js` |
| **Vercel (frontend)** | `Web_frontend` | `npm run build` → serve `dist` |
