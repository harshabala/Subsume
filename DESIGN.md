# Subsume Design System

**Version:** 1.0 · Wave 2 identity lock (2026-08-10)  
**Authority:** This document describes the *shipped* Subsume UI. Live values live in `src/shared/tokens.css` and `src/shared/shadowTokens.ts`.  
**Product:** Chrome MV3 extension — private multi-medium sanctuary for films, TV, and books.

---

## 1. North star

Subsume is a **private sanctuary**, not a social tracker and not a generic notes app.

- **Emotion before metadata** — capture what stayed with you first.
- **Plaque → Reflect → Archive** — discover on the open web, inscribe, keep.
- **Local-first** — library and keys stay on device unless the user opts into backup.

**Visual register:** Cinema Black canvas + scarce Rosso Corsa voltage + monospaced type that feels like a **screenplay and a manuscript ledger**.

This is **not** a Ferrari marketing site. Rosso Corsa is borrowed voltage only — no trademarks, no Cavallino, no automotive chrome.

---

## 2. Color

### Shell

| Role | Token | Dark | Light |
|------|--------|------|-------|
| Canvas | `--bg-base` | `#181818` | `#f7f7f7` |
| Elevated | `--bg-elevated` | `#242424` | `#ffffff` |
| Card / overlay | `--bg-overlay` / `--card` | `#303030` | `#ffffff` |
| Ink | `--fg-base` | `#ffffff` | `#181818` |
| Body | `--fg-muted` | `#969696` | `#666666` |
| Brand primary | `--primary` | `#da291c` | `#da291c` |
| On primary | `--on-primary-fg` | `#ffffff` | `#ffffff` |

Theme labels: **Cinema Black** / **White Canvas** / **System** (`themeLabels.ts`).

### Red-channel policy

Three red-adjacent roles must stay **visually distinct**:

1. **Brand voltage** (`--primary` `#da291c`) — solid primary CTAs, focus ring, scarce accents. Not for delete. Not for abandoned chips.
2. **Danger** (`--destructive` / `--danger-*` orange-red `#ea580c`) — destructive actions and hard errors.
3. **Abandoned status** (`--status-abandoned-*` stone `#a8a29e`) — DNF / abandoned ledger state only.

Success `#03904a`, info `#4c98b9`, warning amber remain non-red brand competitors.

---

## 3. Typography

Monofont system (no dual serif/sans pairing):

| Role | Face | CSS token | Use |
|------|------|-----------|-----|
| Display | **Courier Prime** | `--font-editorial`, `--font-display` | Headings, plaque titles, inscription / poetic surfaces, monogram |
| UI / body | **IBM Plex Mono** | `--font-ui`, `--font-sans`, `--font-mono` | Nav, forms, settings, dense lists, helper text |

**Rationale:** Courier is the industry standard for screenplay pages; it also reads as typewritten manuscript — aligned with product words *inscribe, plaque, dossier, archive*. IBM Plex Mono stays in the mono family but stays legible at 11–14px UI density.

**Avoid as display face:** JetBrains Mono, Fira Code, Cascadia Code (developer-tool smell). Cascadia may appear only in the Plex Mono fallback stack.

**Load:** Google Fonts in `src/ui/index.html`, `src/ui/popup.html`, and `SHADOW_FONT_STYLESHEET` in `shadowTokens.ts`.

---

## 4. Shape, space, motion

- Radius: tight sanctuary (`--radius-sm` 2px, `--radius-md` 4px, `--radius-none` 0 for sharp CTAs where applied).
- Spacing ladder includes `--spacing-3xl`…`--spacing-super` (48–128px) for editorial air; dense chrome may use smaller steps.
- Shadows: soft, tinted — not harsh multi-tier SaaS stacks on every card.
- Motion: user-facing ≤ **300ms**; curtain enter/exit tokens; `prefers-reduced-motion` nuclear coverage on shell and popup.
- Hover lifts: gate with `@media (hover: hover) and (pointer: fine)`.

---

## 5. Components (principles)

| Component | Principle |
|-----------|-----------|
| Primary button | Solid `--primary`, white label, uppercase tracking, min 44px height |
| Secondary | Restraint outline / quiet optical button |
| Archive cards | Hardcover spine objects, not equal SaaS grids when avoidable |
| Capture | Poetic Capture Canvas — progressive disclosure, emotional spectrum |
| Content plaques | Closed Shadow DOM + trusted gesture (dock is the special case under a11y work) |
| Empty states | Always offer a next action (activation path) |

**Class naming:** prefer `.sanctuary-btn-primary` / `.btn-sanctuary-primary`.  
Deprecated aliases: `.sanctuary-btn-gold`, `.btn-sanctuary-gold`, `--gold*` tokens (still resolve to Rosso).

---

## 6. Surfaces

| Surface | Token source |
|---------|----------------|
| Full app | `tokens.css` via `global.css` |
| Popup | tokens + `popup.css` |
| Content dock / overlay / hover | `shadowTokens.ts` + content CSS |
| Sanctuary archive / detail | tokens + `sanctuary.css` |

---

## 7. What we explicitly retired

- Gilded Night gold palette as brand
- Newsreader + Outfit dual-type direction
- Inter as the product typeface
- Five-step API-key onboarding (activation is 2 steps + Discovery land)
- Treating Ferrari.com marketing layout as product layout

---

## 8. Related docs

| Doc | Role |
|-----|------|
| `brand.md` | Short palette / type / red-channel checklist for agents |
| `PRODUCT.md` | Product thesis |
| `docs/CINEMA_VOICE.md` | Voice & copy rules |
| `docs/design-reviews/2026-08-10/` | Multi-skill review corpus |

When tokens and this file disagree, **tokens win** — then update this file.
