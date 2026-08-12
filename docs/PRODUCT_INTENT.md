# Product intent

**Decision (2026-08-11):** Subsume is a **product**, not a portfolio-only demo.

## Path

- **Free core forever on this device** — archive, capture, discovery plaques, weekly local selection, export/import. Zero API keys still works for the offline-first loop.
- **Optional paid private backup later** — encrypted Drive (or equivalent) as a paid option when/if shipping; **not implemented** as checkout today. Optional free Drive appData backup remains a user-connected feature when configured.
- **Never sell user data** — no Subsume cloud taste graph for resale; library and reflections stay on-device unless the user exports or connects their own backup.

## What we will not do

- Fake checkout or phantom premium gates
- Require cloud accounts for the core journal loop
- Monetize by selling library contents or notes

## Related

- User-facing Backup copy: Settings → Backup & sync (`BACKUP_SECTION_PITCH` in `src/shared/productCopy.ts`)
- Short product pointer: [`PRODUCT.md`](../PRODUCT.md)
- Privacy: [`docs/PRIVACY.md`](./PRIVACY.md)
