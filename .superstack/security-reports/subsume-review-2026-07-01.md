# Subsume Chrome Extension — Security Audit Report

**Date:** 2026-07-01  
**Scope:** `/Users/harshabalakrishnan/subsume-review` (full extension)  
**Mode:** Daily (confidence gate ≥ 8/10)  
**Auditor:** CSO Skill v0.2.0

---

## Executive Summary

Subsume is a Manifest V3 Chrome extension (TypeScript, Preact, Vite, IndexedDB) that injects content scripts on all HTTP/HTTPS pages, stores user API keys locally, and calls third-party movie/LLM APIs from the service worker. **No committed secrets or dependency CVEs were found.** The codebase includes several deliberate security controls (message-origin allowlist, API-key stripping for content scripts, poster-query clamping, mediaId validation). The highest-risk issues are **universal content-script injection combined with automatic library loading and poster-resolution API calls on hostile pages**, and **client-side storage/transmission of user API keys (especially Gemini key-in-URL)**.

**Findings (≥8/10):** 7 (0 CRITICAL, 5 HIGH, 2 MEDIUM)

---

## Phase 0: Stack Detection

| Attribute | Value |
|-----------|-------|
| Language | TypeScript |
| UI Framework | Preact 10 + preact-router |
| Build | Vite 8, esbuild |
| Package manager | npm (package-lock.json present) |
| Storage | IndexedDB via `idb` (media, library, preferences, people, alerts) |
| Auth | Google OAuth via `chrome.identity` (Drive appDataFolder sync) |
| Deployment | Chrome Web Store extension (MV3 service worker) |
| API style | REST fetch to TMDb, OMDb, OpenAI, Anthropic, Gemini, Google Drive |
| Test runner | Vitest + jsdom |

**Entry points:** `background.js` (service worker), `content.js` (all pages), `ui/index.html` (options UI)

---

## Phase 1: Attack Surface Census

| Entry Point | Type | Auth Required | Input Validation |
|-------------|------|---------------|------------------|
| Content script (`http://*/*`, `https://*/*`) | DOM injection / message bridge | No (runs on all pages) | Partial (poster query clamp, mediaId regex) |
| `chrome.runtime.onMessage` | IPC (30+ message types) | Origin allowlist for content scripts | Partial (prefs validation, mediaId regex) |
| Background `fetch()` to TMDb/OMDb/LLM | Outbound API | User-supplied API keys | Minimal |
| Google Drive sync | Outbound OAuth + REST | Google account | Import JSON schema validation |
| Options UI (`ui/index.html`) | Extension page | Extension origin | Form-level only |
| `chrome.alarms` | Scheduled digest/notifications | N/A | N/A |

---

## Phase 2: Secrets Archaeology

| Check | Result |
|-------|--------|
| Hardcoded API keys (`sk-`, `ghp_`, `AIza`, PEM keys) | **None in source** |
| `.env` files | **None present** |
| Git history for `.env`/`.pem`/`.key` | **None found** |
| OAuth `client_id` in manifest | Placeholder `YOUR_CLIENT_ID_HERE` (not a live secret) |
| Test credentials | Present only in `tests/` (excluded) |

---

## Phase 3: Dependency Audit

```
npm audit → found 0 vulnerabilities
```

**Dependencies (production):** `idb`, `preact`, `preact-router`, `uuid` — all low attack surface, no known CVEs at audit time.

**Pinning:** Caret ranges (`^`) used; lockfile present.

---

## Phase 4: CI/CD Pipeline Security

`.github/` contains only `copilot-instructions.md` — **no GitHub Actions workflows**. No CI/CD attack surface in-repo.

---

## Phase 7: LLM Security Assessment

| Check | Status |
|-------|--------|
| User page DOM in prompts | **No** — prompts built from IndexedDB library |
| User notes in prompts | **Yes** — `noteExcerpt` (100 chars) in `buildWatchProfile` |
| LLM output executed | **No** — JSON parsed, titles resolved via TMDb |
| LLM output rendered as HTML | **No** — Preact text interpolation (escaped) |
| API keys server-side only | **No** — keys in IndexedDB, sent from service worker |
| Rate limiting | Provider 429 handling + secondary key fallback only |
| Error body logging | **Yes** — full API error bodies logged to `chrome.storage.local` |

