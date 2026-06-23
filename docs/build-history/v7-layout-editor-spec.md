# SpatMap — Farm Layout Editor: Authoritative Build Spec

**Status:** Build-ready. Synthesized 2026-06-15 from three Opus specialists (Data Model, UX/Visual, Tech) + the code audit, reconciled against the live `index.html` (3723 lines). All line references verified against the current file.

**Locked decisions (do not relitigate):** abstract schematic canvas (no tiles/lib/network); drop-&-resize areas (not freeform); hierarchy Farm → Plots → Areas → Lines → Cages; scope = layout page only, drill into an area to reach the existing daily-work map.

---

## 1. Summary + Design Principles

### What we are building
A new **zoomed-out Farm Layout editor** that lives on the existing "Farm Layout" page. The farmer designs spatial structure here: drops **plots** (separate leases), drops **areas** (rectangles) inside them, and auto-fills each area with **lines** (parallel rows) carrying **cages**. They then **drill into an area** to reach the unchanged daily-work map (drag-select, fill, work, pull, harvest). The editor is pure structure design; it never duplicates daily-work verbs.

### Design principles, SIMPLE first
1. **SIMPLE beats complete.** When two options both satisfy the locked decisions, ship the one with less code and fewer taps. When in doubt, cut. This rule wins every tie below.
2. **Lines stay flat; plots/areas are an additive index over them.** `farm.lines[]` remains the single source of truth for every daily-work flow. Plots/areas only *reference* lines by id. This bounds the change to ~6 functions instead of ~18.
3. **Two surfaces, never mixed.** Layout mode draws only SVG schematic nodes (zero `.cage` cells). Work mode is today's map. They share no gesture state and never render on the same DOM at the same time. `clearSelection()` runs on every mode/scope transition.
4. **One `render()` owns `#app`; one scope variable; no router.** We add one early branch (layout mode) and one line-loop filter (drill-in scope). The default path stays byte-for-byte identical to today.
5. **Inline SVG, vanilla pointer events, offline.** Same house style as `shapeSVG`/`pilingSVG`/`BARGE_*_SVG`. No `<canvas>` element, no mapping/drawing library, no tile fetch, no new runtime dep.
6. **Reuse v7 tokens and primitives.** Same paper/ripple background, same status colors via `cageStatus()`, same `h()`/`icon()`/`openSheet()`/`commit()`/`undoable()`. The new view must look and feel like a continuation of the work map, not a different app.
7. **Migration is additive and idempotent.** Existing flat farms (Brightside, 22+ lines) become one default plot + one default area holding every line. Nothing is lost; the work map looks identical until the user adds a second area.

### Conflicts resolved (decisively)
- **"CANVAS" = inline SVG, not the `<canvas>` element.** Decision 1's intent is a clean offline diagram. Inline SVG delivers that with real DOM nodes (free hit-testing, crisp vector text, a11y, reuse of existing SVG building). The Tech specialist is right; we adopt SVG. **Do not use `<canvas>`.**
- **Single global canvas with plot geometry (not per-plot tabs).** The Data-Model specialist proposed per-plot canvases (plots as tabs, no plot geometry) for simpler math. But the brief explicitly requires a **"whole-farm zoom-out view"** showing separate plots. We keep **one** canvas. We make the math tractable by the rule below.
- **Plots are axis-aligned, non-rotating containers WITH geometry; only areas rotate and hold lines.** Plots get `{x,y,w,h}` (no `rot`) — drawn as separate "islands of water" so the whole-farm view exists. Areas get `{x,y,w,h,rot}` and the line-fill params. This gives the whole-farm overview the brief wants while confining the hard rotated-resize math to one shape type (areas). Plot resize just rescales contained areas proportionally — simple.
- **Drill-in scope = one area at a time (default = whole farm).** Keeps the work map phone-sized and pixel-identical for today's single-area farms. No plot-level work view.
- **`viewScope` and `viewMode` are runtime-only** (not persisted). A reload returns to the whole-farm work map. Avoids persisting a scope that could point at a deleted area.

---

## 2. Final Data Model

All new fields are **additive**. `state.v` stays `1` forever (`loadState` forces it, L618). `STORAGE_KEY` stays `'cageTrackerData'` (L602). Photos stay in IndexedDB `spatmapPhotos`. `farm.lines[]` stays the authoritative line/cage store.

### Coordinate convention
One **fixed logical world** shared by all plots in a farm: a `1000 × 1000` unit box rendered into an inline `<svg>` whose pan/zoom lives on a single inner `<g id="layoutWorld">`. World units are abstract (device-independent). `screen = world * k + (tx,ty)`; `world = (screen − (tx,ty)) / k`. Geometry is stored in world units so it never needs re-layout across devices. Plot/area rects are stored top-left `(x,y)` + `(w,h)`; area rotation is `rot` degrees about the rect center, applied as an SVG `transform="rotate(rot cx cy)"` on the area `<g>`.

### PLOT — top-level, entirely-separate unit (a lease / patch of water)
Stored at `farm.plots[]`, ordered.
```
{
  id:    string (uid)        // join key
  name:  string              // e.g. "North Lease"
  order: int                 // == index in farm.plots[]; set by reindexPlots()
  x:     number              // top-left X, world units (whole-farm canvas)
  y:     number              // top-left Y
  w:     number              // width
  h:     number              // height
  areas: [ Area ]            // ordered; rectangles drawn inside this plot
}
```
Plots **do not rotate** (axis-aligned lease boxes — real leases are drawn axis-aligned; keeps it simple).

### AREA — a rectangle the user drops + sizes inside a plot
Stored at `plot.areas[]`, ordered.
```
{
  id:           string (uid)
  name:         string        // e.g. "A1"
  order:        int           // == index in plot.areas[]
  x, y, w, h:   number        // world-unit rect (top-left + size), in the SAME world as plots
  rot:          number        // degrees about rect center (0 default); ONLY areas rotate
  lineCount:    int           // rows of lines filling this area
  cagesPerLine: int           // cages per row at fill time
  spacing:      number        // 0..1 fraction of cross-axis used as gap (cosmetic)
  axis:         'h' | 'v'     // direction lines run (defaults to the rect's long axis)
  lineIds:      [ string ]    // DERIVED display order of farm.lines[] in this area
}
```
Area `x/y` are stored in the **same world coordinates** as plots (not plot-relative) so hit-testing and the whole-farm view need no nested transforms. On plot move/resize, contained areas are translated/rescaled in lockstep (see §3).

