// Acceptance harness for the friction-fix build.
// Each fix appends ONE test() below (between the markers). A test gets a fresh
// booted page (clean state). Run: node verify-fixes.mjs   (exit 0 = all pass)
//
// Helpers available to every test:
//   ctx.page      - Playwright page, app loaded, window.SpatMapDebug ready
//   ctx.context   - browser context (e.g. ctx.context.setOffline(true))
//   ctx.errors    - array of JS console/page errors seen so far
//   assert(cond, msg)
// All top-level app functions are window globals, callable in page.evaluate.

import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');

const TESTS = [];
function test(id, fn) { TESTS.push({ id, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

async function boot(deviceName = 'iPhone 14 Pro Max') {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices[deviceName], acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug && typeof window.SpatMapDebug.getFarm === "function"', { timeout: 10000 });
  return { browser, context, page, errors, assert };
}

// ===================== TESTS APPENDED BELOW =====================

// T1 — shared pure helpers (fmtMoney, tubEntries/tubValue/tubInventoryByGrade, entryPrice/entryRevenue).
// Helpers are added unused; this just exercises them as page globals against the Brightside tub.
test('T1-helpers', async (ctx) => {
  const { page, errors, assert } = ctx;
  const r = await page.evaluate(() => {
    SpatMapDebug.loadBrightside();                 // tub = { state:'pile', count:3200, grade:'Standard' }
    const f = SpatMapDebug.getFarm();
    f.settings = f.settings || {};
    f.settings.gradePrices = { Standard: 1.25 };    // 3200 × 1.25 = 4000
    SpatMapDebug.save();
    SpatMapDebug.render();
    return {
      tubVal: tubValue(f).value,
      stdInv: tubInventoryByGrade(f).Standard,
      m1680: fmtMoney(1680),
      m0: fmtMoney(0),
      mNull: fmtMoney(null),
      entryRevType: typeof entryRevenue
    };
  });
  assert(r.tubVal === 4000, 'tubValue(f).value should be 4000, got ' + r.tubVal);
  assert(r.stdInv >= 3200, 'tubInventoryByGrade(f).Standard should be >= 3200, got ' + r.stdInv);
  assert(r.m1680 === '$1,680', 'fmtMoney(1680) should be "$1,680", got ' + r.m1680);
  assert(r.m0 === '$0', 'fmtMoney(0) should be "$0", got ' + r.m0);
  assert(r.mNull === '—', 'fmtMoney(null) should be "—", got ' + r.mNull);
  assert(r.entryRevType === 'function', 'entryRevenue should be a function, got ' + r.entryRevType);
  assert(errors.length === 0, 'no JS errors expected on boot/render, got: ' + errors.join(' | '));
});

// T2 — "Work" segment on the read-only OVERVIEW routes into the drag-select WORK map.
// A "Work" .ovSegBtn is appended to the overview seg ([Map|Data] → [Map|Data|Work]) and to the
// Data sub-tab seg. It calls toggleOverviewWork('work') (viewMode→'work', pushView, no homeMode
// mutation). Pre-fix the overview had no tap route into the work map, so the hasWork assert fails.
test('T2-nav', async (ctx) => {
  const { page, errors, assert } = ctx;

  await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    SpatMapDebug.save();
    SpatMapDebug.enterOverview();
  });
  await page.waitForSelector('.ovSegBtn', { timeout: 5000 });

  // on the read-only overview, and the new tap route exists
  assert(await page.evaluate(() => SpatMapDebug.getViewMode()) === 'overview', 'should start on the overview');
  const hasWork = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ovSegBtn')).some(b => b.textContent.trim() === 'Work'));
  assert(hasWork, 'a "Work" .ovSegBtn should exist on the overview (the missing tap route)');

  // tap Work → the drag-select work map
  await page.locator('.ovSegBtn').filter({ hasText: 'Work' }).first().tap();
  await page.waitForSelector('#mapwell', { timeout: 5000 });

  assert(await page.evaluate(() => SpatMapDebug.getViewMode()) === 'work', 'Work seg should land in the work map');
  const counts = await page.evaluate(() => ({
    well:  !!document.querySelector('#mapwell'),
    lines: document.querySelectorAll('#mapwell .cageStrip[data-line-id]').length,
    cages: document.querySelectorAll('#mapwell .cage[data-cage-id]').length
  }));
  assert(counts.well, '#mapwell should be present');
  assert(counts.lines >= 1, 'work map should have >=1 line strip, got ' + counts.lines);
  assert(counts.cages >= 2, 'work map should have >=2 cages, got ' + counts.cages);

  // tap two distinct SAME-STATE cages (both filled, or both empty) → multi-cage selection + action popup.
  // A mixed selection shows only a label (no .pbtn), so pick a same-state pair to exercise the buttons.
  const ids = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('#mapwell .cage[data-cage-id]'));
    const filled = [], empty = [];
    cells.forEach(c => {
      const f = c.querySelector('.cellfill');
      (f && f.classList.contains('empty') ? empty : filled).push(c.getAttribute('data-cage-id'));
    });
    return (filled.length >= 2 ? filled : empty).slice(0, 2);
  });
  assert(ids.length === 2, 'need two same-state cages to select, got ' + ids.length);
  for (const id of ids) await page.locator('#mapwell .cage[data-cage-id="' + id + '"]').first().tap();
  await page.waitForSelector('#popupMount .popup', { timeout: 5000 });

  const sel = await page.evaluate(() => ({
    selCount: document.querySelectorAll('.cage.sel').length,
    pbtns:    document.querySelectorAll('#popupMount .popup .pbtn').length
  }));
  assert(sel.selCount === 2, 'two cages should be selected, got ' + sel.selCount);
  assert(sel.pbtns >= 1, 'multi-cage action popup should show .pbtn buttons, got ' + sel.pbtns);

  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T3 — dashboard "$ on the water" INCLUDES priced tub stock and renders EXACT dollars (fmtMoney),
