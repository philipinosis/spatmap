I have a complete and grounded picture of the codebase. Here are my findings.

---

# SpatMap v7 — Correctness & Safety Review

Reviewed `/Users/philipinosis/Desktop/spatmap/index.html` (3,687 lines) against `_rebuild-BUILD-SPEC.md`. Findings grouped by severity. Each cites the function and line region.

## CRITICAL

### C1. Pull undo restores a *shared, mutated* batch object — undo of a pooling pull corrupts the pile
**`pullSelectedCages`, lines 2484–2541 (snapshot 2485, restore 2535–2538).**

The undo snapshot keeps a live reference to each source cage's batch object, not a copy:

```js
var snapSources = sources.map(function(c){ return { id:c.id, batch:c.batch, evLen:c.events.length }; });
```

For the first pull onto an empty barge this is fine — `barge` is JSON-cloned (line 2484) and the cage batches are untouched objects. The problem is the **second pull that pools into an existing pile**, then undo:

- `snapBarge` (line 2484) is a deep clone of the barge *as it was before this pull* — so it correctly contains the prior `parentBatchIds`, count, etc. Good.
- But `barge.origin.parentBatchIds` (line 2495) is `.slice()`d from the *live* array and then pushed to (2496, 2507). The live `barge.batchId` is preserved across pools (2518 keeps the existing id). So the pile's identity object is shared.

The actual corruption: undo sets `f.barge = snapBarge` (2535) — that restores the barge fine. The cage restore (`c.batch = s.batch`, 2537) re-attaches the *same* batch object that, between the pull and the undo, was added to `barge.origin.parentBatchIds` and to the next pull's parent chain. After undo, that batch is simultaneously (a) live in the cage again and (b) referenced as a parent in any pile built later. Because `lineageEvents` (3006) walks `parentBatchIds` by id, a re-filled child will now show the un-pulled cage's ongoing events as ancestry. Repro: Pull cage A → Fill cage B from barge → Undo the *fill* → Pull undo is now stale (correctly blocked by seq guard), but the parent-id link from B's child to A's batch persists in `farm.batches`, and A is live again. Walking B's lineage surfaces A's post-undo events.

