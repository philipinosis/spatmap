# SpatMap v7 — Build Spec (implement from this, no guessing)

This is the implementation spec for a ground-up rebuild of SpatMap. One builder implements a single
`index.html` (vanilla JS, no build step, localStorage + IndexedDB photos, deploys to GitHub Pages).

**Authority order:** `_rebuild-PRODUCT-BRIEF.md` wins over this spec; this spec wins over the harvest
kit and all `_opus-*`/index-N references. When the brief and a "parts bin" snippet disagree, follow the
brief. Read `_rebuild-HARVEST-KIT.md` for copy-pasteable CSS/JS/art and `PHOTOS-IMPLEMENTATION-PLAN.md`
for the photo layer; this spec tells you what to keep, drop, and build, and pins the exact data shape
and behavior.

**The one rule: SIMPLE.** Fewer screens, one interaction model (drag-select → popup), one word per
concept. Where this spec adds detail, it is to remove ambiguity, not to add features. When in doubt, cut.

---

## 0. Vocabulary (use each word in exactly ONE place — no synonyms anywhere in UI)

| Concept | The ONE word | Never say |
|---|---|---|
| Put new seed into empty cages | **Fill** | stock, seed-in, add |
| Take oysters out of filled cages onto the barge | **Pull** | harvest-to-deck, pool, sort |
| Distribute the barge pile into empty cages | **Fill** (context-aware; same button) | place, distribute-from, restock |
| Record handling on a filled cage | **Work** | log, growth check, log work |
| Work sub-actions (past tense, the cage shows the last one) | **Tumbled / Washed / Desiccated / Flipped** | tumble/wash/… (no imperative) |
| Take oysters off the farm for sale | **Harvest** (only by tapping the barge) | sell, ship |
| Take an empty cage off a line | **Remove** | delete, detach, pull cage |
| The working pile of pulled oysters | **Barge** | on-deck batch, deck, pile |
| The oysters living in a cage | **Batch** (internal) / shown as size+count | lot, group |
| The named longline holding cages | **Line** | longline, row, rope |
| One container on a line | **Cage** (a.k.a. basket — interchangeable in copy only) | spot, slot, pod |
| Untended too long | **Needs work** | overdue, neglected, stale |

The brief lists "basket" and "cage" as interchangeable. Pick **Cage** as the code/UI noun; "basket" may
appear only in incidental copy (e.g. onboarding hint "cages (a.k.a. baskets)"). Never name a field `basket`.

---

## 1. DATA MODEL (exact)

### 1.1 localStorage

```
localStorage key:  'cageTrackerData'          // KEEP this key (not 'spatmapData') for back-compat with index-3..6 saves
root shape:        { v: 1, farms: Farm[], activeFarmId: string|null }
```

`v` stays `1`. Every new field is additive and guarded on load (see §1.9 migration), so no version bump.
Photos are **never** in this JSON — they live in IndexedDB (§1.8, §5). On load, `delete d.photos` defensively.

### 1.2 Farm

```js
Farm = {
  id:            string,        // uid()
  name:          string,        // e.g. "Brightside Oyster Co."
  createdAt:     epochMs,
  cageTypes:     CageType[],    // at least one; onboarding requires ≥1
  grades:        string[],      // custom vocab, e.g. ["Standard","Petite","Jumbo"]; may be empty
  lines:         Line[],        // ordered; flat list (NO areas/sections — see DROP)
  barge:         Barge,         // exactly one barge per farm (object, not array). See §1.6
  harvestLog:    HarvestEntry[],// append-only running log
  batches:       Batch[],       // PROVENANCE LEDGER: every batch ever created, by id. See §1.5 note
  settings: {
    marketSizeMm:     number,   // target size for projections; default 76
    neglectIntervalDays: number // longest acceptable gap between Works; default 56 (8 weeks)
  }
}
```

Notes:
- **`barge` is a single object, not `batches[]` filtered by `placed`.** index-6 modeled the barge as
  `farm.batches.filter(b=>!b.placed)`. v7 simplifies: one explicit `farm.barge` object that is empty or
  holds one pooled pile (§1.6). `farm.batches[]` becomes a flat provenance ledger keyed by id so any
  cage/event/lineage reference resolves to the originating batch even after the cage is emptied.
- `settings` is a nested object (the brief's "market size" + "neglect alert interval"). index-6 stored
  `marketSizeMm` flat on the farm; v7 nests both under `settings`. Migration backfills from the flat field.

### 1.3 CageType (KEEP — brief §A, dogfood note 17)

```js
CageType = {
  id:     string,
  name:   string,                            // free text, e.g. "FlipFarm", "OyGro", "Vexar 9mm"
  shape:  'square' | 'rect' | 'circle',      // drives the glyph (see §5.2 / shapeSVG)
  meshMm: number | null                      // mesh aperture in mm; null = not recorded. REAL DATA — do NOT stuff into name
}
```

- `shape → glyph`: `circle` → OyGrow glyph, `rect` → FlipFarm glyph, `square`/anything else → Vexar bag.
- Onboarding/Layout edits a cage type as **three fields in one row**: name (text) · shape (3-way
  picker) · mesh mm (number, optional). Surface mesh in the empty-cage popup and the cage detail header
  ("Flip · 9 mm mesh"). Never concatenate mesh into `name`.

### 1.4 Line (FLATTENED — brief "Drop Areas→Plots→Lines")

```js
Line = {
  id:      string,
  name:    string,        // e.g. "Line 1", "North 3" — user-facing, editable; KEEPS its place even when emptied
  order:   number,        // explicit sort index for the flat list (0,1,2,…); reorder = renumber
  cages:   Cage[]         // ordered left→right; a line with zero cages is allowed and still renders (anchor + name)
}
```

- **No `section`, no `vert`, no `area`.** One flat ordered list of lines per farm. Optional grouping is
  out of scope; do not add it.
- **INVARIANT (carry from index-6 line 1544):** emptying or Removing within a line never reorders other
  lines. A line keeps its `order`/place forever once created. Only an explicit "delete line" (Layout
  editor) removes a line and renumbers.
- A line that has all cages Removed still exists as an empty named line with its piling anchors — it
  keeps its place. (Brief: "the line keeps its place; just one fewer cage on it.")

### 1.5 Cage

```js
Cage = {
  id:           string,
  typeId:       string,            // → CageType.id
  label:        string,            // short display id, e.g. "1-3" (line order . cage position); regenerated on layout change
  batch:        Batch | null,      // null = EMPTY; non-null = FILLED (this is the state bit)
  events:       Event[],           // permanent per-cage history timeline (survives emptying). See §1.7
  currentGrade: string | null,     // optional grade tag (from farm.grades); null if none
  workDue:      ISODateString|null // optional next-work date; drives needs-work. null = use neglect interval rule
  // NO `detached` field. NO "spot exists but no cage" state. Remove = splice the cage out of line.cages.
}
```

- **State is derived from `batch`:** `batch === null` → **empty**; `batch !== null` → **filled**. There
  is no separate status enum stored; `cageStatus()` computes display color/flags (§2.6).
- `label` is cosmetic. Recompute as `"{line.order+1}-{cageIndex+1}"` whenever layout changes; never key
  anything off it.

### 1.6 Batch (the oysters in a cage) — carries lineage

```js
Batch = {
  id:          string,             // uid() — the LINEAGE id; survives cage→barge→cage
  count:       number | null,      // headcount; null = uncounted
  sizeMm:      number | null,      // last known size; convenience mirror of latest growth/stocked event sizeMm
  ploidy:      'diploid' | 'triploid' | null,
  hatchery:    string,             // where seed came from (free text); '' allowed
  grade:       string | null,      // grade tag at creation (optional)
  notes:       string,             // small free text; '' allowed
  stockedDate: ISODateString,      // when this batch first entered a cage (date of the `stocked` event)
  photoIds:    string[],           // seed/delivery photos (IDB ids). Present even if empty []
  events:      Event[],            // OPTIONAL convenience mirror; canonical timeline lives on the Cage.events. See note.
  origin:      Provenance | null   // null for fresh seed; set when this batch was created from a barge distribution
}

Provenance = {
  parentBatchIds: string[],        // batch ids this oyster came from (≥1; >1 if barge pooled multiple)
  cageLabels:     string[],        // human labels of source cages, e.g. ["1-2","1-3"] (for display)
  lineNames:      string[],        // human names of source lines (for display)
  pulledDate:     ISODateString    // when the source was pulled to the barge
}
```

**History model — single source of truth.** The canonical, permanent timeline is **`Cage.events[]`**.
Every handling action appends an Event to the cage. When a cage is emptied (Pull/Harvest), we push a
summary Event then set `cage.batch = null` — the events stay on the cage forever, so the cage's own
history survives. To show a *batch's* full life across cages (reception → grown in cage A → pulled →
barge → re-filled into cage B → harvested), walk **all cages' events filtered by `batchId`** plus follow
`origin.parentBatchIds` up the chain (§3.10). `Batch.events[]` is an optional convenience mirror; if you
keep it, it must never be the only place an event lives. **Recommendation: do not store `Batch.events`;
derive batch history by scanning cage events by `batchId` and the provenance chain. One source of truth.**

