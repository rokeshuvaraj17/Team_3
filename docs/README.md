# Documentation

Everything that powers the product documentation now lives inside this project.

## Layout

- `media/` — the raw captured **screenshots and video** used by the docs site:
  - `automate-apply-capture/` — light-theme module screenshots
  - `automate-apply-capture-dark/` — dark-theme module screenshots
  - `automate-apply-annotated/` — screenshots with red-box annotations
  - `automate-apply-extension/` — browser-extension popup + autofill before/after demos
  - `automate-apply-walkthrough/` — narrated walkthrough video (`full-session.webm`) + captions (`.vtt`)
- `AUTOFILL_FORM_FIELDS.md`, `SYSTEM_ARCHITECTURE.md` — written reference docs.

## Generated documentation site

The browsable documentation website is generated from `media/` (above) plus the
content in the capture tool, and is written to:

```
frontend/public/docs/
```

That folder is what Vercel serves at `/docs` (e.g. `https://team-3-two.vercel.app/docs/`).
It is a build output — edit the source media in `media/` (or the content JSON in the
capture tool) and re-run the build rather than editing the HTML by hand.

## Regenerating the site

The generator is the separate `browser-capture-tool` CLI (kept intentionally standalone).
Its scripts read screenshots/video from `Automate_Apply/docs/media/` and write the site into
`Automate_Apply/frontend/public/docs/`:

```bash
cd ../browser-capture-tool          # the standalone CLI, not part of this repo
node scripts/build-automate-docs-site.cjs      # rebuild the site from docs/media
node scripts/qa-automate-docs.cjs --loops=1     # verify (33 checks)
```

To re-capture fresh screenshots/video, run the capture workflows in that tool; the
`capture-extension-demo.cjs` script writes straight into `docs/media/automate-apply-extension/`.
