# SpatMap v2 — Architecture & Commercial-Readiness Audit

Scope: strategic assessment of `spatmap-v2.html` as a foundation for a commercial product.
Read-only. Correctness and performance are covered by two other agents; this report is about
structure, durability, and the path to "a product people pay for."

Facts are pulled from the actual code, not the docs (the docs flag their own staleness).

---

## TL;DR verdict

**Single-file-offline is a genuinely strong MVP foundation, NOT a dead end — but it is one
decision away from a commercial dealbreaker.** Ship it as-is to one farm and it is fine. Sell it
to a second farm without fixing durability and you will eventually lose a paying customer's entire
season of records to a cleared cache, and there is no backup, no telemetry, and no way to even know
it happened.

The good news: the hard architectural thinking for the commercial version is **already done and
sitting in the repo.** `supabase-setup.sql` is a complete, well-designed sync backend (version-counter
sync cursor, row-level security, crew membership, invites, soft-deletes, text IDs that migrate the
app's existing record IDs untouched, deliberately no hard foreign keys so out-of-order sync pushes
don't fail). The data model was clearly built to be sync-friendly. What's missing is the **client-side
instrumentation** to drive that backend — and that is an additive evolution, not a rewrite.

Staging in one line: **harden durability now (days) → add optional cloud backup/sync against the
existing schema (weeks) → layer multi-user on the sync foundation (later).** No rewrite required.

---

## 1. Architecture integrity of the single-file approach

### What's actually there (measured)
- 9,252 lines total; one `<style>` (12–1150), one `<script>` (1159–9250, ~8,090 lines).
- **391 top-level `function` declarations** in one shared script scope. No IIFE, no modules, no
  framework, no build step. 547 KB on disk — still small enough to email or drag onto Netlify Drop.
- No `package.json`, no test runner, no bundler, no lint config. Zero automated tests.

### The coupling picture is better than the brief assumed
The prompt worried about `farm`/`LAYOUT`/`selCages` as mutable globals. The code is more disciplined
than that:

- **`farm` is NOT a global.** There is no top-level `var farm`. It is fetched per-function via
  `getFarm()` (line 1837), and 41 functions open with a local `var farm = getFarm();`. The 598
  "farm" textual hits are overwhelmingly these locals. This is effectively a repository accessor
  over `state` — a real seam, and a good one. `getFarm()` is the single choke point for "the active
  farm," which is exactly where you'd later swap in a synced/remote farm.
- **The true globals are `state`, `LAYOUT`, `selCages`, `viewMode`/`viewScope`/`homeMode`.** Of
  these, `state` (the persisted root) is read through `getFarm()`/`loadState()`/`save()` — also
  reasonably contained. `LAYOUT` (352 refs) is the genuinely god-object-shaped one: it carries
  camera, view mode, hit-test, highlight, tap timers, and editor state all at once. `selCages` is a
  plain bag keyed by cage id, mutated directly by ~11 sites — small and tractable.

So the coupling that will actually bite is **the render/view layer**, not the data layer. The data
layer already has accessors. The view layer is a single `render()` dispatcher (~2106) fanning into
DOM builders and an SVG canvas renderer that both read globals directly.

### Where it breaks down as features grow
The file is past the comfortable ceiling for one shared scope but not catastrophically so. The
specific failure modes, in order of when they'll hurt:

1. **No tests + no module boundaries = change risk compounds.** The QA protocol is "open in
   Playwright, click around, watch the console." That works for one developer who holds the whole
   model in their head. It does not survive a second contributor or a six-month gap. Every backlog
   item in `_notes-and-ideas.md` (sibling-cage highlight, live-count mortality, freeform line
   drawing) touches selection + lineage + render at once — exactly the cross-cutting changes that a
   no-test single scope makes scary.
2. **Lineage/provenance is the real complexity sink, not line count.** The mortality and
   "same-oysters" features require walking `origin.parentBatchIds` chains across pull→barge→fill.
   That logic wants to be a small, unit-tested pure module. In the current structure it will be
   another set of functions reading globals, untestable in isolation.
3. **`LAYOUT` will keep accreting.** Every new canvas interaction adds fields to it. It's the one
   object most likely to become unmaintainable.

### Is single-file still the right call? Yes — and you can keep "one file you email" AND get modules + tests
The offline/no-build/file:// requirement is real and worth protecting. You do **not** have to choose
between "one emailable file" and "modular, tested code." The low-friction path:

- **Author in modules, ship one file.** Split the script into ES modules (`state.js`, `lineage.js`,
  `render-dom.js`, `render-canvas.js`, `layout.js`, `photos.js`, `conditions.js`) and add a
  ~20-line build step (esbuild/rollup) that inlines everything back into a single `spatmap.html`.
  The shipped artifact is byte-for-byte the same "one file" deploy story; the source is testable.
  This is the single highest-leverage structural move and it's reversible/incremental — you can
  extract one pure module (start with `lineage.js`, then growth-projection math) without touching
  the rest.
- **Add tests on the pure cores first.** The growth/projection math (8462+, with named priors and a
  seasonal curve), the migration chain, and the lineage walk are pure functions. They're the parts
  most expensive to get wrong (a bad projection or a dropped batch is a silent data-quality bug) and
  the cheapest to test. A handful of Vitest specs around those three buys most of the safety.

Until that build step exists, single-file is fine for one user. It is not fine as the basis for
paid, evolving software with more than one person touching it.

---

## 2. Data durability — the commercial dealbreaker

This is the #1 risk and the report's most important section.

### The current durability story (measured)
- **localStorage is the sole store of all farm data** (`STORAGE_KEY = 'cageTrackerData'`). Photos
  are in IndexedDB. There is no other persistence.
- `save()` (line 1831) is the only writer: `localStorage.setItem(...)` wrapped in a try/catch that,
  on failure, shows a toast "Could not save — storage may be full" **and otherwise swallows the
  error.** A quota failure means the write silently didn't happen; the in-memory state moves on as
  if it did. There are **83 mutate→save call sites**, so this path is exercised constantly.
- **No save-on-exit.** No `beforeunload`, `pagehide`, or `visibilitychange` handler. Saves are
  synchronous-per-action, so this is mostly OK — but any future debounced save would lose the last
  edit on a backgrounded mobile tab with no safety net.
- **`navigator.storage.persist()` is called exactly once — and only on the first photo write**
  (line 8716). The actual farm data in localStorage **never requests persistent storage.** So the
  livelihood data is sitting in the storage bucket browsers evict *first* under pressure, with no
  persistence request, while the photos (less critical) get the protection.
- Export/import exists and is decent: plain JSON backup (`exportData`, 7132), a photos-inlined
  variant (`exportDataWithPhotos`, 9025), and import with a scary confirm. But it is **100% manual**
  — the user has to remember to do it. The README literally says "Back up regularly" and "Clearing
  browser history/site data can erase it." For a personal tool that's an honest caveat. For a paid
  product it's an unacceptable loss vector.

### The loss vectors, ranked
1. **Browser eviction (silent).** Safari/iOS evicts localStorage for sites not "persisted" after ~7
   days of non-use, and under storage pressure. The farm data never asked to be persisted → highest
   real-world risk on the exact platform (iPhone Safari) the brief targets.
2. **User/IT clears site data.** One tap in settings, or a "clear history" habit, wipes everything.
3. **Device loss/theft/replacement.** No copy exists anywhere else. New phone = blank farm.
4. **Quota-exceeded write.** Swallowed; user keeps working on state that isn't being saved.
5. **Private/Lockdown mode.** localStorage may be unavailable; `loadState()` degrades to a fresh
   state rather than warning the user their work won't persist.

### Minimum viable durability story (do this before a second paying customer)
Cheap, no-backend, ship-this-week tier:
- **Request persistence for the real data.** Call `navigator.storage.persist()` on app boot (not
  just on photo write). One line. Materially reduces eviction on Chrome/Android; Safari is more
  stubborn but it still helps.
- **Make quota failure loud and recoverable.** When `save()` catches, don't just toast — block
  further edits behind a modal that says "Your last change couldn't be saved" and offer Export now.
  Silent data divergence is worse than an error.
- **Auto-export nudge / scheduled reminder.** Track "last backup" timestamp; if it's been N days,
  surface a persistent (dismissable) reminder with a one-tap Export. This is the difference between
  "we told them to back up" and "the product actually protects them."
- **On import, keep the displaced data.** Import currently overwrites localStorage outright. Snapshot
  the pre-import blob to a second key (or auto-download it) so a mistaken import is recoverable.

The honest framing for the owner: **export/import is necessary but not sufficient for a paid
product.** Manual backup that depends on user discipline is not a durability story a customer can
rely on with their livelihood. The above tier makes single-device acceptable; section 2-next makes
it actually safe.

### Path to optional backup/sync without abandoning offline-first
This is the bridge to section 3 and it's already half-built. `supabase-setup.sql` exists and is
good. The minimum durable-cloud step (no multi-user needed yet) is **one-way encrypted/authed
backup**: on save, also push the JSON blob to a per-account row. Offline-first stays intact (local
is still the source of truth; cloud is a mirror). This alone kills loss vectors 1–4. It requires the
client-side instrumentation described next — but you can start with "push the whole blob on a
debounced timer" before you build proper per-row sync.

---

## 3. Multi-device / multi-user

Real operation = owner + deckhands on several phones. Today it is strictly single-device,
single-browser. The architecture question is whether multi-device is a rewrite. **It is not** — and
the reason is the SQL schema.

### What's already designed (and it's genuinely well done)
`supabase-setup.sql` is not a stub. It is a thought-through offline-sync backend:
- **Version-counter sync cursor** (`row_version_seq`, `set_row_meta()` trigger): every synced row
  gets a server-assigned monotonic `row_version`; clients pull "everything newer than the last
  number I saw." This is the correct, clock-skew-immune design for offline sync — far better than
  last-write-wins on timestamps.
- **Text primary keys** so the app's existing in-memory record ids migrate in untouched (comment M4).
- **No hard foreign keys between sync tables** (comment N5) so a child row arriving before its parent
  during a push doesn't fail — a deliberate, sophisticated choice.
- **Soft deletes** (`deleted boolean`) on every synced table = proper tombstones for sync.
- **Crew membership + single-use expiring invites + RLS** (owner vs member, `accept_invite()`),
  with `security definer` helpers and pinned `search_path`. The multi-user permission model is
  already specified at the database layer.

The schema's table shapes (farms/areas/sections/lines/cages/events with `batch` as jsonb on the
cage) **mirror the app's data model closely.** One mismatch to note: the app **flattened** the
Areas→Plots→Lines hierarchy into a flat `f.lines[]` (see `migrateFarm`, which deletes `f.areas` and
concatenates everything into `f.lines`), while the SQL still has separate `areas`/`sections`/`lines`
tables. That's a reconcilable seam (the flat client can map to/from the relational tables), but it's
the one place the "mirror" claim is now stale and will need a mapping layer.

