# CSO Daily — Subsume Chrome Extension

| Field | Value |
|-------|--------|
| **Date** | 2026-08-10 |
| **Repo** | `/Users/harshabalakrishnan/Subsume` @ `a5471b5` |
| **Mode** | Daily (zero-noise, confidence gate ≥ 8/10) |
| **Focus** | Secrets, deps, CI, LLM, skill supply chain, OWASP/STRIDE high signals |
| **Auditor** | CSO skill (infrastructure + extension threat model) |

---

## Security posture: **7.5 / 10**

| | Count |
|--|------:|
| **CRITICAL** | **0** |
| **HIGH** | **2** |
| Residual MEDIUM (brief) | 4 |

**Why not higher:** BYOK API keys remain plaintext at rest; OMDb/Google Books still put keys in query strings.  
**Why not lower:** Strong IPC allowlist, content-script key stripping, scoped library checks (no full-library dump), per-origin resolve rate limits, Gemini key-in-header fix, LLM JSON not executed, no committed live secrets found, CI free of secrets/`pull_request_target`/expression injection.

---

## Stack (Phase 0)

| Attribute | Value |
|-----------|--------|
| Product | MV3 Chrome extension — private film/TV/books sanctuary |
| Language | TypeScript |
| UI | Preact 10 + preact-router |
| Build | Vite 8, esbuild |
| Storage | IndexedDB (`idb`) + `chrome.storage.local` (tokens, logs) |
| Auth | Optional Google OAuth (`chrome.identity`, Drive appData) — no Subsume backend |
| APIs | TMDb, OMDb, Trakt, TVMaze, Wikidata, Open Library, Google Books, OpenAI/Anthropic/Gemini |
| Prod deps | `idb`, `preact`, `preact-router`, `uuid` (lockfile present) |

**Entry points:** service worker (`background.js`), content scripts (`http(s)://*/*`), options/popup UI.

---

## Controls verified (not findings)

| Control | Location / evidence |
|---------|---------------------|
| Content-script message allowlist | `src/shared/messages.ts` — prefs/LLM/export/sync **not** allowed from page origins |
| API keys stripped from content prefs | `buildContentPrefs`, `sanitizePreferencesForContentScript` |
| Full library **not** content-script-fetchable | Allowlist uses `CHECK_LIBRARY_STATUS` / `CHECK_ARCHIVE_STATUS` only (prior SUBS-002 fixed) |
| Per-origin resolve budget | `originRateLimit.ts` — 20 / 60s on resolve-class handlers |
| Poster query clamp | `scanner.ts` — 60 chars, ≥2 words |
| Gemini key not in URL | `llm.ts` uses `x-goog-api-key` header (prior SUBS-005 fixed) |
| LLM output = data only | JSON parse → catalog resolve; Preact text nodes (no `dangerouslySetInnerHTML` / `eval`) |
| Import validation | `validateImportData` before Drive restore / import |
| mediaId gating | `isSafeNavMediaId` / `MEDIA_ID_PATTERN` |
| OAuth client ID public by design | Web client + `drive.appdata` scope; no client secret in repo |
| Packaging key local only | `subsume-key.pem` present on disk; **listed in `.gitignore`** (not treated as committed secret without git history proof) |
| Skills | Project `.agents/skills` gitignored; `skills-lock.json` pins AntV skills with SHA-256 hashes; no jailbreak/download-exec patterns in skill tree |

---

## Findings (≥ 8/10 only)

### [HIGH] SUBS-D01: API keys stored in plaintext preferences

**Confidence:** 10/10  
**Phase:** Secrets / OWASP A04 / STRIDE I  
**Location:** `src/background/storage.ts` (preferences put), `UserPreferences` key fields, `handlers/settings.ts` `API_KEY_FIELDS`

**Description:**  
`tmdbApiKey`, `omdbApiKey`, `llmApiKey`, `llmSecondaryApiKey`, and `googleBooksApiKey` are persisted in IndexedDB with no encryption or OS keychain. Any local malware, forensic access, or compromised extension context can read them.

**Exploit scenario:**  
1. Attacker obtains profile access (malware, shared machine, backup extract).  
2. Reads `subsume` IndexedDB preferences.  
3. Reuses LLM/TMDb/OMDb keys for billing abuse and data exfil via provider APIs.

**Remediation:**  
Encrypt at rest (user passphrase or WebCrypto + non-exportable key material), keep secrets in `chrome.storage.session` when possible, or proxy provider calls through a user-controlled backend. Document residual risk for pure client-side BYOK.

**Priority:** P1

---

### [HIGH] SUBS-D02: Provider API keys transmitted in URL query strings

**Confidence:** 9/10  
**Phase:** Secrets / LLM-adjacent transport / OWASP A04  
**Location:**  
- `src/background/omdb.ts` — `?apikey=`  
- `src/background/googleBooks.ts` — `params.key` → volumes URL  
- `src/ui/lib/validateKeys.ts` — OMDb validation fetch

