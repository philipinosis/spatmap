# SpatMap — Architecture

For whoever maintains the app next (including future-you). The app is one file, `spatmap.html`:
all HTML, CSS, and JS inline. No framework, no build step, vanilla ES5-ish JS. State lives in the
browser. It runs from `file://`, a static host, or offline once loaded.

## Data model

```
Farm
 ├── Plots          separate places (a lease, an acre); each carries world coords
 │    └── Areas     rectangles inside a plot, filled with lines
 │         └── Lines   named longlines — stored FLAT in farm.lines[] with plotId/areaId refs
 │              └── Cages    plots/areas are an additive spatial index over the flat lines
 │                   └── Batch   the oysters in a stocked cage (count, size, grade, ploidy, lineage)
 ├── Barge          the working pile during a work day (pull → work → fill / harvest)
 │    └── splits[]  named sub-batches carved off the pile, each a self-contained snapshot
 ├── Batches        pooled lineage records (a batch travels cage → barge → cage)
 ├── Grades         per-farm vocabulary ("Seed 0–5 mm", "Jumbo 65 mm+")
 ├── Cage Types     name + shape + mesh size (per brand, custom types allowed)
 ├── Events         per cage: stocked / worked / growth / pulled / filled / harvested / mortality / note
 └── HarvestLog     harvest entries off the barge (count, grade, lineage, date, pricePerOyster, revenue)
```

A batch carries a stable `seedCohortId` (stamped once at fill time, backfilled for legacy/demo farms)
so a seeding groups as one cohort even after growth logs rewrite its size. A harvest entry's
`origin.parentBatchIds` is its lineage back to the seed batches — that's what joins revenue and
days-to-market to a hatchery (see the cohort scorecard below).

Lines are stored flat in `farm.lines[]`; plots and areas are a spatial index layered over them
(`// LAYOUT §2 — additive spatial index over the now-flat f.lines`). A cage's lifecycle:
**Fill seed → grow (growth checks, work reminders) → Pull to barge → Work / Fill back onto lines →
Harvest off the barge.** Lineage travels with the batch the whole way.

## Storage

| Key | Store | What |
|-----|-------|------|
| `cageTrackerData` | localStorage | The whole farm state: `{ v:1, farms:[…], activeFarmId:"…" }`. **Keep this exact key** — back-compat with the index-3..6 builds. |
| `cageTrackerData:prev` | localStorage | Snapshot taken before the last Import (recovery). |
| `spatmapUsgsSite` | localStorage | Chosen USGS conditions gauge. |
| `spatmapSalinity` | localStorage | Manual salinity reading `{ppt, at}` (offline fallback). |
| `spatmapCondCache` | localStorage | Cached conditions / NWS point lookups. |
| photos | IndexedDB | Per-cage photos (large blobs kept out of localStorage). |

Schema version is `v:1`. Migrations run on load (`migrate` / `migrateFarm` / `migrateBatch` /
`migrateEvent`) so older saves and imported backups upgrade in place. New optional fields are
additive and back-compatible — e.g. `barge.splits[]` and `filled` events carrying `sizeMm` were
added without breaking older data (a count-only `filled` event is still ignored by growth math).
The v4 harvest-log fields are the same pattern: `migrateFarm` null-guards `pricePerOyster` and
`revenue` on every harvest entry, so logs that predate them read `null` (shown "—"), never a faked
number. `farm._seasonMult` is a derived cache (the fitted growth curve) and is never persisted.

## Durability (hardened in the 2026-06-17 audit)

- Asks the browser to **persist** storage on boot (resists eviction), not just on first photo.
- A failed write (quota / private mode) raises a **sticky banner** with an Export button — it does
  not fail silently while editing continues.
- **Import is non-destructive**: the incoming backup is migrated on a clone first, and the prior
  data is snapshot to `cageTrackerData:prev` before overwrite.
