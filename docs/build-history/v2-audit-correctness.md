# SpatMap v2 — Correctness & Reliability Audit

File: `/Users/philipinosis/Desktop/spatmap/spatmap-v2.html` (9252 lines, single inline script).
Scope: core data-flow logic, state-mutation integrity, undo, persistence/migration, numeric/date edges,
selection/DOM coupling, import/export. Read-only; reasoned from code. Ranked Critical → Low.

Verdict up front: the mutation core is unusually disciplined — clone-before-snapshot, descending-index
splices, seq-guarded undo, id-keyed live re-lookups. The real exposure is at the **boot/import boundary**
(one un-caught throw bricks the app) and in a handful of **undo inverses that silently corrupt** when the
selection or barge changed underneath them. Findings below.

---

## CRITICAL

### C1 — Boot is not crash-proof: a single throw inside `render()` (or first paint) leaves a blank app with no recovery
`init()` @ L9170–9178 runs `state = loadState(); … render();` with **no try/catch**. `loadState()` itself is
defensive (L1342–1358, wrapped), but `render()` and everything it calls (layout SVG build, overview,
growth model, photo widgets) is not. Any runtime error during the first `render()` — e.g. a malformed but
*shape-valid* farm that survives migration but trips a renderer assumption — throws to the top, the script
dies, and the user sees a permanently blank page on a `file://`/offline phone with no console access and no
way to clear storage from the UI.
- Trigger: any uncaught exception on first paint (bad migrated geometry, an undefined the renderer
  dereferences, an SVG builder edge). On a phone there is no recovery path.
- Fix: wrap the body of `init()` in `try { … } catch(e){ }` and, on catch, render a minimal "Something went
  wrong — Export / Reset data" fallback screen (offer `exportData()` of the raw `localStorage` blob plus a
  guarded "clear and reload"). Never let boot reach a bare-blank state.

### C2 — Import silently destroys all data when a backup is shape-valid but migration throws
`triggerImport` @ L7148–7179: after the user confirms, it writes the imported blob to `localStorage`
(L7161) and *then* calls `state = loadState()` (L7163). If migration throws on the new blob, `loadState`'s
catch returns `freshState()` (L1355–1357) — an **empty farm** — which is then committed/saved over the
just-overwritten key. The user's old data is already gone (overwritten at L7161) and the import produced
nothing. The shape gate at L7157 only checks `Array.isArray(data.farms)`; it does not validate that each
farm survives `migrateFarm`.
- Repro: import a JSON with `farms:[ null ]` or `farms:[{cageTypes:[null]}]` (L1375 `t.id` throws on the
  null element). Shape check passes → write → `loadState` throws internally → caught → `freshState()` →
  blank farm saved. Original data lost.
- Fix: validate by *dry-running* the parse through `migrateFarm` on a deep clone **before** touching
  `localStorage`; only commit if it produces ≥1 non-empty farm. Also snapshot the prior blob into a temp key
  so a failed import can be rolled back.

---

## HIGH

### H1 — `pullSelectedCages` / `fillFromBarge` undo can resurrect into the wrong cages after an intervening structural edit (id reuse is fine, but index-length truncation is not seq-safe within the same commit count)
`pullSelectedCages` undo @ L7665–7668 restores by `c.events.length = s.evLen` (truncate) and `c.batch =
s.batch`. The seq-guard (L1869) only blocks undo if `commit.seq` advanced. But operations that **don't**
bump `commit.seq` past the snapshot — e.g. a sheet-flushed `persist()`/`save()` edit (L1835, L7099,
L7102) that mutates `c.events` without `commit()` — are invisible to the guard. If a growth/note edit
appended an event via a path that called `persist()` (not `commit()`) between pull and undo, the
`events.length = s.evLen` truncation **deletes that later event** while the seq check still passes.
- Trigger: pull cages → open a cage detail that flushes an edit via `persist()` (no commit) → Undo the pull
  → the flushed event is truncated away with the pulled event.
- Fix: have undo filter by event *id/identity* (remove exactly the events this op appended) rather than
  truncating to a captured length; or make every event-appending edit go through `commit()` so the seq
  guard actually covers it.

