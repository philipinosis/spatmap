// verify-nav2.mjs — focused, clean re-test of the map→WORK routes with overlay-gated sheet detection.
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const SHOTS = join(HERE, 'reports', 'shots', 'verify-nav');
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const state = (page) => page.evaluate(() => {
  const D = window.SpatMapDebug, f = D.getFarm();
  const overlayOpen = !!(document.getElementById('overlay') && document.getElementById('overlay').classList.contains('open'));
  const sheet = document.getElementById('sheet');
  const sheetTxt = overlayOpen ? (sheet.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 90) : '';
  const peek = document.getElementById('oysterPeek');
  const peekVis = !!(peek && peek.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(peek).opacity) > 0.05);
  const ls = D.layoutState();
  return { view: D.getViewMode(), scope: D.getScope() ? { p: D.getScope().plotId, a: D.getScope().areaId } : null,
    tier: ls.tier, k: +ls.view.k.toFixed(3), mapwell: !!document.getElementById('mapwell'),
    overlayOpen, sheetTxt, peekVis };
});

const clean = async (page) => {
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} try { window.SpatMapDebug.hidePeek(); } catch (e) {} try { clearCageHighlight(); } catch (e) {} window.SpatMapDebug.enterOverview(); });
  await sleep(500);
};

async function run(deviceName, scenario) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...devices[deviceName] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug');

  if (scenario === 'brightside') {
    await page.evaluate(() => { window.SpatMapDebug.loadBrightside(); window.SpatMapDebug.save(); window.SpatMapDebug.enterOverview(); });
  } else {
    await page.evaluate(() => { try { window.SpatMapDebug.state.farms = []; } catch (e) {} localStorage.removeItem('cageTrackerData'); });
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.SpatMapDebug'); await sleep(200);
    const PRI = [/build my farm/i, /^next$/i, /create farm/i];
    for (let i = 0; i < 8; i++) {
      if (await page.evaluate(() => window.SpatMapDebug.getViewMode() === 'layout')) break;
      await page.evaluate(() => { const t = document.querySelector('#app input[type="text"]'); if (t && !t.value.trim()) { t.value = 'Test Farm'; t.dispatchEvent(new Event('input', { bubbles: true })); } });
      for (const re of PRI) { const b = page.getByRole('button', { name: re }).first(); if (await b.count() && await b.isVisible().catch(() => false)) { await b.tap().catch(() => b.click().catch(() => {})); break; } }
      await sleep(350);
    }
    const fin = page.getByRole('button', { name: /^finish$/i }).first(); if (await fin.count()) await fin.tap().catch(() => fin.click());
  }
  await sleep(500);
  await clean(page);

  const out = { device: deviceName, scenario, errs };
  // TRUE geometry
  out.geo = await page.evaluate(() => {
    const f = window.SpatMapDebug.getFarm();
    return { name: f.name, plots: (f.plots || []).length,
      areas: (f.plots || []).flatMap(p => (p.areas || []).map(a => ({ plot: p.id.slice(-4), area: a.name, w: Math.round(a.w), h: Math.round(a.h) }))),
      lines: (f.lines || []).length, cages: (f.lines || []).reduce((n, l) => n + (l.cages || []).length, 0) };
  });

  // ROUTE 1: Data tab → does .db-q-open exist, and does tapping it reach the work map?
  await clean(page);
  const r1 = { before: await state(page) };
  const dataBtn = page.getByRole('button', { name: /^data$/i }).first();
  r1.dataBtnCount = await dataBtn.count();
  if (r1.dataBtnCount) { await dataBtn.tap(); await sleep(400); }
  r1.afterDataTap = await state(page);
  r1.dbQOpenCount = await page.locator('.db-q-open').count();
  r1.dataTabAreaCards = await page.locator('.db-quarter').count();
  if (r1.dbQOpenCount) { await page.locator('.db-q-open').first().tap(); await sleep(500); }
  r1.afterDrill = await state(page);
  await page.screenshot({ path: join(SHOTS, `${deviceName.replace(/\s+/g, '')}-${scenario}-R1-data-drill.png`) }).catch(() => {});
  // drag-select surface present on the work map?
  r1.workMap = await page.evaluate(() => { const mw = document.getElementById('mapwell'); return mw ? { lineStrips: mw.querySelectorAll('[data-line-id], .line').length, cages: mw.querySelectorAll('[data-cage-id]').length } : null; });
  out.route_DataDrill = r1;

  // ROUTE 2: two-tap a cage on the MAP → cage/stock sheet (overlay-gated)
  await clean(page);
  // (single-area farm: already scopedArea at landing). find first cage center, tap twice.
  const cageCenter = async () => page.evaluate(() => { const el = document.querySelector('#layoutWorld [data-cage-id]'); if (!el) return null; const r = el.getBoundingClientRect(); return { id: el.getAttribute('data-cage-id'), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; });
  let cc = await cageCenter();
  const r2 = { cage: cc };
  if (cc) {
    await page.touchscreen.tap(cc.x, cc.y); await sleep(350); r2.afterTap1 = await state(page);
    cc = await cageCenter(); await page.touchscreen.tap(cc.x, cc.y); await sleep(400); r2.afterTap2 = await state(page);
    await page.screenshot({ path: join(SHOTS, `${deviceName.replace(/\s+/g, '')}-${scenario}-R2-cage-stocksheet.png`) }).catch(() => {});
    r2.isStockSheet = await page.evaluate(() => { const s = document.getElementById('sheet'); const txt = s ? s.innerText : ''; return /Fill|Stock|Work|Pull/i.test(txt) && document.getElementById('overlay').classList.contains('open'); });
  }
  out.route_TwoTapCage = r2;

  // ROUTE 3: once in the WORK map (via drill), is there an [Overview|Work] toggle, and does Work give the
  // UNSCOPED whole-farm work map? (tests escape + whole-farm drag-select reachability)
  await clean(page);
  await page.evaluate(() => { const f = window.SpatMapDebug.getFarm(); const a = f.plots[0].areas[0]; window.SpatMapDebug.drill(a.id); });
  await sleep(500);
  const r3 = { afterDrill: await state(page) };
  r3.segBtns = await page.evaluate(() => Array.from(document.querySelectorAll('.ovSegBtn')).map(b => b.textContent.trim()));
  r3.scopeBackChip = await page.locator('.scopeBack').count();
  // tap scope-back to whole farm, then see if [Overview|Work] toggle appears
  out.route_WorkToggle = r3;

  await browser.close();
  return out;
}

