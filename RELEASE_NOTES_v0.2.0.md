# Subsume v0.2.0 — Chrome Web Store candidate

First public-store packaging release. Version **0.2.0** is intended for Chrome Web Store upload once the developer registration fee is paid and listing assets are attached.

## Highlights

- **Onboarding wizard** — five steps with live TMDb key validation (OMDb / LLM optional) so new installs are not a dead app
- **Typecheck gate** — `npm run typecheck` / `tsc --noEmit` is clean
- **CI** — GitHub Actions runs typecheck, tests, and build on `main` and `chore/**`
- **Store package** — `npm run package` produces `subsume.zip` (flat dist contents, no source maps)
- **Privacy policy** — `docs/PRIVACY.md` + hostable `docs/privacy.html` (GitHub Pages workflow included)
- **Listing kit** — `store/LISTING.md`, `PERMISSIONS.md`, `SUBMISSION_CHECKLIST.md`, `MANIFEST_NOTES.md`
- **Test stability** — fixed wikidata mock teardown; **234** tests across 45 files
- **ESLint baseline** — advisory `npm run lint:eslint` (0 errors)
- **Manifest** — store-aligned short description; version **0.2.0**

## Install (unpacked / QA)

```bash
git clone https://github.com/harshabala/Subsume.git
cd Subsume && npm ci && npm run build
```

Chrome → `chrome://extensions` → **Load unpacked** → select `dist/`.

## Store upload package

```bash
npm ci
npm run ci
npm run package   # → subsume.zip
```

Follow `store/SUBMISSION_CHECKLIST.md`. Host privacy policy (Pages URL after merge to `main`):

`https://harshabala.github.io/Subsume/privacy.html`

## Still required from you (human / account)

1. Pay Chrome Web Store developer registration fee when Google’s payment path works.
2. Capture **real** screenshots (1280×800) per `store/screenshots/README.md`.
3. Enable GitHub Pages (Actions) so the privacy URL is live before submission.
4. Paste listing copy from `store/LISTING.md` and permission answers from `store/PERMISSIONS.md`.
5. Smoke-test the uploaded package once on a clean Chrome profile after review.

## Tests

```text
npm test   # 234 passing
npm run typecheck
npm run build
```
