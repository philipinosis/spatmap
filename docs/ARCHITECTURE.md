# SpatMap — Architecture

For whoever maintains the app next (including future-you). The app is one file, `spatmap.html`:
all HTML, CSS, and JS inline. No framework, no build step, vanilla ES5-ish JS (~441 functions,
~9,300 lines of inline script). State lives in the browser. It runs from `file://`, a static host,
or offline once loaded.

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
 ├── Events         per cage: stocked / worked / growth / pulled / filled / harvested / note
 └── HarvestLog     harvest entries off the barge (count, grade, lineage, date)
```

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

## Durability (hardened in the 2026-06-17 audit)

- Asks the browser to **persist** storage on boot (resists eviction), not just on first photo.
- A failed write (quota / private mode) raises a **sticky banner** with an Export button — it does
  not fail silently while editing continues.
- **Import is non-destructive**: the incoming backup is migrated on a clone first, and the prior
  data is snapshot to `cageTrackerData:prev` before overwrite.
- A first-render crash shows a **recovery screen** (Export + Reload), not a blank page.
- State is **flushed on tab hide/close**.

The remaining risk is that data lives on one device. The roadmap (cloud backup, crew sync) addresses
it; see [ROADMAP.md](ROADMAP.md).

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
  oysters sale-ready, oysters/filled/empty, recent-activity feed.
- **Work queue** — `workQueueItems()` / `buildWorkQueue()`: overdue cages, tap to jump.
- **Harvest forecast** — `harvestForecast()` / `buildForecast()`: ready-now + month-by-month +
  grade inventory.
- **CSV export** — `exportStockCSV()` (every cage + est. $) and `exportHarvestCSV()`, RFC-escaped.
- **Tub batch-split** — `splitBarge(rows)` carves the counted remainder into named sub-batches;
  `fillFromBarge(cageIds, splitId)` fills from a split or the remainder and anchors each cage's
  growth curve to its batch size.

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

## Future cloud sync (not built)

`supabase-setup.sql` is the Postgres schema + RLS for optional encrypted cloud backup. It's designed
so the app's record ids migrate untouched — text PKs, a version-counter cursor, soft-deletes — but
nothing in the app talks to it yet. It's the asset behind the commercial roadmap, not active code.
