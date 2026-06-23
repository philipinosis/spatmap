# SpatMap v7 — Harvest Kit (parts bin for the rebuild)

Copy-pasteable assets pulled from `index-6.html` (7,227 lines, ~360KB), `_barge-design.svg`,
`_barge-empty.svg`, and `_design-spec-index3.md`. Line numbers are `index-6.html` unless noted.

The brief (`_rebuild-PRODUCT-BRIEF.md`) is the spec; this kit is the parts. Where they conflict,
the brief wins. Read the DROP LIST at the bottom before reusing anything — several "parts" here are
attached to clutter you must leave behind.

One thing to know up front: the v7 brief asks for a barge pile that **grows with count**. index-6
does NOT do that. It swaps between two hand-drawn static SVGs (loaded vs emptied). The growing-pile
mechanism has to be **built**, not harvested. Section 1 gives you the art to grow and the exact recipe.

---

## 1. The illustrative SVG barge + fishermen + growing oyster pile

### Where it lives
- Art: two `<template>` elements in the body — `barge-loaded-tmpl` (lines 864–1179) and
  `barge-empty-tmpl` (lines 1181–1300). Standalone copies also sit at `_barge-design.svg` (loaded)
  and `_barge-empty.svg` (emptied/ghost). The SVGs are identical between the templates and the .svg
  files; the .svg headers document the palette.
- Render: `renderBarge(farm)` at **line 4181**. CSS `.bargeWrap` / `.bargeSvg` / `.bargePill` at
  lines 200–226.

### How index-6 actually works (and why it's not enough)
```js
// renderBarge(), line 4181 — abridged
var b = batches[0];                    // shows ONLY the first on-deck batch
var isPlaced = !!b.placed;             // placed = already distributed into cages
var tmplId = isPlaced ? 'barge-empty-tmpl' : 'barge-loaded-tmpl';
var svg = document.getElementById(tmplId).innerHTML;   // pick ONE of two static drawings
var cntLbl = isPlaced ? 'placed' : (b.count != null ? '~' + fmtCompact(b.count) : '…');
return h('div', {class:'bargeWrap'}, h('div',{html:svg}), pill, origin, dismiss);
```
The pile is a fixed heap of ellipses. Pull 200 oysters or 20,000 — the drawing is the same; only the
count pill text changes. Philip's ask ("a mountain of oysters that grows visually as more are added")
is unmet. Build it in v7.

### The art to reuse (the LOADED barge, `_barge-design.svg`, viewBox `0 0 120 110`)
The full file is at `/Users/philipinosis/Desktop/spatmap/_barge-design.svg`. It is well-commented and
sectioned: WATER & WAKE → HULL (flat-bottomed Louisiana barge) → DECK → OYSTER PILE → BASKET/TOTE →
FISHERMAN #1 (left, reaching, baseball cap) → FISHERMAN #2 (right, akimbo, sou'wester) → poles/rope →
waterline foam. Keep the hull, deck, both fishermen, baskets, poles, foam **verbatim**. The only part
that should change with count is the OYSTER PILE group.

Barge palette (from the file header — keep these):
```
Hull #2d5a42 / shadow #1a3a28 / deck #3a6040 / gunwale #4a7a56
Oyster shells #6a8060 base, front-row highlights up to #c4d8b0 / sheen #d4e8c4
Mesh bags #4a6a48 / accent rope #c88530 / light outlines #7ac8a8 on the dark teal water
Water #0d3a4a, ripples #1a5068 / #1e6878, foam #3a8898 / #4a9aaa
```

### The pile group to make dynamic (lines 119–158 of `_barge-design.svg`)
This is the heap. Wrap it in `<g id="oysterPile">` and drive it off count.
```xml
<!-- Oyster shell pile — main mound shape -->
<ellipse cx="60" cy="58" rx="16" ry="8" fill="#6a8060"/>

<!-- Back row shells (smaller, muted) -->
<ellipse cx="50" cy="56" rx="5"   ry="2.5" fill="#7a9070" transform="rotate(-15 50 56)"/>
<ellipse cx="57" cy="53" rx="5.5" ry="2.2" fill="#8aa080" transform="rotate(5 57 53)"/>
<ellipse cx="65" cy="54" rx="5"   ry="2.3" fill="#7a9070" transform="rotate(-8 65 54)"/>
<ellipse cx="71" cy="56" rx="4.5" ry="2"   fill="#6a8060" transform="rotate(12 71 56)"/>
<!-- Mid row shells -->
<ellipse cx="48" cy="59" rx="5.5" ry="2.8" fill="#8aaa7a" transform="rotate(-20 48 59)"/>
<ellipse cx="54" cy="57" rx="6"   ry="2.5" fill="#9ab88a" transform="rotate(8 54 57)"/>
<ellipse cx="61" cy="56" rx="5.5" ry="2.3" fill="#8aaa7a" transform="rotate(-5 61 56)"/>
<ellipse cx="68" cy="57.5" rx="5" ry="2.5" fill="#9ab88a" transform="rotate(18 68 57.5)"/>
<ellipse cx="73" cy="59" rx="4.5" ry="2.2" fill="#7a9a6a" transform="rotate(-10 73 59)"/>
<!-- Front row shells (larger, brighter — nearest viewer) -->
<ellipse cx="46" cy="62" rx="5"   ry="2.5" fill="#aac898" transform="rotate(-25 46 62)"/>
<ellipse cx="52" cy="61" rx="6.5" ry="2.8" fill="#b4d0a0" transform="rotate(10 52 61)"/>
<ellipse cx="60" cy="60" rx="6"   ry="2.6" fill="#c4d8b0" transform="rotate(-3 60 60)"/>
<ellipse cx="67" cy="61" rx="6"   ry="2.7" fill="#b4d0a0" transform="rotate(15 67 61)"/>
<ellipse cx="74" cy="62" rx="4.8" ry="2.4" fill="#aac898" transform="rotate(-18 74 62)"/>
<!-- Pearlescent sheen + base outline + scattered shells -->
<path d="M 50 59.5 Q 54 58 58 59" fill="none" stroke="#d4e8c4" stroke-width="0.7" opacity="0.6"/>
<ellipse cx="60" cy="60" rx="16.5" ry="7.5" fill="none" stroke="#3a5030" stroke-width="0.8" opacity="0.5"/>
<path d="M 46 64 Q 60 62 74 64" fill="none" stroke="#c88530" stroke-width="0.8" stroke-dasharray="2,1.5" opacity="0.7"/>
```

