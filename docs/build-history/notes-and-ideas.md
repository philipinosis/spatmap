# SpatMap — notes & ideas

Running list of things to add or change. Drop raw thoughts in the Inbox; move them into a bucket when they firm up. Started 2026-06-13.

> **How this file works:** Everything above the uppermost `── Built in ──` divider is NEW — not yet built, for the next build. Sections below the dividers document what shipped in each version.

> **SUPERSEDED 2026-06-23 — canonical file is now `spatmap.html` (v4). See README.**
>
> **BUILD BASE (set 2026-06-15):** From here on we build off **last night's app — `index.html` (the v7 rebuild)**. That is the canonical file. The overnight build verified the full interaction core (drag-select, pull → barge, fill-from-barge, work, harvest, remove, cage history + growth projection). Photos (Builder 3) are the main carryover still not built. The older `index-3..7.html` are history only. Note: `DIRECTORY.md` still labels index-3 "PRODUCTION" — that's stale; index.html (v7) wins (being corrected). Several "Features to add" entries below (Pull/Fill popup + barge, batch lineage, harvest log) already shipped in v7 and are kept only for history — check the live index.html before rebuilding any of them.

---

## ✅ Built 2026-06-27 (free-placed lines + flip/auto-orient + map-first onboarding — spatmap.html, v4)

The biggest layout rework yet. Lines stopped being evenly-spaced rows *derived* from an area and became
**first-class spatial objects with anchor-post endpoints**. Built supervisor-style: 3 planning rounds (two
`Plan` agents propose → I critique → they resolve open holes) + an adversarial `architect-review` pass →
7 QA-gated build chunks (C1–C7) → a 4-persona simulated-usage test phase → a `code-reviewer` pass → fixes.
`index.html` untouched throughout.

- **Data model:** every `farm.lines[]` gained `a:{x,y}`, `b:{x,y}` world-coord endpoints (the geometry).
  Areas became **optional soft groupings** — `line.areaId` stays a frozen membership tag so every
  area-scoped consumer (work map, area pills, `.axv`, drill, harvest/$/cohort, CSV/backup) is untouched.
- **Migration** (`deriveLineAB`/`relayoutAreaLines`/`validAB` + a step in `ensureSpatialIndex`): backfills
  a/b for legacy lines from the EXACT old area-row math (`rowBand` + axis + even spacing), **baking
  `area.rot`** so a rotated area renders byte-identical. Idempotent (`validAB` guard never moves a placed
  line), self-healing, additive — Brightside loads pixel-identical (verified via a git-stash A/B pixel diff:
  only the decorative barge differed). Inline parity self-check asserts rot=0 and rot=90.
- **Render:** new `drawLine`/`drawLineCells`/`drawPost`/`linePitch` draw each line at WORLD level in a single
  `layoutRedraw` pass (NEVER inside the area `rotate()` group — rot lives in the stored a/b). The cage-cell
  contract was lifted byte-for-byte out of the deleted `drawCageCells` (data-cage-id/classes/element-order/
  tens-ticks/a11y caps preserved → peek/two-tap/drill intact). LOD-gated posts, per-redraw pitch memo,
  chip/handle z-order lift, counter-rotated labels.
- **Selection + drag:** `LAYOUT.selLines` (Set, mutually exclusive with `sel`). Tap a post → select (teal),
  tap more → multi-select, tap water → clear. Drag a post → move that endpoint (other fixed, min-length
  clamped); drag a body → move the line/whole set. Hit order handle→post→line→area→create→pan; pinch always
  wins. Every gesture = one commit+undoable restoring a/b.
- **Bulk edit sheet:** set cages/line (stock-safe), change cage type, relabel `<prefix>N`, delete (blocks
  stocked lines). Selection survives consecutive edits (init `selLines` non-clobbering on re-render).
- **Flip + auto-orient:** `flipArea` rotates the rect via `area.rot += 90` AND rotates the contained lines'
  a/b about center (badge stays consistent); `flipLineSet` flips a selection about its bbox; `setAreaOrientation`
  (NS/EW chip) now also rotates the lines so they track the rect; `autoAxis(w,h)` orients new areas to fit
  MORE lines (rows across the longer side). Area move/rotate **carry their lines** (caught in code review).
- **Map-first onboarding + create:** the wizard dropped its lines×cages step (S3) — you draw on the map now.
  A new `Select | +Plot | +Area | +Line` toolbar arms a rubber-band create (drag to draw; one-shot return to
  Select; pinch cancels a stray create; min-size guards). `addPlotToFarm`/`addAreaToPlot`/`addLine` gained
  optional explicit-rect / endpoint params. New farms land directly on the map with a seeded plot+area.
- **Test phase (4 personas):** onboarding, free-line power user, daily-work regression, mobile gestures.
  Stock-safety held everywhere (42k oysters preserved through every op); zero runtime errors; daily work
  intact; pan/pinch-vs-draw clean. Real bugs fixed: stale flip badge, NS/EW-chip line desync, area
  move/rotate not carrying lines (code review), movePost zero-collapse, plus polish. The "Undo broken" and
  "Back blank" reports were verified test-harness artifacts (Playwright won't click a fading toast;
  `homeMode` left stale by evaluate-based setup).

---

## ✅ Built 2026-06-24 (guided onboarding wizard — spatmap.html, v4)

Replaced the single wall-of-fields new-farm form with a **step-by-step wizard**. Built via a
propose→critique→execute subagent pass (two planners → critic resolves 5 kinks → UX sign-off → 2 QA-gated
build passes → code review). Browser-verified end-to-end (35+ assertions + screenshots); `index.html` untouched.

