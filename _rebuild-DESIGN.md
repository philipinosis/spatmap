# SpatMap v7 — Design System (AUTHORITATIVE for visual + interaction)

For the builder of the single-file vanilla-JS app. Pairs with `_rebuild-PRODUCT-BRIEF.md` (workflow,
the spec) and `_rebuild-HARVEST-KIT.md` (the code/art parts bin). Where this doc and the harvest kit's
palette disagree, **this doc wins** — the kit's `:root` is the *old* dark-on-dark scheme that Philip
called cluttered and that washes out in sun. We are changing it on purpose. The barge ART, the cage
glyph *geometry*, the growth chart, and the drag-select interaction carry over; their *colors* are
re-tokenized to the palette below.

Phone-first (390×844). iPad-aware (notes inline). Read section 7 (the simplicity rule-set) before
building anything — it is the part that keeps the clutter from coming back.

---

## 1. Aesthetic direction

**A nautical chart you can work from, not an aquarium you look into.** The old app painted dark cages
on dark water — pretty on a desk, illegible in Gulf sun, and the moment it filled with Acres, Quarters,
and dot-grids it read as noise. v7 flips the figure and ground: the **canvas is paper-pale** (a sun-bleached
working chart), and **color is spent only where it carries meaning** — the green of a living oyster, the
copper of one going long in the water, the red of one you've neglected, and the warm teal-and-amber of
the barge that does the day's work. Everything is flat, ink-edged, and high-contrast, like a laminated
field map or a depth chart clipped to the console: thin confident strokes, generous white space, one
loud thing per screen. The water is not a photographic gradient; it is the faint engraved ripple of a
chart, present but quiet. The single indulgence — the one place we spend boldness — is the **illustrated
barge with its two fishermen**, a hand-drawn object that floats at the edge of the working map and visibly
heaps higher as you pull oysters onto it. It is the soul of the app and the reward for doing the work; we
keep its hand-drawn warmth verbatim and let everything else stay disciplined around it. The point of view:
this is an **instrument**, not an app — sized for a wet thumb and a squinting eye, calm enough to trust,
specific enough to feel like it was built for oyster farmers and no one else.

Three things this is deliberately **not**: not the dark-teal aquarium of v1–v6; not a Bootstrap card
deck with a teal gradient CTA; not the AI-default cream-paper-with-a-serif look — our paper is cooler
and bluer (chart stock, not book stock), the type is a humanist grotesque not a serif, and the warmth
lives in the gear, not the background.

---

## 2. Color palette

Light-first. The reasoning: a phone at noon on open water is the worst-case display — glare, low effective
contrast, polarized sunglasses cutting a stop of brightness. A pale canvas with dark ink survives that;
dark-on-dark does not (the v6 overview proves it — green cages on teal water sit ~1.3:1 and vanish).
So the **map background is light**, text is near-black ink, and the saturated hues are reserved for the
small, meaningful objects (cages, the barge, alerts) where a hit of color does real work.

Legibility comes from the **ink edge**, not the fill. Every cage glyph is stroked in `--cage-stroke`
(deep ink), which holds ≥ 4.4:1 against even the lightest status fill and far more against the pale ones —
so a cage's *shape* reads in glare regardless of its color. Text everywhere clears WCAG AA on its surface
(ink 13.2:1, ink-2 6.5:1, white-on-teal 4.9:1, amber-ink 5.0:1; ink-3 3.3:1 is large-text/hint only). The
status *fills* are not text and intentionally sit below 4.5:1 against paper (`--c-fresh` ~3.0, `--c-mid`
~2.9, `--c-old`/`--c-work` ~4.7) — they read as color-coded objects, and the ink stroke does the
heavy-contrast work. The two "growing" states stay distinguishable under red-green color-vision deficiency
because they differ in *lightness AND hue family* (green vs copper-orange), not hue alone; needs-work adds
motion + an icon, never color alone.

