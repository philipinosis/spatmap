# SpatMap sim — WINTER / OWNER ("Sam")

**Persona:** Sam, the business-minded owner doing a year-end review at the kitchen table over
winter. Wants four things: survival by hatchery, what's still on the water, what to seed next
year, and a safe backup of a full year of records.
**Season slice:** Winter (Dec–Feb) — growth stall, year-end review, next-season planning, data safety.
**Setup:** local `spatmap.html`, iPhone 14 Pro Max viewport, Playwright headless, clock faked to
**2026-01-20**, Brightside demo seeded after the clock so batch ages compute against winter.
**Script:** `tests/sim-winter-owner.mjs`. **Shots:** `tests/reports/shots/winter-owner/`.
**Console:** 0 JS errors across the whole session.

---

## What the winter review felt like, step by step

**Opening the app (shot 01).** Lands on the dark map home with the Brightside lines drawn and a
barge HUD. The conditions bar reads "no water data yet / PICK SITE" because no USGS gauge is
attached. Fine for a kitchen-table review.

**The money (shots 02, 05).** The dollar figure lives behind the **Data** sub-tab, not on the
map home. Before prices it shows a "Set oyster prices ›" CTA instead of "$0" (good). I tapped it,
filled $/oyster per grade, and the headline became **"$23k on the water · 5.4k oysters sale-ready ·
6 cages · 45k oysters +3.2k in tub · 32 filled · 20 empty"** with a "1 cage needs work" flag and a
recent-activity feed (Tumbled 6A-1..6A-5 Jan 16, Grown to 28mm Jan 15). This is the single best
review surface: scannable, honest, the right four numbers.

