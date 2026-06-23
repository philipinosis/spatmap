# SpatMap v2 — Build Log

Built 2026-06-16. Output: **`spatmap-v2.html`** (forked from the live `spatmap.html`).
The live app + `index.html` redirect are UNCHANGED — v2 is a separate file for review.

Orchestrated from the main session: graphic-design audit → architecture map → plan →
opus subagents per work package, each QA'd in Playwright (mobile 390×844, Brightside +
multi-plot seeds) before advancing. Adversarial code-review pass at the end.

## What v2 delivers
The farm is now **one coherent, pannable map**. The home is the SVG canvas (was a DOM
dashboard); all plots tile in one world. Drag/pan flows straight from one plot into the
adjacent one — no screen swap. Pinch in and cages resolve into detailed FlipFarm glyphs.
**Tap a plot → its cleaned-up work list opens** (the product decision: map navigates,
the clean list is where you do drag-select fill/work/pull/harvest). Back → the map.

## Phase 1 — cleaned up the work view (WP1–6)
- WP1 removed the ambient per-cage label band (the main clutter).
- WP2 tens-ticks under each rope (one mark per 10 cages, the only ambient numbering).
- WP3 row rhythm (`--row-gap`), rope as the 4px spine, bold bookend pilings, no grid-under-rows.
- WP4 legible cages (24px, scroll long lines), 4px status edges, empty rack-slot texture, bigger glyph.
- WP5 stat strip leads with ● ready / ⚑ work + colored dots; empty-farm CTA line.
- WP6 barge re-docked with caption above the hull + wake shadow. QA revised: dropped the
  140px right gutter (it force-scrolled short lines + hid cages) → lines run ~full width.

## Phase 2 — one seamless map (WP7–9 + integration)
- WP7 canvas cage detail by ON-SCREEN px (not a fixed tier): pip → rect → full FlipFarm
  glyph + status edges + tens-ticks. (`LOD_WORK 3.2` from the audit was miscalibrated for
  this geometry — detail keys off `cellLen*k`.) Empty slots lightened to hollow cradles.
- WP8a canvas is the home (`render()` overview → `buildOverview` + barge HUD, not `buildDashboard`).
- WP9 whole-plot framing with an ~8% neighbor-sliver margin, distinct cards on water,
  counter-scaled plot labels, breadcrumb pill ("Farm › Plot", taps to zoom out), first-run
  coachmark, lowered `ZOOM_MIN` 0.2→0.1 so a wide multi-plot farm fits at the overview.
- Integration (per owner's choice): tap a plot/area → `drillIntoArea` (animated → scoped
  clean work list), back → canvas map. The WP8a/WP9 canvas camera-zoom path
  (`enterAreaOnCanvas`/`frameAreaCamera`/`plotOfArea`/`NEIGHBOR_MARGIN`) was reverted +
  deleted as dead code.

## Code review (code-reviewer, opus) — verdict: safe to ship
No Critical/High bugs; `node --check` clean. Fixed: M1 (breadcrumb double `getBoundingClientRect`
per pan frame), L4 (pip radius clamp at low k). Noted, not blocking: NOAA conditions bar no
longer shows on the home (it lived on the retired dashboard) — re-add to the map topbar if wanted.

## QA seeds (Playwright, served on :8743)
- `window.SpatMapDebug.loadBrightside()` — single-plot realistic farm.
- `fetch('/_v2-seed-multi.js').then(r=>r.text()).then(t=>(0,eval)(t)); window.seedMultiPlot()`
  — 3 plots (North/East/South Reef) tiled with channels, 15 lines, for adjacency tests.

## Artifacts
`_v2-DESIGN-AUDIT.md` (ui-designer report) · `_v2-BUILD-PLAN.md` (work packages) ·
`_v2-seed-multi.js` · `_v2-backups/` (per-WP snapshots) · `_screenshots/v2/` (QA shots).

## Layout-editor "open canvas" fix (2026-06-16, owner dogfooding)
Owner hit placement bugs: plots couldn't be dragged to most of the screen, areas wouldn't
place. A `debugger` agent dogfooded the editor and root-caused (then a 2nd agent verified the
fix via real gestures, all 6 checks PASS):
- **Plots were hard-clamped to a 1000×1000 world** (`editApply` plot branch) — any plot past
  x≈920 teleported onto the first plot. → clamp to `layoutContentBounds + generous margin`.
- **Areas were jailed inside their parent plot rect** → free move; the plot now GROWS to contain
  the dragged area (`growPlotToContainArea`).
- **Pan rubber-banded back to content** (`clampViewToContent`, 40px leash) → relaxed to the same
  open content+margin envelope (`clampOpenAxis`); Fit-all still recovers.
- **Snap grid only spanned 0..1000** → spans the farm's content bounds + margin (capped).
Result: multiple plots placeable in "entirely different places," all visible on the home, tap a
plot's "Open ›" to drill in. Pushed to main (commit 57611849). NOAA conditions bar also re-homed.

## Not done (deferred by owner's product choice)
- "Everything on the canvas" (drag-select cages directly on the map, fully retiring the
  work list) was the other option; owner chose map-for-navigation + clean-list-for-doing.
  The camera-zoom code is removed but restorable from `_v2-backups/` / git if revisited.

## Audit hardening pass (2026-06-17)
Full code + documentation audit. Four parallel specialists (code-reviewer / javascript-pro /
architect-review / midden) + a self doc-check produced `_v2-AUDIT-SYNTHESIS.md` and the
`_audit-*.md` reports. Shipped 14 fixes across durability, correctness, and performance, plus a
docs rewrite — orchestrated from the main session, each chunk QA'd in Playwright (mobile 390×844,
Brightside + a 3000-cage stress farm) and then adversarially re-reviewed (which caught a memo
stale-after-settings regression, fixed + re-verified). See `_v2-AUDIT-SYNTHESIS.md` § SHIPPED.
Headlines: storage now persists on boot + fails loud (was silent), import can't destroy data,
a boot crash shows a recovery screen instead of a blank page, undo inverses are identity-based
(no orphaned batches / no double-counted harvests), and the 3000-cage status redraw is 23× faster.