```css
:root{
  /* ── CANVAS / PAPER (the working chart) ───────────────────────────── */
  --paper:        #EAF1F2;   /* app background — cool sun-bleached chart stock (not cream) */
  --paper-2:      #DCE7E9;   /* the map well — a hair deeper so the chart reads as a surface */
  --chart-line:   #B7CBCE;   /* engraved water ripple / hairline rules on paper */
  --surface:      #FFFFFF;   /* cards, sheets, popups — clean white paper on the chart */
  --surface-sink: #F3F7F7;   /* inset wells inside a card (kv blocks, chart frame) */
  --hair:         #CBD9DB;   /* 1px dividers, input borders, card edges */
  --hair-strong:  #9DB3B6;   /* a firmer edge when a white card sits on white */

  /* ── INK (text) ───────────────────────────────────────────────────── */
  --ink:          #0C2A30;   /* primary text — deep brackish near-black, ~13:1 on --paper */
  --ink-2:        #3D5A60;   /* secondary text / labels — ~6.3:1 on --paper */
  --ink-3:        #6E878C;   /* tertiary / hints / placeholder — ~3.4:1, large text only */

  /* ── BRAND / PRIMARY ACTION ───────────────────────────────────────── */
  --deep:         #0A2E38;   /* top bar, nav, deep chrome — the one dark anchor */
  --teal:         #0E7C8B;   /* primary action (Fill-context, links, focus) — darkened for AA on white */
  --teal-press:   #0A616E;   /* pressed/active */
  --teal-tint:    #DDEFF1;   /* teal button's quiet/tinted background */

  /* ── CAGE / OYSTER STATUS (the meaningful color) ──────────────────── */
  --c-empty:      #C3D2D4;   /* empty cage — pale slate, clearly "nothing living here" */
  --c-empty-ink:  #5A7176;   /* glyph strokes/label on an empty cage */
  --c-fresh:      #2E9E5B;   /* filled, young (<6mo) — living-oyster green */
  --c-mid:        #C97A1E;   /* filled, mid (6–12mo) — oxidized-copper, going long */
  --c-old:        #B4471F;   /* filled, old (>12mo) — deep rust, well past due to move */
  --c-ready:      #0E7C8B;   /* market-ready ring — same teal as actions = "ready to act on" */
  --c-work:       #C8341E;   /* needs-work — alert vermilion (distinct from old-rust by lightness) */
  --c-work-soft:  #F6D9D3;   /* needs-work tint fill behind a card/badge */

  /* Filled-cage GLYPH ink — each status gets a darker stroke of its own family for the gear lines */
  --fresh-ink:    #1C6E3D;
  --mid-ink:      #8F560F;
  --old-ink:      #7E2F12;

  /* ── BARGE (its own warmer world — keep this character) ───────────── */
  --barge-amber:  #C8852A;   /* the barge's accent: ropes, count pill, cleats */
  --barge-amber-ink:#9A6312; /* amber text that needs AA on white */
  --barge-hull:   #2D5A42;   /* (used inside the SVG art only — see §5) */

  /* ── FEEDBACK ─────────────────────────────────────────────────────── */
  --danger:       #C8341E;   /* destructive (Remove) — same vermilion as needs-work */
  --ok:           #2E9E5B;   /* success ticks — same green as fresh */
  --toast-bg:     #0C2A30;   /* dark toast on the pale app = its own high-contrast layer */

  /* ── GEAR / WATER tokens used by glyphs + map (re-tokenized warm-on-pale) ── */
  --water-ripple: #B7CBCE;   /* engraved ripple stroke on the map well */
  --rope:         #B98A4E;   /* the longline between cages (manila tan, darker for pale bg) */
  --rope-shadow:  #8A6334;
  --rope-hi:      #D8B988;
  --piling:       #7A5A3A;   /* piling wood */
  --piling-top:   #9A744A;
  --piling-ring:  #4A3520;   /* fouling band */

  /* glyph internals — these names match the harvest-kit's shapeSVG()/pilingSVG() var() calls */
  --cage-stroke:  #0C2A30;   /* every cage glyph is INK-edged for sun legibility */
  --cage-mesh:    rgba(12,42,48,.42); /* mesh hint lines — ink at low alpha, reads on any fill */
  --cage-float:   rgba(12,42,48,.10); /* pontoon strip */
  --cage-status-dot: var(--c-ready);

  /* ── METRICS ──────────────────────────────────────────────────────── */
  --tap:          48px;      /* primary tap-target floor (brief says ≥44; we use 48 — wet thumbs) */
  --tap-min:      44px;      /* absolute minimum, only for secondary controls */
  --radius:       16px;      /* cards / sheets */
  --radius-sm:    11px;      /* buttons / inputs / chips */
  --radius-pill:  999px;
  --gap:          16px;      /* base rhythm unit (see §4) */
  --shadow-card:  0 1px 3px rgba(12,42,48,.10), 0 4px 16px rgba(12,42,48,.07);
  --shadow-pop:   0 8px 28px rgba(12,42,48,.20);
  --shadow-sheet: 0 -10px 40px rgba(12,42,48,.22);
  --ease:         cubic-bezier(.22,1,.36,1);  /* keep — calm, confident deceleration */
}
```

### Semantic color, at a glance (the only color rules that matter)
| Meaning | Token | Where it shows |
|---|---|---|
| Empty cage (nothing living) | `--c-empty` + `--c-empty-ink` | pale slate fill, ink mesh lines |
| Filled, young (<6mo) | `--c-fresh` | living green |
| Filled, mid (6–12mo) | `--c-mid` | copper — reads "getting on" |
| Filled, old (>12mo) | `--c-old` | rust — reads "move me" |
| Market-ready | `--c-ready` (teal) ring | teal edge = "ready to act" |
| Needs work (overdue) | `--c-work` + motion + icon | vermilion edge, sonar ping, wrench glyph |
| Primary action / Fill-from-seed | `--teal` | filled teal button |
| Pull (off the line, onto barge) | `--barge-amber` | amber-tinted button (matches barge) |
| Remove / destructive | `--danger` | outlined-red button (never solid-red by default) |
| The barge & its pile | `--barge-amber` chrome, warm SVG | the one illustrated object |

**Color-alone is never the only signal.** Market-ready = teal edge **+** a small "✓ market" tag on the
cage sheet. Needs-work = vermilion **+** sonar ping **+** wrench icon **+** "overdue 3d" text. A farmer in
sunglasses with deuteranopia must still be able to run the app.

---

## 3. Typography

No webfont downloads (offline-first, single file, instant render). The system stack is the type system.
The personality comes from **weight contrast and a monospaced instrument face for every number** — sizes
of oysters, counts, dates, mm/day are *data read at a glance from arm's length*, so they get a tabular,
even-width face. That mono-for-data choice is the typographic signature; it makes the app read like an
instrument panel, not a content app, and it is the opposite of the AI-default serif-display look.

