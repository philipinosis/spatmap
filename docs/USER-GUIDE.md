# SpatMap — User Guide

The full walkthrough. For a quick start and hosting, see the [README](../README.md).
The app is the file `spatmap.html`.

## The Brightside farm comes preloaded

The app opens with the real farm already on the map, built from the working spreadsheet
(`docs/farm-layout.xlsx`, June 12 2026). The whole spreadsheet is **Acre 1**:

- **Quarters 1–2** (rows 1–9): rows 1–4 (the sorted Trips/Dips) are whole lines in OyGrow circles —
  rows 1 & 3 are the top two rows of Quarter 1, rows 2 & 4 the top two of Quarter 2. Rows 5–9
  (Jumbos / Brightsides / smalls / doubles) sit below, left halves in Quarter 1, right halves in Quarter 2.
- **Quarters 3–4** (columns A–D, rows 14–21): Lines A & B left of the boat lane in Quarter 3, C & D
  right of it in Quarter 4. All of Acre 1 runs horizontal.
- **Acre 2** is on the map but empty, ready for lines when you need it.

Three things the spreadsheet didn't have, to fix on the water:
1. **Counts and seed sizes** are blank on every batch — a cage shows "—" until you edit or restock with real numbers.
2. **Placeholder dates**: the Jumbos / Brightsides / Smalls / Doubles lines in quarters 3–4 are set to Jan 1 2026 with an "edit me" note. Rows 1–4 use their sort dates as stock dates.
3. **Line C position 5** in Acre 2 was "Empty or jumbo?" — left empty; verify and stock if there are jumbos in it.

Cages per line in Acre 1 default to 6 per side — add or remove from each line's ⋯ menu. Cage types
default to Bag except the 6/4 small trips in flips.

## Build your own farm layout

The layout isn't fixed to Brightside's. ⚙ → **Farm layout** lets any farm:

- Add, rename, or remove **areas** (separate patches of water, like acres).
- Subdivide an area into up to 4 **plots** — boat lanes draw between them automatically.
- Set each plot's line direction: **→ across** or **↓ down**.
- Tap **+ Lines** on any plot to bulk-create lines: pick how many lines and cages per line; names
  count up automatically ("Row 1" + 5 lines → Row 1…Row 5).
- Every new plot and area starts with one empty 6-cage line, so a plot is never blank.

Plots whose lines hold stocked cages can't be deleted (move or harvest the cages first); empty lines
are removed with their plot after a confirm. One hosted copy serves many farms — each farmer's layout
and data stay on their own phone.

## The screens

**The overview** is the whole farm: every plot is a card showing its lines as rows of colored dots.
Tap a plot to open it full-screen with big cages sized for a stylus. **‹ Farm** (or the phone back
button) returns; the chips across the top hop between plots without going back.

- **Stats row** counts the whole farm: cages, stocked, total oysters, average size, market-ready, and
  **$ on the water**. Tap **Market ready ▸** for the month-by-month outlook.
- **Conditions panel** (overview only) shows live water level + rising/falling, water temperature,
  salinity, and the NWS forecast. **Tap it to pick the USGS gauge nearest your farm** — it lists
  every active salinity gauge on the coast by distance; tides/level and weather follow your choice.
  Needs signal to refresh; offline it shows the last readings it saw. Salinity can also be logged
  by hand when no gauge carries it.

## Working cages

- **Stock a cage** — tap it: date, count, seed size (mm), source, ploidy, and prep work (graded,
  tumbled, desiccated, shaken). Stock a whole line at once.
- **Quick peek vs full sheet** — tap a cage once (or hover) for the essentials (size, date in, count,
  last action). Tap again for the full sheet with every action. Peek works on the overview too.
- **Cage detail action bar** — from the sheet: Work / Pull / Photo on a stocked cage, Fill / Remove
  on an empty one. No dead ends.
- **Growth, mortality, harvest** — log from a stocked cage; growth checks can apply to a whole line.
  Each cage shows a growth chart and time in water.
- **Edit batch details** — fix stock date, count, size, source, ploidy, or notes any time.
- **Change cage type** — one cage from its dropdown, or a whole line / a position range from the
  line's ⋯ menu. Mesh size rides on each cage type (⚙ → Manage cage types).
- **Work-again reminders** — every form has an optional "Work again" row (1/2/4/8 weeks or a date).
  The red needs-work ring fires when that date passes; cages without one keep the 8-week rule.

## The daily loop — select, then act once

