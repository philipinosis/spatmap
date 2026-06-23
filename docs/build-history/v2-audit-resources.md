# SpatMap v2 — Resource / Performance / Robustness Audit

File: `/Users/philipinosis/Desktop/spatmap/spatmap-v2.html` (9252 lines, single inline script).
Scope: perf, memory, robustness only (no logic/architecture). Target: low-end iOS Safari / Android Chrome on a boat, intermittent network, must never lose data.

General good news first (so the criticals read in context):
- Window/document-level listeners (`resize`, `popstate`, `scroll`, the global click-clear, `syncPopupThrottled`) are all registered **once** at top level, not per-render — no accumulation there.
- `render()` does `app.innerHTML=''`, so the previous SVG and its `svg.addEventListener` handlers are dropped with the subtree and GC'd. Per-render SVG listeners do **not** leak.
- `condGetJSON` is `AbortController`-bounded; `condRefresh` uses a `condReqSeq` guard against stale paints; fetches `.catch` to cached values.
- `photoDB()` guards private-mode/undefined IDB, has a 3s first-open-hang timeout, never caches a rejection, and handles `onblocked`/`onerror`/`onclose`.

---

## CRITICAL

### C1. Per-cage status recompute makes the SVG redraw O(cages × events) — and it runs on every LOD band crossing mid-pan
`drawCageCells` line 4822–4826 calls `cageStatus(cage, farm)` for **every** cage. `cageStatus` (2108) calls `latestSize` (2040) **and** `needsWork` (2098) → `lastResettingDate` (2084), each of which does a full linear scan of `cage.events`. So one redraw is `O(total_cages × avg_events_per_cage)`, not `O(cages)`.

`layoutRedraw` (4300) tears down and rebuilds the entire `#layoutWorld` subtree (`while(world.firstChild) removeChild`, then `drawPlot` for every plot). It is called from `scheduleApplyView` (2945) **every time a pan/zoom crosses an LOD tier** (line 2953: `if (t !== LAYOUT.lastTier) layoutRedraw()`). A pinch that sweeps through 2–3 tiers fires 2–3 full teardown+rebuild+restatus passes back-to-back, each touching every event of every cage.

Why it bites: a real farm of 30 lines × 100 cages = 3000 cages, each with a season of work/growth events (say 10–30 each), is 30k–90k date parses (`isoToMs`/`daysSince`) **per redraw frame**, plus ~3000–12000 SVG node creations (`drawCageCells` appends a hit-rect + a glyph/rect + ready-ring + needs-work dot + tens-tick text per cage — up to ~5 nodes/cage). On a low-end phone that is a multi-hundred-ms jank spike on every zoom that crosses a tier. `CELL_MAX=300` (4722) caps cells at the zoomed-out tiers, but the moment the farmer zooms into the `'area'`/`'work'` tier (the normal working state) the cap no longer applies and the full cost lands.

Fix: (a) memoize `cageStatus` per cage keyed by `commit.seq` (status only changes on a commit), so a redraw is a map lookup not an event re-scan; or precompute a `{color,ready,needsWork,groupKey}` snapshot once per `layoutRedraw` and pass it into `drawCageCells`. (b) Make `latestSize`/`lastResettingDate` O(1) by caching the derived size/last-reset on the cage at commit time. (c) Debounce the tier-change `layoutRedraw` so a continuous pinch redraws once on settle, not once per band crossed.

### C2. `save()` does a synchronous full `JSON.stringify(state)` on every `commit()`, no debounce, with a blob that grows unbounded
`save()` (1831): `localStorage.setItem(STORAGE_KEY, JSON.stringify(state))`. `commit()` (1844) calls `save()` then `render()` on **every** mutation. There is no debounce and no size budget.

