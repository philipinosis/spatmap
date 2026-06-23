# SpatMap v3 — user audit + v4 plan (2026-06-23)

A fresh audit of the canonical app (`spatmap.html`, v3) before bumping to v4. Two tracks:

1. **Dogfooding** — drove the real app on a 390×844 phone viewport via Playwright across new-user
   onboarding, farm creation, the daily loop, the tub/harvest + batch-split sheets, conditions, and
   edge cases. 0 console errors throughout.
2. **Three specialist code audits** (read-only, parallel): `code-reviewer` (correctness/security),
   `javascript-pro` (runtime/async/touch), `midden` (oyster-domain realism). Every finding below was
   then **re-verified against the source** — two "critical" claims were downgraded as overstated.

## What's solid (don't touch)
- First-run onboarding is good: a clean setup form (name, lines/cages, cage types, grades, market
  size, neglect days) + "Load Brightside demo". New-farm creation works end to end.
- XSS surface is clean — all user strings reach the DOM via `createTextNode`; no `innerHTML` from
  user data. (code-reviewer confirmed.)
- Durability hardening (persist-on-boot, sticky quota banner, non-destructive import dry-run,
  `:prev` recovery, flush-on-hide) is real and correct.
- Performance is fine — full overview render ~1.9 ms on 3,052 cages; aggregations sub-ms.
- The daily-loop shape (drag-select → fill/pull/work/remove → tub → split → harvest) is the right
  model; lineage tracking and honest confidence copy are genuinely good.

## Verification note (don't trust audits blindly)
- **REFUTED — javascript-pro C1 "drag-select dies after a re-render" (stale `cells` NodeList).**
  `denseRangeSelect(strip,line)` is re-invoked fresh per strip on every render (L2808), so `cells`
  is re-queried each render; it can't go stale mid-use (no commit fires mid-drag). The owner-fixes2
  pass already made drag-select correct, and the session had 0 errors. **Not fixing.**
- Everything listed under "Confirmed" below was checked against the code.

---

## Findings

### Ship in v4 — confirmed, contained, no product/biology judgment

| # | Sev | Source | Where | Issue → fix |
|---|-----|--------|-------|-------------|
| 1 | High (security) | code-reviewer | `csvCell` L7973 | CSV exports don't neutralize a leading `= + - @` → formula injection in a buyer's/inspector's spreadsheet. Prefix `'` on dangerous leads. |
| 2 | Medium (trust) | code-reviewer + midden | `farmDashboard` L2555 vs `harvestForecast` L2724 | Dashboard "N sale-ready" uses **measured** ready (`cageStatus`), forecast "Ready now" also counts **projected** ready → the headline disagrees with the sheet it opens. Align both to measured-only; projected cages fall into their month bucket. |
| 3 | Medium (robustness) | javascript-pro | `condRefresh` L4241 / `renderConditionsBar` L4464 | Conditions seq-guard (L4267) runs *after* the cache writes, and in-flight USGS/NWS fetches never abort on re-render → stale-overwrites + fetch pile-up on a flaky connection. Guard before writing; abort prior fetches. Drop unused param `00095`. |
| 4 | High (leak) | javascript-pro | `openPhotoViewer` L10144 | Re-opening the viewer without the prior `close()` leaks the decoded-JPEG object URL and leaves a capture-phase Escape handler bound. Tear down a live viewer on re-entry. |
| 5 | High (honesty) | code-reviewer | `restoreImportedPhotos` L10290 / `triggerImport` | Import commits state before photos restore; partial/failed restores leave dangling `photoIds` while the toast claims success. Report restored-vs-expected; don't claim success on a shortfall. |
| 6 | Medium (provenance) | code-reviewer | fill path L8357/L9301 | If an armed split was removed, Fill silently falls through to the unsorted remainder (wrong size/grade) with a success toast. When the armed split no longer resolves, toast "that batch is gone — pick again" and reopen, don't fill. |
| 7 | Low | code-reviewer | `exportHarvestCSV` L8020 | Sort comparator returns `NaN` on a bad `date` (harvestLog isn't run through `migrateEvent`) → jumbled order. Coerce `NaN`→0. |
| 8 | Low (ergonomics) | javascript-pro | `.rmph` L766 | Remove-photo ✕ is a 22 px target. Bump toward ~40 px. |

### Deferred — needs your call (product model / oyster biology)
These change how the app *models the farm*, or the growth biology, or the UX contract. Your memory
shows several were already flagged and deferred. Concrete proposals, but they're domain decisions:

- **D1 — Count never decreases (no mortality).** *(midden CRITICAL — the trust-killer.)* `workCages`
  never adjusts `batch.count`; `mortality`/`sort` events are downgraded to bare notes (L1988–1989).
  A cage stays at its stocked count after a summer kill, so "$ on the water" and "sale-ready"
  inherit fiction by month three. Proposal: add a loss/count-adjust entry to the Work sheet that
  decrements `batch.count`, logs a real `mortality` event, keeps it in lineage. **Biggest single
  trust win.** Touches the data model + Work UX → your decision.
- **D2 — Grade is frozen at fill, never derived from size.** Inventory-by-grade and per-grade pricing
  stay anchored to stocking day even as oysters grow into a higher grade. Proposal: show a live
  size-grade (mm bands you define) next to the stored sale grade; let a Work action re-grade.
- **D3 — Growth curve has no asymptote + winter stall too soft.** `integrateGrowth` (L9715) is linear
  (rate × season, no slowdown near market) → every market-date is optimistic exactly at the finish
  line where you make sell calls. Winter `SEASON_MULT` (~0.35 → 0.06 mm/day) keeps growing through
  January. Proposal: damp the rate as `size → marketSize`; push Dec–Feb toward a true stall; add a
  short flat window after tumble/desiccate. **Changes every projection — your sign-off on the curve
  shape.**
- **D4 — "Ready" is binary per whole cage (no within-cage spread).** Overstates sellable inventory
  the moment a cage crosses 76 mm. Proposal: treat readiness as a fraction (a spread around the
  estimate) so "2,000 ready" reads "~1,200 ready, 800 coming."
- **D5 — "$ on the water" = fictional count × flat price** (depends on D1/D2). At minimum relabel
  "stocked value" vs "sellable value" and net it down for shrink + ready-fraction.
- **D6 — Counts forced to exact integers.** Farmers count volume/weight. Proposal: let count be
  entered as bushels/totes × per-unit, store derived count flagged as estimated, carry the `~` into
  the dashboard.
- **D7 — Neglect clock is time-only (ignores fouling/season).** Proposal: log a fouling level on a
  Work check that shortens that cage's work interval.
- **D8 — Sorted splits can't be harvested directly** (code-reviewer #4): once the tub is fully
  sorted, splits are fill-only; no path to log selling a batch off the dock. Decide: add "Harvest
  this batch" to split chips, or document as fill-only.
- **D9 — pagehide flush gives false safety for open sheets** (javascript-pro C3): a phone-lock mid-
  form loses the un-applied edits because `save()` serializes committed `state` only. Mitigation
  (apply-open-sheet-on-hide) is non-trivial — flag for v-next.
- **Structural:** three independent "swallow next click" systems + overlapping tap-window timers
  interact only by timing luck; consolidating would retire a class of touch edge-cases.

---

## v4 plan
Ship findings 1–8 (above) into `spatmap.html`, bump the version string to **v4**, QA each via
`node --check` + a Playwright daily-loop smoke (0 console errors), re-measure render. Leave the live
`index.html` untouched. Open a follow-up for D1–D9 pending owner decisions — lead with **D1
(mortality)**, the single biggest trust win.