`farm.batches[]` holds every Batch object ever created (fresh seed + every barge-distribution child),
keyed by `id`, so `origin.parentBatchIds` and `event.batchId` always resolve even after cages are emptied.
Add a batch to `farm.batches` the moment it is created (fill-new-seed and fill-from-barge both create
batches).

### 1.7 Event (the timeline unit) — attaches to a Cage, tagged by batchId

```js
Event = {
  id:       string,
  type:     'stocked' | 'worked' | 'growth' | 'pulled' | 'filled' | 'harvested' | 'note',
  date:     ISODateString,         // prefilled to today; user-editable
  batchId:  string,                // which batch this event concerns (links the timeline across cages)
  method:   'tumbled'|'washed'|'desiccated'|'flipped' | null,  // ONLY for type 'worked'
  sizeMm:   number | null,         // for 'growth' (a measurement) and 'stocked' (initial size). null otherwise
  count:    number | null,         // for 'harvested' (qty taken), 'pulled'/'filled' (qty moved), 'stocked' (initial). null otherwise
  note:     string | null,         // optional free text on any event
  photoIds: string[]               // IDB ids; present even if empty []. Carried onto summary events when emptying
}
```

**Event type semantics (exact):**

| type | When appended | Required fields | Resets neglect timer? |
|---|---|---|---|
| `stocked` | Fill empty cage with new seed | `sizeMm` (initial), `count`(initial, may be null), `batchId` | yes (counts as work) |
| `worked` | Work menu action on a filled cage | `method` (one of 4) | **yes** |
| `growth` | A size measurement logged (Work menu "Logged growth …" or growth check) | `sizeMm` | yes |
| `filled` | Empty cage filled from the barge pile | `count` (qty placed), `batchId` (the new child batch) | yes |
| `pulled` | Filled cage emptied onto the barge | `count` (qty removed, may be null), `batchId` | n/a (cage now empty) |
| `harvested` | Oysters taken off the barge (harvest) — recorded against each source cage's history where resolvable | `count` | n/a |
| `note` | Plain note, no handling | `note` | **no** (a bare note must not reset the timer — index-6 line 466) |

- The cage's **"last thing that happened"** label = the most recent event by date, rendered in past
  tense: `worked`→ the method ("Tumbled"), `growth`→ "Grown to 52 mm", `stocked`→ "Filled", `filled`→
  "Filled from barge", `pulled`→ "Pulled", `harvested`→ "Harvested", `note`→ "Note".
- Neglect timer resets on `stocked|worked|growth|filled` (any real handling), **not** on `note`.

### 1.8 Barge (the working pile) — one per farm

```js
Barge = {
  state:        'empty' | 'pile',   // 'placed' is transient and not stored — see note
  batchId:      string | null,      // the pooled batch id on the barge (a Batch in farm.batches); null when empty
  count:        number | null,      // oysters currently on the barge (sum of pulls minus distributions/harvests); null if any source uncounted
  sizeMm:       number | null,      // last known size of the pile (max of source sizes)
  grade:        string | null,      // grade carried (if uniform across sources; else null)
  origin:       Provenance | null,  // lineage of what is piled (source cages/lines/date)
  events:       Event[]             // barge-local history: 'pulled' adds, 'filled'/'harvested' subtract. For the "history on the barge" view
}
```

- The brief lists barge states "empty / has-pile / placed". v7 stores only **`empty`** and **`pile`**.
  "Placed" is what *happens* (a Fill-from-barge that drains the pile flips the barge back to `empty`); it
  is not a stored resting state. After a full distribution, `state='empty'`, everything else null/[].
- Adding a Pull to a non-empty barge **pools** into the existing pile: counts add (null-aware), size =
  max, grade collapses to null if it differs, `origin.parentBatchIds`/`cageLabels`/`lineNames` union,
  and a new pooled batch id is used (or keep the first and append parents — pick one and be consistent;
  recommendation: keep one `batchId` for the pile and grow its `origin.parentBatchIds`).
- **Count integrity:** if every source cage being pulled has a numeric `count`, the barge `count` is the
  exact sum. If any source is uncounted (`count===null`), the barge `count` becomes `null` and the pill
  shows "uncounted" (do not guess). Fill-from-barge with a null count distributes "an even share" with no
  number (§3.6).

### 1.9 Settings

Stored as `farm.settings` (§1.2): `marketSizeMm` (default 76), `neglectIntervalDays` (default 56).
Editable in the Settings menu and in onboarding. `neglectIntervalDays` replaces index-6's hard-coded
8-week constant in `needsWork()` (§2.6).

### 1.10 HarvestEntry

```js
HarvestEntry = {
  id:         string,
  date:       ISODateString,
  count:      number,                 // how many harvested this event (required, > 0)
  grade:      string | null,          // grade if known (from the barge pile)
  sizeMm:     number | null,          // last known pile size at harvest
  origin:     Provenance | null,      // lineage: which cages/lines these came from (pulled automatically from the barge)
  note:       string | null
}
```

Append to `farm.harvestLog`. This is the **only** harvest ledger. No `discardLog`, no `seedLog`, no dual
harvest write-paths (DROP §below).

### 1.11 IndexedDB photo store (separate from localStorage)

```
IndexedDB database 'spatmapPhotos' (v1), object store 'photos' (keyPath 'id'):
  PhotoRecord = { id: string (uid()), blob: Blob (image/jpeg), w: number, h: number, createdAt: epochMs }
```

Photos referenced by id from `Batch.photoIds` and `Event.photoIds`. Never base64 in localStorage. Full
photo layer in §5 (follow `PHOTOS-IMPLEMENTATION-PLAN.md`).

### 1.12 Migration / back-compat (`loadState`)

Emulate index-6's defensive additive loader (`_rebuild-HARVEST-KIT.md` §7). One function, never throws,
backfills every field. Rules:

