# Permission Justification Matrix — Subsume

For Chrome Web Store review and internal consistency checks. Aligns with `manifest.json` (Manifest V3).

**Extension:** Subsume  
**Developer:** Harsha Balakrishnan (`harsha16balakrishnan@proton.me`)  
**Architecture:** Client-side only; no Subsume backend.  
**Privacy policy:** `https://harshabala.github.io/Subsume/privacy.html` (source: `docs/privacy.html`)

---

## Single purpose

Subsume helps users keep a **private film and TV library**—capturing titles discovered while browsing, with notes, emotional ratings, and optional on-device AI recommendations and Google Drive appData backup—without a Subsume cloud account.

Every permission below maps to that purpose.

---

## Chrome API permissions

| Permission | Required? | User-facing feature | Justification for review | Data handled |
| :--- | :--- | :--- | :--- | :--- |
| **storage** | Yes | Library, settings, caches, optional API keys, diagnostic logs, page dock notes | Persist personal media library and preferences on the device via IndexedDB and `chrome.storage.local`. Without storage, Subsume cannot function as a local sanctuary. | Library records, notes, ratings, preferences, optional keys (not encrypted at rest), local diagnostics |
| **activeTab** | Yes | Popup / user-initiated interaction with the current page | Grants temporary access to the active tab when the user invokes the extension, supporting capture and context without a permanent `tabs` permission. | Active tab URL/context only as needed for user-initiated flows |
| **notifications** | Yes (for digests/alerts) | Optional digests and alerts | `chrome.notifications` surfaces time-sensitive library or digest messages the user enables—not promotional spam. | Notification title/body derived from local library/digest logic |
| **alarms** | Yes (for digests) | Weekly digests / scheduled checks | `chrome.alarms` schedules background work without keeping a page open. Used for digest and similar periodic tasks. | Alarm names/schedules only; no third-party “phone home” |
| **identity** | Yes (for Drive) | Optional Google Drive backup | `chrome.identity` (e.g. `launchWebAuthFlow`) obtains OAuth tokens for Google Drive **appData** and optional userinfo email display. No Subsume account system. | OAuth tokens; optional Google email for “Connected as…” UI |

### If a feature is disabled

- Without notifications/alarms, digests degrade; core library can still work if product code allows.
- Without identity, Drive backup must remain optional and clearly labeled in the listing.
- Review submissions should not request permissions for features stripped from the build.

---

## Host permissions

Declared in `manifest.json` → `host_permissions`. Each host is called from the **background service worker** (or extension pages), not as a general proxy for arbitrary browsing.

| Host pattern | Service | Why required | What is sent | What is received |
| :--- | :--- | :--- | :--- | :--- |
| `https://api.themoviedb.org/*` | TMDb | Core catalogue: search, metadata, posters, people/filmography | API key (user-configured), title/person queries, IDs | JSON metadata, image paths |
| `https://www.omdbapi.com/*` | OMDb | Optional supplemental metadata | User OMDb API key, title queries | JSON metadata |
| `https://api.openai.com/*` | OpenAI | Optional AI recommendations / digests | User API key; prompts built from local taste profile / short note excerpts | Model text responses (data, not code) |
| `https://api.anthropic.com/*` | Anthropic | Optional AI recommendations / digests | User API key; similar prompts; browser access header as required by Anthropic for browser-origin calls | Model text responses |
| `https://generativelanguage.googleapis.com/*` | Google Gemini | Optional AI recommendations / digests | User API key; similar prompts | Model text responses |
| `https://api.trakt.tv/*` | Trakt | Metadata / discovery integrations used by the extension | API requests as implemented (no Subsume account store) | JSON media data |
| `https://api.tvmaze.com/*` | TVMaze | Television metadata | Title/show queries | JSON TV metadata |
| `https://query.wikidata.org/*` | Wikidata | Structured metadata for titles/people | SPARQL or API queries | Structured data |
| `https://en.wikipedia.org/*` | Wikipedia | Encyclopedic context for titles/people | Page/API fetches for relevant entities | HTML/JSON content for enrichment |
| `https://www.googleapis.com/*` | Google APIs | Drive appData upload/download; OAuth-related userinfo when connected | OAuth bearer token; library backup payload when user syncs | Tokens, appData file content |

