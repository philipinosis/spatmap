# SpatMap v2 vs OceanFarmr — UX Critique & Prioritized Fixes

Date: 2026-06-17
Method: drove the running app at `http://localhost:8755/spatmap-v2.html` on a 390×844 mobile viewport (screenshots in `_screenshots/v3/`), read the source in `spatmap-v2.html`, and compared against OceanFarmr's own "Level Up" training lessons, App Store / Play listings, and industry press. Owner asked for the hard truth, so this is candid.

## The one-sentence verdict

SpatMap is a genuinely better *single-cage* experience than OceanFarmr — the detail sheet, growth projection, and drag-to-fill are tighter than anything in OceanFarmr's pin form — but it is missing the three things that make a farmer *pay*: money on the dashboard, a record they can hand to a buyer or auditor (CSV/traceability), and any answer to "where do I put 50 bags / which oysters are sale-ready" without scrolling every line by hand. OceanFarmr wins on those because its whole design is map-pins → web dashboard that *finds and totals* stock. SpatMap has no finder and no dashboard math.

A structural note that frames everything: OceanFarmr is **two surfaces** — a phone app that only logs data ("drop pins"), and a separate web dashboard that does all planning, finding, and reporting. Their own advice: *"Use the app for logging data, but rely on the dashboard for planning."* SpatMap collapses both into one offline phone app. That is SpatMap's biggest advantage (one place, works with no signal) and its biggest exposure (it inherits the dashboard's job but ships almost none of the dashboard's answers).

---

## 1. First-run / onboarding

**What SpatMap does well.** Clearing storage drops you on a real onboarding page (`04-onboarding-real.png`): one scroll, Farm name → How many lines → Cages per line → Cage types (with a mesh-shape picker and mm field) → Grades → Market size → "alert if unworked for N days" → **Create farm**. A farmer can stand up a working farm in under a minute with zero help, zero account, zero signal. There's also a "Load Brightside demo" link so a new user can poke a populated farm before committing. This is *dramatically* better than OceanFarmr, where onboarding is a **paid, human-assisted process** — their help page literally says the app has "limited functionality until your paid subscription is active, and on-boarding completed," and you hand over lease deeds/coordinates for them to draw your farm. SpatMap's self-serve, instant, free first run is a real competitive weapon.

**Where it falls short.** The onboarding form is one long unguided wall of fields with no "why" and no preview — you type "6 lines / 10 cages" blind, with no live picture of what you're building until you hit Create. OceanFarmr's hand-built map means a farmer's *first* screen matches their actual water; SpatMap's first screen is an abstract grid the farmer then has to mentally map to reality. There is also no template beyond the one demo, and no per-species defaults (OceanFarmr ships oyster/mussel/seaweed crop forms out of the box).

**Specific fix.** Make onboarding a 3-step wizard with a **live schematic preview** that draws lines/cages as you change the numbers, plus 2–3 starter templates ("Floating cage line farm," "Rack & bag," "Longline") that pre-fill cage type, mesh, and market size. Keep the whole thing on one device, offline. Effort M.

---

## 2. The map

**What SpatMap does well.** The in-area line view (`06-area-opened.png`) is the best thing in the app. Each line is a rope with dense color-coded cage glyphs — green fresh, amber mid, teal/red market-ready, gray-outline empty — so age and readiness read at a glance across a whole line. Tap a single cage → a peek popover with Pull/Work (`07-cage-tapped.png`); tap "Open" → a rich detail sheet (`08-cage-detail.png`). It is fast, legible, and 100% offline. OceanFarmr can't render a line's worth of stock state this densely; it shows colored pins on a satellite map you pan around.

**Where it falls short vs OceanFarmr.**
- **It's a schematic, not a map.** Confirmed in source: the only lat/long anywhere is the NOAA tide station; plots/areas/lines have no geographic coordinates and live on a blank grid (`24-layout-editor.png`). OceanFarmr puts your cages on **real GPS + satellite imagery of your actual lease**, which buys two things SpatMap can't do: a new crew member can match the screen to the water in front of them, and the app can fire **proximity alerts** when you're physically near a cage with a due task. SpatMap's "Line 3, cage 4" is a label you have to already know.
- **No way to find a cage except scroll.** To reach Line 5 I had to scroll past Lines 1–4 every time. There is no search, no "jump to cage 3-2," no filter. OceanFarmr's dashboard Stock Finder is built precisely to answer "where is batch X / what's sale-ready" without hunting.
- **Redundant breadcrumb.** The overview reads "Brightside Oyster Co. › Brightside Oyster Co." (`05-overview-clean.png`) because the single plot reuses the farm name — looks like a bug to a buyer.

