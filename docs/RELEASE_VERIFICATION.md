# Release verification

Run: `npm run release-check` (= `npm run ci && npm run package && node scripts/verify-package.mjs`).
Standalone: `npm run package && npm run verify-package` (or `node scripts/verify-package.mjs [zip]`).

## What `verify-package` checks (on `subsume.zip`, unzipped to a temp dir)

- manifest is MV3, version equals `package.json`, `minimum_chrome_version` set, description <= 132 chars.
- manifest `key` is absent (override with `SUBSUME_KEEP_KEY=1`, see below).
- icons 16/48/128 exist and are real PNGs of exactly those dimensions.
- every file the manifest references exists (service worker, content js/css, popup/options html, action icons, non-glob web_accessible_resources).
- forbidden paths: `src/`, `tests/`, `node_modules/`, `.git`, `docs/`, `scripts/`, `*.pem`, `.env*`, `*.map`, `icon-master.png`, `.DS_Store`. Source maps are deliberately NOT shipped (expose source, add size).
- secret-shaped strings: `sk-...`, `AIza...`, `Bearer <token>`, PEM private-key headers, GitHub/AWS tokens.
- MV3 remote code: no `eval(`, `new Function(`, remote `<script src>`, remote dynamic import, inline `<script>`, inline `on*=` handlers; no permissive `content_security_policy`.
- reports file count and zip size.

Assertion helpers live in `scripts/verify-package-lib.mjs` and are unit-tested in `tests/verifyPackage.test.ts`.

## Web Store audit findings

1. **Remote code**: none. No eval / new Function / remote scripts / inline handlers in dist/. One remote *stylesheet*: Google Fonts CSS (`fonts.googleapis.com`) linked from `ui/index.html`, `ui/popup.html` and injected by the content script (`src/shared/shadowTokens.ts`). This is not remote code and is allowed by the MV3 default CSP, but it makes a third-party request (user IP to Google) from the UI and from every http(s) page that mounts Subsume UI. Reviewers may ask; the privacy policy should disclose it, or fonts should be bundled locally. Not changed.
2. **Manifest hygiene**: `minimum_chrome_version` was missing; now `"111"` (CSS `color-mix(in oklch)` is used in the UI and needs Chrome 111; MV3 modules, storage, alarms, notifications, identity, WebCrypto all predate this). No explicit `content_security_policy` is needed: the MV3 default (`script-src 'self'; object-src 'self'`) fits and nothing loads remote scripts.
3. **`key` field**: the Web Store rejects an upload whose manifest contains `key` ("key field is not allowed in manifest") for a new item, because the store assigns the item ID/key. The old packaging copied `key` into the zip, so the first upload would have been refused. Fix (package script only): `scripts/package-extension.mjs` now stages `dist/` and strips `key` from the packaged manifest; `dist/manifest.json` and the repo `manifest.json` keep it, so unpacked dev loads still get ID `ehbkfdgpbemaimepgeeflenhbbpgokoj`. `SUBSUME_KEEP_KEY=1` keeps it in the zip (and the verifier then allows it). **Consequence**: the Store-installed extension will have a Store-assigned ID different from the dev ID, so the Drive OAuth redirect URI (`https://<id>.chromiumapp.org/`, `src/shared/googleDriveOAuth.ts`) changes. After first upload, take the ID from the dashboard and add it as an authorised redirect URI in Google Cloud (or paste the dashboard public key into `manifest.json` `key` and package with `SUBSUME_KEEP_KEY=1` for later uploads). `store/MANIFEST_NOTES.md` currently says the key must not be removed; it is out of date for store packages.
4. **Permissions**: all used. `storage`, `alarms` (background), `notifications`, `identity` (launchWebAuthFlow), `activeTab` (popup `tabs.query` reads active tab title/url). No unused permission. Host permissions: every host is referenced in src/. `https://www.googleapis.com/books/*` is redundant with `https://www.googleapis.com/*` (harmless; could be dropped). `openlibrary.org` and `covers.openlibrary.org` are missing from the table in `store/MANIFEST_NOTES.md`.
5. **Content script on all http(s)**: runs at `document_idle`, first asks the background for prefs and exits if the domain is disabled; otherwise scans DOM (JSON-LD, ISBN, poster images, title text) and uses a MutationObserver. No `fetch`/XHR/beacon in `src/content`; data leaves only via `chrome.runtime.sendMessage` to the service worker, and only minimal candidate fields (titles, ISBNs, alt text), not page HTML. Reviewer risks: broad host match (justify per `store/MANIFEST_NOTES.md`); detected titles from any page are looked up on TMDB/Open Library (browsing-derived data leaves the device, disclose in privacy policy); Google Fonts request from injected UI; the observer runs continuously on every page.

## Key-decrypt race (Task C)

`decryptUserPreferences` no longer sets `needsMigration` when ciphertext fails to decrypt; it reports `undecryptable` paths instead, and `getPreferences` preserves the original ciphertext for them when writing back other migrated (plaintext) keys. Failed keys read as missing in memory only.

## Content script format

`verify-package.mjs` also asserts every manifest content script is a classic (IIFE) script with no ES `import`/`export`. Chrome loads content scripts as classic scripts, so an ES module build fails silently on every page ("Cannot use import statement outside a module"). The content bundle is built by `vite.content.config.ts` after the main build (`npm run build`).