```css
:root{
  /* humanist system sans — body & UI. (SF on iOS, Segoe/Roboto elsewhere) */
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  /* the instrument face — ALL numeric data. ui-monospace = SF Mono on iOS/Mac, no download */
  --font-num: ui-monospace, "SF Mono", "DM Mono", "JetBrains Mono", Menlo, Consolas, monospace;
}
html{ font-size:16px; -webkit-text-size-adjust:100%; }  /* 16px base = no iOS input-zoom; never go below 16 on inputs */
body{ font-family:var(--font-ui); color:var(--ink); font-weight:450;
      -webkit-font-smoothing:antialiased; letter-spacing:-0.005em; }
```

### Type scale (phone)
| Role | size / line-height / weight | family | use |
|---|---|---|---|
| Screen title | `22px / 1.15 / 800` | ui | "Brightside", sheet titles. Tight, heavy, confident. |
| Section eyebrow | `12px / 1 / 700`, `letter-spacing:.10em`, UPPERCASE, `--ink-2` | ui | "LINE 3", "HARVEST LOG". The only uppercase in the app. |
| Body | `16px / 1.45 / 450` | ui | sheet copy, list rows. 16 is the floor everywhere. |
| Button label | `16.5px / 1 / 750` | ui | popup + sheet buttons. Heavy enough to read in glare. |
| Hero number | `34px / 1.0 / 700`, `letter-spacing:-.02em` | **num** | the big size on a cage sheet ("61 mm"), barge count. |
| Data value | `16px / 1.3 / 600` | **num** | every mm, count, rate, date in a key/value row. |
| Micro-label | `11px / 1.2 / 700`, `letter-spacing:.06em`, UPPERCASE, `--ink-3` | ui | cage IDs on the map ("1-3"), chart axis caps. |
| Hint / footnote | `13px / 1.4 / 500`, `--ink-2` | ui | the honest projection copy, helper text. |

Rules: **numbers are always `--font-num`.** Use `font-variant-numeric: tabular-nums` on any column of
numbers so digits don't jitter as values change. One weight step does the work of a color or a box —
prefer making something `750` over boxing it. Never use more than the title weight (800) — heavier reads
as shouting on a small pale screen.

iPad: bump the base to `17px` at `min-width:768px` and let sheets center (see §4). Do **not** redesign for
iPad — same system, more breathing room.

---

## 4. Spacing, tap targets, and the core surfaces

### Spacing — an 8px grid, with 16 as the heartbeat
Tokens: `4 · 8 · 12 · 16 · 24 · 32`. Default gap between stacked things is `--gap` (16). Screen side
padding is `16px` on phone (`max(16px, env(safe-area-inset-*))` on the edges that need it), `24px` on iPad.
Vertical rhythm inside a card: `12–14px`. **White space is the primary tool for calm** — when a screen
feels busy, add space before you add a divider, and add a divider before you add a box.

### Tap targets (non-negotiable — this is a wet-thumb tool)
- **Every interactive element is ≥ 48×48px** (`--tap`). Secondary/inline controls may go to `--tap-min`
  (44) but never below. This kills dogfood note 3 (the 9×9px overview dots) at the root — **there are no
  tiny dots in v7** (see §5: the map is full-size cages, no mini-dot overview).
- **≥ 8px between adjacent targets.** The popup's two buttons, the sheet's action tiles, chips — all spaced
  so a thumb can't bridge two.
- **Hit area ≥ visual.** A 30px-tall cage cell gets a transparent `::after` padding the row to 48px tall,
  so the *target* is fat even when the *drawing* is slim.
- **Destructive actions need travel.** Remove is never adjacent to a confirm; it sits alone, outlined-red,
  and always pairs with an Undo toast (§6).
- **No floating FAB over content.** Dogfood notes 18 + the overview screenshot: the "+ Add line" FAB covers
  the last line / a card header. v7 has **no FAB**. "Add line" lives as a full-width button pinned at the
  end of the lines list (in normal flow, scrolls with content) and also in the Farm Layout tab. Nothing
  floats over the work area except the contextual popup (which is summoned by the user, transient, and
  positioned to avoid the selection).

### Card (white paper on the chart)
```css
.card{ background:var(--surface); border:1px solid var(--hair); border-radius:var(--radius);
       box-shadow:var(--shadow-card); padding:16px; }
.card .eyebrow{ font:700 12px/1 var(--font-ui); letter-spacing:.10em; text-transform:uppercase;
       color:var(--ink-2); margin-bottom:10px; }
.card .hero{ font:700 34px/1 var(--font-num); letter-spacing:-.02em; color:var(--ink); }
/* key/value rows — the workhorse of the cage sheet */
.kv{ display:flex; justify-content:space-between; gap:12px; padding:9px 0; font-size:16px;
     border-top:1px solid var(--hair); }
.kv:first-of-type{ border-top:0; }
.kv .k{ color:var(--ink-2); }
.kv .v{ font:600 16px/1.3 var(--font-num); font-variant-numeric:tabular-nums; text-align:right;
        color:var(--ink); overflow-wrap:anywhere; }
/* the big primary action tiles inside a sheet (Fill / Work etc.) */
.actGrid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; }
.actTile{ min-height:60px; border-radius:var(--radius-sm); display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:4px; font:750 15px/1 var(--font-ui);
          border:1px solid var(--hair); background:var(--surface-sink); color:var(--ink); }
.actTile .ic{ width:22px; height:22px; }
.actTile:active{ background:var(--teal-tint); }
```

