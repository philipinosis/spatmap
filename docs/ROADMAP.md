# SpatMap — Roadmap

The verdict from the 2026-06-17 architecture audit: **evolve, not rewrite.** Offline-first is a real
edge; the gaps are durability, crew/multi-device, and regulatory harvest records. Full reasoning in
[build-history/v2-audit-architecture.md](build-history/v2-audit-architecture.md) and
[build-history/v3-build-plan.md](build-history/v3-build-plan.md).

## Sharpest path (highest value first)

1. **Optional encrypted cloud backup** against `supabase-setup.sql` — kills the one-device data risk
   and doubles as the account / business-model layer. The schema already exists; nothing's wired.
2. **NSSP harvest tag + time-to-temperature record**, generated from the lineage already tracked —
   the feature competitors (BlueTrace) charge for, and the regulatory hook that makes it sticky.
3. **Shared "farm device" / crew sync** — a real operation runs multiple phones.
4. **Gear types beyond FlipFarm** (floating bags, multi-bag floats); grading distribution + forward
   availability.

## Deferred (backend / out of scope for a single offline file)

Live multi-device sync, web dashboard, GPS lease tiles, push notifications, financing, public
lost-gear network, printable NSSP tags (a large standalone build).

## Feature backlog (small, offline-buildable)

From [build-history/notes-and-ideas.md](build-history/notes-and-ideas.md) and the v3 deferred list:

- Search / jump-to-cage.
- Remembered fill defaults + steppers.
- Long-press to ADD to selection (drag-replace already shipped).
- Bulk-Work method-chip audit (don't silently log "tumbled").
- Gear catalog, mortality tracking, onshore inventory, harvest tags.

## Growth-model realism (domain follow-ups, not built)

From the midden review — would deepen the projection accuracy:

- Lead with the GRADE bucket; mm is the anchor behind it (farmers think grades first).
- Allow split by volume/weight with a derived count (nobody counts individual oysters at sort).
- Curve realism: winter near-stall below ~10–12 °C, summer slowdown/mortality window, flattening near
  market size, ±15–25 % within-batch variance, a 10–30 % mortality haircut, and starting the growth
  anchor a few days behind the sort date (handling setback).

## When is the current build "commercially viable"?

A farm owner opens it and sees: $ on the water, how many are sale-ready, what needs work today. They
can act on any cage from where they see its data. They can export a record for a buyer or auditor. It
never loses data, works offline, 0 console errors, fast on a 3,000-cage farm. The daily loop
(fill/work/pull/harvest) beats a pin-and-form app. Most of this shipped in v3; durability and an
exportable backup close the rest.
