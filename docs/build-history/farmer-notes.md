# SpatMap farmer dogfooding notes
Loop run 2026-06-12, isolated browser (phone emulation 390×844, touch), fresh Brightside seed. Five sessions, then improvement plan + build.

## Session 1 — morning rounds (phone)
Did: read landing page, peeked overview dots, opened Q1, peeked cages, logged a growth check on one cage (45mm), bulk growth check on Line 1 via Select→All→Log (46mm, 6 cages), tried to backfill a missing count, phone back button to overview.

**What worked well**
- Bulk flow is the killer feature: Select → All → Log → one form → "Growth logged for 6 cages", select mode auto-exits. Minimal taps, clear picker copy ("6 stocked · 0 empty. What did you do?").
- Conditions panel: tide format ↑8:22a +1.6 · ↓6:49p −0.4 is exactly right, readable at a glance.
- Ropes through the overview dot rows read great — overview finally looks like the plot view.
- NEEDS WORK badge with "Last worked Jan 28 (135 days ago)" + reset explanation: clear and motivating.
- Phone back button correctly returns to overview.

**Friction / notes**
1. ✋ **Cage sheet ordering**: "CAGE TYPE" dropdown is the FIRST block on the sheet; Log growth / Mortality / Harvest are BELOW THE FOLD on a phone. Every single-cage log = double-tap + scroll + tap. Actions should be first; type change is rare (and already lives in the line ⋯ menu too).
2. ✋ **Peek size row reads broken** when no measurement: a bare "—" on its own line (next to it "count —" IS labeled — inconsistent). Should say "no size yet" or label it.
3. **Overview dots are 9×9px tap targets** — very hard with a wet thumb. Peek-from-overview is the right idea but needs a bigger hit area.
4. **Peek dismissal is risky on the overview**: topbar (farm switcher), stats (Market ready ▸ is a button), conditions panel, and every plot card are all tappable. "Tap a neutral spot" barely exists; mis-tap = accidental sheet/navigation.
5. **Vocabulary drift**: single-cage sheet button says "Log growth", bulk picker + README say "Growth check", the saved-toast says "Growth logged". One name would do.
6. "Initial size — × —" on the batch card is cryptic (unlabeled size × count dashes).
7. ≈ glyph in the conditions panel reads like "=" at small size.
8. Peek card can cover the plot-hop chips row (cosmetic).

Data state after S1: Line 1 Q1 has growth checks (45/46mm), one cage count backfilled attempt (form was reached via Edit batch details — works, 2 taps + typing per cage; bulk count backfill doesn't exist).

## Session 2 — stocking day (phone)
Did: added line(s) in Acre 2 via FAB, recovered from a mis-fill, bulk-stocked 10 cages (300 ct @ 18mm, Grand Isle Hatchery), switched the salinity gauge, read the outlook.

**What worked well**
- Bulk stock: Select → All → Log → Stock → fill → done. 8 taps to stock 10 cages with full batch details. Copy is clear ("Same batch details go on every selected empty cage").
- Station picker: 44 gauges distance-sorted with ✓ on current; picked Barataria Pass (7 mi) and the panel refreshed live — salinity 9.9 → 17 ppt between gauges 7 miles apart, which is exactly why the farmer wants to choose.
- Outlook sheet is legible and honest: "≈ 0.18 mm/day · seasonal model / Nov 2026 — 6 cages / May 2027 — 10 cages · ~3,000 oysters / No growth data yet — 97 cages".

**Friction / notes**
9. ✋✋ **I accidentally created 10 lines (100 cages)**: the add-line sheet's first number field is "Number of lines", second is "Cages per line" — filled the wrong one with wet-thumb haste. The common case is ONE line; bulk-create should be the secondary path, not the first field.
10. ✋✋ **No undo, brutal recovery**: removing ONE just-created empty line = 6 taps (⋯ → Pull cages → confirm → ⋯ → Remove line → confirm). My mistake × 9 lines ≈ 54 taps. A toast "Added 10 lines — Undo" would have fixed it in one.
11. ✋ **Plot-card taps get swallowed by dots**: with dot-peek's stopPropagation, a card dense with dots mostly peeks instead of opening the plot — you must aim for the card title. Opening a plot used to be tap-anywhere.
12. Station picker current gauge reads "0 mi" — should say "current" or similar.
13. Outlook minor: "No growth data yet — 97 cages" dominates; fine and honest, but it could invite action ("tap to see which lines").

Data state after S2: Acre 2 has "Line A 1" stocked 10×300 @ 18mm; gauge is Barataria Pass; 9 accidental lines removed (1 via UI to measure the pain, 8 surgically).

## Session 3 — working day: mortality, harvest, sort wizard (phone)
Did: mortality (30/cage on 3 cages Q2), full harvest on Q2 Line 2 (6 cages emptied), then sorted 3 of Q1 Line 1's cages into Jumbos @60mm (→ Line 5 empties) and Smalls @40mm (→ Q2 Line 2's just-harvested cages, cross-plot).

**What worked well**
- Mortality and harvest forms are tight: date prefilled, "Capped at what each cage has left", "Full harvest — empty every selected cage" checkbox above the count. Toasts confirm plainly ("Harvest logged on 6 cages · 6 emptied").
- Sort wizard pick mode is visually excellent: sources dashed, ineligible stocked cages dimmed, guiding toast ("Tap cages for Jumbos — empty cages, or the ones being sorted"), bar shows "Jumbos · 2 picked / Sets / Next set / ✕" and SURVIVES hopping plots mid-pick.
- Review sheet copy is exemplary: "Emptying 3 cages · Jun 12. Nothing is saved until you confirm." with per-set destination lists and Re-pick.
- Whole 2-set cross-plot sort ≈ 20 taps. Fair for the complexity.

