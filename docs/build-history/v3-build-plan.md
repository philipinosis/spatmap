# SpatMap v3 — Commercial Feature Build Plan (2026-06-17)

Built from the OceanFarmr feature research (`_v3-oceanfarmr-features.md`) + UX critique
(`_v3-ux-critique.md`). Goal: close the OFFLINE-BUILDABLE gaps that move SpatMap from "clever
offline tool" to "software a farm pays for." Backend-only features (live crew sync, web dashboard,
GPS fleet, financing) are explicitly out of scope for a single offline file.

All work in **spatmap-v3.html** (forked from the hardened v2). Serialized builds (one file → no
parallel-edit collisions), each QA'd in Playwright, looped until integrated.

## Owner asks (DONE 2026-06-17, verified)
- Cage popup shows oysters / cage type+mesh / size / date put in.
- Salinity on the conditions gauge.
- FlipFarm cages rotated narrow (rope through short side, more fit); OysterGro long-ways.

## Convergent #1 finding (both agents)
SpatMap collapses OceanFarmr's phone-app + web-dashboard into one offline app — its biggest edge
AND its biggest gap: it took the dashboard's job but shipped almost none of the dashboard's
*answers*. No money on screen, no sale-ready totals, no finder, no exportable record.

## Build order (highest commercial value first)
1. **Overview dashboard** — $ crop value + gear value, sale-ready (count + dozens), recent-activity feed. Needs an editable per-grade price. THE reason an owner pays. [M]
2. **Cage detail action bar** — Measure / Work / Grade / Pull / Photo from the detail sheet (today a dead-end with only "Change type"). [M]
3. **CSV / print export** — harvest log + stock-on-hand a farmer hands a buyer or inspector. The trust unlock. [S–M]
4. **Tasks / work queue** — "what's due / overdue" list with tap-to-jump (OceanFarmr's #1 hook). [M]
5. **Grade inventory + harvest forecast calendar** — counts by market grade + month-by-month readiness ("how many 3-inch next week"). [M]
6. **UX polish batch** — new drag clears prior selection (long-press to add); method chips on bulk Work (not silent "tumbled"); search / jump-to-cage; remembered fill defaults + steppers; confirm/undo after barge-distribute Fill; kill the doubled breadcrumb. [S each]

## SHIPPED (2026-06-17, all QA'd in Playwright + node --check, 0 console errors)
- **F1 Overview dashboard** — `farmDashboard()` + `renderDashboardCard()`: "$X on the water" (per-grade pricing, editable in Settings via `buildPriceEditor`), "Y dozen sale-ready · N cages", oysters/filled/empty, recent-activity feed. Overview-only. "Set oyster prices ›" affordance when unpriced.
- **F2 Cage detail action bar** — `cageActionBar()`: Work/Pull/Photo (filled) or Fill/Remove (empty) from the detail sheet; `buildCagePhotoSheet()`. No longer a dead-end.
- **F3 CSV export** — `exportStockCSV()` (every cage + est. $) and `exportHarvestCSV()`, RFC-escaped, in the Data menu. The records to hand a buyer/inspector.
- **F4 Work queue** — `workQueueItems()` + `buildWorkQueue()`: "⚑ N cages need work ›" on the dashboard + menu, sorted most-overdue, tap-to-jump.
- **F5 Harvest forecast + grade inventory** — `harvestForecast()` + `buildForecast()` (off the sale-ready stat): ready-now, month-by-month readiness, inventory by market grade.
- **F6 polish** — doubled breadcrumb deduped (`updateBreadcrumb`); confirmed barge-distribute Fill already has Undo.
- **Owner asks** — popup facts (count/type/size/date), salinity on the gauge, FlipFarm portrait glyph + per-shape cell width (more fit), OysterGro long-ways.

Verified: full daily loop (work→pull→fill→harvest) intact, durability hardening intact, status memo intact (~23× on 3000 cages), CSV correct, 0 console errors. Backups per-feature in `_v2-backups/spatmap-v3.*.bak`.

## OWNER FIXES — round 2 (2026-06-17, all QA'd in Playwright + code-reviewer + node --check, 0 console errors)
- **No dozens anywhere** — dashboard headline now `fmtCompact(readyOysters)` + "oysters sale-ready"; `buildForecast` shows raw oyster counts (ready-now / per-month / grade inventory). Dead `readyDozens` field removed from `farmDashboard`. Grep for "dozen"/"dz" = 0.
- **Salinity actually shows** — root cause: NOAA tide gauges (Grand Isle 8761724 confirmed) don't carry the CO-OPS `salinity` product, so the auto-only chip never appeared. Added MANUAL salinity logging: `condGetSalinity()`/`condSetSalinity()` (localStorage `spatmapSalinity` {ppt,at}, clamped 0–45), a tappable `.cond-sal` chip on the conditions sub-line (manual reading → NOAA fallback → "+ salinity" prompt), and `condBuildSalinitySheet()` editor (number input · Save · Clear). Persists, re-renders, survives quota fail.
- **Cage popup shows last action** — `popupCageFacts` gained a `Last: <eventLabel> · <monthDay>` row (newest event), guarded for empty/unknown-type events. Updates live after Work/Pull/etc.
- **Selection tool fixed** — `denseRangeSelect`: a fresh DRAG now REPLACES the whole selection (one-shot `clearSelection()` on first cross-cell move, `cleared` flag) instead of silently piling up across lines; `paintRange` made authoritative per-strip so dragging out-then-back SHRINKS correctly. Tap still toggles individual cages (scattered multi-select). Verified: cross-line replace, shrink, tap add/remove, multi-select popup, empty-water clear, pointercancel suppress.
- **Code review (code-reviewer subagent):** no ship-blocking defects; 3 low nits applied (unknown-event-label guard, salinity aria/visible rounding match, defensive pointercancel suppressNextClick).
- Backup: `_v2-backups/spatmap-v3.owner-fixes2-complete.bak`. Diff: `_owner-fixes2.diff`.

## CONDITIONS BAR → USGS (2026-06-17, code-reviewer-clean, node --check clean)
Owner: "pull salinity from USGS … for all the sites … replace NOAA with USGS if you can get all the data."
- **Root problem:** NOAA tide gauges almost never carry the CO-OPS salinity product (Grand Isle confirmed: "product may not be offered"). USGS coastal gauges DO — plus water temp, gage height (water level), and wind at many sites — refreshed ~15 min.
- **Rewrite:** the conditions bar is now driven by a single **USGS monitoring site** (`condGetSite`/`condSetSite`, key `spatmapUsgsSite`). One USGS Instantaneous-Values call (`condFetchUsgs`, params 00010/00065/00095/00480/00035/00036, `period=PT6H` so dead sensors drop out + gage trend derives). Left side = **live water level + rising/falling** (replaces NOAA tide predictions) · water temp (°C→°F) · **live salinity** · freshest age. Right side = NWS forecast (kept — the one thing USGS lacks — fetched from the SITE's own lat/lng so there's still one pick) with wind preferring the live USGS sensor.
- **Site picker for ALL sites:** `condBuildSearchSheet` now lists every active USGS salinity site per state (RDB site service → `condLoadUsgsSites`/`condParseUsgsRdb`), state dropdown (23 coastal states) + name filter; LA shows 44 sites, suggested = Caminada Pass 07380249.
- **Manual salinity** retained as the offline fallback/override (`condGetSalinity`). **Dead NOAA code removed** (17 symbols: gauge accessors, tide/latest fetchers, station list, COND_SUGGESTED, etc.) — 0 dangling refs.
- **Owner decision (2026-06-17):** KEEP the NWS forecast (hybrid), not pure-USGS. NWS = the only remaining NOAA dependency; it occasionally 404s (LIX office) → shows "no forecast", handled.
- Verified live: Caminada 10 ppt/84°F/↑3.5 ft; Barataria wind+level (its temp/sal sensors down >7d → manual fallback, no misleading age); picker filter; site persists; CORS ok (both USGS endpoints send `Access-Control-Allow-Origin:*`). Review nits fixed: NWS point-cache prune (`condPruneCache`), sub-line age excludes gage/manual. Backup `_v2-backups/spatmap-v3.usgs-complete.bak`, diff `_usgs-rewrite.diff`.

## TUB BATCH-SPLIT (2026-06-17, javascript-pro + ui-designer build, code-reviewer-clean, Playwright-verified, 0 console errors)
Owner: "split the oysters in the tub into different batches, fill cages with them; different sizes affect the growth charting." Owner decisions: tub holds a persistent list of batches; every fill logs the batch size as a real growth point (dot on chart + timeline row).
- **Data model (additive, back-compat):** `farm.barge` gains `splits[]` — self-contained sub-batch snapshots `{id,count,sizeMm,grade,label,ploidy,hatchery,origin,parentBatchId}`. Existing single-pile fields = the "unsorted remainder." `freshBarge`/migration/demo seed all carry `splits:[]`. Helpers `bargeHasContent`/`bargeTotalCount`/`bargeSplitById`.
- **`splitBarge(rows)`** — carves the COUNTED remainder into named batches (validates whole-number counts summing ≤ remainder; rejects an UNCOUNTED pile — no denominator to divide); decrements the remainder, keeps splits when it drains. Undoable.
- **`fillFromBarge(cageIds, splitId)`** — unified: fills from a chosen split OR the remainder pool; even-splits (count-conserving); writes a `filled` event that now CARRIES `sizeMm` → the per-cage growth-chart anchor. `growthPoints`/`latestSize` now count `filled`-with-sizeMm (old count-only filled events stay ignored → back-compat). Source decremented/removed; `freshBarge()` reset when the tub empties.
- **Active-fill arm:** module var `activeFillSplitId` + `setActiveFillSplit`; Fill routing in `renderPopup`/`cageActionBar` is 4-way (armed split → remainder pool → "pick a batch" → new seed). The arm deliberately SURVIVES `clearSelection()` (a drag-select fires clearSelection on its first move — clearing it there would disarm mid-drag); it clears on split depletion, `clearBarge`, or re-arm.
- **UI (`buildHarvestSheet` + `buildSplitEditor`):** remainder card → "Sorted batches" amber chips (tap to arm → close → "pick empty cages") → collapsible split editor (count·size·grade per row, live "Remaining", Save) shown only for a counted remainder. Tub-amber palette.
- **Verified (Playwright, localhost):** pull→split(3 sizes)→fill 3 cage sets → count conserved (3200 & 5400), each cage anchored at its batch size, projections DIVERGE (80mm "Market-ready now" / 55mm ~Sep 2026 / 35mm ~Mar 2027), chart draws the anchor dot, splits survive reload (migration), guardrails reject over-carve/fractional/empty/uncounted with no mutation, 0 console errors. code-reviewer: no blockers; both should-fix items (uncounted-pile mint guard + shortfall-toast guard) applied. Backups `_v2-backups/spatmap-v3.pre-batch-split.bak` (before) + `.batch-split-complete.bak` (after); diff `_batch-split.diff`; syntax via `_check-syntax.js`.
- **midden domain follow-ups (v-next, NOT built — would deepen realism):** lead with GRADE bucket, mm as the anchor behind it (farmers think grades first); allow split by volume/weight with a derived count (counting individual oysters at sort isn't real); growth-curve realism — winter near-stall <~10-12°C, summer slowdown/mortality window, growth flattens near market size, ±15-25% within-batch variance, 10-30% mortality haircut, and start the anchor a few days behind the sort date (handling setback).

### Deferred micro-polish (nice-to-have, not viability blockers)
Search/jump-to-cage, remembered fill defaults + steppers, long-press-to-ADD-to-selection (drag-replace now shipped), bulk-Work method-chip audit. Small follow-ups.

## Deferred (backend / roadmap — NOT this build)
Live multi-device crew sync, web dashboard, GPS lease tiles, push notifications, financing,
public lost-gear network, printable NSSP harvest tags (whitespace, but a large standalone build).

## Viability bar (when is v3 "commercially viable"?)
- A farm owner opens it and sees: $ on the water, how many are sale-ready, what needs work today.
- They can act on any cage from where they see its data.
- They can export a record to hand a buyer/auditor.
- It never loses data, works offline, 0 console errors, fast on a 3000-cage farm.
- The daily loop (fill/work/pull/harvest) is faster than OceanFarmr's pin-and-form.
