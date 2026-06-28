// verify-nav.mjs — settle "overview→work is unreachable by tapping".
// REAL touch taps (page.touchscreen.tap) at computed centers + clean teardown between attempts.
// Scenarios: fresh (real onboarding wizard, laid-out) + brightside. Devices: SE + 14PM.
// Output: tests/reports/shots/verify-nav/*.png + tests/reports/verify-nav.json

import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const SHOTS = join(HERE, 'reports', 'shots', 'verify-nav');
mkdirSync(SHOTS, { recursive: true });
const TARGETS = ['iPhone SE', 'iPhone 14 Pro Max'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function navState(page) {
  return page.evaluate(() => {
    const D = window.SpatMapDebug;
    const f = D.getFarm();
    const ls = D.layoutState ? D.layoutState() : {};
    const crumbEl = document.getElementById('lpCrumb');
    const crumb = crumbEl && !crumbEl.hidden ? (crumbEl.textContent || '').replace(/\s+/g, ' ').trim() : '';
    let scopedPlot = null, scopedArea = null;
    try { scopedPlot = !!(typeof isScopedIntoPlot === 'function' && isScopedIntoPlot(f)); } catch (e) {}
    try { scopedArea = !!(typeof isScopedIntoArea === 'function' && isScopedIntoArea(f)); } catch (e) {}
    const sheet = document.getElementById('sheet');
    const sheetTxt = (sheet && sheet.getBoundingClientRect().height > 0 ? (sheet.innerText || '') : '').replace(/\s+/g, ' ').trim().slice(0, 110);
    const peek = document.getElementById('oysterPeek');
    const peekVis = !!(peek && peek.getBoundingClientRect().width > 0 && getComputedStyle(peek).display !== 'none' && parseFloat(getComputedStyle(peek).opacity) > 0.05);
    return {
      viewMode: D.getViewMode(), homeMode: D.getHomeMode(),
      scope: D.getScope() ? { plotId: D.getScope().plotId, areaId: D.getScope().areaId } : null,
      tier: ls.tier, k: ls.view ? +ls.view.k.toFixed(3) : null,
      scopedPlot, scopedArea, crumb,
      mapwell: !!document.getElementById('mapwell'),
      sheetTxt, peekVis,
      plots: f ? (f.plots || []).length : 0,
    };
  });
}

async function enumerate(page) {
  return page.evaluate(() => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; };
    const uniq = (arr) => arr.filter((a, i) => arr.findIndex(b => b.id === a.id) === i);
    const grab = (sel, attr) => Array.from(document.querySelectorAll(sel)).filter(el => el.getBoundingClientRect().width > 1).map(el => ({ id: el.getAttribute(attr), ...box(el) }));
    return {
      plots: uniq(grab('#layoutWorld > [data-plot-id]', 'data-plot-id')),
      areas: uniq(grab('#layoutWorld [data-area-id].lp-areabody', 'data-area-id')),
      cages: uniq(grab('#layoutWorld [data-cage-id]', 'data-cage-id')),
      seg: Array.from(document.querySelectorAll('.ovSegBtn')).map(b => b.textContent.trim()),
      topBtns: Array.from(document.querySelectorAll('.topbar button')).map(b => (b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 20)),
      openChips: document.querySelectorAll('.lp-openchip').length,
    };
  });
}

// hard reset to a clean all-plots overview: kill any sheet/peek, re-enter, re-fit
async function clean(page) {
  await page.evaluate(() => {
    try { closeSheet(); } catch (e) {}
    try { window.SpatMapDebug.hidePeek(); } catch (e) {}
    try { if (typeof clearCageHighlight === 'function') clearCageHighlight(); } catch (e) {}
    window.SpatMapDebug.enterOverview();
  });
  await sleep(500);
}