- A first-render crash shows a **recovery screen** (Export + Reload), not a blank page.
- State is **flushed on tab hide/close**.
- The panic paths (storage-full banner, boot-failure recovery) and the Data menu's lead button all
  call `exportDataWithPhotos`, so a backup taken under quota pressure inlines the IndexedDB photos as
  data URLs and doesn't silently drop them. Data-only export remains as the smaller secondary option.

The remaining risk is that data lives on one device. The full-fidelity backup file (with photos) is the
working answer today; cloud sync stays deferred for the reasons in [ROADMAP.md](ROADMAP.md).

## Conditions feed (USGS + NWS)

The conditions bar is driven by a single **USGS monitoring site** (`spatmapUsgsSite`). One USGS
Instantaneous-Values call (params 00010 temp / 00065 gage height / 00095 + 00480 salinity / wind),
`period=PT6H` so dead sensors drop out and the gage trend (rising/falling) derives from the series.
The left side is live water level + trend, temp (°C→°F), salinity, and the freshest reading's age.
The right side is the **NWS forecast** (the one thing USGS lacks), fetched from the chosen site's own
lat/lng. The site picker lists every active USGS salinity site per coastal state (RDB site service).
Manual salinity (`spatmapSalinity`) is the offline override when no gauge carries it. Both USGS
endpoints send `Access-Control-Allow-Origin: *`, so the calls work from a static page.

## Commercial features layered on the offline core (v3)

- **Dashboard** — `farmDashboard()` / `renderDashboardCard()`: $ on the water (per-grade pricing),
  oysters sale-ready, oysters/filled/empty, recent-activity feed. As of v4 the oysters total folds in
  tub/barge stock and shows a "+N in tub" chip, so pulling cages doesn't make the crop count drop.
- **Work queue** — `workQueueItems()` / `buildWorkQueue()`: overdue cages, tap to jump.
- **Harvest forecast** — `harvestForecast()` / `buildForecast()`: ready-now + month-by-month +
  grade inventory.
- **CSV export** — `exportStockCSV()` (every cage + est. $) and `exportHarvestCSV()` (now with
  $/oyster + Revenue columns), RFC-escaped through `csvCell` (formula-injection guard).
- **Tub batch-split** — `splitBarge(rows)` carves the counted remainder into named sub-batches;
  `fillFromBarge(cageIds, splitId)` fills from a split or the remainder and anchors each cage's
  growth curve to its batch size.

## v4 — commercial hardening (the honesty gates)

The v4 pass added revenue, a fitted growth curve, and three read-only analytics surfaces. The point
of each was to be honest about what the data can support; the gates below are the load-bearing part.

