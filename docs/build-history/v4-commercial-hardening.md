# SpatMap v4 — commercial hardening

The v4 pass. Goal: take the offline tracker from "works" to "a farmer would run their business on it,"
without a backend and without a rewrite. 13 commits, all in `spatmap.html`. Built 2026-06-23.

The shape of the work: pitch a wide list of improvements, knock the weak ideas down hard, then build
only what survived in waves, and prove the whole loop still holds at the end.

## 1. Skeptical pitch fan-out (6 specialist lanes)

Rather than one list, the pass started by pitching improvements from six angles in parallel, each one
adversarial about the others' blind spots:

1. **Trust / feel** — where does the app quietly lie or feel clumsy on a wet boat deck?
2. **Accuracy** — where do the numbers disagree with each other or with reality?
3. **Money** — what does a farmer need to run this as a business that isn't here?
4. **Aesthetics** — where does chrome fight the map, where are the tap targets too small?
5. **Latent value** — what can we compute from data already collected, for free?
6. **Scope discipline** — which pitched features are speculative, unbuildable honestly, or a multi-week
   backend in disguise?

## 2. Critique → cut

Lane 6 did most of the cutting. Several headline-sounding ideas were rejected on purpose (recorded in
[ROADMAP.md](../ROADMAP.md) as conscious decisions, not omissions):

- **Cloud / Supabase sync** — breaks offline-first identity, multi-week shred mapper, unproven
  willingness-to-pay. The offline full-fidelity backup covers the real durability need.
- **Printable NSSP / FSMA tags** — FSMA 204 enforcement moved to July 2028, raw oysters largely carved
  out. No compliance urgency.
- **Harvest-timing $-window** — needs new grade→mm capture, value overlaps the now-accurate growth curve.
- **uid() device prefix, within-cage readiness spread, degree-day clock, weight/bushel entry, crew sync**
  — speculative or the data can't honestly support it yet.

What survived split into four build waves.

## 3. Four build waves

**Wave 1 — trust & feel**
- Scope standing-survival to each cage's CURRENT batch id (`farmLossStats` / `cageSurvival`). A cage
  restocked after a loss no longer drags the old batch's deaths into the new batch's survival — this was
  fabricating low survival in the menu subtitle.
- Timeline detail labels a mortality count "lost", not "oysters".
- `farmDashboard` folds tub/barge stock into the oysters total with a "+N in tub" chip
  (`renderDashboardCard`); pulling to the tub no longer makes the crop count silently drop.
- Panic/recovery exports (`showSaveError` banner, boot-failure recovery) call `exportDataWithPhotos`;
  the Data menu leads with "Full backup (with photos)".
- `buzz()` haptic confirmation (reduced-motion-guarded `navigator.vibrate`) on select, drag-select
  complete, and Fill / Pull / Work / Harvest commit.
- `renderStatStrip` quiet totals collapse to one inline run — no orphan-wrap at 390px.

**Wave 2 — accuracy & money**
- `harvestFromBarge` stamps `pricePerOyster` (grade price, or a per-sale override in the harvest sheet)
  and `revenue`. `migrateFarm` null-guards both. `exportHarvestCSV` gains $/oyster + Revenue columns
  (through the `csvCell` injection guard). `buildHarvestLog` shows per-entry $ + revenue-to-date.
  Unknown price shows "—", never a fake number.
- `fittedSeasonMult(farm)` derives the seasonal growth shape from the farm's own growth checks
  (day-weighted mm/day per month, normalized to mean ~1.0 so only shape moves, not magnitude), with a
  per-month confidence gate (n≥3 to override, blend α=min(1,n/8) toward `SEASON_MULT`, global <6-interval
  fallback to the default). Threaded through `growthDayDelta` / `integrateGrowth` / `projectionCurve`,
  cached on `farm._seasonMult` and cleared in `commit()`, so chart and integrator read one source. A
  "Your growth calendar" card shows fitted-vs-default. A farm with too few checks behaves exactly as before.

**Wave 3 — fit & finish**
- Bigger tap targets: transparent hit pads raise work-view cages to ≥44px without changing the glyph;
  `.lineBody` / `.cageStrip` gaps widened. Drag-select verified intact.
- Chrome stops overlapping cages: the split-batch origin pill docks on a surface chip by the tub HUD,
  `--mapwell` bottom pad raised so the last line clears the hull, the dashboard recent-activity feed gets
  its own stacking context so the plot canvas can't clip it.
- Harvest hero (`HARVEST_HERO_SVG`) legibility: side shuckers' knives/shells enlarged, center figure
  seated behind the pile so it reads as shuckers around a tub, not bathing. `#oysterPile` + `applyPileLevel`
  unchanged. The clawfoot tub is intentional (owner's request) and stays.

**Wave 4 — latent value (analytics from data already collected)**
- `mortalityOutliers(farm)`: flags cages losing faster than peers (farm median + 2·MAD, ≥2 loss events),
  gated to farms with ≥6 loss cages, surfaced as a "Watch list" card and folded into `needsWork()`.
  Guidance copy, never "failing."
- `stockAdvisory()`: heat (>28 °C) / low-salinity (<10 ppt) advisory when ≥3 of the last 6 logged days
  cross the threshold (via `condInsights` / the on-device conditions log); tappable to the harvest
  forecast when sale-ready stock exists. No backend.
- `cohortStats(farm)` + `buildCohortScorecard()`: survival × time-to-market × revenue-per-cage by
  hatchery/seed cohort (revenue from Wave 2, days-to-market from the harvest entry joined to seed
  `stockedDate` via `origin.parentBatchIds`). Un-harvested cohorts read "in progress"; unlinked or
  mixed-source harvests are quarantined, never blamed on a hatchery. Lives off the Stock-health menu,
  not the daily loop.

## 4. Integration QA

After the waves landed, ran the full thing as one piece, not feature by feature:

- **Full daily loop** walked end to end — seed → grow → pull to barge → split → fill back → work →
  harvest off — with revenue, the fitted curve, the watch list, the advisory, and the scorecard all live.
- **Conservation invariant held**: oysters pulled to the tub stay counted (the "+N in tub" total), and a
  harvest off the barge doesn't double-count against still-stocked source cages.
- **0 console errors** through the walk.

The honesty gates were the whole point and got checked specifically: survival scoping, the
`fittedSeasonMult` confidence blend (a thin farm still gets the default curve), the MAD outlier
population gate, the advisory N-of-M gate, and the cohort lineage attribution with its unlinked-harvest
quarantine. Every one degrades to "say nothing" rather than "say something false" when the data is thin.
