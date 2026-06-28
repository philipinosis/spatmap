// verify-nav3.mjs — final clean evidence:
//  (1) Data tab → area-card "Open" → drag-select work map  (correct role=tab locator)
//  (2) two-tap SAME cage on overview map → cage/stock sheet  (overlay-gated)
//  (3) scoped work map (mapwell) really has the denseRangeSelect line strips
//  (4) MULTI-plot/MULTI-area farm: single taps zoom camera farm→plot→area (not a no-op)
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
  const D = window.SpatMapDebug, f = D.getFarm(), ls = D.layoutState();
  const overlayOpen = !!(document.getElementById('overlay') && document.getElementById('overlay').classList.contains('open'));
  const sheet = document.getElementById('sheet');
  const crumbEl = document.getElementById('lpCrumb');
  let sP = null, sA = null; try { sP = !!isScopedIntoPlot(f); } catch (e) {} try { sA = !!isScopedIntoArea(f); } catch (e) {}
  return { view: D.getViewMode(), scope: D.getScope() ? { a: D.getScope().areaId } : null, tier: ls.tier, k: +ls.view.k.toFixed(3),
    sP, sA, crumb: crumbEl && !crumbEl.hidden ? crumbEl.textContent.replace(/\s+/g, ' ').trim() : '',
    mapwell: !!document.getElementById('mapwell'), overlayOpen,
    sheetTxt: overlayOpen ? sheet.innerText.replace(/\s+/g, ' ').trim().slice(0, 80) : '' };
});
const clean = async (page) => { await page.evaluate(() => { try { closeSheet(); } catch (e) {} try { window.SpatMapDebug.hidePeek(); } catch (e) {} try { clearCageHighlight(); } catch (e) {} try { overviewTab = 'map'; } catch (e) {} window.SpatMapDebug.enterOverview(); }); await sleep(500); };
const cageCenter = (page) => page.evaluate(() => { const el = document.querySelector('#layoutWorld [data-cage-id]'); if (!el) return null; const r = el.getBoundingClientRect(); return { id: el.getAttribute('data-cage-id'), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; });

async function run(deviceName) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...devices[deviceName] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug');
  await page.evaluate(() => { window.SpatMapDebug.loadBrightside(); window.SpatMapDebug.save(); window.SpatMapDebug.enterOverview(); });
  await sleep(500); await clean(page);
  const out = { device: deviceName, errs };

  // (1) DATA TAB ROUTE — find the segmented "Data" TAB (role=tab), tap, count area cards + Open buttons, drill
  await clean(page);
  const r1 = {};
  const dataTab = page.getByRole('tab', { name: /data/i }).first();
  r1.dataTabCount = await dataTab.count();
  if (r1.dataTabCount) { await dataTab.tap(); await sleep(450); }
  r1.afterDataTap_view = (await state(page)).view;
  r1.areaCards = await page.locator('.db-quarter').count();
  r1.openBtns = await page.locator('.db-q-open').count();
  await page.screenshot({ path: join(SHOTS, `${deviceName.replace(/\s+/g, '')}-DATA-tab.png`) }).catch(() => {});
  if (r1.openBtns) { await page.locator('.db-q-open').first().tap(); await sleep(500); }
  r1.afterDrill = await state(page);
  r1.workMapStrips = await page.evaluate(() => { const mw = document.getElementById('mapwell'); return mw ? { lineStrips: mw.querySelectorAll('[data-line-id], .line').length, cages: mw.querySelectorAll('[data-cage-id]').length } : null; });
  await page.screenshot({ path: join(SHOTS, `${deviceName.replace(/\s+/g, '')}-DATA-drill-workmap.png`) }).catch(() => {});
  out.route1_DataDrill = r1;

  // (2) TWO-TAP SAME CAGE on the overview MAP → stock sheet
  await clean(page);
  const r2 = {};
  let cc = await cageCenter(page); r2.cage = cc && cc.id;
  if (cc) {
    await page.touchscreen.tap(cc.x, cc.y); await sleep(360);
    r2.afterTap1 = await state(page);
    // tap the SAME element again (re-resolve its current box, same id)
    const same = await page.evaluate((id) => { const el = document.querySelector(`#layoutWorld [data-cage-id="${id}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; }, cc.id);
    await page.touchscreen.tap(same.x, same.y); await sleep(450);
    r2.afterTap2 = await state(page);
    await page.screenshot({ path: join(SHOTS, `${deviceName.replace(/\s+/g, '')}-MAP-2tap-cage-stocksheet.png`) }).catch(() => {});
  }
  out.route2_TwoTapCage = r2;

  // (3) scoped work map drag-select surface present? (drill via debug, inspect mapwell)
  await clean(page);
  await page.evaluate(() => { const f = window.SpatMapDebug.getFarm(); window.SpatMapDebug.drill(f.plots[0].areas[0].id); });
  await sleep(500);
  out.route3_WorkMap = await page.evaluate(() => { const mw = document.getElementById('mapwell'); return { view: window.SpatMapDebug.getViewMode(), mapwell: !!mw, lineStrips: mw ? mw.querySelectorAll('[data-line-id], .line').length : 0, cages: mw ? mw.querySelectorAll('[data-cage-id]').length : 0, hasSelectControls: !!document.querySelector('.ovSegBtn, .scopeBack') }; });

  // (4) MULTI-PLOT / MULTI-AREA farm: build via debug, then single-tap to walk camera farm->plot->area
  await clean(page);
  await page.evaluate(() => {
    const D = window.SpatMapDebug;
    // add a 2nd plot and extra areas so the progressive zoom has real levels
    D.addPlot(); D.addPlot();
    const f = D.getFarm();
    f.plots.forEach(p => { D.addArea(p.id); });   // give each plot a 2nd area
    D.commit(); D.save(); D.enterOverview();
  });
  await sleep(600);
  const r4 = { geo: await page.evaluate(() => { const f = window.SpatMapDebug.getFarm(); return { plots: f.plots.length, areas: f.plots.reduce((n, p) => n + (p.areas || []).length, 0) }; }) };
  r4.taps = [];
  // tap centers of a plot, then an area, then again — record k + scope each time
  const plotCenter = () => page.evaluate(() => { const el = document.querySelector('#layoutWorld > [data-plot-id]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; });
  const areaCenter = () => page.evaluate(() => { const el = document.querySelector('#layoutWorld [data-area-id].lp-areabody'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; });
  r4.taps.push({ step: 'landing', ...(await state(page)) });
  await page.screenshot({ path: join(SHOTS, `${deviceName.replace(/\s+/g, '')}-MULTI-00-allplots.png`) }).catch(() => {});
  for (let i = 1; i <= 3; i++) {
    const before = await state(page);
    const t = (before.sP ? await areaCenter() : await plotCenter()) || await areaCenter() || await plotCenter();
    if (!t) { r4.taps.push({ step: 'tap' + i, note: 'no target' }); break; }
    await page.touchscreen.tap(t.x, t.y); await sleep(550);
    const after = await state(page);
    r4.taps.push({ step: 'tap' + i, tappedAt: t, kBefore: before.k, kAfter: after.k, view: after.view, crumb: after.crumb, sP: after.sP, sA: after.sA, peekOrSheet: after.overlayOpen ? 'sheet' : '' });
    await page.screenshot({ path: join(SHOTS, `${deviceName.replace(/\s+/g, '')}-MULTI-0${i}-tap.png`) }).catch(() => {});
  }
  out.route4_MultiAreaZoom = r4;

  await browser.close();
  return out;
}

const all = [];
for (const d of ['iPhone SE', 'iPhone 14 Pro Max']) { process.stdout.write(d + ' ... '); all.push(await run(d)); console.log('ok'); }
for (const r of all) {
  console.log(`\n#### ${r.device}  errs=${r.errs.length}`);
  const a = r.route1_DataDrill;
  console.log(`(1) DATA-tab route: dataTab=${a.dataTabCount} afterTap.view=${a.afterDataTap_view} areaCards=${a.areaCards} openBtns=${a.openBtns} -> drill.view=${a.afterDrill.view} scope=${JSON.stringify(a.afterDrill.scope)} mapwell=${a.afterDrill.mapwell} strips=${JSON.stringify(a.workMapStrips)}`);
  const b = r.route2_TwoTapCage;
  console.log(`(2) 2-tap cage: cage=${b.cage} tap1.peek?=(overlay ${b.afterTap1 ? b.afterTap1.overlayOpen : '-'}) tap2.overlayOpen=${b.afterTap2 ? b.afterTap2.overlayOpen : '-'} sheet="${b.afterTap2 ? b.afterTap2.sheetTxt : ''}"`);
  console.log(`(3) scoped work map: ${JSON.stringify(r.route3_WorkMap)}`);
  const m = r.route4_MultiAreaZoom;
  console.log(`(4) multi-area zoom: geo=${JSON.stringify(m.geo)}`);
  for (const t of m.taps) console.log(`      ${t.step}: ${t.note || `k ${t.kBefore}->${t.kAfter} view=${t.view} crumb="${t.crumb}" sP=${t.sP} sA=${t.sA} ${t.peekOrSheet}`}`);
}
console.log('\nshots:', SHOTS);