### What the client is missing (the actual work)
The in-memory model carries **zero sync instrumentation** — a grep for `updatedAt`/`rowVersion`/
`deleted`/`dirty`/tombstone/lamport across the whole file returns **0 hits.** Records are created
with `uid()` ids and mutated in place; deletes splice arrays (hard deletes, no tombstones). So to
sync against the existing schema you must add, client-side:
- per-record `updatedAt`/`rowVersion` tracking and a local "dirty since last sync" set,
- soft-delete (tombstones) instead of array splices, so deletions propagate,
- a sync engine: push dirty rows, pull rows newer than the cursor, merge.

### Can it be staged without a rewrite? Yes, in three honest steps
1. **Whole-blob cloud backup (1-way).** Push the entire JSON to a per-account row on a debounced
   timer. No per-row instrumentation needed. Solves durability + "see my farm on a new phone (read).”
   Not real multi-writer, but ships fast and de-risks the dealbreaker.
2. **Per-row sync, single writer at a time.** Add `updatedAt`/`rowVersion`/tombstones to the model,
   wire the push/pull loop against the existing schema. Owner on one device, deckhands read. Conflicts
   rare because writes are serialized in practice (one person works a line at a time).
3. **Concurrent multi-writer.** Only here do you confront real merge conflicts. The version-counter
   design handles ordering; you'll still need a conflict policy per entity (last-write-wins on a cage
   batch is probably fine; events are append-only so they just merge). A CRDT is **not** required —
   the append-only event log + soft-deletes + per-row versions get you most of the way, and oyster
   farm edits are low-contention by nature. Don't reach for CRDTs unless step 3 proves it needs them.

