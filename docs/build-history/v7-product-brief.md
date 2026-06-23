# SpatMap v7 — Product Brief (AUTHORITATIVE)

Ground-up rebuild. Captures Philip's spoken workflow verbatim-in-intent (2026-06-15). This is the
source of truth. Where this brief and any older doc disagree, **this brief wins.** Older docs
(`_notes-and-ideas.md`, `_farmer-notes.md`, the `_opus-*` audits, index-3..6) are reference and a
parts bin, not the spec.

## North star
A new oyster farm opens the app on a **phone or iPad**, designs their farm in minutes, and from then
on runs their daily on-the-water work through it: fill cages with seed, pull and redistribute oysters,
work cages, harvest, and watch their oysters grow. **The #1 rule is SIMPLE.** The last version became
cluttered and complicated. Every screen should be obvious with a wet thumb. When in doubt, cut.

Top priorities Philip named explicitly:
1. **Simple.** Not cluttered. Few taps. Obvious.
2. **Log growth + good growth projections.** Track size over time; project the harvest date.
3. **Photos attached to cages / oysters.** Click an oyster at any point in its life and see photos of
   it across its whole time on the farm (reception → growth → harvest).
4. **Full lineage / history.** Track each oyster batch through its entire cycle on the farm.

## Device & tech constraints
- Phone-first (≈390×844) and iPad. Touch-first: drag-to-select, big tap targets, thumb-reachable actions.
- Single-file offline web app (one `index.html`, vanilla JS, no build step). Deploys to GitHub Pages.
- State in `localStorage`. **Photos in IndexedDB** (see `PHOTOS-IMPLEMENTATION-PLAN.md` — that
  architecture is sound: compress to ~1280px JPEG, store blobs in IDB, never base64 in localStorage).
- No server/sync required for this build. Keep the data model sync-friendly but **do not** build
  Supabase sync now — it is out of scope and a complexity risk.

## The workflow (authoritative — build exactly this)

### A. Onboarding — design the farm (also reachable later as the "Farm Layout" menu tab)
A brand-new farm is walked through setup. They define:
- **Lines** — how many longlines they have in the water.
- **Cages per line** — how many cages (a.k.a. baskets — used interchangeably) on each line.
- **Cage types** — what types of cages they run (each type has a name, a shape glyph, and a **mesh size**).
- **Oyster details:**
  - **Grades** — the grades of oysters they use (custom vocabulary).
  - **Market size** — the size of a market oyster *to them* (target size for projections).
  - **Neglect alert interval** — the longest acceptable time between working a cage; drives a
    "needs work" alert when a cage goes untended past this.
This same screen lives in the menu afterward as the **Farm Layout** tab — farmers return to it to swap
cages, add/remove lines, change types, edit grades/market size/alert interval.

