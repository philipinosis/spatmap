# SpatMap v2 — Plot/Line View Design Audit

Audience: build agents implementing v2. Screenshot audited: `IMG_9282.png` (the
DOM-flow "work" view, farm "ppfarm", LINE 1–9). Code audited: `spatmap.html`
(`renderLine` ~2163, `renderCageCell` ~2192, `renderStatStrip` ~2126,
`renderTopBar` ~2075, glyphs `shapeSVG`/`pilingSVG` ~1851/1902, the SVG map
engine `LAYOUT`/`layoutTier`/`drawPlot`/`drawArea`/`drawCageCells` ~2769–4790).

**The one structural fact that drives everything below:** SpatMap already ships
a real pannable map. The overview is an SVG canvas with a single transformed
`#layoutWorld` group, pinch/pan, LOD tiers (`farm` `k<0.6` → `plot` `k<1.6` →
`area`), drill-in/back, and per-cage cells drawn straight onto the canvas
(`drawCageCells`). The screenshot is the *other* renderer — a vertical DOM flow
of `.lineRow` divs with a `position:fixed` barge. v2 is not a new map. v2 is
killing the DOM work-view and letting the canvas be the only surface. Most of
the "messy" diagnosis below is a symptom of running two renderers that don't
share a coordinate system.

---

## 1. Diagnosis — what reads as clutter, concretely

Numbered against the screenshot.

**D1 — The per-cage line-numbers are the single worst offender.** Under every
cage on LINE 2 sits a row of "2 2 2 2 2 2 2…", under LINE 3 "3 3 3 3…", and so
on. That is `renderCageCell`'s `.clabel` printing `cage.label` (`"2-1"`,`"2-2"`…
truncated to the leading line digit at this width). Thirty identical digits per
line, nine lines: ~270 redundant glyphs on one screen, all repeating the line
number that the eyebrow ("LINE 2") already states once. They form a gray
dotted band under each rope that competes with the cages for attention and reads
as noise, not data. This is the thing the farmer is pointing at.

**D2 — No vertical breathing room between lines.** `.lineRow{ padding:10px 0
14px }` plus a 7px head margin gives ~31px of gutter, but the `.clabel` row
(`bottom:-12px`) eats into it, so consecutive ropes nearly touch. Nine lines
stack into one undifferentiated grid. There is no sense of "one line is one
object." The repeating background ripple (`repeating-linear-gradient` 22px grid
in `.mapwell`) compounds this — a graph-paper field behind an already-dense grid
of cells reads as double grid, visually busy.

**D3 — Every cage is the same size, same weight, all the way across.**
`renderCageCell` makes each `.cellfill` `flex:1 1 0` at a fixed `height:30px`, so
30+ cages share the row width and each glyph is ~6–8px wide on a phone. At that
size the FlipFarm `shapeSVG` detail (spine, 5 ribs, hinges) is mush — you cannot
read mesh, you cannot tell fresh from mid from old reliably, and the status
edges (`inset 3px` teal/red top/bottom in `.cellfill.rdy/.work`) are sub-pixel.
The motif the farmer likes is being rendered at a size where its legibility is
destroyed. **Density is the root cause, not the glyph.**

**D4 — Weak hierarchy in the header stack.** Three horizontal bands stack at the
top: dark `topbar` ("ppfarm" + hamburger), then `statstrip`, then the map. In
the screenshot the stat strip is not even visible (farm has no stocked cages) so
the eye goes title → immediately into the grid with no orienting summary. When
populated, `statstrip` is a flat run of "12k oysters · 32 filled · 8 empty · …"
in one weight with `·` separators — readable but it competes with the eyebrows
for "what level am I at." Two different gray label systems (`.eyebrow` and
`.statstrip`) at similar size.