---

## Phase 9: OWASP Top 10 (Extension Context)

| OWASP | Assessment |
|-------|------------|
| A01 Broken Access Control | **Partial mitigation** — content-script message allowlist; `GET_FULL_PREFERENCES`/`SET_PREFERENCES` extension-only |
| A02 Security Misconfiguration | **Finding** — universal content-script matches; placeholder OAuth client_id |
| A03 Supply Chain | **Clean** — npm audit 0; no CI actions |
| A04 Cryptographic Failures | **Finding** — API keys plaintext at rest; Gemini key in URL |
| A05 Injection | **Low risk** — no `eval`/`dangerouslySetInnerHTML`; Preact escaping; `OPEN_DETAIL` mediaId validated |
| A06 Insecure Design | **Finding** — no per-origin rate limit on poster resolution / library fetch from content scripts |
| A07 Auth Failures | OAuth placeholder only; Google Drive uses `appDataFolder` (good isolation) |
| A08 Integrity Failures | Import validation present; no extension update signing concerns in-repo |
| A09 Logging Failures | API error bodies persisted without redaction |
| A10 Exception Handling | LLM parse failures handled; grouping failures non-fatal |

---

## Phase 10: STRIDE Threat Model

| Component | S | T | R | I | D | E |
|-----------|---|---|---|---|---|---|
| Content script (all origins) | Low | Med | Low | **High** | **High** | Med |
| Message router | Low | Low | Low | Med | Med | **Med** (allowlist) |
| IndexedDB preferences | Low | Med | Low | **High** | Low | Low |
| LLM integration | Low | Low | Low | **High** | Med | Low |
| Google Drive sync | Med | Med | Low | Med | Low | Low |
| Options UI | Low | Low | Low | **High** (GET_FULL_PREFS) | Low | Low |

**Existing mitigations:** `ALLOWED_CONTENT_SCRIPT_MESSAGES` allowlist, `buildContentPrefs()` key stripping, `sanitizePreferencesForContentScript()`, poster query clamping (60 chars), `QUERY_CACHE_MAX=500`, `sender.id` check on `LIBRARY_UPDATED`, `OPEN_DETAIL` mediaId regex.

---

## Findings (≥ 8/10 Confidence)

### [HIGH] SUBS-001: Universal Content Script on All Origins

**Confidence:** 9/10  
**Phase:** Phase 1 — Attack Surface Census  
**Category:** OWASP A02 / STRIDE (Information Disclosure, DoS)  
**Location:** `manifest.json:22-28`

**Description:**  
Content scripts match `http://*/*` and `https://*/*`, injecting Subsume into every page the user visits, including attacker-controlled origins.

**Exploit Scenario:**  
1. Attacker hosts a page crafted to trigger Subsume heuristics (poster grids, title patterns).  
2. Extension auto-initializes, fetches user library, and fires `RESOLVE_POSTER` / `GET_TITLE_DETAILS` API calls.  
3. Attacker causes privacy leakage (library in content-script memory) and API quota exhaustion.

**Evidence:**
```json
"content_scripts": [{
  "matches": ["http://*/*", "https://*/*"],
  "js": ["content.js"]
}]
```

**Remediation:**  
Narrow `matches` to known movie/TV domains, or gate injection behind per-origin user consent. Add per-tab/per-origin rate limits on API-backed messages.

**Priority:** P1

---

### [HIGH] SUBS-002: Full Watch Library Fetched on Hostile Origins

**Confidence:** 9/10  
**Phase:** Phase 1 — Attack Surface Census  
**Category:** OWASP A01 / STRIDE (Information Disclosure)  
**Location:** `src/content/hoverCard.tsx:248-257`, `src/shared/messages.ts:54-64`

**Description:**  
`GET_LIBRARY` is in the content-script message allowlist. On any page where a title is detected, `HoverCardManager` fetches the user's entire library (titles, ratings, statuses, notes metadata) into content-script memory.