const all = [];
for (const d of ['iPhone SE', 'iPhone 14 Pro Max']) for (const sc of ['fresh', 'brightside']) {
  process.stdout.write(`${d}/${sc} ... `); all.push(await run(d, sc)); console.log('ok');
}
for (const r of all) {
  console.log(`\n#### ${r.device} / ${r.scenario}  errs=${r.errs.length}`);
  console.log(`GEO: ${r.geo.name} | plots=${r.geo.plots} lines=${r.geo.lines} cages=${r.geo.cages} | areas=${JSON.stringify(r.geo.areas)}`);
  const a = r.route_DataDrill;
  console.log(`ROUTE Data→drill: dataBtn=${a.dataBtnCount} afterDataTap.view=${a.afterDataTap.view} dataTabAreaCards=${a.dataTabAreaCards} dbQOpenBtns=${a.dbQOpenCount} -> afterDrill.view=${a.afterDrill.view} scope=${JSON.stringify(a.afterDrill.scope)} mapwell=${a.afterDrill.mapwell} | workMap=${JSON.stringify(a.workMap)}`);
  const b = r.route_TwoTapCage;
  console.log(`ROUTE 2-tap cage: cage=${b.cage ? b.cage.id : null} tap1.peek=${b.afterTap1 ? b.afterTap1.peekVis : '-'} tap2.overlayOpen=${b.afterTap2 ? b.afterTap2.overlayOpen : '-'} isStockSheet=${b.isStockSheet} sheet="${b.afterTap2 ? b.afterTap2.sheetTxt : ''}"`);
  const c = r.route_WorkToggle;
  console.log(`ROUTE work-toggle: afterDrill.view=${c.afterDrill.view} scope=${JSON.stringify(c.afterDrill.scope)} mapwell=${c.afterDrill.mapwell} segBtns=[${c.segBtns}] scopeBackChip=${c.scopeBackChip}`);
}
console.log('\nshots:', SHOTS);