### H2 — `workCages` undo restores `c.batch.sizeMm` onto whatever batch currently occupies the cage, even if it's a different batch
`workCages` snapshots `{ id, evLen, sizeMm:c.batch.sizeMm, workDue }` (L7779) and on undo does
`if (c.batch) c.batch.sizeMm = s.sizeMm;` (L7809). It re-looks-up the cage by id (good) but assumes the
cage still holds the **same** batch. Between the growth log and the Undo, the cage's batch can be replaced
(pull empties it, fill-from-barge gives it a *new* child batch) without advancing `commit.seq` past the
snapshot in some interleavings. Undo then writes the *old* batch's size onto the *new* batch, corrupting the
new batch's mirror.
- Trigger: Log growth on cage A (sets batch.sizeMm) → Pull A → Fill A from barge (new child batch) → Undo
  the growth-log toast (still within seq window if the toast is alive). `c.batch` is now the child; its
  `sizeMm` is overwritten with the dead batch's value.
- Fix: capture `batchId` in the snapshot and only restore `sizeMm` if `c.batch && c.batch.id === s.batchId`.

### H3 — `setLineCageCount` / `addCagesToLineEnd` undo blindly splices the END (or start) cages, which may now hold stock
`setLineCageCount` grow-undo @ L6976 does `l.cages.splice(Math.max(0, l.cages.length - added))` — it removes
the last `added` cages, assuming they're still the empty ones it added. `addCagesToLineEnd` undo @ L7030–7031
does the same (`splice(0, count)` for atStart, tail splice otherwise). If the user **fills** one of those
just-added cages before pressing Undo, the splice destroys a now-stocked cage and its batch silently. The
seq-guard blocks undo only if a `commit()` ran — but `fillFromBarge`/`fillNewSeed` both `commit()`, so in the
normal case the guard *does* fire here. The hole is the same `persist()`-without-`commit()` class as H1, plus
any future path that stocks a cage without bumping seq.
- Trigger: add 3 cages to line end → (via any non-commit edit path) put a batch on the new tail cage → the
  add-toast is still live and seq unchanged → Undo → stocked cage + batch spliced away, batch orphaned.
- Fix: in the undo, splice only cages that are still `!batch` AND were among the ones created (match by the
  captured cage object identity / id, not by position); abort + toast if any target is now stocked.

### H4 — `harvestFromBarge` stamps `harvested` events onto cages that are still stocked, creating a false "harvested but full" state
@ L7972–7983: for any live cage whose `c.batch.id` is in the pile's `origin.parentBatchIds`, it pushes a
`harvested` event but **does not** null `c.batch` or decrement its count. Those cages keep their full batch
and now show a "harvested" line in their timeline and last-event banner (L7834, `eventLabel`). The harvest
came out of the *barge pile*, not those cages, so this double-counts: the oysters are logged in
`harvestLog` AND still shown as present in the cage.
- Trigger: pull cages into the barge, fill *different* empty cages from a pile whose `parentBatchIds` still
  resolve to a live cage, then harvest from the barge. The resolvable cage gets a phantom "harvested" event
  while remaining stocked.
- Fix: drop the best-effort cage-event stamping entirely (the harvest is a barge-level event), or only stamp
  cages you are actually emptying. As written it asserts a physical state that isn't true.

### H5 — `loadState` coerces `state.v` to 1 and never runs versioned migrations; a genuinely newer/older schema is silently mangled
@ L1348 `d.v = 1;` unconditionally. There is no check of the *incoming* `d.v`. A backup exported by a future
version (different field semantics) is force-tagged v1 and run through the v1 migrators, which will drop or
reinterpret fields with no warning. Combined with C2, importing a future backup is a quiet data-loss path
rather than a clear "this backup is newer than this app" message.
- Fix: read `incomingV = d.v`; if `incomingV > 1` refuse with a clear message (or migrate forward); only then
  normalize. At minimum, log/keep the original version so import can warn.

---

## MEDIUM

### M1 — `save()` swallows quota-exceeded; the in-memory state and on-disk state silently diverge
`save()` @ L1831–1834 catches the quota error and toasts, but **returns normally**. `commit()` (L1844) then
proceeds to `render()` as if persisted. Every subsequent mutation also fails to persist (photos in IDB grow,
localStorage is full) yet the UI shows success and offers Undo for changes that will vanish on reload.
- Trigger: fill localStorage to quota (many farms/events) → any mutation → toast "storage may be full" but
  the op *appears* to succeed; reload loses everything since the last good save.