Why it bites: the farmer's `state` holds every cage's full `events[]` array forever (events are never pruned — `referencedPhotoIds` at 8985 walks `cage.events` for every line, confirming events accumulate on the cage). For 3000 cages × 20 events × ~150 bytes/event ≈ 9 MB of JSON. Serializing 9 MB of JSON synchronously on the main thread on a low-end phone is a multi-hundred-ms freeze **on every tap that commits** (fill, work, pull, harvest), right when the farmer is rapid-firing edits on a boat. localStorage also has a hard ~5 MB quota in mobile Safari — a real season's data will silently hit `QuotaExceededError`, and the only handling (1833) is a transient `toast('Could not save')`. The mutation already happened in memory and rendered, so the farmer sees success while the write is being dropped — **silent data loss**, the one thing the brief says must never happen.

Fix: (a) debounce `save()` (e.g. 400–800 ms trailing) so a burst of edits writes once; keep a synchronous flush on `visibilitychange`/`pagehide` so a backgrounded app still persists. (b) Measure the serialized length and warn the farmer **before** the quota is hit (e.g. at 80% of a 4 MB budget) with an actionable "export a backup / archive old seasons" prompt, not a toast after the fact. (c) Consider moving the bulk store to IndexedDB (you already run an IDB layer for photos) where the quota is far larger and the write is async/off-thread-ish; localStorage is the wrong durable store for a season of records.

### C3. A `QuotaExceededError` mid-write can corrupt the entire saved farm
`localStorage.setItem` with a too-large value throws *before* committing — that part is atomic. But the real corruption path is subtler: `triggerImport` (7161) and `save` both do `localStorage.setItem(STORAGE_KEY, JSON.stringify(...))` as the **only** copy. There is no write-ahead/temp-key swap and no second slot. If the quota is exceeded on a `save()` after a destructive in-memory mutation (e.g. a bulk remove or a pull-to-barge), the in-memory `state` has advanced but the persisted copy is now stale, and the next `save()` may also fail — the farmer can do an hour of work that never lands, then close the app and lose all of it.

Why it bites: offline boat use means no server backstop; localStorage is the entire durable record.

Fix: write to a temp key first, then swap (`setItem(KEY_NEW, blob); removeItem(KEY); setItem(KEY, blob)` is still single-slot — better: keep `KEY` and `KEY.bak`, write the new blob to `KEY.bak`, verify `getItem` round-trips, then promote). On any `setItem` failure, **do not** clear the prior good copy and surface a blocking, non-dismissable banner ("Storage full — export now or lose changes"). Pair with C2's budget warning so this is reached rarely.

---

## HIGH

### H1. `applyCageHighlight` / `paintHighlight` run multiple full-document `querySelectorAll` sweeps over the SVG on every hover frame
`paintHighlight` (6086) runs `world.querySelectorAll('.lp-cell-match')` to clear, then `world.querySelectorAll('.lp-cagecell[data-batch-group="..."]')` to spotlight — over the entire (up to 3000-cell) SVG. This fires from `onHover` (5929 → 5899 `applyCageHighlight`) on **every pointermove that changes the hovered cell**, and from `reapplyCageHighlight` after every `layoutRedraw`. The empty-cage branch (6106) runs a **third** `querySelectorAll('.lp-cell-match')` redundantly (the top-of-function clear at 6089 already did it — the comment even admits it is re-asserting).

Why it bites: `querySelectorAll` with an attribute selector over thousands of SVG nodes is a synchronous DOM walk; doing 2–3 of them per hover frame on a desktop trackpad is a measurable per-frame cost, and on a redraw it stacks on top of C1. Touch doesn't hover, but desktop/keyboard users (and the boat captain on a rugged tablet with a mouse) feel it.

Fix: cache the currently-matched node list on `LAYOUT` and clear by iterating that cached array instead of re-querying; drop the redundant `stale` query at 6106 (the clear loop already covered it). Better, key cells into a `Map<batchGroupKey, Element[]>` built once per `layoutRedraw` so spotlighting a cohort is a map lookup, not a selector scan.

### H2. `syncPopup` calls `getBoundingClientRect` in a loop over all selected cells plus a layout-forcing `topbar` rect, throttled to rAF but triggered by `scroll` — layout thrash during drag-select
`syncPopup` (7429) loops `picks[i].getBoundingClientRect()` over every `.cage.sel` (7437), then reads `pop.offsetHeight`/`offsetWidth` (7443) and `tb.getBoundingClientRect().bottom` (7447) — interleaving reads after a class/style write path. It is invoked directly inside `denseRangeSelect.onMove` (7304 `syncPopup()` every move) **and** on every `scroll`/`resize` via `syncPopupThrottled` (7461–7463, scroll uses capture so it fires for any scroll container).

