# SpatMap field sim — "April", fresh farmer, SPRING

**Persona:** April, first-time user, small FlipFarm/OysterGro operation, setting up for
the season. Not techy, impatient, working one-handed on a phone in the truck.
**Slice:** Spring (March–May) — first run, onboarding, build the farm, stock new seed,
set grades + prices, learn the map, then peek ahead ~75 days to early summer.
**Rig:** local `spatmap.html`, headless Playwright, iPhone 14 Pro Max (430×739), clock
faked to 2026-03-20, then jumped to 2026-06-03. Drove the real touch UI.
**Result:** 0 JS console errors across the entire run. Onboarding is excellent. The wall
is *after* the farm exists: getting from the new-farm home to a stocking surface is not
discoverable. Everything downstream (stocking, grades, prices, dashboard, forecast) is
clean once you reach it.

Screenshots: `tests/reports/shots/spring-newfarmer/` (01–26 main run; 9xx probe runs).

---

## Day-by-day narrative

### Build the farm (onboarding) — fast and clear
Fresh launch drops straight onto a welcome screen: big "SpatMap" title, "Design your
oyster farm, then run your day on the water from it," one primary **Build my farm** and a
secondary **Explore a demo first** (01). No ambiguity about where to start.

The wizard is three labelled steps with a dot tracker ("Step 2/3"):
1. **Name your farm** — single field, Next is correctly disabled until you type, Enter
   advances. Typed "Tidewater Oyster Co." (03).
2. **What gear do you run?** — starts with one default "Cage" row; I renamed it FlipFarm
   (rect, 6), added an OysterGro (circle, 9) with "+ Add type" (05). Big tap targets.
3. **Ready to build** — a review card (NAME / GEAR) you can tap to jump back, with the
   honest note "Grades, market size, and alerts use defaults — set them in Settings" (06).

**Create farm** drops you into a guided first-run layout editor (07): your farm is already
drawn as one area with 4 lines, a coachmark explains +Plot/+Area, and crucially you can
**"just tap Finish"**. Tapping Finish lands on the farm home (08).

Taps to a usable 40-cage farm, accepting gear defaults: Build my farm → (type) → Next →
Next → Create farm → Finish = **5 taps + one text field.** That is a genuinely good
onboarding. The default 4 lines × 10 cages is a sensible starting farm.

### "I built my farm… now how do I add my oysters?" — the wall
The home is the read-only **Overview** map (08). It shows the farm, an empty-ish set of 4
lines, a `[Map | Data]` toggle, a hamburger menu, and a conditions bar nudging
"no water data yet · PICK SITE +". There is **no Stock / Work / Add-seed affordance
anywhere on this screen.** A first-timer's instinct — tap the farm/area to go in — does
nothing: a single tap on the area body is a no-op (confirmed in code and by 4 dead taps in
the run). Tapping an individual cage opens a per-cage detail sheet (which does have a big
**Fill** button — see 952), but the cages on the zoomed-out home are ~6 px tall (measured
27×6 px), so hitting one, twice, is a fight.

I could not reach the efficient multi-select work map by tapping the map at all. The real
route (found by probing) is **Menu → Farm Layout → tap the area → "Open ›"** — about 4
taps, *through the layout editor.* No new farmer thinks "to put seed in my cages I open the
Farm Layout designer." The menu itself has no "Work" or "Daily work" item (its 12 entries
are Find a cage, Farm Layout, Needs work, Harvest forecast, Stock health, Seed source
scorecard, Harvest Log, Grades, Gear, Map key, Settings, Data). For the run I logged this
as a navigation failure and used the debug drill to continue.

### Stocking spring seed — clean once you're in the work map
Inside the scoped work map (14) everything works well. Lines render as rope-on-pilings,
cages are properly sized glyphs, and tapping cells selects them. Five taps on line 1A → a
popup "5 empty cages · new seed" with **Fill** / **Remove**. Fill opens "Fill — new seed"
(12): How many (e.g. 600), Size mm (e.g. 22, "used to project harvest"), Ploidy
Diploid/Triploid chips, Hatchery, Notes, Photos, Date. Big inputs, good hints. I stocked
750 @ 12 mm triploid Grand Isle, then a second batch (1200 @ 10 mm) on line 2A. The map
immediately shows the stocked cages in green with a "Filled 5 cages · Undo" toast (14, 22).
This is the strongest part of the app.