**Friction / notes**
14. Sort sets sheet validation: blocked "Pick destination cages" toasts good copy ("Pick or type a grade for set 2") but doesn't scroll to or highlight the offending field — on a long 2-set sheet the problem can be off-screen.
15. The wizard's bottom bar is visually identical to select-mode's bar (same look, same spot) — mode confusion is possible at a glance; a tint or icon would distinguish "sorting" from "selecting".
16. (Carried from S1: vocabulary — picker item says "Sorted & transferred", review says "Review sort", toast "Sorted N into M". Consistent enough.)

Data state after S3: Q2 L1 has mortality events; Q2 L2 = 4 empty + 2 Smalls; Q1 L1 = 3 empty (sorted out), L5 has 2 Jumbos.

## Session 4 — desk day (computer, 1280px)
Did: hover peeks (dots + cages), single-click pin, double-click sheet, growth chart + projection read, settings tour, cage types manager (added "FlipFarm 9mm"), export backup, layout editor, desktop plot view.

**What worked well**
- Hover peek + mouse-away hide: flawless. Single click pins the peek without opening the sheet; dot clicks never navigate. The interaction model holds on desktop.
- With a measurement the peek reads perfectly: "1-4 · Line 1 / 46 mm / in Jan 28, 2026 · 4.4 months in water / count —".
- Batch card projection copy is excellent: "Growth ~0.18 mm/day · ~5.5 mm/mo (typical rate — no usable checks yet) / Proj. market ~Nov 2026 (76 mm) / Low confidence — log growth checks to use this cage's own pace."
- Export = one click → spatmap-backup-2026-06-12.json. Settings sheet is clean and self-explanatory.
- Desktop overview is genuinely good-looking: ropes, boat-lane dashes, anchor mark, stats row ("3,000 Oysters" from the day's stocking).

**Friction / notes**
17. ✋ **Cage types are name + shape only** — no mesh size field (Philip's explicit ask: each style of cage has a mesh size, e.g. 9mm FlipFarm). Workaround today is stuffing it into the name ("FlipFarm 9mm"), which is what I did and it's wrong — mesh belongs as data (shows in peek/sheet, filterable later).
18. **"+ Add line" FAB floats over content**: at desktop it covers the Acre 2 card header; on phone it covers the last line of long plots. Bottom-right anchored (or hidden when a card is under it) would be cleaner.
19. Add-type form: shape defaults to Bag silently; an empty-name "Add cage type" click gives no feedback (nothing happens, no toast).
20. Cage-type list rows read "Bag Bag · in use" (name echoed twice-ish) — slightly redundant copy.

Data state after S4: new cage type "FlipFarm 9mm" (square, unused); backup JSON exported fine.

## Session 5 — edge cases + reminder-gap study (phone)
Did: detached a spot and peeked it, pulled Line 9, created a second farm and switched back, ran a full disaster drill (export → wipe everything → import), studied where "work again by ___" should live.

**What worked well**
- Detached-spot peek: "1-1 · Line 1 / No cage on this spot" — exactly right. Pull-line toast ("Line 9 cleared — the empty line keeps its place") tells you the invariant.
- Farm switcher: inline "+ New farm" + Create, instant switch, per-farm data clean.
- **Disaster drill passed**: backup JSON → wiped the farm → import restored 23 lines + the second farm. The import confirm ("REPLACES all current data (1 farm). Export a backup first if unsure.") is the right amount of scary.

**Friction / notes**
21. ✋✋ **THE REMINDER GAP** (Philip's explicit ask): after working cages there is no way to say "work these again in 2 weeks." Nothing in the log forms, peek, batch card, or line level. The only signal is the fixed 8-week red ring, after the fact, same interval for everything. Logging work should offer an optional "work again in 1w/2w/4w/8w/custom", the ring should fire on that date, and the peek should show what's due.

---

# Improvement plan (post-dogfood build)

**Feature 1 — Mesh size per cage type** (Philip's ask): `cageType.meshMm` (number, optional). Mesh field in Manage cage types (add + edit), shown in the type list ("Flip · 9 mm mesh · in use"), on the cage sheet's type line, and in the peek for empty cages ("Empty · Flip · 9 mm mesh"). Existing types migrate with mesh unset.

**Feature 2 — Work-again reminders** (Philip's ask + note 21): optional "Work again in 1w / 2w / 4w / 8w / pick date" chips on every work-logging form (single + bulk growth/mortality/harvest/note, stock). Sets `cage.workDue`. Red needs-work ring fires when overdue (past due date); cages with a future due date don't ring early; cages with no due date keep the legacy 8-week rule. Peek + batch card show "due Jun 26" / "overdue 3d". Any new work clears the old due date.

**UX batch (from notes 1–20):** cage-sheet actions above the fold (1); add-line defaults to ONE line with bulk-create demoted (9); "Added N lines — Undo" toast (10); bigger dot hit-areas via ::after inset trick + card taps still open the plot (3, 11); touch peek dismiss-tap swallowed so it can't mis-navigate (4); labeled peek size row (2); FAB to bottom-right (18); "Growth check" vocabulary unified (5); labeled initial size/count (6); ~ instead of ≈ (7); sets-sheet validation scrolls to the offending field (14); sort bar tinted vs select bar (15); empty-name type feedback (19); type list copy (20); station picker "current" instead of "0 mi" (12).

Execution: two sequential builder subagents (same-file discipline), then code-reviewer, then verify + commit.