### LINE — gains two additive ref fields; everything else unchanged (built in `addLine` L1187)
```
{
  id, name, order, cages:[...],   // EXISTING, untouched
  plotId: string,                 // NEW — parent plot id (denormalized for O(1) reads)
  areaId: string                  // NEW — parent area id
}
```
`order` stays the **global flat index** owned by `reindexLines` (L1203). `cage.label = "<lineIdx+1>-<cageIdx+1>"` stays globally numbered — **do not change the labeling scheme** (harvest provenance and `bargeOriginText` L1474 depend on it). `area.lineIds[]` is **derived display order within an area**; `line.areaId` is the only writable truth. The two are reconciled by rebuilding `lineIds` from lines.

### Invariant (the one rule)
**Every line belongs to exactly one area.** Enforced in `addLine`, the bulk fill generator, and re-healed by the idempotent migration (orphans fall to the default area).

### Example JSON — a 2-plot farm
(ledger/barge/cages abbreviated; the daily-work shapes are unchanged from today)
```json
{
  "v": 1,
  "activeFarmId": "farm_1",
  "farms": [{
    "id": "farm_1",
    "name": "Brightside Oyster Co.",
    "createdAt": 1718000000000,
    "settings": { "marketSizeMm": 76, "neglectIntervalDays": 56 },
    "cageTypes": [{ "id": "ct_1", "name": "FlipFarm", "shape": "rect", "meshMm": 6 }],
    "grades": ["Petite", "Standard"],
    "batches": [],
    "harvestLog": [],
    "barge": { "state": "empty", "batchId": null, "count": null, "sizeMm": null, "grade": null, "origin": null, "events": [] },
    "plots": [
      {
        "id": "plot_north", "name": "North Lease", "order": 0,
        "x": 60, "y": 60, "w": 520, "h": 420,
        "areas": [
          { "id": "area_a1", "name": "A1", "order": 0,
            "x": 100, "y": 110, "w": 320, "h": 180, "rot": 0,
            "lineCount": 2, "cagesPerLine": 10, "spacing": 0.25, "axis": "h",
            "lineIds": ["line_1", "line_2"] },
          { "id": "area_a2", "name": "A2", "order": 1,
            "x": 110, "y": 320, "w": 260, "h": 120, "rot": 12,
            "lineCount": 1, "cagesPerLine": 12, "spacing": 0.2, "axis": "h",
            "lineIds": ["line_3"] }
        ]
      },
      {
        "id": "plot_south", "name": "South Lease", "order": 1,
        "x": 640, "y": 120, "w": 300, "h": 360,
        "areas": [
          { "id": "area_b1", "name": "B1", "order": 0,
            "x": 680, "y": 170, "w": 220, "h": 240, "rot": 0,
            "lineCount": 1, "cagesPerLine": 8, "spacing": 0.2, "axis": "h",
            "lineIds": ["line_4"] }
        ]
      }
    ],
    "lines": [
      { "id": "line_1", "name": "Line 1", "order": 0, "plotId": "plot_north", "areaId": "area_a1",
        "cages": [ { "id": "c1", "typeId": "ct_1", "label": "1-1", "batch": null, "events": [], "currentGrade": null, "workDue": null } ] },
      { "id": "line_2", "name": "Line 2", "order": 1, "plotId": "plot_north", "areaId": "area_a1", "cages": [] },
      { "id": "line_3", "name": "Line 3", "order": 2, "plotId": "plot_north", "areaId": "area_a2", "cages": [] },
      { "id": "line_4", "name": "Line 4", "order": 3, "plotId": "plot_south", "areaId": "area_b1", "cages": [] }
    ]
  }]
}
```

### Migration (full, idempotent, back-compatible)
Add **one** function `ensureSpatialIndex(f)` and call it from three places. The migration block goes **after** `migrateFarm`'s existing line-flatten + batch-ledger reconcile (the function body ends at **L728**, just before `freshBarge` at L730). It uses the **new namespace `f.plots[]`** — never `f.areas` (the legacy flattener `delete f.areas` at L689 runs first on every load and would eat anything stored there).

```js
// ensureSpatialIndex(f) — additive, idempotent spatial index over flat f.lines.
// Call from migrateFarm (after L728), createFarmFromModel, loadBrightsideFarm.
function ensureSpatialIndex(f){
  // 1. container
  if (!Array.isArray(f.plots)) f.plots = [];

  // 2. guarantee >=1 plot
  if (!f.plots.length){
    f.plots.push({ id:uid(), name:'My farm', order:0, x:60, y:60, w:880, h:680, areas:[] });
  }
  // normalize plots
  f.plots.forEach(function(p, pi){
    if (!p.id) p.id = uid();
    if (typeof p.name !== 'string') p.name = 'Plot ' + (pi+1);
    if (typeof p.x !== 'number') p.x = 60;
    if (typeof p.y !== 'number') p.y = 60;
    if (typeof p.w !== 'number' || p.w <= 0) p.w = 880;
    if (typeof p.h !== 'number' || p.h <= 0) p.h = 680;
    if (!Array.isArray(p.areas)) p.areas = [];
    // 3. guarantee >=1 area per plot
    if (!p.areas.length){
      p.areas.push({ id:uid(), name:'Area 1', order:0,
        x:p.x+40, y:p.y+40, w:Math.max(120,p.w-80), h:Math.max(100,p.h-80), rot:0,
        lineCount:0, cagesPerLine:10, spacing:0.2, axis:'h', lineIds:[] });
    }
    // normalize areas
    p.areas.forEach(function(a, ai){
      if (!a.id) a.id = uid();
      if (typeof a.name !== 'string') a.name = 'Area ' + (ai+1);
      if (typeof a.x !== 'number') a.x = p.x + 40;
      if (typeof a.y !== 'number') a.y = p.y + 40;
      if (typeof a.w !== 'number' || a.w <= 0) a.w = Math.max(120, p.w-80);
      if (typeof a.h !== 'number' || a.h <= 0) a.h = Math.max(100, p.h-80);
      if (typeof a.rot !== 'number') a.rot = 0;
      if (typeof a.lineCount !== 'number' || a.lineCount < 0) a.lineCount = 0;
      if (typeof a.cagesPerLine !== 'number' || a.cagesPerLine <= 0) a.cagesPerLine = 10;
      if (typeof a.spacing !== 'number') a.spacing = 0.2;
      if (a.axis !== 'h' && a.axis !== 'v') a.axis = 'h';
      if (!Array.isArray(a.lineIds)) a.lineIds = [];
    });
  });

  // 4. lookup sets
  var plotById = {}, areaById = {};
  f.plots.forEach(function(p){ plotById[p.id] = p; p.areas.forEach(function(a){ areaById[a.id] = { plot:p, area:a }; }); });
  var dPlot = f.plots[0], dArea = dPlot.areas[0];

  // 5. adopt flat lines: assign or rescue orphans (runs every load = self-healing)
  f.lines.forEach(function(l){
    var ok = l.plotId && l.areaId && plotById[l.plotId] && areaById[l.areaId] &&
             areaById[l.areaId].plot.id === l.plotId;
    if (!ok){ l.plotId = dPlot.id; l.areaId = dArea.id; }
  });

  // 6. rebuild area.lineIds from lines (lines are source of truth), in global order
  f.plots.forEach(function(p){ p.areas.forEach(function(a){ a.lineIds = []; }); });
  f.lines.forEach(function(l){ var e = areaById[l.areaId]; if (e) e.area.lineIds.push(l.id); });

  // 7. reindex plots + areas
  reindexPlots(f);
}

function reindexPlots(f){
  f.plots.forEach(function(p, pi){ p.order = pi; p.areas.forEach(function(a, ai){ a.order = ai; }); });
}
```