### B. Fill cages with oysters (new seed) — happens on the main farm-layout/map screen
1. Tap a cage → it **selects**.
2. **Swipe a finger across** the run of cages they want to fill → the range selects.
3. A small popup appears **above the selection** with **Fill**.
4. Tap **Fill** → a form asks the oyster details going into those cages:
   - **How many** (count)
   - **Size** (mm)
   - **Ploidy** (diploid / triploid)
   - **Hatchery** (where the seed came from)
   - **Notes** (small free-text)
   - **Photos** — attach photos (e.g. a shot of oysters in the farmer's hand); thumbnails visible in
     this menu.
   Confirm → those cages are now filled with this batch.

### C. The work cycle (pull → barge → fill / harvest)
- **Pull (filled cages):** Select a range of filled cages → a popup shows **Pull**. Tap Pull → those
  oysters come out and pile onto a **little barge** (the "working pile"). The cages go empty. The
  barge shows a **mountain of oysters that grows visually as more are added.** Lineage is preserved —
  the barge knows which cages/lines/batch these came from.
- **Fill from barge (empty cages):** Select a range of empty cages → popup shows **Fill**. Tap Fill →
  the oysters sitting on the barge pile are **divided evenly** across the selected empty cages.
  (Fill is context-aware: barge empty → new-seed form from step B; barge has a pile → distribute the pile.)
- **Harvest (tap the barge):** Tapping the barge pile opens the **harvest menu**. The farmer types
  **how many oysters were harvested** and can see the **history of the oysters** on the barge. Logs to
  the harvest log. The mountain shrinks/clears as harvested.
- **Work (a filled cage):** The cage popup offers **Work**. Work opens a menu to record how the
  oysters were worked: **tumbled, washed, desiccated, flipped** (shown **past tense**; the cage shows
  the **last thing that happened** to it). The Work menu also shows the **history** of the oysters in
  that cage. Working a cage resets its neglect timer.
- **Remove (an empty cage):** When a cage is empty, the popup option is **Remove** → the cage is
  **removed from the line, but the line stays** (the line keeps its place; just one fewer cage on it).

### Popup action matrix (the contextual popup above a selection)
- Selection is **all filled** → **Pull**, **Work**
- Selection is **all empty**, barge has a pile → **Fill** (distribute from barge), **Remove**
- Selection is **all empty**, barge empty → **Fill** (new seed form), **Remove**
- Single empty cage → may also show **Remove**
Keep the popup tiny: 1–2 primary buttons for the selection's state. No giant action bar.

### D. Harvest log + history (menu sections)
- A **Harvest Log** section in the menu: a running log of every harvest (date, count, which cages/line,
  grade/lineage pulled automatically where possible).
- **History / lineage** is viewable per cage and per batch: reception/fill → worked events → pull →
  on barge → re-fill → harvest. Each step timestamped. **Photos appear along this timeline**, so
  tapping into a cage/oyster shows photos across its whole life on the farm.

### E. Growth + projection
- Log growth by recording **size (mm)** over time (on fill, on work/growth checks).
- A **growth chart** per cage/batch and a **projected harvest date** = when it reaches the farm's
  market size. Use the batch's own measured rate when there's enough data; fall back to a sensible
  seasonal/default rate otherwise. Be honest about confidence.

## What to KEEP from the old app (parts bin — harvest, don't re-derive)
- The **illustrative SVG barge with fishermen** + growing oyster pile (index-6) — Philip loves it.
- **Gear-accurate cage glyph SVGs** + mesh-size data model (index-3).
- The **growth/seasonal projection math** and the honest projection copy.
- The **IndexedDB photo architecture** from `PHOTOS-IMPLEMENTATION-PLAN.md`.
- The **drag-to-select + floating popup** interaction (index-6 had it; simplify it).
- Clean **bulk forms**, prefilled dates, plain confirmation toasts, **Undo** on destructive actions.

## What to DROP / simplify (the clutter that crept in)
- Heavy hierarchy: Areas → Plots(Q1–Q4) → Lines. **Flatten** toward Farm → Lines → Cages. Keep an
  optional grouping only if it truly stays simple; default to a flat list of lines.
- The **sort wizard**, station/gauge pickers, NWS forecast panels, detached-spot states, multi-step
  set sheets — cut or hide. They made it complicated.
- Multiple competing action surfaces (bottom selbar **and** popup). One model: **drag-select → popup.**
- Vocabulary drift (Log/Work/Growth check). Pick one word per concept and use it everywhere.

## Acceptance test (Philip will judge by this; we verify by SIMULATING it in a real browser)
On a phone viewport, a fresh user can, with no instructions:
1. Onboard: create a farm with N lines × M cages, pick cage types w/ mesh, set grades + market size +
   alert interval.
2. Drag-select empty cages → Fill → enter seed (count/size/ploidy/hatchery/notes + **a photo**) → see them filled.
3. Drag-select filled cages → Pull → watch the barge pile grow.
4. Drag-select empty cages → Fill → oysters distribute evenly from the barge.
5. Work a cage (tumbled/washed/desiccated/flipped) → cage shows last action, neglect timer resets.
6. Tap the barge → Harvest → enter count → it lands in the Harvest Log.
7. Remove an empty cage → it leaves the line; the line stays.
8. Open a cage → see its full history timeline **with photos across the batch's life**, a growth chart,
   and a projected market date.
9. Let a cage exceed the alert interval → it shows a "needs work" state.
Everything must work, feel simple, and look good on a phone.
