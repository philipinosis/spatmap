# SpatMap v7 rebuild — build log

Autonomous overnight build started 2026-06-15. Goal: working product by morning, verified by
simulating real usage in a browser. ultracode (Workflow orchestration), Opus agents only.

Authoritative spec: `_rebuild-PRODUCT-BRIEF.md`. Build into a fresh `index.html` (archive old index-N).

## Phases
- [ ] P0 Context + brief (done: brief written)
- [ ] P1 Workflow: audit/harvest index-6 + write full BUILD-SPEC + DESIGN (parallel Opus agents)
- [ ] P2 Synthesize → finalize authoritative BUILD-SPEC.md
- [ ] P3 Workflow: build index.html (sequential Opus builders, smoke-checked between stages)
- [ ] P4 Verify by simulation (Playwright, phone viewport, full acceptance walk) → bug list
- [ ] P5 Fix loop (Opus agents) until acceptance walk passes clean
- [ ] P6 Code review + security + final simplicity pass
- [ ] P7 Commit, deploy to GitHub Pages, update DEPENDENCY_MAP.md + memory

## Decisions (made autonomously; user asleep)
- Single farm focus; data model supports multi-farm but UI de-emphasizes it.
- Offline single-file + localStorage + IndexedDB photos. NO Supabase sync this build (scope/risk).
- New users land in onboarding (empty); a "load Brightside demo" exists for testing.
- Build fresh `index.html`; keep index-3..6 as history (move to _archive at the end).
- Fill is context-aware (barge empty = new seed form; barge has pile = distribute evenly).
- Harvest triggered by tapping the barge pile. Work options past-tense: tumbled/washed/desiccated/flipped.

## Log
- 2026-06-15: Read all notes + photos plan. Wrote PRODUCT-BRIEF. Launching P1.
- P1 design workflow DONE (task wdneytg7l, 3 agents, 342K tok): wrote HARVEST-KIT, BUILD-SPEC (1003 ln),
  DESIGN (629 ln). Both reviewed — high quality, faithful to brief, simplicity-first. Key finds: barge
  pile does NOT grow in index-6 (must build pileLevel mechanism); photos are net-new (no IDB code exists).
- P2 DONE: appended §10 PINNED DECISIONS to BUILD-SPEC (single-cage open = popup "Open ›"; barge art kept
  warm/verbatim w/ #oysterPile wrap; build into fresh index.html; §6 function inventory = integration
  contract; 3-builder sequential split).
- P3 Builder 1 (foundation) DONE — index.html 2210 ln / 132KB, 133 fns, 36 stubs. (Final report lost to an
  API ConnectionRefused blip, but all work landed on disk.) SMOKE TEST PASSED in browser @390x844:
  loads clean (only favicon 404), onboarding renders on-spec, "Load Brightside demo" -> map renders flat
  lines of gear glyphs on ropes+pilings, status colors, one-line summary strip, in-flow Add-line (no FAB),
  warm barge bottom-right w/ ~3.2k pill + origin. Data model verified via SpatMapDebug: single barge obj,
  batches ledger(33), cageTypes w/ mesh, nested settings, cageTrackerData persisted, cage batch+events+id.
  Seams confirmed: data-pos/data-cage-id/data-line-id on cells, selCages@2082, openSheet/sheetHead/field/
  toast helpers, barge tap->buildHarvestSheet@1499, comingSoon()/stubSheet() helpers exist.
  Local server: `python3 -m http.server 8137` (bg) serving spatmap dir; test at http://localhost:8137/index.html.
  KNOWN POLISH NIT: barge (fixed bottom-right) slightly overlaps the +Add line button / last line — fix in polish pass.
- P3 Builder 2 (interaction core) DONE — Opus, 208K tok, ~12 min. index.html now 3255 ln / 160 fns.
  Also CAUGHT+FIXED a latent Builder 1 bug (sheetHead returned bare el w/o subtitle -> broke every
  menu/settings/harvest-log sheet; now returns array). Left precise photo insertion points for Builder 3
  (fillPhotoSlot~2434, workPhotoSlot~2688, harvestPhotoSlot~2862; photoStrip markers ~2911/2944/2722).
