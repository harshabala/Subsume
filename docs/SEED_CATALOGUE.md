# Indian cinema seed catalogue

Subsume ships a **highlight catalogue** for first install and for **merge** (Settings → Data or popup **Load highlight catalogue**).

## Featured filmmakers

| Artist | Seed titles |
|--------|-------------|
| **Kamal Haasan** | Indian, Mudhalvan, Nayakan, Anbe Sivam, Vikram |
| **Mammootty** | Oru Vadakkan Veeragatha, Drishyam (Malayalam canon via Mohanlal entry) |
| **Mohanlal** | Kireedam, Manichitrathazhu, Spadikam, Drishyam (2013), Iruvar |
| **Tamil mass / sci-fi** | Enthiran, Padayappa, plus Shankar/Kamal pairings above |

## Merge behaviour

`RESTORE_DEMO_LIBRARY` now:

1. Seeds **only if** the library is empty (first run).
2. Always **merges** missing media, library rows (with reflections where defined), and filmmaker filmography links.

If you already had Top Gun / MI at the top, run **Load highlight catalogue** once — Indian titles and notes are added without wiping your data.

## Extending seed data

Edit:

- `src/background/seedIndianHighlights.ts` — new titles + reflection copy
- `src/background/seedData.ts` — order, people filmography
- `HIGHLIGHT_LIBRARY` map — watched status, ratings, `notes`

Rebuild: `npm run build`, reload extension.

## Posters

Poster URLs use TMDb `w500` paths. Wrong art? Look up `poster_path` on [themoviedb.org](https://www.themoviedb.org) and update `posterUrl`.