### Recommended growing-pile mechanism (build this in v7)
The shells are already drawn in **three depth bands** (back/mid/front). Reveal bands by count, and
scale the whole pile group. Deck top is `y≈64`; pile sits centered at `cx=60`.

```js
// pileLevel: 0..1 from count, log-scaled so a few hundred reads as "some" and tens of
// thousands reads as "a mountain" without ever overflowing the deck.
function pileLevel(count){
  if (!count || count <= 0) return 0;
  return Math.min(1, Math.log10(count + 1) / Math.log10(20000)); // 20k ≈ full heap
}
// Apply to <g id="oysterPile">: lift + scale from the deck line, and gate the rows.
//   tier 1 (lvl>0):    show the base mound + front row      → "a scoop"
//   tier 2 (lvl>0.45): + mid row                            → "a load"
//   tier 3 (lvl>0.75): + back row + a second stacked mound  → "a mountain"
// transform-origin at the deck so the heap grows UP, not from its center:
//   pile.setAttribute('transform', 'translate(60 64) scale(' + (0.55 + 0.6*lvl) + ') translate(-60 -64)');
```
This keeps Philip's drawing and makes it breathe. Pair it with a quick CSS `transition: transform .4s`
on `#oysterPile` so a Pull visibly heaps the barge. The bob animation already exists:
`@keyframes barge-bob` (line 208) + `.bargeSvg { animation: barge-bob 3s ease-in-out infinite }`.

### Tap-the-barge → harvest
index-6 wires `.bargeWrap` only to a "× dismiss" button (line 4208). The brief wants tapping the pile
to open the **harvest menu** (`buildHarvestSheet`, line 5927) showing the on-barge history and a count
field. Wire the whole `bargeWrap` (or the pile group) to `openSheet(buildHarvestSheet)` in v7.

### Barge CSS (lines 200–226 — reuse as-is, it's phone-friendly)
```css
.bargeWrap{position:fixed;right:10px;top:50%;transform:translateY(-50%);
  width:120px;pointer-events:all;z-index:50;display:flex;flex-direction:column;align-items:center;gap:4px}
.bargeSvg{width:120px;height:auto;filter:drop-shadow(0 3px 8px rgba(0,0,0,.5));
  animation:barge-bob 3s ease-in-out infinite}
@keyframes barge-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.bargePill{background:rgba(200,133,42,.22);border:1.5px solid rgba(200,133,42,.6);
  border-radius:999px;padding:4px 12px;color:#E8A84A;font-size:.78rem;font-weight:800;text-align:center;white-space:nowrap}
.bargeOrigin{font-size:.65rem;color:var(--muted);text-align:center;max-width:100px;line-height:1.3}
```
Phone note: a fixed right-edge 120px barge is fine on iPad but eats a third of a 390px phone. Consider
docking it to a slimmer bottom-corner pile on phone, or shrinking to ~88px, and only popping it big when
it holds oysters.

---

## 2. Gear-accurate cage glyph SVGs + mesh-size data model

### The glyph generator — `shapeSVG(shape, fill, ring, size, work)` (lines 2926–3006)
Three shapes, top-down boat perspective, all using CSS vars so they recolor by status. Copy this
function whole. `ring` draws the market-ready outline (teal); `work` draws the red dashed needs-work
ring. The three branches:
- **`circle` → OyGrow** (viewBox `0 0 28 16`): pontoon strip on top, rounded body, 3 vertical + 2
  horizontal mesh bars, status dot. Drawn ~1.3× wide × 0.7× tall.
- **`rect` → FlipFarm** (viewBox `0 0 28 16`): landscape basket, horizontal center spine, 5 perpendicular
  ribs, flip-hinge rects at both ends. ~1.2× wide × 0.6× tall.
- **else → Vexar bag** (viewBox `0 0 20 14`): soft rounded mesh-bag path, 3×2 mesh dots, tie-off knot.