Two snags in the form: there is **no Grade field** (grade is taken from the cage, which is
null for new seed), and the primary **Fill N cages** button sits *below* the optional
Notes/Photos/Date, so you scroll past optional fields to commit.

### Grades + prices — clear editors, but prices don't bite yet
Menu → Grades: chip editor, "Add grade + Enter" — added Standard, Petite, Jumbo (no
friction). Prices live in their own sheet (Menu → Harvest forecast → Oyster prices, or the
dashboard's "Set oyster prices ›"). The price editor (21) is a tidy $/oyster row per grade
plus "Default / ungraded," with "drives the crop value on your dashboard."

Catch: new seed is **ungraded**, so the per-grade prices I set never touch the value of
growing stock — only the **Default** price does. A farmer who carefully sets Standard /
Petite / Jumbo prices in spring sees them do nothing to "$ on the water" until oysters are
graded at harvest. Nothing explains this.

### Read the dashboard — correct and legible
`[Map | Data]` → Data (23): "**$3.8k on the water**" (8.6k ungraded oysters × $0.45 default
≈ correct), "**0 oysters sale-ready ›**" (right — seed is 10–12 mm vs 76 mm market), a
count run "8.6k oysters · 9 filled · 31 empty," and a recent-activity feed. Clean, big
numbers, no "$0" trap (before prices it shows a "Set oyster prices ›" CTA instead).

### Peek ahead ~75 days — the per-cage projection makes sense; the forecast sheet doesn't move
Jumped the clock to 2026-06-03 and re-rendered. The **Harvest forecast** sheet (24/26) is
bucketed: READY NOW 0, COMING UP "Later / 1+ yr" 8.6k · 9 cages, INVENTORY BY GRADE
Ungraded 8.6k. It reads identically at spring and at +75 d — correct for tiny seed (still
>1 yr to market) but unsatisfying when you deliberately jumped ahead to "see growth."

The real growth view is per cage (962): hero "12 mm," "In water 2 mo" (the clock jump took
effect), **PROJECTED HARVEST ~Jun 2027 (76 mm)**, a "Low confidence projection: based on a
typical Gulf growth rate — log growth checks to use this cage's own pace," "~0.18 mm/day ·
~5.5 mm/mo," and a Mar 2026→Jun 2027 growth chart. That is honest and sensible: ~15 months
for 12 mm spring seed to hit 76 mm at the prior rate, clearly flagged as an estimate. But
it's only reachable by drilling into a single cage, not signposted from the forecast.

---

## Friction log (by severity)

### Major
**M1 — No discoverable route from the new-farm home to the work map.** *(Overview → stocking)*
After Finish you land on the read-only Overview. It has only `[Map | Data]`; the menu has no
Work/Stock item; tapping the area body is a no-op (code 8399–8401); the efficient
drag-select Fill map is reachable only via Menu → Farm Layout → select area → "Open ›"
(~4 taps, inside the layout *designer*). *Why it hurts April:* she just built a farm and has
no button that says "add my oysters." A not-techy, impatient user can reasonably conclude
the app can't do the one thing she opened it for. *Repro:* fresh farm → Finish → tap the
area/map → nothing happens. *Fix:* add a one-tap "Work"/"Stock cages" entry on the home
(menu item and/or make tapping an area open its work list); land a brand-new farm on the
work map, not the read-only overview.

**M2 — Cage tap targets on the zoomed-out home are ~6 px.** *(Overview)*
Measured first cage hit box = 27 × 6 px (Apple min is 44). The only per-cage stocking path
from the home (tap a cage twice → detail → Fill, 952) depends on hitting these, then
repeating per cage. *Why it hurts:* gloves, sun glare, boat motion, one hand — and 40 cages
one at a time is a non-starter. *Fix:* enlarge the hit target, or auto-zoom a single-area
farm into its area on landing so cells are full-size, or route taps to the work map.

### Minor
**M3 — No "now stock" nudge after Finish.** The fresh Overview's only prompt is "PICK SITE"
(water data), which pulls attention off stocking. An empty-state line like "No stock yet —
tap a line to add seed" would point the way. *(Overview)*

**M4 — Multi-gear wizard, single-gear reality.** The gear step invites several cage types,
but Create assigns only the **first** type to all 40 cages. Using OysterGro means later
digging into the layout/line "set all cage types" control. The step implies the types get
used. *(Wizard S2 → created farm)*

**M5 — No grade at stocking, and per-grade prices are inert on growing stock.** The Fill
form has no Grade field; new seed is ungraded; the dashboard values it only with the
Default price. Setting Standard/Petite/Jumbo prices in spring changes nothing visible.
Nothing tells the farmer per-grade prices apply at harvest. *(Fill form + Prices + Dashboard)*

**M6 — Fill form's commit button is below the optional fields.** "Fill N cages" sits under
Notes/Photos/Date (12), so you scroll past optional content to finish the core action. *(Fill form)*

**M7 — Harvest-forecast sheet shows no change across a 75-day jump.** Coarse buckets
(Ready now / Coming up / Later 1+ yr) mean a deliberate time-jump on fresh seed reads
identically. The growth detail lives only in per-cage projection, not linked from the
forecast. *(Forecast)*

### Polish
**P1 — First-run layout coachmark overlaps the toolbar it describes.** The bubble sits over
the +Plot/+Area/+Line row (07). *(Layout first-run)*

**P2 — Gear mesh + shape are opaque.** The mesh field shows a bare "6"/"9" with no "mm"
unit once filled; the three shape icons are abstract and hard to map to FlipFarm/OysterGro
(05). *(Wizard S2)*

**P3 — Welcome + wizard content is top-aligned; primary CTAs sit in the top third,** away
from the one-handed thumb zone on a tall phone (01). *(Onboarding)*

**P4 — Conditions bar "PICK SITE" is loud on a farm with no stock yet,** competing with the
(missing) stock prompt for the new farmer's first attention. *(Overview)*

### No issues found
Persistence, offline, and crashes were out of scope for this slice, but **zero JS console
errors** occurred across onboarding, stocking, grades, prices, dashboard, and the clock
jump.

---

## Wins
- **Onboarding is genuinely good:** 5 taps + one text field to a usable 40-cage farm; "just
  tap Finish" with a sensible default; honest "defaults — set in Settings" note.
- **The scoped work map is the best surface in the app** (14): rope-on-pilings, green
  fresh-seed cages vs dimmed empties, a clear stat strip, and an instant "Filled 5 cages ·
  Undo" toast. Drag/tap select is comfortable here.
- **Fill — new seed** form is clean and well-hinted (count optional, size "used to project
  harvest," ploidy as chips).
- **Dashboard "$ on the water"** is legible and the math is right; no "$0" trap (shows a
  price CTA until you price).
- **Per-cage growth projection is honest:** "~Jun 2027 (76 mm)," low-confidence caveat,
  typical-rate disclosure, and a prompt to log growth checks. The number is believable.
- **Undo on every mutation**; menu/sheets render correctly from the overview.

---

## Top 5 fixes
1. **Make the work map reachable in one tap from home** — a "Work"/"Stock cages" control on
   the Overview and in the menu, and/or make tapping an area open its work list. (Fixes M1.)
2. **Land a brand-new farm on the work map (or show a stock nudge),** not the read-only
   overview, so the first action after Finish is putting seed in cages. (M1/M3.)
3. **Fix per-cage tappability on the home** — ≥44 px targets or auto-zoom a single-area
   farm into its area on landing. (M2.)
4. **Add an optional Grade to the Fill form** (or clearly state per-grade prices apply at
   harvest and let the default price stand in), so pricing work in spring isn't silently
   inert. (M5.)
5. **Move "Fill N cages" above the optional Notes/Photos/Date** so the core commit is never
   below the fold. (M6.)