**Exploit Scenario:**  
1. User visits attacker.com with any movie-title-shaped text.  
2. Content script calls `GET_LIBRARY` and caches all `LibraryItem` records.  
3. A future content-script bug, extension compromise, or memory-inspection attack exposes full viewing history on a hostile origin.

**Evidence:**
```typescript
// hoverCard.tsx — auto-fetches full library on first title detection
const libResponse = await sendMessage(MessageType.GET_LIBRARY, {});

// messages.ts — GET_LIBRARY allowed from content scripts
const ALLOWED_CONTENT_SCRIPT_MESSAGES = new Set([
  ...
  MessageType.GET_LIBRARY,
]);
```

**Remediation:**  
Remove `GET_LIBRARY` from content-script allowlist. Return only `inLibrary`/`libraryStatus` per `mediaId` via a scoped `CHECK_LIBRARY_STATUS` message. Defer library fetch until user opens a hover card.

**Priority:** P1

---

### [HIGH] SUBS-003: API Quota Exhaustion via Crafted Poster Pages

**Confidence:** 8/10  
**Phase:** Phase 1 / OWASP A06  
**Category:** STRIDE (Denial of Service)  
**Location:** `src/content/scanner.ts:356-458`, `src/content/catalogDetector.ts:27-28`, `src/background/handlers/titles.ts:224-309`

**Description:**  
Poster scanning runs automatically on page load. A page with ≥4 poster-aspect-ratio images inside a `class*="grid"` container triggers catalog mode and batched `RESOLVE_POSTER` calls, each potentially invoking TMDb/OMDb APIs using the user's keys. No per-origin or per-session cap exists beyond a 500-entry in-memory cache.

**Exploit Scenario:**  
1. Attacker creates a page with 100+ poster-ratio images and `alt="Fake Movie (2024)"`.  
2. User with Subsume installed visits the page.  
3. Extension fires dozens of `RESOLVE_POSTER` → TMDb/OMDb requests, exhausting daily API quota or incurring LLM-adjacent costs.

**Evidence:**
```typescript
const BATCH_SIZE = 5;
// No max images per page cap
await sendMessage(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: altText });
```

**Remediation:**  
Add per-origin session budget (e.g., max 10 resolves/page), require user gesture for high-volume scans, default `detectionSensitivity` to `low` on unknown origins.

**Priority:** P1

---

### [HIGH] SUBS-004: API Keys Stored in Plaintext IndexedDB

**Confidence:** 10/10  
**Phase:** Phase 2 — Secrets Archaeology  
**Category:** OWASP A04 / STRIDE (Information Disclosure)  
**Location:** `src/background/storage.ts:223-231`, `src/shared/types.ts:114-117`

**Description:**  
`UserPreferences` stores `tmdbApiKey`, `omdbApiKey`, `llmApiKey`, and `llmSecondaryApiKey` in IndexedDB without encryption.

**Exploit Scenario:**  
1. Malware or forensic tool reads Chrome extension IndexedDB (`subsume-db`).  
2. All user API keys extracted in plaintext.  
3. Attacker uses keys for unauthorized API access and billing.

**Evidence:**
```typescript
export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDb();
  await db.put('preferences', prefs, 'user-prefs');
}
```

**Remediation:**  
Use `chrome.storage.session` for ephemeral key caching, OS keychain where available, or proxy LLM/media calls through a user-controlled backend. Minimum: encrypt at rest with a key derived from `chrome.identity` or user passphrase.

**Priority:** P1

---

### [HIGH] SUBS-005: Gemini API Key Transmitted in URL Query String

**Confidence:** 10/10  
**Phase:** Phase 7 — LLM Security  
**Category:** OWASP A04  
**Location:** `src/background/llm.ts:141-142`

**Description:**  
The Gemini provider embeds the API key in the request URL query parameter instead of a header.

**Exploit Scenario:**  
1. User enables Gemini LLM provider.  
2. Key appears in URL: `.../generateContent?key=SECRET`.  
3. Key logged in proxy/CDN/server access logs, browser network inspector, and crash reports.

**Evidence:**
```typescript
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  { method: 'POST', ... }
);
```