// drive the REAL 5-step onboarding wizard, then Finish the first-run layout editor
async function makeFreshFarm(page) {
  await page.evaluate(() => { try { window.SpatMapDebug.state.farms = []; } catch (e) {} localStorage.removeItem('cageTrackerData'); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug');
  await sleep(250);
  const onboardingShown = await page.evaluate(() => !!document.querySelector('.onboardWrap, .obWelcome, .obBody'));
  // step loop: fill any text input, tap the step's primary button, until the layout editor (Finish) appears
  const PRIMARY = [/build my farm/i, /^next$/i, /create farm/i];
  for (let i = 0; i < 8; i++) {
    // are we in the first-run editor yet?
    const inEditor = await page.evaluate(() => window.SpatMapDebug.getViewMode() === 'layout');
    if (inEditor) break;
    await page.evaluate(() => {
      const tin = document.querySelector('#app input[type="text"]');
      if (tin && !tin.value.trim()) { tin.value = 'Test Farm'; tin.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    let tapped = false;
    for (const re of PRIMARY) {
      const b = page.getByRole('button', { name: re }).first();
      if (await b.count() && await b.isVisible().catch(() => false)) {
        await b.tap({ timeout: 3000 }).catch(async () => { await b.click({ timeout: 3000 }).catch(() => {}); });
        tapped = true; break;
      }
    }
    await sleep(350);
    if (!tapped) break;
  }
  // Finish the guided editor
  const fin = page.getByRole('button', { name: /^finish$/i }).first();
  if (await fin.count()) await fin.tap({ timeout: 3000 }).catch(async () => { await fin.click().catch(() => {}); });
  await sleep(500);
  return { onboardingShown, plots: await page.evaluate(() => (window.SpatMapDebug.getFarm()?.plots || []).length) };
}

async function loadBrightside(page) {
  await page.evaluate(() => { window.SpatMapDebug.loadBrightside(); window.SpatMapDebug.save(); window.SpatMapDebug.enterOverview(); });
  await sleep(500);
}

async function runScenario(deviceName, scenario) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices[deviceName] });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug');

  const tag = `${deviceName.replace(/\s+/g, '')}-${scenario}`;
  const log = { device: deviceName, scenario, errors, attempts: [] };

  if (scenario === 'fresh') log.setup = await makeFreshFarm(page);
  else await loadBrightside(page);

  await clean(page);
  log.landing = await navState(page);
  log.enum = await enumerate(page);
  await page.screenshot({ path: join(SHOTS, `${tag}-00-overview.png`) });

  async function attempt(name, fn, shot) {
    const before = await navState(page);
    let note = '';
    try { note = (await fn()) || ''; } catch (e) { note = 'ERR ' + String(e).slice(0, 110); }
    await sleep(450);
    const after = await navState(page);
    const key = (s) => [s.viewMode, JSON.stringify(s.scope), s.tier, s.k, s.mapwell, s.sheetTxt, s.peekVis, s.scopedPlot, s.scopedArea].join('|');
    const rec = { name, note, before: pick(before), after: pick(after), changed: key(before) !== key(after) };
    log.attempts.push(rec);
    if (shot) await page.screenshot({ path: join(SHOTS, `${tag}-${shot}.png`) }).catch(() => {});
    return after;
  }
  const pick = (s) => ({ v: s.viewMode, scope: s.scope, tier: s.tier, k: s.k, sP: s.scopedPlot, sA: s.scopedArea, crumb: s.crumb, mapwell: s.mapwell, sheet: s.sheetTxt, peek: s.peekVis });

  // === GROUP A: progressive tap-to-zoom (re-read centers each tap, log k) ===
  await clean(page);
  for (let i = 1; i <= 4; i++) {
    const e = await enumerate(page);
    const t = e.areas[0] || e.plots[0];
    if (!t) { log.attempts.push({ name: `A${i}: nothing to tap`, note: `plots=${e.plots.length} areas=${e.areas.length}`, changed: false }); break; }
    const st = await navState(page);
    await attempt(`A${i}: touchscreen.tap @ ${e.areas[0] ? 'area' : 'plot'} center (${t.x},${t.y}) [pre sP=${st.scopedPlot} sA=${st.scopedArea} k=${st.k}]`,
      async () => { await page.touchscreen.tap(t.x, t.y); return `tap ${t.id}`; }, `A${i}-tap`);
    // stop once a sheet opened or we hit a stable scopedArea peek
    const now = await navState(page);
    if (now.sheetTxt) break;
  }

  // === GROUP B: reach area level, then two-tap a CAGE → cage sheet (stocking) ===
  await clean(page);
  // zoom to area level by tapping until scopedArea
  for (let i = 0; i < 4; i++) {
    const s = await navState(page);
    if (s.scopedArea) break;
    const e = await enumerate(page);
    const t = e.areas[0] || e.plots[0]; if (!t) break;
    await page.touchscreen.tap(t.x, t.y); await sleep(450);
  }
  let e = await enumerate(page);
  if (e.cages[0]) {
    const id = e.cages[0].id;
    await attempt('B1: tap cage (1st) → peek', async () => { const cg = (await enumerate(page)).cages.find(c => c.id === id); await page.touchscreen.tap(cg.x, cg.y); return `tap ${id}`; }, 'B1-cage1');
    await attempt('B2: tap SAME cage (2nd) → cage/stock sheet', async () => { const cg = (await enumerate(page)).cages.find(c => c.id === id) || (await enumerate(page)).cages[0]; await page.touchscreen.tap(cg.x, cg.y); return `tap ${id} again`; }, 'B2-cage2-sheet');
  } else {
    log.attempts.push({ name: 'B: no cage at area level', note: `cages=${e.cages.length}`, changed: false });
  }

  // === GROUP C: at area level, tap AREA BODY (not a cage) → expect no-op ===
  await clean(page);
  for (let i = 0; i < 4; i++) { const s = await navState(page); if (s.scopedArea) break; const ee = await enumerate(page); const t = ee.areas[0] || ee.plots[0]; if (!t) break; await page.touchscreen.tap(t.x, t.y); await sleep(450); }
  {
    // tap near the area's top-left label band (likely area body, not a cell center)
    const ee = await enumerate(page);
    const a = ee.areas[0];
    if (a) {
      const x = a.x - Math.round(a.w * 0.35), y = a.y - Math.round(a.h * 0.35);
      await attempt('C1: tap area BODY corner (not a cage)', async () => { await page.touchscreen.tap(x, y); return `tap body @(${x},${y})`; }, 'C1-areabody');
    }
  }

  // === GROUP D: legacy harness method — element.tap() on SVG cage group ===
  await clean(page);
  {
    const before = await navState(page);
    let note = '';
    try {
      const loc = page.locator('#layoutWorld [data-cage-id]').first();
      if (await loc.count()) { await loc.tap({ timeout: 2500 }); note = 'element.tap() on [data-cage-id] succeeded'; }
      else note = 'no [data-cage-id] rendered at this framing';
    } catch (err) { note = 'element.tap() threw: ' + String(err).split('\n')[0].slice(0, 90); }
    await sleep(400);
    const after = await navState(page);
    const key = (s) => [s.viewMode, JSON.stringify(s.scope), s.k, s.mapwell, s.sheetTxt, s.peekVis].join('|');
    log.attempts.push({ name: 'D1: element.tap() on SVG child (OLD harness path)', note, before: pick(before), after: pick(after), changed: key(before) !== key(after) });
  }

  // === GROUP E: the only tappable map→work route — [Map|Data] → area card "Open" drill ===
  await clean(page);
  {
    const before = await navState(page);
    let note = [];
    const dataBtn = page.getByRole('button', { name: /^data$/i }).first();
    if (await dataBtn.count()) { await dataBtn.tap().catch(() => {}); note.push('tapped Data'); await sleep(400); }
    const afterData = await navState(page);
    let drilled = false;
    const openBtn = page.locator('.db-q-open').first();
    if (await openBtn.count()) { await openBtn.tap().catch(() => {}); drilled = true; note.push('tapped .db-q-open'); }
    await sleep(500);
    const after = await navState(page);
    log.attempts.push({ name: 'E1: Data tab → area card Open drill → work map', note: note.join(' | ') + (drilled ? '' : ' | NO .db-q-open found'), before: pick(before), afterData: pick(afterData), after: pick(after), changed: after.viewMode === 'work' });
    await page.screenshot({ path: join(SHOTS, `${tag}-E1-data-drill-workmap.png`) }).catch(() => {});
    // confirm drag-select surface exists on the work map we landed on
    log.workMap = await page.evaluate(() => {
      const mw = document.getElementById('mapwell');
      return { mapwell: !!mw, lineStrips: mw ? mw.querySelectorAll('[data-line-id], .line').length : 0, cages: mw ? mw.querySelectorAll('[data-cage-id]').length : 0, viewMode: window.SpatMapDebug.getViewMode(), scope: !!window.SpatMapDebug.getScope() };
    });
  }

  // === GROUP F: the buried path — Menu → Farm Layout → tap area → action-bar Open ===
  await clean(page);
  {
    const steps = [];
    try {
      const menuBtn = page.getByRole('button', { name: /menu/i }).first();
      await menuBtn.tap({ timeout: 3000 }); steps.push('Menu'); await sleep(300);
      const fl = page.getByRole('button', { name: /farm layout/i }).first();
      await fl.tap({ timeout: 3000 }); steps.push('Farm Layout'); await sleep(500);
      steps.push('viewMode=' + (await page.evaluate(() => window.SpatMapDebug.getViewMode())));
      const ee = await enumerate(page);
      if (ee.areas[0]) { await page.touchscreen.tap(ee.areas[0].x, ee.areas[0].y); steps.push('tap area'); await sleep(400); }
      // action bar primary "Open ..." button
      const ob = page.getByRole('button', { name: /open/i }).first();
      if (await ob.count()) { await ob.tap({ timeout: 3000 }); steps.push('Open ›'); await sleep(500); }
      else steps.push('no Open button');
    } catch (err) { steps.push('ERR ' + String(err).split('\n')[0].slice(0, 80)); }
    const after = await navState(page);
    log.buried = { steps, after: pick(after), reachedWork: after.viewMode === 'work' };
    await page.screenshot({ path: join(SHOTS, `${tag}-F1-buried-path.png`) }).catch(() => {});
  }

  await browser.close();
  return log;
}

const all = [];
for (const d of TARGETS) for (const sc of ['fresh', 'brightside']) {
  process.stdout.write(`running ${d} / ${sc} ... `);
  try { all.push(await runScenario(d, sc)); console.log('done'); }
  catch (e) { console.log('FAILED', String(e).slice(0, 160)); all.push({ device: d, scenario: sc, fatal: String(e) }); }
}
writeFileSync(join(HERE, 'reports', 'verify-nav.json'), JSON.stringify(all, null, 2));

console.log('\n================ SUMMARY ================');
for (const r of all) {
  if (r.fatal) { console.log(`\n${r.device}/${r.scenario}: FATAL ${r.fatal.slice(0, 140)}`); continue; }
  console.log(`\n## ${r.device} / ${r.scenario}  errors=${r.errors.length}${r.setup ? ' setup=' + JSON.stringify(r.setup) : ''}`);
  console.log(`landing: view=${r.landing.viewMode} home=${r.landing.homeMode} tier=${r.landing.tier} k=${r.landing.k} scopedPlot=${r.landing.scopedPlot} scopedArea=${r.landing.scopedArea} plots=${r.landing.plots}`);
  console.log(`enum: plots=${r.enum.plots.length} areas=${r.enum.areas.length} cages=${r.enum.cages.length} seg=[${r.enum.seg}] top=[${r.enum.topBtns}] openChips=${r.enum.openChips}`);
  for (const a of r.attempts) {
    console.log(`  [${a.changed ? 'CHANGED' : 'NO-OP  '}] ${a.name}`);
    if (a.note) console.log(`        note: ${a.note}`);
    if (a.after) console.log(`        => v:${a.after.v} tier:${a.after.tier} k:${a.after.k} sP:${a.after.sP} sA:${a.after.sA} crumb:"${a.after.crumb}" mapwell:${a.after.mapwell} peek:${a.after.peek}${a.after.sheet ? ' SHEET:"' + a.after.sheet + '"' : ''}`);
  }
  if (r.workMap) console.log(`workMap (after Data-drill): ${JSON.stringify(r.workMap)}`);
  if (r.buried) console.log(`buried: [${r.buried.steps}] reachedWork=${r.buried.reachedWork} => v:${r.buried.after.v} scope:${JSON.stringify(r.buried.after.scope)} mapwell:${r.buried.after.mapwell}`);
}
console.log('\nshots:', SHOTS);
