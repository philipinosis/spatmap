# SpatMap field sim — Summer deckhand ("Cole")

**Persona:** Cole, a deckhand doing daily gear rounds. Wet hands, often gloves, one hand on the
rail, sun glare on the screen, usually no cell signal. Wants speed and big tap targets; hates
fiddly forms.

**Season slice:** Summer (clock faked to 2026-07-15). Peak daily-work loop + heat stress.

**Setup:** Brightside demo (Brightside Oyster Co., 1 plot, 1 area, 6 lines, 32 filled cages,
~42k oysters across FlipFarm / OyGro / Vexar gear). Device: iPhone 14 Pro Max (430×932), with an
iPhone SE (320×568) worst-case tap-target pass. To make the summer heat advisory fire offline I
seeded the device water log with 6 hot days (~30 °C / 87 °F, salinity 22 ppt) on the suggested
Grand Isle USGS gauge. Everything else was driven by real taps and drags.

Scripts: `tests/sim-summer-deckhand.mjs` (full loop), `tests/verify.mjs` (count/fill/SE checks).
Raw data: `tests/reports/sim-summer-deckhand.log.json`, `tests/reports/verify.log.json`.
Screenshots: `tests/reports/shots/summer-deckhand/`.

---

## A day on the water (narrative)

**Morning check-in.** Land on the Map home, tap **Data** (1 tap) to read the board. The heat
advisory is right there near the top in plain words: *"☀ Heat watch: gauge 87°F+ this week — chill
harvest fast ›"* (372×51 px, amber icon, chevron). Tapping it jumps to the harvest forecast
("READY NOW 5.4k oysters · 6 cages") — so the warning is actionable, not just decorative. Big
"5.4k sale-ready" and crop-value numbers read fine in bright light; the small gray strip under them
("45k oysters · +3.2k in tub · 32 filled · 20 empty") and the recent-activity list are dim and
would wash out in glare.

**Working the lines.** In the area work view each line (1A–6A) is a strip of small cage cells with
a ⋮ menu top-right. Drag a thumb across a run of cages and a popup pops up over them: *"5 filled
cages"* with a fat amber **Pull** and an outlined **Work**. That gesture is the good part of this
app — one swipe selects a whole run, no precision needed.

- **Work a run (Tumbled + come back in 2 weeks):** drag-select → **Work** → the sheet opens with
  the handling chips (Tumbled / Washed / Desiccated / Flipped) at the very top. Here is the catch:
  tapping a handling chip **submits immediately**, but the "Work again reminder" chips (1w/2w/4w/8w)
  live at the **bottom** of a long sheet. To log "Tumbled and remind me in 2 weeks" you must scroll
  down, tap 2w, scroll back up, then tap Tumbled. Plain Tumbled is 3 taps; Tumbled-with-reminder is
  4 taps + 2 scrolls. Confirmed it wrote one `worked` event per selected cage (5/5).
- **Log mortality:** drag-select → **Work** → scroll to "Log loss — est. % dead" → tap **10%** →
  tap **Heat** → **Log loss**. Verified it nets the living count: a 25 % loss on a 7,200-oyster run
  dropped it to exactly 5,400. Logging loss as a percentage matches how a deckhand actually
  estimates, which is the right call.
- **Pull to the barge:** drag-select → **Pull**. Two actions. The status strip updates
  (32→28 filled, 20→24 empty), a toast says *"Pulled 4 cages to the tub"* with an **Undo**, and the
  tub shows where the stock came from: *"~10k · from 1A — 1A-1, 1A-2, 1A-3, 1A-4."* Good traceability
  and low data-loss anxiety.
- **Fill from the barge:** drag-select the now-empty cages → **Fill**. With a pile in the tub it
  distributes straight away (verified: 3 empties refilled, tub drained to 0). Two actions.

**Heat / Vibrio.** The dashboard heat advisory works fully offline because it reads the on-device
water log — this is the right behavior for a no-signal boat. The deeper summer risks (Vibrio season,
spawning window, heat-stress-day count) live only in the Settings → "Water conditions" sheet, and
that insight card renders **only on a successful USGS fetch**. Offline, the sheet falls back to raw
temperature/salinity squiggles with no Vibrio/spawn/heat-day flags at all (screenshot 22:
"Offline — showing 12 readings logged on this device", charts only). So at sea, exactly when Cole
can't refresh, the Vibrio warning is invisible.