### Bottom sheet (phone slides up; iPad centers) — the harvest-kit geometry, re-skinned light
```css
.overlay{ position:fixed; inset:0; background:rgba(12,42,48,.34); opacity:0; pointer-events:none;
          transition:opacity .2s ease; z-index:500; }
.overlay.open{ opacity:1; pointer-events:auto; }
.sheet{ position:absolute; left:0; right:0; bottom:0; background:var(--surface);
        border-radius:22px 22px 0 0; max-height:90dvh; overflow-y:auto;
        padding:8px 16px calc(20px + env(safe-area-inset-bottom));
        box-shadow:var(--shadow-sheet); -webkit-overflow-scrolling:touch;
        transform:translateY(100%); transition:transform .26s var(--ease); }
.overlay.open .sheet{ transform:translateY(0); }
.sheet .grab{ width:42px; height:5px; border-radius:3px; background:var(--hair-strong);
        margin:6px auto 10px; }     /* the drag handle */
.sheet h2{ font:800 22px/1.15 var(--font-ui); }
@media(min-width:768px){
  .sheet{ left:50%; right:auto; bottom:auto; top:50%; width:520px; max-height:86vh;
          border-radius:22px; transform:translate(-50%,-46%); opacity:0;
          transition:transform .24s var(--ease), opacity .18s ease; }
  .overlay.open .sheet{ transform:translate(-50%,-50%); opacity:1; }
  .sheet .grab{ display:none; }
}
```
**Sheet rule (kills dogfood note 1):** the moment a sheet opens, the **actions are the first thing under
the title** — no "Cage type" dropdown above the fold. Order is: title → (alert banner if needed) →
**action tiles** → the data (size/projection/kv) → photos → history → a quiet "Edit details" link last.

### Buttons
```css
.btn{ min-height:var(--tap); padding:0 18px; border-radius:var(--radius-sm);
      font:750 16.5px/1 var(--font-ui); display:inline-flex; align-items:center; justify-content:center;
      gap:8px; border:1px solid transparent; }
.btn-primary{ background:var(--teal); color:#fff; }           /* Fill (new seed), Confirm, Save */
.btn-primary:active{ background:var(--teal-press); }
.btn-barge{ background:var(--barge-amber); color:#1F1405; }   /* Pull — tinted to the barge */
.btn-quiet{ background:var(--surface); color:var(--ink); border-color:var(--hair-strong); } /* Work, Cancel */
.btn-danger{ background:var(--surface); color:var(--danger); border:1.5px solid var(--danger); } /* Remove */
.btn-block{ width:100%; }
```

### Inputs / forms
```css
input,select,textarea{ font:450 16px/1.3 var(--font-ui); min-height:var(--tap); width:100%;
  padding:12px 14px; border:1px solid var(--hair-strong); border-radius:var(--radius-sm);
  background:var(--surface); color:var(--ink); }
input[inputmode="numeric"], .num-in{ font-family:var(--font-num); font-variant-numeric:tabular-nums; }
input:focus,select:focus,textarea:focus{ outline:2px solid var(--teal); outline-offset:1px;
  border-color:var(--teal); }
label{ display:block; font:700 12px/1 var(--font-ui); letter-spacing:.06em; text-transform:uppercase;
  color:var(--ink-2); margin:14px 0 6px; }
```
Numeric fields use `inputmode="numeric"`/`decimal` so the phone shows a number pad. **Count and size get
the biggest fields**, prefilled where possible. Dates default to today.

### Toast + inline UNDO (keep the harvest-kit pattern; re-skin to the dark toast)
```css
#toast{ position:fixed; left:50%; bottom:calc(20px + env(safe-area-inset-bottom));
  transform:translate(-50%,10px); z-index:700; background:var(--toast-bg); color:#fff;
  padding:13px 18px; border-radius:var(--radius-pill); font:600 15px/1.2 var(--font-ui);
  box-shadow:var(--shadow-pop); display:flex; align-items:center; gap:6px; max-width:90vw;
  opacity:0; pointer-events:none; transition:opacity .22s ease, transform .28s var(--ease); }
#toast.show{ opacity:1; transform:translate(-50%,0); pointer-events:auto; }
#toast .undo{ margin-left:6px; min-height:44px; padding:0 12px; border-radius:var(--radius-pill);
  color:#7FE0EC; font-weight:800; background:transparent; }
```
Every destructive/bulk action returns a toast: `"Filled 6 cages"` · **Undo** (6s window, seq-guarded per
the kit). Plain past-tense, matches the button that caused it (Fill→"Filled", Pull→"Pulled to barge",
Remove→"Cage removed", Harvest→"Harvest logged").

### The needs-work indicator
Two renderings of one state, by context:
- **On the map cage (slim):** a `2.5px` vermilion **bottom edge** inset into the cell (`box-shadow: inset
  0 -3px 0 var(--c-work)`) **+** a tiny wrench glyph in the corner. At cell density a ping would be noise,
  so the edge + glyph carry it. Market-ready adds a teal **top** edge (`inset 0 3px 0 var(--c-ready)`) — a
  cage can show both (teal top, red bottom) and it reads cleanly.