- **One builder, two mounts:** `buildOnboardWizard({chrome, startStep})`. First-run = `{page, 0}` (shows the
  Welcome/demo fork); menu "+ New farm" = `{sheet, 1}` (skips the fork — existing users don't need the demo
  re-offered). Closure holds `step` + the working `model`; `go(n)` repaints a persistent `body` (no
  router/History API — `ponytail:` closure-only, upgrade path = `pushView` if device-Back UX ever demands it).
- **Flow:** S0 Welcome (Build vs Explore-a-demo) → S1 Name (Next gated until non-blank, autofocus, Enter
  advances) → S2 Gear (reuses `buildCageTypesEditor`) → S3 Geometry (lines×cages, seeded 4×10, live "That's N
  cages" count, B11 clamp lifted) → S4 Review card (NAME/GEAR/LAYOUT, tappable rows) → `createFarmFromModel`.
- **Bare-minimum collection:** only name + gear + geometry. grades/market/neglect default silently
  (`[]`/76/56) and stay editable in Settings — the review screen says so.
- New CSS: `.obSteps`/`.obDot`/`.obNav` + review-row hierarchy; `.obTitle`/`.obSub` **de-scoped** from
  `.onboardWrap` so they also style inside the sheet (caught in code review — sheet flow was unstyled).

**Deferred (follow-up):** `buildFarmForm('create', …)` is now **dead** — both entry points use the wizard, so
only `buildFarmForm('edit', …)` is live (L3659/3666). The whole `isCreate` branch (create model, lines/cages
inputs, the duplicate B11 clamp, create/demo buttons) is unreachable. Strip `buildFarmForm` to edit-only in a
dedicated pass (re-QA the two edit sheets) so the B11 clamp has a single home. Not done here to keep the diff
scoped and avoid touching the working edit sheets without their own QA.

## ✅ Built 2026-06-24 (in-app PM pass — 5 packages, all in spatmap.html, v4)

The detailed notes below (Bugs & friction / Data safety / Design-UX / the Gear entry) are now IMPLEMENTED.
Built via a propose→critique→execute subagent pass; full-file `node --check` clean, migration harness
ALL PASS, `index.html` untouched.

1. **Line naming → Row-first `1A`** — labels are now derived in `reindexLines` (kills the add-a-line
   numbering jump), bare format `1A`/`2B-4`, row keeps its number across areas, area = uppercase letter;
   user-renamed lines preserved via `l.auto`. (Replaces the a/b/c note + the numbering bug.)
2. **Cage-first fill + multi-remove** — Fill on empty cages opens a batch picker (one batch auto-fills);
   Remove now works on a multi-cage empty selection (`n===1` guard dropped).
3. **Work-tab area switcher** — prev/next arrows in the scoped top bar (within-plot, disable at ends).
4. **Data forward-compatibility** — `SCHEMA_VERSION` stamp + `writtenBy`, forward guard (newer blob →
   snapshot to `:future` + boot warning, still migrates in place), offline conservation/idempotency test
   harness at `_local/migration-test.html`. (`:safe` 3rd backup deferred; index.html collision = discipline.)
5. **Gear tab + Map legend** — Settings→Gear surfaces the cage/gear-type editor (Settings de-duped);
   "Map key" menu row decodes the cage colors (age-since-stocked bands), ready dot, needs-work ring, and
   gear shapes — dynamic to the farm.

Harness paste-sync DONE (2026-06-24, resume pass): `_local/migration-test.html`'s inlined `migrateFarm`
now matches the real one (`l.name=''` + `l.auto` flag), and its `ensureSpatialIndex` calls a synced
`reindexLines`/`segLetter` — so the harness exercises the SHIPPING line-naming, not stale code. Re-run
headless: ALL PASS, 3 fixtures, oysters conserved (40000/5200/200), idempotent, unknown fields survive,
labels derive to the new `1A`/`2A` scheme. (`ponytail:` comment marks the copy as drift-prone; upgrade
path = extract the real fns at test time.)

Still OPEN: onshore-gear inventory (deferred, speculative — not built).

## Inbox (unsorted — dump here)

-
-
-

---

## Features to add

### Selection popup shows counts + last-worked; single cage → "same oysters" sibling view (NEW 2026-06-15)
Make the contextual popup informative on selection, and give a single clicked cage a nice way to surface every other cage holding the same oysters. Two related asks:

**1. Popup readouts (counts + last worked):**
- **Single cage selected** → popup shows the **number of oysters in that cage** (its batch count) and its **date last worked**.
- **Range selected (drag across several)** → **sum the counts of every selected cage** into one total ("~1,840 oysters · 6 cages") and show **date last worked**.
- Put the count/last-worked line right in the popup header, above the action buttons — it reads before you tap anything.

**2. Single cage clicked → show all cages with the "same oysters":**
- When one cage is clicked, give a nice visual of **every other cage that holds those same oysters** — the siblings that came from the same seed/pull lineage (e.g. one barge load split across many cages keeps them related).
- "Nice way of showing" = highlight/outline those sibling cages on the map (and/or a small list "Also in: L1·3, L1·4, L2·1"), so you can see at a glance where the rest of this batch lives. Tapping one could jump to it.

**Open questions (resolve at build):**
- *How broad is "same oysters"?* Options: (a) cages whose current batch descends from the **same original seed batch**; (b) cages split off the **same single pull → fill** event only (tighter); (c) literal same `batch.id` (rare — fill-from-barge mints child batches with new ids). Likely (a), walking lineage.
- *Range "date last worked"* — show the **most recent** work across the selection, the **oldest** (the neglect-relevant one), or a range "Jun 2–Jun 11"? Oldest is probably most useful for the neglect alert; confirm.
- *Uncounted cages* in a range (count = null) — sum the known ones and note "+N uncounted", don't show a falsely precise total.

**Code hooks (v7 index.html — verify before building, line numbers drift):**
- The popup is `renderPopup` / `syncPopup` (the action-matrix card over a selection); `selCages` holds the current selection, `denseRangeSelect` builds it. Count = `cage.batch.count`; sum across `selCages`. "Last worked" = latest `worked`-type event date in `cage.events[]` (or `cage.workDue` math against `settings.neglectIntervalDays`).
- "Same oysters" reuses the lineage machinery already built: `lineageEvents` + `origin.parentBatchIds` chains. Find sibling cages by matching each filled cage's batch lineage chain against the clicked cage's chain (intersection = "same oysters"). Highlight via the existing `.cage` selected/marker styling.

### Estimate live count → full mortality number (NEW 2026-06-15)
Track how many oysters are alive at each handling, so harvest closes the loop with a real mortality number for the whole cycle.

**Input model (decided): live count estimate.** When we work or pull a group, the app asks one thing — *"About how many alive now?"* — and the farmer eyeballs it. The app computes the mortality rate itself from the seed count. No percentages or dead-counts to enter on the water; one number, least thinking with a wet thumb.

**Where it prompts:**
- **Work** (tumbled / washed / desiccated / flipped) and **Pull** — both count as "working a group." Optional est. live-count field on the form. Blank = no estimate logged (never force it).
- **Harvest** — the count entered here is the *exact* truth (already captured today). This is what closes the cycle.

**What the app derives (farmer never types a rate):**
- Loss since last known count = lastCount − estimate.
- Cumulative loss = seed count − latest estimate; rate = cumulative loss ÷ seed count (shown as %).
- At/after harvest: **full-cycle mortality = seed count − total harvested** (sum across multiple harvests of the same batch). Show the number, the %, and optionally an annualized rate from days-since-seed.
- Readout lives on the cage/batch history (e.g. "Seed 1,800 → ~1,650 est. → 1,540 harvested · 14% lost") and rolls up into the Harvest Log row.

**Open questions (resolve at build):**
- Pooling mixes lineages: Pull pools several cages onto the barge, Fill divides them back out. Track mortality per *original* seed batch, or per pooled working-group? Simplest first pass: log estimates at the group level, reconcile to a full number only at harvest.
- Uncounted batches (seed count = null): show "—" for rate until a count exists; the first estimate can seed that count.
- Multiple partial harvests from one batch: accumulate harvested counts before computing the full number.

**Code hooks (v7 index.html):** events already carry a `count` field via `newEvent(type, batchId, {count})`; `worked` / `pulled` / `harvested` events all use it. `batch.count` is the current/seed count. The old `mortality` event type was collapsed into notes during the v7 migration (index.html ~L754) — revive mortality as a *derived* readout from counts rather than a separate hand-entered event.

### Pull/Fill popup + barge visualization — REDESIGN of the pull/empty workflow
Replace the bottom selbar with a contextual floating popup and a barge illustration.

**Selection trigger:** Drag across the cage bar auto-starts selection — no separate "Select" button needed.

**Pull popup (stocked cages selected):**
- A floating card appears above (position:fixed, centered on) the selected cages
- Shows estimated oyster count ("~450 oysters · 5 cages") + Pull button
- Secondary: Work and Harvest buttons in the same popup (these replace the selbar's Work/Harvest)
- Tapping Pull empties those cages and pools their batch into an on-deck batch

**Barge (after Pull):**
- An illustrative SVG barge with two cartoon fishermen appears fixed on the right side of the ocean view
- An oyster "pill" blob sits on the barge showing the estimated count + lineage ("From Line 1, Q2 · Jun 14")
- More characterful / hand-drawn-ish style — not just a chip
- When the oysters are placed back into cages (Fill), the barge stays visible but the pill goes gray/hollow: "Placed · into Line 3, Q2 · Jun 14"
- A small "×" dismiss button clears the barge
- Barge is present on both the overview and the plot view

**Fill popup (empty cages selected + on-deck batch exists):**
- Same floating popup position above selected empty cages
- Shows "Fill from barge · ~90/cage · 5 cages" + Fill button
- Tapping Fill distributes the batch evenly across selected empty cages and marks the barge pill as "placed"

**Oyster lineage / tracking:**
The full pull → barge → fill chain preserves oyster history:
- Pull records: on-deck batch with origin.cageLabels, lineNames, date, estimated count, grade, last-known size
- Fill records: new cage.batch carrying the original on-deck batch's ID as provenance; each cage.events gets a note tying back to the source cages + date
- Barge pill displays this lineage so the farmer always knows where these oysters were before
- Every oyster's life is traceable: reception → stocked → worked → pulled → on barge → restocked → harvested

**Implementation notes:**
- Replace `onDeckTray` chip row with the barge (barge IS the on-deck visualization)
- Remove the bottom `div.selbar` entirely
- `denseRangeSelect` auto-starts selMode if no pick mode is active (remove `if (!mode) return` guard)
- Popup: after each render, `requestAnimationFrame` measures `.cage.selpick` bounding rects → positions `.pullPopup` above the topmost selected cage
- After Fill: do NOT delete the on-deck batch; set `batch.placed = {date, lineNames}` and show gray pill
- Batch stays in farm.batches until explicitly dismissed (the × button removes it)
- Work/Harvest in popup: reuse existing `buildBulkSheet` / `buildHarvestSheet` (just triggered from popup instead of selbar)

---

### Click-and-drag to draw lines (custom farm layout)
When setting up a new farm, let me draw a line by clicking and dragging on the map. The drag length sets the line's length / cage count, so I can shape the farm to match what it actually looks like in the water. Real farms aren't all neat grids.

- **Default stays grid.** Most farms are grids, so spinning up a grid should still be the one-tap default.
- **Freeform draw is the option.** A "draw your own" mode for farms that don't fit the grid — angled lines, different lengths per line, irregular spacing.
- Mix the two: start from a grid, then drag individual lines longer/shorter or reposition them.

Open questions (resolve later):
- How does drag distance map to cage count — snap to a grid spacing, or freely set length and let me pick cages/line after?
- Line angle/orientation — free rotation or snap to N°?
- Does this apply only to new-farm setup, or also to editing an existing farm's layout (Settings → Farm layout)?
- Today lines come from the "+ Add line" sheet (pick cage type + # of cages). Drawing would be a second, visual path into that same data.

### Rebuild the Layout tab as a visual map editor (partly shipped in index3 — drag-to-reorder + visual line-builder done; freeform click-and-drag line DRAWING still NOT done)
The Layout tab under Settings (the Farm hub segmented bar: Layout / Gear / Grades / Site / Data) should be a whole different menu — open into its own panel built around the mapping feature, not the current fixed-anchor line-builder list.

- In that panel I want to grab a line and drag it up and down in the grid to reposition it.
- This is where the click-and-drag line drawing (above) lives for an existing farm — draw, move, resize, reorder lines visually instead of through form rows.
- Pairs with the new-farm draw flow: same visual editor, reachable both at setup and later via Settings → Layout.

### Tie growth to season / weather / water temp (partly shipped in index3 — seasonal model + SEASON_MULT done; live water-temp / weather coupling into the rate still NOT wired)
The growth we log should be weighted by the season — oysters grow slow in winter, fast in the warm months. The current outlook already uses a "seasonal model" (~0.18 mm/day); make that seasonality real and visible, not flat.

- Step up: pull **water temp** from the gauge (USGS stations often report temp alongside salinity) and let temp drive the growth-rate estimate.
- Further: factor in **weather patterns** too (the app already fetches NWS forecasts) — cold snaps, warm spells.
- Payoff: a smarter harvest-date estimate. Same growth chart, but the projected curve bends with the season/temp instead of a constant rate.
- Open question: blend logged growth (actual measured mm over time) with the seasonal/temp model — measured data corrects the model as it accumulates.

### Master gear catalog → farm picks what it has
Right now every farm starts with the same 3 default cage types (Bag, Flip, OyGrow) and you manage them in the Gear tab. Change this so there's a global master catalog of every known gear type, and the farm checks off which types it actually has. Only the gear the farm selected shows up when adding cages to a line.

**Master gear catalog (all known types — seed this from the onboarding farm templates):**
- OyGrow (single floating cage, pontoon at top, hot-dip galvanized mesh interior)
- FlipFarm (horizontal basket/caddy with helix spine, surface culture)
- Vexar Bag (flexible mesh bag, standalone)
- OysterGrow Float (rectangular floating rack that holds multiple bags inside it — see separate note)

**Flow:**
1. During farm setup (onboarding), show the full catalog as a checklist — "What gear do you run?" Farmer checks the types they have.
2. Those checked types become `farm.cageTypes` — the only options that appear when assigning cages to a line.
3. In the Gear tab (Farm hub), the farmer can add/remove gear types by checking/unchecking from the same catalog, or add a custom type not in the catalog.

**Why:** A farmer who only runs FlipFarms shouldn't be offered OyGrow and Vexar as cage type options. The gear menu should match what's actually on their farm.

**Implementation notes:**
- Replace `defaultCageTypes()` (which seeds all 3 every time) with an empty `cageTypes: []` on new farms and a gear-selection step in onboarding.
- The master catalog can live as a constant `GEAR_CATALOG` array in the code — each entry has a canonical `name`, `shape`, and description.
- Existing saves (which already have `farm.cageTypes` populated) migrate as-is — no change needed for them.

### Gear tab for onshore gear
A Gear tab to track the gear sitting on shore (equipment inventory — not in the water). Heads up: the Farm hub already has a "Gear" tab, but today it manages *cage types*, not onshore equipment. Decide: rename/repurpose that tab, or split into "Cage types" vs "Gear on shore."

### Make a dedicated "Gear" tab under Settings (NEW 2026-06-24)
Re-requested in use. **State today (`spatmap.html` v4):** there is NO "Gear" tab — the Menu
(`buildMenu`, L8031) has a **"Settings"** item (gear icon, subtitle "Cage types & mesh, market size,
alerts") that opens `buildSettings` (L8260); cage types live in the farm create/edit sheet
(`buildCageTypesEditor`, L3278), not in their own tab. Want a clear **"Gear"** entry under Settings.
**Two readings to confirm at build (they could be one combined tab):**
- (a) **Gear types** — promote cage-type/gear management out of the create/edit flow into its own
  Settings → Gear tab (ties to the "Master gear catalog → farm picks what it has" note above and the
  OysterGrow-float 4th-type note below).
- (b) **Onshore gear inventory** — equipment sitting on the dock, not in the water (the "Gear tab for
  onshore gear" note above).
Code hooks: add a `list.appendChild(item('gear', 'Gear', …, function(){ openSheet(buildGear); }))` row
in `buildMenu`; new `buildGear` sheet modeled on `buildSettings`/`buildGrades`. Confirm (a) vs (b) vs
both before building.

## Bugs & friction

### BUG — line numbering is off when adding lines via the area editor (NEW 2026-06-24, found in use)
Editing an area and adding lines produces wrong/jumping line numbers.

**Root cause (confirmed in `spatmap.html`):** new lines are appended to the END of the flat
`farm.lines` array — `buildLinesForArea` (L1855) sets `baseOrder = farm.lines.length` and names each
line `'Line ' + (globalIdx+1)` by **global append order**, not by its position inside the area. With
more than one area, a line added to an *earlier* area lands physically inside that area on the map but
gets a high global number (and its cage labels `N-c` use the global line index too). So Area 1 reads
"Line 1, 2, 3, … 7" — the per-area sequence jumps. `reindexLines` (L3032) re-derives `l.order` and the
cage `c.label` but **never updates `l.name`**, so the stored name drifts further from the line's actual
position on every add/remove.

**Fix direction:** insert new lines at the correct global slot *within their area* (splice, don't
append), then re-derive `name` for ALL lines in `reindexLines` (currently it skips `name`) — or move to
a per-area label scheme (see the a/b/c request below). Touches `buildLinesForArea`, `setAreaLineCount`
(L1909), `reindexLines`.

### FEATURE — a/b/c suffix on each line for cross-area row continuity (NEW 2026-06-24)
The areas are interconnected: each physical row of the farm continues from one area into the next. Want
to label lines so a single row that runs across areas reads as one row split into segments — e.g. Line
**1a** in Area A continues as **1b** in Area B, **1c** in Area C. Lets you see at a glance that "1a /
1b / 1c" are the same run of water. Pairs with the numbering fix: the label scheme should encode
**row number + area-segment letter**, replacing the global append-order name. Decide at build: is the
"row" the Nth line within each area (positional), or an explicit link the user draws between line ends?
Positional (Nth line of each area = same row) is the cheap first pass.

### FRICTION — can't switch areas inside the Work tab (NEW 2026-06-24, found in use)
Once you drill into one area's work list (tap an area's **"Open ›"** chip on the map), there's no way
to step to another area from inside that list. The only path back is the **Back** chip (top-left, shows
"Plot · Area") → returns to the overview map → tap the next area's "Open ›". No direct area-to-area
pager/swipe. **Fix direction:** add prev/next-area controls (or a small area switcher chip) to the
scoped Work top bar so you can move between adjacent areas without backing all the way out. Code hooks:
`renderTopBar` scoped branch (L2496), `viewScope`/`scopeNames` (L2534), `drillIntoArea` (the drill that
sets scope), `linesInArea` for the adjacent-area lookup.

### WORKFLOW — fill should be cage-first, then pick the batch (NEW 2026-06-24)
After splitting the tub into batches, filling is backwards. Today you arm a split-batch chip *first*,
then select cages. Flip it: **select the empty cages to fill, then the available batch(es) pop up** to
choose which one drops into them. Make the whole split → fill loop seamless — the natural motion is
"these cages, that batch," not "that batch, then hunt for cages." Decide at build: if only one batch is
on the tub, skip the popup and fill directly; if several, the popup is a quick batch picker (count ·
grade · origin per chip). Code hooks: the fill path (fill-from-barge / armed-split fill), the split-
batch chips on the tub sheet, `workCages`. We'll get around to it.

### BUG — multi-select loses the Remove button (NEW 2026-06-24, found in use)
Selecting more than one cage removes the ability to Remove them. **Root cause (confirmed):** in
`renderPopup` (`spatmap.html` L8763-8766) the **Remove** button is gated to `if (n === 1)` — it renders
only when exactly ONE *empty* cage is selected (it lives in the `allEmpty` branch, so it never shows for
filled cages either). Pick two cages and the button disappears. **Fix:** `removeCages` already takes an
id array and is called with `selectedIds()`, so dropping the `n === 1` guard makes Remove work on a
whole empty-selection as-is (near one-line). Decide: keep Remove empty-only (filled cages must be pulled
first — the current safety), or add a guarded multi-remove for filled cages with a confirm, since
removing a filled cage destroys its batch.

## Data safety / forward-compatibility (PLAN — NEW 2026-06-24)

**Goal:** updating the app (re-deploy, even with the version string still v4) must NEVER lose a farm or
reset it to empty. Data written by an older build must keep loading in every newer build.

### What's already protecting us (verified in `spatmap.html`)
- **Stable key:** `STORAGE_KEY = 'cageTrackerData'` (L1478), explicitly "KEEP this exact key." Never
  change it — a new key = instant empty farm.
- **Additive, idempotent migrations:** `migrateFarm` (L1520) → `ensureSpatialIndex` / `migrateBatch`
  (L1994) / `migrateEvent` (L2020) backfill missing fields and normalize legacy shapes; they don't
  delete. `migrateFarm` runs on every load (L1510).
- **Recovery snapshots:** `:prev` blob saved alongside every write (L8451); persist-on-boot; the
  full-fidelity export-with-photos backup.

### The real risks (to fix when we get around to it)
1. **SHARED-ORIGIN COLLISION (highest).** localStorage is per-origin, not per-path. `index.html` (v7,
   live root) and `spatmap.html` (v4) BOTH use key `cageTrackerData` on `philipinosis.github.io` but
   carry **different schemas + different `migrateFarm`**. Opening both on the same device makes each
   app's migrator run on the other's data; last-saver-wins. **Decision needed:** treat `spatmap.html`
   as THE app and never open the v7 root on a device that holds real data (cheapest — discipline only),
   or retire the v4/v7 split so one schema owns the origin. Do NOT "fix" by namespacing the key per
   version — a new key resets the farm.
2. **No stored schema version → no forward guard.** Nothing stamps which build wrote the data, so an
   OLDER app can load a NEWER blob and a reconstruct-style migration could silently drop fields it
   doesn't know. Fix: stamp `state.schemaVersion = N` on save; on load, if stored > known, take the
   preserve-unknown-fields path (round-trip untouched) + keep a backup before migrating, instead of
   blindly down-migrating.
3. **Unknown-field preservation not guaranteed.** Migrations must mutate in place so fields a build
   doesn't recognize survive a load→save round-trip. Audit `migrateFarm`/`migrateBatch`/`migrateEvent`
   for any spot that rebuilds an object from scratch (those strip unknown keys).

### Plan
1. **Never** change `STORAGE_KEY`. Document it as a hard rule.
2. Keep migrations **additive + idempotent + in-place only** — deprecate a field by ignoring it, never
   by deleting. Add one line to a `DATA-SCHEMA.md` changelog whenever a field is added.
3. Add `schemaVersion` stamping + the forward guard (#2 above): newer-than-known data is preserved, not
   down-migrated, and a raw backup is snapshotted before any migration.
4. Resolve the shared-origin collision (#1) — pick the single-canonical-app discipline now, plan the
   v4/v7 unification later.
5. Add a **migration test harness:** keep a fixtures folder of real exported farm JSONs from each
   version; on every build, load each through the new `migrateFarm` and assert farm/cage/batch counts
   and total oyster count are conserved (0 loss). This is the check that PROVES forward-compat before
   shipping — formalize the conservation check we've been doing by hand (e.g. 45,200 → 45,200).
6. Keep the recovery layers (`:prev`, persist-on-boot, export-with-photos) and add a second clean-load
   backup key (`cageTrackerData:safe`) written only after a successful load+migrate, so a botched
   migration can roll back.

## Design / UX

### Farm Layout folded into onboarding — SHIPPED 2026-06-26
New-farm setup now ends IN the Farm Layout editor instead of dropping you on the overview with a flat
single-area farm to reorganize later. Picked via a 3-round multi-agent planning loop (3 competing plans →
critic-hardened → adversarial break): rejected a create-early "wizard-step" rebuild (≈15× the diff, fragile
splice-rollback) and a bare drop-into-editor (under-guides). **Chosen: reuse `buildLayoutEditor` verbatim,
route in as a guided first-run step**, gated behind one transient global `obLayoutFirstRun` (never persisted;
zero data-model change). What it does:
- `createFarmFromModel` tail: `persist()` (not `commit()`, no flash) → `history.replaceState(null,'')` →
  `enterLayoutView(true)`. So both chromes (first-run page + "+ New farm" sheet) land in the editor.
- `enterLayoutView(firstRun)` sets the flag authoritatively on EVERY entry (menu path = no arg = false, so it
  can't leak) and pre-selects the lone area; `leaveLayoutView`/`restoreFromState` clear it.
- Editor in first-run: topbar `[· name · Finish]` (no ‹Map/gear), one top coach pill, action bar trimmed to
  `[area · Edit area]`.
- S3 stays as the seed grid; subtitle reworded (dropped the false "design your real layout later").
The adversarial round caught THREE drill-out leaks the first cut missed — all now gated by `obLayoutFirstRun`:
(1) the on-canvas selected-area "Open ›" chip in `drawArea`; (2) the Edit-area sheet's own "Open this area ›"
button; (3) a history regression where "+ New farm" from a *drilled* work map left a stale `{view:'work',scope}`
under the pushed `{view:'layout'}` (fixed by the `replaceState`). QA'd in Playwright: full wizard run, both
chromes, Finish→overview, flag-clear, menu-editor-still-normal (full action bar + chip back), demo path skips
the editor, H3 drilled-create lands on the new farm's overview with `viewScope:null`, 0 console errors.

### Work ↔ Overview unification — geometry parity SHIPPED 2026-06-26 (tap-to-bump + axis parity + pill switcher; full canvas still deferred)

**✅ Built (2026-06-26): geometry parity — the Work map now reads as the same shape as Overview.** Philip's
"Brightside" farm runs both orientations (Q1/Q2 horizontal E–W, Q3/Q4 vertical N–S 2-line quarters); an old
build rendered the vertical work views as columns and the SVG refactor dropped it, leaving the disorientation.
Fix (chosen scope = geometry parity, NOT the full SVG-canvas rewrite — drag-select kept on the DOM):
- **Vertical areas render as columns again.** `render()` adds an `.axv` class to `#mapwell` when the scoped
  area's `axis==='v'`; a CSS-only block flips `.mapwell`/`.lineBody`/`.cageStrip` to column flow (vertical rope,
  side-flipped tens-ticks, vertical tap target). `renderLine`/`renderCageCell` DOM untouched, so
  `denseRangeSelect`/`syncPopup`/`drillToCage` keep working. Horizontal path byte-identical (every change is
  `.axv`-gated). `drawBand` gets one `closest('.axv')` branch to draw the drag band on top/height; `syncPopup`
  needed no change (already viewport math).
- **Pill-tab area switcher restored** (`renderAreaTabs`, mounted between topbar and stat strip) — tap any area
  in the plot to jump straight to it via the existing `doDrillSwap`; reuses `.chip`/`.chip.on`. The active pill
  is inert (`onclick:null`) so re-tapping can't double-push history. The redundant prev/next arrow pager was
  removed (net code reduction).
- Zero data-model change; old farm JSON loads unchanged. QA'd in Playwright (vertical render, vertical
  drag-select + band + popup, horizontal regression, pill jump, active-pill no-op, clean console). NOTE for
  future QA: `file://` is blocked in Playwright — serve the single file over `python3 -m http.server` first.

**✅ Built (2026-06-24):** **tap a cage in Overview → "bump into" Work.** Second-tap on a cage in the
overview map now drills into that cage's AREA and lands the Work map scrolled-to + briefly pulsing that exact
cell (teal `.cageFocus` ring, distinct from selection). Was a dead-end `buildCageDetail` modal. Render/nav
only — `drillToCage(cageId)` (resolves `lineOfCage`→`areaOfLine`, arms a transient `pendingFocusCageId`,
reuses `drillIntoArea`); consumed once in the Work render; **focus ≠ selection** (never writes `selCages`/
arms a fill), not on history (won't survive Back). Zero persisted-data change. Browser-verified end-to-end;
daily-work selection/drag/popup untouched. This was the investigation's recommended high-value, low-risk slice.

**✅ Resolved by the 2026-06-26 build:**
- **Order/orientation parity** (was Chunk 3): done — the Work map now flips to columns for `axis==='v'` areas
  (we took the "flip the stack" path, not the cheap hint). Arbitrary `rot` angles still render as clean h/v,
  not literal tilt — acceptable per the chosen scope.
- **Between-areas affordance** (was Chunk 4): done via the pill-tab switcher (jump to any area in one tap).

**⏳ Still deferred (the bigger ask):**
- **One shared zoomable canvas for both views** (Philip's literal "draw the lines in the same plot"). Still a
  *render-only* possibility but still requires porting **drag-select (`denseRangeSelect`) + popup (`syncPopup`)**
  off the CSS-flow DOM onto the SVG `.lp-cagecell` hit-rects — a rewrite of a dogfooded subsystem, high
  regression surface on the on-water tool. Geometry parity (2026-06-26) was the agreed lower-risk substitute;
  revisit the full canvas only if the same-shape Work map still isn't enough.

**Original friction + investigation (kept for context):** the **Work tab** and the **Overview tab** are structured differently —
the lines lay out differently between them, which is confusing/disorienting. They should be the *same* one
spatial picture. What he wants:
- **Tapping a cage on the map should bump you into that view** — tap a cage/area and land in the right place
  in the other view (consistent drill, not two unrelated layouts).
- **Pan/zoom around the plot and work fluidly between areas** — one zoomable plot canvas (builds on the
  within-plot area pager already shipped 2026-06-24).
- **Hypothesis to test:** the current model organizes lines *per area / as "different lines"*, and that split
  may be the wrong call. Maybe lines should just be **drawn in the one shared plot** so both views render the
  SAME geometry. "I had set this up to be able to do different lines but maybe this is wrong."

**Why it happens (confirmed in `spatmap.html`):** there are two render paths over the same lines —
- **Overview** (`viewMode==='overview' && !viewScope`, ~L2503; non-SVG replacement at ~L4105) draws the TRUE
  spatial plot — real plot/area/line positions, owns `LAYOUT.svg` (the layout editor's geometry).
- **Work map** (the scoped daily-work view; `renderLine` ~L2995, `drillIntoArea` ~L6592) lays the lines out
  in its OWN arrangement (a list/flow), NOT the SVG positions. So the same farm reads as two different shapes.

**Research questions for later (don't build yet):**
1. Can the Work view render *from the same plot geometry* as Overview (one source of truth = the `LAYOUT.svg`
   plot/area/line coordinates), just at a closer zoom, instead of its own list layout? That would make
   tap→drill and pan-between-areas "just work" because there's one coordinate space.
2. Is the per-area line split (areas owning their own `lineIds`, `reindexLines` area-relative labels) actually
   needed, or can lines live directly in the plot with areas as zoom regions/overlays? Weigh against what the
   area model currently buys (the `1A`/`2B` labels, area scoping, the area pager).
3. Migration/data cost: lines already carry `plotId`/`areaId` + the spatial index (`ensureSpatialIndex`) — how
   much of the unified view is a *render* change vs a *data-model* change? Prefer render-only if possible.
Touchpoints to start from: `renderTopBar` view branches (~L2503/2535/2575), the overview vs work render split
(~L4105), `renderLine` (~L2995), `drillIntoArea`/`doDrillSwap` (~L6592), `ensureSpatialIndex`, `LAYOUT.svg`.

### Map legend / key (NEW 2026-06-24)
The map uses color + glyphs to encode cage state, but there's no key explaining them. Add a legend so a
new user (or a buyer/inspector looking over a shoulder) can read the map. **What it must decode (the
real vocabulary in `spatmap.html`):**
- **Cage fill colors** — `STATUS_COLORS` (L2219): `empty` slate `#3C5560`, `fresh` green `#51B97B`,
  `mid` amber `#D38C33`, `old` rust `#CB5A2F`. Spell out what fresh/mid/old actually mean (work-recency
  / time band — confirm against `cageStatus`, L2399).
- **The ready dot (●)** — sale-ready flag; and the **needs-work** indicator (`needsWork`).
- **Cage shapes** — each gear type draws a different glyph (`shapeSVG`); the legend should map shape →
  gear type for that farm.
- **Plot / area tiers** and the **barge/tub** object if space allows.
**Where it lives:** a tappable "?" / key chip on the map that opens a small legend sheet (cheapest), or
fold it into the Menu. Note: `renderStatStrip` (~L2546) already shows colored count dots (ready /
filled / empty) — that's a partial legend to build on, not duplicate. Keep it dynamic — only show the
gear shapes/colors this farm actually uses.

### Line label on the border — fit more lines per screen (NEW 2026-06-15)
Render each line's text (the line name/label) on the line's border/edge instead of on its own row above the cages. Putting the label inline on the border reclaims the vertical space each line currently spends on a separate header row, so more lines fit on one screen without scrolling. Goal: denser line list, same readability — the label rides the line itself.

### Rotate the cage rectangles on the line
Turn the cage rectangles the other way (rotate 90°) so they sit correctly along the line.

### Different cage shapes
A way to make cages of different shapes — not all one shape/glyph. Ties into the visual map editor: cage shape should reflect the real gear (e.g. different shapes for different cage types/gear).

### Overall graphic design needs work
I generally don't like the graphic design of the project. The whole visual look needs a rethink, not just tweaks. (TODO: pin down what specifically feels off — color, typography, the dot/cage glyphs, density, the map style — so a redesign has direction. Worth a frontend-design pass.)

### OysterGrow float as a 4th cage type (holds various bag types inside it)
Add the OysterGrow float as a distinct gear type in the cage type system — separate from the bare OyGrow cage. The float is a rectangular floating rack/cradle that holds multiple individual mesh bags inside it (Vexar, etc.), so multiple bag types can ride inside one float unit.

- New shape glyph: top-down view of the float frame with pontoon strips on the long edges and 3–4 visible bag shapes inside the frame, each with their own mesh marking.
- This is visually distinct from: the standalone OyGrow cage (mesh interior, no bags) and standalone Vexar bags (individual blob shapes).
- The "bag type" inside the float could be a secondary field on the cage type — or just visible in the name (e.g. "Float / Vexar" vs "Float / FlipFarm").
- Add as a 4th entry in `defaultCageTypes()` and in `SHAPES`/`SHAPE_LABELS`, and add the SVG branch in `shapeSVG()`.

-

## Data model

-

## Sync / hosting / backend

-

## Mobile / field use

-

## Someday / maybe

-

---

## ── Built in index-6.html (2026-06-14) ──

### Pull/Fill popup + barge (shipped in index-6)
Drag across cages to select them — no Select button needed. A floating popup appears above the selected cages: "Pull" if they're stocked, "Fill" if they're empty and a batch is on the barge. Tapping Pull clears the cages and sends the estimated oyster count to the barge. An illustrative SVG barge (two fishermen — one active/reaching, one supervising — with a detailed shell pile, mesh bags, bushel basket) appears on the right side of the ocean view. After Fill, the barge stays visible in a placed state (ghost pile, fishermen relaxed) until dismissed with ×. Full oyster lineage is preserved: pulled cages record a note with the batch ID; filled cages get a batch carrying the original origin (source lines + date). Remainder distribution ensures no oysters are lost when cage count doesn't divide evenly. Bottom selbar (Empty/Remove/Harvest/Work) removed; Work and Harvest are accessible from the pull popup.

---

## ── Built in index-3.html (2026-06-14) ──

### Pulling cages creates a batch (oyster lineage that travels) (shipped in index3)
When I pull / empty cages, the oysters that were in them become a **batch** (what I used to call a "set"). The batch is a real object I can act on, holding the oysters as data that travels with them.

Flow:
1. Select e.g. 5 cages, empty them → that creates one batch (pooled oysters from those cages).
2. Batch shows up somewhere off to the side (a holding area — see visualization below).
3. Click the batch → log what I did to them + record their sizes/grade.
4. Select a range of cages → drop the batch into them (re-stock).
5. Everything is logged. The oyster history stays attached to the batch as it moves cage → batch → cage.

**Dream:** that running history feeds a growth chart to estimate harvest date.

Visualization proposal (Claude's take — for discussion):
- A persistent **"On deck" / holding tray** — a slim drawer or side rail that holds batch chips for oysters currently out of the water (mirrors oysters sitting on the boat/dock between cages). Empty cages on the map go pale/hollow; their oysters now live as a chip in the tray.
- Each batch chip shows: count, origin (which cages/line + date pulled), last action, current size/grade.
- To re-stock: tap a batch chip → "Place" → select the target cage range → confirm. Or drag the chip onto selected cages.
- The chip carries a lineage trail (pulled from Line 1 Q1 on date X → graded → placed in Line 3). That trail is the data the growth chart reads.
- Terminology: settle on one word — **batch** (retire "set").

### Harvest button + Harvest log tab (shipped in index3)
Next to the select-mode "Work" button (the renamed "Log"), add a **"Harvest"** button that creates a harvest.

- Keep it un-invasive: tapping Harvest just asks **how many we harvested**, then drops it in the log. No long form.
- Harvests get their own **tab in the main menu** — a running log of every harvest.
- Should capture enough to be useful later (date, which cages/line, count, ideally grade/batch lineage) without making me fill all that out — pull what it can from the selected cages automatically, ask only for the count.

### Seed receptions tab — the start of the lineage (shipped in index3)
Another tab in the menu for **seed receptions** — when seed arrives on the farm. This is where each oyster's record begins: the first data point (date received, hatchery/source, count, initial size, batch/lot).

- From reception onward, every oyster is tracked through its whole life — reception → stocked in cages → worked/graded → moved between cages (batch lineage) → harvest.
- This closes the loop: Seed receptions (birth of the record) → Batch/Work flow (life) → Harvest log (end). Same lineage data feeds the growth chart and harvest-date estimate.

### Oyster counts by grade — readout (shipped in index3)
Under this menu, a readout of all oyster numbers totaled by grade — how many oysters I have in each grade across the whole farm. (Confirm where this lives: in the Gear tab, the new Layout panel, or its own spot.)

### Cage sheet: size → grade dropdown (shipped in index3)
When I click a cage, change the "size" field to **grade**, shown as a dropdown menu instead of a measurement.
- Grades come from the list I manage under the general menu (the existing Grades tab — add/rename/reorder grades there).
- Open question: does grade replace the mm measurement entirely, or sit alongside it (measure mm → auto-maps to a grade)? The by-grade readout above depends on this.

### Current "set" transfer doesn't pool the count, so it can't redistribute evenly (shipped in index3)
In today's "set" workflow, when I pull/empty several cages it never adds up the total number of oysters into one pool. So when I transfer that set into a different group of cages, it has no total to work from and can't split the oysters evenly across the new cages.

What it should do: sum every oyster from the emptied cages into one batch count, then divide that total evenly across however many target cages I pick (e.g. 1,000 oysters from 5 cages → into 4 cages = 250 each). The batch workflow above is the fix — the batch holds the pooled total, and "Place" spreads it evenly across the selected cage range.

### Two-tier cage tap: peek + select first, ⋯ to full page (shipped in index3)
Tapping a cage should give a light pop-up with its data and **select** the cage — not jump straight to the full sheet.
- From that pop-up, a small **tri-dot (⋯) menu button** takes me to the cage's full main detail page when I want it.
- This first/select layer supports **multi-select** — tap several cages to select them together (then Work / Harvest / etc. act on all of them).
- So: tap = peek + select (multi); ⋯ = open the full cage page. Keeps the fast path light and the deep path one tap away.

### Rename select-mode "Log" → "Work" (shipped in index3)
In select-cage mode, the action button currently labeled "Log" should say **"Work"**.