**Why this is safe for old backups:**
- `loadState` (L612) wraps everything in try/catch and never throws; a malformed `plots` field is rebuilt by the guards.
- Pre-plots backup (Brightside): steps 1–6 synthesize one plot + one area holding all 22+ flat lines. The work map is identical because `render()` still iterates `farm.lines`.
- Legacy `f.areas` backup: the L677–689 flattener runs first → flat `f.lines`; then `ensureSpatialIndex` adopts them. No collision (we never touch `f.areas`).
- Re-run on an already-migrated farm: every guard is "if invalid, set default"; valid data passes through; `lineIds` re-derives identically. Idempotent.

---

## 3. Render Technology + Pan/Zoom + Drag/Resize

### Technology: ONE inline `<svg>`
A single root `<svg>` fills the layout page below the topbar (`width/height:100%`, `touch-action:none`). One inner `<g id="layoutWorld">` carries pan+zoom. Plots, areas, lines (as strokes), handles, labels, and snap guides are all real SVG nodes. Add a tiny namespaced builder mirroring `h()`:

```js
var SVGNS = 'http://www.w3.org/2000/svg';
function s(tag, attrs, kids){              // SVG sibling of h()
  var el = document.createElementNS(SVGNS, tag);
  if (attrs) for (var a in attrs){ if (attrs[a]!=null && attrs[a]!==false) el.setAttribute(a, attrs[a]); }
  if (kids) appendKids(el, [].concat(kids));   // appendKids already handles nodeType + arrays
  return el;
}
```
Event handlers attach via `el.addEventListener` (not the `on*` attr path). Reasons SVG over `<canvas>`: free hit-testing (`e.target` is the grabbed node), crisp vector text at any zoom (no devicePixelRatio bookkeeping), real a11y nodes, and direct reuse of existing SVG/CSS/pointer idioms. Node count stays in the tens-to-low-hundreds (layout altitude never draws per-cage glyphs), squarely in SVG's comfort zone.

### Transform math
State: `var view = { k:1, tx:0, ty:0 };` Apply once per `requestAnimationFrame`:
```js
function applyView(){ world.setAttribute('transform',
  'translate(' + view.tx.toFixed(2) + ' ' + view.ty.toFixed(2) + ') scale(' + view.k.toFixed(4) + ')'); }
```
Conversions (cache `svg.getBoundingClientRect()` at gesture start; refresh on resize):
```js
function toWorld(sx, sy){ return { x:(sx - view.tx)/view.k, y:(sy - view.ty)/view.k }; }
function toScreen(wx, wy){ return { x:wx*view.k + view.tx, y:wy*view.k + view.ty }; }
// sx = e.clientX - svgRect.left;  sy = e.clientY - svgRect.top;
```
All move/resize/rotate math runs in **world space** (zoom-independent).

**Pan** (1 pointer on empty canvas): `view.tx += dx; view.ty += dy;` then `applyView()`.

**Pinch-zoom** (2 pointers, tracked in a `Map` by `pointerId`): on the 2nd `pointerdown` record `startMid` (screen midpoint), `startDist`, `startK`. On move: `var nk = clamp(startK * dist/startDist, 0.2, 8);` keep the world point under the centroid fixed:
```js
var wf = toWorld(mid.x, mid.y);          // using CURRENT view
view.k = nk;
view.tx = mid.x - wf.x * nk;
view.ty = mid.y - wf.y * nk;
```
**No-pinch fallback:** a bottom-left `+ / − / fit` cluster (three 48px buttons) steps `k` by ×1.3 about the viewport center. **Double-tap empty** = fit-all. **Double-tap a shape** = fit that shape.

**Fit-to-content** (on mount + Fit button): compute bounding box `B` of all plot rects, margin `m`; `k = clamp(min(vpW/(B.w+2m), vpH/(B.h+2m)), MIN, MAX)`; center: `tx = (vpW − B.w*k)/2 − B.x*k`, `ty = (vpH − B.h*k)/2 − B.y*k`. Run in `rAF` after first paint so `svgRect` is measured. Empty farm → `k=1` centered.

### Pointer-event flow (the single source of intent, decided on `pointerdown`)
One delegated handler set (`pointerdown/move/up/cancel`) on the `<svg>` root, mirroring `denseRangeSelect` (L2147): `setPointerCapture`, a ~4px moved-threshold to split tap from drag, `suppressNextClick()` (L2246) so a drag's synthetic click can't fire a tap.