- **On a card / the cage sheet (room to breathe):** the sonar-ping ring from the kit, re-colored, around
  the status dot, plus a banner: `🔧 Needs work · overdue 3d`.
```css
@keyframes sonar{ 0%{box-shadow:0 0 0 0 rgba(200,52,30,.7)} 70%{box-shadow:0 0 0 10px rgba(200,52,30,0)}
  100%{box-shadow:0 0 0 0 rgba(200,52,30,0)} }
.work-dot{ animation:sonar 2.2s ease-out infinite; }
.work-banner{ display:flex; align-items:center; gap:8px; background:var(--c-work-soft);
  color:#7E2412; border-radius:var(--radius-sm); padding:10px 12px; font:700 14px/1.2 var(--font-ui); }
@media(prefers-reduced-motion:reduce){ .work-dot{ animation:none; box-shadow:0 0 0 3px rgba(200,52,30,.5);} }
```

---

## 5. The farm MAP

The map is the home screen and the worktable. **Flat hierarchy: Farm → Lines → Cages.** No Acres, no
Quarters, no plot cards, no overview mini-dots (all dropped — see brief DROP LIST + §7). One vertical
scroll of full-size lines, each line a horizontal run of real cage glyphs along a rope, on the pale chart.

### Layout (phone, 390 wide)
```
┌─────────────────────────────────────────────┐  --deep bar, white ink
│  Brightside ▾                          ☰     │  farm name (tap=switch) · menu
├─────────────────────────────────────────────┤
│  103 filled · 36 empty · 12 ready · 2 ⚑      │  ONE quiet summary strip (ink-2, 13px)
├─────────────────────────────────────────────┤  ← the map well begins (--paper-2, engraved ripple)
│                                               │
│   LINE 1                                  ⋯   │  eyebrow + per-line menu (rare actions)
│   ╓──▭─▭─▭─▭─▭─▭─▭──╖   ← pilings each end    │  cages strung on a rope, full width
│      1-1  1-2 1-3  …                          │  micro-labels under, only if room
│                                               │
│   LINE 2                                  ⋯   │
│   ╓──▭─▭─▭─▭─▭──╖                             │      ┌───────────┐
│                                               │      │  (barge   │  ← docked here, see below
│   LINE 3                                  ⋯   │      │   bottom- │
│   ╓──▭─▭─▭─▭─▭─▭─▭─▭─▭──╖                     │      │   right)  │
│                                               │      └───────────┘
│   [ + Add line ]   ← full-width, in flow      │
└─────────────────────────────────────────────┘
```

### How a line + its cages render
- **The rope (longline)** is a single horizontal stroke spanning the line, drawn as CSS so it's free:
  ```css
  .lineRope{ height:3px; border-radius:2px;
    background:repeating-linear-gradient(115deg,
      var(--rope-hi) 0 4px, var(--rope) 4px 8px, var(--rope-shadow) 8px 10px); opacity:.9; }
  ```
  Cages sit *on* the rope; a faint catenary is not worth the complexity on phone — keep it straight.
- **Pilings** bookend each line using `pilingSVG()` from the kit (re-tokenized to `--piling*`), rendered
  ~14×26px, the right one mirrored `scale(-1,1)`. They are the visual anchor for "the line stays even when
  empty" (brief invariant). Quiet, ink-edged, not loud.
