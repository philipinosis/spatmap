# SpatMap — Roadmap

The verdict from the 2026-06-17 architecture audit still stands: **evolve, not rewrite.** Offline-first
is a real edge; the v4 pass spent itself on accuracy, money, and trust rather than a backend. Full
reasoning in [build-history/v2-audit-architecture.md](build-history/v2-audit-architecture.md),
[build-history/v3-build-plan.md](build-history/v3-build-plan.md), and
[build-history/v4-commercial-hardening.md](build-history/v4-commercial-hardening.md).

## Shipped in v4 (commercial hardening)

Out of the backlog and into `spatmap.html`:

- **Search / jump-to-cage** — instant find, tap to jump.
- **Revenue tracking** — realized $/oyster + revenue per harvest, CSV columns, revenue-to-date.
- **Site-fitted growth curve** — the seasonal shape bends toward the farm's own growth checks, with a
  per-month confidence gate and a "Your growth calendar" transparency card.
- **Watch list** — cages losing faster than peers (MAD outliers), gated to farms with enough loss data.
- **Conditions advisory** — heat / low-salinity guidance from the device's own water log (N-of-M gate).
- **Seed source scorecard** — survival × time-to-market × revenue-per-cage by hatchery, with lineage
  attribution and an honest "unlinked harvests" bucket.
- **Full-fidelity backup** — Data menu and the panic/recovery exports keep cage photos.
- **Haptics, bigger tap targets, chrome that no longer overlaps cages** — boat-deck feel.

Mortality tracking shipped earlier in the v4 line (the survival loop that the watch list and scorecard
build on).

## Deliberately deferred / rejected (conscious decisions, not omissions)

The v4 pitch ran a wider list. These were looked at and left on purpose:

- **Cloud / Supabase sync backend.** Breaks the offline-first identity that is the actual edge; the
  nested-to-relational shred mapper is a multi-week build; willingness-to-pay is unproven. The offline
  full-fidelity backup file (with photos) covers the real durability need today. `supabase-setup.sql`
  stays on the shelf, designed to migrate record ids untouched if the case ever firms up.
- **Printable NSSP / FSMA traceability tags.** FSMA 204 enforcement moved to July 2028, and raw NSSP
  oysters are largely carved out, so there's no compliance urgency to build a standalone tag generator
  for now. The lineage to print one is already tracked when it's needed.
- **Harvest-timing $-window.** Would need a new grade→mm boundary capture, and the value overlaps the
  now-accurate growth curve plus the harvest forecast. Revisit later if it still earns its keep.
- **uid() device prefix · within-cage readiness spread · degree-day clock · bushel/weight count entry ·
  multi-device crew sync.** Either speculative or asking the data to say something it can't honestly
  support yet. Left for when the need is real, not built on a guess.

## Remaining backlog (small, offline-buildable)

From [build-history/notes-and-ideas.md](build-history/notes-and-ideas.md):

- Remembered fill defaults + steppers.
- Long-press to ADD to selection (drag-replace already shipped).
- Bulk-Work method-chip audit (don't silently log "tumbled").
- Gear catalog, onshore inventory.
- Gear types beyond FlipFarm (floating bags, multi-bag floats).

## Growth-model realism (domain follow-ups, not built)

From the midden review — would deepen projection accuracy:

- Lead with the GRADE bucket; mm is the anchor behind it (farmers think grades first).
- Allow split by volume/weight with a derived count (nobody counts individual oysters at sort).
- Curve realism: winter near-stall below ~10–12 °C, summer slowdown/mortality window, flattening near
  market size, ±15–25 % within-batch variance, a 10–30 % mortality haircut, and starting the growth
  anchor a few days behind the sort date (handling setback). The fitted season curve covers part of the
  winter/summer shape now; the variance band and handling setback are still open.

## When is the build "commercially viable"?

A farm owner opens it and sees: $ on the water, how many are sale-ready, what needs work today, what
each hatchery actually returns. They can act on any cage from where they see its data, export a record
for a buyer or auditor, and keep a full backup that survives a wiped phone. It never loses data, works
offline, 0 console errors, fast on a 3,000-cage farm. v4 closed the accuracy and money gaps; the
remaining backlog is polish, not the difference between usable and not.