**D5 — The barge floats over content and reads as an unrelated sticker.** It is
`position:fixed; right:10px; bottom:12px`, drawn by `renderBarge`, hand-painted
warm SVG with two fishermen. Against the cool blue chart it is a different art
language (intentional — "its own warm world") but at bottom-right it overlaps
the end of LINE 8/LINE 9 and the "Barge empty" caption collides with the line
 propers. It does not sit *in the water*; it sits *on the glass*. On a pannable
map this is the right instinct (HUD object) but the current execution looks
pasted on.

**D6 — Pilings are nearly invisible and do no work.** `.linePiling` is 14×26px
at each rope end. At thumbnail size the weathered-piling `pilingSVG` (cap
ellipse, grain, mooring ring) collapses to a tan smudge. They cost width and
read as visual lint rather than as "this line is anchored here."

**D7 — Rope is thinner than the clutter it carries.** `.lineRope` is a 3px
braided gradient at `opacity:.9`, sitting *behind* `z-index:0` the cells. The
organizing line of the whole metaphor is the faintest element on screen; the
label-digit band (D1) is visually louder than the rope. The hierarchy is
inverted: the connective tissue should be the clearest spine.

**D8 — Color is doing almost nothing here because the farm is empty.** Every
cell is `--c-empty #3C5560` so the screen is a wash of slate-blue with no
status signal. This is honest (no oysters stocked) but it means the *only*
differentiation between rows is the digit band (D1). Remove the digits and an
empty farm becomes a near-featureless field — which tells you the empty state
needs its own treatment, not just the absence of color.

**Summary of the diagnosis:** clutter = (repeated per-cage labels) + (no row
rhythm) + (cages packed below their legible size) + (rope/piling losing the
hierarchy fight to that label band) + (a fixed barge sitting on top of the
content). Fix the labels and the density and 70% of the "messy" complaint
disappears.

---

## 2. The refined plot/line view

Keep the cage-on-a-rope motif. Make the rope the loudest line, the cages legible,
and labels appear once.

### 2.1 Labeling — the headline fix

- **Remove `.clabel` from the default render entirely.** Delete the per-cage
  digit. The line number lives in the line head only.
- **Address a cage by position within its line.** A cage is "LINE 3 · #7", never
  a repeated "3" under each cell. Position is implicit (left-to-right index); it
  surfaces on demand, not ambient.
- **Show a cage's number only on interaction:** on tap/drag-select, the selected
  cage(s) get a single floating chip ("3 · 7" or "3 · 7–12" for a range) anchored
  to the selection — reuse the existing `.dragBand` + a label. Never 30 at once.
- **Tens ticks instead of per-cage labels.** Under each rope, draw a faint tick +
  small number every 10 cages (`10`, `20`, `30`). That gives the farmer "where am
  I along the line" with 3 marks instead of 30. Style: `--ink-3`, `9px`, tick
  1px `--hair-strong`. This is the only ambient numbering on the row.

### 2.2 Spacing scale (8px base, the tokens already imply it)

| Slot | Value | Token |
|---|---|---|
| Row outer gutter (between lines) | 20px | new `--row-gap:20px` |
| Eyebrow → rope | 8px | `--gap` ÷ 2 |
| Rope → tens-tick row | 6px | — |
| Cage gap within strip | 4px | bump `.cageStrip gap 3→4` |
| Strip side padding (rope inset) | 10px | clears pilings |

Net: each line becomes a visually discrete band with real air above and below.
Drop the `.mapwell` ripple grid *behind line rows* (keep it only in open water /
between plots) so we stop stacking grid-on-grid (D2).

### 2.3 Cage cell — size, density, states

- **Density target: 12–16 cages legible per row on a 390px phone.** Below that,
  cages are too small to read status; above it you are back to mush (D3). A
  30-cage line is therefore *not* shown all-at-once at the work zoom level — it
  is shown in the line's own frame where horizontal pan reveals the rest, OR the
  line wraps to a known max and the overflow is reachable by scrolling the strip.
  Pick **horizontal-pan-within-the-canvas** (see §3) so it stays one continuous
  surface. At the fitted "whole plot" zoom, cages collapse to status pips (see
  §3 zoom model); full glyphs only appear once zoomed enough that ≤16 fit.