Intent priority on `pointerdown` (convert pointer to world first):
1. **2 pointers active** → `pinch`.
2. `e.target` carries `data-handle` (`nw|ne|se|sw|n|e|s|w` or `rot`) → `resize` / `rotate` that shape. (Handles are 44px-hit transparent circles/capsules with a small visible dot.)
3. `e.target` inside a shape body (`data-area-id`, else `data-plot-id`; **areas before plots, innermost wins**) → `select + move`.
4. Else → `pan`.

Gesture state: `var ed = { mode, plotId, areaId, handle, startWorld, startRect, startView, startSx, startSy, moved };`

**Move:** `dW = toWorld(pt) − startWorld;` set `shape.x = snap(startRect.x + dW.x)`, `shape.y = snap(startRect.y + dW.y)`. Areas clamp inside parent plot bounds; plots move freely. **Moving a plot translates its areas by the same `dW`** (loop `plot.areas`).

**Resize (areas, rotated-aware):** work in the area's local un-rotated frame. `local = rotate(toWorld(pt) − center, −rot)`. The dragged corner moves to `local`; the **opposite corner is the fixed anchor**. `newW = |local.x − anchor.x|`, `newH = |local.y − anchor.y|` (clamp ≥ one line spacing so handles never collide). New center = `rotate(midpoint(anchor, local), +rot)` about the old center; recompute top-left `x/y` from center, w, h, rot. Edge handles resize one axis. A live size badge (`'6 lines · 48 m'`) floats below during drag. Resizing rescales the row layout; it does **not** change `lineCount` (that's the stepper). **Plot resize** rescales contained areas proportionally (scale each area's offset + size by `newW/oldW`, `newH/oldH`).

**Rotate (areas only):** `rot = atan2(curWorld.y − center.y, curWorld.x − center.x) − startKnobAngle`, snapped to nearest 15° within 5° tolerance, hard-snap to 0/90/180/270. Store as **degrees** (documented; matches the SVG `rotate()` transform). An `NS / EW` chip + faint guide line shows orientation.

**Snapping:** while moving/resizing, draw 1px dashed `--ok` guides when a shape edge/center aligns to a sibling's edge/center or the parent plot's inset edges (within ~6px screen → `6/k` world). Compare against siblings + parent only (cheap). A faint `<pattern>` grid shows only during drag.

**Commit discipline:** on `pointerup` after a real move/resize/rotate, snap-finalize then `commit()` + `undoable(...)` as ONE action (mirror `addLine` L1192). During the gesture, mutate only the affected node's attributes (and `world`'s transform for pan/zoom) — never rebuild the scene mid-gesture. Rebuild SVG children only on structural edits (drop / resize-end / fill) or an LOD-band crossing, throttled to gesture end via the existing `rAF` pattern.

---

## 4. UI / Interaction Spec

### Two modes, reached only by explicit transition
- **LAYOUT mode** (`viewMode === 'layout'`): the new full-page SVG editor. Designs plots/areas/lines. No `.cage` cells exist, so `denseRangeSelect` never wires and `selCages` is never touched.
- **WORK mode** (`viewMode === 'work'`, the default): today's `#mapwell` map, optionally scoped to one area via `viewScope`. Untouched daily-work flows.

Entering layout mode calls `clearSelection()`. Drilling into an area (entering a work scope) calls `clearSelection()`. The two gesture systems share no state and never run on the same DOM simultaneously.

### Entry
`buildMenu`'s "Farm Layout" item (L1882) changes from `openSheet(buildFarmLayout)` to:
```js
function(){ closeSheet(); clearSelection(); viewMode='layout'; viewScope=null; render(); }
```
`render()` (after the no-farms early return, L1055–1059) gains one branch:
```js
if (viewMode === 'layout'){ app.appendChild(buildLayoutEditor(getFarm())); return; }
```

### The layout page chrome
- **Top bar (layout):** back chevron `‹ Map` (left) → `viewMode='work'; viewScope=null; render()`; farm name (center); a **gear** button (right) → `openSheet(buildFarmSettingsSheet)` which hosts the OLD form's cage-types / grades / market-size / neglect-interval editing (nothing lost). All buttons ≥48px.
- **Canvas:** the SVG, on the v7 paper-ripple background.
- **Persistent bottom controls:** `+ Add plot` pill (teal, ≥48px, full-ish width); a `+/−/fit` zoom cluster bottom-left (three 48px buttons).

### Whole-farm zoom-out view
On open, auto-fit-all so every plot is visible as a separate card. Pan = one-finger drag on empty canvas; pinch = two fingers; double-tap empty = fit-all; double-tap a shape = fit that shape.

**Zoom tiers (semantic disclosure):**
- **FARM tier (`k < 0.6`):** plots as labeled cards with a status roll-up bar; areas as ghost rounded rects (no rows). Reads like a marina chart of separate berths.
- **PLOT tier (`0.6 ≤ k < 1.6`):** areas show their parallel-line rows as thin strokes + a line-count badge.
- **AREA tier (`k ≥ 1.6`):** rows thicker; per-line cage tallies show; the focused area gets an `Open ›` hint chip. No per-cage glyphs ever draw on the layout canvas.

### Selection (single-selection only — no multi-select here)
Tap a plot's chrome (border/label) → select the plot. Tap inside it onto an area → select the area (innermost wins). Selection shows resize handles (+ a rotate handle on areas) and a bottom-docked **action bar**. Tap empty canvas → deselect.

### Add a plot
Tap `+ Add plot` → a new plot rect drops at the viewport center at a default world size, pre-selected, with an inline rename field focused. Toast `Plot added` + undo. A plot is a free axis-aligned rectangle; it is **not** line-filled (it is the lease container).

### Add / drop an area
With a plot selected (or tapping inside one), the action bar shows `+ Add area`. An area rect drops centered inside that plot, snapped within bounds, pre-selected. It **immediately auto-fills with default lines** (`lineCount: 4`) so structure is visible instantly. (Decision 2: drop & resize, not freeform.)

### Move / resize / rotate
- **Move:** drag the shape body. Areas clamp inside the parent plot; plots move freely (and carry their areas).
- **Resize:** drag the 4 corner handles (or 4 edge handles for one axis). Live size badge during drag. Resizing an area rescales rows + spacing; it does not change `lineCount`.
- **Rotate (areas only):** drag the rotate handle ~28px above the top edge; snaps to 15°/orthogonal; `NS/EW` chip updates. Plots never rotate.

