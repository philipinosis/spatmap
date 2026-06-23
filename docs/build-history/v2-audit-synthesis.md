# SpatMap v2 — Audit Synthesis & Fix Backlog (2026-06-17)

Four parallel specialist audits of `spatmap-v2.html` (9,252 lines, single-file offline app):
`code-reviewer` (correctness), `javascript-pro` (resources/perf), `architect-review`
(architecture/commercial), `midden` (oyster-domain product/market). Plus a self
documentation check. Full reports: `_audit-correctness.md`, `_audit-resources.md`,
`_audit-architecture.md`.

## The convergent story
The app is **well-built for what it is**: disciplined state mutations (clone-before-
snapshot, descending-index splices, seq-guarded undo), a defensive never-throw migration
chain, a robust IndexedDB photo layer. The mutation core is sound. The exposure is
concentrated at **two seams**: (1) **data durability** — the farmer's livelihood lives in
exactly one place (localStorage) that the app never asks the browser to keep, with a
silently-swallowed quota failure; (2) a few **undo inverses** that corrupt silently when
state changed underneath them. Both audits independently flagged durability as the #1 risk.

Commercial verdict (architect + midden agree): **evolve, not rewrite.** Offline-first is a
real, defensible edge. Single-device + no-backup + no-harvest-tag is not yet sellable. The
backend for sync is already designed in `supabase-setup.sql`. Sharpest wedge: durable
auto-backup → NSSP harvest tag (the regulatory hook competitors charge for) → crew/multi-
device. That is a roadmap, not this loop's work.

---

## FIX BACKLOG (this loop)

### Tier 1 — Durability (the dealbreaker; cheap, ship now)
- **F1** persist on boot — call `navigator.storage.persist()` at init, not only on first photo. (arch #1)
- **F2** loud save failure — `save()` returns bool; quota failure shows a sticky banner, not a transient toast that lets memory diverge from disk. (C2/C3/M1)
- **F3** dual-slot durability — keep a `:bak` mirror; boot recovers from it if the main blob is missing/corrupt.
- **F4** non-destructive import — dry-run migrate a clone before overwrite; snapshot displaced blob to a recovery key. (C2)
- **F5** boot crash guard — wrap init/render in try/catch with an Export/Reset recovery screen. (C1)
- **F6** flush-on-exit + debounce — flush on `pagehide`/`visibilitychange`; debounce the full-stringify save. (C2-perf)

### Tier 2 — Correctness (silent data corruption)
- **F7 (H2)** `workCages` undo gated on batch identity — snapshot `batchId`, restore only if the cage still holds that batch.
- **F8 (H3)** `setLineCageCount` / `addCagesToLineEnd` undo splice only still-empty created cages by identity (never a now-stocked cage → orphan batch).
- **F9 (H4)** `harvestFromBarge` stops stamping `harvested` events on cages that stay stocked (double-count).
- **F10 (H1)** `pull` undo restores events by identity, not list length.

### Tier 3 — Performance (real-farm scale: 30×100 = 3000 cages)
- **F11 (C1-perf)** memoize `cageStatus`/`latestSize`/`needsWork` per `commit.seq` (per-render status cache) — kills O(cages×events) redraw.
- **F12 (H2-perf)** throttle `syncPopup` in drag `onMove` via rAF.
- **F13 (H3-perf)** `openPhotoViewer` object-URL sequence guard (no leaked decoded JPEG on fast close).
- **F14 (H4-perf)** `condRefresh` gates on `navigator.onLine`; abort overlapping fetch waves.

### Tier 4 — Lower (fix if trivial, else documented backlog)
M2 growth `observed`→`derived` label on same-date two-point; M3 future-date guards; L4 OLS
near-zero slope guard; M5/restoreImportedPhotos orphan sweep ordering; H5 `d.v` future-version
guard; L3 today-local vs UTC off-by-one.

### Docs
- **D1** rewrite `DIRECTORY.md` → `spatmap-v2.html` canonical, v2 architecture, current backlog; archive stale planning docs.
- **D2** rewrite `README-and-hosting-guide.md` → describes v2 (drop `index-3`, drop old 4-quarter hierarchy; update durability guidance).
- **D3** move stale `_opus-*`, `_rebuild-*`, `index-3..7`, `_method-picker`, `_design-spec-index3`, `_improvement-plan` to `_archive/`.

## SHIPPED (2026-06-17, all QA'd in Playwright + adversarial code-review)
- **Tier 1 durability:** F1 persist-on-boot · F2 loud/returning save() + sticky banner · F4 non-destructive import (dry-run + `:prev` snapshot) · F5 boot crash-guard recovery screen · F6 flush-on-exit · loadState null-farm filter. (F3 dual-slot dropped — same-origin mirror doesn't survive the dominant eviction/clear-site-data vectors and doubles the 5MB budget.)
- **Tier 2 correctness:** F7 workCages undo (batch-identity gate + event-identity removal) · F8 add-cages undo (identity, empty-guarded — no orphaned batch) · F9 harvestFromBarge double-count removed · F10 pull undo by event identity.
- **Tier 3 perf:** F11 cageStatus memo (23× on 3000 cages: 25.6ms→1.1ms; keyed on commit.seq + day + farm + marketSize + neglectInterval) · F12 drag reposition rAF-coalesced · F13 photo-viewer object-URL sequence guard · F14 conditions-bar offline fetch gate.
- **Review fixes:** #1 memo stale-after-settings regression (folded marketSize/neglect into the key) · #2 `:prev` made a real boot-recovery source (loadState falls back to it). Plus the deprecated `apple-mobile-web-app-capable` meta warning.
- **Docs:** DIRECTORY.md + README rewritten for v2 (were describing index-3 / the retired 4-quarter hierarchy); 13 untracked historical files moved to `_archive/`.

Result: 0 console errors, `node --check` clean, all hazard scenarios (undo-after-stock, undo-after-batch-swap, quota failure, corrupt import, corrupt-main boot) verified safe.

## Deferred to roadmap (NOT this loop — commercial features)
Cloud backup/sync against `supabase-setup.sql`; NSSP harvest tag + time-to-temp record;
multi-device crew; gear types beyond FlipFarm (floating bags / multi-bag floats); grading
distribution + forward availability curve; author-in-modules build step + unit tests on the
pure cores (lineage, growth math, migration).
