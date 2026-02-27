# Team 3 Chrome Extension (Manifest v3)

## Port

The extension talks to the backend at **http://localhost:3000**. Start your backend first (e.g. `cd Backend/Node && npm run dev` or `node server.js`).

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