### Set lines / cages / spacing / orientation (the area's substance)
Selecting an area → action bar `Edit area` → a compact bottom **sheet** (`openSheet`) with:
- **Area name** (text)
- **Lines** (stepper, `inputmode="numeric"`)
- **Cages per line** (stepper)
- **Spacing** (segmented: tight / normal / wide → stored as `area.spacing`)
- **Orientation** (NS / EW / custom-from-rotate, mirrors `area.rot`)
- **Open this area ›** (drill-in)

Changing **Lines/Cages** here is the **authoritative bulk path**: it routes through `createLinesForArea(farm, area, lineCount, cagesPerLine)` which loops `newCage` (L1199) and builds line objects identical to `addLine`'s shape (L1187), stamps `line.plotId/areaId`, pushes into `area.lineIds`, calls `reindexLines`, and wraps the whole change in one `commit()` + `undoable`. **Reducing line count removes the highest-index *empty* lines first; if a removal would drop a *filled* line, block + toast** `Line has stock — empty it first.`

### Rename / delete
- **Rename:** inline on the canvas (tap label = editable field) and in the Edit-area sheet. Same for plots. Names are cosmetic (`plot.name` / `area.name`).
- **Delete:** action-bar `Remove` (danger). Removing an empty area/plot is immediate + undoable. Removing one with stocked lines opens a confirm sheet that lists what will be detached and offers **Move lines to default area** instead of destroying. **Lines/cages/batches are NEVER deleted by a layout delete** — only the spatial grouping is removed; orphaned lines fall to the farm's default area (re-healed by `ensureSpatialIndex` on next load, so safety holds even across reload).

### Drill in (layout → daily-work map)
From the area action bar or the Edit-area sheet, `Open this area ›`:
```js
viewScope = { plotId: area.plotId, areaId: area.id };
viewMode  = 'work';
clearSelection();
closeSheet();                       // if open
history.pushState({ scope: viewScope }, '');
render();
```
`render()`'s line loop (L1069) filters to that area's lines, so the **exact existing** `renderLine`/`renderCageCell`/`.cageStrip` DOM draws for just those lines — `denseRangeSelect` rewires automatically; `selCages`/popup/fill/work/pull/harvest all work unchanged on the same cage objects.

### Back behavior (work scope → whole farm / layout)
- **Topbar back chip** (shown when `viewScope` set): `‹ North Lease · A1` → `viewScope=null; clearSelection(); render();`.
- **Phone/browser Back:** one `popstate` listener; any popstate while scoped exits to whole-farm (Back = zoom out). No-op when `viewScope` is null. Only the area drill-in pushes state; sheets do not (they use their own Escape/backdrop close, L3685–3692), so there's no conflict.

```js
window.addEventListener('popstate', function(){
  if (viewScope){ viewScope = null; clearSelection(); render(); }
});
```

### Coexistence guarantee (the critical seam)
On the layout canvas no `.cage` cells render, so the cage drag-select handlers physically cannot fire (`cellAt`/`elementFromPoint` have nothing to hit). The layout SVG owns its own pointer handlers, scoped to layout shapes, that never read/write `selCages`. Entering layout mode and every scope change call `clearSelection()`. The only shared verb is "tap empty space deselects," intuitive in both.

---

## 5. Visual Spec

Warm v7 nautical-chart aesthetic, all inline SVG, no images/tiles. Reuse existing tokens exactly (see live values: `--paper #EAF1F2`, `--paper-2 #DCE7E9`, `--surface #FFF`, `--surface-sink #F3F7F7`, `--hair #CBD9DB`, `--hair-strong #9DB3B6`, `--ink-2 #3D5A60`, `--ink-3 #6E878C`, `--teal #0E7C8B`, `--teal-press #0A616E`, `--teal-tint #DDEFF1`, `--water-ripple #B7CBCE`, `--rope #B98A4E`, `--rope-shadow #8A6334`, `--rope-hi #D8B988`, status `--c-empty #C3D2D4 / --c-fresh #2E9E5B / --c-mid #C97A1E / --c-old #B4471F / --c-ready #0E7C8B / --c-work #C8341E`, `--ok #2E9E5B`, `--toast-bg #0C2A30`, `--radius-sm 11px`, `--shadow-card`, `--shadow-pop`, `--ease`, `--font-num`).

### Canvas background
Identical paper feel to `.mapwell`: `--paper-2` fill with the two `repeating-linear-gradient` ripple lines (`--water-ripple`), so the layout page reads as "same water, zoomed out." A faint compass-rose glyph (inline SVG, `--hair-strong`, ~64px, low opacity, fixed N-up) bottom-right.

### Plot — must read as visually SEPARATE
- Rounded rect (`--radius-sm` scaled by `k`), fill `--surface` ~92%, 2px `--hair-strong` border, soft drop shadow (SVG `feDropShadow` or a stroked under-rect echoing `--shadow-card`) so each plot floats as its own "island of water." Separation reads through: generous open-water gutter between plots, the card shadow, and a distinct corner label tab.
- **Selected plot:** 2.5px `--teal` border + faint `--teal-tint` inner wash.
- **Label:** a pill tab clipped to the top-left corner — `.eyebrow` type (700/12/uppercase/`--ink-2`) with plot name; `--ink-3` sub `N areas · N lines`. Dominant element at FARM tier.
- **Status roll-up bar** along the plot's bottom edge: proportional segments by `cageStatus()` (`--c-fresh/--c-mid/--c-old/--c-empty`), a `--c-work` dot if any cage needs work, a `--c-ready`/`--teal` dot if any is market-ready. Same `cageStatus()` the statstrip uses, so color meaning never disagrees across altitudes.

### Area — drawn rectangle inside a plot
- Lighter rounded rect, fill `--surface-sink`, 1.5px `--hair` border, inset inside the plot, no heavy shadow (it belongs to its plot). Selected → `--teal` border + handles. Rotated areas render via the `<g>` transform; rows rotate with them.
- **Lines as parallel rows:** each line = one ~3px `--rope` stroke spanning the area along `axis`, evenly spaced by `area.spacing`, with a 1px `--rope-hi` highlight stroke offset to echo `.lineRope`'s braid. Tiny piling glyphs (from `pilingSVG`) cap each row's ends. **Per-line tally** (filled/total, `--font-num`, 9–10px) at the row's far end, AREA tier only.
- **Area label:** smaller pill, `--ink-2`, area name + line count.

