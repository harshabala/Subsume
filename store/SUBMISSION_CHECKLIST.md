# Chrome Web Store — Submission Checklist (Subsume)

Step-by-step path from a clean build to a reviewable upload. Keep practices honest: client-side only, no Subsume backend, no remote code.

---

## Before you start

- [ ] **Developer account** registered at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
- [ ] **One-time developer registration fee** paid (Google’s published fee; required for publishing).
- [ ] Privacy policy **publicly reachable over HTTPS** (see hosting below).
- [ ] Support email ready: `harsha16balakrishnan@proton.me`.
- [ ] Confirm `manifest.json` version matches the release you intend to ship.
- [ ] Confirm OAuth / Google Cloud setup for Drive if you advertise Drive backup (see `docs/GOOGLE_DRIVE_SETUP.md`). Do not claim Drive works if the production OAuth client is not configured.

---

## Host the privacy policy

Recommended public URL:

```text
https://harshabala.github.io/Subsume/privacy.html
```

Source file: `docs/privacy.html` (Markdown twin: `docs/PRIVACY.md`).

### Option A — GitHub Pages (automated)

1. Ensure `.github/workflows/pages.yml` is on `main`.
2. In the GitHub repo: **Settings → Pages → Build and deployment → GitHub Actions**.
3. Push `docs/privacy.html` (or merge to `main`) so the workflow deploys.
4. Verify the URL loads the full policy (effective date July 2026, contact email present).

### Option B — Manual Pages or static host

1. Publish `docs/privacy.html` as `privacy.html` at a stable HTTPS URL.
2. Paste that URL into the CWS privacy policy field.

Do not use a private gist or login-walled page.

---

## Build the store zip

```bash
cd /path/to/Subsume
npm ci
npm run ci        # typecheck + test + build
npm run package   # rebuilds dist/ and writes subsume.zip (no nested dist/, no source maps)
```

Equivalents: `npm run build` then `npm run zip`, or `node scripts/package-extension.mjs` after a build.

- [ ] `subsume.zip` created at repo root (or replace prior zip).
- [ ] Unzip and spot-check: `manifest.json`, `background.js`, `content.js`, icons (`16`/`48`/`128`), `ui/`.
- [ ] **Do not** zip `src/`, `node_modules/`, tests, or the PEM key.
- [ ] **Do not** include secrets you do not intend to ship (shared LLM keys, private tokens).
- [ ] Load `dist/` unpacked once more and smoke-test: onboarding → TMDb key → open popup/options, save a title, Settings, optional Drive only if configured.

---

## Dashboard: new item or update