- **Cell size at work zoom:** min cell width 18px, target 22–26px, height 28px,
  `--radius` 3px (unchanged). At 22px the FlipFarm glyph's spine+ribs read.
- **States (all already have tokens — reuse, do not invent):**

| State | Fill | Edge / mark | Token |
|---|---|---|---|
| Empty | `--c-empty #3C5560` | none | exists |
| Fresh (<6mo) | `--c-fresh #51B97B` | none | exists |
| Mid (6–12mo) | `--c-mid #D38C33` | none | exists |
| Old (>12mo) | `--c-old #CB5A2F` | none | exists |
| Market-ready | status fill + **teal top inset** `--c-ready` | `box-shadow:inset 0 3px 0` (exists, `.rdy`) | exists |
| Needs-work | status fill + **red bottom inset** `--c-work` + corner wrench | `.work` + `.workmark` (exists) | exists |
| Selected | white inner outline + teal ring | `.cage.sel` (exists) | exists |

  Keep the inset-edge convention — it is a good system. Just make the cells big
  enough (above) that a 3px inset is visible. **Thicken status edges to 4px** at
  work zoom since cells are larger.

### 2.4 Rope & piling

- **Rope is the spine: 4px, `opacity:1`, drawn ON TOP visually heavier.** Keep the
  braided gradient (it is liked) but raise contrast so it is the clearest
  horizontal element on the row. The cages hang *from* it; right now they bury it.
- **Pilings: simplify to a single bold post + cap, no grain/ring at this size.**
  Make them 16px wide, full row height, `--piling` with a darker `--piling-ring`
  fouling band at the waterline. They should read as two firm bookends that say
  "this line is anchored." Drop the mooring-ring circle (invisible, D6).
- **A line with 0 cages** keeps the rope + pilings + the "No cages — tap ⋯ to
  add" centered hint (exists, fine). An *empty* line (cages present, none stocked)
  shows the cages in `--c-empty` — but see §2.6.

### 2.5 Stat strip & header

- **Header (`topbar`):** when inside a plot, the title becomes the **plot name**,
  not the farm name, with a back-affordance that is really "pan out" (§3). Keep
  the existing scoped back-chip pattern (`renderTopBar` already builds
  `scopeBack` with plot · area). Drop the farm name to a smaller eyebrow above it
  or into the menu. One H1 per screen: the plot you are in.
- **Stat strip:** keep it, tighten it, and make it *scope-aware* (it already is —
  `renderStatStrip` counts `linesInArea` when scoped). Lead with the two numbers
  that drive action: **ready** and **needs-work**, colored (`--teal`,`--c-work`),
  then the quieter totals. Order: `▲ 8 ready · ⚑ 3 work · 1.2k oysters · 32
  filled · 8 empty`. Give ready/work a leading status dot so they read as
  status, not just bold text. Reduce to one weight for the quiet totals.
- **Empty farm:** when nothing is stocked, replace the stat strip with a single
  quiet line "Nothing stocked yet — drag across a line to fill." This is the
  empty-state fix for D8.

### 2.6 Empty-state texture (D8)

An all-empty plot must not be a featureless slate field. Give empty cages a
**hairline outline only** (`--c-empty` fill at 70%, 0.8px `--hair-strong`
stroke) so the *grid of slots* is legible as structure even with no color. The
rope + pilings + tens-ticks carry the rest. The screen should read as "an
organized empty rack waiting to be filled," not "gray static."

---

## 3. The coherent-map visual system

This is the headline of v2: one seamless, Google-Maps-style canvas. The engine
exists (`LAYOUT.view` k/tx/ty, `applyView`, pinch/pan, LOD tiers, drill). v2's
design work is (a) extend tiers down to the legible-cage zoom, (b) make plots
tile with water gutters so neighbors are discoverable, (c) retire the separate
DOM work-view so panning never hits a "screen boundary," (d) re-home the barge as
a true HUD.