The key strategic point: **the expensive, easy-to-get-wrong part (the sync schema and security model)
is done.** The remaining work is client instrumentation + a sync loop, which is additive to the
current code and gated behind a login the offline app doesn't otherwise need.

---

## 4. Versioning & migration

The migration strategy is **sound and notably defensive** — one of the stronger parts of the codebase.

- `loadState()` (1342) is "one defensive additive read; NEVER throws; backfills every field." On any
  malformed input it returns `freshState()` rather than crashing. Good.
- `migrateFarm`/`migrateBatch`/`migrateEvent` (1360/1783/1809) are **idempotent, forward-only,
  additive backfills.** They tolerate missing/wrong-typed fields, regenerate ids, fix dangling
  references (e.g. `typeId` → first type if dangling; `activeFarmId` → first farm if dangling), and
  even **rescue data during structural change** (line 1431: a legacy detached-but-filled cage's batch
  is pushed into `f.batches` before the cage is dropped, so lineage refs still resolve — explicitly
  commented "no silent batch loss on migration"). This is exactly the right instinct.
- The big structural migration (legacy Areas→Sections→Lines flattened into flat `f.lines[]`) is
  handled in-place and preserves data.

### The one real weakness for paying customers
**The version counter is pinned at `v:1` and never advances** — `loadState()` literally does
`d.v = 1` on every read, and the comment says "v stays 1 — every new field is additive." This works
beautifully for *additive* changes. It has no answer for a **non-additive / lossy / branching**
migration — the kind you eventually need when a feature reshapes existing data in a way that can't be
re-derived (e.g. splitting a field, or the live-count mortality model retroactively reinterpreting
existing event counts). With `v` frozen, you can't tell "old data that needs a one-time transform"
from "new data already in the new shape," and the never-throw philosophy means a bad transform fails
*silently* by backfilling defaults — which for a paid product means quietly corrupting a customer's
history rather than refusing to load.