Inside a plot, tap **Select** and tap each cage you worked (or a line's **All**). A fresh drag
replaces the selection; tap toggles individual cages. The bottom bar acts on the whole selection:

- **Fill** the empties (stock them, or fill from the barge — see below).
- **Pull** the cages to the **barge** (the working pile for the day).
- **Work** — one form for growth check / mortality / note across the selection.
- **Remove** — take cages off the line; each spot stays as a dashed marker holding its place.

**The barge / tub** accumulates what you pull. Tap it to:
- **Split** the pile into named sub-batches by count and size (e.g. 80 mm / 55 mm / 35 mm). Each
  becomes a chip you can arm.
- **Fill** empty cages from a chosen split or the unsorted remainder — the fill writes the batch size
  as that cage's growth anchor, so different sizes project different market dates.
- **Harvest** off the barge — logged with count, grade, and lineage to the harvest log.

Every commit (Fill / Pull / Work / Harvest, and selecting cages) gives a short haptic buzz on phones
that support it, so you get confirmation through gloves without looking. It stays silent if your phone
has "reduce motion" on, or on iPhones (Safari doesn't vibrate).

## Logging what you got paid

The harvest sheet has a **$/oyster (sold)** field. Leave it blank and the app uses the grade's
standing price; type a number to record the actual price for that sale (a wholesaler cut, a deal).
Either way the harvest log stamps the price and the revenue for that entry. If the oysters were
ungraded or had no price, it stays "—" — the app never invents a dollar figure.

Open **Harvest Log** (from the menu) to see each harvest with its $ and a **revenue-to-date** total
at the top. The harvest-log CSV gains **$/oyster** and **Revenue** columns for your own books.

## Records and exports

- **CSV export** (Data menu): stock-on-hand (every cage + estimated $) and the harvest log
  ($/oyster + Revenue columns) — the records to hand a buyer or an inspector.
- **Work queue**: "⚑ N cages need work ›" sorted most-overdue, tap to jump to the cage.
- **Harvest forecast**: ready-now, month-by-month readiness, and inventory by market grade.
- **Full backup**: the Data menu leads with **Full backup (with photos)** — the file to keep in a
  crisis, since it carries the cage images, not just the numbers. (Data-only export is still below it.)

## Reading the analytics (off the daily loop)

These build themselves from records you already keep. None of them are part of the daily fill/work loop;
look at them when you want to.

- **Your growth calendar** (⚙ → Water conditions over time, at the top): the seasonal growth shape the
  app uses to project market dates. It starts on a default Gulf curve, then bends toward what your own
  growth checks show. Teal months use your pace; grey months still ride the default until you log more
  checks. Watch it sharpen as you log across the seasons. Too few checks and it just shows the default.
- **Conditions advisory** (dashboard, when it applies): a one-line heat or low-salinity warning, drawn
  from this device's own water log. It only fires when several of your recent logged days actually crossed
  the line (one flaky reading can't trip it). Tap it to jump to the harvest forecast when you have
  sale-ready stock. Needs a gauge picked and a few days of log.
- **Watch list** (Stock health menu): cages losing oysters faster than your other cages. It compares each
  cage's loss rate against the farm's median and only appears once you have enough cages with loss logged
  — it won't rank a tiny sample.
  Watch-listed cages also pick up the needs-work ring on the map. It's guidance ("losing faster than your
  others"), not a verdict.
- **Seed source scorecard** (Stock health menu): each hatchery / seed cohort with its survival, median
  days to market, and revenue per cage. Survival comes from your standing stock; revenue and days-to-market
  join a source only when a harvest links back to it (an un-harvested cohort reads "in progress"). A harvest
  that mixed sources or can't be traced is listed under **Unlinked harvests**, never blamed on a hatchery.

## Map colors

Gray = empty · green = under 6 months · amber = 6–12 months · orange = over 12 months ·
blue ring = at market size (default 76 mm, changeable in ⚙ settings).

## Lines and spots

- **Lines never move.** Each spans the full width (or height) of its plot; positions are fixed.
  Pulling a line's cages leaves the empty line in place — re-string it later or remove it entirely
  (only then do later lines shift up).
- **Spots without a cage** show as a dashed outline. Tap an empty cage → "Take cage off line" to open
  one, or tap a dashed spot → "Attach cage" to hang a cage there again.

## Back up

⚙ → **Export data** → keep the JSON safe. Import restores it on any device. Data is per-browser,
per-device; clearing site data erases it, so export on a schedule. The app works offline once loaded
and saves instantly on the device.