The OyGrow branch verbatim (the other two follow the same pattern — pull from lines 2955–3002):
```js
// shape === 'circle'  →  OyGrow cage, top-down
vb = '0 0 28 16';  w = Math.round(size*1.3);  ht = Math.round(size*0.7);
body =
  (ring ? '<rect x="0" y="0" width="28" height="16" rx="2.5" fill="none" stroke="'+RING_COLOR+'" stroke-width="3" opacity="0.85"/>' : '') +
  '<rect x="3" y="0.5" width="22" height="3" rx="1.5" fill="var(--cage-float)" stroke="var(--cage-stroke)" stroke-width="0.8"/>' +
  '<rect x="1" y="3.5" width="26" height="12" rx="1.5" fill="'+fill+'" stroke="var(--cage-stroke)" stroke-width="1.2"/>' +
  '<line x1="7.5" y1="4.5" x2="7.5" y2="15" stroke="var(--cage-mesh)" stroke-width="0.7" opacity="0.7"/>' +
  '<line x1="14"  y1="4.5" x2="14"  y2="15" stroke="var(--cage-mesh)" stroke-width="0.7" opacity="0.7"/>' +
  '<line x1="20.5" y1="4.5" x2="20.5" y2="15" stroke="var(--cage-mesh)" stroke-width="0.7" opacity="0.7"/>' +
  '<line x1="2" y1="8"    x2="26" y2="8"    stroke="var(--cage-mesh)" stroke-width="0.5" opacity="0.5"/>' +
  '<line x1="2" y1="11.5" x2="26" y2="11.5" stroke="var(--cage-mesh)" stroke-width="0.5" opacity="0.5"/>' +
  '<circle cx="24" cy="6" r="2" fill="'+fill+'" stroke="#0a2530" stroke-width="0.5"/>';
workRing = work ? '<rect x="0.5" y="0.5" width="27" height="15" rx="2.5" fill="none" stroke="'+NEEDS_WORK_COLOR+'" stroke-width="2" stroke-dasharray="5 3"/>' : '';
return '<svg viewBox="'+vb+'" width="'+w+'" height="'+ht+'" aria-hidden="true">'+body+workRing+'</svg>';
```
(`_design-spec-index3.md` lines 90–169 has the same glyphs authored as reusable `<symbol id="cage-oygrow|cage-flipfarm|cage-bag">` defs if you'd rather `<use href>` them once than inline a string per cell. The symbol form is cleaner for hundreds of cells; the index-6 string form is what actually shipped.)

Glyph color tokens (lines 52–56):
```css
--cage-fill:#16404E; --cage-stroke:#0A2530; --cage-mesh:#7AACB8; --cage-float:#1A3F4E; --cage-status-dot:#2BBFA4;
```

### The piling glyph — `pilingSVG(size)` (lines 2894–2916)
Weathered pressure-treated piling (the brief's "lines stay" anchor mark), viewBox `0 0 14 30`:
fouling band at the waterline, cylinder shaft with a left-shadow strip, wood grain, top cap ellipse,
mooring ring. Place two per line end, mirror the right one with `scale(-1,1)`. Copy whole. Uses
`--piling-color #5C4228 / --piling-top #7A5A3A / --piling-ring #3A2A18` (lines 46–48).

### Mesh-size data model (the dogfood note-17 + brief ask)
```
CageType: { id, name, shape: 'square'|'rect'|'circle', meshMm: number|null }
```
- `meshMm` = bag/cage mesh in mm; `null` = not recorded. Declared in the data-model comment at line
  1514–1518; migrated on load at **line 2416**: `if (typeof t.meshMm !== 'number' || !(t.meshMm > 0)) t.meshMm = null;`
- v7: keep `shape` (drives the glyph) and `meshMm` (real data). Surface mesh in the empty-cage popup
  and the cage sheet ("Flip · 9 mm mesh"). Do NOT stuff mesh into the name (the index-3 workaround that
  note 17 flagged as wrong). The shape→label map in index-6 is `SHAPE_LABELS` (used at line 4297); v7
  should let onboarding name a cage type, pick a shape glyph, and enter mesh — three fields, one row.

### Status → color mapping — `cageStatus(cage, farm)` (lines 2550–2557)
```js
function cageStatus(cage, farm){
  if (!cage.batch) return {key:'empty', color:STATUS_COLORS.empty, ready:false, needsWork:false};
  var m = monthsSince(cage.batch.stockDate);
  var key = m < 6 ? 'fresh' : (m <= 12 ? 'mid' : 'old');
  var size = latestSize(cage);
  var ready = typeof size === 'number' && size >= farm.marketSizeMm;
  return {key:key, color:STATUS_COLORS[key], ready:ready, needsWork:needsWork(cage)};
}
// STATUS_COLORS (line 1723): empty:#2E5A6B  fresh:#4DB87A  mid:#C8852A  old:#D9632E
// RING_COLOR #2BBFA4 (ready, line 1724) · NEEDS_WORK_COLOR #C0392B (line 1742)
```

---

## 3. Growth + seasonal projection math (with honest confidence copy)

This is the strongest harvest in the file. Copy `growthModel`, `integrateGrowth`, `growthPoints`,
`growthChartSVG`, and the constants. All pure-ish and DOM-free except the chart.

### Constants (lines 1728–1733)
```js
var DEFAULT_GROWTH_MM_DAY = 0.18; // Gulf triploid prior: ~15mm seed → 76mm in ~1yr
var MIN_GROWTH_MM_DAY = 0.02;     // projection floor — below this, date is "unknown", not 50yr out
var STALE_DAYS = 30;
var MAX_PROJECTION_DAYS = 730;
// seasonal multiplier by calendar month (Jan..Dec): Gulf oysters slow in winter, surge spring/fall
var SEASON_MULT = [0.35,0.45,0.8,1.2,1.35,1.35,1.05,1.0,1.2,1.3,0.8,0.45];
```

### Seasonal forward-integration — `integrateGrowth` (lines 2634–2642)
Walks one day at a time, scaling the base rate by that day's month multiplier, so a projection crossing
a Gulf winter slows like real oysters.
```js
function integrateGrowth(fromMs, size, ratePerDay, targetSize, maxDays){
  var ms = fromMs, days = 0;
  while (size < targetSize && days < maxDays){
    ms += 86400000; days++;
    size += ratePerDay * SEASON_MULT[new Date(ms).getUTCMonth()];
  }
  return {ms:ms, size:size, days:days, reached: size >= targetSize};
}
```

### Rate selection + confidence — `growthModel(cage, farm)` (lines 2651–2725)
- **Rate**: 1 point → `DEFAULT_GROWTH_MM_DAY` prior; 2 points → simple slope; ≥3 → ordinary
  least-squares slope. A flat/negative slope is treated as measurement noise (oysters don't shrink)
  → falls back to the prior and flags `noisy`.
- **Estimate today**: integrate from the last measurement forward to today (so it equals the measured
  value the instant a check is logged).
- **Projection**: integrate today→`marketSizeMm`, capped at `MAX_PROJECTION_DAYS`; below
  `MIN_GROWTH_MM_DAY` the date is `unknown`.
- **Confidence**: `low` if prior/noisy/stale(>90d); `high` if ≥3 points over ≥45 days and a check within
  `STALE_DAYS`; else `medium`.
Returns `{ok, points, rateMmPerDay, rateMmPerMonth, rateSource, noisy, estTodayMm, readyNow,
daysToMarket, projectedDate, projectionCapped, confidence, ...}`.

### The honest copy (lines 5072–5092, in `buildBatchSummary`) — keep this voice
```js
function projectionLabel(){
  if (model.readyNow){
    var measuredReady = typeof model.lastMeasuredSizeMm === 'number' && model.lastMeasuredSizeMm >= farm.marketSizeMm;
    return measuredReady ? 'Market-ready now'
                         : 'Likely market-ready (est.) — log a growth check to confirm';
  }
  if (model.projectionCapped) return '1+ years out';
  if (model.projectedDate) return '~' + monthYear(model.projectedDate) + ' (' + farm.marketSizeMm + ' mm)';
  return '—';
}
function confidenceHint(){
  if (model.confidence === 'high') return null;
  var why;
  if (model.rateSource !== 'observed') why = 'based on a typical Gulf growth rate — log growth checks to use this cage’s own pace';
  else if (model.noisy)    why = 'recent checks disagree — re-measure to sharpen it';
  else if (model.isStale)  why = 'last check was ' + daysSince(model.lastMeasuredDate) + ' days ago — log a fresh growth check to sharpen it';
  else                     why = 'log another growth check to sharpen it';
  return (model.confidence === 'low' ? 'Low' : 'Medium') + ' confidence projection: ' + why + '.';
}
// Growth line on the card:
//   '~0.18 mm/day · ~5.5 mm/mo (typical rate — no usable checks yet)'   when rateSource !== 'observed'
```

### The chart — `growthChartSVG(cage, marketMm, model)` (lines 3015 onward)
Inline SVG, no library. Solid teal polyline through real measurements, dashed segment from the last
point to the market line, dashed market threshold line labeled "market 76 mm". Local coordinate math
only (`x(d)`/`y(s)` mappers at 3044–3045). Copy whole.

---

## 4. Drag-to-select + floating contextual popup (and how to SIMPLIFY it)

### The drag-select core — `denseRangeSelect(strip, line)` (lines 4083–4157)
This is the keeper interaction and it's already good on touch. Mechanics:
- `pointerdown` on a `.cage.dense` starts a range from that cell's `data-pos`.
- **Paint direction** (line 4099): if the start cell is eligible, toggle off its current state; if it's
  ineligible (full/locked), default to selecting — so a drag begun on a stocked cage still fills the
  empty cells it sweeps. Only eligible cells in the range get painted.
- `pointermove` reads the cell under the finger via `document.elementFromPoint` and repaints the range;
  a translucent `.denseBand` (CSS line 331) tracks the selection.
- `pointerup`: if a real drag happened, it installs a one-shot capture-phase click suppressor (lines
  4144–4148) with a 400ms timeout fallback, so the drag's synthetic click can't open a sheet.
- `touch-action:pan-y` on `.cage.dense` (line 317) lets vertical page scroll coexist with horizontal
  drag-select.

### What gets selected — `pickMode(line)` (lines 4039–4082)
Returns a `{store, eligible, refreshClass, onChange}` strategy. In index-6 it serves **three** modes
(`sort`, `place`, `sel`). **v7: keep only `sel`.** Drop sort and place entirely (see DROP LIST).
```js
// the ONLY mode v7 needs:
if (selMode) return {
  kind:'sel', store:selCages, lineId:line.id,
  eligible:function(c){ return !!c && !c.detached; },   // drop `detached` too → just `return !!c`
  refreshClass:function(btn,c){ btn.classList.toggle('selpick', !!selCages[c.id]); },
  onChange:updateSelbar
};
```

### The floating popup — `renderPullFillPopup(farm)` (lines 4225–4286) + `syncPullPopup` (lines 3397–3419)
The popup is the right model (the brief's "small popup above the selection"). It already computes the
action from selection state, which is exactly the brief's popup action matrix:
```js
var stocked = sel.filter(f => !!f.cage.batch);
var empty   = sel.filter(f => !f.cage.batch && !f.cage.detached);
var hasBatch = (farm.batches||[]).filter(b => !b.placed).length > 0;   // barge has a pile
var action = null;
if (stocked.length && stocked.length === sel.length) action = 'pull';
else if (empty.length && empty.length === sel.length && hasBatch) action = 'fill';
```
Positioning (`syncPullPopup`) is clean: find all `.cage.selpick`, take the min top + average center-x,
park the popup `popH + 14px` above the highest pick, clamp into the viewport. It updates **in place**
(`mount.innerHTML=''` then re-append) without a full re-render — copy this. The `.pullPopup::after`
caret (CSS line 194) points down at the selection.

```js
// syncPullPopup positioning — the load-bearing bit (lines 3404–3418)
var picks = document.querySelectorAll('.cage.selpick'); if (!picks.length) return;
var minTop = Infinity, sumLeft = 0, cnt = 0;
picks.forEach(function(el){ var r = el.getBoundingClientRect();
  if (r.top < minTop) minTop = r.top; sumLeft += r.left + r.width/2; cnt++; });
var popH = pop.offsetHeight || 80, avgLeft = sumLeft / cnt;
pop.style.top  = Math.max(8, minTop - popH - 14) + 'px';
pop.style.left = Math.max(8, Math.min(avgLeft, window.innerWidth - (pop.offsetWidth||200) - 8)) + 'px';
```

### HOW TO SIMPLIFY (do this in v7)
1. **One action surface.** index-6 still has BOTH a bottom selbar AND the popup. `updateSelbar()`
   (line 3393) is a vestige that now just calls `syncPullPopup`. Delete the selbar DOM, the
   `.selbar` CSS (around line 620), and `updateSelbar`. Keep only the floating popup.
2. **Popup matrix straight from the brief, no more.** All-filled → `Pull`, `Work`. All-empty +
   barge-has-pile → `Fill` (distribute). All-empty + barge-empty → `Fill` (new-seed form). Single
   empty → also `Remove`. index-6 crowds the pull popup with `Pull / Work / Harvest` (line 4266–4268)
   — Harvest belongs on the barge tap, not here. Trim to 1–2 primary buttons.
3. **Drop `pickMode`'s sort/place branches.** Inline the `sel` strategy; delete `placeWiz`/`sortWiz`
   plumbing.
4. **Drop the `detached` concept** from `eligible` (and everywhere) — see DROP LIST. That removes a
   whole class of "no cage on this spot" states the drag logic has to skip.

### Popup CSS (lines 165–198 — reuse, it's tidy)
```css
.pullPopup{position:fixed;z-index:600;background:var(--surface-raised);border:1.5px solid var(--line);
  border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.5);padding:10px 14px 12px;
  display:flex;flex-direction:column;align-items:center;gap:8px;transform:translateX(-50%);min-width:180px}
.pullPopup .pplbl{font-size:.78rem;color:var(--muted);text-align:center;line-height:1.3}
.pullPopup .ppbtns{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.pullPopup .ppbtn{background:var(--teal);color:#fff;border-radius:10px;padding:8px 18px;
  font-size:.95rem;font-weight:800;min-height:42px}
.pullPopup .ppbtn.fill{background:#3a7d44}
.pullPopup .ppbtn.sec{background:transparent;color:var(--muted);border:1.5px solid var(--line);font-weight:700;font-size:.85rem}
.pullPopup::after{content:'';position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
  border:8px solid transparent;border-top-color:var(--surface-raised);border-bottom:none}
/* dense cells + drag band */
.cage.dense{min-width:0;flex:1 1 0;padding:0;border-radius:3px;touch-action:pan-y}
.cage.dense .cellfill{width:100%;height:30px;border-radius:3px;border:1px solid rgba(0,0,0,.28);transition:filter .1s ease}
.cage.dense .cellfill.rdy{box-shadow:inset 0 3px 0 var(--c-ring)}      /* market-ready: teal top edge */
.cage.dense .cellfill.work{box-shadow:inset 0 -3px 0 var(--c-work)}    /* needs-work: red bottom edge */
.cage.dense.selpick .cellfill{outline:2px solid #fff;outline-offset:-2px;filter:brightness(1.18)}
.denseBand{position:absolute;top:6px;bottom:4px;background:rgba(255,255,255,.18);
  border:1px solid rgba(255,255,255,.6);border-radius:4px;pointer-events:none;z-index:3}
```

### The pull→barge→fill cycle (lineage-preserving) — keep the logic, simplify the data
- **`pullSelectedCages()`** (lines 5432–5489): pools selected stocked cages into one on-deck batch.
  Sums counts only if every source is counted (`countAtLeast` otherwise), takes the max last-measured
  size, records `origin:{cageLabels, lineNames, date}`, pushes a "Pulled to barge" note to each cage's
  history, clears each `cage.batch`. This is the lineage carry. Keep.
- **`quickFillFromBarge(farm)`** (lines 5492–5536): divides the active barge batch evenly across the
  selected empty cages (`Math.floor(total/n)` + remainder spread), stamps each new `cage.batch` with
  `fromBatchId` and a "Restocked from barge — originally from …" note, marks the source batch `placed`.
  Keep the even-split + provenance note; this is the brief's "divide evenly across selected cages."

---

## 5. Color palette + key CSS variables + nice CSS

### Full `:root` (lines 20–58) — the palette, copy whole
```css
:root{
  --bg:#0D2B35; --card:#122E3A; --ink:#E8F4F0; --muted:#7AACB8; --line:#1E5468; --deep:#091E28;
  --teal:#2BBFA4; --teal-dark:#1D8C78; --danger:#C0392B;
  --c-empty:#2E5A6B; --c-fresh:#4DB87A; --c-mid:#C8852A; --c-old:#D9632E; --c-ring:#2BBFA4; --c-work:#C0392B;
  --radius:14px; --shadow:0 2px 12px rgba(0,0,0,.45); --tap:48px; --ease:cubic-bezier(.22,1,.36,1);
  --surface-raised:#1A3F4E; --nav-bg:#091E28;
  --rope-color:#8B7355; --rope-shadow:#5C4A30; --rope-highlight:#C4A97A;
  --piling-color:#5C4228; --piling-top:#7A5A3A; --piling-ring:#3A2A18;
  --water-base:#0A2530; --water-mid:#0D3040; --water-highlight:#144050;
  --cage-fill:#16404E; --cage-stroke:#0A2530; --cage-mesh:#7AACB8; --cage-float:#1A3F4E; --cage-status-dot:#2BBFA4;
  --text-dim:#4A7A88;
}
```
Note: the design spec (`_design-spec-index3.md`) uses slightly different names (`--accent`, `--needs-work`)
for the same hues. The shipped index-6 names above are canonical for the rebuild. `--tap:48px` is the
touch-target floor; keep it.

### Reset + base (lines 59–78) — phone-first essentials
```css
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html{font-size:16px}                              /* 16px base = no iOS input zoom */
input,select,textarea{font-size:16px;min-height:var(--tap); ... }   /* 16px also stops zoom-on-focus */
@media (prefers-reduced-motion:reduce){ *,*::before,*::after{transition-duration:.01ms!important;animation-duration:.01ms!important} }
```

### Bottom sheet (lines 686–714) — phone slides up, desktop centers. Reuse verbatim.
```css
.sheet{position:absolute;left:0;right:0;bottom:0;background:var(--surface-raised);
  border-radius:20px 20px 0 0;max-height:90dvh;overflow-y:auto;
  padding:8px 16px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -6px 30px rgba(0,0,0,.55);
  -webkit-overflow-scrolling:touch;transform:translateY(100%);transition:transform .26s var(--ease)}
.overlay.open .sheet{transform:translateY(0)}
.sheet .grab{width:42px;height:5px;border-radius:3px;background:var(--line);margin:4px auto 6px}
@media (min-width:700px){
  .sheet{left:50%;right:auto;bottom:auto;top:50%;transform:translate(-50%,-46%);opacity:0;
    width:480px;max-height:86vh;border-radius:20px;transition:transform .24s var(--ease),opacity .18s ease}
  .overlay.open .sheet{transform:translate(-50%,-50%);opacity:1}
  .sheet .grab{display:none}
}
```

### Toast + inline UNDO (CSS lines 831–844; `toast()` lines 1834–1847) — keep, it nails the brief's "Undo on destructive actions"
```css
#toast{position:fixed;left:50%;transform:translate(-50%,10px);bottom:calc(86px + env(safe-area-inset-bottom));
  z-index:60;background:var(--ink);color:#fff;padding:11px 18px;border-radius:999px;font-size:.92rem;
  font-weight:600;box-shadow:0 4px 14px rgba(0,0,0,.3);opacity:0;pointer-events:none;max-width:88vw;text-align:center;
  transition:opacity .22s ease,transform .28s var(--ease)}
#toast.show{opacity:1;transform:translate(-50%,0)}
#toast .tact{margin:-8px -10px -8px 8px;padding:10px 12px;min-height:44px;border-radius:999px;color:#8fdde6;font-weight:800}
```
```js
function toast(msg, action){           // action = {label, onAction}
  var t = document.getElementById('toast'); t.textContent = msg;
  if (action && action.label) t.appendChild(h('button',{class:'tact',onclick:function(){
    t.classList.remove('show'); clearTimeout(toast._t); if (action.onAction) action.onAction(); }}, action.label));
  t.classList.add('show'); clearTimeout(toast._t);
  toast._t = setTimeout(function(){ t.classList.remove('show'); }, action && action.label ? 6000 : 2400);
}
```
The UNDO pattern that pairs with it (Add-line, lines 4331–4342): snapshot `commit.seq` at action time;
the toast's UNDO callback no-ops if `commit.seq` has moved on (any later commit makes the undo stale).
Reuse this exact "seq-guarded undo" for Fill/Pull/Remove in v7.

### Cards (lines 764–777)
```css
.batchCard{background:var(--surface-raised);border-radius:12px;padding:12px 14px;margin-bottom:12px}
.batchCard .bigsize{font-size:1.7rem;font-weight:800;font-family:'DM Mono','JetBrains Mono','Courier New',monospace}
.batchCard .ready{color:var(--c-ring);font-weight:800;font-size:.85rem}
.kv{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:.92rem}
.kv .k{color:var(--muted)} .kv .v{font-weight:600;text-align:right;overflow-wrap:anywhere}
.actGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
.actGrid .btn{min-height:56px;flex-direction:column;gap:3px}        /* big thumb-friendly action tiles */
```

### Needs-work "sonar ping" ring (CSS lines 461–467) — the brief's needs-work state
```css
.dot.work{animation:sonar-ping 2.2s ease-out infinite}
@keyframes sonar-ping{0%{box-shadow:0 0 0 0 rgba(192,57,43,.8)}70%{box-shadow:0 0 0 9px rgba(192,57,43,0)}100%{box-shadow:0 0 0 0 rgba(192,57,43,0)}}
.dot.rdy.work{animation:sonar-ping-rdy 2.2s ease-out infinite}     /* market-ready AND overdue */
@keyframes sonar-ping-rdy{0%{box-shadow:0 0 0 2px var(--c-ring),0 0 0 2px rgba(192,57,43,.8)}70%{box-shadow:0 0 0 2px var(--c-ring),0 0 0 11px rgba(192,57,43,0)}100%{box-shadow:0 0 0 2px var(--c-ring),0 0 0 2px rgba(192,57,43,0)}}
```
On the dense cell view the same states show as inset top/bottom edges (`.cellfill.rdy` teal top,
`.cellfill.work` red bottom — CSS lines 324–326), which reads better at cell density than a ping.

### Needs-work logic — `needsWork(cage)` (lines 2569–2577) + `lastWorked` (2558+)
```js
// future workDue suppresses the early ring; past workDue rings; no workDue → legacy 8-week untouched rule
if (cage.batch && isValidISO(cage.workDue)) return todayISO() > cage.workDue;
// else: rings when lastWorked() (growth/mortality/harvest, NOT a plain note) is > 8 weeks ago
```
The brief calls the interval the **neglect alert interval**, farm-configurable. index-6 hard-codes 8
weeks. v7: store it on the farm (e.g. `farm.alertDays`) and use it here instead of the constant.

### Rope-as-CSS (lines 399, 437, 537) — the braided longline between cages, no SVG needed
```css
background:repeating-linear-gradient(115deg,var(--rope-highlight) 0 4px,var(--rope-color) 4px 8px,var(--rope-shadow) 8px 10px);
/* .lineRow::before draws a 2px rope under each line at 16% opacity (line 537) */
```

---

## 6. IndexedDB / photo code

**None present.** index-6 has no photo capture, no IndexedDB, no `<input type="file" accept="image/*">`
for cages (the only file input is `#importFile` for backup JSON). Photos are a v7-new feature.

**Follow `PHOTOS-IMPLEMENTATION-PLAN.md` as the design** — it is sound and matches the brief:
- Separate IDB database `spatmapPhotos`, store `photos`, records `{id, blob, w, h, createdAt}`. **Never**
  base64 in the localStorage state (5MB quota; `save()` serializes the whole tree on every mutation).
- Capture via `<input type="file" accept="image/*">` (deliberately **omit** `capture="environment"` so
  iOS offers Take Photo / Photo Library), canvas-downscale to ≤1280px JPEG q≈0.72 (~150–300KB each),
  which also strips EXIF/GPS and converts HEIC.
- `photoField(existingIds)` capture widget + `photoStrip(ids)` read-only row + singleton
  `openPhotoViewer(ids, start)` full-screen viewer. Object URLs revoked at the single `renderSheet`
  choke point.
- Orphan sweep with a 10-minute grace window, run at boot + post-import only (not per mutation).
- Photos attach to **Events** and **Batch** as optional `photoIds: string[]`, carried onto the archive
  note when a cage is emptied — that is what makes the brief's "see photos across the oyster's whole
  life on the farm" work, since the event timeline survives restocking via `batchId`.

The plan's line references point at the *old* `index.html` (~4,259 lines), not index-6 — treat them as
"which function does what," not exact coordinates, since v7 is a fresh file anyway.

---

## 7. localStorage persistence + load/migration pattern

### Keys + root shape
```
localStorage key: 'cageTrackerData'        // line 1481; kept (not 'spatmapData') for back-compat
root: { v: 1, farms: Farm[], activeFarmId: string|null }     // line 1484
```

### `save()` (lines 2475–2478) — dead simple, copy it
```js
function save(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ toast('Could not save — storage may be full'); }
}
```

### `loadState()` (lines 2386–2474) — the migration pattern to emulate
The whole function is one defensive read: parse, bail to `freshState()` on anything malformed, then
**backfill every field additively** so old saves and exported backups always load. The reusable shape:
```js
function loadState(){
  try{
    var raw = localStorage.getItem(STORAGE_KEY); if (!raw) return freshState();
    var d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !Array.isArray(d.farms)) return freshState();
    d.v = 1;
    d.farms.forEach(function(f){
      // EVERY new field is a one-line "if missing/invalid → default" guard. Examples:
      if (typeof f.marketSizeMm !== 'number' || !(f.marketSizeMm > 0)) f.marketSizeMm = 76;
      if (!Array.isArray(f.batches)) f.batches = [];
      f.cageTypes.forEach(function(t){ if (typeof t.meshMm !== 'number' || !(t.meshMm > 0)) t.meshMm = null; });
      f.lines.forEach(function(l){
        l.cages.forEach(function(c){
          if (!Array.isArray(c.events)) c.events = [];
          if (c.batch === undefined) c.batch = null;
          if (!isValidISO(c.workDue)) c.workDue = null;
          if (typeof c.currentGrade === 'undefined') c.currentGrade = null;
        });
      });
    });
    if (!d.activeFarmId || !d.farms.some(function(f){return f.id===d.activeFarmId;}))
      d.activeFarmId = d.farms.length ? d.farms[0].id : null;
    return d;
  }catch(e){ return freshState(); }
}
function freshState(){ return {v:1, farms:[], activeFarmId:null}; }   // line 2380
```
Principles to carry into v7: keep `v:1` (additive fields need no version bump), guard every field,
never throw on bad data, and put one comment per migration line saying when the field was introduced.
There is no separate archive store — "archiving" = push a summary note Event + set `cage.batch = null`;
the `events` array is the permanent history. The photo plan's `delete d.photos` defense (never let a
photo-inlined backup reach localStorage) should be added here in v7.

### Export/import — `exportData()` (line 6965) + `#importFile` handler
One-click JSON download (`spatmap-backup-DATE.json`); import confirms with a scary-enough message and
`localStorage.setItem` + reload. The disaster-drill (export → wipe → import) passed in dogfooding
(Session 5). Reuse the pattern; add the photos-array branch from the photo plan.

---

## Old-app architecture map (so v7 builders know the shape)

### One file, no build, no framework
~7,227 lines: `<style>` (lines 19–~830) → `<template>` barge art (864–1300) → one big `<script>` of
plain ES5 (vanilla, `var`/`function`/`.then`, no classes, no async/await, no JSX). DOM built by a tiny
hyperscript helper `h(tag, attrs, ...kids)` (line 1772); icons are inline SVG strings via
`icon(name)` (line 1719) reading an `ICON_PATHS` table.

### State + render loop
- Single module global `state = {v, farms, activeFarmId}`; `getFarm()` returns the active farm.
- **Mutate → `commit()` → `save()` + `render()`.** `commit()` (line 3130) bumps a `commit.seq` (powers
  seq-guarded undo), saves, and re-renders the whole app from state. `persist()` saves without
  re-rendering. There is no virtual DOM; `render()` (line 3601) rebuilds `#app` from scratch each time.
- Bottom sheets are a parallel tiny system: `openSheet(buildFn)` / `refreshSheet()` / `closeSheet()`
  (lines 3089–3094); `renderSheet()` calls the stored build function. `closeSheet()` saves + clears
  transient edit flags + re-renders.
- The popup updates **out of band** via `syncPullPopup()` (no full re-render) so dragging stays smooth.

### Key functions by job
| Job | Function(s) | Line |
|---|---|---|
| Render everything | `render` | 3601 |
| Overview (all plots) | `viewMap` | 3653 |
| One plot | `viewPlot` | 3799 |
| One line's cage strip | `renderLine` | 3901 |
| Drag-select | `denseRangeSelect`, `pickMode` | 4083 / 4039 |
| Contextual popup | `renderPullFillPopup`, `syncPullPopup` | 4225 / 3397 |
| Barge | `renderBarge` | 4181 |
| Cage glyphs / piling | `shapeSVG`, `pilingSVG` | 2926 / 2894 |
| Growth model + chart | `growthModel`, `integrateGrowth`, `growthChartSVG` | 2651 / 2634 / 3015 |
| Status / color | `cageStatus`, `needsWork`, `lastWorked` | 2550 / 2569 / 2558 |
| Pull / Fill cycle | `pullSelectedCages`, `quickFillFromBarge` | 5432 / 5492 |
| Cage detail sheet | `buildCageSheet`, `buildBatchSummary` | 4695 / 5056 |
| Forms | `buildStockForm`, `buildEventForm`, `buildBulkEvent` | 4914 / 5163 / 6072 |
| Persistence | `loadState`, `save`, `freshState` | 2386 / 2475 / 2380 |
| Onboarding/layout | `buildFarmBuilder`, `buildAddLine` | 4374 / 4291 |

### Data shape (full schema is the comment block at lines 1480–1649; the parts v7 keeps)
```
Farm  { id, name, marketSizeMm, cageTypes[], areas[], lines[], grades[], site, batches[],
        harvestLog[], seedLog[], discardLog[] }
CageType { id, name, shape:'square'|'rect'|'circle', meshMm:number|null }   ← KEEP
Line  { id, name, section, order, cages[], pulled?:true }                   ← flatten "section"
Cage  { id, typeId, label, batch:Batch|null, events:Event[], currentGrade, workDue, detached?:true }
Batch { id, stockDate, ploidy, source, initialSizeMm, count, prep[], notes }
Event { id, type:'growth'|'mortality'|'harvest'|'note'|'sort', date, batchId, sizeMm?, count?, note? }
OnDeckBatch (the barge) { id, createdDate, count, grade, sizeMm, source, origin:{cageLabels,lineNames,date}, events[], notes, placed }
```
INVARIANT worth keeping (line 1544): pulling/emptying a cage preserves the line's position; only an
explicit "remove line from map" shifts other lines. The brief's "Remove → cage leaves, line stays" is
already the model.

---

## DROP LIST — clutter that must NOT come back

Each item is real in index-6 and fights the brief's SIMPLE-first, phone-first rule.

1. **Areas → Sections(Q1–Q4) hierarchy.** `Farm.areas[].sections[]` (schema 1520–1525), `flatSections`
   (2343), `sectionLabel`/`sectionLineCount`/`sectionLines`, `viewMap` plot cards, `openPlot`/`closePlot`
   (3577/3586), `curPlot`/`plotPushed` nav state. The whole "Acre → Quarter → Line" tree. Dogfood notes
   9, 11 are about pain this caused. Flatten to **Farm → Lines → Cages**, one scrollable list of lines.
   Drop `section`/`order`/`vert` from Line unless a flat optional grouping proves it stays simple.

2. **The sort-and-transfer wizard — delete entirely.** `startSortWizard` (5540), `buildSortSets` (5580),
   `buildSortReview` (5665), `commitSort` (5712), `gradeChips`/`newSortSet`/`sortPicking`/`isSortSource`/
   `sortPickOwner`/`sortDestCount`/`updateSortBar`/`renderSortBar`/`cancelSortWizard`, the `sortWiz`
   state, the `'sort'` branch of `pickMode`, the `'sort'` Event type, the `.sortsrc` cell class, and the
   second bottom bar that "looks identical to select mode" (dogfood notes 14, 15). This is the single
   biggest complexity sink. v7's Pull→barge→Fill (with even split) replaces it.

3. **The "place from on-deck" wizard as a separate mode.** `placeWiz` state, `placePicking`/
   `placeDestCount`/`commitPlace` (3426), `updatePlaceBar`/`renderPlaceBar`, the `'place'` branch of
   `pickMode`. v7 folds this into one thing: drag-select empty cages → popup `Fill` → `quickFillFromBarge`.

4. **Two competing action surfaces.** The bottom **selbar** (`.selbar` CSS ~620, `updateSelbar` 3393,
   `.selbar .go`) AND the floating popup both exist in index-6. Keep only the popup. Also the place bar
   and sort bar (items 2–3) — three different bottom bars total. One model only: **drag-select → popup**.

5. **NWS / tide / salinity conditions panel + station/gauge pickers.** `fetchWater` (1904),
   `fetchTides` (2000), `fetchWeather` (2044), `nearestTideStation`, `parseUsgsSiteList`,
   `buildStationPicker` (2224, "44 gauges distance-sorted"), `waterChipInner`/`updateWaterChip`/
   `refreshConditions`/`startConditionsAutoRefresh`, all the `*Cache` readers, `haversineMi`,
   `curStation`/`setStation`. Live conditions are a separate concern and a network dependency in an
   offline-first app. Cut for v7 (can return later as an isolated optional widget).

6. **Detached-spot states.** `cage.detached`, `cage_isDetached` (3286), the "No cage on this spot" peek,
   the dashed gap mark (`.cellfill.gap`), every `!c.detached` guard in `eligible`/filters. The brief's
   Remove makes a cage leave the line; there's no need for a third "spot exists but empty of a cage"
   state. Removing a cage should just shorten the line.

7. **The hover/click "peek" system (desktop-era).** `ensurePeek` (3151), `showPeek`/`hidePeek`/
   `buildPeekContent`/`peekWire`/`peekDotWire`/`cageTapped`, the overview mini-dots (`miniDots` 3718,
   9×9px tap targets — dogfood note 3) and their stopPropagation tangle (notes 4, 11). Phone-first means
   tap-a-cage-selects (drag to extend) and tap-the-barge-harvests. A separate hover-peek layer is desktop
   cruft that swallowed taps on phone.

8. **Method picker / "what kind of farm" step.** `FARM_METHODS`, `pickFarmMethod` (4368), the
   `forcePicker`/`pickerSkip` state and the methodGrid/methodCard/methodChip/methodNote UI in
   `buildFarmBuilder` (4386–4452). Onboarding should just ask lines × cages × cage-types(+mesh) +
   grades + market size + alert interval (brief section A). No system-taxonomy upsell.

9. **Multi-step / wizardy set sheets generally.** Anything that spreads one action across several
   screens with its own bottom bar. The brief wants bulk forms that are one sheet, prefilled dates,
   plain confirmation toast, undo. `buildBulkSheet` (5985) as a menu-of-actions is fine; the wizards are not.

10. **Vocabulary drift — pick one word per concept.** index-6 still says "Growth check" / "Log growth" /
    "Growth logged" for one act (dogfood notes 5, 16); "stock" vs "fill"; "on-deck batch" vs "barge";
    "section" vs "plot" vs "quarter"; "area" vs "acre". v7 vocab (from the brief): **Fill, Pull, Work,
    Harvest, Remove**; the working pile is the **barge**; Work sub-actions are past tense (**tumbled,
    washed, desiccated, flipped**) and the cage shows the **last thing that happened**. Use each word in
    exactly one place.

11. **Discard log + seed-reception-as-separate-flow + harvest-log duplication.** `discardLog`,
    `seedLog` co-created with batches, the dual harvest write paths (dedicated Harvest button writes a
    count, Log-work harvest writes null — schema 1608–1616). Keep ONE harvest log fed by the barge-tap
    harvest. Seed reception is just "Fill an empty cage with new seed" (brief step B); it doesn't need a
    parallel reception ledger.

12. **`sample` / `brightside` seeding scaffolding in the shipped app.** `loadSampleFarm` (7015),
    `loadBrightsideFarm` (7112), `clearSampleFarm` (7194), `BRIGHTSIDE_GRADES`, the sample banner. Fine
    as a dev fixture; should not ship as user-facing menu clutter. v7 onboards a real empty farm.

---

## Quick "keep / rebuild / drop" summary

- **Keep verbatim:** palette `:root`, sheet/toast/card/popup/dense CSS, `h()`/`icon()`/`uid()`/date
  utils, `toast()` + seq-guarded undo, `loadState`/`save` migration pattern, `growthModel` +
  `integrateGrowth` + `growthChartSVG` + the honest copy, `shapeSVG` + `pilingSVG` glyphs, the barge
  ART (`_barge-design.svg`), `denseRangeSelect`, `syncPullPopup` positioning, `pullSelectedCages` /
  `quickFillFromBarge` lineage logic.
- **Rebuild:** the barge pile so it GROWS with count (section 1 recipe); the popup trimmed to the brief's
  matrix; onboarding as the brief's plain layout form; the neglect interval as farm-configurable; photos
  per `PHOTOS-IMPLEMENTATION-PLAN.md` (new).
- **Drop:** everything in the DROP LIST above.
