# SpatMap v2 — Build Plan

Target file: **`spatmap-v2.html`** (a copy of the live `spatmap.html`). The live
app and `index.html` redirect are NOT touched until the owner approves a swap.

Source-of-truth design doc: **`_v2-DESIGN-AUDIT.md`** (read it before any visual
work). Architecture facts below are confirmed against the real code.

## The one architectural fact that drives everything

SpatMap already ships a real pannable map. The overview is an **SVG canvas** with
a single transformed `#layoutWorld` group, pinch/pan, LOD tiers
(`farm` `k<0.6` → `plot` `k<1.6` → `area` `k≥1.6`), drill-in/back, history, and
per-cage cells drawn straight onto the canvas (`drawCageCells`, line ~4462). The
screenshot the owner shared is the *other* renderer: a vertical DOM flow of
`.lineRow` divs (`renderLine` ~2163, `renderCageCell` ~2192) with a
`position:fixed` barge.

**v2 is not a new map.** v2 cleans up the DOM work-view (Phase 1), then makes the
canvas the only surface by adding a 4th "work" zoom tier and retiring the DOM
work-view (Phase 2), so panning sideways flows straight into the adjacent plot
with no screen boundary.

## Key code anchors (in `spatmap-v2.html`, ≈ same lines as v1)

| Thing | Line | Notes |
|---|---|---|
| `:root` design tokens | ~18–110 | reuse; additions only |
| `.lineRow/.cageStrip/.cage/.clabel/.lineRope/.linePiling` CSS | ~277–353 | DOM work-view styles |
| `render()` main loop | ~2015 | view-mode router |
| `renderTopBar` | ~2075 | header (scoped + unscoped) |
| `renderStatStrip` | ~2126 | scope-aware totals |
| `renderLine` | ~2163 | DOM line row |
| `renderCageCell` | ~2192 | **prints `.clabel` = the clutter** |
| `renderBarge` | ~2312 | fixed HUD barge |
| `LOD_PLOT/LOD_AREA/ZOOM_MIN/MAX` | ~2769 | tier thresholds |
| `layoutTier()` | ~2778 | k→tier; **add `work` branch** |
| `scheduleApplyView` (tier-change redraw) | ~2792 | crossfade hook |
| `drawPlot` | ~4317 | plot card draw |
| `drawPlotRollup` | ~4375 | status roll-up bar (keep) |
| `drawCageCells` | ~4462 | **cells on canvas; add glyph-by-tier** |
| `drawArea` | ~4651 | area + line strokes |
| `drillIntoArea/doDrillSwap` | ~4823/4864 | zoom-to-area animation |
| `window.SpatMapDebug` | ~8662 | QA hooks: `loadBrightside`, `enterOverview`, `layoutZoomBy`, `layoutState` |

## QA / verification protocol (every work package)

1. Open `file:///Users/philipinosis/Desktop/spatmap/spatmap-v2.html` in Playwright
   (mobile viewport 390×844).
2. Seed data: run `window.SpatMapDebug.loadBrightside()` then
   `window.SpatMapDebug.render()`. This builds the "Brightside Oyster Co." farm
   (multiple lines, varied fresh/mid/old/empty/ready/needs-work cages).
3. **Console must be clean** — zero uncaught errors on load and after the action.
   A thrown error on load = automatic FAIL (the edit broke the JS).
4. Drive to the surface under test (work view, or canvas at a given zoom via
   `window.SpatMapDebug.layoutZoomBy(f)` / `enterOverview()`), screenshot to
   `_screenshots/v2/<wp>-<state>.png`, and check the WP's acceptance criteria.
5. Before each edit stage, `cp spatmap-v2.html _v2-backups/spatmap-v2.<wp>.bak`
   so any bad edit is recoverable.

For a **multi-plot** seed (needed for Phase 2 neighbor-sliver tests), see
`_v2-seed-multi.js` (WP7 creates it): builds the Brightside farm then splits its
lines across 2–3 plots with world coordinates so adjacent plots exist.

---

# PHASE 1 — Clean up the work view (ships independently, answers "clean up the page")

All Phase-1 edits are to the DOM work-view + shared tokens. Sequential (same file).

### WP1 — Kill the ambient per-cage labels  *(small)*
- **Do:** In `renderCageCell` (~2204) remove the `.clabel` span so cages no longer
  print `cage.label` under every cell. The `cage.label` data stays (used by sheets
  / aria); only the ambient render is removed.
- **Accept:** Work view shows NO repeating "2 2 2 2…" digit band under any line.
  Cages still render. Console clean.

### WP2 — Tens-ticks under each rope  *(small)*
- **Do:** In `renderLine`/`renderCageCell` path, draw one faint tick + number every
  10 cages (`10`,`20`,`30`) under the rope. Tokens: `--ink-3`, 9px (700), tick 1px
  `--hair-strong`. New CSS class `.tensTick`. This is the ONLY ambient numbering.