### Cages
Never drawn individually on the layout canvas (schematic). Presence is conveyed by rows + roll-up colors. Individual `shapeSVG` glyphs appear ONLY after drill-in, in the existing work map.

### Handles (when selected)
Corner handles = 24px white circles, 2px `--teal` border, `--shadow-pop`, hit area padded to 44px. Edge handles = short `--teal` capsules (44px hit). Rotate handle (areas) = white circle with the existing rotate/refresh icon in `--teal` on a 1px `--hair` leader line above the top edge (44px hit). Drag size/orientation badge = dark pill (`--toast-bg` bg, white `--font-num`), e.g. `6 lines · NS`.

### Snap guides
1px dashed `--ok` lines spanning the canvas when edges/centers align; an orientation guide line + a `.chip`-style `NS`/`EW` chip (`--teal-tint` bg, `--teal-press` text) while rotating.

### Empty states
- **No plots (truly empty):** centered enlarged favicon oyster-on-wave SVG (`--teal` on `--paper`), `No plots yet` (`.obTitle`), `A plot is one lease or patch of water. Add your first to start laying out lines.` (`.obSub`), a big `.btn-primary` `Add plot`, and a quiet `Load Brightside demo` link for parity with onboarding.
- **Plot with no areas:** dashed-border ghost area placeholder centered in the plot with a `+ Add area` affordance (mirrors `.addLine`: 1.5px dashed `--hair-strong`, `--teal` text, `--teal-tint` on press).
- **Area with no lines:** thin dashed row hints + a `Set lines` chip opening the Edit-area sheet.

### Migrated flat farms (Brightside)
Backfill creates one default plot (`My farm`, or the farm name) holding one area with all existing lines as evenly-spaced rows. On first open the canvas auto-fits to that single plot full of rows — the farmer sees their whole farm as one lease they can subdivide. Nothing looks lost; it gained a frame.

### Transitions
Tapping `Open ›` does a brief (220ms, `--ease`) zoom-and-cross-fade: the focused area scales toward the viewport while the paper background holds, then `render()` swaps in the scoped work map (same paper ripple, now with real `.cage` rows). Honor `prefers-reduced-motion` (instant swap). The shared paper texture + rope motif make drill-in feel like one continuous zoom from chart to worktable.

---

## 6. Integration Contract

`ensureSpatialIndex(f)` is the single shared backfill. Daily-work code keeps reading flat `farm.lines`. Only new editor code + the drill-in filter know about plots/areas, joined solely by `line.areaId`.

### Helpers to add
- `ensureSpatialIndex(farm)` — §2 migration (default plot/area + adopt orphans + rebuild `lineIds` + reindex).
- `reindexPlots(farm)` — set `plot.order` / `area.order`.
- `areaOfLine(farm, line)` — return `{plot, area}` via `line.plotId/areaId`.
- `linesInArea(farm, areaId)` — `farm.lines.filter(l => l.areaId === areaId)` in global `order`.
- `visibleLines(farm)` — the render filter (below).
- `flattenAllLines(farm)` — **the flattener the brief asked for**. Today it is `return farm.lines;` (lines never moved under areas). It exists as the named, correct way for any future code to enumerate all lines, so nothing walks `plots→areas→lines` ad hoc.
- `defaultArea(farm)` — `farm.plots[0].areas[0]` (home for unassigned lines).
- `createLinesForArea(farm, area, lineCount, cagesPerLine)` — bulk fill, reuses `newCage` + `addLine`'s line shape, one `commit()`+`undoable`.

### The render filter (the only behavioral edit to `render()`)
At **L1069**, replace:
```js
farm.lines.forEach(function(line){ well.appendChild(renderLine(line, farm)); });
```
with:
```js
visibleLines(farm).forEach(function(line){ well.appendChild(renderLine(line, farm)); });
```
where:
```js
function visibleLines(farm){
  if (viewScope && viewScope.areaId)
    return farm.lines.filter(function(l){ return l.areaId === viewScope.areaId; });
  return farm.lines;          // no scope = whole-farm flat view = today's behavior, byte-identical
}
```
And add the layout-mode branch right after the no-farms early return (L1059):
```js
if (viewMode === 'layout'){ app.appendChild(buildLayoutEditor(getFarm())); return; }
```

### Every seam touched, and exactly how
1. **`render()` (L1050/1069)** — CHANGE: add layout-mode branch (1 line) + `visibleLines` filter (1 line). Degrades to identity when `viewScope`/`viewMode` are null/'work'.
2. **`renderTopBar` (L1086)** — CHANGE (additive): when `viewScope` set, prepend a back chip (`‹ <plot> · <area>`) that clears scope + renders. Layout mode renders its own topbar inside `buildLayoutEditor` (not this function).
3. **`renderStatStrip` (L1097)** — UNCHANGED. Stays farm-wide totals on purpose (verified summary). Optional cosmetic breadcrumb only.
4. **`renderLine` / `renderCageCell` (L1128/1157)** — UNCHANGED. Drill-in renders the same DOM for the filtered subset.
5. **`cageById` (L2113) / `lineOfCage` (L2121)** — UNCHANGED. Scan full `farm.lines` → `selCages` survives scope changes.
6. **`reindexLines` (L1203)** — UNCHANGED for label/order. ADD one call after it to rebuild affected `area.lineIds` (idempotent, self-healing) — or simply re-derive via `ensureSpatialIndex`'s step 6 on the next structural commit.
7. **`addLine` (L1181)** — CHANGE (additive): after building the line, set `line.plotId/areaId` to `viewScope`'s area if scoped, else `defaultArea(farm)`; push `line.id` into that `area.lineIds`. Enforces the one-rule. Undo path also splices it back out (or re-derives `lineIds`).
8. **`addCageToLine` (L1923)** — UNCHANGED (line already has an `areaId`).
9. **`removeLineFromFarm` (L1726) / `removeLineWithUndo` (L1930)** — CHANGE (additive): splice `line.id` from its `area.lineIds` on remove, re-insert on undo (or re-derive — preferred, one line).
10. **`createFarmFromModel` (L1605)** — CHANGE: call `ensureSpatialIndex(farm)` after building `f.lines` so a new farm is born in the plot model (no first-load flicker).
11. **`loadBrightsideFarm` (L1767)** — CHANGE: same `ensureSpatialIndex(farm)` call after seeding. Demo becomes one plot + one area with all lines. (Optional polish: pre-split into 2–3 areas to showcase the editor; not required.)
12. **`buildFarmLayout` (L1743)** — REPURPOSE: the menu entry no longer opens this sheet; the old form's cage-types/grades/market-size/neglect editing moves into `buildFarmSettingsSheet` opened from the layout page gear. Keep `buildFarmForm` itself intact for onboarding (`'create'` mode).
13. **`buildMenu` "Farm Layout" item (L1882)** — CHANGE: set `viewMode='layout'` and `render()` instead of `openSheet(buildFarmLayout)`.
14. **`migrateFarm` (L630, body ends L728)** — CHANGE: call `ensureSpatialIndex(f)` after the existing batch-ledger reconcile, before the function closes.
15. **`selCages`/`clearSelection`/`denseRangeSelect`/`renderPopup`/`syncPopup`/`selectedCages` (L2100+)** — UNCHANGED. They never run in layout mode (no `.cage` cells). `clearSelection()` is invoked on every mode/scope transition.
16. **Barge, harvest, growth, lineage, photos** — UNCHANGED (flat `farm.lines` walks; correct under any scope).

