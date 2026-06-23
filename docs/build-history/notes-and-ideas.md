# SpatMap — notes & ideas

Running list of things to add or change. Drop raw thoughts in the Inbox; move them into a bucket when they firm up. Started 2026-06-13.

> **How this file works:** Everything above the uppermost `── Built in ──` divider is NEW — not yet built, for the next build. Sections below the dividers document what shipped in each version.

> **BUILD BASE (set 2026-06-15):** From here on we build off **last night's app — `index.html` (the v7 rebuild)**. That is the canonical file. The overnight build verified the full interaction core (drag-select, pull → barge, fill-from-barge, work, harvest, remove, cage history + growth projection). Photos (Builder 3) are the main carryover still not built. The older `index-3..7.html` are history only. Note: `DIRECTORY.md` still labels index-3 "PRODUCTION" — that's stale; index.html (v7) wins (being corrected). Several "Features to add" entries below (Pull/Fill popup + barge, batch lineage, harvest log) already shipped in v7 and are kept only for history — check the live index.html before rebuilding any of them.

---

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

## Bugs & friction

## Design / UX

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