This is subtle and depends on interleaving, but the root cause is concrete: **the undo snapshot aliases mutable batch objects instead of cloning them.**
**Fix:** snapshot `batch: JSON.parse(JSON.stringify(c.batch))` (matching how `snapBarge` is already cloned), and on undo assign the clone back. Same pattern needed in `fillFromBarge` (it stores `m.batch` and removes it from the ledger — that path is okay because the child is freshly created and discarded, but verify the parent pile's `parentBatchIds` is restored via `snapBarge`, which it is).

### C2. Harvest of an *uncounted* pile always empties the barge — silent data loss of the remaining pile
**`harvestFromBarge`, lines 2807–2844.**

When the pile count is `null` (uncounted), the harvest count `take` is whatever the farmer typed (cap at line 2809 is skipped because `barge.count != null` is false). Then:

```js
} else {
  // uncounted pile fully harvested by intent → empty it
  barge.state = 'empty'; ... barge.count = null; ...
}
```

So harvesting *any* amount from an uncounted pile (say the farmer harvests 200 of an unknown-but-large pile) **flips the entire barge to empty** and discards all provenance. The brief (§3.8) says decrement and only empty at 0; for an uncounted pile there is no "0" to hit, but wiping the whole pile on a partial harvest is a real oyster-tracking loss — the farmer harvests a crate, the app says the barge is now empty, and the rest of the pile vanishes from the record.

Repro: load Brightside demo (barge starts as a *counted* 3,200 pile — so use a cage with `count:null`, e.g. Line 6, pull it to an empty barge to get an uncounted pile), open Harvest, type 50, Harvest → barge empty, lineage/origin gone.
**Fix:** for an uncounted pile, keep `state:'pile'` after a partial harvest (do not null everything); only empty it if the farmer explicitly chooses a "harvest all / clear pile" action. At minimum, log the harvested count against the pile but leave the pile present, mirroring the counted branch's "stays pile when >0".

## HIGH

### H1. `fillFromBarge` shortfall branch leaves a positive leftover that never drains the barge — but the toast implies the pile is consumed
**`fillFromBarge`, lines 2564–2572, 2602–2607.**

When `total < n` (fewer oysters than cages), it fills `total` cages with 1 each (`used = targets.slice(0, total)`), `distributed = total`, so `barge.count = total - total = 0` → barge empties. That part is correct and loses nothing.

The real issue is the **`base === 0` case is unreachable** here because `total < n` is caught first — fine — but consider `total === n` exactly: `base = 1, rem = 0`, every cage gets 1, `distributed = n = total`, barge empties. Also fine. The arithmetic invariant (base + remainder spread) holds: `sum(shares) === total` in the normal branch (2570–2571). I verified this sums exactly. **No oyster loss in the counted path.** Keeping this as HIGH only for the adjacent real bug:

The **uncounted pile fill never decrements and never empties** (2598–2601, by design). That means after distributing an uncounted pile into cages, the barge *still shows a pile* with the same (null) count and full origin. A farmer who fills all empty cages from an uncounted barge expects it to be consumed; instead it stays, and they can fill again from the "same" pile indefinitely, minting unlimited child batches from a pile that's physically gone. Repro: uncounted pile (see C2 repro) → Fill several empty cages → barge still loaded → Fill more → duplicate provenance children.
**Fix:** for an uncounted distribution, after filling, set the barge to empty (the pile is gone even if we can't count it), or require the user to confirm "this empties the uncounted pile." The spec's own §3.6 note acknowledges the tension but the current "leave it as pile" choice creates a duplication exploit.

### H2. `loadState` drops detached cages but leaves their batches *orphaned and double-counted* in the ledger
**`migrateFarm`, lines 696 (filter) + 712–717 (ledger backfill).**

Line 696 removes detached cages from `l.cages`. But the ledger backfill (712–717) only adds batches found on *surviving* cages. A legacy detached cage that held a live batch is silently discarded — its batch never reaches `farm.batches`, so any child created from it (via `origin.parentBatchIds`) becomes an unresolvable lineage reference. More importantly, the spec (§1.12 step 3, "drop detached → omit from cages") intends detached spots to be empty; but index-6 could have a *detached but filled* cage. Dropping it loses the batch.

Separately: a batch can appear **twice** in the ledger if a legacy file already listed it in `f.batches` *and* it's on a cage with a different object identity (the dedup at 713–716 keys on `b.id`, so identical ids are fine — but two distinct objects with the same id from a hand-edited import would both survive the `ledgerIds` check only once; acceptable). The orphan-batch-on-detached-cage loss is the real defect.
**Fix:** before filtering detached cages (696), harvest any `c.batch` from a detached-but-filled cage into the ledger (or into the barge as a best-effort pile, matching the legacy-onDeck intent at 719–723 which is currently a no-op stub).

### H3. `growthModel` estimate-today integration can run up to 730+ iterations with `targetSize: Infinity` but is correct; the *real* risk is `daysSince` returning a huge value for a future-dated measurement
**`growthModel`, lines 3106–3109; `integrateGrowth`, 3055–3062.**

If a user back-dates… actually *forward*-dates a growth check (the date input allows any date, including the future), then `lastPt.ms > todayMs`, the code takes the `else` branch (3109) and sets `estTodayMm = lastPt.size` — safe. But `daysSince(lastPt.date)` (3105) returns a *negative* number for a future date, so `model.isStale = (ds > 90)` is false (fine), yet the **confidence** logic (3136) computes `freshEnough` from `daysSince <= STALE_DAYS`, and a negative daysSince passes as "fresh," inflating confidence to high/medium on a bogus future measurement. Minor, but the projection itself: `integrateGrowth(todayMs, estToday, rate, market, 730)` is bounded, so no infinite loop. 

The genuine HIGH: **`integrateGrowth` with `maxDays` derived from `Math.round((todayMs-lastPt.ms)/86400000)` (3107)** — if `lastPt.ms` is far in the past (legacy data, years), this is a large but finite loop (bounded by real elapsed days). For a 10-year-old imported stocked event that never reached market, this runs ~3,650 iterations *per cage per render of the detail sheet*. Not a crash, but on a phone opening a detail for a very old cage it's a visible hitch, and it's called again inside `growthChartSVG`. 
**Fix:** clamp the estimate-today integration `maxDays` to `MAX_PROJECTION_DAYS` (730) as well; an oyster older than 2 years is market-ready or dead regardless, and the season multiplier already caps realistic growth.

### H4. Harvest `count` field `max` attribute set to a number via `setAttribute` works, but the cap is bypassed for uncounted piles, allowing the harvested entry to exceed reality — and `HarvestEntry.count` can be a decimal
**`buildHarvestSheet` 2883–2886; `harvestFromBarge` 2807–2818.**

`parseNum` (587) accepts decimals, so a farmer typing `1.5` harvests 1.5 oysters into the permanent `harvestLog` (count is supposed to be an integer > 0, §1.10). `fmtCompact` then rounds for display, hiding the bad data. The spec requires `count: number, > 0` integer.
**Fix:** `Math.round`/`Math.floor` the harvest take and reject non-positive after rounding. Same applies to the fill-new-seed `count` and growth `sizeMm` if integer counts matter (counts yes; sizes can be decimal).

## MEDIUM

### M1. `applyPileLevel` uses a 0ms `setTimeout` after render that can target a stale/removed DOM node
**`renderBarge`, lines 1500–1503; `applyPileLevel`, 1512–1521.**

```js
setTimeout(function(){ applyPileLevel(wrap, lvl); }, 0);
```

`render()` (1046) rebuilds `#app` from scratch each commit, so `wrap` is detached the instant the next `commit()` fires. The closure holds the *old* `wrap`; if two commits land within the same tick (e.g., an action + its toast-driven re-render, or rapid pulls), the timeout runs `wrap.querySelector('#oysterPile')` on an orphaned node — harmless (no-op, the node isn't on screen) but the *new* barge never gets its pile level applied because its own timeout may have been the one that ran against the old node. Result: an occasional barge that renders at default scale (0.55) instead of its true heap level until the next render. 
**Fix:** apply the transform inline during string assembly, or query `document.querySelector('.barge #oysterPile')` inside the timeout instead of capturing `wrap`, or use `requestAnimationFrame` and re-fetch from the live DOM.

### M2. Capture-phase `scroll`/`resize` → `syncPopup` reads `pop.offsetHeight` every scroll event with no throttle; and the suppressor's capture click listener can swallow a *legitimate* next click
**`syncPopup` 2317–2345; scroll listener 2349; `suppressNextClick` 2240–2253.**

Two issues:
1. The capture-phase scroll listener (2349, `true`) fires `syncPopup` on every scroll frame while a selection exists, forcing layout (`getBoundingClientRect` in a loop over `.cage.sel`, 2325–2330). On a long farm with many selected cages this is a scroll jank source. Throttle with rAF.
2. `suppressNextClick` (2240) installs a capture-phase click handler that suppresses the *first* click anywhere in the document. If the drag's synthetic click never fires (e.g., the pointer was released over a non-clickable area, or the browser doesn't synthesize one), the 400ms timeout clears it — but within that 400ms window, a fast user tap on a *different* control (the menu, the barge) is eaten. The `done` flag means only one click is suppressed, so it's at most one lost tap, but it's a real "I tapped and nothing happened" within 400ms of finishing a drag.
**Fix:** scope the suppressor to the strip/cage that originated the drag (check `e.target.closest('.cage')`) rather than the whole document, and only suppress clicks landing on a cage.

### M3. `bargeOriginText` truncation math is off-by-context — uses post-slice arrays' lengths inconsistently, but actually reads the *original* length correctly; the real bug is harvest-log/origin showing union from *all* pools without dedup beyond exact-string
**`bargeOriginText` 1470–1479.**

Lines 1476–1477 correctly check `o.lineNames.length > 2` against the *original* (un-sliced) array — that's right, the `…` shows when truncated. No bug there (I initially suspected one). The legitimate concern: `pullSelectedCages` unions `cageLabels` by exact label string (2505). Labels are recomputed on every layout change (`reindexLines`, 1199–1204). So a pile pulled from "2-3", then a line removed/reindexed making a *different* cage now labelled "2-3", will dedup-merge two physically different cages' provenance under one label. Cosmetic (display only), but the origin caption can mislead after a structural edit.
**Fix:** low priority; if accuracy matters, store source cage *ids* in provenance alongside labels and dedup on id.

### M4. `removeCageType` in *create* mode doesn't check usage, but the working model's lines don't exist yet — fine. However `createFarmFromModel` can build cages pointing at a type the user deleted mid-form
**`createFarmFromModel` 1612–1616.**

`typeId = farm.cageTypes[0].id` (1612) always uses the *first surviving* type for all generated cages, so a deleted type can't leave a dangling `typeId` here. Safe. But if the user reorders/deletes such that index 0 changed, all cages silently get the new first type — acceptable per spec (onboarding seeds one type). Not a bug; noting it because the review brief asked about type-in-use. The edit-mode guard (1660–1666) is correct.

### M5. `workCages` growth-undo can leave a stale `sizeMm` mirror when the batch had a *measured* size from an event, not the mirror
**`workCages` 2639–2641 (commit) and 2657–2660 (undo).**

On a growth Work, it sets `cage.batch.sizeMm = opts.sizeMm` (2641). Undo restores `c.batch.sizeMm = s.sizeMm` (2659) where `s.sizeMm` was the batch mirror *before* the work (2634). Correct for the mirror. But `latestSize()` (957) prefers the most recent *growth/stocked event* over the mirror — and the undo truncates `c.events.length = s.evLen` (2659), removing the growth event. So after undo, `latestSize` falls back to the (restored) mirror. Consistent. No bug — verified the interaction is sound. (Listing to confirm it was checked, not as a defect.)

## LOW

### L1. `toast` re-entrancy: a second `toast()` call appends a new `.undo` button without clearing the prior one
**`toast` 796–809.**

`t.textContent = msg` (799) wipes children including any previous undo button — good. But the sequence is: set textContent (clears), then `appendChild` the new undo. If two `undoable()` calls fire in the same tick (e.g., a bulk action that internally toasts twice), only the last wins and the prior undo is unreachable — which is the *intended* seq-guard behavior. No defect; the seq guard (811–817) correctly invalidates superseded undos. Noting because the brief asked to confirm undo guarding: **it is correctly guarded** — `undoable` captures `commit.seq` (812) and bails if `commit.seq !== seqAt` (814).

### L2. `parseNum` accepts `Infinity`-producing input indirectly; number inputs with `e` notation
**`parseNum` 587–594.**

`parseFloat('1e999')` → `Infinity`, and `isFinite(Infinity)` is false, so it returns `null` — safe. `parseFloat('1e3')` → 1000, valid. Counts like market size accept this; harmless. No fix needed; confirming robustness per the NaN concern in the brief. `Math.max(1, parseNum(...) || 76)` patterns (1573, 1580) correctly floor at 1.

### L3. `lineageEvents` includes events whose `batchId` is `''` if a chain id is empty string
**`lineageEvents` 3012–3022.**

Migrated events can have `batchId: ''` (763, fallback when no batch). If `batch.id` were ever `''` (it isn't — `uid()` always returns truthy), `chain['']` would match all empty-batchId events. Currently impossible because `uid()` is always non-empty and `chain` is seeded from `batch.id`. Defensive only.
**Fix (optional):** guard `if (ev.batchId && chain[ev.batchId])` at 3022.

### L4. Empty farm / `getFarm()` null paths are well-guarded
**Verified:** `render()` (1051) handles `!state.farms.length` → onboarding. `getFarm()` (782) returns null safely and every action flow opens with `var farm = getFarm(); if (!farm) return;`. `renderPopup` (2262) and `syncPopup` (2321) both null-check. Zero-cage lines render via the `emptyLine` branch (1133–1134) and `denseRangeSelect` bails on `!cells.length` (2144). `addLine` with a last line of 0 cages falls back to `perLine = 10` (1180–1181). **No crash found in these edges.**

### L5. XSS surface is clean
**Verified the full injection surface per the brief.** The only `innerHTML` sink is `h()`'s `html:` option (508). I traced every `html:` caller: all pass machine-generated SVG (`icon()`, `shapeSVG()`, `pilingSVG()`, `growthChartSVG()`, `BARGE_*_SVG`) or literal `'×'`. Every user-entered string — farm name (1085, 1546), line names (1126, 1703), grade words (1681), hatchery (2443/2943), notes (2446), cage type names (1634), harvest notes — reaches the DOM exclusively through `h(...)` *children*, which go through `appendKids` → `document.createTextNode(String(k))` (528) or through `value:`/`placeholder` attributes (514). A note of `<img src=x onerror=alert(1)>` renders as inert text. `growthChartSVG` interpolates only numbers (sizes, coords) and the literal `marketMm`, never user strings. **No XSS path exists.** This matches the spec's intent and is the one thing the brief most wanted confirmed.

---

## Summary of what to fix, in priority order
1. **C1** — deep-clone batch objects in the `pullSelectedCages` undo snapshot (lines 2485, 2537), not live references.
2. **C2** — don't wipe an uncounted pile on a *partial* harvest (`harvestFromBarge`, 2841–2843).
3. **H1** — empty the barge after an *uncounted* fill-from-barge, or block re-fill, to stop infinite child minting (2598–2601).
4. **H2** — rescue batches off detached-but-filled cages before dropping them in migration (696, 712–717).
5. **H3** — clamp the estimate-today integration to `MAX_PROJECTION_DAYS` (3107).
6. **H4** — round harvest/seed counts to integers; reject ≤0 post-round (2807–2818).
7. **M1** — apply pile level from the live DOM, not a captured stale `wrap` (1500–1503).
8. **M2** — scope the post-drag click suppressor to cages; rAF-throttle the scroll `syncPopup` (2240–2253, 2349).

Confirmed correct (no change needed): the even-split arithmetic in the counted `fillFromBarge` path (no oyster loss), undo seq-guarding, the object-URL revoke choke point in `renderSheet` (847–848, before early return), `sweepPhotos` 10-minute grace + reference scan, the import path's `delete data.photos` before `localStorage.setItem` (2061), and the entire XSS surface.