- **Revenue** — `harvestFromBarge(count, note, photoIds, realizedPrice)` stamps `pricePerOyster`
  (the harvest sheet's `$/oyster (sold)` override, else `priceForGrade`) and `revenue = count × price`.
  When the price is unknown both stay `null` and render "—". `buildHarvestLog` sums a revenue-to-date.
- **Survival scoping** — `farmLossStats(farm)` and `cageSurvival(cage)` only count mortality events
  whose `ev.batchId === cage.batch.id`. A cage restocked after a loss no longer carries the prior
  batch's deaths into the new batch's survival figure (the bug that fabricated low survival in the
  menu subtitle).
- **Fitted growth curve** — `fittedSeasonMult(farm)` derives the 12-month seasonal SHAPE from the
  farm's own growth checks: day-weighted mean mm/day per month, normalized to mean ~1.0 so only the
  shape moves and magnitude stays with the per-cage rate. Gates: a month needs `SEASON_FIT_MIN_N`
  (3) cage-intervals before it can override the default at all; below that it falls back to the
  hardcoded `SEASON_MULT`. Where it does override, it blends `α·fitted + (1−α)·default`,
  `α = min(1, n/8)`. Under `SEASON_FIT_MIN_INTERVALS` (6) total intervals the whole function returns
  `SEASON_MULT` untouched — a young farm grows on the default Gulf calendar exactly as before. The
  result is cached on `farm._seasonMult` (cleared in `commit()` so a new growth check refits) and
  read by `growthDayDelta` / `integrateGrowth` / `projectionCurve` from the one source, so the chart
  and the integrator can't disagree. `buildGrowthCalendarCard` renders fitted-vs-default for the farmer.
- **Mortality outliers** — `mortalityOutliers(farm)` builds one normalized loss rate per cage
  (count-based `lost/stocked` when known, else capped logged %), then flags a cage at
  `rate > median + 2·MAD` (median absolute deviation — robust, no library) AND `≥2` separate loss
  events. Honesty gate: returns nothing unless `≥6` cages have a loss event, so a tiny farm is never
  ranked. `mortalityWatchSet` memoizes the flagged ids (keyed on `commit.seq` / day) so `needsWork()`
  folds the watch list in at O(1) per tile; `buildMortalityWatch` is the card.
- **Conditions advisory** — `stockAdvisory()` reads this device's own conditions log (`condInsights`
  / `condDailyAgg`), buckets it into days, and raises a heat (`>28 °C` daily max) or low-salinity
  (`<10 ppt` daily min) advisory only when `≥ADVISORY_MIN_DAYS` (3) of the last `ADVISORY_WINDOW_DAYS`
  (6) logged days crossed — an N-of-M gate so one flaky reading can't trip it. Pure read, no fetch,
  no backend; returns `null` on too little history and is wrapped so a bad log can't break the dashboard.
- **Cohort scorecard** — `cohortStats(farm)` groups by hatchery / `seedCohortId`. Survival comes from
  standing stock (`cageSurvival`, count-scoped). Revenue and days-to-market come from the harvest log
  joined through `origin.parentBatchIds` to the seed batches' `stockedDate`. A harvest attributes to a
  source only when every linked batch it knows shares one hatchery; mixed-source or untraceable harvests
  go to an `unattributed` bucket (shown as "Unlinked harvests", never blamed on a hatchery). A cohort
  with no attributed harvest reads "in progress"; one below `MIN_COHORT_CAGES` (3) shows counts only,
  no ranking. `buildCohortScorecard` is the report, off the Stock-health menu.

## Touch + feel (v4)

- `buzz(pattern)` is the haptic helper: a `navigator.vibrate` call guarded by `prefers-reduced-motion`
  and wrapped in try/catch (a silent no-op on iOS Safari). Called on cage select, drag-select complete,
  and Fill / Pull / Work / Harvest commit.
- Work-view cages get transparent hit pads so the tap target clears the 44px (`--tap-min`) floor without
  growing the drawn glyph; `.lineBody` / `.cageStrip` gaps widened. Drag-select still works through them.
- HUD chrome was moved off the cages it describes: the split-batch origin pill docks on a surface chip
  by the tub HUD, `--mapwell` bottom pad lets the last line clear the hull, and the dashboard
  recent-activity feed gets its own stacking context so the plot canvas can't clip it.

## Dev workflow

```sh
# syntax-check the inline script before shipping:
node -e "const fs=require('fs');const h=fs.readFileSync('spatmap.html','utf8');\
require('vm').compileFunction([...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n'))"

# serve for phone testing:
python3 -m http.server   # then open spatmap.html
```

Console seeds for QA: `window.SpatMapDebug.loadBrightside()` (single farm), or inject
`docs/build-history/seed-multi-plot.js` then `window.seedMultiPlot()` for a 3-plot adjacency test.

## Future cloud sync (deferred, not built)

`supabase-setup.sql` is the Postgres schema + RLS for optional encrypted cloud backup. It's designed
so the app's record ids migrate untouched — text PKs, a version-counter cursor, soft-deletes — but
nothing in the app talks to it yet. v4 deliberately left it unbuilt (the offline full-fidelity backup
covers the durability need now); see the reasoning in [ROADMAP.md](ROADMAP.md). It's an asset on the
shelf, not active code.
