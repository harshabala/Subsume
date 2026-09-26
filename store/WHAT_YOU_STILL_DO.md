# What only you can finish (human / Google account)

Engineering packaging for Subsume **v0.3.0** is done in-repo. These steps cannot be automated from the codebase alone.

## Already done in the repo (no action needed)

- Privacy policy (`docs/PRIVACY.md`, `docs/privacy.html`) and store documents (`store/*.md`) match the shipped code, including AES-GCM encryption of API keys and the Drive token (with its honest limits), manual snapshot Drive backup, local-only redacted diagnostics, and the local-only backup-waitlist flag.
- `tests/releaseDocs.test.ts` keeps versions in sync and blocks the old "not encrypted at rest" claim.
- `npm run ci` (typecheck, tests, build) and `npm run package` produce `subsume.zip`.
- Permission justifications for every manifest host are in `store/PERMISSIONS.md` and `store/LISTING.md`.

## 1. Chrome Web Store developer account and fee

1. Open [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Complete the one-time registration fee
3. Accept the developer agreement

## 2. Privacy policy URL must be public HTTPS

After merging to `main`:

1. Repo **Settings → Pages → Build and deployment → GitHub Actions**
2. Confirm workflow **Deploy privacy policy to GitHub Pages** succeeds
3. Open `https://harshabala.github.io/Subsume/privacy.html` and confirm it shows "Last updated: September 26, 2026"
4. Paste that exact URL into the CWS privacy policy field

## 3. Google OAuth consent screen (Drive backup)

Drive backup only works if the production OAuth client is configured. In Google Cloud Console, confirm:

- The Web application client ID in `src/shared/googleDriveOAuth.ts` exists and the Drive API is enabled
- Scopes `drive.appdata` and `userinfo.email` are on the consent screen
- Authorized redirect URI is `https://ehbkfdgpbemaimepgeeflenhbbpgokoj.chromiumapp.org/`
- Publishing status: while the app is in "Testing", only listed test users can connect. Move it to production (and complete Google verification if required) before advertising Drive backup, or remove Drive from the listing. Do not claim Drive works for all users until this is done.

## 4. Review real screenshots

Capture from a **running** build (`npm run build` → Load unpacked → `dist/`) and review them yourself for accuracy and for any personal data (API keys, email addresses):

| # | Frame | Notes |
|---|--------|--------|
| 1 | Popup | Search / log flow |
| 2 | Library archive | Hardcover spines / intent groups |
| 3 | Capture canvas | "What stayed with you?" |
| 4 | Museum plaques | On a real movie site (e.g. TMDb or Letterboxd) |
| 5 | Settings / onboarding | API keys (redacted) or welcome wizard |

Preferred size: **1280×800** PNG. Details: `store/screenshots/README.md`.

## 5. Dashboard form (paste from repo)

| Field | Source |
|-------|--------|
| Short description | `store/LISTING.md` |
| Detailed description | `store/LISTING.md` |
| Single purpose | `store/LISTING.md` |
| Permission justifications | `store/PERMISSIONS.md` |
| Privacy practices | `store/LISTING.md` + `docs/PRIVACY.md` |

## 6. Upload package (final click is yours)

```bash
npm ci && npm run ci && npm run package
```

Upload **`subsume.zip`** (repo root). Version in manifest: **0.3.0**. Click **Submit for review** yourself.

## 7. Post-submit

- Respond to any CWS review questions about **all-URL content scripts** using `store/MANIFEST_NOTES.md` and `store/PERMISSIONS.md`
- Do not overclaim security. Accurate wording: API keys and the Drive token are AES-GCM encrypted with a per-install key stored in the same profile (deters casual inspection only); notes, ratings, reflections, and Drive backup contents are not encrypted by Subsume

## 8. Owner decisions still open

- (Resolved) `covers.openlibrary.org/*` and the redundant `googleapis.com/books/*` were removed from `host_permissions`: cover images load as plain `<img>` sources and need no host permission.
- Whether to add an in-app "disconnect Google Drive" button (the policy currently says there is none)

## 9. Optional later improvements (not blocking first publish)

- Promo tile / marquee images (`store/assets/README.md`)
- Narrow content scripts or optional host permissions if review forces it
- Raise test coverage on recommendations/titles handlers
- Stronger key protection (for example a user passphrase) if the same-profile key limitation matters