### 3.1 The zoom-level model (extend the existing 3 tiers to 4)

The current tiers stop at `area` (`k≥1.6`) and per-cage cells appear there. v2
adds an explicit **work** tier so the legible-cage view from the screenshot is
just "zoomed all the way in," not a separate page.

| Tier | k range | What it shows | Maps to current |
|---|---|---|---|
| **Farm** | `k < 0.6` | Plot cards tiling on water, name + area/line count + status roll-up bar. Cages = invisible or single density wash. | `'farm'` (exists) |
| **Plot** | `0.6 ≤ k < 1.6` | One plot fills most of viewport; its areas + line strokes; cages as **status pips** (colored dots, no glyph detail). | `'plot'` (exists) |
| **Area** | `1.6 ≤ k < 3.2` | Lines as ropes; cages as small glyphs; tens-ticks; ≤~16 cages legible across, pan horizontally for the rest. | `'area'` (exists, extend) |
| **Work** | `k ≥ 3.2` (new) | The screenshot view at correct size: 22–26px glyphs, status edges, drag-select, tap-for-detail. | NEW threshold |

Add `LOD_WORK = 3.2` beside `LOD_PLOT`/`LOD_AREA`. `layoutTier()` gains a fourth
branch. `drawCageCells` already caps detail by tier — extend it so glyph detail
(full `shapeSVG`) renders only at `work`, pips at `plot`/`area`, nothing at
`farm`. This keeps the canvas performant on big farms (the `CELL_MAX 300` cap
logic stays).

**Consequence:** the DOM `.lineRow` renderer (`renderLine`/`renderCageCell`) is
retired. The "work view" becomes the canvas at `work` zoom. Drag-select, the
barge, and detail popups all live on the one canvas. No back button — zooming out
*is* back; panning sideways *is* the next plot.

### 3.2 How plots tile — gutters, water, labels

- **Water channels between plots.** Plots sit on the dark `--paper-2` water with
  a **24–40px world-unit channel** between adjacent plot cards. Render the ripple
  grid *only in these channels and the open margins* (not under line rows, §2.2),
  so water reads as water and a plot reads as a calm card lifted off it
  (`drop-shadow` exists on `.lp-plotcard`). The channel is the visual "you can
  pan through here to the next plot."
- **Plot card = the frame that makes neighbors discoverable.** A plot card is a
  rounded `--surface` rect (exists). Its edge is the seam. When zoomed into a
  plot at `plot`/`area` tier, **leave the neighboring plot's edge visible at the
  viewport margin** — a sliver of the next card + its name label peeking in from
  the right/left tells the farmer "more farm that way." Do not fit a plot edge-to-
  edge with no neighbor showing; reserve ~8% viewport margin so a neighbor sliver
  is always in frame when one exists.
- **Plot label:** top-left corner tab (exists in `drawPlot`: name @14px bold +
  "N areas · M lines" subtitle @11px). Keep. Make the name **stay legible at
  every zoom** via counter-scaling (§3.6).
- **Status roll-up bar** along each plot's bottom edge (exists,
  `drawPlotRollup` — proportional fresh/mid/old/empty segments + work/ready end
  dots). This is excellent and is the farm-tier "what's in this plot" glance.
  Keep verbatim.

### 3.3 Pan & zoom affordances

- **Pinch + drag pan** (exists). Keep.
- **Bottom-left zoom cluster** `+`/`−` (exists `.lp-zoom`). Keep; it is the
  discoverable affordance for non-pinchers.
- **Double-tap a plot → smooth zoom-to-fit that plot** (the drill, exists as
  `.lp-drillOv`/`drillIntoArea` cross-fade). Reframe it: double-tap is "zoom to
  this plot's work tier," not "enter a screen." Same animation, new mental model.
