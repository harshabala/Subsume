# Chrome Web Store promotional assets

Extension toolbar icons live in `src/assets/icons/` and are copied into `dist/icons/` at build time (16 / 48 / 128). Listing screenshots are in [`../screenshots/`](../screenshots/).

## What is here

| File | Size (px) | Notes |
|------|-----------|-------|
| `promo-small-440x280.png` | 440x280 | Small promo tile |
| `promo-marquee-1400x560.png` | 1400x560 | Marquee promo tile |
| `src/promo-small-440x280.html` | | Source for the small tile |
| `src/promo-marquee-1400x560.html` | | Source for the marquee tile |
| `src/film-page.html` | | Local stand-in web page used for screenshot 04 (not a real site) |

Both tiles use the brand tokens from `src/shared/tokens.css` (Cinema Black `#181818`, one Rosso Corsa `#da291c` square, Courier Prime headline, IBM Plex Mono body). Copy follows the listing pitch: "Save what stayed with you. Private movie & book journal for Chrome." Imagery is a crop of the real `../screenshots/02-library.png`, so the tiles show poster art from the extension's sample library.

## Regenerate

```bash
npm run build
python3 scripts/render-store-assets.py shots   # screenshots first; tiles read 02-library.png
python3 scripts/render-store-assets.py tiles   # renders src/*.html at exact pixel size
```

Fonts load from Google Fonts at render time, so an internet connection is needed.

## Other sizes

| Asset | Size (px) | Notes |
|-------|-----------|-------|
| Store icon | 128x128 | Same art as `icon128.png` |
| Screenshots | 1280x800 or 640x400 | 1 to 5; see `../screenshots/` |
| Promo video | YouTube URL | Optional; none made |

## Brand

See repo root `brand.md` and `DESIGN.md` for tone, colour and copy.