1. Parse; if not an object or `farms` not an array → `freshState()` (`{v:1,farms:[],activeFarmId:null}`).
2. `d.v = 1`. **`delete d.photos`** (never let a photo-inlined backup reach localStorage).
3. Per farm — backfill in the established "if missing/invalid → default" style, **one comment per line
   stating the field**:
   - `settings`: if absent, create `{}`; `marketSizeMm` from `f.marketSizeMm` (legacy flat) else 76 if
     not `>0`; `neglectIntervalDays` 56 if not `>0`.
   - `cageTypes`: array; each type `meshMm` → `null` unless `typeof===number && >0`; `shape` →
     `'square'` if not one of the three.
   - `grades`: array of strings (filter non-strings).
   - `barge`: if absent or malformed → `{state:'empty',batchId:null,count:null,sizeMm:null,grade:null,origin:null,events:[]}`.
     **Migration from index-6:** if a legacy `f.batches` had an unplaced batch (`!b.placed`), fold the
     first one into `barge` as a `pile` (best-effort); placed ones go to the ledger.
   - `batches`: array (the provenance ledger). For each, `photoIds`→`[]` if not array (filter non-strings).
   - `harvestLog`: array.
   - Lines (flatten legacy hierarchy if present): if `f.areas` exists, walk `areas[].sections[]` (or
     `areas[].lines`) and **flatten** every line into `f.lines`, assigning sequential `order`. Drop
     `section`/`vert`. If `f.lines` already flat, keep. Each line: `cages` array; assign `order` if missing.
   - Per cage: `events`→`[]` if not array; `batch`→`null` if undefined; `currentGrade`→`null` if
     undefined; `workDue`→`null` if not a valid ISO date; **drop `detached`** (treat detached spots as
     "no cage" → simply omit them from `cages`); `typeId` → first cageType id if it points nowhere.
   - Per event: `type` must be one of the 7; map legacy types — `'mortality'`→`'note'` (record loss in
     `note`), `'sort'`→`'pulled'` or `'note'` (best-effort), keep `'growth'|'harvest'(→'harvested')|'note'`.
     `photoIds`→`[]` if not array (filter non-strings). Add `batchId` from `cage.batch.id` if missing.
   - Per batch on cage: legacy `Batch{stockDate,source,initialSizeMm,prep}` maps to v7
     `{stockedDate:stockDate, hatchery:source, sizeMm:initialSizeMm||latest, …}`; `photoIds`→`[]`.
4. Fix `activeFarmId` if dangling → first farm id or null.
5. `save()` = `try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ toast('Could not save — storage may be full'); }`.

`freshState()` returns `{v:1,farms:[],activeFarmId:null}` so a brand-new user lands in onboarding.

---

## 2. STATE MACHINE

### 2.1 Cage state

Two states, derived from `cage.batch`:

```
EMPTY  (batch === null)
FILLED (batch !== null)
```

### 2.2 Cage transitions

| Action | Precondition | Effect on cage | Effect on barge | Events appended |
|---|---|---|---|---|
| **Fill (new seed)** | EMPTY, barge `empty`, popup "Fill" | batch = new Batch (count/size/ploidy/hatchery/notes/photos); state→FILLED | none | `stocked` (sizeMm=initial, count=initial) on each filled cage |
| **Fill (from barge)** | EMPTY, barge `pile`, popup "Fill" | batch = new **child** Batch (origin = barge provenance, count = even share); state→FILLED | pile count decremented by total placed; if pile fully drained → barge `empty` | `filled` (count=share) on each filled cage |
| **Pull** | FILLED, popup "Pull" | summary; batch→null; state→EMPTY | pooled into barge (count/size/grade/origin updated); barge → `pile` | `pulled` (count) on each pulled cage; barge gets a pull record |
| **Work** | FILLED, popup "Work" → method or growth | unchanged state; updates `sizeMm` mirror if growth; resets neglect timer | none | `worked` (method) or `growth` (sizeMm) or `note` |
| **Remove** | EMPTY, popup "Remove" | cage spliced out of `line.cages`; line stays | none | none (cage object gone; its events go with it — only empty cages can be Removed, so no live batch history is lost) |
| **Harvest** | (not a cage action) tap barge | n/a | pile count decremented; if 0 → barge `empty` | `harvested` recorded against resolvable source cages; HarvestEntry appended |

Notes:
- Remove only ever applies to an **empty** cage (popup matrix §2.5). Removing therefore never discards a
  live batch's timeline. (A filled cage must be Pulled or Harvested first.)
- Fill-from-barge and Pull both go through lineage-preserving helpers (§3.5/§3.6) modeled on index-6's
  `pullSelectedCages` / `quickFillFromBarge` — keep the even-split + provenance-note logic, simplified to
  the new single-`barge` object.

### 2.3 Barge state

```
empty  (state==='empty', batchId=null, count=null)
pile   (state==='pile',  batchId set, count = number|null)
```

Transitions:
- `empty → pile`: a **Pull** of ≥1 filled cage.
- `pile → pile`: another **Pull** (pools in), or a partial **Harvest** (count drops but >0), or a
  partial **Fill-from-barge** that doesn't drain it (count drops but >0).