- Fix: have `save()` return a boolean; `commit()` should surface a persistent, blocking banner ("Changes are
  NOT being saved — free space / export now") rather than a transient toast, and ideally re-attempt or guide
  the user to export.

### M2 — `growthModel` two-point rate keeps `source:'observed'` even when both points share a date (rate falls back to prior)
@ L8506–8509: with exactly two points and `dd === 0` (same `stocked` date as a `growth` check, or two growth
checks logged the same day), `rate = DEFAULT_GROWTH_MM_DAY` but `source` stays `'observed'` and `noisy`
stays false. Confidence logic (L8564–8566) then treats it as a real observation and can rate it
`medium`/`high`, and `confidenceHint` won't flag it. The projection is presented as data-derived when it is
actually the prior.
- Trigger: stock a cage and log a growth check the same day (common on stocking day) → projection labeled as
  observed-confidence off a default rate.
- Fix: in the `dd <= 0` branch set `source='prior'; noisy=true;` (mirror the `!(rate>0)` branch at L8521).

### M3 — `daysBetween` floors negative spans, so a single same-day measurement plus a future-dated check yields a negative `dd` the OLS path can mishandle; and `monthsSince`/staleness can go negative
`daysBetween` @ L1288 `Math.floor((bMs-aMs)/86400000)` returns negatives for future dates. `growthModel`
guards `lastPt.ms < todayMs` and clamps `Math.max(0, …)` in the integrate calls (L8534, L8541), but
`freshEnough` at L8563 explicitly tolerates `daysSince >= 0`, meaning a **future** last-measured date
(device clock skew or typo'd growth date) yields `daysSince < 0`, `freshEnough=false`, and silently knocks
confidence down with the misleading "stale" path. Not corrupting, but the projection copy lies.
- Fix: clamp/normalize future event dates on entry (reject `> todayISO()` in the growth/date inputs) so the
  model never reasons over negative spans.

### M4 — `fillFromBarge` shortfall toast reports `snapBarge.count` but distributes 1-per-cage, which can disagree when the pile count is fractional/coerced
@ L7694–7702 the shortfall branch (`total < n`) gives the first `total` cages 1 each. The toast (L7750)
says `'Only ' + snapBarge.count + ' oysters — filled ' + made.length …`. `made.length === total` here, so
it's consistent for integer counts — but `barge.count` is only guaranteed integer if every contributing path
used `parseCount`. `pullSelectedCages` sums raw `b.count` values (L7623) which come from `parseCount` at fill
time, so this holds today. It is brittle: any future path that puts a non-integer `count` on a batch makes
`total` non-integer, `targets.slice(0, total)` truncates oddly, and `shares` get `1` while `distributed`
mismatches. Low likelihood, real if invariants drift.
- Fix: `total = Math.floor(total)` at the top of the count branch; assert integer pile counts.

### M5 — Import accepts `activeFarmId` pointing at a farm that doesn't exist only because `loadState` later repairs it — but `restoreImportedPhotos` runs against a possibly-empty farm
After import, if migration emptied the farms (C2 path) but `photos` were present, `restoreImportedPhotos`
(L9053) still writes all photo blobs into IDB. Those are now **orphans** (no farm/event references them);
the 3s sweep (L9177, `sweepPhotos`) or the post-restore `sweepPhotos()` (L9062) will delete them — so the
user's imported photos are written and then immediately garbage-collected, wasting work and possibly evicting
other data on a tight quota.
- Fix: only restore photos whose ids are referenced by the just-loaded state; or restore *after* confirming
  the farms loaded non-empty.

### M6 — `clearBarge` / barge-emptying paths reset `barge.events = []`, discarding the pile's pull/harvest history that the harvest sheet relies on, with no way back except a live undo
`fillFromBarge` (L7737–7744), `harvestFromBarge` (L7990), and `clearBarge` (L8012 via `freshBarge`) wipe
`barge.events`. This is intentional for a drained pile, but `harvestFromBarge` on a **counted** pile that
drains to ≤0 also nukes `barge.events` mid-undo-window; the undo restores `snapBarge` (good). The risk is the
*uncounted* partial-harvest branch (L7992 comment) which keeps the pile but the events array now has a fresh
`harvested` entry appended (L7987) with `batchId: barge.batchId || ''` — if `batchId` was null, the event
carries an **empty** batchId, which `migrateEvent` would later normalize to `''` and which breaks any
lineage walk keyed on batchId.
- Fix: ensure `barge.batchId` is always set when `state==='pile'` (it is created in `pullSelectedCages` at
  L7645) and skip pushing the barge-local harvested event when no batchId exists.

---

## LOW

### L1 — `cohortId` per fill action is correct, but `backfillSeedCohorts` re-keys by mutable signature, so two genuinely distinct legacy fills with identical date/size/hatchery/ploidy merge into one cohort
`backfillSeedCohorts` @ L1494–1497 groups by `stockedDate|origSize|hatchery|ploidy`. Two separate legacy
stocking events with identical attributes (same day, same hatchery, same seed size) collapse to one
`seedCohortId`. Cosmetic (cohort highlight groups them together) and only affects pre-field legacy saves, but
it is a silent merge of distinct provenance.
- Fix: include the cage's original `stocked` event id (or batch id) in the signature for legacy backfill, or
  accept the merge as intended and document it.

### L2 — `fmtCompact(null)` returns `'—'` but callers concatenate it into counts (e.g. `'~' + fmtCompact(barge.count)`)
`renderBarge` @ L2463 guards with `barge.count == null ? 'uncounted'`, so it's fine there, but
`harvestFromBarge` undo label (L7997) `'Harvest logged · ' + fmtCompact(take)` is safe since `take` is
validated. Low/none in current callers; flag as a latent footgun if `fmtCompact` is reused with a nullable.
- Fix: none required today; keep `fmtCompact` callers null-guarded.

### L3 — `isoDaysAhead` uses UTC date math while `todayISO()` uses **local** date — reminder dates can be off by one day near midnight / non-UTC zones
`todayISO()` @ L1285 uses local `getFullYear/getMonth/getDate`; `isoDaysAhead` @ L1907 and `isoDaysAhead`-
style helpers use `getUTC*`. A "1 week" reminder set at 11pm local in a negative-UTC-offset zone can land a
calendar day early/late relative to the "needs-work" comparison done via `daysSince`/`isoToMs` (which is
UTC, L1287). Off-by-one on reminder/neglect flags, not data loss.
- Fix: pick one basis (UTC throughout) for `todayISO`, `isoDaysAhead`, and `isoToMs` so date arithmetic is
  internally consistent.

### L4 — `growthModel` OLS denominator guard uses `denom !== 0` but never checks for near-zero, so colinear-in-time points can produce a wild slope
@ L8517–8518: `denom = n*sxx - sx*sx`. For tightly clustered dates `denom` is tiny-but-nonzero, so the guard
passes and `rate` can blow up (then clamped only on the low side at L8523 and the `!(rate>0)` side at L8521,
but a huge positive rate sails through). A spuriously large rate yields an absurdly soon "market-ready"
projection.
- Fix: treat `denom` below a small epsilon (or `spanDays` below a few days) as "not enough spread" → fall
  back to prior, like the 2-point `dd<=0` case.

### L5 — `removeCages` re-resolves the line by id on undo but re-inserts at `Math.min(r.index, line.cages.length)`, which can misorder if multiple removed cages came from the same line at non-contiguous indices
@ L7943–7946: undo sorts ascending by index and inserts at `min(r.index, len)`. For two cages removed from
one line at original indices 2 and 5, after removing both the line is shorter; inserting index-2 first
(len grows) then index-5 lands correctly *only because* the ascending order compensates. This is correct for
the common case but fragile if a third party mutated the line between remove and undo. `reindexLines` after
(L7947) fixes labels but not the relative slot if an unrelated insert happened.
- Fix: low priority; the seq-guard covers the realistic interleavings. Consider restoring by rebuilding the
  full cage array from a snapshot rather than positional splices for robustness.

---

## Notes on things that are CORRECT (so they aren't re-flagged by another pass)
- `pullSelectedCages` deep-clones the batch into the snapshot (L7604) — undo does not alias live state. Good.
- `fillNewSeed`/`fillFromBarge` undo remove the exact batch object from `farm.batches` by `indexOf` and strip
  events by `batchId` — no orphaned batches in the normal path. Good.
- Splice-on-remove uses descending index order (L7932) so earlier indices stay valid. Good.
- `loadState` is fully try/catch-wrapped and returns `freshState()` on any parse/migrate throw (L1342–1358) —
  the boot read itself won't crash (the crash exposure is in `render`, see C1).
- `migrateFarm` rescues batches off detached/legacy cages into the ledger (L1431, L1448–1453) so lineage refs
  survive migration. Good.
- `h()` skips `null`/`false` attributes (L1187), so `max:null` on the harvest input (L8051) is harmless.
- Seq-guarded undo (L1866–1872) correctly no-ops when a later `commit()` advanced `commit.seq`. The residual
  risk is edits that persist WITHOUT `commit()` (H1/H3) — those bypass the guard.
