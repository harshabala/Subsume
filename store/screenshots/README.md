# Chrome Web Store screenshots

Place final listing screenshots in this folder before a Chrome Web Store (CWS) upload. Promotional tiles (small/marquee) live under [`../assets/`](../assets/).

**Important:** Screenshots must be **captured by a human** from a running Subsume build (Load unpacked or store package) until automated generation exists. Do not invent UI mockups as production listing art.

## Required sizes (CWS)

| Asset | Size (px) | Notes |
|-------|-----------|--------|
| Screenshots | **1280×800** or **640×400** | At least **1**, up to **5**. Prefer **1280×800** |
| Store icon | **128×128** | Extension icon; source under `src/assets/icons/` |
| Small promo tile | **440×280** | Optional; see `../assets/` |
| Marquee promo tile | **1400×560** | Optional; see `../assets/` |

Chrome Web Store rejects wrong aspect ratios. Capture at device pixel ratio 1 in a window sized for 1280×800 content area, or crop carefully without UI distortion.

## Suggested frames (5)

Capture these five scenes for a complete listing set:

| # | Frame | What to show | Capture tip |
|---|--------|--------------|-------------|
| 1 | **Popup** | Extension popup — programme / at-a-glance journal entry points | Open the toolbar popup on a neutral page |
| 2 | **Library archive** | Hardcover Library Archive — spines, intent groups, `emotionalRecall` excerpts | Options UI → Library with a few real entries |
| 3 | **Capture canvas** | Poetic Capture Canvas — “What stayed with you?” progressive disclosure | Trigger Reflect → capture act with soft poster blur |
| 4 | **Plaques** | Museum catalogue plaque on a real webpage (rating badge + hover expand) | Browse a title-rich page; hover a plaque |
| 5 | **Settings** | Settings — API keys area collapsed/redacted if needed; Drive connect state OK | Prefer privacy-minded crop (no live secrets) |

## File naming (recommended)

```text
store/screenshots/
  01-popup-1280x800.png
  02-library-archive-1280x800.png
  03-capture-canvas-1280x800.png
  04-plaques-1280x800.png
  05-settings-1280x800.png
```

PNG or JPEG is fine; keep file sizes reasonable for upload.

## Brand & quality bar

- Follow `brand.md` and `CINEMATIC_JOURNAL_DESIGN_SPEC.md` (editorial, not cluttered chrome).
- Prefer real poster art and genuine notes over empty states when possible.
- Avoid showing third-party site chrome that violates their branding guidelines if cropped tightly to Subsume UI.
- Do not include API keys, OAuth tokens, or personal email in the frame.

## Checklist before upload

- [ ] Five frames at 1280×800 (or documented alternate size)
- [ ] No secrets visible
- [ ] Matches current UI on the version you are shipping
- [ ] Listed alongside copy/review notes in `../MANIFEST_NOTES.md` and promo assets in `../assets/`