**Description:**  
Secrets in URLs appear in browser DevTools, possible intermediate logs, and crash/network diagnostics. Gemini was fixed to use headers; OMDb/Google Books still use query keys (OMDb historically requires it; Google Books should prefer header where supported).

**Exploit scenario:**  
1. User enables OMDb or Google Books.  
2. Key appears in full request URL on every catalog call.  
3. Logging or screen-share leaks key; attacker burns quota / impersonates user to that API.

**Remediation:**  
- Google Books: use `x-goog-api-key` (or Authorization) if API accepts it.  
- OMDb: document unavoidable query-key constraint; minimize calls; never log full URLs; prefer header if OMDb ever supports it.  
- Redact `apikey`/`key` from any diagnostic logging.

**Priority:** P1

---

## Residual MEDIUM (brief — below daily gate for full write-ups)

| ID | Topic | Note |
|----|--------|------|
| M1 | Universal content scripts (`http://*/*`, `https://*/*`) | Product-required attack surface; mitigated by allowlist, rate limit, no key/library dump. Residual: hostile pages can still force resolve traffic / per-title status probes. |
| M2 | CI Actions tag-pinned not SHA-pinned | `ci.yml` / `pages.yml` use `@v4`/`@v5`; no secrets; no `pull_request_target`. Defense-in-depth only (see `26-gha-security.md`, score 8.5). |
| M3 | CI job missing explicit `permissions:` | Defaults broader than least privilege; Pages workflow correctly scoped. |
| M4 | LLM BYOK + custom prompts + note excerpts | Taste notes/`emotionalRecall` enter prompts; user can override system/task prompts; client-side keys + Anthropic browser header by design. Impact mainly recommendation steering / key exposure to provider — not RCE. |

---

## Phase snapshots (high signal only)

### Secrets
- No `sk-` / `ghp_` / PEM private keys in tracked source patterns.  
- OAuth client id is a public Web client id (expected).  
- Local `subsume-key.pem` gitignored — ensure never force-added; rotate if ever pushed.

### Dependencies
- Small prod graph; lockfile present; caret ranges in `package.json`.  
- **npm audit not executed in this agent session** (no shell) — re-run `npm audit --omit=dev` in CI locally before release.

### CI/CD
- No secrets, no expression injection into `run:`, no `pull_request_target`.  
- Residual: mutable action tags + CI default permissions (M2/M3).

### LLM / AI
- Catalog-grounded resolve path; no code execution of model output.  
- Residual M4 (BYOK + user/content in prompt).

### Skill supply chain
- Lockfile hashes for AntV skills; `.agents/` ignored from git. No malicious instruction patterns found.

### OWASP / STRIDE (extension)

| Area | Signal |
|------|--------|
| A01 Access control | Strong message origin allowlist; content ≠ full prefs |
| A02 Misconfig | Broad content_scripts (residual M1) |
| A03 Supply chain | Actions tags; npm audit pending |
| A04 Crypto | **HIGH** D01/D02 |
| A05 Injection | Low — Preact text, no eval/innerHTML for untrusted HTML |
| A06 Design | Rate limits present; residual hostile-page traffic |
| A07 Auth | Implicit OAuth via identity API (extension-typical) |
| A08 Integrity | Import schema validation |
| A09 Logging | Truncation present; avoid URL logging with keys |
| A10 Exceptions | LLM parse failures fail closed to empty recs |

---

## Delta vs 2026-07-01 daily audit

| Prior finding | Status @ a5471b5 |
|---------------|------------------|
| SUBS-002 full library on hostile origin | **Fixed** — `CHECK_LIBRARY_STATUS` only |
| SUBS-003 unbounded poster API | **Mitigated** — origin rate limit + query clamp |
| SUBS-005 Gemini key in URL | **Fixed** — header |
| SUBS-001 universal CS | Residual M1 |
| SUBS-004 plaintext keys | **Still open** → D01 |
| CI absent | Workflows added; residual pin/permissions |

---

## Confidence calibration

```
Mode: Daily (8/10 gate)
Total findings reported: 2 HIGH + 4 residual MEDIUM
CRITICAL: 0
HIGH: 2 (avg confidence ~9.5/10)
False positives filtered: placeholder docs, test-only secrets, intentional public OAuth client id,
  packaging public key in manifest, innerHTML clear-only in dock, AntV skill noise
```

---

## Top issues (executive)

1. **Plaintext API keys in IndexedDB** (HIGH)  
2. **OMDb / Google Books keys in URL query** (HIGH)  
3. Residual: universal content scripts, GHA tag pins, BYOK LLM surface  

**Critical count:** 0  
**Security posture score:** **7.5 / 10**