**Seed source scorecard (shot 07).** This is where the owner's "which hatchery performs?" question
goes to die. The demo has one hatchery (Grand Isle), so the scorecard renders **five near-identical
cards, each titled `GRAND ISLE HATCHERY · XMKMQ0DFH5D6HZY`** — a raw internal cohort hash shown to
the user. Every card reads "in progress / Survival 100% / Harvested: not yet — still on the water."
No revenue, no days-to-market (both only populate once a harvest links back to a seed source, and
the demo's harvests are unlinked). So the headline business comparison is: one hatchery, five cryptic
IDs, 100% across the board, no money. An owner learns nothing actionable.

**Watch list + stock health (shots 08, 09).** Both empty in the off-season, but honestly so. Watch
list: "Not enough to compare yet — 0 cages have logged a loss. Need 6 before ranking is fair."
Stock health: "No losses logged yet. Log a loss from a cage's Work sheet..." The copy explains the
gate instead of showing a blank, which is the right call. The menu correctly hides the Watch list
item entirely when there's nothing flagged.

**Harvest forecast (shot 10).** Reads well and the winter stall shows up: **READY NOW 5.4k (6
cages), then Feb 2026 1.4k (1 cage), then a gap with nothing until Jun 2026 9.8k, Jul 11k, Oct 14k.**
Nothing crosses market in Mar/Apr/May — the cold months — which is exactly the stall an owner
expects. One confusing row: **"Jan 2027 · 0 · 5 cages"** (0 oysters but 5 cages).

**Growth calendar (shot 11).** Settings → Water conditions hosts the fitted-vs-default transparency
card. Here trust breaks. The 12-bar sparkline is **nearly flat across all months**, and the probe
confirms it: fitted Jan = **1.01**, Feb = 0.75, May = 0.96, Jun = 1.03. The app's own hardcoded Gulf
curve puts Jan/Feb at a near-stall (0.20 / 0.25). With only 27 recent, winter-clustered growth
intervals the fit has flattened the winter stall out of existence and labels every month "fitted to
your pace" (all teal) with confident copy. So the one screen meant to explain seasonality tells the
owner January grows like June, contradicting both reality and the projection on the next screen.

**Data safety — the payoff (shots 12–20).** This worked, and it's the strongest part of the app.
The Data menu is clean: Full backup (with photos) / Export data (no photos) / Import backup
(Replaces ALL current data) / CSV: Stock on hand, Harvest log. I attached a photo to a batch, did a
**Full backup (with photos)** — the file `spatmap-backup-with-photos-2026-01-20.json` packed
1 farm, 33 batches, 2 harvests, **1 photo inlined**. CSV exports are real and well-formed (stock CSV
has Line/Cage/Type/Mesh/Count/Grade/Size/Stocked/Months-in-water/Market-ready/Est$; harvest CSV has
Date/Count/Grade/Size/$-per-oyster/Revenue/From-lines/Note). I then **wiped everything** (cleared
`state.farms`, removed `cageTrackerData` + `:prev`, reloaded) and **imported the backup through the
real UI** (file chooser + the "Import REPLACES all current data" confirm). Result: farm, 33 batches,
2 harvests, plots, 6 lines all back; **photo blob restored into IndexedDB (759 bytes)**; the home
toast read **"Backup imported · 1 photo restored"**; and a `cageTrackerData:prev` recovery snapshot
was auto-created. Full round-trip, zero loss.

**The catch in data safety (shot 15).** After the wipe, the cold-start screen offers only **"Build
my farm"** and **"Explore a demo first."** There is **no Import / Restore button**. A farmer who
reinstalled the app or cleared their browser — exactly the person who needs the backup — lands on a
dead end. The only way to reach Import is to first build a throwaway farm or load the demo, then go
Menu → Data → Import. I had to use the demo workaround to even reach the import button.

**Plan next season — multi-farm (shots 21–26).** Smooth. Menu → "+ New farm" opens a tidy 3-step
wizard (name → gear → review). Step 3 even hands off well: "Next you'll lay out plots and lines on
the map — drag to draw them." Created "Sam Winter Lease 2027"; the farm switcher then lists both
farms with a clear Current check and a "+ New farm" link.

**Plan next season — layout (shots 27–32).** The `+ Plot / + Area / + Line` buttons **arm a draw
tool**; you then drag a box on the water. Once I dragged on the real canvas it worked (plot, area,
and line all created, each with an Undo toast). Two frictions: a single `+ Line` drag laid down a
**dense grid of ~16 lines perpendicular to the existing ones** (messy for planning gear), and the
nesting counts looked off afterward (the new plot card showed "0 areas · 0 lines" while drawn lines
were clearly visible). Layout editing is more a spring-stocking concern; for a winter planner it's
usable but fiddly.

---

## Friction log (by severity)

### Major
1. **No restore path on cold start (data-safety dead end).** After a wipe/reinstall the onboarding
   screen shows only "Build my farm" and "Explore a demo first" — no Import/Restore. The backup is
   only as good as the restore, and the natural recovery entry point is missing. Workaround exists
   (load demo → Menu → Data → Import) but it's non-obvious for a panicked farmer. *Where:* first-run
   onboarding (shot 15). *Repro:* clear data + reload. *Fix:* add a third button "I have a backup —
   restore it" on the welcome screen, wired straight to `triggerImport`.

2. **The season's actual earnings are blank everywhere.** Harvest Log shows "REVENUE TO DATE —" and
   "—" per harvest; the scorecard shows no revenue; the harvest CSV's $/oyster and Revenue columns
   are empty. Revenue *is* captured per-harvest going forward (pre-filled from the grade price at
   harvest time), but it's null for the demo's historical harvests, and **setting/raising prices
   later does not backfill logged sales.** For an owner whose whole task is "what did the year
   earn?", every review surface reads "—" with no obvious remedy. *Where:* Harvest Log (shot 20),
   scorecard (shot 07), CSV (shot 14). *Fix:* let "Oyster prices" offer a "apply to unpriced past
   harvests" action, or surface a per-harvest price editor in the Harvest Log so old/imported sales
   can be valued.

3. **Seed source scorecard can't answer "which hatchery performs."** One hatchery fragments into
   five cards keyed by raw internal cohort hashes (`XMKMQ0DFH5D6HZY`), all 100% survival, all "still
   on the water," no revenue, no time-to-market. Even with multiple hatcheries, in-progress stock
   carries no $ or days, so ranking is impossible until harvests are linked back. *Where:* scorecard
   (shot 07). *Fix:* roll cohorts of the same hatchery into one card by default (expand to cohorts on
   tap), never show the hash as a title, and show survival + a "to be ranked at harvest" state so the
   owner understands what's still pending.

### Minor
4. **Growth calendar masks the winter stall.** The fitted curve flattens Jan/Feb to ~1.0 from 27
   recent, winter-clustered checks and presents all 12 months as "fitted to your pace" with confident
   copy. It contradicts the app's own default near-stall and the forecast on the next screen.
   *Where:* Settings → Water conditions (shot 11). *Fix:* require more spread (e.g. checks across ≥2
   seasons) before a winter month overrides the default; keep thin/over-fit months grey and say so.

5. **Forecast "Jan 2027 · 0 · 5 cages" row.** Zero oysters but five cages reads as a glitch. *Where:*
   Harvest forecast (shot 10). *Fix:* suppress 0-oyster rows or relabel (e.g. "5 cages, none ripe yet").

6. **`+ Line` drag creates a dense perpendicular grid; nesting counts look off.** One drag laid ~16
   lines across the existing ones, and the new plot card showed "0 areas · 0 lines" while lines were
   drawn. *Where:* layout editor (shot 32). *Fix:* clarify the line tool (one line per drag, or a
   spacing prompt) and refresh the plot/area count labels after a draw.

### Polish
7. **Money lives only behind the Data sub-tab.** An owner opening the app for a review sees the map,
   not the dollars; the $ figure is one tap away under "Data." Consider a peek of crop value on the
   map home.

---

## Wins
- **Backup → wipe → import round-trip is flawless, photos included** ("Backup imported · 1 photo
  restored"; blob verified back in IndexedDB), with a scary confirm, a dry-run migrate, and an
  auto-created `:prev` recovery snapshot. This is the trust test and it passes.
- **CSV exports are genuinely buyer/inspector-ready** — clean headers, real rows, correct dates.
- **Dashboard money card** ($23k on the water, sale-ready count, work flag, activity feed) is the
  clearest screen in the app.
- **Honest empty states** — watch list and stock health explain the gate/next step instead of
  showing a confusing blank.
- **Harvest forecast shows the winter stall correctly** (ready-now, Feb, then a Mar–May gap to June).
- **Multi-farm add + switch and the 3-step new-farm wizard** are quick and clearly worded.
- **0 JS console errors** across backup, wipe, reload, import, multi-farm, and layout editing.

---

## Top 5 fixes
1. Add "I have a backup — restore it" to the first-run/onboarding screen so a reinstalling farmer can
   actually recover. (Highest priority — it's the whole point of the backup.)
2. Make logged-sale revenue visible for a year-end review: backfill unpriced past harvests from grade
   prices and/or add a per-harvest price editor, so "REVENUE TO DATE" and the scorecard stop reading "—".
3. Rebuild the seed-source scorecard: one card per hatchery (not per cohort hash), never show raw IDs,
   and mark in-progress stock as "ranked at harvest" so the comparison is legible.
4. Stop the growth calendar from flattening the winter stall on thin, single-season data — gate winter
   overrides behind multi-season checks and keep low-confidence months on the default (and grey).
5. Tidy the forecast "0 · 5 cages" row and the line-drawing tool (one line per drag + correct count
   labels) so next-season planning reads cleanly.