- P4 VERIFICATION (browser, 390x844) — INTERACTION CORE WORKS. (False alarm first: a STALE BROWSER CACHE
  served Builder-1's old code -> looked broken. Cache-bust ?v= -> all good. NOTE for deploy: add cache
  headers / version query so users get fresh builds.)
  Verified PASS: tap-select; popup matrix (single filled -> Open›/Pull/Work, exact §2.5); Pull (barge
  3200->5000, lineage pooled L2+L1, summary updates, toast+Undo); cage detail (hero mm, batch summary,
  projection "~Feb 2027 (76mm)" + honest medium-confidence copy, growth chart w/ market line, history
  timeline); Work(tumbled -> worked event, timer reset); Harvest(barge 5000->4000, harvest log row +
  origin); Fill-from-barge(child batch 4000 + provenance, barge drained); Remove(empty 1-9 out, line
  kept); new-seed Fill form builds. NO oysters lost, lineage preserved throughout.
  Screenshots: /Users/philipinosis/v7-0[1-7]-*.png.
  POLISH NITS (for fix pass): (1) popup overlaps top bar for row-1 cages (should flip below); (2) barge
  pile visual growth subtle at high counts (log scale) — pill carries it; (3) favicon 404 (cosmetic).
- User chose "FINISH & DEPLOY" (2026-06-15 morning).
- P5 Builder 3 (photos) DONE — Opus, 131K tok. File now ~3670 ln, parses clean (strict). VERIFIED in browser:
  IDB round-trip (115KB PNG -> 60KB JPEG @1280, stored+read+deleted, ZERO base64 in localStorage); Work
  sheet photoField capture->thumbnail; submit attaches photoId to the worked event (in IDB, referenced);
  cage-detail timeline shows the photo as a blob thumb; full-screen viewer opens w/ caption "Tumbled·Jun15"
  + "1/1" counter. Photos across lifecycle = WORKING. Screenshots v7-08..11.
- P6 POLISH (my edits, verified): (1) favicon inline-SVG -> 404 gone; (2) popup flips BELOW + caret-up for
  top-row cages (was overlapping topbar) — verified via DOM (below class, top 220 clears 68px bar).
  KNOWN MINOR (non-blocking, logged): loadBrightside appends a farm each call (only a dev/test concern —
  onboarding only offers it when no farm exists); barge pile visual growth subtle at high counts (pill carries).
- P6 code-reviewer (Opus specialist, bg task aaa690e413d16c5d9) running on index.html: correctness of
  flows/lineage/undo/migration, photo/IDB safety, XSS surface (user text -> innerHTML), crash edges.
- P6 code review DONE (extracted to _rebuild-CODE-REVIEW.md): 2 CRITICAL, 4 HIGH, 5 MEDIUM, 5 LOW.
  XSS surface confirmed CLEAN; even-split + undo-guard + photo IDB confirmed correct. I independently
  re-read all 6 mutation flows + migration (all sound) before fixing.
- P6 FIXES APPLIED + VERIFIED (13 edits, 0 console errors after):
  C1 deep-clone batch in pull-undo snapshot; C2 uncounted-pile partial harvest KEEPS pile + added
  "Clear the barge" button (clearBarge, undoable); H1 uncounted fill-from-barge empties barge (stops
  child-minting); H2 migration rescues batches off legacy detached-but-filled cages; H3 clamp
  estimate-today integration to MAX_PROJECTION_DAYS + guard negative daysSince; H4 parseCount() integer
  counts on harvest+fill; M1 applyPileLevel from live DOM via rAF; M2 scope click-suppressor to cages +
  rAF-throttle scroll syncPopup; L3 guard empty-batchId in lineageEvents.
  Browser re-test: C2 keeps pile ✓, H1 empties ✓, H4 "2.4"->2 ✓, clearBarge ✓.
  Skipped (confirmed non-bugs by reviewer): M3 label-dedup (cosmetic), M4, M5; L1/L2/L4/L5.
  NOTE: "load Brightside demo" creates exactly 1 farm/click (button is onboarding-only); confirmed init()
  clean + fresh load = onboarding (v7-01). The multi-farm counts during testing were my repeated debug calls.
- NEXT: commit index.html + rebuild docs + README/DIRECTORY to main -> Pages deploy -> verify live ->
  update DEPENDENCY_MAP + memory.
- Git: remote philipinosis/spatmap, branch main. `index.html` is the GitHub Pages deploy target
  (currently deleted in working tree; index-3..6.html are untracked). Build fresh index.html; commit at P7.
- Visual grounding (my read of screenshots, to judge design output):
  - DROP: dark-teal dense look; Acre->Quarter(Q1-Q4)->Line->tiny-dot hierarchy; 9px dot targets;
    cage-sheet leads with CAGE TYPE dropdown (actions below fold); FAB floats over content.
  - KEEP direction: cages rendered as glyphs ALONG a line (the plot view), big tap targets,
    actions-first, clear stat readouts. Go light/sun-readable, flat (Farm->Lines->Cages).