- **Edge-pan discovery:** when a plot is fitted, the visible neighbor sliver
  (§3.2) is the affordance — no chrome needed. A first-run coachmark
  ("drag to the next plot →") can ride the existing `.lp-zoomhint` pill pattern.
- **Inertia on pan** so it feels like a map, not a scroll container.

### 3.4 Minimap / overview transition

- **No persistent minimap.** It costs screen and the zoom-out gesture already is
  the overview. Instead: a **breadcrumb pill** top-center showing current scope
  ("ppfarm › North Plot") that, tapped, zooms out one tier. This replaces the
  segmented `[Overview | Work]` toggle (exists `.ovSeg`) with a spatial,
  zoom-based equivalent. The toggle can stay as a fallback for users who prefer a
  button, but the *primary* model is continuous zoom.
- **Tier transition is a zoom, always animated** (the cross-fade exists). Crossing
  a tier boundary (`scheduleApplyView` → `layoutRedraw` on tier change, exists)
  swaps detail level. Make the swap a **brief opacity cross-fade per detail layer**
  (pips fade out as glyphs fade in) so it reads as "resolving," like map labels
  appearing, not a hard redraw flash.

### 3.5 The barge on a pannable canvas

- **Barge becomes a true HUD object, fixed to the viewport, not the world.** It
  stays `position:fixed` (exists) but gets a **safe dock**: bottom-right with a
  reserved gutter so it never overlaps line ends (the desktop `padding-right`
  reservation pattern at `@768px` exists — generalize it to a world-margin so
  content never slides under the barge on mobile either).
- **Visually moor it to the water, not the glass.** Add a soft radial "wake"
  shadow under the hull on the canvas so it reads as floating *in* the scene even
  though it is screen-fixed. Keep the warm hand-painted art (its own world is the
  right call) and the bob animation.
- **It is the cross-plot carry.** Because the map is now seamless, the barge's job
  ("pull from any line, carry, fill elsewhere") spans plots naturally — you pull
  on one plot, pan to another, fill there, all on one surface. Its pill caption
  ("Barge empty" / "1.2k from Line 1 · 1-2") stays; dock it ABOVE the hull so it
  never collides with content below (D5).
- **Tap the barge** = harvest / dump (exists). On the seamless canvas, tapping
  while panned over open water is unambiguous since the barge is HUD-fixed.

### 3.6 Keeping labels legible at every zoom

The core trick of map UIs. Implement **counter-scaling** for text and chrome:
draw plot names, area labels, tens-ticks, status pips, and handles at a size
divided by `LAYOUT.view.k` (the code already does this for handles:
`stroke-width:1.5/LAYOUT.view.k`, `dot:7/LAYOUT.view.k`). Generalize:

- Plot name: clamp to 12–18px *screen* px regardless of k.
- Tens-ticks + cage detail: only rendered in their tier's k-band, so they are
  always near their design size.
- Status pips at `plot` tier: fixed screen radius (~5px), so a 200-cage plot
  zoomed out shows a readable dot field, not sub-pixel specks.

### 3.7 ASCII wireframes

**Farm tier (`k<0.6`) — plots tiling on water:**

```
 ┌───────────────────────────────────────────────┐
 │  ppfarm                                    [≡] │   topbar (HUD)
 ├───────────────────────────────────────────────┤
 │ ░░░░░░░░░░░░░░░░ open water (ripple) ░░░░░░░░░░ │
 │ ░ ┌─────────────┐  channel  ┌─────────────┐ ░ │
 │ ░ │ NORTH PLOT  │  ░░░░░░░░  │ EAST PLOT   │ ░ │
 │ ░ │ 2 areas·40ln│  ░░░░░░░░  │ 1 area·22ln │ ░ │
 │ ░ │ ════ lines  │  ░░░░░░░░  │ ════ lines  │ ░ │
 │ ░ │ ▓▓▓▒▒░ ◀roll │  ░░░░░░░░  │ ▓▓▓▓▒ ◀roll │ ░ │
 │ ░ └─────────────┘  ░░░░░░░░  └─────────────┘ ░ │
 │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
 │ ░ ┌─────────────┐                             │
 │ ░ │ SOUTH PLOT  │           ┌──────┐ barge → │
 │ ░ │ ...         │           │ ⛵ HUD │  (fixed)│
 │  [+][−]                     └──────┘  Barge…  │
 └───────────────────────────────────────────────┘
```

