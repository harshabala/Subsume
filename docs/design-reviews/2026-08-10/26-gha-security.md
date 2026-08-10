# GitHub Actions Security Review — Subsume

**Date:** 2026-08-10  
**Repo:** `/Users/harshabalakrishnan/Subsume`  
**Method:** [gha-security-review](https://github.com/) skill — exploitation-focused audit (pwn requests, expression injection, credential theft, supply chain)  
**Threat model:** External attacker without write access (fork PRs, issues, comments). Requires-write triggers (`workflow_dispatch`, `push` to protected `main`) are out of scope for exploitability unless they amplify a separate chain.  
**Score:** **8.5 / 10**

---

## Scope reviewed

| Path | Role |
|------|------|
| `.github/workflows/ci.yml` | Typecheck, test, build on `push` / `pull_request` |
| `.github/workflows/pages.yml` | Deploy `docs/privacy.html` to GitHub Pages |
| `.github/actions/**` | **None** (no local composite actions) |
| Root `action.yml` / `action.yaml` | **None** |

No other workflow definitions under `.github/`.

---

## Executive summary

Surface area is **small and mostly correct**: two workflows, official `actions/*` only, **no secrets**, **no `pull_request_target`**, **no comment/issue command bots**, and **no `${{ }}` shell interpolation** of attacker-controlled fields.

There are **no HIGH-confidence exploitable vulnerabilities** for an external attacker under the skill threat model (no pwn-request, no expression injection, no credential theft path).

Remaining issues are **defense-in-depth hardening** (tag-pinned actions, CI missing explicit `permissions:`). Those keep the score below 10, not because of a live exploit path today.

---

## Score breakdown

| Check | Result | Weight impact |
|-------|--------|----------------|
| Pwn request (`pull_request_target` + fork checkout) | **Clear** | — |
| Expression injection in `run:` | **Clear** | — |
| Unauthorized command execution (`issue_comment`, etc.) | **Clear** | — |
| Credential escalation / secret exposure | **Clear** (no `secrets.*`) | — |
| Config/prompt poisoning via privileged checkout | **Clear** (CI uses `pull_request`, not `_target`) | — |
| Supply chain (action pinning) | **Medium gap** — all tags, no full SHAs | −0.8 |
| Permissions minimalism | **Partial** — Pages scoped; CI inherits defaults | −0.5 |
| Runner / cache / artifact abuse | **Clear** (hosted runners; Pages artifact only on trusted push) | — |
| Trigger hygiene | **Good** | + |

**Score: 8.5 / 10**

---

## Findings

### No HIGH-confidence exploitable findings

No end-to-end attack path was confirmed for an external (no-write) attacker.

---

### [GHA-001] Actions pinned to mutable tags, not full SHAs  
**Severity:** Medium (defense in depth)  
**Confidence:** HIGH — pattern present in both workflows  
**Class:** Supply chain  

**Workflows / lines:**

- `.github/workflows/ci.yml` — `actions/checkout@v4`, `actions/setup-node@v4`
- `.github/workflows/pages.yml` — `actions/checkout@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`

**Why it matters:** Tags are mutable. Compromise or tag mutation of an action repo can change what runs under the workflow’s `GITHUB_TOKEN` permissions without a PR to Subsume.

**Risk context:** All actions are GitHub-official (`actions/*`). Per supply-chain guidance this is **Medium**, not Critical — low probability of compromise relative to unknown third-party actions, but still not immutable.

**Exploitation sketch (conditional on action compromise):**

1. Attacker (or insider) mutates tag `v4` on `actions/checkout` (or another used action) to a malicious commit.  
2. Next Subsume CI or Pages run pulls the new tag.  
3. Malicious action executes with that job’s token (CI: default token; Pages: `pages: write` + `id-token: write`).  
4. Impact limited by lack of repository secrets; Pages job could still alter site deployment if token permissions allow.

**Fix:** Pin to full 40-char SHAs with version comments; keep SHAs current via Dependabot/Renovate `github-actions` updates.

```yaml
# Example pattern (resolve current SHAs before applying)
- uses: actions/checkout@<40-char-sha>  # v4.x.x
- uses: actions/setup-node@<40-char-sha>  # v4.x.x
```

---

### [GHA-002] `ci.yml` has no explicit `permissions:` block  
**Severity:** Medium (depends on org/repo default)  
**Confidence:** MEDIUM — exploitability depends on repo Actions default token permissions  
**Class:** Permissions / blast radius  

**Workflow:** `.github/workflows/ci.yml` (entire job)

**Why it matters:** Without workflow-level `permissions:`, `GITHUB_TOKEN` inherits repository/org defaults. If defaults are still **read and write**, a future bug (compromised dependency during `npm ci`, malicious `postinstall`, compromised action) has a wider blast radius than necessary.

**Mitigating factors today:**

- Trigger is `pull_request` (not `pull_request_target`) — fork PRs get a **read-only** token and no secrets from the base repo.  
- Workflow never references `secrets.*`.  
- No deploy / release / package-publish steps.

**Fix:**

```yaml
name: CI

on:
  push:
    branches: [main, 'chore/**']
  pull_request:
    branches: [main, 'chore/**']

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    # ...
```

If commit statuses require it, add only `statuses: write` (or `checks: write`) — still avoid `contents: write` on CI.

---

## Needs verification (not scored as open vulns)

| Item | Notes |
|------|--------|
| Org/repo default GITHUB_TOKEN permissions | Confirm Settings → Actions → General is **Read repository contents and packages permissions** (recommended). Amplifies or mutes GHA-002. |
| Branch protection on `main` | Pages deploys on `push` to `main` only; protection reduces risk of malicious path changes landing without review. Outside pure workflow YAML. |
| Dependabot for Actions | Not present as a workflow finding; recommended to maintain SHA pins over time. |

---

## Reviewed and cleared

### `ci.yml` — CI build/test

| Property | Value | Assessment |
|----------|--------|------------|
| Triggers | `push` (`main`, `chore/**`), `pull_request` (same) | Safe: `pull_request` runs in PR context; fork PRs do not get base secrets |
| Checkout | `actions/checkout@v4` default ref | Does **not** use `pull_request_target` + PR head ref pwn pattern |
| `run:` steps | `npm ci`, `typecheck`, `test`, `build` | No `${{ github.event.* }}` shell interpolation |
| Secrets | None | No credential theft target in workflow YAML |
| Self-hosted runners | No (`ubuntu-latest`) | No shared-runner persistence risk from this file |

**Note (not a finding):** Fork PR CI *does* execute untrusted package scripts during `npm ci` / tests. That is intentional for CI and runs with the restricted PR token. It is **not** a pwn-request; do not “fix” by switching to `pull_request_target`.

### `pages.yml` — Privacy policy → GitHub Pages

| Property | Value | Assessment |
|----------|--------|------------|
| Triggers | `push` to `main` (path-filtered) + `workflow_dispatch` | External attacker cannot trigger without write access |
| Permissions | `contents: read`, `pages: write`, `id-token: write` | Appropriately scoped for Pages OIDC deploy |
| Staging step | Static `cp` + quoted heredoc `'EOF'` | No expression injection; no untrusted input |
| Environment | `github-pages` | Optional place for protection rules (reviewers / wait timers) |

### Absent attack surfaces (good)

- No `pull_request_target` / `workflow_run` privilege-bridge patterns  
- No `issue_comment` / `pull_request_review_comment` command bots  
- No PATs, deploy keys, or cloud credentials in workflow env  
- No third-party community actions outside `actions/*`  
- No loading of `CLAUDE.md` / `AGENTS.md` into privileged AI CI agents  

---

## Top fixes (priority order)

1. **Pin all six action references to full commit SHAs** (GHA-001) — both workflows; enable Dependabot `package-ecosystem: github-actions`.  
2. **Add `permissions: contents: read` to `ci.yml`** (GHA-002) — cap token if repo defaults are permissive.  
3. **Confirm org/repo Actions default is read-only** for `GITHUB_TOKEN` — one-time settings check.  
4. **Keep avoiding** `pull_request_target`, secrets in PR CI, and untrusted `${{ }}` in `run:` as the surface grows (releases, bots, AI review workflows).

---

## GitHub Actions Security Review (skill report format)

### Findings

#### [GHA-001] Mutable tag pins on all third-party actions (Severity: Medium)
- **Workflow**: `.github/workflows/ci.yml:18-21`, `.github/workflows/pages.yml:32,55,58,64`
- **Trigger**: N/A (supply chain; applies whenever jobs run)
- **Confidence**: HIGH — confirmed tag-only `uses:` references
- **Exploitation Scenario**:
  1. Attacker compromises an `actions/*` repo or moves a major version tag to malicious code.
  2. Next Subsume workflow run resolves the mutable tag.
  3. Malicious action code runs with that job’s token permissions.
  4. No repo secrets to steal; impact is token misuse / Pages deploy integrity if Pages job is hit.
- **Impact**: Supply-chain code execution under workflow token (limited today by no secrets; Pages write on deploy job).
- **Fix**: SHA-pin every `uses:`; comment human version; automate updates.

#### [GHA-002] CI inherits default token permissions (Severity: Medium)
- **Workflow**: `.github/workflows/ci.yml` (no `permissions:` key)
- **Trigger**: `pull_request` / `push`
- **Confidence**: MEDIUM — needs verification of repo default token mode
- **Exploitation Scenario**: Requires a separate compromise (malicious npm lifecycle or action) plus write-capable default token on non-fork runs.
- **Impact**: Inflated blast radius for future CI compromise.
- **Fix**: Explicit `permissions: contents: read` at workflow level.

### Needs verification
- Repository/org **default GITHUB_TOKEN** permission mode.
- Branch protection / required reviews on `main` for Pages path integrity.

### Reviewed and cleared
- **Pwn request**, **expression injection**, **comment-triggered commands**, **credential escalation**, **config poisoning via privileged checkout**, **self-hosted runner** issues: **not present**.
- Both workflows reviewed; no Critical/High external-attacker RCE or secret-theft path identified.

---

## Appendix — workflow inventory

```
.github/workflows/
├── ci.yml      # CI: npm ci → typecheck → test → build
└── pages.yml   # Pages: stage privacy.html → upload → deploy
```

**Actions used (all tag-pinned today):**

| Action | Workflows |
|--------|-----------|
| `actions/checkout@v4` | CI, Pages |
| `actions/setup-node@v4` | CI |
| `actions/configure-pages@v5` | Pages |
| `actions/upload-pages-artifact@v3` | Pages |
| `actions/deploy-pages@v4` | Pages |
