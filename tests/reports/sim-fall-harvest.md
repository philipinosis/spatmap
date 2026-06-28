# SpatMap field sim — Renee, FALL harvest & sale

**Persona:** Renee, owner-operator. Runs harvest and sales. Wants counts and money right,
grades by size, and a clean record to hand a buyer or an inspector.
**Season slice:** Fall (clock faked to **2026-10-15**), Brightside demo.
**Device:** iPhone 14 Pro Max (430×740), headless Playwright, real-UI taps.
**Driver:** `tests/sim-fall-harvest.mjs` · run log `shots/fall-harvest/_run-log.txt`
**Screens:** `tests/reports/shots/fall-harvest/` · CSV captures `tests/reports/csv-fall/`
**JS console / page errors across the whole run: 0.**

What I did, all by tapping the rendered UI: set per-grade prices from the dashboard CTA,
read "$ on the water", sold the standing tub pile with a per-sale price override, pulled the
market-ready Jumbo line to the tub, sorted it with the tub batch-split into two named
sub-batches, harvested the remainder at the grade price, read the harvest log and harvest
forecast, exported both CSVs, then ran a deliberate mixed-grade comingle probe.

---

## Day on the water (narrative)

**Set prices.** Data tab showed a "Set oyster prices" CTA (no farm price set in the demo). I
entered Standard $0.85, Petite $0.65, Jumbo $1.20, left Default/ungraded blank. The price
editor is clean — one row per grade, saves on each keystroke. (`02`, `03`)

**Read "$ on the water".** Dashboard then read **"$6.5k on the water"** with
**"45k oysters +3.2k in tub · 32 filled · 20 empty"** and "5.4k oysters sale-ready · 6 cages".
The $6,480 is *only* the 5,400 ready Jumbos (5,400 × $1.20). The 3,200 Standard sitting in the
tub — worth $2,720 at the Standard price — are **in the oyster count but not in the dollars**.
The headline tracks cages only; the tub adds to the count line and nothing to the money. (`04`)

**Sold the standing tub.** Tapped the tub → quick one-field confirm ("~3.2k in the tub"). Tapped
"More options" for the full sheet (the quick sheet has no price field). Count prefilled 3,200; I
set a **$0.80 wholesale override** and a note "Wholesale truck — full tub". Harvest logged
**3,200 · $0.80 · $2,560.00**, provenance "from Line 2 (2-3, 2-5)". Clean. (`05`, `06`)

**"$ on the water" after the sale.** cropValue unchanged at $6,480; oyster count fell by exactly
3,200. So selling the tub moved the *count* but not the *money*, because the tub money was never
in the figure to begin with. (`07`)

**Pulled the ready Jumbos.** In the work map I tapped all six Jumbo cages on line 3A; the popup
read "6 filled cages" with Pull/Work. Pull pooled **6 × 900 = 5,400 @ 82 mm, grade Jumbo** onto
the (now empty) tub — count exact, single grade preserved. (`08`, `09`)

**Tub batch-split.** Tub → More options → "Split into batches". I made **Restaurant XL**
(2,000 · 88 mm · Jumbo) and **Bar select** (2,000 · 78 mm · Standard). Live "Remaining: 1.4k"
readout, Save disabled if you over-allocate. Saved → tub HUD now reads "~5.4k · 2 batches sorted";
sheet shows the two chips + a 1,400 Jumbo remainder. This feature is the best part of the flow.
(`10`, `11`, `12`)

**Each split's market date?** The brief said to watch each split "project its own market date."
It doesn't. The chips read only **"Restaurant XL · 2k · Jumbo"** / **"Bar select · 2k · Standard"** —
no date, no readiness. Splits are stock already pulled *off* the water, so a forward market date
arguably doesn't apply, but the expectation in the task is simply not met, and (worse) the splits
vanish from the harvest forecast (below).

**Harvested the remainder.** Tub → full sheet (it opens full once splits exist). Count prefilled
1,400, $/oyster prefilled $1.20 (the Jumbo grade price). Harvested → log **1,400 · $1.20 ·
$1,680.00**, from 3A. **Revenue to date $4.2k.** The two legacy demo harvests still show "—"
(they predate pricing — honest, never a fake $0). (`13`, `14`)

**Harvest forecast.** "Ready now: **0 oysters · 0 cages**" (the only ready stock was the Jumbo
line I just harvested; everything else is 28–58 mm and immature). Coming up: Nov 2026 1.4k,
Mar 2027 9.8k, Apr 2027 11k, Jul 2027 14k, Oct 2027 0·5 cages. **Inventory by grade: "Ungraded
37k oysters"** — a single lump. The 4,000 graded, sorted oysters in the tub are nowhere in the
forecast. (`15`)

**CSV exports.** Data menu → Stock on hand and Harvest log both downloaded cleanly
(`spatmap-stock-2026-10-15.csv`, `spatmap-harvests-2026-10-15.csv`). Contents reviewed below. (`16`)

**Comingle probe (inaccuracy hunt).** Fresh tub with 3,200 Standard @60 mm; I pulled one Jumbo
cage (900 @82 mm) onto it. Result: count 3,200→**4,100** (correct), grade **Standard → blank
(Ungraded)**, size **60 → 82 mm**. The quick-harvest caption read "~4.1k in the tub · from 3A ·
3A-1" — it even drops the Line 2 origin. Harvesting this via the quick sheet would log 4,100
oysters at **82 mm, no grade**, and because grade is null and no default price is set, the sale
would record **no revenue** with no prompt. (`17`)