- **Accept:** Under a 30-cage line, exactly 3 marks (10/20/30); under a 9-cage line,
  none or just the position is implicit. Legible, not noisy.

### WP3 — Re-space rows; rope as spine; bold pilings  *(small)*
- **Do:** Add `--row-gap:20px`; apply between `.lineRow`s. Raise `.lineRope` to 4px,
  `opacity:1`, visually the clearest horizontal element. Simplify `.linePiling` to a
  bold post + cap (16px wide, full row height, `--piling`/`--piling-ring` fouling
  band); drop the mooring-ring detail. Drop the `.mapwell` ripple grid *behind line
  rows* (keep ripple only in open margins).
- **Accept:** Each line reads as a discrete band with air above/below; rope is the
  loudest horizontal line; pilings read as two firm bookends. Console clean.

### WP4 — Cage size / density / states  *(medium)*
- **Do:** Target 12–16 legible cages per row on 390px. Cell min-width 18px, target
  22–26px, height 28px, radius 3px. For lines longer than the legible count, let the
  `.cageStrip` scroll horizontally (overflow-x) rather than squashing — full glyphs
  stay legible. Thicken `.cellfill.rdy`/`.work` status insets 3→4px. Add empty-cage
  hairline outline: `--c-empty` fill, 0.8px `--hair-strong` stroke (empty-state
  texture, D8). Keep the FlipFarm `shapeSVG` glyph; bump its render size so spine+ribs
  read at the new cell size.
- **Accept:** On Brightside, fresh(green)/mid(copper)/old(rust)/empty cages are
  distinguishable; ready cages show a teal top edge, needs-work show red bottom edge +
  wrench; an all-empty line reads as an organized rack, not gray static. Console clean.

### WP5 — Header + stat strip  *(small)*
- **Do:** When scoped into a plot/area, the topbar H1 is the **plot name** (keep the
  existing `scopeBack` chip). Stat strip leads with colored **ready** + **needs-work**
  (status dots, `--teal`/`--c-work`), then quiet totals in one weight:
  `● 8 ready · ⚑ 3 work · 1.2k oysters · 32 filled · 8 empty`. Empty farm (nothing
  stocked) replaces the strip with one quiet line: "Nothing stocked yet — drag across
  a line to fill."
- **Accept:** Scoped header shows plot name; stat strip leads with ready/work in color;
  empty farm shows the CTA line. Console clean.

### WP6 — Re-dock the barge  *(small)*
- **Do:** Keep `position:fixed` barge but reserve a world/content margin so line ends
  never slide under it (generalize the `@768px` `padding-right` reservation to mobile).
  Move the caption pill ABOVE the hull. Add a soft radial "wake" shadow under the hull
  so it reads as floating in water, not pasted on glass. Keep the warm art + bob.
- **Accept:** Barge never overlaps a line's last cage or the caption; wake shadow
  present; bob intact. Console clean.

**Phase-1 exit:** owner-facing milestone — a clean, legible work view. Screenshot the
full work view (empty + populated line) for review.

---

# PHASE 2 — One seamless map (the headline ask: drag into the adjacent plot)

**Corrected architecture (verified live, supersedes earlier assumptions):**
- The **overview home** today is a DOM dashboard (`buildDashboard`, vertical plot cards),
  NOT a map. The **work view** is the Phase-1 DOM line flow. The **SVG canvas** with
  pan/pinch/zoom + LOD tiers lives only in the **layout editor** (`buildLayoutEditor`,
  view via `buildOverview = buildLayoutEditor(farm,'view')`).
- The 3-plot seed (`_v2-seed-multi.js`, already built) renders correctly on that canvas:
  plots tile left-to-right (North x=60 · East x=980 · South Reef x=1900, 880 wide, 40
  channel). **The seamless cross-plot pan already works there** — it is one pannable
  world. The only reason it is not seamless in normal use is that the home is the
  dashboard and "drilling" swaps to a DOM screen (`doDrillSwap` → `viewMode='work'`).
- So Phase 2 = promote the canvas (view mode) to the home, make "enter a plot" a CAMERA
  ZOOM (not a screen swap), make zoomed-in cages legible (work tier), add the HUD barge
  + chrome. Panning into the neighbor then comes for free.

Current anchors (post-Phase-1): `LOD_PLOT/LOD_AREA` ~2887, `layoutTier()` ~2896,
`scheduleApplyView` ~2910, `fitToContent` ~2961, `render()` ~2106 (overview branch →
`buildDashboard`), `buildLayoutEditor` ~4143, `drawPlot` ~4435, `drawCageCells` ~4580,
`drawArea` ~4769, `drillIntoArea` ~4941, `doDrillSwap` ~4982, `wireLayoutPointers`
~5302, `handleLayoutTap` ~5846, `CELL_MAX` ~4559, `window.SpatMapDebug` ~8780.