1. Open [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. **New item** → upload `subsume.zip`, or select existing Subsume item → **Package** → upload new zip.
3. Wait for package analysis errors; fix any permission/manifest issues before filling store listing.

---

## Store listing fields

Use `store/LISTING.md` for paste-ready copy.

- [ ] **Name:** Subsume  
- [ ] **Summary (short description):** ≤132 characters  
- [ ] **Description:** detailed copy + TMDb attribution  
- [ ] **Category:** Productivity *(or Social & Communication / Fun per current taxonomy)*  
- [ ] **Language:** English  
- [ ] **Icon:** 128×128 (from package)  
- [ ] **Screenshots:** at least one; preferred **1280×800** or **640×400**  
  - Suggested shots: Hardcover library archive, Poetic Capture / detail, on-page museum plaque on a public page, Settings (keys redacted)  
- [ ] **Small promo tile / marquee** if required by current dashboard (sizes per Google’s asset guide)  
- [ ] **Official URL** (optional): `https://github.com/harshabala/Subsume`  
- [ ] **Support URL / email:** privacy page and/or `harsha16balakrishnan@proton.me`

---

## Privacy & single purpose

- [ ] **Privacy policy URL:** `https://harshabala.github.io/Subsume/privacy.html`  
- [ ] **Single purpose statement** pasted (see `store/LISTING.md`)  
- [ ] **Privacy practices** questionnaire completed accurately (see LISTING + below)  
- [ ] **Permission justifications** filled for each permission (see `store/PERMISSIONS.md`)  
- [ ] Certify disclosures match the zip you uploaded  

### Privacy practices (quick map)

| Topic | Answer direction |
| :--- | :--- |
| Data collected | Local library, notes, preferences, optional API keys; optional Google identity for Drive |
| Subsume server | None |
| Sold data | No |
| Remote code | **No** |
| Analytics SDKs | No |
| Ads | No |

---

## Permission justifications checklist

Confirm each is explained in the dashboard:

- [ ] `storage`  
- [ ] `activeTab`  
- [ ] `notifications`  
- [ ] `alarms`  
- [ ] `identity`  
- [ ] Host: `https://api.themoviedb.org/*`  
- [ ] Host: `https://www.omdbapi.com/*`  
- [ ] Host: `https://api.openai.com/*`  
- [ ] Host: `https://api.anthropic.com/*`  
- [ ] Host: `https://generativelanguage.googleapis.com/*`  
- [ ] Host: `https://api.trakt.tv/*`  
- [ ] Host: `https://api.tvmaze.com/*`  
- [ ] Host: `https://query.wikidata.org/*`  
- [ ] Host: `https://en.wikipedia.org/*`  
- [ ] Host: `https://www.googleapis.com/*`  
- [ ] Content scripts: `http://*/*`, `https://*/*` (broad match — write carefully)

---

## Review tips: broad content_scripts

Reviewers often scrutinize `http://*/*` / `https://*/*`. Prepare a clear narrative:

1. **Purpose:** Cross-site film/TV poster and title detection for a personal sanctuary—streaming sites, articles, catalogues—not limited to one domain.
2. **User value:** Plaques / hover cards / reflection dock where discovery actually happens.
3. **Mitigations (state them):**  
   - Domain blacklist in Settings  
   - API keys never sent to content scripts  
   - Message allowlist between content and background  
   - Per-origin poster resolve budget; query clamping  
   - Shadow DOM isolation; teardown on page hide  
4. **Not for:** ads, credential theft, full-page scraping for resale, unrelated analytics.
5. **Demo video (optional but helpful):** 30–60s showing plaque on a public page → Reflect → library entry → Settings → Disabled Domains.

If review asks to narrow hosts: explain that media discussion is web-wide; offer blacklist UX evidence and single-purpose alignment rather than inventing a fixed site list that would break the product.

---

## Pre-submit smoke matrix

- [ ] Fresh profile or clean extension data  
- [ ] Install from zip / load package build  
- [ ] Options page opens; theme readable  
- [ ] Add library item with note + rating  
- [ ] Content script: badge or dock on a test https page  
- [ ] Disabled domain stops content UI on that host  
- [ ] Export library (no keys in export if designed so)  
- [ ] Notifications/alarms path only if you claim digests  
- [ ] Drive connect only if production OAuth is live  

---

## Submit for review

- [ ] Visibility: Public / Unlisted / Private as intended  
- [ ] **Submit for review**  
- [ ] Watch developer email for rejection notes; respond with `PERMISSIONS.md` language and privacy URL  

---

## After approval

- [ ] Install from store on a clean profile  
- [ ] Re-verify privacy URL still live  
- [ ] Tag git release to match store version  
- [ ] For next update: bump `manifest.json` / `package.json` version, rebuild zip, upload, note user-facing changes  

---

## Common rejection causes (avoid)

| Risk | Mitigation |
| :--- | :--- |
| Privacy policy missing or incomplete | Host full `privacy.html`; match real behavior |
| Broad content scripts without justification | Use PERMISSIONS.md narrative + mitigations |
| Permission unused | Remove from manifest or implement clearly |
| Remote code | Never eval remote JS; package all code in zip |
| Misleading description | No “cloud account” claims; mark AI/Drive optional |
| Trademark / TMDb | Keep “not endorsed or certified by TMDb” |

---

*Checklist for Subsume Chrome Web Store production packaging. Paths: `store/LISTING.md`, `store/PERMISSIONS.md`, `docs/PRIVACY.md`, `docs/privacy.html`.*