Why it bites: dragging across 50–100 cages to bulk-select fires a full `getBoundingClientRect` over the growing selection on every move event (7304 is **not** rAF-throttled — only the scroll/resize path is). Each `getBoundingClientRect` after a DOM/class write forces a synchronous reflow; doing N of them per move event during a drag is the textbook layout-thrash that makes drag-select stutter on a low-end phone.

Fix: route the `onMove` call through `syncPopupThrottled` too (rAF-coalesced) instead of calling `syncPopup` directly; batch all rect reads before any style writes; cache the `topbar` bottom once per gesture instead of per call.

### H3. Object-URL leak window in `openPhotoViewer` when the viewer is closed mid-load
`openPhotoViewer.show` (8938) calls `revoke()` then `photoGet(...).then` and assigns `_pvURL = URL.createObjectURL(rec.blob)` **inside the async callback** (8944). If the user closes the viewer (or navigates) while `photoGet` is in flight, `close()` (8920) runs `revoke()` on the *current* `_pvURL` — but the in-flight `.then` then resolves and assigns a **new** `_pvURL` after close, with no listener and no further revoke. That blob URL (a full-res ~1280px JPEG decoded into memory) leaks until the page unloads. Rapid swiping through a photo set (each `show()` fires a fresh async `photoGet`) can strand several.

Why it bites: each leaked object URL pins its decoded image bytes; on a memory-constrained phone a few stranded 1280px JPEGs plus the live one is real pressure, and iOS Safari will kill the tab under memory pressure (losing unsaved in-memory edits — see C2).

Fix: capture a local sequence token in `show()`; in the `.then`, bail (and immediately revoke the just-created URL) if the token is stale or the viewer host is no longer `.viewer`. Mirror the `condReqSeq` pattern already used in `condRefresh`.

### H4. Conditions bar has no offline short-circuit and no backoff — five hung fetches per refresh while offline
`condRefresh` (3619) unconditionally kicks off **five** fetches (tides, water temp, wind, air temp, weather) every time `renderConditionsBar` runs (which is every render of the overview home, 2166). There is no `navigator.onLine` check before firing, and no retry backoff. Offline, all five take the full `condGetJSON` timeout (7000 ms default, 12000 for stations) to abort. `condFetchWeather` (3583) chains **two** sequential fetches (points → forecast), so its failure path is up to ~14 s.

Why it bites: on a boat with no signal, every visit to the home screen spins up five doomed fetches that each hold a connection/timer for 7–14 s. It is not a hard leak (the abort timer fires), but it is wasted radio wakeups (battery), and if the farmer toggles the overview repeatedly, `condReqSeq` only guards the *paint*, not the in-flight fetches — multiple overlapping waves of five fetches can be outstanding at once.

Fix: short-circuit `condRefresh` when `navigator.onLine === false` (paint straight from `condReadCache`); add an `online` event listener to refresh once when connectivity returns; track and `abort()` the prior wave's controllers when a new `renderConditionsBar` supersedes it (store them on a module var keyed by `condReqSeq`).

### H5. `denseRangeSelect` re-wires fresh pointer listeners on every `.cageStrip` on every work-map render, with `cellAt` doing `elementFromPoint` per move
`render()` (2177) rebuilds the work map and `renderLine`/`renderCageCell` create fresh strips each time; `denseRangeSelect` (7240) attaches `pointerdown/move/up/cancel/click` to each strip. Because the strips are new DOM each render the old listeners GC with them (not a hard leak), but `onMove` (7296) calls `cellAt` (7247) which does `document.elementFromPoint(clientX, clientY)` then walks `parentNode` on **every** pointermove — a hit-test + tree walk per move event during a drag.

Why it bites: `elementFromPoint` forces a hit-test (and can force layout) on every move; during a fast drag-select across a long line this is dozens of forced hit-tests per second on a low-end phone, compounding H2.

