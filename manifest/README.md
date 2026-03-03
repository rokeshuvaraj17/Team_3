# Team 3 Chrome Extension (Manifest v3)

## Port (local testing)

The extension is configured for **local** backend and frontend:

- **Backend:** `http://localhost:3000` (set in `utils/api.ts` and `background.ts`)
- **Frontend / web app:** `http://localhost:5173` (derived from API_BASE; used for “Open in Team 3”, profile, generate resume/cover letter links)

Start both before testing:

1. **Backend:** `cd Backend/Node && npm run dev` (or `node server.js`)
2. **Frontend:** `cd Web_frontend && npm run dev` (Vite on 5173)

Load the extension from the **`dist`** folder. For production, change `API_BASE` in `utils/api.ts` and `background.ts` to your production URL (e.g. `https://team-3-lvlf.onrender.com`) and run `npm run build` again.

## Build

From this folder (`manifest/`):

```bash
npm install
npm run build
```

This compiles TypeScript into `dist/` and copies `manifest.json` and `popup/popup.html` there. To only compile: `npm run compile` (or `npx tsc`).

## Load in Chrome

1. Open **chrome://extensions**.
2. Turn **Developer mode** on (top-right).
3. Click **Load unpacked**.
4. Select the **`dist`** folder inside this project’s `manifest` folder (not the repo root).

**Important:** You must load from **`dist`**, not the `manifest` folder. The built `content.js` lives in `dist/`; if you load from `manifest/`, autofill will not work on any page.

## Make autofill work

If autofill shows “couldn’t run” or “refresh the job page” on every page:

1. **Load the extension from `dist`**
   - In the project: `cd manifest` then `npm run build`.
   - In Chrome: **Extensions** → **Load unpacked** → choose the **`manifest/dist`** folder (not `manifest`).
2. **Reload the extension** (Extensions page → refresh icon on Team 3 Extension).
3. **Refresh the job application tab** (or open the job page again), then click **Autofill current page**.

Use autofill on the **tab where the job application form is open** (e.g. company careers site). It will not work on `chrome://` or the extension’s own pages.

## Debugging autofill (why fields aren’t filling)

1. **Open DevTools on the job application page**  
   Right‑click the page → **Inspect** → **Console** tab. Leave it open, then click **Autofill current page** in the extension.

2. **Check extension logs (prefix `[Team3 Autofill]`)**  
   - **“Sending to API: N fields”** – Number of form fields we detected and their `meta` (name/id/label/placeholder). If N is 0, the page may use different elements or all fields already have `data-team3-autofilled`.
   - **“API status: 200 | values count: X | expected: Y”** – If X ≠ Y, the backend returned the wrong number of values and we abort (no fill). That usually means the AI returned malformed JSON.
   - **“Values returned: 1. (empty) 2. "value" …”** – What the API returned for each field. If many are `(empty)`, the AI didn’t match your user data/resume to those field labels.
   - **“Skip N meta=… (empty value)”** – We skipped that field because the API returned an empty string.
   - **“Filled N meta=… with …”** – We applied a value to that field.
   - **“Length mismatch … Aborting fill”** – API response length ≠ number of fields; fill is not applied.
   - **“API or fill error: …”** – Network error, CORS, or backend crash; check backend logs.

3. **Check backend logs (Node)**  
   In the terminal where the backend runs you’ll see:
   - **`[Autofill match-fields] Field count: N | Metas: [...]`** – Fields we sent to the AI.
   - **`[Autofill match-fields] Raw model output (first 1500 chars): ...`** – Raw Gemini response (when `includeDebug` is sent). Use this to see if the model returns a valid JSON array.
   - **`[Autofill match-fields] Returning values (first 15): ...`** – Values we’re sending back. If these are empty or wrong, the issue is prompt/LLM or user data.

4. **Typical causes**
   - **API returns 502 / no response** – Backend or Gemini key issue; check backend logs and `.env` (e.g. `GEMINI_API_KEY`).
   - **Length mismatch** – Model didn’t return a JSON array with one value per field; check “Raw model output” in backend logs.
   - **Many “(empty)” in Values returned** – Field labels on the page don’t match your autofill keys or resume content; add custom fields or synonyms in the app’s autofill settings, or improve resume text.
   - **Values look correct but fields don’t fill** – Workday/custom inputs (e.g. combobox, date picker) may need focus/click; check for “Filled” lines for those indices. If you see “Filled” but the UI doesn’t update, the site may be using a custom component that ignores our events.

5. **Turn off debug logs**  
   In `manifest/content.ts` set `AUTOFILL_DEBUG = false`, then run `npm run build` and reload the extension.

## Test login

1. Ensure the backend is running on port 3000 and you have a user (sign up via the web app if needed).
2. Click the extension icon in the toolbar to open the popup.
3. Enter the same email and password you use on the web frontend and click **Log in**.
4. On any webpage, press **Ctrl+Shift+F** (Windows/Linux) or **Cmd+Shift+F** (Mac) to autofill first name, last name, email, and phone into common form fields.

## Changing the backend URL

Edit `API_BASE` in:

- `utils/api.ts` (popup login)
- `background.ts` (profile fetch)

Then update `host_permissions` in `manifest.json` to match (e.g. `https://your-api.com/*`). Rebuild and reload the extension.