**Offline mid-task.** Set the context offline, drag-selected a run, opened Work, tapped Washed —
the event saved to localStorage (read it back: 40 `worked` events on disk). Reloaded the page while
still offline: it booted, the farm was intact (Brightside, 6 lines), and **zero** failed external
requests blocked the UI. No data loss, no scary states. This is the strongest part of the app for
this persona.

---

## Tap-target verdict (the enlargement pass)

The team's 44 px enlargement of the per-line ⋮ menu and the segmented nav **landed**. Measured live:

| Control | Size | Gap to neighbor | Distance to screen edge | Verdict |
|---|---|---|---|---|
| `.lineMenu` (⋮) | **44×44** | 141 px | **14 px** from right edge | Big enough; sits tight to the edge |
| `.ovSegBtn` Map / Data | 54–56 × **44** | **2 px** between the two | 16 px | Tall enough; the two halves nearly touch |
| `.pbtn` Pull / Work (popup) | 65–79 × **46** | 8 px | 21 px | Good |
| Work-sheet chips (method / loss % / reason / reminder) | 52–110 × **44** | 8 px | 16 px | Good |
| Cage cells | **15–34 × 28** | 6 px | — | Far below 44; precision tap is hard |

Same numbers held on iPhone SE (controls don't shrink on the small screen — good), so the 44 px
controls are honest across devices. Two soft spots: the ⋮ menu is only 14 px off the right edge
(a thumb landing there can spill onto the bezel/case), and the Map/Data segmented pair has just
2 px between halves, so a gloved thumb on the seam could hit the wrong tab.

The cage cells are the real tap-target problem: 15 px wide for FlipFarm gear. Tapping **one specific
cage** with wet gloves on a moving boat is a miss-fest. The drag-select gesture is the mitigation
(and it's forgiving), but it's the only comfortable path — single-cage targeting is not deckhand-grade.

---

## Friction log (by severity)

### Major
- **M1 — Summer Vibrio / spawn / heat-stress insights are online-only.** The "Water conditions"
  sheet computes Vibrio season, spawning window, and heat-stress-day counts only when the USGS fetch
  succeeds. Offline it shows raw charts with none of those flags (screenshot 22). For a no-signal
  deckhand in July, the single most summer-relevant health read disappears at sea.
  *Fix:* run `condInsights()` against the local `spatmapCondHist` log inside `paintFromLog()` too,
  so the insight card (Vibrio / spawn / heat days) renders from on-device data when offline — the
  dashboard heat advisory already proves this data is good enough offline.

- **M2 — No discoverable touch route into the fast multi-cage drag-select view from a laid-out
  farm's home.** The canvas-nav overview treats a bare area tap as a no-op (confirmed in code:
  *"a bare single tap on an area no longer drills — camera zoom is the way in, or tap a cage/line
  for its work sheet"*), and the view-mode "Open ›" drill chip was removed. The documented touch
  entry to daily work is per-cage (tap cage → detail sheet → Work) or per-line (rope → line menu) —
  one cage at a time. The efficient drag-select strip I exercised was reached through the debug
  navigation helper, not a tap. For a deckhand doing rounds on 100+ cages, single-cage work is slow.
  *Caveat:* my headless harness could not drive the overview SVG canvas taps at all (even a mouse
  click on a cage returned an empty sheet), so I can't be 100 % sure the batch view is unreachable
  on a real phone — **this one needs a 60-second confirmation on a physical device.** If the only
  touch path to drag-select is via edit/layout mode, surface a plain "Work this area" button on the
  area (or restore a view-mode "Open ›" chip).

### Minor
- **m3 — Work sheet ordering fights the common case.** Handling chips (top) submit instantly; the
  "Work again" reminder is at the bottom of the sheet. The most common log — "I tumbled it, remind
  me in 2 weeks" — costs a scroll down, a tap, a scroll up, a tap (screenshots 07–09). *Fix:* move
  the reminder chips directly under the handling chips, or don't auto-submit on a handling tap —
  let the handling chip arm, then one "Save" applies handling + reminder together.
- **m4 — Single-cage targeting needs 15 px precision.** Covered above. The drag-select path saves
  it, but any task that wants exactly one cage (open it, change its type) is a gloved-thumb gamble.
  *Fix:* expand the invisible per-cell hit-rect to ~28–32 px tall in the strip view (the overview
  canvas already does this with `.lp-cellhit`).
- **m5 — Secondary text is low-contrast for sun glare.** The dashboard count strip, the recent-
  activity list, the section labels in sheets, and the chart axis labels are dim gray on near-black
  (screenshots 02, 07, 22). Fine indoors; first thing to vanish in direct sun. *Fix:* bump the
  secondary ink one step lighter, or ship a high-contrast "sun mode" toggle.

### Polish
- **p6 — ⋮ menu is 14 px from the right edge** on both phones; nudge it ~8 px inboard so a thumb
  can't spill onto the bezel.
- **p7 — Map/Data segmented halves are 2 px apart;** widen the seam or the active-state contrast so
  a gloved tap can't catch the wrong tab.
- **p8 — Pull's Undo lives in a fading toast.** Great that Undo exists, but it animates to
  unclickable in a couple of seconds — a deckhand who looks up at the rail and back has missed it.
  Consider a slightly longer dwell or a persistent "Undo" until the next action.

---

## Wins (what felt fast / right)
- **The 44 px enlargement is real.** `.lineMenu`, `.ovSegBtn`, the popup Pull/Work, and every work
  chip measure 44–46 px on both the 14 Pro Max and the SE. Tap targets are no longer the problem;
  the cage cells are.
- **Drag-select is the right primitive.** One thumb-swipe selects a run and pops fat Pull/Work
  buttons over it. This is the deckhand-grade interaction the rest of the app should route through.
- **The heat advisory nails it.** Plain language ("gauge 87°F+ this week — chill harvest fast"),
  prominent, works offline from the device's own log, and taps through to the harvest forecast.
- **Pull/Fill are 2 actions and self-document.** Pull toasts with Undo and the tub shows source
  provenance ("from 1A — 1A-1..4"); Fill distributes the pile in one tap. Verified end to end.
- **Offline is rock-solid.** Worked while offline, reloaded offline, farm intact, no data loss,
  no blocking network errors. This is the core promise and it holds.
- **Mortality as a %** matches how the work actually gets estimated, and it correctly nets the
  living count (25 % → exact 25 % drop).

---

## Tap cost per routine action (for a person doing it 100×/day)
- Read heat advisory: **1 tap** (Map → Data).
- Work a run, plain handling: **3 actions** (drag + Work + method chip).
- Work a run + "come back in 2 weeks": **4 taps + 2 scrolls** (the m3 ordering tax).
- Log mortality %: **~5 actions** (drag + Work + scroll + % + reason + Log loss).
- Pull a run to the tub: **2 actions** (drag + Pull).
- Fill empties from the tub: **2 actions** (drag + Fill; +1 if a batch picker appears).

---

## Top 5 fixes I'd make
1. **Render the Vibrio/spawn/heat-stress insight card from the local log when offline** (M1) — the
   data is already on the device; don't hide the summer warning behind a fetch the boat can't make.
2. **Give the home a one-tap route into drag-select batch work** (M2) — a "Work this area" button or
   a restored "Open ›" chip, so rounds aren't one-cage-at-a-time. (Confirm reachability on a device.)
3. **Reorder the Work sheet** (m3) — reminder chips under the handling chips, or arm-then-save, so
   "tumbled + 2 weeks" isn't a scroll-down-scroll-up dance.
4. **Fatten the per-cell hit area in the strip view to ~30 px** (m4) so a single cage is tappable
   with gloves, without making the glyphs bigger.
5. **Lift secondary-text contrast / add a sun mode** (m5) and nudge the ⋮ off the screen edge (p6).
