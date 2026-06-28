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