**Recommendation:** before the first schema change that isn't purely additive, make `v` real:
bump it, write an ordered migration ladder (`v1→v2→v3`, each run once and idempotent), and keep the
never-throw outer guard but log/telemeter when a migration *changes* data so a bad one is visible.
The bones are excellent; they just need the version number to actually mean something.

---

## 5. Commercial-readiness gaps & the realistic path

### The structural tension
The "static file you email / drag onto Netlify" distribution model is the product's charm AND its
commercial ceiling. A pure static file means:
- **No licensing/entitlement.** Anyone with the URL has the full app forever. No way to gate paid
  features, enforce a subscription, or revoke. Fine for free; no business model.
- **No telemetry / analytics / crash reporting.** This is a real, accepted tradeoff of offline-first
  — you cannot see crashes, can't measure adoption, can't learn what farmers actually use. You are
  flying blind on a product you're trying to improve and charge for. Today there is no error
  reporting at all (errors are swallowed into toasts).
- **No onboarding telemetry / support hooks.** When a customer says "it lost my data," you have no
  logs, no account, no server-side copy to investigate. Support is impossible to do well.
- **No accounts.** Multi-device, backup, support, and billing all ultimately need an identity. The
  app has none (it's intentionally accountless).

Every one of these resolves the moment you add the **optional thin backend** that sections 2–3
already point to. That is the pivot: the backend isn't just for sync, it's the thing that makes a
business model, support, and learning possible. The offline app stays offline; the account/cloud
layer is what you actually sell.

### Is the path "evolve this codebase" or "rebuild"? — Evolve.
A rebuild is not warranted and would throw away genuinely good assets: the defensive migration chain,
the well-designed sync schema, the IndexedDB photo architecture (robust — timeout guards, persistence
request, private-mode degradation, ref-counted sweep), the `getFarm()` data seam, and a large amount
of domain logic (growth priors, seasonal curve, lineage). The honest assessment is **"strong MVP that
needs a backend before it can scale into a product"** — option 2 of the three you posed, leaning
toward option 1 (a strong foundation to harden) because the backend is already designed.

### Recommended staging (the few decisions that matter)
1. **NOW (days, no backend): close the durability dealbreaker.** `storage.persist()` on boot; make
   quota-failure loud + blocking; auto-backup reminder with last-backup tracking; non-destructive
   import. This is the single most important work in this whole report — it's what separates "loses a
   customer's season" from "safe enough to sell to one or two farms."
2. **NOW/SOON (the build-step refactor): author-in-modules, ship-one-file.** Add esbuild inlining;
   extract `lineage.js`, growth-projection, and the migration chain as pure tested modules. Preserves
   the emailable-file deploy story, makes every backlog feature safe to build. Highest structural ROI.
3. **SOON (weeks, the backend pivot): optional account + whole-blob cloud backup** against the
   existing Supabase schema. Kills loss vectors 1–4, enables read-on-new-device, and — critically —
   gives you the account that everything commercial (billing, support, telemetry, multi-user) hangs
   off. Add minimal, privacy-respecting error reporting here (you can't get crash reports offline, but
   an authed user can opt to send them).
4. **LATER (the actual product): per-row sync → multi-writer crew.** Staged exactly as section 3
   describes, on the foundation step 3 establishes. Append-only events + soft-deletes + row-version
   ordering; reach for CRDTs only if real contention appears.
5. **Make `v` a real migration ladder** before the first non-additive schema change (section 4).

### What NOT to do
- Don't build Supabase sync *before* fixing local durability and adding the build/test seam — you'd
  be building the second floor before the foundation, and the brief itself flagged sync as a
  complexity risk for now. Durability first, backend second.
- Don't reach for CRDTs preemptively. The data is low-contention and the version-counter design is
  sufficient through step 4.
- Don't keep `v` pinned at 1 once a lossy migration is on the horizon.

---

## One-paragraph answer to the owner's question

"Is this on the right path for a commercial product?" — **Yes, the path is right and the foundation is
real, but it has one hole that must be patched before you charge a second customer: the data lives in
exactly one place (this browser's localStorage), it never asks the browser to keep it, and a cleared
cache silently erases the whole farm with no backup and no way for you to even know.** Fix that this
week (it's a few hours of work), add a build step so the code stays testable while still shipping as
one emailable file, then — when you're ready to actually sell it — turn on the cloud backup/account
layer that's already designed in `supabase-setup.sql`. That account layer is also what gives you a
business model, support, and the ability to learn from users, none of which a pure static file can do.
This is an evolution of the codebase you have, not a rewrite.

---

### Key file references
- `/Users/philipinosis/Desktop/spatmap/spatmap-v2.html`
  - `save()` (the sole, error-swallowing writer): line 1831
  - `loadState()` + migration chain: 1342, `migrateFarm` 1360, `migrateBatch` 1783, `migrateEvent` 1809
  - `getFarm()` data seam: 1837
  - `commit()` mutate→save→render loop: 1844 (83 call sites)
  - Export / import (manual backup): `exportData` 7132, `triggerImport` 7148, `exportDataWithPhotos` 9025
  - Photo IDB layer (`storage.persist()` only here): `photoDB` 8672, `photoPut` 8706/8716
  - `LAYOUT` god-object: declared 2882 (352 refs)
- `/Users/philipinosis/Desktop/spatmap/supabase-setup.sql` — the already-designed sync backend
- `/Users/philipinosis/Desktop/spatmap/DIRECTORY.md` — notes the SQL schema "mirrors the in-memory
  data model" (now partly stale: client flattened Areas→Lines; SQL still relational)