**Specific fix.** (a) Add a persistent search/jump field in the work view — type "3-2" or a batch/hatchery name and scroll-snap to it; tag `buildable-offline`, effort M. (b) Let a farmer drop an optional GPS pin per plot (one `navigator.geolocation` read) and show a static OpenStreetMap/satellite tile *behind* the schematic when online, cached for offline; this closes the "match the water" gap without rebuilding on a full GIS map. Tag `buildable-offline` for the pin, `needs-backend`(tiles/CDN) for imagery, effort L.

---

## 3. Daily work flow (wet hands, moving boat)

**What SpatMap does well.** The core loop is genuinely fast. Drag-select a run of cages on one line → a popover offers exactly the verbs that apply: **Fill** for all-empty, **Pull / Work** for all-filled (`12-selection-actionbar.png`, `20-fill-popup-clean.png`). Tapping Work commits instantly. The barge/"tub" accumulates pulled oysters and a tap opens a Harvest sheet (`17-barge-harvest.png`). This Fill → Pull-to-barge → Harvest arc is a real model of how an oyster day actually runs, and it's all offline. OceanFarmr's equivalent is dropping/editing individual pins; SpatMap's bulk drag is faster for "I just tumbled this whole line."

**Where it falls short.**
- **"Work" throws away what you did.** Tapping Work on 4 cages logged a `worked` event with method silently defaulted to `tumbled` — no choice of flipped / tumbled / desiccated / graded, no note, no date. (Verified in the event log after the action.) A farmer who desiccated can't record it without opening each cage. OceanFarmr's biofouling/maintenance pins at least name the action (Flip / Dry / Scrub) and count down to the next one.
- **Selection is additive and never auto-clears.** I selected a mixed run on Line 4, then a clean run on Line 5, and the popup still said "Mixed selection — pick all-filled or all-empty" anchored to Line 4, because Line 4's cages were still selected (`18-empty-selected.png`, `19-fill-popup.png`). On a boat this is the exact failure mode: you think you've selected one thing, the app is acting on two, and the action button is mysteriously disabled. The "Mixed selection" guard is good error-proofing, but it fires for a reason the farmer can't see.
- **The popover floats over the lines, not docked.** When the new selection is below the fold, the action button can be off-screen from the cages it acts on.
- **Touch targets.** Cage glyphs measured ~16–24px wide. With gloves or spray on the screen, precise drag-start on a 16px cell is a miss risk.

**Specific fix.** (a) Replace the silent default in bulk Work with a one-tap method chip row in the popover (Flip · Tumble · Desiccate · Grade · Other) — still one extra tap, but the data is real; tag `buildable-offline`, effort S. (b) Make a new drag-start on a different line **clear the prior selection unless the farmer is explicitly multi-selecting** (e.g. long-press to "add to selection"); auto-clearing is the safer default. Tag `buildable-offline`, effort S. (c) Dock the action bar to the bottom of the screen (it already exists as `.lp-actionbar` in the layout editor) so it's always thumb-reachable and never floats off-screen. Effort M.

---

## 4. Information architecture

**What SpatMap does well.** The menu (`14-menu.png`) is short and honest: Farm Layout, Harvest Log, Grades, Settings, Data, + New farm — each with a plain-language subtitle ("Plots, areas, lines — design your water"). The Overview/Work toggle up top is a clean two-mode split. Nothing is buried three levels deep.

**Where it falls short.**
- **The cage detail is an action dead-end.** The richest screen in the app — `82 mm · Market-ready · Count · Ploidy · Hatchery · Grade · In water · projection chart · full history` (`08`/`09`) — has exactly **one** button: "Change type" (confirmed in `buildCageDetail`). You cannot Work, Pull, Grade, Measure, add a photo, edit the count, or Harvest from the place where you're actually looking at the cage's data. You have to close the sheet, find the cage on the map again, and drag-select it. That's backwards: the more a user knows about an item, the more likely they want to act on it.
- **No Tasks view.** OceanFarmr's "Requiring Attention" is a first-class list. SpatMap's only "what needs doing" signal is the "⚑ N work" number in the stat strip and red-edged glyphs scattered across lines — there is no single list of "these 6 cages are overdue, go." A farmer planning the day has to eyeball every line.
- **Two near-identical screens.** The Overview "Open" card and the Work view render the same lines; the difference (drag-select on/off) isn't visually obvious. I had to check the toggle state to know which mode I was in.