// not fmtCompact's "$1.7k". Pre-fix: the tub value was excluded (so "$0" while $4k sat in the tub) AND
// the headline was rounded. Dashboard surfaces only — harvest-log/cohort/CSV revenue is a separate task.
test('T3-dashboard-money', async (ctx) => {
  const { page, errors, assert } = ctx;
  const r = await page.evaluate(() => {
    SpatMapDebug.loadBrightside();                  // tub = 3200 Standard
    const f = SpatMapDebug.getFarm();
    f.settings = f.settings || {};
    f.settings.gradePrices = { Standard: 1.25 };    // 3200 × 1.25 = 4000
    SpatMapDebug.save();
    // null every on-line batch → only the tub carries value now (tub adds on top of cages)
    (f.lines || []).forEach(function(line){
      ((line && line.cages) || []).forEach(function(c){ if (c) c.batch = null; });
    });
    SpatMapDebug.save();
    const d = farmDashboard(f);
    // render the REAL dashboard card and read the money headline by its real class (.dc-money .dc-big)
    const card = renderDashboardCard(f);
    document.body.appendChild(card);
    const big = card.querySelector('.dc-money .dc-big');
    return {
      cropValue: d.cropValue,
      tubValue: d.tubValue,
      tubUnpriced: d.tubUnpriced,
      headline: big ? big.textContent.trim() : null
    };
  });
  // BEFORE this fix cropValue would be 0 — "$0 with $4k in tub"
  assert(r.cropValue === 4000, 'tub-only cropValue should be 4000, got ' + r.cropValue);
  assert(r.tubValue === 4000, 'farmDashboard(f).tubValue should be 4000, got ' + r.tubValue);
  assert(r.tubUnpriced === 0, 'priced tub → tubUnpriced should be 0, got ' + r.tubUnpriced);
  // exact grouped dollars in the headline, no "k"
  assert(r.headline === '$4,000', 'money headline should be exactly "$4,000", got ' + r.headline);
  assert(/^\$\d{1,3}(,\d{3})*$/.test(r.headline), 'headline must be exact dollars, no "k": ' + r.headline);
  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T4 — realized revenue BACKFILLS at display time. harvestFromBarge stamps revenue at sale time, but when
// prices are set/edited LATER (or data is imported) the harvest-log total, per-row $, cohort revenue, and CSV
// must recompute via entryRevenue (stamped value when present, else count × current grade price, else null).
// Pre-fix they read the stamped field only → "—"/0 even with a live price. harvestFromBarge itself unchanged.
test('T4-revenue-backfill', async (ctx) => {
  const { page, errors, assert } = ctx;

  // BEFORE prices: read the REAL demo log; its harvests carry no stamped price → entryRevenue is null for all.
  const before = await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    const f = SpatMapDebug.getFarm();
    const log = f.harvestLog || [];
    return {
      n: log.length,
      nullCount: log.filter(e => entryRevenue(f, e) == null).length,
      total: log.reduce((t, e) => { const r = entryRevenue(f, e); return t + (r == null ? 0 : r); }, 0)
    };
  });
  assert(before.n >= 1, 'Brightside should seed a harvest log, got ' + before.n);
  assert(before.nullCount === before.n, 'pre-price: every entry entryRevenue should be null, got ' + (before.n - before.nullCount) + ' priced');
  assert(before.total === 0, 'pre-price: total entryRevenue should be 0/null, got ' + before.total);

  // Set a price for every distinct grade present in the log, then commit.
  await page.evaluate(() => {
    const f = SpatMapDebug.getFarm();
    f.settings = f.settings || {};
    f.settings.gradePrices = f.settings.gradePrices || {};
    (f.harvestLog || []).forEach(e => { if (e.grade) f.settings.gradePrices[e.grade] = 1.00; });
    SpatMapDebug.save();
    SpatMapDebug.commit();
  });

  // AFTER: entryRevenue total matches an independent hand check, is > 0, and NO entry is null.
  const after = await page.evaluate(() => {
    const f = SpatMapDebug.getFarm();
    const expected = f.harvestLog.reduce((t, e) => t + (entryRevenue(f, e) || 0), 0);
    const hand = f.harvestLog.reduce((t, e) => t + (typeof e.revenue === 'number' ? e.revenue : (e.count || 0) * priceForGrade(f, e.grade)), 0);
    const nulls = f.harvestLog.filter(e => entryRevenue(f, e) == null).length;
    return { expected, hand, nulls };
  });
  assert(after.expected === after.hand, 'entryRevenue total ' + after.expected + ' should equal hand check ' + after.hand);
  assert(after.expected > 0, 'backfilled revenue total should be > 0, got ' + after.expected);
  assert(after.nulls === 0, 'no entry entryRevenue should be null after pricing, got ' + after.nulls + ' null');

  // Harvest Log UI: "Revenue to date" now shows an EXACT dollar string (has a digit, not "—", not fmtCompact "k").
  const revText = await page.evaluate(() => {
    openSheet(buildHarvestLog);
    const sheet = document.getElementById('sheet');
    const cards = Array.from(sheet.querySelectorAll('.card'));
    const card = cards.find(c => /Revenue to date/.test(c.textContent));
    const num = card && card.querySelector('.num');
    return num ? num.textContent.trim() : null;
  });
  assert(revText && /\$\d/.test(revText), '"Revenue to date" should show an exact dollar string, got ' + revText);
  assert(revText !== '—', '"Revenue to date" should no longer be "—"');
  assert(!/k$/.test(revText), '"Revenue to date" should be exact dollars, not fmtCompact "k", got ' + revText);

  // Cohort: Brightside harvests are unattributed (empty parentBatchIds) → unattributed revenue tally backfills > 0.
  const cohort = await page.evaluate(() => {
    const f = SpatMapDebug.getFarm();
    const cs = cohortStats(f);
    return {
      hasUnatt: !!cs.unattributed,
      unattRev: cs.unattributed ? cs.unattributed.revenue : 0,
      unattKnown: cs.unattributed ? cs.unattributed.revenueKnown : false
    };
  });
  assert(cohort.hasUnatt, 'Brightside harvests should land in the unattributed cohort tally');
  assert(cohort.unattKnown && cohort.unattRev > 0, 'unattributed cohort revenue should backfill to >0, got known=' + cohort.unattKnown + ' rev=' + cohort.unattRev);

  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T5 — pulls are NON-DESTRUCTIVE. Pulling cages of DIFFERENT (grade,size) used to pool them into one
// remainder pile that lied: grade collapsed to null and sizeMm collapsed to the MAX (60mm Jumbo + 82mm → 82),
// so a later quick-sale logged the wrong size at $0. Fix: a heterogeneous, fully-counted pull auto-carves into
// one self-contained barge.splits[] entry per (grade,size); homogeneous pulls still make ONE honest pile.
// HARD GATES verified here: count conservation (bargeTotalCount) and a clean snapBarge undo.
test('T5-pull-nondestructive', async (ctx) => {
  const { page, errors, assert } = ctx;

  // ── heterogeneous pull: 1000 Jumbo/60 + 1400 Standard/82 into an EMPTY tub ──
  const r = await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    const f = SpatMapDebug.getFarm();
    f.barge = freshBarge();                                  // empty tub, no pre-existing pile
    const filled = [];
    (f.lines || []).forEach(line => (line.cages || []).forEach(c => { if (c && c.batch) filled.push(c); }));
    const A = filled[0], B = filled[1];
    // strip later sized events so latestSize falls back to batch.sizeMm (deterministic)
    const stripSized = c => { c.events = (c.events || []).filter(ev => !(ev.type === 'growth' || ev.type === 'stocked' || ev.type === 'filled')); };
    A.batch.grade = 'Jumbo';    A.batch.sizeMm = 60; A.batch.count = 1000; stripSized(A);
    B.batch.grade = 'Standard'; B.batch.sizeMm = 82; B.batch.count = 1400; stripSized(B);
    SpatMapDebug.commit();

    const sumBefore = 1000 + 1400;
    const idA = A.id, idB = B.id;
    const lsA = latestSize(A), lsB = latestSize(B);          // sanity: must read batch.sizeMm now

    const undo = pullSelectedCages([idA, idB]);              // capture the returned guarded-undo

    const fb = SpatMapDebug.getFarm().barge;
    const out = {
      nFilled: filled.length, sumBefore, lsA, lsB,
      undoIsFn: typeof undo === 'function',
      splits: (fb.splits || []).map(s => ({ grade: s.grade, sizeMm: s.sizeMm, count: s.count })),
      bargeTotal: bargeTotalCount(fb),
      aEmpty: cageById(idA).batch === null,
      bEmpty: cageById(idB).batch === null
    };

    // UNDO via the returned closure → snapBarge restore must refill sources + empty the tub
    if (typeof undo === 'function') undo();
    const fa = SpatMapDebug.getFarm();
    const a2 = cageById(idA), b2 = cageById(idB);
    out.aRefilled = !!(a2 && a2.batch); out.aCount = a2 && a2.batch ? a2.batch.count : null;
    out.bRefilled = !!(b2 && b2.batch); out.bCount = b2 && b2.batch ? b2.batch.count : null;
    out.hasContentAfterUndo = bargeHasContent(fa.barge);
    return out;
  });

  assert(r.nFilled >= 2, 'Brightside should seed >=2 filled cages, got ' + r.nFilled);
  assert(r.lsA === 60 && r.lsB === 82, 'latestSize should read batch.sizeMm (60/82), got ' + r.lsA + '/' + r.lsB);
  assert(r.undoIsFn, 'pullSelectedCages should return an undo function');

  // structured fix: two splits, one per (grade,size) — NOT one collapsed pile
  assert(r.splits.length === 2, 'heterogeneous pull should carve into 2 splits, got ' + r.splits.length);
  const jumbo = r.splits.find(s => s.grade === 'Jumbo');
  const std   = r.splits.find(s => s.grade === 'Standard');
  assert(jumbo && jumbo.sizeMm === 60 && jumbo.count === 1000, 'Jumbo split should be {60mm, 1000}, got ' + JSON.stringify(jumbo));
  assert(std   && std.sizeMm   === 82 && std.count   === 1400, 'Standard split should be {82mm, 1400}, got ' + JSON.stringify(std));
  // the OLD bug must be gone: not both 82mm, not both null-grade
  assert(!(r.splits[0].sizeMm === 82 && r.splits[1].sizeMm === 82), 'size must not collapse to 82-for-both (the old MAX lie)');
  assert(!(r.splits[0].grade == null && r.splits[1].grade == null), 'grade must not collapse to null-for-both');

  // HARD GATE 1 — count conservation
  assert(r.bargeTotal === 2400, 'bargeTotalCount should conserve to 2400, got ' + r.bargeTotal);
  assert(r.aEmpty && r.bEmpty, 'source cages should be emptied by the pull');

  // HARD GATE 2 — undo fully reverts (refill sources, empty tub)
  assert(r.aRefilled && r.bRefilled, 'undo should refill both source cages');
  assert(r.aCount === 1000 && r.bCount === 1400, 'undo should restore source counts, got ' + r.aCount + '/' + r.bCount);
  assert(r.hasContentAfterUndo === false, 'undo should leave the tub empty, bargeHasContent should be false');

  // ── homogeneous control: same grade AND size → ONE pile, no splits (byte-for-byte legacy path) ──
  const h = await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    const f = SpatMapDebug.getFarm();
    f.barge = freshBarge();
    const filled = [];
    (f.lines || []).forEach(line => (line.cages || []).forEach(c => { if (c && c.batch) filled.push(c); }));
    const A = filled[0], B = filled[1];
    const stripSized = c => { c.events = (c.events || []).filter(ev => !(ev.type === 'growth' || ev.type === 'stocked' || ev.type === 'filled')); };
    A.batch.grade = 'Jumbo'; A.batch.sizeMm = 60; A.batch.count = 500; stripSized(A);
    B.batch.grade = 'Jumbo'; B.batch.sizeMm = 60; B.batch.count = 700; stripSized(B);
    SpatMapDebug.commit();
    pullSelectedCages([A.id, B.id]);
    const fb = SpatMapDebug.getFarm().barge;
    return { splitsLen: (fb.splits || []).length, state: fb.state, grade: fb.grade, sizeMm: fb.sizeMm, count: fb.count, bargeTotal: bargeTotalCount(fb) };
  });
  assert(h.splitsLen === 0, 'homogeneous pull should NOT create splits, got ' + h.splitsLen);
  assert(h.state === 'pile', 'homogeneous pull should make a single pile, state=' + h.state);
  assert(h.grade === 'Jumbo', 'homogeneous pile grade should be Jumbo, got ' + h.grade);
  assert(h.sizeMm === 60, 'homogeneous pile sizeMm should be 60, got ' + h.sizeMm);
  assert(h.count === 1200, 'homogeneous pile count should be 1200, got ' + h.count);
  assert(h.bargeTotal === 1200, 'homogeneous conservation should hold at 1200, got ' + h.bargeTotal);

  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T6 — harvest forecast folds the TUB in exactly ONCE (fixes B: "Inventory by grade" ignored the tub;
// C: split sub-batches had no projected market date and never appeared in the forecast). tubEntries() is
// the single source of tub stock, so the remainder + every split are counted once — splitting moves stock
// between them without changing the forecast total. projectMarketDate() dates a sized snapshot that is NOT
// a cage; split chips now carry that market hint.
test('T6-forecast-tub', async (ctx) => {
  const { page, errors, assert } = ctx;

  // ── projectMarketDate sanity + single-count BEFORE any split ──
  const a = await page.evaluate(() => {
    SpatMapDebug.loadBrightside();                 // tub = { pile, 3200 Standard @ 60mm }
    const f = SpatMapDebug.getFarm();
    SpatMapDebug.save();
    const market = f.settings.marketSizeMm;
    const today = todayISO();
    const s55 = projectMarketDate(f, 55, null);                // below market
    const sReady = projectMarketDate(f, market + 5, null);     // at/above market
    const fc = harvestForecast(f);
    const gradeTotal = fc.grades.reduce((t, g) => t + g.oysters, 0);
    const stdInv = (fc.grades.find(g => g.grade === 'Standard') || { oysters: 0 }).oysters;
    let cageSum = 0;
    (f.lines || []).forEach(l => (l.cages || []).forEach(c => {
      if (c && c.batch && typeof c.batch.count === 'number') cageSum += c.batch.count;
    }));
    const bargeTotal = bargeTotalCount(f.barge);
    return { market, today, s55, sReady, gradeTotal, stdInv, cageSum, bargeTotal };
  });

  // projectMarketDate sanity: at/above market → readyNow; below market → a future date OR honestly capped.
  assert(a.sReady.readyNow === true, 'a snapshot at/above market should be readyNow, got ' + JSON.stringify(a.sReady));
  const dateOk = (typeof a.s55.projectedDate === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(a.s55.projectedDate)
    && a.s55.projectedDate > a.today
    && a.s55.readyNow === false);
  assert(dateOk || a.s55.capped === true,
    'a 55mm (sub-market) snapshot should project a FUTURE date OR be capped, got ' + JSON.stringify(a.s55));

  // single-count: grade inventory total = on-line cage oysters + the whole tub, counted exactly once.
  // BEFORE this fix the tub was missing, so this equality failed (gradeTotal == cageSum only).
  assert(typeof a.bargeTotal === 'number', 'Brightside tub should be fully counted, bargeTotalCount got ' + a.bargeTotal);
  assert(a.gradeTotal === a.cageSum + a.bargeTotal,
    'forecast grade total ' + a.gradeTotal + ' should equal cages ' + a.cageSum + ' + tub ' + a.bargeTotal + ' (tub folded in once)');
  // the tub grade (Brightside tub is 3200 Standard) now shows up with >= its count
  assert(a.stdInv >= 3200, 'Standard grade inventory should include the 3200 tub, got ' + a.stdInv);

  // ── carve a split from the remainder → tubEntries covers remainder + split, so the total must NOT move ──
  const b = await page.evaluate(() => {
    splitBarge([{ count: 500, sizeMm: 55, grade: 'Standard', label: 'Grow-out' }]);
    const f = SpatMapDebug.getFarm();
    const fc = harvestForecast(f);
    return {
      gradeTotal: fc.grades.reduce((t, g) => t + g.oysters, 0),
      nSplits: (f.barge.splits || []).length,
      bargeTotal: bargeTotalCount(f.barge)
    };
  });
  assert(b.nSplits >= 1, 'splitBarge should add a split, got ' + b.nSplits);
  assert(b.bargeTotal === a.bargeTotal, 'splitting must conserve tub count, got ' + b.bargeTotal + ' vs ' + a.bargeTotal);
  assert(b.gradeTotal === a.gradeTotal,
    'splitting moves stock between remainder and split — grade total must be UNCHANGED, got ' + b.gradeTotal + ' vs ' + a.gradeTotal);

  // ── UI: the Grow-out split chip in the harvest sheet carries a market hint ──
  const chipText = await page.evaluate(() => {
    openSheet(function(){ return buildHarvestSheet(getFarm()); });
    const chips = Array.from(document.querySelectorAll('#sheet .batchChip'));
    const chip = chips.find(c => /Grow-out/.test(c.textContent));
    return chip ? chip.textContent : null;
  });
  assert(chipText, 'the Grow-out split should render a chip in the harvest sheet');
  assert(/ready now|≈|1\+ yr/.test(chipText), 'the split chip should show a market hint, got ' + JSON.stringify(chipText));

  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T7 — stock-on-hand CSV INCLUDES the tub. exportStockCSV() only walked farm.lines, so pulled,
// sale-ready stock sitting in the tub produced no rows at all (the user saw blank Grade/$). Now one
// row per tubEntries() entry is appended (Line='Tub'), priced via priceForGrade, with every cell
// flowed through the csvCell formula-injection guard. Pre-fix: no "Tub," line exists.
test('T7-stock-csv-tub', async (ctx) => {
  const { page, errors, assert } = ctx;
  const fs = await import('fs');

  // Brightside tub = 3200 Standard @ 60mm; price Standard at 1.25 → 3200 × 1.25 = 4000.00
  await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    const f = SpatMapDebug.getFarm();
    f.settings = f.settings || {};
    f.settings.gradePrices = { Standard: 1.25 };
    SpatMapDebug.save();
  });

  // export #1 — capture the downloaded CSV (boot context has acceptDownloads:true)
  const dlP = page.waitForEvent('download');
  await page.evaluate(() => exportStockCSV());
  const dl = await dlP;
  const csv = fs.readFileSync(await dl.path(), 'utf8');

  const tubLine = csv.split(/\r?\n/).find(l => /^Tub,/.test(l));
  assert(tubLine, 'a line starting with "Tub," should exist (BEFORE the fix: none)');
  assert(/Standard/.test(tubLine), 'the tub row should carry its grade (Standard), got: ' + tubLine);
  const cells = tubLine.split(',');                       // remainder label has no comma → safe split
  assert(cells[cells.length - 1] === '4000.00',
    'tub Est-$ cell should be 4000.00 (3200×1.25), got: ' + cells[cells.length - 1] + ' | ' + tubLine);

  // ── formula-injection: a malicious split value must be neutralized by csvCell, never executable.
  // (tubEntries wraps split LABELS as "Tub · …", which already defuses a leading "=", so to prove the
  // csvCell quote-prefix guard fires on real export output we target the unwrapped Grade column too.) ──
  await page.evaluate(() => {
    const f = SpatMapDebug.getFarm();
    f.barge.splits.push({ id:'x', count:10, sizeMm:60, grade:'=cmd()', label:'=cmd()',
      ploidy:null, hatchery:'', origin:null, parentBatchId:null });
    SpatMapDebug.save();
  });
  const dlP2 = page.waitForEvent('download');
  await page.evaluate(() => exportStockCSV());
  const dl2 = await dlP2;
  const csv2 = fs.readFileSync(await dl2.path(), 'utf8');

  assert(/'=cmd\(\)/.test(csv2), 'csvCell should quote-prefix the malicious value (expected "\'=cmd()")');
  assert(!/(^|,)=cmd\(\)/m.test(csv2), 'no raw "=cmd()" may sit at a cell start (would be an executable formula)');

  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T8 — seed-source scorecard groups by HATCHERY NAME ONLY. seedCohortId is minted fresh per fill,
// so grouping by (hatchery, seedCohortId) fragmented ONE hatchery into many cards titled by raw uids
// ("XMKMQ0DFH5D6HZY"). Fix groups by hatchery and titles the card with the hatchery name, never the
// hash. seedCohortId stays stamped/persisted (cohort highlight still uses it) — it is just no longer a
// grouping dimension or a card title. Here we force every stocked batch onto ONE hatchery while KEEPING
// distinct seedCohortIds (the exact shape that used to fragment) and assert one Acme card, no hash titles.
test('T8-cohort-grouping', async (ctx) => {
  const { page, errors, assert } = ctx;
  const eyebrows = await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    const f = SpatMapDebug.getFarm();
    // simulate many fills of the same hatchery: same hatchery name, distinct seedCohortIds left intact
    (f.batches || []).forEach(b => { b.hatchery = 'Acme Hatchery'; });
    (f.lines || []).forEach(l => (l.cages || []).forEach(c => { if (c.batch) c.batch.hatchery = 'Acme Hatchery'; }));
    SpatMapDebug.save();
    SpatMapDebug.render();
    openSheet(buildCohortScorecard);
    return Array.from(document.querySelectorAll('#sheet .card .eyebrow')).map(e => e.textContent.trim());
  });

  // .eyebrow uppercases via CSS (text-transform) — compare against the uppercased form
  const up = eyebrows.map(t => t.toUpperCase());
  const acme = up.filter(t => t.includes('ACME HATCHERY'));
  assert(acme.length === 1,
    'exactly ONE eyebrow should read "ACME HATCHERY" (one card per hatchery, not per fill), got ' + acme.length + ' of ' + JSON.stringify(eyebrows));
  const hashLeak = up.filter(t => /\bX[A-Z0-9]{10,}\b/.test(t));
  assert(hashLeak.length === 0,
    'no eyebrow should leak a raw seedCohortId uid as a title (the old hash-title bug), got ' + JSON.stringify(hashLeak));

  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T9 — cold-start RESTORE. After a wipe/reinstall the first-run onboarding (step 0) must offer a way back
// to a backup, or the offline safety net is unreachable. A "Restore from backup" button is added to step 0
// that reuses the EXISTING importer (triggerImport) verbatim — non-destructive dry-run + ':prev' snapshot
// untouched. Here we capture a real backup, wipe to a true cold start, reload into onboarding, assert the
// control exists (fails pre-fix), feed the backup through the file chooser, and assert the farm comes back.
test('T9-coldstart-import', async (ctx) => {
  const { page, errors, assert } = ctx;

  // capture a real backup blob from a seeded farm
  await page.evaluate(() => SpatMapDebug.loadBrightside());
  const backup = await page.evaluate(() => localStorage.getItem('cageTrackerData'));
  assert(backup && backup.length > 0, 'should have captured a backup blob, got ' + (backup && backup.length));

  // wipe to a true cold start and reload into onboarding
  await page.evaluate(() => { SpatMapDebug.state.farms = []; localStorage.removeItem('cageTrackerData'); });
  await page.reload();
  await page.waitForFunction('window.SpatMapDebug');

  // the restore control exists on the first-run screen (this fails pre-fix)
  const restore = page.getByRole('button', { name: /restore from backup/i });
  await restore.waitFor({ timeout: 5000 });

  // drive it: accept the import confirm, then feed the backup through the file chooser
  page.on('dialog', d => d.accept());
  const fs = await import('fs'), os = await import('os'), path = await import('path');
  const tmp = path.join(os.tmpdir(), 'spatmap-restore-' + Date.now() + '.json');
  fs.writeFileSync(tmp, backup);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    restore.click()
  ]);
  await chooser.setFiles(tmp);

  // the farm came back through the existing importer
  await page.waitForFunction(
    () => SpatMapDebug.state.farms.length === 1 && SpatMapDebug.state.farms[0].name === 'Brightside Oyster Co.',
    { timeout: 5000 });

  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T10 — OFFLINE risk insight. The Water-conditions sheet's risk flags (heat / Vibrio / spawn / near-stall /
// low-salinity) used to render ONLY on the online USGS path; offline it showed raw charts with no flags, even
// though the temp/salinity needed to compute them is already on-device. The fix extracts the insight-card
// builder and runs it in paintFromLog too (reshape the on-device log like stockAdvisory, condDailyAgg →
// condInsights). Here we seed a WARM on-device log over 7 distinct UTC days, go offline, open the sheet, and
// assert the offline card shows the flags. Pre-fix this fails (no flags offline).
test('T10-offline-risk', async (ctx) => {
  const { page, errors, assert } = ctx;

  // seed: pick the conditions site + a warm on-device conditions log spanning 7 distinct UTC days.
  // Each day gets a cool-ish morning sample and a hot afternoon sample so daily min<max:
  //   avg temp well over 20 °C   → Vibrio season
  //   afternoon max 30 °C (>28)  → heat-stress days
  //   min ≤27 °C and max ≥25 °C  → spawning window hit
  await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    condSetSite({ id:'07380249', name:'Caminada Pass', state:'LA', lat:29.23, lng:-90.04 });
    const DAY = 86400000;
    const base = Date.UTC(2026, 5, 1, 6, 0, 0);   // 2026-06-01 06:00 UTC
    const log = [];
    for (let i = 0; i < 7; i++){
      const d0 = base + i * DAY;
      log.push({ ms: d0,                  t: 26, s: 22, g: 1.2 });   // warm morning
      log.push({ ms: d0 + 8 * 3600000,    t: 30, s: 21, g: 1.3 });   // afternoon peak >28°C
    }
    const all = condLSget(COND_K_HIST) || {};
    all['07380249'] = log;
    condLSset(COND_K_HIST, all);
  });

  // go offline so the USGS fetch rejects and the sheet falls back to the on-device painter
  await ctx.context.setOffline(true);
  await page.evaluate(() => openSheet(buildCondHistory));
  await page.waitForSelector('#sheet', { timeout: 5000 });
  // the offline partial-record note proves paintFromLog ran (the USGS fetch rejected)
  await page.waitForFunction(
    () => /partial on-device record/i.test((document.getElementById('sheet') || {}).innerText || ''),
    { timeout: 10000 });

  const txt = await page.evaluate(() => document.getElementById('sheet').innerText);
  assert(/vibrio/i.test(txt), 'offline insight card should flag Vibrio season, got: ' + txt.slice(0, 500));
  assert(/heat/i.test(txt),   'offline insight card should flag Heat-stress days, got: ' + txt.slice(0, 500));
  assert(/spawn/i.test(txt),  'offline insight card should flag the Spawning window, got: ' + txt.slice(0, 500));

  await ctx.context.setOffline(false);
  // Being offline makes the real USGS fetch fail — that browser-level "Failed to load resource /
  // ERR_INTERNET_DISCONNECTED" console log is this test's own premise, not an app fault. Assert no OTHER
  // (real JS) errors leaked from rendering the offline card.
  const jsErrors = errors.filter(e => !/Failed to load resource|ERR_INTERNET_DISCONNECTED|ERR_NETWORK|net::ERR/i.test(e));
  assert(jsErrors.length === 0, 'no JS errors expected (offline network noise aside), got: ' + jsErrors.join(' | '));
});

// T11a — Work sheet ordering. The "Work again reminder" (interval chips + date picker) is hoisted ABOVE the
// "Log a handling" method chips, so "tumbled + 2 weeks" needs no scroll. Handling chips still submit on tap.
test('T11a-worksheet', async (ctx) => {
  const { page, errors, assert } = ctx;

  await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    const f = SpatMapDebug.getFarm();
    let id = null;
    (f.lines || []).forEach(l => (l.cages || []).forEach(c => { if (c && c.batch && !id) id = c.id; }));
    SpatMapDebug.save();
    openSheet(function(){ return buildWorkSheet([id]); });
  });
  await page.waitForSelector('#sheet', { timeout: 5000 });

  const reminder = page.locator('#sheet').getByText('Work again reminder', { exact: true });
  const handling = page.locator('#sheet').getByText('Log a handling', { exact: true });
  await reminder.waitFor({ timeout: 5000 });
  await handling.waitFor({ timeout: 5000 });
  const rBox = await reminder.boundingBox();
  const hBox = await handling.boundingBox();
  assert(rBox && hBox, 'both the reminder and the handling labels should render');
  assert(rBox.y < hBox.y,
    '"Work again reminder" (y=' + (rBox && rBox.y) + ') should render ABOVE "Log a handling" (y=' + (hBox && hBox.y) + ')');

  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T11b — Fill form sticky commit. buildFillSeedForm's primary commit row is a sticky footer (.btnRow.sheet-commit),
// so the "Fill N cage(s)" button stays in view even scrolled to the top of the optional fields.
test('T11b-fillbutton', async (ctx) => {
  const { page, errors, assert } = ctx;

  await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    const f = SpatMapDebug.getFarm();
    let cell = null;
    (f.lines || []).forEach(l => (l.cages || []).forEach(c => { if (c && !cell) cell = c; }));
    if (cell) cell.batch = null;          // ensure the cage is empty → the new-seed Fill form is the right path
    SpatMapDebug.save();
    openSheet(function(){ return buildFillSeedForm([cell.id]); });
  });
  await page.waitForSelector('#sheet', { timeout: 5000 });

  // wait for the sheet's slide-in transform to settle so getBoundingClientRect is the resting position
  await page.waitForFunction(() => {
    const s = document.getElementById('sheet');
    if (!s) return false;
    const t = getComputedStyle(s).transform;
    if (t === 'none') return true;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return true;
    const p = m[1].split(',').map(Number);
    return Math.abs(p[5] || 0) < 0.5;     // translateY ≈ 0 → settled
  }, { timeout: 5000 });

  // scroll the sheet to the TOP (the optional Notes/Photos/Date), away from the commit row
  await page.evaluate(() => { const s = document.getElementById('sheet'); if (s) s.scrollTop = 0; });

  const r = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const btn = Array.from(sheet.querySelectorAll('button')).find(b => /^Fill \d+ cage/.test(b.textContent.trim()));
    if (!btn) return { found: false };
    const row = btn.closest('.btnRow');
    const rect = btn.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return {
      found: true,
      pos: row ? getComputedStyle(row).position : null,
      hasClass: !!(row && row.classList.contains('sheet-commit')),
      inView: rect.height > 0 && rect.top >= 0 && rect.bottom <= vh + 2,
      top: Math.round(rect.top), bottom: Math.round(rect.bottom), vh
    };
  });
  assert(r.found, 'the "Fill N cage(s)" commit button should render');
  assert(r.hasClass, 'the commit row should carry the sheet-commit class');
  assert(r.pos === 'sticky', 'the commit row should compute position:sticky, got ' + r.pos);
  assert(r.inView, 'scrolled to top, the Fill button should stay in viewport (top=' + r.top + ' bottom=' + r.bottom + ' vh=' + r.vh + ')');

  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T11c — secondary-text contrast. --ink-3 is raised to #8aa0a6 (brighter blue-gray, hue kept, dark theme intact).
