# Build history

Specs, design audits, and code reviews kept for reference. Not current docs — the live picture is the
top-level [README](../../README.md), [USER-GUIDE](../USER-GUIDE.md), [ARCHITECTURE](../ARCHITECTURE.md),
and [ROADMAP](../ROADMAP.md). Versions: **v7** = the live `index.html`; **v2/v3** = the rebuilt
`spatmap.html` line (v3 is current).

## v7 — ground-up rebuild (the live `index.html`)
- `v7-product-brief.md` — what it's for, who uses it.
- `v7-build-spec.md` / `v7-design.md` — the spec and design system.
- `v7-layout-editor-spec.md` — the farm-layout editor.
- `v7-harvest-kit.md` — harvest workflow design.
- `v7-build-log.md` / `v7-code-review.md` — build record and review.

## v2 — seamless pannable map + durability audit
- `v2-build-plan.md` / `v2-build-log.md` / `v2-design-audit.md` — the v2 build.
- `v2-audit-synthesis.md` — **start here for v2**: synthesis of the four-agent audit + fix backlog.
- `v2-audit-correctness.md` — correctness / reliability (code-reviewer).
- `v2-audit-resources.md` — performance / memory / robustness (javascript-pro).
- `v2-audit-architecture.md` — architecture + commercial-readiness (architect-review).

## v3 — commercial features (current `spatmap.html`)
- `v3-build-plan.md` — **the v3 record**: dashboard, action bar, CSV, work queue, forecast, USGS
  conditions rewrite, tub batch-split, owner fixes. What shipped, what's deferred.
- `v3-oceanfarmr-features.md` — competitor feature research.
- `v3-ux-critique.md` — UX critique driving the v3 work.

## Notes & assets
- `farmer-notes.md` — early farmer interview notes.
- `notes-and-ideas.md` — the feature backlog (also surfaced in [ROADMAP](../ROADMAP.md)).
- `seed-multi-plot.js` — QA seed: `window.seedMultiPlot()` builds a 3-plot farm for adjacency tests.
- `assets/` — design mockups (barge / tub SVGs) and the integration snippets used to build the art.