**Net: exactly 9 functions change; only `render()` changes behavior, and that degrades to today when `viewMode='work'`/`viewScope=null`.**

---

## 7. Builder Task Breakdown (sequential)

Mirrors v7's foundation → interaction → polish cadence. Each builder runs its smoke-check before handoff.

### Builder 1 — Data foundation + migration (no UI)
**Scope:** the persisted model, migration, helpers. No canvas.
**Owns:** `farm.plots[]`/`plot.areas[]` shapes; `ensureSpatialIndex(f)`; `reindexPlots(f)`; `areaOfLine`, `linesInArea`, `visibleLines`, `flattenAllLines`, `defaultArea`, `createLinesForArea`; the `migrateFarm` call (after L728); `createFarmFromModel` + `loadBrightsideFarm` calls; the additive `plotId/areaId` writes in `addLine`/`removeLine`; module globals `var viewMode='work', viewScope=null;`.
**Must not break:** the L677–714 legacy flattener; `reindexLines` global labels/order; `cageById`/`lineOfCage`; never bump `state.v`; never store per-cage coords; never use the `f.areas` namespace.
**Smoke-check:** Load existing Brightside save → `getFarm().plots.length===1`, one area, `area.lineIds.length === farm.lines.length`, every `line.areaId` valid. Reload twice → identical (idempotent). With `viewScope=null`, `visibleLines(farm).length === farm.lines.length`. Daily-work map renders identically to before. Add a line → it gets a valid `areaId`; remove it → `area.lineIds` consistent.

### Builder 2 — Layout page shell + render/zoom (read-only canvas)
**Scope:** the SVG canvas, pan/zoom, LOD tiers, mode switching, drill-in/back. Draws existing geometry; no editing yet.
**Owns:** `buildLayoutEditor(farm)`; the `s()` SVG helper; layout topbar (back/gear); `render()` layout branch + `visibleLines` filter; `applyView`/`toWorld`/`toScreen`/fit-to-content; pan/pinch/zoom-cluster/double-tap; the three LOD tiers; the menu-entry rewire; drill-in (`Open ›` → scope + `render()`); back chip + `popstate`; `buildFarmSettingsSheet` (move the old form here).
**Must not break:** the no-farms early return must still win first; `viewMode='work'`/`viewScope=null` path byte-identical; layout mode renders zero `.cage` cells; `clearSelection()` on every mode/scope transition; `denseRangeSelect`/`selCages` never wired in layout.
**Smoke-check (390×844 + iPad):** Open Farm Layout → see one plot card with rows, fit-all on mount. Pinch zooms about centroid; one-finger pans; `+/−/fit` work; double-tap fits. LOD changes at the k thresholds. `Open ›` on the area → scoped work map shows only that area's lines; drag-select/fill/work still work. Back chip and phone Back both return to whole farm. No console errors; no leaked pointer captures after `render()`.

### Builder 3 — Drop / move / resize / rotate + line fill (editing)
**Scope:** all structure editing.
**Owns:** the unified `pointerdown` intent router; `Add plot`/`Add area` drop flow; move (with plot-carries-areas + clamping); rotated-aware corner/edge resize; rotate-with-snap; `snap()` + smart guides; the Edit-area sheet (name/lines/cages/spacing/orientation) wired to `createLinesForArea`; inline rename; `Remove` with the stocked-lines confirm + "move to default area"; size/orientation badges; all `commit()`+`undoable` wrapping.
**Must not break:** bulk fill must reuse `newCage` + `addLine`'s exact line shape and a valid `cageTypes[0].id`; reducing line count never destroys filled lines; one `commit()`/`undoable` per structural action; never store rendered SVG or per-cage coords; touch-action:none stays only on the layout SVG.
**Smoke-check:** Add plot → rename → drop area → it auto-fills 4 lines (each line has valid `areaId` + cages with valid `typeId`). Drag-resize the area (incl. rotated) — rect doesn't walk; min size holds. Rotate snaps to orthogonal; `NS/EW` chip updates. Set lines 4→6 adds 2 lines; 6→4 removes 2 empty lines; blocks when a line has stock. Move a plot → its areas follow. Undo reverses each. Reload → geometry + lines persist.

### Builder 4 — Visual polish + empty states + transitions
**Scope:** appearance only.
**Owns:** plot card shadow/separation; status roll-up bars (via `cageStatus()`); rope-stroke rows + piling caps + per-line tallies; labels/pills/chips; handle styling; snap-guide rendering; compass rose; all three empty states; the 220ms drill-in zoom/cross-fade with `prefers-reduced-motion` fallback.
**Must not break:** color meaning must match `cageStatus()`/statstrip; reduced-motion path must be instant; visual changes must not alter geometry or hit-testing (handles keep 44px hit zones).
**Smoke-check:** Plots read as separate islands; roll-up colors match the statstrip for the same farm. Empty-plot and empty-area states show the right CTAs. Drill-in animates (and is instant under reduced-motion). At FARM tier no rows draw; at AREA tier tallies show; never a per-cage glyph on the layout canvas. Lighthouse-style tap-target check: every control ≥44px.