---

## Money / count accuracy — what could mislead a sale

| # | Severity | Where | What happens |
|---|---|---|---|
| 1 | **Major** | Dashboard "$ on the water" | Tub/sorted stock counts in *oysters* ("+3.2k in tub") but is excluded from the *dollar* figure. By end of run, **$4,100 of sorted, priced oysters sat in the tub while "$ on the water" read $0** (remaining cages ungraded → unpriced). The money headline and the count line disagree exactly when stock is staged to sell. |
| 2 | **Major** | Pull (mixed grades) | Pulling different grades together collapses grade to **blank/Ungraded** and sets size to the **max** of sources. 3,200 Standard @60 + 900 Jumbo @82 became "4,100 Ungraded @82 mm". A later sale records the wrong size, no grade, and (no default price) **null revenue** via the quick sheet — a real sale logged with bad size and $0. Recoverable only if Renee notices and re-sorts with the split editor. |
| 3 | **Major** | Harvest forecast | "Inventory by grade" shows only **"Ungraded 37k"** (cages carry no grade) and **ignores the tub entirely** — 4,000 sorted, graded oysters are invisible. For someone selling by grade, the grade inventory can't answer "how many Jumbo / Standard can I move." |
| 4 | **Minor** | Tub split chips | Sub-batches show **count · grade only, no market date / readiness** (task expectation unmet); they also don't appear in the forecast. |
| 5 | **Minor** | All money headlines | On-screen dollars are abbreviated by `fmtCompact` to 1-decimal "k": $6,480→**$6.5k**, $1,680→**$1.7k**, $2,560→**$2.6k**, revenue-to-date $4,240→**$4.2k**. Every headline rounds *up* by tens of dollars. Exact figures live only in the CSV. |
| 6 | **Minor** | Stock CSV | Omits tub/sorted stock; **Grade and Est $ are blank on every row** (ungraded + no default price), so a buyer sheet carries no values. Harvest CSV mixes line naming ("Line 3" legacy vs "3A" new) in one column, and legacy harvests have blank $/Revenue. |
| 7 | **Polish** | Misc | Forecast "Oct 2027 · **0** · 5 cages" — uncounted cages read as 0 oysters (looks empty). Harvest sheet label reads "From **from** 3A" (duplicated word). Comingled quick-harvest caption surfaces only one source line, hiding Line 2. Work-view stat strip ("37k oysters") excludes the tub while the Data dashboard adds "+Xk in tub" — two different totals for the same farm. |

### Exported CSV review (the buyer/inspector deliverable)
- **Harvest CSV is the strong one.** ISO dates, sorted ascending, exact `$/oyster` (0.80, 1.20)
  and `Revenue` (2560.00, 1680.00) to the cent, provenance, and a formula-injection guard. An
  invoice/audit could use it as-is. Gaps: legacy rows blank on money; "From lines" naming
  inconsistent.
- **Stock CSV is weak in this state.** Header is good (Count, Grade, Size, Months in water,
  Market ready, Est $), no broken "—" (empties are blank, not dashes), but **Grade and Est $ are
  empty for all 26 rows** and the tub's sorted stock is missing — so it doesn't show value or the
  staged inventory a buyer would ask about.

---

## Wins
- **Tub batch-split editor** is genuinely good: Count/Size/Grade/Label rows, live "Remaining"
  readout, Save auto-disables on over-allocation, undo toast. Sorting a pool into named batches is
  fast and obvious — exactly Renee's grading job.
- **Revenue capture on harvest** works the way it should: $/oyster prefilled from the grade price,
  per-sale **override** honored ($0.80 wholesale), note + provenance carried into the log *and* the
  CSV. "Revenue to date" is honest — it shows "—" for unpriced legacy harvests instead of faking $0.
- **Counts are conserved** through the whole clean flow: pull 6×900=5,400 exactly, split
  2,000+2,000 leaves 1,400, harvest decrements correctly. No phantom counts, no double-counting in
  the single-grade path.
- **Quick-harvest** one-field confirm for a plain pile is fast, and it still auto-captures revenue
  from the grade price; "More options" reveals the full sheet with override + split + photos.
- **Zero JS errors** across set-prices → sell → pull → split → harvest → forecast → export.

## Top 5 fixes
1. **Value the tub in "$ on the water"** (or show a distinct "$ in tub" line). Sorted, priced
   stock reading as $0 while it counts in oysters is the single most misleading thing for an owner
   watching money.
2. **Stop destroying grade/size on a mixed-grade pull.** Keep per-source grade/size (or warn and
   push straight into the split editor); never silently relabel a 60 mm Standard pile as 82 mm
   Ungraded, and never log a $0-revenue sale without a prompt.
3. **Put the tub (and its splits) into the harvest forecast,** and make "Inventory by grade"
   reflect real grades — so the grade breakdown a sale depends on is actually answerable.
4. **Show exact dollars on money headlines and the harvest log** (or round to the dollar), not
   1-decimal "k" that overstates by tens.
5. **Make the Stock CSV buyer-ready:** include tub/sorted rows, populate Est $ via a default price,
   and unify line naming ("3A" vs "Line 3") across the log and both CSVs.