### Host permission principles

1. **No Subsume API host** — there is none to declare.
2. **User keys for paid/quota LLM and many metadata APIs** — keys stored locally; transmitted only to the matching provider.
3. **LLM responses are data** — not executed as extension code (no remote code).
4. **Drive is opt-in** — identity + `googleapis.com` support backup; core library works offline of Drive.

---

## Content scripts

| Field | Value |
| :--- | :--- |
| **Matches** | `http://*/*`, `https://*/*` |
| **Run at** | `document_idle` |
| **Assets** | `content.js`, `content.css` |

### Why all URLs

Film and television appear across the open web: streaming UIs, review sites, news, social posts, award lists, personal blogs. Restricting matches to a fixed domain list would break the product’s discovery purpose. Broad matches serve **title/poster detection and restrained UI injection** only.

### What content scripts do

- Scan for poster images and title-like text.
- Inject isolated UI (Shadow DOM): museum-style plaques, hover cards, optional reflection dock.
- Message the background for resolve/library status within an allowlisted message set.
- Respect **disabled domains** (user blacklist).

### What content scripts must not do (and do not)

| Risk | Mitigation in product |
| :--- | :--- |
| Exfiltrate API keys | Keys never included in content prefs; background-only |
| Dump full library to the page | No full-library fetch for content; scoped status checks |
| Unbounded TMDb traffic from hostile pages | Per-origin poster resolve budget; query length/word clamps |
| CSS breakage of host sites | Open Shadow DOM isolation |
| Persist after navigation messily | Lifecycle `destroy()` / pagehide teardown |
| Ads / trackers | None |

### Justification paragraph (paste for reviewers)

> Subsume’s content scripts run on http and https pages so users can recognize films and TV titles wherever they browse and capture them into a private on-device library. The scripts inject isolated discovery UI and communicate with the background through a limited message allowlist. API keys never leave the background/settings path. Users may blacklist domains or uninstall. Scripts are not used for advertising, analytics SDKs, or selling browsing data. Broad host matching is required because media discovery is not limited to a single website.

---

## Optional vs required capabilities

| Capability | Permission(s) | Optional for user? |
| :--- | :--- | :--- |
| Local library & notes | storage | Core (required for product) |
| On-page discovery | content_scripts | Core; per-domain disable available |
| TMDb metadata | host TMDb + user key | Key required for full metadata |
| OMDb | host OMDb + user key | Fully optional |
| LLM recommendations | OpenAI/Anthropic/Gemini hosts + user keys | Fully optional |
| Digests | alarms, notifications | Optional feature |
| Drive backup | identity, googleapis.com | Fully optional |

---

## Data flow diagram (review-friendly)

```text
  [ Web pages ]
       │ content script (detect titles/posters; no API keys)
       ▼
  [ Background service worker ]
       │ IndexedDB / chrome.storage.local  (library, prefs, optional keys)
       │
       ├─► TMDb / OMDb / Trakt / TVMaze / Wikidata / Wikipedia  (metadata)
       ├─► OpenAI / Anthropic / Gemini  (optional; user keys; prompts from local taste)
       └─► Google APIs  (optional Drive appData backup via identity OAuth)

  No Subsume cloud ── X
```

---

## Privacy practices crosswalk

| Practice | Statement |
| :--- | :--- |
| Sell data | No |
| Ads | No |
| Analytics SDKs | No |
| Remote code | No — all JS CSS in package; API responses not executed as code |
| Encryption at rest | Not provided by Subsume for local storage — disclosed in privacy policy |
| Children’s direction | Not directed at children under 13 |
| Contact | harsha16balakrishnan@proton.me |

---

## Change control

When editing `manifest.json` permissions:

1. Update this matrix.
2. Update `store/LISTING.md` justification sections.
3. Update `docs/PRIVACY.md` and `docs/privacy.html` if data practices change.
4. Bump version and note permission changes in the store “What’s new” field.

---

*Accurate for Subsume’s client-side architecture. Do not invent permissions or hosts not present in the shipped manifest.*