---

## 8. Acceptance Tests (phone-viewport walk, 390×844)

A verifier runs these against `file://.../index.html` (or the hosted build) in a 390×844 viewport. Reset to a clean state where noted.

**A. Fresh empty farm.** Clear localStorage → reload. Onboarding page shows. Create a farm (or Load Brightside demo). Open menu → Farm Layout. **Expect:** layout page opens, fits to one plot card containing rows; no console errors.

**B. Two separate plots.** Tap `+ Add plot`. **Expect:** a new plot card drops, pre-selected, rename field focused; type "South Lease". There are now two visually-separate plot cards with open water between them. Pinch-zoom out → both fit; pan around; double-tap empty → fit-all.

**C. Draw 2 areas in one plot.** Select a plot, tap `+ Add area`. **Expect:** an area drops inside that plot, auto-filled with 4 line rows. Add a second area in the same plot; drag-resize it; rotate it ~45° → snaps; `NS/EW` chip updates. Both areas stay inside the plot.

**D. Fill with lines + cages.** Select an area → `Edit area` → set Lines = 5, Cages per line = 12, Spacing = wide. **Expect:** 5 rope rows render; persisted `area.lineCount===5`, `area.cagesPerLine===12`; `farm.lines` grew by the right count; each new line has a valid `areaId` and 12 cages with valid `typeId`.

**E. Zoom/pan tiers.** Zoom to FARM tier → only plot cards + roll-up bars (no rows). Zoom to AREA tier → rows thicken, per-line tallies show, `Open ›` chip appears. **Expect:** no per-cage glyph ever appears on the layout canvas.

**F. Drill into an area + daily-work action.** Tap `Open ›` on a filled area. **Expect:** brief zoom transition, then the scoped work map shows ONLY that area's lines as real `.cage` strips. Drag-select a range → popup appears → `Fill` from barge (or `Work`) succeeds. The barge/stat strip behave as today.

**G. Back.** Tap the topbar back chip. **Expect:** return to whole-farm work map (all lines). From there, menu → Farm Layout returns to the editor. Phone/browser Back while scoped also exits to whole farm.

**H. Persistence + back-compat.** Reload the page. **Expect:** `viewMode` resets to work, whole-farm map shows; the two plots, two areas, line counts, rotation, and the daily-work fill from step F all persisted. Re-open Farm Layout → geometry intact.

**I. Brightside still works.** Clear localStorage → reload → Load Brightside demo (do NOT touch the editor). **Expect:** the daily-work map renders the original 22+ lines exactly as before (colors, needs-work, ready, barge loaded). Open Farm Layout → one plot ("My farm"/farm name) + one area holding all 22+ lines as rows. No line lost, no label changed; harvest log / lineage / growth projection unchanged.

**J. Safety.** Select an area with stocked lines → `Remove` → choose "Move lines to default area." **Expect:** lines + cages + batches survive, reassigned to the default area; reload confirms no data loss. Reducing an area's line count past a filled line is blocked with the `Line has stock` toast.

---

## 9. Open Questions + Risks

### Open questions for the user (product-level only)
1. **Default plot name for migrated Brightside:** use the literal farm name (`"Brightside Oyster Co."`) for the single default plot, or a generic `"Main"`? (Spec assumes the farm name; trivial to change.)
2. **Should the Brightside demo ship pre-split into 2–3 labeled areas** to showcase the editor, or stay as one area (back-compat-truest)? (Spec ships one area; splitting is optional polish.)
3. **Orientation labels:** is `NS / EW` the right vocabulary for the rotate chip, or do you prefer plain degrees / "along shore vs across"? (Cosmetic only.)

### Risks + mitigations
- **`render()` is the blast center.** Mitigation: exactly one early branch + one `visibleLines` filter; both degrade to today's behavior when `viewMode='work'`/`viewScope=null`. Builder 1 smoke-check asserts `visibleLines(farm).length === farm.lines.length` with no scope.
- **Denormalization drift (`line.areaId` vs `area.lineIds`).** Mitigation: `line.areaId` is the only writable truth; `area.lineIds` is derived in `ensureSpatialIndex` (every load) and after each structural commit. Orphans reassign to the default area, so the map can never lose a line.
- **Drag-select leaking into the editor.** Mitigation: layout mode renders zero `.cage` cells; `denseRangeSelect` cannot attach; `clearSelection()` on every transition.
- **Migration ordering / namespace trap.** Mitigation: `ensureSpatialIndex` runs AFTER the L677–689 legacy flattener and uses only `f.plots[]`, never `f.areas`. Idempotent.
- **Label / harvest-provenance ambiguity.** Mitigation: `reindexLines` keeps global numbering; `area.lineIds` is display-only. Area membership never renumbers. Test I asserts Brightside labels unchanged.
- **Bulk fill correctness.** Mitigation: one `createLinesForArea` loops `newCage` + the exact `addLine` line shape, valid `cageTypes[0].id`, one `commit()`+`undoable`.
- **Rotated-frame resize math (the only genuinely new math).** Mitigation: isolate `toLocal`/`toWorld` + opposite-anchor; snap rotation to 15°/orthogonal to mask small errors; clamp min w/h; Builder 3 smoke-check asserts the rect doesn't walk.
- **localStorage quota.** Mitigation: geometry is a handful of numbers per plot/area; never store rendered SVG or per-cage coords; cages stay procedural from rect + counts. `save()` (L780) already toasts on quota.
- **iOS Safari pinch + pointer capture.** Mitigation: `touch-action:none` on the layout SVG only (work map keeps `.cage` `touch-action:pan-y`); active-pointer `Map`; verify two-finger pinch + one-finger pan on a real iPhone before shipping (acceptance B/E).
- **Discoverability (design vs do).** Mitigation: distinct layout topbar (back + gear), scoped breadcrumb in work mode, the `Open ›` chip as the explicit handoff, and never letting cage glyphs appear on the layout canvas so the surfaces never look alike.