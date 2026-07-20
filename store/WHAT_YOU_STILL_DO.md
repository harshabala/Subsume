# What only you can finish (human / Google account)

Engineering packaging for Subsume **v0.2.0** is done in-repo. These steps cannot be automated from the codebase alone.

## 1. Chrome Web Store developer fee

When Google’s payment flow works:

1. Open [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Complete the one-time registration fee
3. Accept the developer agreement

## 2. Privacy policy URL must be public HTTPS

After merging this branch to `main`:

1. Repo **Settings → Pages → Build and deployment → GitHub Actions**
2. Confirm workflow **Deploy privacy policy to GitHub Pages** succeeds
3. Open: `https://harshabala.github.io/Subsume/privacy.html`
4. Paste that exact URL into the CWS privacy policy field

Until Pages is live, CWS will reject or flag a missing policy URL.

## 3. Screenshots (required for listing)

Capture from a **running** build (`npm run build` → Load unpacked → `dist/`):

| # | Frame | Notes |
|---|--------|--------|
| 1 | Popup | Search / log flow |
| 2 | Library archive | Hardcover spines / intent groups |
| 3 | Capture canvas | “What stayed with you?” |
| 4 | Museum plaques | On a real movie site (e.g. TMDb or Letterboxd) |
| 5 | Settings / onboarding | API keys or welcome wizard |

Preferred size: **1280×800** PNG. Details: `store/screenshots/README.md`.

Drop files into `store/screenshots/` for your records (optional in git).

## 4. Dashboard form (paste from repo)

| Field | Source |
|-------|--------|
| Short description | `store/LISTING.md` |
| Detailed description | `store/LISTING.md` |
| Single purpose | `store/LISTING.md` |
| Permission justifications | `store/PERMISSIONS.md` |
| Privacy practices | `store/LISTING.md` + `docs/PRIVACY.md` |

## 5. Upload package

```bash
npm ci && npm run ci && npm run package
```

Upload **`subsume.zip`** (repo root). Version in manifest: **0.2.0**.

## 6. Post-submit

- Respond to any CWS review questions about **all-URL content scripts** using `store/MANIFEST_NOTES.md` and `store/PERMISSIONS.md`
- Do not claim server-side security or encrypted-at-rest keys (policy is honest about local storage)

## 7. Optional later improvements (not blocking first publish)

- Promo tile / marquee images (`store/assets/README.md`)
- Narrow content scripts or optional host permissions if review forces it
- Raise test coverage on recommendations/titles handlers
- Encrypt API keys at rest (larger design change)