- `pile → empty`: a **Harvest** taking the remaining count to 0, OR a **Fill-from-barge** that
  distributes the whole pile (the brief's "placed" outcome).

"Placed" is not stored; it is the act that returns the barge to `empty`.

### 2.4 Selection model

- **Tap a cage** → toggles it into the selection (selected cage shows `.selpick` outline). Tapping a
  selected cage deselects it.
- **Drag a finger across a run** → range-selects every eligible cage the finger sweeps (the keeper
  `denseRangeSelect`, harvest kit §4). Mechanics to keep:
  - `pointerdown` on a cage starts the range from its `data-pos`.
  - Paint direction: if the start cell is eligible, toggle off its state; if ineligible, default to
    select — so a drag begun on a filled cage still fills the empty cells it sweeps.
  - `pointermove` reads the cell under the finger via `document.elementFromPoint`, repaints the range; a
    translucent `.denseBand` tracks it.
  - `pointerup`: if a real drag happened, install a one-shot capture-phase click suppressor (400 ms
    fallback) so the synthetic click can't open a sheet.
  - `touch-action: pan-y` on cells lets vertical page scroll coexist with horizontal drag-select.
- **Selection is per-render transient state** (`var selCages = {}` keyed by cage id), not persisted.
  Cleared after any action commits, after Remove, and when a sheet/menu opens.
- **`pickMode` collapses to ONE mode (`sel`).** Drop index-6's `sort` and `place` branches entirely.
  Eligible = `function(c){ return !!c; }` (drop the `detached` guard — there is no detached state).

### 2.5 The contextual popup — action matrix (EXACT, from brief)

The floating popup appears above the selection (`syncPullPopup` positioning, harvest kit §4: min-top of
selected cells, average center-x, parked `popH+14px` above the highest pick, clamped to viewport, caret
points down). It updates **out of band** (`mount.innerHTML=''` then re-append) — no full re-render —
so dragging stays smooth. Compute the action purely from selection + barge state:

```
sel      = selected cages
allFilled = sel.length>0 && every sel cage has batch
allEmpty  = sel.length>0 && every sel cage batch===null
bargeHasPile = farm.barge.state === 'pile'
```

| Selection state | Buttons shown (in order) | Fill behavior |
|---|---|---|
| **all FILLED** | **Pull**, **Work** | — |
| **all EMPTY**, barge has pile | **Fill**, **Remove** | Fill = distribute the barge pile evenly into the selected empty cages (§3.6) |
| **all EMPTY**, barge empty | **Fill**, **Remove** | Fill = open the new-seed form for the selected cages (§3.4) |
| **mixed** (some filled, some empty) | **none** (hide popup, show a one-line hint "Select all-filled or all-empty cages") | — |
| **single EMPTY** cage | (same as all-empty rule) **Fill**, **Remove** | as above |

Rules:
- **Keep it tiny:** 1–2 primary buttons. Never show Pull+Work+Harvest together (index-6's mistake).
  **Harvest is NOT in this popup** — harvest is only the barge tap (§3.8).
- **Work** is enabled only for all-FILLED selections; if multiple filled cages are selected, Work applies
  to all of them (bulk Work — one method/growth entry written to each). Single filled cage → same form.
- **Pull** applies to all selected filled cages at once.
- **Remove** applies to all selected empty cages at once (each spliced from its line).
- The "Fill" button label is always the word **Fill**; what it does is context-aware (new-seed form vs
  distribute). Do not relabel it "Distribute" — one word per concept.

### 2.6 Status → color + needs-work (keep index-6 logic, parameterize the interval)

```js
// cageStatus(cage, farm) — display only; state bit is cage.batch
//   empty:  batch === null
//   filled: age-banded color by months since stockedDate: <6 fresh, 6–12 mid, >12 old
//   ready:  latestSize(cage) >= farm.settings.marketSizeMm  → teal ring
//   needsWork: see below
// STATUS_COLORS: empty #2E5A6B · fresh #4DB87A · mid #C8852A · old #D9632E
// RING (market-ready) #2BBFA4 · NEEDS_WORK #C0392B

// needsWork(cage, farm):
//   if filled and cage.workDue is a valid ISO date → todayISO() > cage.workDue   (rings when past due; future due = no early ring)
//   else if filled → rings when the last RESETTING event (stocked|worked|growth|filled, NOT a bare note)
//        is older than farm.settings.neglectIntervalDays
//   empty cages never need work
```

On the dense cell view, ready shows as an inset teal top edge (`.cellfill.rdy`), needs-work as an inset
red bottom edge (`.cellfill.work`). On larger cage views, needs-work uses the sonar-ping ring.

---

## 3. SCREENS / FLOWS (phone-first, step by step)

Global UI shell: a single `#app` re-rendered from state on every `commit()`; a bottom-sheet system
(`openSheet/refreshSheet/closeSheet`) for forms; a fixed barge on the side; a `#toast` with optional
inline Undo; a `#photoViewer` singleton. Phone target ≈390×844; iPad scales up. 16px base font (no iOS
zoom), 48px tap-target floor.

### 3.1 Onboarding — Design the farm (also the "Farm Layout" menu tab)

Triggered when `state.farms` is empty (fresh user). A single scrollable sheet/page, top to bottom, no
multi-step wizard, no "what kind of farm" method picker (DROP). Fields:

1. **Farm name** (text).
2. **Lines** — "How many lines?" number (default 1 — the common case; do NOT default high — dogfood
   note 9). Below: "Cages per line" number (default e.g. 10). Helper copy: "You can add or change these
   later." Generates N lines × M cages of the first/default cage type.
3. **Cage types** — list editor; each row = name (text) · shape (3 glyph toggles showing the actual
   glyph preview) · mesh mm (number, optional). "+ Add type". At least one required. Default seed: one
   type named "Cage", shape `square`, mesh null — but let them rename/pick immediately.
4. **Grades** — chip editor (add/remove custom grade words). May be empty.
5. **Market size (mm)** — number, default 76. Helper: "The size you sell at — used to project harvest dates."
6. **Needs-work alert** — "Alert if a cage goes unworked for ___ days" number, default 56. Helper:
   "We'll flag a cage that hasn't been worked in this long."
7. Primary button **Create farm** → builds the Farm, sets `activeFarmId`, closes onboarding → Main map.

**Empty by default.** Offer a secondary text button **"Load Brightside demo"** (small, below Create) that
seeds the real Brightside farm fixture for testing (the brief explicitly asks for this option). The demo
is a dev/test convenience; it must not become persistent menu clutter beyond this one entry point.

When reached later as **Farm Layout** (menu), the same form is in edit mode against the active farm:
rename farm, add/remove lines (Remove line = explicit, renumbers; Add line defaults to ONE line, bulk
demoted), edit cage types (add/edit/remove — removing a type in use is blocked with a toast), edit grades,
edit market size + alert interval. Changing a cage's type is done here or on the cage detail, not on a
per-tap dropdown that buries actions (dogfood note 1).

### 3.2 Main farm map

The home screen. Phone-first, light/sun-readable, flat. Layout:

- **Top bar:** farm name (tap → farm switcher only if >1 farm; single-farm hides the switcher),
  small menu button (☰) opening the Menu (§3.9).
- **Stat strip (compact):** total oysters (sum of counted batches), # market-ready cages, # needs-work
  cages. Tappable stats are fine but must not swallow cage taps.
- **Lines list (scrollable):** each Line is a row:
  - Line name (left, editable via long-press or a tiny ⋯; keep it light).
  - **Piling anchors** at each end (`pilingSVG`, mirror the right one with `scale(-1,1)`).
  - **Cage glyphs along the line**, rendered as the dense strip (`shapeSVG` per cage, colored by
    `cageStatus`), with the braided rope drawn under the row (CSS repeating-linear-gradient, harvest kit
    §5). This is the keeper "cages along a line" look (build log: KEEP direction).
  - Each cell shows ready (teal top edge) / needs-work (red bottom edge) states.
  - A line with zero cages shows just its name + anchors (it kept its place).
- **The barge** docked on the side (right edge on iPad; on a 390px phone, dock a slimmer ~88px pile in a
  bottom corner and only pop it larger when it holds oysters — harvest kit §1 phone note). Shows the
  growing pile (§3.7) + a count pill + a one-line origin caption. **Tapping the barge → Harvest sheet**
  (§3.8).
- **Needs-work indicator:** cages past their interval ring (sonar-ping) / show the red bottom edge; the
  stat strip count makes it glanceable.
- Interaction: tap/drag selects cages → the popup appears (§2.5). No bottom selbar, no hover-peek layer
  (DROP). One model only.

### 3.3 (reserved)

### 3.4 Fill — new seed (barge empty)

Select empty cages → popup **Fill** → bottom sheet form, fields **in this exact order**:

1. **How many** (count) — number, optional-but-encouraged; null allowed (uncounted).
2. **Size (mm)** — number (initial measured size). Required for a useful projection; allow blank.
3. **Ploidy** — two chips: Diploid / Triploid (or none).
4. **Hatchery** — text (where the seed came from).
5. **Notes** — small free text.
6. **Photos** — `photoField` (Add photo → camera/library), thumbnails visible inline (§5).
7. Date (prefilled today, editable) — small, near the confirm.
8. **Confirm** → for each selected cage: create a Batch (new lineage id, `origin:null`, `stockedDate`=date,
   `photoIds` = the captured ids `.slice()`), set `cage.batch`, append a `stocked` event (sizeMm=initial,
   count=initial, the same photoIds), push the batch into `farm.batches`. Multi-cage fill: **same batch
   details on every selected cage**, but **each cage gets its own Batch object with its own lineage id**
   (so they can diverge later) sharing the same photoIds references. Commit → toast "Filled N cages" with
   Undo (§3.11). Selection clears.

### 3.5 Pull → barge pile grows

Select filled cages → popup **Pull** → no form needed (immediate, with Undo), or a tiny confirm sheet if
you prefer. On Pull:

- Pool selected cages into the barge (modeled on `pullSelectedCages`): sum counts if **every** source is
  counted, else barge count → null; size = max latest size; grade = common grade or null; build/extend
  `barge.origin` (union of cageLabels, lineNames; pulledDate=today); barge `state→'pile'`; keep/extend the
  pile `batchId` and its `origin.parentBatchIds`.
- For each source cage: append a `pulled` event (count = that cage's count), then set `cage.batch = null`
  (state→EMPTY). The cage's events remain.
- Barge gets a pull record in `barge.events`.
- Commit → the pile visibly heaps (§3.7, CSS transition). Toast "Pulled N cages to the barge" + Undo.
  Selection clears.

### 3.6 Fill from barge — distribute evenly (lose no oysters)

Select empty cages → popup **Fill** (barge has pile) → distribute (modeled on `quickFillFromBarge`):

- Let `n` = # selected empty cages, `total` = barge count.
- **If `total` is a number:** `base = Math.floor(total/n)`, `rem = total - base*n`. Give `base` to every
  cage, then `+1` to the first `rem` cages (spread the remainder; **lose no oysters** — the sum of shares
  exactly equals `total`). If `base===0` (more cages than oysters), only the first `total` cages get 1
  each and the rest get 0 (still empty? — no: a 0-count fill is meaningless; instead cap selection: fill
  only as many cages as there are oysters, or give the remainder cages a null/"share" — **decision:**
  when `total < n`, fill the first `total` cages with 1 each and leave the others empty, toast "Only N
  oysters — filled N cages"). Keep it simple and never drop a count.
- **If `total` is null** (uncounted pile): give each selected cage a child batch with `count = null`
  ("an even share"), no number shown.
- For each filled cage: create a **child Batch** (`origin` = barge provenance: parentBatchIds=[barge
  batchId], cageLabels/lineNames from `barge.origin`, pulledDate; `sizeMm` = barge size; `stockedDate` =
  today; `grade` = barge grade; `photoIds` = []), set `cage.batch`, append a `filled` event (count=share,
  batchId=child id), push child batch to `farm.batches`.
- Decrement barge count by the distributed total. If the pile is fully distributed → barge `state→'empty'`
  (and null out batchId/count/size/grade/origin, clear events). Otherwise barge stays `pile` with the
  remaining count.
- Commit → toast "Filled N cages from the barge" + Undo. Selection clears.

### 3.7 The growing barge pile (BUILD this — index-6 only swapped two static SVGs)

Use the LOADED barge art verbatim except the pile group. **Wrap the oyster-pile shells in
`<g id="oysterPile">`** and drive it off `barge.count`:

```js
function pileLevel(count){
  if (!count || count <= 0) return 0;
  return Math.min(1, Math.log10(count + 1) / Math.log10(20000)); // 20k ≈ full heap; log-scaled
}
// Reveal the three depth bands (back/mid/front rows already exist in the art) by level, and scale the
// whole group up from the DECK line so it grows UP, not from center (deck top y≈64, pile centered cx=60):
//   lvl>0     → base mound + front row        ("a scoop")
//   lvl>0.45  → + mid row                     ("a load")
//   lvl>0.75  → + back row (+ optional second stacked mound)  ("a mountain")
//   pile.setAttribute('transform','translate(60 64) scale(' + (0.55 + 0.6*lvl) + ') translate(-60 -64)');
```

- CSS `#oysterPile { transition: transform .4s; }` so a Pull visibly heaps the barge.
- Keep the existing `@keyframes barge-bob` + `.bargeSvg` bob. Reuse the barge CSS (harvest kit §1) but
  apply the phone-dock note (smaller on 390px).
- **Barge empty state:** show the empty-barge art (`_barge-empty.svg` / `barge-empty-tmpl`) or
  `oysterPile` at level 0 (hidden). Count pill shows "empty". The whole `bargeWrap` is still tappable but
  the Harvest sheet shows "Barge is empty" when there is nothing to harvest.
- Count pill: `'~' + fmtCompact(count)` when counted, "uncounted" when pile count is null, "empty" when
  empty. Origin caption: a short "from Line 1 · 1-2, 1-3" summary from `barge.origin`.

**PALETTE DISCREPANCY (flag for builder):** the harvest kit §1 quotes the pile/hull colors as hull
`#2d5a42`, deck `#3a6040`, oyster base `#6a8060`. The actual `_barge-design.svg` on disk uses hull
`#3a6e5a` / shadow `#2a4e3e`, deck `#4a7a5a`, oyster base `#8a9a7a` with front-row highlights up to
`#c4d8b0`. **Use the real `_barge-design.svg` file as the source of truth for the art** (paste its body,
wrap the pile group). The pile-group element coordinates the kit cites (cx≈60, cy≈53–62, deck y≈64) match
the real file, so the growing-pile recipe applies unchanged; only the quoted hex values in the kit are stale.

### 3.8 Harvest — tap the barge

Tapping `bargeWrap` (or the `#oysterPile`) opens the **Harvest sheet**:

- Header: pile summary — count, last size, grade, and the **history of the oysters on the barge** (read
  the `barge.events` + `barge.origin`: "Pulled from Line 1 (1-2, 1-3) on Jun 14 · ~3,000 · 52 mm").
- Field: **How many harvested** (count) — number, required, > 0, default = full pile count (so "harvest
  all" is one tap). Cap at the pile count.
- Optional note.
- **Harvest** button → append a `HarvestEntry` (date, count, grade, sizeMm, origin) to `farm.harvestLog`;
  record a `harvested` event against each resolvable source cage's history (best-effort via
  `origin.parentBatchIds` → the cages currently/last holding those batches); decrement barge count; if 0
  → barge `empty`; commit. Toast "Harvested N · logged" + Undo. The pile shrinks/clears visually.
- If barge is empty: the sheet shows "Nothing on the barge yet — Pull some cages first" and no count field.

### 3.9 Work — a filled cage

Cage popup (all-filled) **Work** → Work sheet:

- **Last action** banner: "Last: Tumbled · Jun 10" (the cage's most recent event in past tense).
- **History** of the oysters in that cage: the event timeline (with photos — §5), newest first.
- **Two kinds of Work, both reset the neglect timer:**
  1. **Method chips** (past tense): **Tumbled · Washed · Desiccated · Flipped**. Tap one → append a
     `worked` event with that `method`, date prefilled. (Optionally allow attaching a size measurement
     and photos in the same submit.)
  2. **Log growth**: a size (mm) field → append a `growth` event with `sizeMm` (updates the batch
     `sizeMm` mirror + the projection). This is the brief's "log growth on work/growth checks." Use ONE
     label — "Log growth" — never "Growth check" elsewhere.
- Optional **photos** field on the Work submit (§5) and optional **note**.
- **Optional "work again" reminder** (dogfood note 21 — Philip's explicit ask): chips 1w / 2w / 4w / 8w /
  pick-date that set `cage.workDue`. The needs-work ring then fires on that date; clearing happens on any
  new work. Keep this small and optional.
- Bulk Work: if multiple filled cages were selected, the same method/growth/photos write one event to
  **each** selected cage (one capture, N references for photos). Toast "Worked N cages" + the timer resets
  on all.

### 3.10 Remove — empty cage leaves the line

Cage popup (empty) **Remove** → splice the cage out of `line.cages` (the cage object and its events go
with it; only empty cages can be Removed so no live batch history is lost). The **line stays** with its
place and name; it simply has one fewer cage (or zero, still rendered with anchors). Recompute labels.
Commit → toast "Removed cage — the line keeps its place" + Undo (re-insert at the same index on undo).
Bulk Remove handles all selected empty cages.

### 3.11 Menu (☰) sections

A simple list menu (sheet or slide-over):

1. **Farm Layout** — the onboarding form in edit mode (§3.1): lines, cages/line, cage types (name/shape/
   mesh), grades, market size, neglect interval, add/remove lines, rename farm.
2. **Harvest Log** — reverse-chron list of `HarvestEntry`: date · count · grade · origin (cages/lines).
   Read-only running log (brief §D).
3. **Grades** — manage the grade vocabulary (add/remove). (May also live inside Farm Layout; expose here
   for discoverability — but keep it one editor, not two competing ones.)
4. **Settings** — market size (mm), neglect interval (days). (Same fields as Layout; if you keep both,
   they edit the same `farm.settings` — no drift.)
5. **Data** — Export (JSON, no photos, default) · **Export + photos** (inlines base64, large file,
   distinct filename) · Import (confirm-with-scary-message, restores photos if present). §5.6.
6. (If >1 farm) farm switcher + "New farm". De-emphasized; single-farm users never see it.

### 3.12 Cage / oyster detail — full history with photos, growth chart, projection

Tapping a single cage **without dragging** (or a "details" affordance) opens the **Cage detail sheet**.
**Actions are NOT here** — actions live in the popup. The detail sheet is read/insight-first (fixing
dogfood note 1: no buried actions, no leading type dropdown). Contents, top to bottom:

1. **Header:** cage label (e.g. "1-3"), line name, cage type + mesh ("FlipFarm · 9 mm mesh"). A small
   "Change type" link (rare action) lives here, not at the top blocking content.
2. **Current batch summary** (if filled): big size readout (mm) with monospace, count, ploidy, hatchery,
   grade, months in water, **market-ready badge** if ready. Seed photos strip (§5).
3. **Projected market date** + confidence copy (§4): e.g. "~Nov 2026 (76 mm)" with "Low confidence —
   based on a typical Gulf rate; log growth checks to use this cage's own pace." Honest voice (§4).
4. **Growth chart** (`growthChartSVG`): teal polyline through measurements, dashed segment to the market
   line, dashed market threshold labeled "market 76 mm".
5. **Full history timeline** — the batch's whole life **across cages** (the brief's #1 lineage ask):
   - Build by collecting every Event whose `batchId` is in this batch's lineage chain (this batch's id
     plus, following `origin.parentBatchIds` upward, the parent batches), from **all cages** + the barge
     events, sorted by date. So a cage filled from the barge shows: original reception in the source
     cage → growth there → pulled to barge → re-filled here → grown here → (future) harvested.
   - Each row: date · past-tense label · detail (size / count / method / note) · **photo strip** for that
     event (§5). Tapping a photo opens the full-screen viewer.
   - For an empty cage, show its retained history (it kept its events even though `batch===null`) and a
     note "Empty — last held batch …".

---

## 4. GROWTH + PROJECTION (keep index-6 math + honest copy)

Copy `growthModel`, `integrateGrowth`, `growthPoints`, `growthChartSVG`, and the constants from index-6
(harvest kit §3). They are pure-ish and DOM-free except the chart. Behavior to preserve exactly:

### 4.1 Constants

```js
var DEFAULT_GROWTH_MM_DAY = 0.18;  // Gulf triploid prior: ~15mm seed → ~76mm in ~1yr
var MIN_GROWTH_MM_DAY = 0.02;      // below this, projected date is "unknown", not 50yr out
var STALE_DAYS = 30;
var MAX_PROJECTION_DAYS = 730;
var SEASON_MULT = [0.35,0.45,0.8,1.2,1.35,1.35,1.05,1.0,1.2,1.3,0.8,0.45]; // Jan..Dec Gulf seasonality
```

### 4.2 Rate selection

Points = the cage's `growth`/`stocked` events with a `sizeMm`, sorted by date.
- **0–1 points:** use `DEFAULT_GROWTH_MM_DAY` (prior), `rateSource = 'prior'`.
- **2 points:** simple slope between them.
- **≥3 points:** ordinary least-squares slope.
- A flat/negative slope = measurement noise (oysters don't shrink) → fall back to the prior and set
  `noisy = true`. Clamp the working rate to ≥ `MIN_GROWTH_MM_DAY`.

### 4.3 Estimate today + projection (seasonal forward-integration)

```js
function integrateGrowth(fromMs, size, ratePerDay, targetSize, maxDays){
  var ms = fromMs, days = 0;
  while (size < targetSize && days < maxDays){
    ms += 86400000; days++;
    size += ratePerDay * SEASON_MULT[new Date(ms).getUTCMonth()];
  }
  return { ms:ms, size:size, days:days, reached: size >= targetSize };
}
```

- **Estimate today:** integrate from the last measurement forward to today (so the estimate equals the
  measured value the instant a check is logged).
- **Projection:** integrate today → `marketSizeMm`, capped at `MAX_PROJECTION_DAYS`. Below
  `MIN_GROWTH_MM_DAY` the projected date is `unknown`.

### 4.4 Confidence

- **low:** rate is prior/noisy, OR last check > 90 days old (very stale).
- **high:** ≥3 points spanning ≥45 days AND a check within `STALE_DAYS`.
- **medium:** everything else.

### 4.5 Honest copy (keep this voice verbatim in intent)

```
projectionLabel():
  readyNow & measured ≥ market  → "Market-ready now"
  readyNow & only estimated     → "Likely market-ready (est.) — log a growth check to confirm"
  projectionCapped              → "1+ years out"
  has projectedDate             → "~{Mon YYYY} ({marketSizeMm} mm)"
  else                          → "—"

confidenceHint():
  high → (none)
  rateSource not observed → "based on a typical Gulf growth rate — log growth checks to use this cage's own pace"
  noisy   → "recent checks disagree — re-measure to sharpen it"
  stale   → "last check was {N} days ago — log a fresh growth check to sharpen it"
  else    → "log another growth check to sharpen it"
  → "{Low|Medium} confidence projection: {why}."

Growth line when no usable checks:
  "~0.18 mm/day · ~5.5 mm/mo (typical rate — no usable checks yet)"
```

Use `~` (tilde), never `≈` (dogfood note 7).

### 4.6 Chart

`growthChartSVG(cage, marketMm, model)`: inline SVG, no library. Solid teal polyline through real
measurements; dashed segment from the last real point to the market line; dashed horizontal market
threshold labeled "market {N} mm". Local coordinate mappers only. Copy whole.

---

## 5. PHOTOS (IndexedDB — follow PHOTOS-IMPLEMENTATION-PLAN.md, adapted to v7)

Photos are evidence attached to **Events** and **Batches** via optional `photoIds: string[]` (here always
present as `[]` when empty — see §1). Binary lives in IDB, never in localStorage.

### 5.1 IDB layer (ES5 `.then()` style, no async/await)

```
DB 'spatmapPhotos' v1, store 'photos' keyPath 'id'.
photoDB()          → Promise<IDBDatabase|null>  (onupgradeneeded creates the store; missing IDB / private
                     mode → resolve null, set photosUnavailable=true; wrap with ~3s timeout that resolves
                     null and retries next call — Safari first-open hang; never cache a rejected promise)
photoPut(rec)      → Promise<id>  (rejects on quota; on first success fire navigator.storage?.persist())
photoGet(id)       → Promise<rec|null>
photoGetMany(ids)  → Promise<rec[]>  (nulls filtered)
photoDeleteMany(ids)→ Promise
photoAllIds()      → Promise<string[]>  (getAllKeys)
```

### 5.2 Capture + compress

```
compressPhoto(file) → Promise<{blob,w,h}>:
  prefer createImageBitmap(file,{imageOrientation:'from-image'}); fallback new Image()+URL.createObjectURL
  scale longest edge ≤ 1280; canvas.toBlob(cb,'image/jpeg',0.72)  (~150–300KB; strips EXIF/GPS; converts HEIC)
  guard toBlob null (huge/corrupt) → reject with a toast-able message
addPhotoFromFile(file) → compress → photoPut({id:uid(),blob,w,h,createdAt:Date.now()})
```

Capture input: `<input type="file" accept="image/*" multiple hidden>` — **omit `capture="environment"`**
so iOS offers "Take Photo / Photo Library" (better on a boat). Input must be in the DOM when `.click()`ed
(append it hidden inside the widget).

### 5.3 Widgets

- **`photoField(existingIds)`** → `{el, ids(), busy()}`. Renders existing/pending 56px thumbs (each with a
  ✕ that only removes the id from the local list — never deletes the blob; the sweep reclaims), then a
  dashed "Add photo" button (camera icon). On file(s) chosen: `addPhotoFromFile` each, append thumb; cap
  ~6 per event with a toast. If `photosUnavailable`, render a hint instead ("Photos need browser storage
  that isn't available here (private browsing?)"). Submit handlers must check `busy()` and bail with a
  toast "Photo still saving…".
- **`photoStrip(photoIds)`** → read-only thumb row for history/summary. Async-fills `img.src` via
  `photoGet` → `trackURL(URL.createObjectURL(blob))`; missing blobs render a muted placeholder. Tap →
  `openPhotoViewer(ids, index)`.
- **`openPhotoViewer(photoIds, start)`** → singleton `#photoViewer` appended to `body`, above the sheet:
  fit-to-screen img, ✕ close, swipe/arrow prev-next, "2 / 5" counter, Escape closes (its handler must run
  before the sheet's Escape so Escape closes the viewer first). Revokes its own URL on nav/close.

### 5.4 Object-URL lifecycle (single choke point)

`var sheetURLs=[]; trackURL(u){ sheetURLs.push(u); return u; }`. In `renderSheet()`, immediately after
clearing the sheet body and **before** any early return, `sheetURLs.forEach(URL.revokeObjectURL); sheetURLs=[]`.
Every thumb/viewer URL goes through `trackURL`. Leaks become impossible.

### 5.5 Where photos attach (v7 surfaces)

| Surface | Attach |
|---|---|
| Fill (new seed) form | `photoField([])` after Notes → `batch.photoIds = ids.slice()` + the `stocked` event's `photoIds` |
| Work sheet (method / growth) | one `photoField` → the `worked`/`growth` event(s); bulk = one capture, N event references |
| Cage detail timeline rows | `photoStrip(event.photoIds)` under each event |
| Cage detail batch summary | `photoStrip(batch.photoIds)` |
| Harvest sheet (optional) | optional `photoField` → the HarvestEntry (optional; can defer) |

**Lineage display** is automatic: because the timeline is built by `batchId` across cages and the
provenance chain (§3.12), photos taken at reception in cage A appear when you open cage B that was filled
from the barge — "photos across the oyster's whole life on the farm" (brief #3). When a cage is emptied
(Pull/Harvest), carry stock photos onto the summary event: `if (batch.photoIds.length) ev.photoIds =
batch.photoIds.slice()` so they survive in the permanent history.

### 5.6 Export / import with photos

- **Export (default):** plain JSON of `{v,farms,activeFarmId}`, filename `spatmap-backup-DATE.json`. No photos.
- **Export + photos:** `photoGetMany(referencedPhotoIds())` → `FileReader.readAsDataURL` each →
  `{v:1,farms,activeFarmId,photos:[{id,w,h,createdAt,dataUrl}]}`, filename
  `spatmap-backup-with-photos-DATE.json`. Toast "Packing N photos…" if many; warn if huge (>~150MB).
- **Import:** confirm with a scary-enough message ("REPLACES all current data"). After shape check:
  `var photos = Array.isArray(data.photos)?data.photos:null; delete data.photos;` (CRITICAL — never let
  base64 reach localStorage) → `localStorage.setItem` → reload/`commit`. Then if `photos`, restore each
  via `fetch(p.dataUrl).then(r=>r.blob())` → `photoPut`, then `sweepPhotos()`, then toast "…N photos restored".
  Old (photo-less) backups: unchanged path.

### 5.7 Orphan sweep

```
referencedPhotoIds() → Set of every batch.photoIds + every event.photoIds across farms→lines→cages
                       (+ barge.events + harvestLog if you attach there)
sweepPhotos()        → photoAllIds() → delete ids NOT referenced AND older than 10 min (createdAt grace window)
```

Run `sweepPhotos()` **at boot ~3s after first render** (setTimeout) and **after import** — NOT on every
`commit()` (a full IDB scan per tap is wasteful). The 10-minute grace window stops the boot sweep from
deleting a photo attached in an in-progress (unsubmitted) form.

---

## 6. FUNCTION INVENTORY (suggested skeleton — the builder may rename, but cover every job)

One file, no framework. Tiny hyperscript `h(tag, attrs, ...kids)`; `icon(name)` from an `ICON_PATHS`
table (+ a `camera` entry); `uid()`; ISO date utils (`todayISO`, `isValidISO`, `monthsSince`, `daysSince`,
`monthYear`, `fmtCompact`). Plain ES5 (`var`/`function`/`.then`), `commit()`→`save()`+`render()` loop.

**Persistence & state**
- `loadState()` / `freshState()` / `save()` / `persist()` — §1.12.
- `getFarm()` — active farm; `commit()` (bumps `commit.seq`, save, render); `persist()` (save, no render).

**Render**
- `render()` — rebuild `#app` (top bar, stat strip, lines list, barge) from state; routes to onboarding if no farms.
- `renderLine(line, farm)` — anchors + rope + dense cage strip.
- `renderBarge(farm)` — barge art with `#oysterPile` driven by `pileLevel(barge.count)`; count pill; origin caption; tap → Harvest sheet.
- `cageGlyph` via `shapeSVG(shape, fill, ring, size, work)` (copy from index-6); `pilingSVG(size)` (copy).
- `cageStatus(cage, farm)`, `needsWork(cage, farm)`, `latestSize(cage)`, `lastEvent(cage)`.

**Selection + popup**
- `denseRangeSelect(strip, line)` (copy, simplified to `sel` only).
- `selCages` store; `clearSelection()`.
- `renderPopup(farm)` + `syncPopup()` (out-of-band positioning; the §2.5 action matrix). (index-6
  `renderPullFillPopup`/`syncPullPopup`, trimmed; delete the selbar entirely.)

**Sheets / forms**
- `openSheet(buildFn)` / `refreshSheet()` / `closeSheet()` / `renderSheet()` (with the §5.4 URL revoke hook).
- `buildOnboarding()` / `buildFarmLayout()` (shared form, fresh-vs-edit mode).
- `buildFillSeedForm(cageIds)` — §3.4 (the new-seed fields, in order, + `photoField`).
- `buildWorkSheet(cageIds)` — §3.9 (method chips + Log growth + work-again chips + photos + history).
- `buildHarvestSheet(farm)` — §3.8 (count + on-barge history).
- `buildCageDetail(cage)` — §3.12 (header, summary, projection, chart, lineage timeline with photos).
- `buildHarvestLog()`, `buildGrades()`, `buildSettings()`, `buildDataMenu()` (export/import), `buildMenu()`.

**Barge / lineage actions**
- `pullSelectedCages(cageIds)` — §3.5 (pool into barge, lineage-preserving).
- `fillFromBarge(cageIds)` — §3.6 (even split + remainder, child batches with provenance).
- `fillNewSeed(cageIds, formValues)` — §3.4.
- `workCages(cageIds, {method|sizeMm, photoIds, note, workDue})` — §3.9.
- `removeCages(cageIds)` — §3.10 (splice empties, keep line; undoable).
- `harvestFromBarge(count, note)` — §3.8 (HarvestEntry + per-cage `harvested` events).
- `lineageEvents(batch, farm)` — collect events across cages + barge by batchId and provenance chain (§3.12).

**Projection**
- `growthModel(cage, farm)`, `integrateGrowth(...)`, `growthPoints(cage)`, `growthChartSVG(cage, marketMm, model)` (copy from index-6).

**Photos**
- `photoDB/photoPut/photoGet/photoGetMany/photoDeleteMany/photoAllIds` (§5.1).
- `compressPhoto`, `addPhotoFromFile` (§5.2).
- `photoField`, `photoStrip`, `openPhotoViewer`, `trackURL` (§5.3/5.4).
- `referencedPhotoIds`, `sweepPhotos` (§5.7).
- `exportData`, `exportDataWithPhotos`, import handler (§5.6).

**Feedback**
- `toast(msg, action)` with seq-guarded Undo (snapshot `commit.seq`; the undo no-ops if a later commit
  moved `seq` — copy from index-6). Wire Undo on Fill / Pull / Fill-from-barge / Work / Remove / Harvest (§3.11/§3).

**Boot**
- `init()`: `state = loadState()`; if no farms → onboarding; `render()`; `setTimeout(sweepPhotos, 3000)`;
  expose a `window.SpatMapDebug` handle (state, photo helpers) for console testing.

---

## 7. ACCEPTANCE CRITERIA (the verifier runs this in a real browser, phone viewport ≈390×844, touch)

A fresh user, **with no instructions**, can do all of the following. Each is a checklist item the verifier
confirms by simulation (Playwright). Everything must work, feel simple, and look good on a phone.

1. **Onboard.** Land in onboarding on first load. Create a farm with **N lines × M cages**, pick **cage
   types with a mesh size**, set **grades**, **market size**, and **needs-work alert interval**. Land on
   the main map showing N lines of M cage glyphs each, with piling anchors and a docked (empty) barge.
   - PASS: farm persists across reload (localStorage); no method-picker step; "Load Brightside demo" works.

2. **Fill new seed.** Drag-select a run of empty cages → popup shows **Fill** → form asks
   count/size/ploidy/hatchery/notes **and a photo** (camera/library) → confirm → those cages show filled
   (color change), the photo thumbnail was visible in the form.
   - PASS: cages FILLED; localStorage has no base64 (photo is in IDB); selection cleared; Undo offered.

3. **Pull → barge grows.** Drag-select filled cages → popup **Pull** → those cages go empty and the
   **barge pile visibly grows** (the `#oysterPile` heaps; count pill updates).
   - PASS: cages EMPTY; barge `state='pile'`; pile larger than before; origin caption names the source line.

4. **Fill from barge.** Drag-select empty cages → popup **Fill** → the barge oysters **distribute evenly**
   across the selected cages, losing none (sum of shares = pile count; remainder spread by +1).
   - PASS: each filled cage has a child batch with provenance; barge count decremented (or emptied);
     no oysters lost.

5. **Work a cage.** Open Work on a filled cage → pick **Tumbled / Washed / Desiccated / Flipped** → the
   cage shows that as its **last action** and its **needs-work timer resets**.
   - PASS: `worked` event appended with the method; "Last: Tumbled" shows; the red needs-work edge clears.

6. **Harvest.** **Tap the barge** → Harvest sheet → enter a count → Harvest → it lands in the **Harvest
   Log** (menu) with date/count/origin; the pile shrinks/clears.
   - PASS: a HarvestEntry exists; barge count decremented (or emptied); harvest log row visible.

7. **Remove an empty cage.** Open Remove on an empty cage → it **leaves the line**; the **line stays**
   (same place, same name, one fewer cage).
   - PASS: `line.cages` shorter by one; other lines unmoved; line still rendered (even if it hits zero cages).

8. **Cage detail.** Open a cage → see its **full history timeline with photos across the batch's life**
   (reception → work → pull → barge → re-fill → …), a **growth chart**, and a **projected market date**
   with honest confidence copy.
   - PASS: timeline shows events from this batch's lineage across cages; photos render and open in the
     viewer; chart draws; projection label + confidence hint present (using `~`, not `≈`).

9. **Needs-work.** Let a cage exceed the alert interval (or simulate a past `workDue`) → it shows a
   **"needs work"** state (sonar-ping ring / red bottom edge; counted in the stat strip).
   - PASS: `needsWork()` true; visible indicator; resets when the cage is Worked.

**Simplicity gates (also judged):**
- One interaction model only: drag-select → popup. No bottom selbar, no second action bar, no hover-peek.
- One word per concept (§0); Work sub-actions past tense; the cage shows the last thing that happened.
- Flat Farm → Lines → Cages (no Areas/Quarters). No sort wizard, no place wizard, no conditions/NWS panel,
  no detached-spot state, no method-picker onboarding step.
- Phone-readable: 16px base, ≥48px tap targets, barge doesn't eat the phone screen when empty.

---

## 8. EXPLICIT SIMPLIFICATIONS vs the old app (call-outs)

These are deliberate cuts from index-6; the builder must NOT reintroduce them (full DROP LIST in
`_rebuild-HARVEST-KIT.md`):

1. **Hierarchy flattened.** Areas → Sections(Q1–Q4) → Lines collapses to **Farm → Lines → Cages**, one
   flat scrollable list. `section`/`vert`/`area`/plot nav all gone. (Migration flattens legacy saves.)
2. **Sort-and-transfer wizard deleted** entirely. The Pull → barge → Fill (even split) cycle replaces it.
3. **Place wizard folded** into drag-select empty → popup **Fill** → distribute. No separate "place mode".
4. **One action surface.** The bottom selbar, place bar, and sort bar (three bars) are gone — only the
   floating popup remains.
5. **Live conditions panel (NWS/tide/salinity/station picker) cut.** Offline-first app; network dependency
   removed. (Could return later as an isolated optional widget.)
6. **Detached-spot state removed.** No "spot exists but no cage." Remove simply shortens the line.
7. **Hover/click peek layer removed.** Phone-first: tap-selects, drag-extends, tap-barge-harvests, tap a
   single cage → detail. No desktop hover-peek with stopPropagation tangles.
8. **Method-picker / "what kind of farm" onboarding step cut.** Onboarding asks only lines × cages ×
   cage-types(+mesh) + grades + market size + alert interval.
9. **Vocabulary unified** (§0). One word per concept everywhere.
10. **One harvest ledger.** No `discardLog`, no separate `seedLog`, no dual harvest write-paths. Seed
    reception = "Fill an empty cage with new seed."
11. **Barge simplified to one stored object** (`farm.barge`) with two states (empty/pile), not a
    `batches[].placed` filter. "Placed" is an action outcome, not a stored state.
12. **Sample/Brightside seeding** is a single onboarding "Load Brightside demo" button, not persistent
    menu clutter.
13. **Cage detail is insight-first; actions live only in the popup** — fixes the dogfood note-1 "actions
    below the fold / leading type dropdown" pain.
14. **Mesh is real data** (`cageType.meshMm`), never stuffed into the type name.
15. **Neglect interval is farm-configurable** (`settings.neglectIntervalDays`), not a hard-coded 8 weeks.

---

## 9. OPEN RISKS / DECISIONS THE BUILDER SHOULD KNOW

- **Barge art palette discrepancy:** use the on-disk `_barge-design.svg` colors (hull `#3a6e5a`, deck
  `#4a7a5a`, oysters `#8a9a7a`…), not the stale hexes quoted in harvest-kit §1. Pile-group coordinates
  match, so the growing-pile recipe is unaffected (§3.7).
- **Fill-from-barge when oysters < cages:** decision in §3.6 — fill the first `total` cages with 1 each,
  leave the rest empty, toast the shortfall. Never create 0-count "filled" cages and never lose a count.
- **Uncounted pulls:** if any source cage lacks a count, the barge count becomes `null` ("uncounted") and
  Fill-from-barge distributes "an even share" with no number. Do not fabricate counts.
- **`harvested` per-cage attribution** is best-effort (the pile may pool several lineages); always record
  the authoritative HarvestEntry with full origin, and attach `harvested` events to source cages only
  where the provenance chain resolves cleanly.
- **Photos in private browsing / Lockdown:** `photoDB()` resolves null → `photoField` shows a hint, the
  rest of the app works. IDB may be evicted after ~7 days of non-use on non-installed sites — README
  should push "Add to Home Screen" + photo backups.
- **`Batch.events` mirror:** spec recommends NOT storing it (derive batch history from cage events by
  `batchId` + provenance) to keep one source of truth. If the builder keeps a mirror for convenience, it
  must never be the only place an event lives.
- **No Supabase sync this build** (scope/risk). Keep ids globally-unique (`uid()`) and the model
  sync-friendly, but build nothing networked.

---

## 10. PINNED DECISIONS (orchestrator, resolves the doc's open choices — builders follow these)

1. **Open a single cage's detail = the popup's "Open ›" affordance.** When exactly ONE cage is selected,
   the contextual popup shows its label as a tappable "Open 1-3 ›" row above the action buttons; tapping it
   opens the Cage detail sheet (§3.12). Do NOT use double-tap (ambiguous on touch). One tap language:
   tap selects → popup → "Open ›" for detail, action buttons for actions. (Resolves DESIGN §6 open choice.)
2. **Barge art keeps its warm hand-drawn look.** Paste `_barge-design.svg`'s art body VERBATIM (its own
   greens/amber), wrap only the oyster-pile shells in `<g id="oysterPile">`, and drive that group with
   `pileLevel(barge.count)` (§3.7). The barge is "the one indulgence" (DESIGN §1) — do not flatten it to the
   pale palette. Everything ELSE follows the DESIGN light palette. Empty barge → `_barge-empty.svg` art (or
   `#oysterPile` hidden at level 0) + small/faded `.barge.empty` sizing.
3. **Build target file:** `/Users/philipinosis/Desktop/spatmap/index.html` (the GitHub Pages deploy target;
   currently absent — safe to create fresh). Keep `index-3..6.html` untouched as fallbacks.
4. **Integration contract:** the §6 FUNCTION INVENTORY names/signatures are binding across builders so a
   later builder can call/extend an earlier builder's code without guessing. Expose `window.SpatMapDebug`
   ({state, getFarm, photo helpers}) from the start for console + Playwright testing.
5. **Build split (sequential, single file):** Builder 1 = foundation+shell+map+onboarding+barge-render+
   sheet/toast infra+menu+export/import(no photos), with action-flow / detail / projection functions present
   as clearly-marked stubs. Builder 2 = selection+popup+all action flows+cage detail+growth/projection+
   wires the growing pile. Builder 3 = the IndexedDB photo layer + widgets + wiring + export-with-photos.