**QA seed for Phase 2:** `fetch('/_v2-seed-multi.js').then(r=>r.text()).then(t=>(0,eval)(t))`
then `window.seedMultiPlot()` (builds the 3-plot farm + fits). Confirm 3 plots, 15 lines.

### WP7 — Work zoom tier: legible cages on the canvas  *(medium, additive, low-risk)*
- **Do:** Add `LOD_WORK = 3.2` beside `LOD_PLOT`/`LOD_AREA`. Extend `layoutTier()` to a
  4th branch: `k<0.6 farm · <1.6 plot · <3.2 area · else work`. Extend `drawCageCells`
  so cage detail scales by tier: **farm**=none/density wash · **plot**=fixed-screen-radius
  status pip (~5px, no glyph) · **area**=small glyph · **work**=full FlipFarm glyph
  (`shapeSVG`) + status edges + the rope drawn as a 4px spine + tens-ticks every 10 cages,
  matching the Phase-1 DOM look (reuse the Phase-1 tokens/states). Counter-scale text by
  `LAYOUT.view.k` so labels stay legible at every zoom (handles already do this).
  Keep the `CELL_MAX 300` perf cap. Optional: per-detail-layer opacity crossfade on tier
  change (hook `scheduleApplyView`/`layoutRedraw`).
- **Accept:** With the multi-plot seed, zooming the canvas (layout/view) in past k=3.2
  shows legible 22–26px cage glyphs + rope + tens-ticks (the Phase-1 look on canvas);
  zooming out → small glyphs → pips → plot cards. Pan smooth; console clean.

### WP8a — Canvas becomes the home; drill = camera zoom  *(medium, the integration)*
- **Do:** Make the read-only canvas (`buildLayoutEditor(farm,'view')`) the overview home
  surface instead of `buildDashboard` (keep `buildDashboard` in code, unreferenced, as a
  fallback). Change "enter a plot/area": tapping a plot/area in VIEW mode animates a
  CAMERA zoom to that area framed at work tier (k≥3.2) and STAYS on the canvas — do NOT
  call `doDrillSwap`/`viewMode='work'`. Reuse `drillIntoArea`'s zoom animation but land
  on `fitToContent(farm, area)` tuned into the work band, then `layoutRedraw`. Barge
  becomes a HUD fixed over the canvas (reuse the Phase-1 barge, position:fixed, with a
  reserved world margin so content doesn't hide under it). Tapping a cage at work tier
  opens its existing action/peek (route through the existing `oysterPeek`/sheet).
- **Accept:** Home is the pannable map (plots tiled). Tapping a plot zooms the camera in
  to legible cages with NO screen swap; **dragging sideways pans straight into the
  adjacent plot — no back button, no flash** (the core requirement). Pinch/breadcrumb
  zooms back out to all plots. Barge floats as a HUD. Console clean; existing cage
  actions still reachable.

### WP8b — Canvas drag-select (stretch; preserve the signature fill workflow)  *(hard)*
- **Do:** On the canvas at area/work tier in view mode, a drag that STARTS on a cage
  hit-rect selects the range of cages it crosses (drag-from-water still pans — the
  disambiguation). On release, open the existing bulk action sheet for the selection.
  Reuse `selCages`/the bulk sheet from the DOM path. Show a selection band + count chip.
- **Accept:** Drag across cages selects a range and opens the bulk sheet; drag on water
  pans; the two never conflict. Console clean. (If too risky, defer and keep tap-to-act.)

### WP9 — Tiling polish: channels, neighbor slivers, breadcrumb, inertia  *(medium)*
- **Do:** Style the plot tiling: water channels between cards (the ripple grid lives in
  channels/open water, not under line rows), and when a plot is framed reserve ~8%
  viewport margin so a neighbor plot's edge + name **always peeks in**. Add a breadcrumb
  pill top-center ("Brightside › North Plot") that zooms out one tier on tap. Add pan
  inertia. Keep `drawPlotRollup` verbatim. First-run coachmark ("drag to the next plot →")
  via the existing `.lp-zoomhint` pill.
- **Accept:** Entering a plot shows a neighbor sliver at the margin; dragging toward it
  flows seamlessly into that plot; breadcrumb zooms out; pan has inertia; water reads as
  water. Console clean.

**Phase-2 exit:** the seamless one-map. Screenshots: all-plots tier, a plot zoomed to
work tier with a neighbor sliver, and a mid-pan frame crossing into the next plot.

---

## Guardrails for every subagent
- Edit ONLY `spatmap-v2.html` (and create `_v2-seed-multi.js` in WP7). Never touch
  `spatmap.html` / `index.html`.
- Make `old_string` edits unique; never leave the file with a JS syntax error.
- Reuse existing `:root` tokens; additions only where the design doc marks NEW.
- Match the surrounding code style (the `h()` hyperscript, the comment density).
- After your edit, verify per the QA protocol above and report pass/fail with the
  screenshot path and any console errors verbatim.
- Prose/UI copy: no AI tells (no hype words, no empty triads, no em-dash overuse).