**Work tier (`k≥3.2`) — inside a plot, neighbor sliver visible:**

```
 ┌───────────────────────────────────────────────┐
 │  ‹ ppfarm › NORTH PLOT                     [≡] │   breadcrumb = zoom out
 │  ▲8 ready · ⚑3 work · 1.2k oysters · 32 filled │   scope-aware stat strip
 ├───────────────────────────────────────────────┤
 │ LINE 1                                     ⋯  ║ ← neighbor
 │ ▌▓▓▓▒▒░░▓▓▓▒▒░░▓▓▓▒▒░░▓▓▓▒▒▌  ·10  ·20  ·30  ║   plot
 │ ══════════════════════ rope ══════════════   ║   edge
 │                                               ║   peeks
 │ LINE 2                                     ⋯  ║   in
 │ ▌░░░░░░░░░░░░░░░░░░░░░░░░░░░░▌  ·10  ·20      ║   (pan →)
 │ ══════════════════════ rope ══════════════   ║
 │                                               ║
 │ LINE 3                                     ⋯  ┌──────┐
 │ ▌▓▓▓▓▓▓▒▒▒▒░░░░  [3·7–12 selected]▌          │ ⛵ HUD │
 │ ══════════════════════ rope ══════════════   │ Barge │
 │                              [drag-band]      └──────┘
 └───────────────────────────────────────────────┘
   ▌ = piling   ▓ fresh ▒ mid ░ empty   ·N = tens tick
```

---

## 4. Design tokens & spec

Reuse the existing `:root` system (lines 18–97). It is well-built; do not invent
a palette. Additions are marked NEW.

### 4.1 Color — already present, just apply correctly

```
--paper        #0C1A20   canvas base
--paper-2      #0F2129   water well / map canvas
--surface      #152C35   plot card fill
--surface-sink #112730   area body fill
--hair         #243E48   / --hair-strong #345462   borders, ticks
--ink #E8F1F2 / --ink-2 #9FB6BC / --ink-3 #6E888F   text 3-step
--teal #34B3C4 (ready/primary) · --teal-tint #14323A
CAGE STATUS:  --c-empty #3C5560 · --c-fresh #51B97B · --c-mid #D38C33
              --c-old #CB5A2F · --c-ready #34B3C4 · --c-work #E65A40
ROPE/GEAR:    --rope #8A6A40 · --rope-hi #B18B53 · --rope-shadow #5E4528
              --piling #6E5436 · --piling-top #8B6D47 · --piling-ring #3A2A18
BARGE:        --barge-amber #D89B43 · --barge-amber-ink #EFC98E
```

### 4.2 Type scale (extend the existing roles)

| Role | Spec | Where |
|---|---|---|
| Plot H1 (topbar title) | 800 18px | exists `.lp-title` |
| Eyebrow (LINE N) | 700 12px / .10em caps `--ink-2` | exists `.eyebrow` |
| Stat strip | 600 13px `--ink-2`, numbers `--font-num` 700 | exists `.statstrip` |
| Tens-tick number | 700 9px `--ink-3` | NEW, replaces `.clabel` |
| Selection chip | 700 11px on `--teal-tint` | reuse drag-band label |
| Plot label on canvas | 700 14px, counter-scaled 12–18 screen px | exists `.lp-plotlabel` |

### 4.3 Spacing / radius / metrics