Fix: cache the strip's cell rects once on `pointerdown` (read `getBoundingClientRect` for each `.cage` into an array), then map `clientX` to a cell by arithmetic in `onMove` instead of `elementFromPoint` per frame.

---

## MEDIUM

### M1. `condLoadStations` parses and caches the full NOAA station list (~3000 stations) into localStorage, competing with farm data for the 5 MB quota
`condLoadStations` (3470) fetches `stations.json?type=waterlevels`, slims each to `{id,name,state,lat,lng}`, and `condLSset(COND_K_STATIONS, {ts, list})` (3483) stores the whole array in localStorage. NOAA's water-level station list is ~3000 entries; slimmed, that is still ~200–400 KB of JSON sharing the same `localStorage` budget that C2/C3 are already straining.

Why it bites: it eats into the same ~5 MB cap that the irreplaceable farm record lives in, making the C2 quota wall arrive sooner. Conditions data is a nicety; farm data is the product.

Fix: store the station list (and the `COND_K_LASTGOOD` cache) in IndexedDB or a separate origin-private store, or cap/TTL it more aggressively; never let derived network cache crowd out the durable record.

### M2. `localStorage` reads/writes for conditions cache (`condReadCache`/`condWriteCache`) do a full parse+stringify of the whole last-good map on every single product write
`condWriteCache` (3505) does `condLSget(COND_K_LASTGOOD)` (full `JSON.parse`) then `condLSset` (full `JSON.stringify`) for **each** of the five products on every refresh — five read-modify-write cycles of the entire cache blob per refresh.

Why it bites: minor per-write cost, but it is five synchronous parse+stringify pairs of a growing multi-station map on the main thread every time the home screen refreshes; on a low-end phone with several cached stations this is avoidable jank stacked on H4.

Fix: batch the five product writes into one read-modify-write at the end of `condRefresh`, or hold the last-good map in memory and flush once.

### M3. `compressPhoto` decodes the full-resolution source image into memory with no upper-bound guard before scaling
`compressPhoto` (8775) feeds the raw camera file to `createImageBitmap`/`new Image()` and draws it to a canvas at up to 1280px. A modern phone camera shoots 12–48 MP; the **decode** of the source (before the downscale) allocates the full bitmap (e.g. 48 MP ≈ 190 MB RGBA) in memory.

Why it bites: on a low-end phone, decoding a 48 MP HEIC to a bitmap can OOM the tab outright; `canvas.toBlob` returning null is handled (8787) but the decode itself can crash before that. The `PHOTO_CAP=6` (8666) is a *count* cap, not a *memory* guard.

Fix: where supported, pass `createImageBitmap(file, { resizeWidth, resizeQuality })` so the decode downscales in one step rather than allocating the full bitmap; catch the decode rejection (already partly done via `pathB`) and surface a clear "photo too large for this device" message.

### M4. `sweepPhotos` loads every unreferenced photo *record* (full blobs) just to read `createdAt`
`sweepPhotos` (9002) computes unreferenced ids, then `photoGetMany(unref)` (9011) which `photoGet`s each — pulling the **full Blob** of every unreferenced photo into memory just to check `r.createdAt < cutoff` (9016).

Why it bites: after a busy season with many replaced/orphaned photos, the grace-window sweep at startup (`init` → `setTimeout(sweepPhotos, 3000)`, 9177) yanks dozens of full JPEG blobs into memory at once, on the same low-memory phone, 3 s after launch.

Fix: store `createdAt` as part of an index, or use a cursor that reads only the `createdAt` field / key range, so the grace-window decision never materializes blob bytes. At minimum, fetch records in small batches rather than one `Promise.all` over all of them.

### M5. `cellAt`/`drawBand` in `denseRangeSelect` and `syncPopup` read `getBoundingClientRect` inside loops that also write DOM (band insertion)
`drawBand` (7270) removes/creates the band element, then reads `strip.getBoundingClientRect()` + `first`/`last` rects (7275–7276) — a write (removeChild/append happens around it) interleaved with reads. `paintRange` (7258) calls `drawBand` on every move.