**Remediation:**  
Use `x-goog-api-key` header or server-side proxy. Never place secrets in URLs.

**Priority:** P0

---

### [MEDIUM] SUBS-006: GET_FULL_PREFERENCES Returns Unredacted API Keys

**Confidence:** 9/10  
**Phase:** Phase 9 — OWASP A01  
**Category:** STRIDE (Elevation of Privilege)  
**Location:** `src/background/handlers/settings.ts:45-48`, `src/shared/messages.ts:51-66`

**Description:**  
`GET_FULL_PREFERENCES` returns all API keys. Access control relies solely on `sender.url.startsWith(chrome.runtime.getURL(''))` — no per-message capability token or user gesture requirement.

**Exploit Scenario:**  
1. Attacker finds XSS in extension UI (e.g., via compromised CDN font/stylesheet or unsanitized future feature).  
2. Injected script calls `GET_FULL_PREFERENCES`.  
3. Keys exfiltrated to attacker server.

**Evidence:**
```typescript
[MessageType.GET_FULL_PREFERENCES]: async () => {
  return getPreferences(); // includes all API keys
},
```

**Remediation:**  
Return keys only on explicit user action (e.g., "Reveal key" button with `chrome.storage.session` gate). Split read/write: never return full keys after initial save; show masked values only.

**Priority:** P2

---

### [MEDIUM] SUBS-007: LLM API Error Bodies Persisted to chrome.storage.local

**Confidence:** 8/10  
**Phase:** Phase 7 / OWASP A09  
**Category:** STRIDE (Information Disclosure)  
**Location:** `src/background/llm.ts:98`, `src/shared/logger.ts:99-103`

**Description:**  
On LLM API failure, the full HTTP response body is logged via `logger.error()`, which persists to `chrome.storage.local` (`system_logs`) and is viewable in the Logs UI — regardless of dev/prod mode.

**Exploit Scenario:**  
1. LLM provider returns error JSON containing request metadata or partial key validation hints.  
2. Error body stored in `system_logs`.  
3. Anyone with access to the extension UI reads sensitive diagnostic data.

**Evidence:**
```typescript
logger.error(`${provider} API error body:`, await res.text());
// logger.error → pushLog → chrome.storage.local.set({ system_logs })
```

**Remediation:**  
Redact API responses before logging. Log only status code and sanitized error code. Disable persistent logging for auth failures.

**Priority:** P2

---

## Remediation Roadmap

| Priority | Findings | Est. Effort |
|----------|----------|-------------|
| **P0** | SUBS-005 (Gemini key-in-URL) | 1–2 hours |
| **P1** | SUBS-001, SUBS-002, SUBS-003, SUBS-004 | 2–3 days |
| **P2** | SUBS-006, SUBS-007 | 1 day |

---

## Positive Security Controls Observed

- Content-script message allowlist blocks `GET_FULL_PREFERENCES`, `SET_PREFERENCES`, `EXPORT_LIBRARY` from web origins
- `buildContentPrefs()` strips all API keys before content-script exposure (tested in `tests/contentPrefs.test.ts`)
- `OPEN_DETAIL` / `OPEN_CAPTURE_CANVAS` validate `mediaId` format (`^tmdb_(movie|tv)_\d+$`)
- Poster ancestor-text queries clamped to 60 chars with word-count minimum
- `QUERY_CACHE_MAX=500` prevents unbounded memory growth
- Google Drive backup uses `appDataFolder` scope (not shared Drive)
- Export/backup excludes `user-prefs` API keys (library data only)
- No `eval`, `dangerouslySetInnerHTML`, or committed secrets
- `sender.id` validation on `LIBRARY_UPDATED` broadcast listener

---

## Confidence Calibration

- **Total findings:** 7
- **CRITICAL:** 0
- **HIGH:** 5 (avg confidence: 9.2/10)
- **MEDIUM:** 2 (avg confidence: 8.5/10)
- **LOW:** 0
- **INFO:** 0 (reported)
- **False positives filtered:** 12+ (test credentials, placeholder OAuth ID, innerHTML clear-only, dev console.log, missing CI workflows, etc.)
- **Mode:** Daily (8/10 gate)