- **Cages** use `shapeSVG()` from the kit (the three gear-accurate glyphs: OyGrow=`circle`, FlipFarm=`rect`,
  Vexar=`bag`), with these v7 changes:
  - **Ink-edged for sun.** Every glyph keeps `--cage-stroke` = ink at full strength. On the pale chart this
    is what makes cages pop without relying on fill saturation.
  - **Fill = status color** (`--c-empty/-fresh/-mid/-old`); mesh lines = `--cage-mesh` (ink at .42 alpha) so
    the gear texture (the thing Philip asked for — "more detail to the cages") reads on any fill.
  - **Mesh is hinted, not literal.** The 9mm-vs-4mm difference is *data*, surfaced as text ("Flip · 9 mm
    mesh") in the popup and sheet — NOT crammed into the glyph or the name (kills dogfood note 17). The glyph
    shows mesh *bars* for character; the number lives in copy.
  - **Rotate cages to sit ALONG the line** (farmer note): a cage on a horizontal rope is drawn landscape
    (long axis horizontal, as the kit's viewBoxes already are). If a builder ever renders a *vertical* line,
    rotate the glyph 90° so its long axis follows the rope — a cage always looks like it's hanging on its
    line, never crossing it.
  - **Cell sizing:** glyphs flex to fill the line width (`flex:1 1 0`) with a min visual height ~30px, but
    the *tap target* is padded to 48px tall (transparent `::after`). On a long line (>~10 cages) the glyphs
    shrink but the row stays one-tap-tall and the rope keeps them legibly strung.
  - **Status edges** (market-ready teal top / needs-work red bottom) are inset box-shadows on the cell, per
    §4. **No status dot needed at map density** — the fill color + edges carry it; reserve the dot for the
    sheet.

### The barge — where it sits, how the pile grows
The barge is the signature object. It carries the day's pulled oysters (the "working pile") and is how you
harvest. Keep the illustrated SVG (`_barge-design.svg`) and both fishermen **verbatim** — only the
`#oysterPile` group is dynamic.

- **Where:** docked **bottom-right**, floating above the map (`position:fixed`), clear of the lines list.
  The harvest-kit's right-edge-centered 120px barge eats a third of a 390px phone — **don't** do that on
  phone. v7:
  ```css
  .barge{ position:fixed; right:10px; z-index:60; pointer-events:auto;
    bottom:calc(12px + env(safe-area-inset-bottom));
    display:flex; flex-direction:column; align-items:center; gap:4px;
    filter:drop-shadow(0 4px 10px rgba(12,42,48,.30));
    transition:width .3s var(--ease); }
  .barge svg{ width:100%; height:auto; animation:bob 3.4s ease-in-out infinite; }
  @keyframes bob{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  .barge.empty{ width:84px; opacity:.8; }   /* small + faded when nothing's on deck */
  .barge.loaded{ width:118px; opacity:1; }  /* pops bigger when it holds oysters */
  @media(min-width:768px){ .barge{ right:18px; bottom:auto; top:50%; transform:translateY(-50%); width:132px; } }
  ```
  The barge **shrinks and dims when empty** (a quiet ghost in the corner) and **grows + brightens when
  loaded** — so its prominence tracks whether there's work on it, and an empty barge never competes with
  the map.
- **The count pill** sits under the hull, amber, with the lineage origin in tiny ink-2 below it:
  ```css
  .barge-pill{ background:#FFF; border:1.5px solid var(--barge-amber); color:var(--barge-amber-ink);
    border-radius:var(--radius-pill); padding:3px 11px; font:800 13px/1 var(--font-num); white-space:nowrap;
    box-shadow:0 1px 3px rgba(12,42,48,.12); }
  .barge-origin{ font:500 11px/1.25 var(--font-ui); color:var(--ink-2); text-align:center; max-width:112px; }
  ```
  Empty: pill hidden, a single small ink-3 caption "Barge empty". Loaded: `~3,400` + "from L2 · L3 — today".
- **The growing pile** (build this — the kit only swaps two static drawings): wrap the pile ellipses
  (lines 119–158 of `_barge-design.svg`) in `<g id="oysterPile">`, drawn in three depth bands
  (back/mid/front, already there). Drive off count:
  ```js
  function pileLevel(count){ return !count||count<=0 ? 0
      : Math.min(1, Math.log10(count+1)/Math.log10(20000)); }  // 20k ≈ a full mountain, log-scaled
  // grow UP from the deck line (y≈64), not from center:
  pile.style.transition='transform .4s var(--ease)';
  pile.setAttribute('transform','translate(60 64) scale('+(0.55+0.6*lvl)+') translate(-60 -64)');
  // gate the bands so it reads as accumulation:
  //   lvl>0     → base mound + front row        "a scoop"
  //   lvl>0.45  → + mid row                      "a load"
  //   lvl>0.75  → + back row (+ second mound)     "a mountain"
  ```
  Pair with the `.4s` transition so a Pull visibly **heaps** the barge — that motion is the reward and the
  proof the pull worked. Tapping anywhere on the barge opens the Harvest sheet.

### Selection highlight
A selected cage gets a **white inner outline + slight brighten** so the status color still reads through:
```css
.cage.sel .cellfill{ outline:2.5px solid #fff; outline-offset:-2.5px;
  filter:brightness(1.06) saturate(1.05); box-shadow:0 0 0 2px var(--teal); }
```
During a drag, a translucent **band** tracks the swept range so the farmer sees the run before they lift:
```css
.dragBand{ position:absolute; background:rgba(14,124,139,.16); border:1.5px solid var(--teal);
  border-radius:6px; pointer-events:none; z-index:3; }
```
(teal band = "this is what you're selecting"; ties selection to the primary-action color.)

### The contextual popup (above the selection)
Tiny floating card, 1–2 buttons, **positioned above the topmost selected cage** with a caret pointing down
at the selection. Reuse the kit's `syncPullPopup` positioning math (min-top of `.cage.sel`, avg center-x,
park `popH+14` above, clamp to viewport).
```css
.popup{ position:fixed; z-index:600; transform:translateX(-50%); min-width:172px;
  background:var(--surface); border:1px solid var(--hair-strong); border-radius:14px;
  box-shadow:var(--shadow-pop); padding:10px 12px 12px;
  display:flex; flex-direction:column; align-items:center; gap:9px; }
.popup .lbl{ font:600 13px/1.25 var(--font-ui); color:var(--ink-2); text-align:center; }
.popup .row{ display:flex; gap:8px; }
.popup .pbtn{ min-height:46px; padding:0 18px; border-radius:11px; font:750 16px/1 var(--font-ui); color:#fff; }
.popup .pbtn.fill{ background:var(--teal); }       /* Fill */
.popup .pbtn.pull{ background:var(--barge-amber); color:#1F1405; }   /* Pull → barge */
.popup .pbtn.work{ background:var(--surface); color:var(--ink); border:1.5px solid var(--hair-strong); }
.popup .pbtn.remove{ background:var(--surface); color:var(--danger); border:1.5px solid var(--danger); }
.popup::after{ content:''; position:absolute; bottom:-9px; left:50%; transform:translateX(-50%);
  border:9px solid transparent; border-top-color:var(--surface); border-bottom:none;
  filter:drop-shadow(0 1px 0 var(--hair-strong)); }
```
**Action matrix (straight from the brief — and no more):**
| Selection | Buttons |
|---|---|
| all filled | **Pull** (amber), **Work** (quiet) |
| all empty + barge has a pile | **Fill** (teal, "distribute from barge"), **Remove** (red, only if single) |
| all empty + barge empty | **Fill** (teal, "new seed"), **Remove** (red, only if single) |
| mixed | label only: "Mixed selection — pick all-filled or all-empty" (no buttons) |
The popup's label says the count and what'll happen: e.g. *"6 empty cages"* over a Fill button. Harvest is
**NOT** here (it's the barge tap). Never more than two buttons.

---

## 6. Interaction feel

The whole app is **one interaction model: drag-select → popup → one sheet → toast.** No second action bar,
no modes to enter, no wizards (all dropped). It should feel like moving game pieces on a board.

### Drag-to-select (the keeper, simplified)
Reuse `denseRangeSelect` from the kit. Behavior:
- **Tap a cage → it selects** (single). **Drag a finger across a run → the range selects**, painting as you
  go, with the teal `.dragBand` tracking the sweep. Lift → popup appears above.
- `touch-action:pan-y` on cages so the page still scrolls vertically while horizontal drag selects.
- A real drag installs the kit's one-shot click-suppressor so the drag's synthetic click can't open a sheet.
- **Tap empty space (the chart) → deselect all + dismiss popup.** The pale map well is a big, safe
  deselect target (fixes dogfood note 4 — there's finally a generous "neutral spot").
- Keep only the `sel` pick-mode. Drop `sort`/`place`/`detached` entirely.
- **To open a single cage's detail sheet:** tap a cage when nothing else is selected → it selects AND, if
  it's the only thing selected, the popup's label is tappable to "Open 1-3 ›". (Or: double-tap opens the
  sheet. Pick ONE and use it everywhere — recommend the popup "Open ›" affordance so there's a single tap
  language.) Either way, **selection is the primary gesture; the sheet is one step in.**

### The floating popup
Covered in §5. Feel: it springs in fast (`.16s`) right above the work, tinted by the action it offers
(teal=fill, amber=pull), so the farmer's eye goes action→target without hunting a bottom bar. It re-positions
in place as the selection grows during a drag (no full re-render — keep the kit's out-of-band update).

### Photos (a v7 headline feature — make it feel effortless)
Per `PHOTOS-IMPLEMENTATION-PLAN.md` (IndexedDB blobs, ≤1280px JPEG, never base64 in localStorage).
- **Capture widget** in the Fill form and any Work/growth form: a dashed "add photo" tile sized `--tap`,
  `<input type="file" accept="image/*">` (no `capture=` so iOS offers Take Photo / Library).
  ```css
  .photoAdd{ width:64px; height:64px; border-radius:12px; border:1.5px dashed var(--hair-strong);
    display:flex; align-items:center; justify-content:center; color:var(--ink-2); background:var(--surface-sink); }
  ```
- **Thumbnail strip** (read-only, on the sheet / along the history timeline): a horizontal scroll of
  64×64 rounded thumbnails; tap → full-screen viewer.
  ```css
  .photoStrip{ display:flex; gap:8px; overflow-x:auto; padding:4px 0; -webkit-overflow-scrolling:touch; }
  .thumb{ width:64px; height:64px; border-radius:12px; object-fit:cover; flex:0 0 auto;
    border:1px solid var(--hair); }
  ```
- **Full-screen viewer:** dark backdrop, image fit to screen, swipe left/right between photos, tap or a
  top-right `✕` to close, a thin caption strip with the photo's date + the event it's attached to
  ("Filled · Jan 28"). This is what delivers the brief's "see photos across the oyster's whole life" — the
  viewer pulls every photo on the batch's timeline, in date order, so scrubbing the viewer *is* scrubbing
  the oyster's life on the farm.
  ```css
  .viewer{ position:fixed; inset:0; z-index:800; background:rgba(8,22,26,.97);
    display:flex; flex-direction:column; }
  .viewer img{ flex:1; width:100%; object-fit:contain; }
  .viewer .cap{ color:#CFE0E2; font:500 13px/1.4 var(--font-ui); text-align:center; padding:12px; }
  .viewer .x{ position:absolute; top:calc(8px + env(safe-area-inset-top)); right:12px; width:var(--tap);
    height:var(--tap); border-radius:var(--radius-pill); background:rgba(255,255,255,.14); color:#fff; }
  ```

### History timeline (per cage / per batch)
A simple vertical list, newest first, each row = a dot on a hairline spine + past-tense label + date +
(optional) inline photo thumbs. Reception → filled → worked events → pulled → on barge → re-filled → harvest.
```
│  ● Harvest logged · 240 ct        Jun 14   [▣][▣]
│  ● Tumbled                         Jun 02
│  ● Growth check · 61 mm            Jun 02   [▣]
│  ● Filled · 600 @ 22 mm            Jan 28   [▣][▣][▣]
```
Spine is `--hair`; dots take the status color of that event (green fill, amber pull, etc.). Quiet, scannable,
photos appear right where they happened.

### The growth chart
Reuse `growthChartSVG` from the kit, re-skinned for the pale surface. It lives in an inset white-on-`--surface-sink`
frame on the cage sheet:
- **Frame:** `background:var(--surface-sink); border:1px solid var(--hair); border-radius:12px; padding:12px`.
- **Measured line:** solid `--teal`, `2px`, with `4px` dot nodes at each real measurement.
- **Projection segment** (last point → market line): dashed `--teal` at `.55` opacity — clearly "estimate".
- **Market threshold:** a dashed horizontal `--c-ready` line labeled `market 76 mm` in `--font-num` micro.
- **Axes:** hairline `--hair`; min labels only (start date left, projected date right) in micro-label caps.
- The **hero number** above the chart ("61 mm") and the **honest projection copy** below it (`~Aug 2026
  (76 mm)` + the confidence hint) use the kit's exact wording — keep that voice; don't invent new copy.
- Confidence is shown as a small text line, never a fake precision: low/medium/high + the one-line "why",
  verbatim from the kit's `confidenceHint()`.

### Motion budget (restraint)
Only these move: the barge **bob** (ambient) and its pile **heap** on pull; the popup **spring-in**; the
sheet **slide-up**; the toast; the needs-work **sonar** (cards only). Selection is an instant outline (no
animation — it must feel direct). Everything respects `prefers-reduced-motion`. Resist adding more — extra
motion is the fastest way to make a working tool feel toy-like and AI-generated.

---

## 7. The simplicity rule-set (read before building — this keeps the clutter out)

The last app got cluttered by **adding surfaces**. v7 stays simple by obeying hard limits:

### Remove (do not rebuild — see brief DROP LIST)
- **No Acres / Quarters / plot cards / sections.** Flat: Farm → Lines → Cages, one scroll.
- **No overview mini-dots.** The map *is* full-size cages. There is no separate tiny-dot summary screen.
- **No FAB.** "Add line" is an in-flow button at the end of the list. Nothing floats over content but the
  user-summoned popup and the corner barge.
- **No second action surface.** No bottom selbar, no sort bar, no place bar. Drag-select → popup is the
  ONLY action surface.
- **No wizards.** No sort wizard, no place wizard, no multi-step set sheets, no method picker. Pull→barge→Fill
  replaces sort; one sheet per action.
- **No conditions panel / NWS / tide / station picker.** Out of scope; network dependency in an offline app.
- **No hover-peek layer.** Phone has no hover; tap selects, tap-barge harvests.
- **No detached-spot state.** Remove shortens the line; there's no third "empty spot, no cage" state.

### Density limits (hard caps)
- **One loud thing per screen.** The map's loud thing is the cages (color) + the barge. A sheet's loud thing
  is the hero number or the chosen action. If two things compete to be loudest, demote one to ink-2.
- **The contextual popup: ≤ 2 buttons.** Ever. If you think you need a third, it belongs on the sheet.
- **A sheet's above-the-fold: title + actions only.** Data, photos, history, edit-link all come after.
- **The top summary strip: ONE line, ≤ 4 facts** (filled · empty · ready · needs-work). No 4-card stat
  header (the v6 overview's four big cards are gone — they pushed the actual farm below the fold).
- **Per-line chrome: the eyebrow + one `⋯` menu.** Rare actions (rename line, change all cage types on the
  line, remove line) hide in `⋯`. The line itself shows only its name and its cages.
- **Max two type weights visible at once in a block**, plus the mono for numbers. Color is rationed (§2).

### One-thing-per-screen guidance
- The **map** does one job: show the farm and let you select cages. It does not also show conditions, stats
  dashboards, or logs.
- A **sheet** does one job: act on a selection, or show one cage's life. It opens, you do the thing, it
  toasts, it closes.
- The **barge** does one job: hold the working pile and be the door to Harvest.
- **Logs / Layout / Settings** live behind the `☰` menu — never on the map. The map stays a worktable.

### Vocabulary (one word per concept — use it everywhere)
**Fill · Pull · Work · Harvest · Remove.** The working pile is the **barge**. Work sub-actions are past
tense (**tumbled, washed, desiccated, flipped**); a cage shows the **last thing that happened to it**. A
button's label and the toast it produces match (Fill→Filled, Pull→Pulled to barge). No "stock", no "growth
check" vs "log growth" drift, no "on-deck batch", no "section/quarter/area".

### The five-second test (apply to every screen before shipping)
1. Can a farmer in sunglasses read every number and label? (contrast, size, mono)
2. Is there exactly one obvious next action? (one loud thing)
3. Could a wet thumb hit every target without zooming? (≥48px, ≥8px apart)
4. Is anything on screen that isn't the current job? (if yes, move it behind `☰`)
5. Does it look like *this* app — chart-pale, ink-edged gear, the warm barge in the corner — and not a
   generic template?

---

## Build order (so the look lands early and stays consistent)
1. Drop in the `:root` from §2 + base/type from §3. (Replaces the kit's dark `:root`.)
2. Build the map shell: `--deep` bar, one summary strip, the `--paper-2` map well with engraved ripple.
3. Render lines: rope + pilings + `shapeSVG()` cages re-tokenized; status fills + edges; 48px tap rows.
4. Drag-select + the teal band + the popup (§5/§6); wire the action matrix.
5. The barge: art verbatim, `#oysterPile` made dynamic (§5), dock bottom-right, empty/loaded sizing.
6. Sheets: cage sheet (actions-first), Fill form (with photos), Work, Harvest (off the barge tap).
7. Photos (IDB), thumbnails, full-screen viewer; history timeline; growth chart re-skin.
8. Toasts + seq-guarded Undo on Fill/Pull/Remove/Harvest.
9. Run the §7 five-second test on every screen at 390×844, then on iPad.
