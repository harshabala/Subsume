# Security Review — Subsume (Chrome MV3)

**Date:** 2026-08-10  
**Repo:** `/Users/harshabalakrishnan/Subsume` @ `a5471b5`  
**Method:** [security-review](file:///Users/harshabalakrishnan/.agents/skills/security-review/SKILL.md) skill — exploitation-focused audit with data-flow research  
**Threat model:** Hostile web pages (content-script host), optional local profile access, malicious/compromised extension updates; no Subsume backend  
**Scope focus:** XSS, storage, messaging, OAuth Drive, content scripts / Shadow DOM, permissions, LLM keys, CSP  

---

## Summary

| Metric | Value |
|--------|------:|
| **Security score** | **7.2 / 10** |
| **Findings (HIGH confidence)** | 5 (0 Critical, 1 High, 2 Medium, 2 Low) |
| **Risk level** | Medium |
| **Confidence** | High on architecture; High on listed findings |

Subsume’s extension security design is **above average** for a broad-injection MV3 product: message origin allowlisting, content-prefs key stripping, closed Shadow DOM on interactive plaques/hover cards, trusted-gesture gates on archive actions, per-origin resolve budgets, safe mediaId navigation, and export that excludes preferences/API keys. Remaining issues are concentrated in **OAuth token handling**, **open Shadow DOM on the reflection dock**, and **thin validation on content-callable library writes**.

---

## Score breakdown

| Area | Assessment | Impact on score |
|------|------------|-----------------|
| Messaging / allowlist | Strong: content vs extension origin split; secrets messages blocked | + |
| XSS / DOM sinks | Strong: Preact auto-escape; `textContent` for plaques; `innerHTML` only clears dock mount | + |
| Shadow DOM | Good for plaques/hover (`closed` + `isTrusted`); **dock uses `open`** | − |
| Storage / secrets | Keys in IndexedDB (disclosed); Drive token in `chrome.storage.local` | − |
| OAuth Drive | Implicit grant; token persisted unencrypted; no PKCE | − |
| Content-script surface | Broad `http(s)://*/*`; mitigated by budget + allowlist | − slight |
| Permissions / hosts | Justified; no `externally_connectable`; no remote code | + |
| LLM keys | Background-only fetch; responses parsed as data, not executed | + |
| CSP | No explicit `content_security_policy`; relies on MV3 defaults | − slight |
| Supply / keys on disk | `subsume-key.pem` gitignored (good); packaging private key must never ship | note |

**Score: 7.2 / 10** (10 = excellent)

---

## Architecture strengths (verified)

| Control | Evidence |
|---------|----------|
| Content message allowlist | `src/shared/messages.ts:74–97` — blocks `GET_FULL_PREFERENCES`, `EXPORT_LIBRARY`, `SET_PREFERENCES`, etc. from non-extension origins |
| API keys never in content prefs | `src/background/contentPrefs.ts:16–31`; `settings.ts:24–38` strip keys for unsafe paths |
| Closed shadow + trusted gestures | `closedShadow.ts`; plaques/hover require `isTrustedGesture` before ADD/REMOVE |
| Origin rate limit on resolve traffic | `originRateLimit.ts` + `GET_TITLE_DETAILS` / `RESOLVE_POSTER` / `RESOLVE_PAGE_CANDIDATE` |
| Content-session poster budget | `scanner.ts:249–273` — max **10** resolves/origin/session |
| Query clamp | `scanner.ts:472–477` — 60 chars, ≥2 words |
| Safe nav mediaId | `mediaIds.ts:12–15`; `OPEN_DETAIL` / `OPEN_CAPTURE_CANVAS` reject bad IDs |
| Export excludes secrets | `storage.ts:816–819` |
| LLM output treated as data | `llm.ts` — `JSON.parse` → title resolve; no `eval` / HTML injection |
| Sync listener hardening | Hover/overlay check `sender.id === chrome.runtime.id` before applying `LIBRARY_UPDATED` |
| No `externally_connectable` | `manifest.json` — web pages cannot `sendMessage` into the extension |
| Packaging key gitignored | `.gitignore` includes `subsume-key.pem` |

---

## Findings

### [SEC-001] Google Drive OAuth access tokens stored in `chrome.storage.local` (implicit grant)

- **Severity:** High  
- **Confidence:** High  
- **Location:**  
  - `src/background/drive-sync.ts:6–7` (`TOKEN_STORAGE_KEY`)  
  - `src/background/drive-sync.ts:24–42` (`parseImplicitGrantResponseUrl`)  
  - `src/background/drive-sync.ts:68–80` (`response_type=token`)  
  - `src/background/drive-sync.ts:96–103` (`storeAccessToken` → `chrome.storage.local.set`)  
  - `src/shared/googleDriveOAuth.ts:1–12` (public client_id, appdata + email scopes)

- **Issue:** Drive backup uses the **OAuth 2.0 implicit grant** (`response_type=token`). The access token is written to **`chrome.storage.local`**, which is shared across the extension’s background, UI, **and content scripts** (any content-script code can call `chrome.storage.local.get`). Tokens are not encrypted at rest. Implicit grant is discouraged by current OAuth BCP (prefer authorization code + PKCE, or Chrome’s identity token APIs where appropriate).

- **Impact:**  
  - Anyone with access to the Chrome profile / extension storage dump can obtain a live Drive appData token and read/write `subsume_backup.json` in the user’s appData folder for the connected account.  
  - A future content-script bug, supply-chain compromise of `content.js`, or accidental broad `storage.local.get(null)` logging would place the token in a context co-located with untrusted page origins.  
  - Scopes include `drive.appdata` and `userinfo.email`.

- **Evidence:**
  ```typescript
  // drive-sync.ts — implicit grant
  authURL.searchParams.set('response_type', 'token');
  // ...
  chrome.storage.local.set(
    { [TOKEN_STORAGE_KEY]: { accessToken, expiresAt: safeExpiry } },
    () => resolve()
  );
  ```

- **Fix:**  
  1. Prefer **authorization code + PKCE** (or `chrome.identity.getAuthToken` with a Chrome app OAuth client if product constraints allow).  
  2. Keep tokens in **service-worker memory** and/or `chrome.storage.session` (not accessible the same way long-term; still not content-script-safe—never read tokens from content).  
  3. Never log token values; ensure diagnostic export redacts bearer tokens (see SEC-005).  
  4. On disconnect, clear token **and** revoke when possible.

---

### [SEC-002] Reflection dock uses open Shadow DOM without trusted-gesture checks

- **Severity:** Medium  
- **Confidence:** High  
- **Location:**  
  - `src/content/dock.ts:393` — `attachShadow({ mode: 'open' })`  
  - `src/content/dock.ts:329`, `352`, `367` — click handlers without `isTrustedGesture`  
  - `src/content/dock.ts:476–490` — `saveNotes()` reads textarea and writes `chrome.storage.local`

- **Issue:** Unlike plaques and hover cards (closed shadow + `isTrustedGesture`), the Auteur reflection dock is **open**, so page JavaScript can reach `host.shadowRoot`, set the textarea value, and fire synthetic clicks. Handlers do **not** check `event.isTrusted`. Notes are persisted under `subsume_page_reflections` keyed by `hostname+pathname`.

- **Impact:** A hostile page can silently write or overwrite page-local reflection notes, expand/collapse the dock, or spam storage for that origin path. It cannot directly steal API keys via this path, but it can **pollute local data** and **phish visually** by mutating open-shadow UI chrome (lookalike controls next to real extension UI).

- **Evidence:**
  ```typescript
  this.shadowRoot = this.container.attachShadow({ mode: 'open' });
  // ...
  saveBtn.addEventListener('click', this.boundOnSave!); // no isTrustedGesture
  ```

- **Fix:**  
  1. Use `attachClosedShadow` (or `mode: 'closed'`) consistent with plaques.  
  2. Gate toggle/save with `isTrustedGesture(e)`.  
  3. Optionally route notes through background with size caps and origin binding.

---

### [SEC-003] Content-callable `ADD_TO_LIST` / `ADD_TO_ARCHIVE` accept weakly validated media payloads

- **Severity:** Medium  
- **Confidence:** High (pattern + data flow); exploit requires a path that sends crafted `mediaItem` from content (today primarily user-gesture UI using background-resolved media)  
- **Location:**  
  - `src/background/storage.ts:926–934` — `isValidMediaItem`  
  - `src/background/handlers/library.ts:103–114` — `ADD_TO_LIST`  
  - `src/background/handlers/books.ts:238–267` — `ADD_TO_ARCHIVE`  
  - Allowlist: `src/shared/messages.ts:80–81`

- **Issue:** `isValidMediaItem` only requires `id` matching `MEDIA_ID_PATTERN`, `type ∈ {movie,tv,book}`, and a finite `year`. It does **not** require `canonicalTitle`, `posterUrl` scheme, genres, or ratings shape. Content scripts are allowed to call `ADD_TO_LIST` and `ADD_TO_ARCHIVE`. When no existing DB row exists, the **incoming blob is stored as-is** (merge only when an existing row is present).

- **Impact:**  
  - Library pollution with sparse/forged catalogue rows (attacker-chosen poster URL strings, empty titles, etc.) if any content path submits attacker-influenced `mediaItem`.  
  - UI surfaces render `posterUrl` in `<img src={…}>` across popup/home/hover (Preact escapes text, but **unvalidated image URLs** can still be used for tracking pixels or unexpected schemes).  
  - Weakens the trust boundary that “content only adds resolved catalogue items.”

- **Evidence:**
  ```typescript
  export function isValidMediaItem(m: unknown): m is MediaItem {
    // id pattern + type + year only
  }
  // ADD_TO_LIST: mediaToStore = existing ? merge(...) : req.mediaItem
  ```

- **Fix:**  
  1. On content-origin adds, **re-resolve from trusted stores/APIs by id** and ignore client-supplied title/poster/overview.  
  2. Or harden `isValidMediaItem`: require non-empty `canonicalTitle`, allowlist `posterUrl` to `https:` (and known CDN hosts), require arrays for genres/ratings/providers.  
  3. Rate-limit ADD/REMOVE per origin.

---

### [SEC-004] `GET_WORK_DETAILS` on content allowlist without origin rate limit

- **Severity:** Low  
- **Confidence:** High  
- **Location:**  
  - `src/shared/messages.ts:79` (allowed from content)  
  - `src/background/handlers/books.ts:215–235` (handler; **no** `tryConsumeOriginRateLimit`)  
  - Compare: `titles.ts:184–196`, `277–287` which do rate-limit

- **Issue:** Book work detail fetches (including Open Library network I/O) can be invoked from content-script origin without the shared resolve bucket. Hostile pages cannot call `chrome.runtime` directly, but content-driven detection can still be influenced by page DOM; any future content code that resolves aggressively would lack the same throttle as poster/title resolve.

- **Impact:** Elevated free-API traffic / quota burn relative to other resolve paths; inconsistent defense-in-depth.

- **Fix:** Apply `tryConsumeOriginRateLimit(originHostFromSender(sender), 'resolve')` (or a dedicated bucket) inside `GET_WORK_DETAILS`. Cap concurrent Open Library fetches.

---

### [SEC-005] `redactSecrets` is unused on diagnostic export

- **Severity:** Low  
- **Confidence:** High  
- **Location:**  
  - `src/shared/diagnosticLog.ts:134–138` — `redactSecrets` defined  
  - `src/shared/diagnosticLog.ts:113–131` — `formatDiagnosticLogs` does **not** call it  
  - `src/ui/components/SettingsDiagnosticsPanel.tsx:169–174` — copies full formatted log

- **Issue:** Secret redaction helpers exist but export/copy paths do not apply them. Today most logs avoid raw keys, but error bodies, OAuth errors, or future logging could persist secrets into `chrome.storage.local` diagnostic entries and then into user-shared clipboard exports.

- **Impact:** Accidental secret disclosure when users share diagnostics (defense-in-depth failure).

- **Fix:** Apply `redactSecrets` to `message` and `detail` in `appendDiagnosticLog` and/or `formatDiagnosticLogs`. Expand patterns for `sk-`, `eyJ` (JWT), and `x-api-key`.

---

## Needs verification / residual risk

### [VERIFY-001] Packaging private key on disk

- **Location:** workspace `subsume-key.pem` (listed in `.gitignore`)  
- **Question:** Confirm the PEM is **never** committed or shipped in store packages. Exposure would allow extension-ID impersonation / update forgery for the fixed `manifest.key` identity.  
- **Action:** Treat as operational secret; rotate if ever leaked.

### [VERIFY-002] Unencrypted LLM/API keys in IndexedDB

- **Location:** `storage.ts` preferences store; documented in `README.md` Security and `docs/PRIVACY.md`  
- **Note:** Accepted product tradeoff for a client-only extension. Not reported as an exploitable remote vuln; still relevant for local threat models (shared machines, malware).

### [VERIFY-003] No explicit extension CSP

- **Location:** `manifest.json` — no `content_security_policy` key  
- **Note:** MV3 default CSP for extension pages is relatively strict. Explicit policy would document intent and block accidental inline script regression. Low priority.

### [VERIFY-004] LLM prompt injection via user notes

- **Location:** `llm.ts` / prompts including taste profile and short note excerpts  
- **Note:** User is both data owner and key owner; impact is mostly self-targeted (malicious recommendations). No remote multi-tenant boundary.

---

## Area checklist (requested)

| Topic | Result |
|-------|--------|
| **XSS** | No high-confidence DOM XSS. Preact + `textContent`; dock `innerHTML = ''` only clears. Unvalidated `posterUrl` is residual (SEC-003). |
| **Storage** | Library/IDB solid; prefs keys unencrypted (disclosed). Drive token in `storage.local` (SEC-001). Dock notes in `storage.local` (SEC-002). |
| **Messaging** | Allowlist present and tested (`tests/messageRouter.test.ts`). Sensitive ops extension-origin only. |
| **OAuth Drive** | Works; implicit grant + local token store is the main weakness (SEC-001). Client ID is public (expected for public clients). |
| **Content scripts / Shadow DOM** | Closed + trusted gestures for plaques/hover; open dock is the outlier (SEC-002). Broad match intentional with budgets. |
| **Permissions** | Reasonable for product; host list matches background fetches. No remote code host. |
| **LLM keys** | IndexedDB prefs; stripped from content; used only in background `fetch` to known hosts. Responses not executed. |
| **CSP** | Implicit MV3 defaults only (VERIFY-003). |

---

## Top 3 issues

1. **[SEC-001] Drive OAuth access tokens in `chrome.storage.local` via implicit grant** — highest impact secret handling gap.  
2. **[SEC-002] Open Shadow DOM reflection dock without `isTrustedGesture`** — page-controlled write to extension storage / UI.  
3. **[SEC-003] Weak `isValidMediaItem` on content-callable archive writes** — trust-boundary hole for library integrity / unvalidated media fields.

---

## Recommended priority order

| Priority | ID | Action |
|----------|-----|--------|
| P0 | SEC-001 | Stop persisting bare tokens in `storage.local`; migrate off pure implicit grant if feasible |
| P0 | SEC-002 | Closed shadow + trusted-gesture on dock save/toggle |
| P1 | SEC-003 | Server-side (background) re-resolve on add; tighten validation |
| P2 | SEC-004 | Rate-limit `GET_WORK_DETAILS` |
| P2 | SEC-005 | Wire `redactSecrets` into log write/export |

---

## Conclusion

Subsume is **not** wide open: the content↔background trust boundary is intentionally designed and mostly enforced. Score **7.2/10** reflects solid messaging/XSS hygiene with clear upgrade paths on OAuth storage and the open dock. Addressing SEC-001 and SEC-002 would likely push the score into the **8+** range without product redesign.

---

*Review limited to source under `src/`, `manifest.json`, and store/privacy docs. Test-only code excluded from findings per skill rules.*