test('T11c-contrast', async (ctx) => {
  const { page, errors, assert } = ctx;
  const r = await page.evaluate(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ink-3').trim().toLowerCase();
    function relLum(hex){
      const h = hex.replace('#', '');
      const ch = i => parseInt(h.slice(i, i + 2), 16) / 255;
      const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * lin(ch(0)) + 0.7152 * lin(ch(2)) + 0.0722 * lin(ch(4));
    }
    return { v, newLum: relLum('#8aa0a6'), oldLum: relLum('#6e888f') };
  });
  assert(r.v === '#8aa0a6', "--ink-3 should be '#8aa0a6', got '" + r.v + "'");
  assert(r.newLum > r.oldLum, 'new --ink-3 luminance ' + r.newLum.toFixed(4) + ' should exceed old ' + r.oldLum.toFixed(4));
  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// T11d — growth calendar no longer overstates winter "fitted" confidence. A near-stall month (Jan/Feb/Dec)
// fed ONLY by long fall→winter→spring intervals (laundered evidence) is floored toward the stall and NOT
// flagged fitted. fittedMonths[] is the parallel boolean the card reads.
test('T11d-growthcal', async (ctx) => {
  const { page, errors, assert } = ctx;
  const r = await page.evaluate(() => {
    SpatMapDebug.loadBrightside();
    const f = SpatMapDebug.getFarm();
    // launder evidence: ONLY one long fall→winter→spring growth interval on several cages
    let touched = 0;
    (f.lines || []).forEach(l => (l.cages || []).forEach(c => {
      if (!c || touched >= 8) return;
      c.events = [];
      c.events.push({ type: 'growth', date: '2025-09-15', sizeMm: 20 });
      c.events.push({ type: 'growth', date: '2026-03-15', sizeMm: 55 });
      touched++;
    }));
    delete f._seasonMult;
    const fit = fittedSeasonMult(f);
    return { touched, hasFM: Array.isArray(fit.fittedMonths), janFitted: fit.fittedMonths && fit.fittedMonths[0], jan: fit[0] };
  });
  assert(r.touched >= 6, 'need >=6 laundered cages to exercise the near-stall path, got ' + r.touched);
  assert(r.hasFM, 'fittedSeasonMult should attach a fittedMonths[] array');
  assert(r.janFitted === false, 'January must NOT be claimed fitted under laundered winter-spanning evidence, got ' + r.janFitted);
  assert(r.jan < 0.6, 'January should be floored toward the stall (<0.6), not ~1.0, got ' + r.jan);
  assert(errors.length === 0, 'no JS errors expected, got: ' + errors.join(' | '));
});

// ===================== END TESTS =====================

let pass = 0, fail = 0;
for (const t of TESTS) {
  let ctx;
  try {
    ctx = await boot();
    await t.fn(ctx);
    console.log('PASS  ' + t.id);
    pass++;
  } catch (e) {
    console.log('FAIL  ' + t.id + '  —  ' + e.message);
    fail++;
  } finally {
    if (ctx) await ctx.browser.close().catch(() => {});
  }
}
console.log(`\n${pass}/${pass + fail} acceptance tests passed`);
process.exit(fail ? 1 : 0);