Why it bites: same reflow-thrash family as H2/H5; the band redraw on every drag move forces layout reads after a DOM mutation.

Fix: compute the band position from the cached cell rects (see H5) without re-reading the strip rect each move; append the band once and only update its `left`/`width`.

---

## LOW

### L1. `peekGraceTimer` / `suppressTid` / various `setTimeout`s are cleared on their own paths but not on teardown
Timers like `LAYOUT.peekGraceTimer` (5912), the `suppressTid`/click-suppression timers (6159, 7351), the `drillIntoArea` 220 ms swap timer (5253), and the sheet-URL revoke timer (1904) are each self-clearing on the normal path, but a `render()`/scope-swap that happens while one is pending leaves it to fire against a torn-down DOM. The handlers are null-guarded, so this is benign today, but it is latent: a pending `peekGraceTimer` firing after a redraw calls `clearCageHighlight` on a new scene.

Fix: track outstanding UI timers on `LAYOUT` and clear them at the top of `render()`/`doDrillSwap`.

### L2. No `touch-action`/passive audit gap: the SVG uses `touch-action:none` (correct for pan/pinch), but `denseRangeSelect` strips rely on `e.preventDefault()` in a non-passive pointermove
`denseRangeSelect.onMove` (7302) calls `e.preventDefault()` to own the horizontal gesture. Pointer events aren't subject to the passive-listener default the way `touchmove` is, so this works, but the comment at 7239 notes `touch-action:pan-y` on `.cage` — verify that vertical scroll of a long line list still works on iOS and that the preventDefault path doesn't fight it. Low risk; flagged for a device check.

Fix: confirm on a real iOS device that long-line vertical scroll and horizontal drag-select coexist; if not, gate `preventDefault` strictly to confirmed-horizontal moves.

### L3. `condGetJSON` abort timer is cleared on settle but the `fetch` body (`r.json()`) is not abortable once headers arrive
`condGetJSON` (3459) clears the timeout once `fetch` resolves headers, then awaits `r.json()`. A station list or forecast that arrives with headers but streams a slow/huge body is no longer bounded by the abort timer (it was cleared at 3460).

Why it bites: rare, but a partially-connected boat (headers arrive, body stalls) could hang `r.json()` indefinitely with the guard already disarmed.

Fix: clear the timeout only after `r.json()` resolves, or keep a separate body-read timeout.

### L4. `farmTotalCageCount` is memoized per `redrawSeq`, but `farmIsSmall` is called from both `drawCageCells` and `drawArea`/`drawPlot` per element — fine today, fragile if memoization key drifts
`farmTotalCageCount` (4732) caches on `LAYOUT.redrawSeq`; `farmIsSmall` (4729) is called per plot/area/cage. The memo makes this O(1) after the first call per redraw, which is correct — flagged only because the cache key is a single shared counter; any code path that calls these *outside* a `layoutRedraw` (where `redrawSeq` isn't bumped) silently reuses a stale total.

Fix: none required now; document that these must only be called within a `layoutRedraw` pass, or key the memo on `commit.seq` instead.

---

## Summary ranking
1. **C1** — O(cages × events) redraw on every LOD-band cross mid-pan (jank at scale).
2. **C2** — un-debounced synchronous full-state `JSON.stringify` to a quota-limited store on every commit (freeze + silent data loss).
3. **C3** — single-slot localStorage write can strand the only durable copy (data loss).
4. **H1** — multi-`querySelectorAll` highlight sweeps per hover/redraw.
5. **H2** — `getBoundingClientRect` loop un-throttled inside drag-select moves.
6. **H3** — object-URL leak when photo viewer closes mid-load.
7. **H4** — five hung fetches per home visit while offline, no `navigator.onLine` gate.
8. **H5** — `elementFromPoint` hit-test per drag-move.
9. M1–M5 — station-list/cache crowding the durable quota; full-blob loads in sweep/compress.
10. L1–L4 — latent timer/teardown and abort-window nits.

The two findings that most directly threaten the brief's hard rule ("must never lose the farmer's data") are **C2 and C3** — fix the debounce + quota-warning + dual-slot write first; **C1** is the headline perf fix for the 3000-cage farm.