```
--row-gap        20px   NEW  (between line rows in work tier)
--gap            16px   exists
cage gap          4px   (.cageStrip gap: 3 → 4)
strip side pad   10px   (clear pilings)
--radius         16px   cards/sheets (exists)
--radius-sm      11px   buttons (exists)
cage radius       3px   (exists)
--tap            48px   touch target (exists) · --tap-min 44px
piling           16 × full-row-height  (was 14×26)
status edge      4px inset (was 3px) at work tier
plot channel     24–40px world units between plot cards   NEW
neighbor margin  ~8% viewport reserved so a neighbor sliver shows  NEW
```

### 4.4 Zoom / LOD

```
ZOOM_MIN 0.2 · ZOOM_MAX 8                      (exists)
LOD_PLOT 0.6 · LOD_AREA 1.6                    (exists)
LOD_WORK 3.2                                    NEW — glyph-detail threshold
layoutTier(): k<0.6 farm · <1.6 plot · <3.2 area · else work
cage detail by tier: farm=none · plot=pip · area=small-glyph · work=full-glyph
CELL_MAX 300 perf cap                          (keep)
```

### 4.5 Cage cell states (CSS, all tokens exist)

```
empty   fill --c-empty,   0.8px --hair-strong outline   (NEW outline for texture)
fresh   fill --c-fresh
mid     fill --c-mid
old     fill --c-old
ready   + box-shadow: inset 0 4px 0 --c-ready      (was 3px)
work    + box-shadow: inset 0 -4px 0 --c-work  + corner wrench --c-work
sel     outline 2.5px #fff inset + 2px --teal ring   (exists, keep)
pip (plot tier)  fixed 5px screen-radius dot in status color, no glyph
```

---

## 5. Prioritized punch list

Do in this order. Items 1–4 fix the "messy" complaint on the existing view and
are shippable independently. Items 5–9 build the seamless map.

1. **Kill the ambient per-cage labels (D1).** Remove `.clabel`/`cage.label` from
   `renderCageCell`'s default output. Biggest single visual win. *(small)*
2. **Add tens-ticks under each rope (§2.1).** One faint tick+number every 10
   cages, `--ink-3` 9px. Replaces the deleted labels with 3 marks, not 30. *(small)*
3. **Re-space the rows (§2.2).** `--row-gap:20px`, drop the ripple grid behind
   line rows, raise rope to 4px/opacity 1, simplify pilings to bold posts. Cages
   read, rope leads, lines become discrete bands. *(small)*
4. **Fix the cage size / density (§2.3).** Target 12–16 legible cages per row;
   cells 22–26px; thicken status edges to 4px; add empty-cage hairline outline
   (D8); ready/work edges visible. *(medium)*
5. **Tighten the header + stat strip (§2.5).** Plot name as H1, stat strip leads
   with colored ready/work + status dots, empty-farm gets its own one-line CTA. *(small)*
6. **Re-dock the barge (§3.5).** Reserve a world-margin so content never slides
   under it; move the caption above the hull; add a wake shadow. *(small)*
7. **Add the `work` zoom tier (§3.1).** `LOD_WORK 3.2`, fourth `layoutTier`
   branch, glyph-by-tier in `drawCageCells` (pip → small glyph → full glyph).
   This is the pivot that makes the canvas the only renderer. *(medium)*
8. **Retire the DOM `.lineRow` work-view (§3.1).** Render lines+cages on the
   canvas at the `work` tier; move drag-select, detail popups, and the barge onto
   the one surface. Remove `renderLine`/`renderCageCell`/`.mapwell` flow. *(large)*
9. **Tile plots with water channels + neighbor slivers + breadcrumb (§3.2–3.4).**
   24–40px channels, reserve ~8% viewport margin so a neighbor edge always peeks,
   breadcrumb pill replaces the Overview/Work toggle as the primary zoom-out,
   counter-scale all canvas labels (§3.6), inertia + per-layer cross-fade on tier
   change. The seamless-map payoff. *(large)*

**Sequencing note:** ship 1–6 first as a "clean up the work view" release — it
directly answers the farmer and de-risks the big refactor. Then 7–9 deliver the
one-pannable-map concept on top of an already-clean line view.