**Specific fix.** (a) Put a sticky action bar at the bottom of the cage detail sheet: Measure · Work · Grade · Pull · Photo — the single highest-value change in this list. Tag `buildable-offline`, effort M. (b) Add a "Needs work" list reachable from the ⚑ stat (and the menu) that enumerates overdue/market-ready cages with a tap-to-jump. Tag `buildable-offline`, effort M.

---

## 5. Data entry ergonomics

**What SpatMap does well.** The new-seed Fill form (`22-newseed-form.png`) is excellent: How many (optional, "leave blank if uncounted" — respects reality), Size mm, Ploidy as two big chips, Hatchery, Notes, Photos, Date defaulted to today. Bulk-applying one batch to N cages in a single form is faster than OceanFarmr's per-pin entry. The "uncounted is allowed" stance is more honest than apps that force a number. The mixed-selection guard prevents a class of nonsense actions. Barge-distribute reusing the pile's known values (no re-typing) is smart.

**Where it falls short.**
- **No steppers, no remembered defaults.** Count and Size are raw numeric inputs — fine, but a +/− stepper and "same as last fill" recall would cut taps. Hatchery is a free-text box that's blank every time; a farmer who buys from one hatchery re-types it on every fill. OceanFarmr at least selects Batch ID from a list (enforced hygiene).
- **Fill from a non-empty barge gives no confirmation.** With the barge full, tapping Fill silently distributed 800/cage at 60 mm with no sheet and no toast detailing what happened (`21-fill-sheet.png` shows the cages just turned green). The behavior is *correct* (you're redistributing known oysters) but invisible — a farmer can't tell whether it counted, and there's no undo prompt surfaced.
- **No grade at fill, no per-cage count override.** All N cages get identical numbers; you can't say "this cage got 600, that one 550" without editing each — and editing a count isn't even possible from the detail sheet (see #4).

**Specific fix.** (a) Add steppers to Count/Size and persist last-used Hatchery/Ploidy/Grade as the next fill's defaults (a one-line localStorage recall). Tag `buildable-offline`, effort S. (b) After a barge-distribute Fill, show a toast: "Filled 4 cages · 800 each · Undo." Tag `buildable-offline`, effort S.

---

## 6. Dashboard / at-a-glance

**What SpatMap does well.** The stat strip (`06`, top) gives the two action-driving numbers first, color-dotted: **● 6 ready · ⚑ 1 work**, then quiet totals **42k oysters · 32 filled · 20 empty**. Leading with ready + needs-work is the right instinct. The empty state ("Nothing stocked yet — drag across a line to fill") is a good nudge. The NOAA tide/weather bar with a real station picker (`23-gauge-search.png`) is a genuinely nice differentiator OceanFarmr doesn't foreground.

**Where it falls short — this is the biggest commercial gap.** OceanFarmr's home dashboard leads with **seven tiles**, and the first two are **Total Crop Value ($)** and **Total Gear Value ($)**, plus **Sale Ready (dozen)** and a **Farm Activity Feed** of the last 5 changes. SpatMap's strip has **no dollar value, no sale-ready dozen estimate, no activity feed, no mortality, no "X dozen ready to sell this week."** A farm owner deciding whether to pay for software wants to open it and see *money on the water* and *what's sellable now*. SpatMap shows counts of cages. The data to compute value exists (count × grade × a price you'd add) and sale-ready is already computed per cage — it just isn't summed into a headline number. OceanFarmr's "849 dozen ready for sale" with a location is the single most-quoted thing in its demos; SpatMap has no equivalent answer.

**Specific fix.** Add a real Overview dashboard above the map card: **$ crop value** (count × per-grade price set in Settings), **dozen sale-ready**, **needs-work count**, and a 5-item **recent activity** list (you already log events with dates). Even without prices, lead with "X dozen ready · Y cages overdue." Tag `buildable-offline`, effort M (value math + a Settings price-per-grade field).

---

## 7. Visual / trust — does it look like paid software?

**What SpatMap does well.** The dark estuary theme is consistent and calm, the cage detail and growth chart look professional (`08`/`09`), the icon set is coherent, and the offline-first, no-account, single-file architecture is a legitimate selling point for farmers on bad-signal water. The typography in the data tables (monospaced numerals) reads like a real tool.

**Where it falls short.**
- **The cartoon barge undercuts it.** The little illustrated crew around a bathtub (`05`, `17`) is charming in a demo and will read as toy-like to a 50-year-old farm owner evaluating whether to trust their inventory to it. It's also the *harvest* affordance — the most money-adjacent action — wrapped in the least serious visual.
- **Polish bugs a buyer will notice in 30 seconds:** the doubled breadcrumb (#2), the silent/invisible Fill (#5), the stuck cross-line selection (#3), and the action-dead detail sheet (#4). None are fatal, all are visible.
- **No "this is real" signals.** No export a farmer can hand to a buyer or a health inspector (only a raw JSON backup), no farm/owner identity, no version/"your data is saved" reassurance beyond the boot fallback. OceanFarmr leans hard on traceability records (harvest date/time, salinity, temp, location; auto-checks the FDA shipper list) as the thing that makes the record *worth money*. SpatMap's harvest log is clean (`16-harvest-log.png`: grade, size, source cages, date, note) but stops at the device.

**Specific fix.** (a) Offer a "professional" toggle (or just replace) for the barge: keep the warmth in onboarding, but make the harvest affordance a clean labeled tile. Effort S. (b) Add CSV export of the harvest log and stock on hand from the Data screen — this is what turns the app from a toy into a record. Tag `buildable-offline`, effort S–M.

---

## RANKED list of concrete UX improvements (high → low)

Tags: **[offline]** buildable in the single-file offline app · **[backend]** needs a server/CDN/sync. Effort S/M/L.

1. **Dollar value + sale-ready on the Overview dashboard.** Add per-grade price in Settings; headline "$X on the water · Y dozen sale-ready · Z cages overdue" + a 5-item recent-activity feed. Closes the #1 reason an owner pays. **[offline] · M**
2. **Action bar on the cage detail sheet.** Measure · Work · Grade · Pull · Photo, docked at the bottom. Kills the worst IA dead-end; makes the richest screen actionable. **[offline] · M**
3. **CSV export of harvest log + stock-on-hand** from the Data screen. Turns the record into something a farmer hands to a buyer/inspector — the trust unlock. **[offline] · S–M**
4. **Fix cross-line selection: new drag clears prior selection by default; long-press to add.** Removes the "why is Fill disabled / Mixed selection" confusion on the boat. **[offline] · S**
5. **Method chips on bulk Work (Flip · Tumble · Desiccate · Grade · Other) instead of a silent default.** Makes work history real without slowing the loop. **[offline] · S**
6. **A "Needs work" / overdue list** reachable from the ⚑ stat and the menu, tap-to-jump to the cage. Gives the day a plan instead of eyeballing every line. **[offline] · M**
7. **Search / jump-to-cage in the work view** ("3-2", batch, or hatchery). Replaces scroll-the-whole-farm; this is OceanFarmr's Stock Finder in miniature. **[offline] · M**
8. **Remembered fill defaults + steppers** (last hatchery/ploidy/grade pre-filled; +/− on count/size). Cuts taps on the most-repeated entry. **[offline] · S**
9. **Confirmation/undo toast after barge-distribute Fill** ("Filled 4 cages · 800 each · Undo"). Makes the silent action visible and reversible. **[offline] · S**
10. **Onboarding wizard with live schematic preview + 2–3 farm templates.** Already-good first run becomes confidence-building instead of a blind form. **[offline] · M**
11. **Optional GPS pin per plot + cached satellite/OSM tile behind the schematic when online.** Lets crew match screen to water; nearest OceanFarmr already has. **[offline] pin / [backend] tiles · L**
12. **Replace the doubled breadcrumb** ("Farm › Farm") with farm › area, or hide it when plot==farm. Cheap credibility win. **[offline] · S**
13. **Tone down / professionalize the cartoon barge**, especially as the harvest affordance. Optional "pro look." **[offline] · S**
14. **PWA hardening: add a manifest + service worker** so the app reliably launches and updates offline (today it relies on browser cache; `apple-mobile-web-app-capable` is set but there's no SW/manifest). Protects the core "works on the water" promise. **[offline] · M**
15. **Multi-device / crew sync (longer horizon).** OceanFarmr's real-time shared task list across crew with role access is a team feature SpatMap structurally can't match while it's localStorage-only. Only pursue if selling to multi-person farms. **[backend] · L**

### Where SpatMap already beats OceanFarmr (protect these)
- Instant, free, no-account, fully-offline first run (OceanFarmr needs paid human onboarding).
- Dense, color-coded line view — readable per-line stock state OceanFarmr's pin map can't match.
- The single-cage detail + growth projection chart with confidence note.
- Bulk drag-to-Fill / Pull / Work in one gesture.
- NOAA tide/weather bar with a real station picker baked in.

Keep those sharp; spend the build budget on dollars-on-the-dashboard (#1), an actionable detail sheet (#2), and an exportable record (#3). Those three move SpatMap from "clever offline toy" to "software a farm pays for."
