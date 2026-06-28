// SpatMap WINTER / OWNER ("Sam") simulation.
// Persona: business-minded owner reviewing the season at the kitchen table.
// Focus: analytics surfaces (scorecard, watch list, dashboard money, growth calendar),
// winter growth stall in projections, DATA SAFETY (full backup + restore round-trip,
// incl. photos), multi-farm + layout planning for next season.
// Local only. Drives the real touch UI; SpatMapDebug only for setup/inspect/assert.

import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const SHOTS = join(HERE, 'reports', 'shots', 'winter-owner');
const DL = join(HERE, 'reports', '_dl');
mkdirSync(SHOTS, { recursive: true });
mkdirSync(DL, { recursive: true });

const WINTER = new Date('2026-01-20T09:00:00');
const log = [];
const findings = {};
function note(k, v) { findings[k] = v; console.log('  ·', k, '=', JSON.stringify(v)); }

let stepN = 0;
async function shot(page, name) {
  stepN++;
  const file = join(SHOTS, String(stepN).padStart(2, '0') + '-' + name + '.png');
  await page.screenshot({ path: file, fullPage: false }).catch(e => console.log('shot fail', e.message));
  return file;
}
async function sheetText(page) {
  try { return (await page.locator('#sheet').innerText({ timeout: 1500 })).trim(); }
  catch { return '(no sheet)'; }
}
async function closeUI() {
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} }).catch(() => {});
  await page.waitForTimeout(250);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 14 Pro Max'] });
const page = await context.newPage();
const errors = [];
page.on('console', m => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
page.on('pageerror', e => errors.push(String(e).slice(0, 200)));

// auto-accept the import confirm() dialog
let lastDialog = null;
page.on('dialog', async d => { lastDialog = d.message(); await d.accept().catch(() => {}); });

// capture downloads (backups + CSV)
const downloads = [];
page.on('download', async d => {
  const fn = d.suggestedFilename();
  const dest = join(DL, fn);
  await d.saveAs(dest).catch(() => {});
  downloads.push({ name: fn, path: dest });
  console.log('  ⤓ download:', fn);
});

// ── boot with faked WINTER clock ──
await page.clock.install({ time: WINTER });
await page.goto(APP, { waitUntil: 'load' });
await page.waitForFunction('window.SpatMapDebug');
console.log('booted at', WINTER.toISOString());

// ── seed Brightside AFTER clock install so batch ages compute vs winter "now" ──
const seed = await page.evaluate(() => {
  SpatMapDebug.loadBrightside(); SpatMapDebug.save(); SpatMapDebug.render();
  const f = SpatMapDebug.getFarm();
  return { name: f.name, lines: (f.lines || []).length, batches: (f.batches || []).length,
           harvests: (f.harvestLog || []).length, plots: (f.plots || []).length };
});
note('seed', seed);
await page.waitForTimeout(400);
await shot(page, 'home-overview-winter');

// what date does the app think it is?
note('appNow', await page.evaluate(() => new Date().toISOString()));

// ════════ 1. DASHBOARD MONEY (Data tab) ════════
async function tapText(sel, text, opts = {}) {
  const loc = page.locator(sel, { hasText: text }).first();
  await loc.tap(opts).catch(async () => { await loc.click(opts).catch(() => {}); });
  await page.waitForTimeout(350);
}
// flip to Data sub-tab
await tapText('.ovSegBtn', 'Data');
await shot(page, 'data-tab-money-nopricesyet');
note('dataTab_text', await page.evaluate(() => {
  const c = document.querySelector('.dashcard'); return c ? c.innerText.replace(/\n+/g, ' | ').slice(0, 300) : '(no dashcard)';
}));

// ════════ 2. SET PRICES (owner wants crop value) ════════
// money slot shows "Set oyster prices" CTA when no prices → tap it
let setPrice = page.getByText('Set oyster prices').first();
if (await setPrice.count()) {
  await setPrice.tap().catch(() => setPrice.click());
  await page.waitForTimeout(300);
  note('prices_sheet', (await sheetText(page)).slice(0, 200));
  await shot(page, 'prices-sheet');
  // fill grade price inputs (number inputs in the sheet)
  const inputs = page.locator('#sheet input[type="number"], #sheet input[inputmode="decimal"], #sheet input');
  const n = await inputs.count();
  note('price_inputs', n);
  const vals = ['0.85', '0.65', '0.45', '0.55', '0.50', '0.40'];
  for (let i = 0; i < n; i++) {
    const inp = inputs.nth(i);
    const type = await inp.getAttribute('type');
    if (type === 'checkbox' || type === 'radio' || type === 'file') continue;
    await inp.fill(vals[i] || '0.50').catch(() => {});
  }
  await shot(page, 'prices-filled');
  // find a Save/Done button
  const saveBtn = page.locator('#sheet button', { hasText: /save|done|set/i }).first();
  if (await saveBtn.count()) { await saveBtn.tap().catch(() => saveBtn.click()); await page.waitForTimeout(300); }
  else { await page.keyboard.press('Escape').catch(() => {}); }
}
await page.evaluate(() => { SpatMapDebug.save(); SpatMapDebug.render(); });
await page.waitForTimeout(300);
// re-open Data tab to see crop value now
await page.evaluate(() => SpatMapDebug.enterOverview());
await page.waitForTimeout(200);
await tapText('.ovSegBtn', 'Data');
await page.waitForTimeout(300);
note('dataTab_money_after', await page.evaluate(() => {
  const c = document.querySelector('.dashcard'); return c ? c.innerText.replace(/\n+/g, ' | ').slice(0, 300) : '(no dashcard)';
}));
note('farm_prices', await page.evaluate(() => { const f = SpatMapDebug.getFarm(); return f.prices || f.settings && f.settings.prices || '(none found)'; }));
await shot(page, 'data-tab-money-after-prices');

// ════════ 3. MENU → SEED SOURCE SCORECARD ════════
async function menuIsOpen() {
  return await page.evaluate(() => {
    const ov = document.getElementById('overlay');
    const sh = document.getElementById('sheet');
    return !!(ov && ov.classList.contains('open') && sh && /Find a cage|Farm Layout/.test(sh.innerText));
  });
}
async function openMenu() {
  // make sure nothing stale is up, land on overview, then tap the real menu button
  const mb = page.locator('.menuBtn, .db-menu-btn').first();
  if (!(await mb.count())) {
    await page.evaluate(() => { try { SpatMapDebug.enterOverview(); SpatMapDebug.render(); } catch (e) {} });
    await page.waitForTimeout(250);
  }
  const mb2 = page.locator('.menuBtn, .db-menu-btn').first();
  if (await mb2.count()) {
    await mb2.tap({ timeout: 4000 }).catch(() => mb2.click({ timeout: 4000 }).catch(() => {}));
    await page.waitForTimeout(300);
  }
  // verify it actually rendered; if a stale overlay swallowed the tap, force-open as a fallback
  if (!(await menuIsOpen())) {
    await page.evaluate(() => { try { openSheet(buildMenu); } catch (e) {} });
    await page.waitForTimeout(300);
  }
}
await openMenu();
await shot(page, 'menu-open');
note('menu_text', (await sheetText(page)).replace(/\n+/g, ' | ').slice(0, 400));

await tapText('#sheet .menuItem', 'Seed source scorecard');
const scorecard = await sheetText(page);
note('scorecard_text', scorecard.slice(0, 700));
await shot(page, 'scorecard');
// is revenue/cage shown for any hatchery?
note('scorecard_has_revenue', /Revenue/.test(scorecard));
note('scorecard_has_unlinked', /Unlinked|couldn.t be traced/.test(scorecard));
// programmatic cohort stats for ground truth
note('cohortStats', await page.evaluate(() => {
  try {
    const cs = (typeof cohortStats === 'function') ? cohortStats(SpatMapDebug.getFarm()) : null;
    if (!cs) return '(no cohortStats fn)';
    return { groups: cs.groups.map(g => ({ hatchery: g.hatchery, cages: g.cages, survivalPct: g.survivalPct,
      inProgress: g.inProgress, thin: g.thin, revenueKnown: g.revenueKnown, medianDaysToMarket: g.medianDaysToMarket })),
      unattributed: cs.unattributed ? { entries: cs.unattributed.entries, harvested: cs.unattributed.harvested } : null };
  } catch (e) { return 'ERR ' + e.message; }
}));
await closeUI();

// ════════ 4. MORTALITY WATCH LIST ════════
await openMenu();
const menuTxt = await sheetText(page);
const hasWatch = /Watch list/.test(menuTxt);
note('menu_has_watchlist', hasWatch);
// also check stock health
if (/Stock health/.test(menuTxt)) {
  await tapText('#sheet .menuItem', 'Stock health');
  note('stockhealth_text', (await sheetText(page)).slice(0, 400));
  await shot(page, 'stock-health');
  await closeUI();
  await openMenu();
}
if (hasWatch) {
  await tapText('#sheet .menuItem', 'Watch list');
  note('watchlist_text', (await sheetText(page)).slice(0, 500));
  await shot(page, 'watch-list');
  await page.keyboard.press('Escape').catch(() => {});
} else {
  // open it directly to see the empty/honest copy
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => openSheet(buildMortalityWatch));
  await page.waitForTimeout(300);
  note('watchlist_empty_text', (await sheetText(page)).slice(0, 400));
  await shot(page, 'watch-list-empty');
  await page.keyboard.press('Escape').catch(() => {});
}
await page.waitForTimeout(200);

// ════════ 5. HARVEST FORECAST (winter stall → market dates pushed out) ════════
await page.evaluate(() => openSheet(buildForecast));
await page.waitForTimeout(400);
const forecast = await sheetText(page);
note('forecast_text', forecast.replace(/\n+/g, ' | ').slice(0, 800));
await shot(page, 'harvest-forecast-winter');
// pull projection ground truth: pick a mid/old batch and project its market date
note('projection_probe', await page.evaluate(() => {
  try {
    const f = SpatMapDebug.getFarm();
    const out = [];
    (f.lines || []).forEach(line => (line.cages || []).forEach(cage => {
      if (cage.batch && typeof projectMarketDate === 'function') {
        const p = projectMarketDate(cage);
        if (p) out.push({ size: cage.batch.sizeMm, daysOut: p.days != null ? p.days : null, date: p.date || null });
      }
    }));
    return out.slice(0, 8);
  } catch (e) { return 'probe-unavailable: ' + e.message; }
}));
// seasonal multiplier in winter vs summer for trust check
note('seasonMult_winter_vs_summer', await page.evaluate(() => {
  try { const f = SpatMapDebug.getFarm(); const m = (typeof farmSeasonMult === 'function') ? farmSeasonMult(f) : null;
    return m ? { jan: m[0], feb: m[1], may: m[4], jun: m[5] } : '(no farmSeasonMult)'; }
  catch (e) { return e.message; }
}));
await closeUI();

// ════════ 6. GROWTH CALENDAR (fitted vs default) — Settings → Water conditions ════════
await page.evaluate(() => openSheet(buildCondHistory));
await page.waitForTimeout(500);
const growthCal = await sheetText(page);
note('growthcalendar_text', growthCal.replace(/\n+/g, ' | ').slice(0, 500));
await shot(page, 'growth-calendar');
note('growth_intervals', await page.evaluate(() => {
  try { return (typeof countGrowthIntervals === 'function') ? countGrowthIntervals(SpatMapDebug.getFarm()) : '(no fn)'; }
  catch (e) { return e.message; }
}));
await closeUI();

// ════════ 7. DATA SAFETY — attach a photo so the backup round-trip is testable ════════
const photoSetup = await page.evaluate(async () => {
  // 1x1 png as a File
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const file = new File([arr], 'cage-photo.png', { type: 'image/png' });
  try {
    const id = await SpatMapDebug.addPhotoFromFile(file);
    const f = SpatMapDebug.getFarm();
    const b = (f.batches && f.batches[0]) || null;
    if (b) { b.photoIds = (b.photoIds || []).concat([id]); }
    SpatMapDebug.save();
    return { photoId: id, attachedToBatch: b ? b.id : null, referenced: Object.keys(SpatMapDebug.referencedPhotoIds()) };
  } catch (e) { return { error: String(e) }; }
});
note('photoSetup', photoSetup);

// snapshot pre-backup truth
const preBackup = await page.evaluate(() => {
  const f = SpatMapDebug.getFarm();
  return { farmName: f.name, batches: (f.batches || []).length, harvests: (f.harvestLog || []).length,
           plots: (f.plots || []).length, lines: (f.lines || []).length,
           photosReferenced: Object.keys(SpatMapDebug.referencedPhotoIds()).length };
});
note('preBackup', preBackup);

// open Data menu and tap Full backup (with photos)
await openMenu();
await tapText('#sheet .menuItem', 'Data');
const dataMenu = await sheetText(page);
note('dataMenu_text', dataMenu.replace(/\n+/g, ' | ').slice(0, 400));
await shot(page, 'data-menu');

downloads.length = 0;
await tapText('#sheet .menuItem', 'Full backup');
await page.waitForTimeout(1500); // photo packing is async
note('backup_download', downloads.map(d => d.name));
const backupFile = downloads.find(d => /with-photos/.test(d.name)) || downloads[0];
note('backup_path', backupFile ? backupFile.path : '(none)');
// inspect the backup JSON
let backupJson = null;
if (backupFile && existsSync(backupFile.path)) {
  try {
    backupJson = JSON.parse(readFileSync(backupFile.path, 'utf8'));
    note('backup_contents', { farms: (backupJson.farms || []).length, photos: (backupJson.photos || []).length,
      batches: (backupJson.farms?.[0]?.batches || []).length, harvests: (backupJson.farms?.[0]?.harvestLog || []).length });
  } catch (e) { note('backup_parse_err', e.message); }
}
await shot(page, 'after-full-backup');

// also grab the CSV "records for a buyer/inspector" (recovery/spreadsheet exports)
downloads.length = 0;
const stockCsv = page.locator('#sheet .menuItem', { hasText: /stock/i }).first();
if (await stockCsv.count()) { await stockCsv.tap().catch(() => stockCsv.click()); await page.waitForTimeout(600); }
const harvestCsv = page.locator('#sheet .menuItem', { hasText: /harvest/i }).first();
if (await harvestCsv.count()) { await harvestCsv.tap().catch(() => harvestCsv.click()); await page.waitForTimeout(600); }
note('csv_downloads', downloads.map(d => d.name));
for (const d of downloads) {
  if (/\.csv$/.test(d.name) && existsSync(d.path)) {
    const txt = readFileSync(d.path, 'utf8');
    note('csv_' + d.name, txt.split(/\r?\n/).slice(0, 4).join(' ⏎ ').slice(0, 300));
  }
}
await shot(page, 'csv-exports');
await closeUI();

// ════════ 8. SIMULATE RESTORE — wipe + reload + import ════════
await page.evaluate(() => {
  SpatMapDebug.state.farms = [];
  localStorage.removeItem('cageTrackerData');
  localStorage.removeItem('cageTrackerData:prev');
});
await page.reload({ waitUntil: 'load' });
await page.waitForFunction('window.SpatMapDebug');
await page.waitForTimeout(500);
note('afterWipe', await page.evaluate(() => {
  const s = SpatMapDebug.state; return { farms: (s.farms || []).length, ls: !!localStorage.getItem('cageTrackerData') };
}));
await shot(page, 'after-wipe-onboarding');

// COLD-START RESTORE TEST: what does a farmer who lost everything actually see?
const coldStart = await page.evaluate(() => {
  const txt = document.body.innerText.replace(/\n+/g, ' | ').slice(0, 400);
  const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean);
  const hasMenuBtn = !!document.querySelector('.menuBtn, .db-menu-btn');
  const hasImport = /import|restore|backup/i.test(document.body.innerText);
  return { bodyText: txt, buttons: btns.slice(0, 12), hasMenuBtn, hasImportAffordance: hasImport };
});
note('coldStart_screen', coldStart);
note('FINDING_no_import_on_coldstart', !coldStart.hasImportAffordance && !coldStart.hasMenuBtn);

// Realistic workaround a stuck farmer would discover: load the demo to get INTO the app,
// then Data → Import to replace it with the real backup.
const exploreBtn = page.locator('button', { hasText: /Explore a demo|demo first/i }).first();
if (await exploreBtn.count()) {
  await exploreBtn.tap().catch(() => exploreBtn.click());
  await page.waitForTimeout(500);
  note('used_demo_workaround_to_reach_menu', true);
} else {
  // fallback: build-my-farm wizard, else just seed via debug to proceed
  await page.evaluate(() => { SpatMapDebug.loadBrightside(); SpatMapDebug.save(); SpatMapDebug.render(); });
  await page.waitForTimeout(400);
}
await shot(page, 'demo-loaded-to-reach-import');

// now reach Data menu via the real menu
await openMenu();
const wipedMenu = await sheetText(page);
note('post_workaround_menu_text', wipedMenu.replace(/\n+/g, ' | ').slice(0, 250));
const dataItem = page.locator('#sheet .menuItem, #sheet button', { hasText: /^Data|Export \/ import/i }).first();
if (await dataItem.count()) { await dataItem.tap().catch(() => dataItem.click()); await page.waitForTimeout(300); }
else { await page.evaluate(() => openSheet(buildDataMenu)); await page.waitForTimeout(300); }
await shot(page, 'data-menu-for-import');

if (backupFile && existsSync(backupFile.path)) {
  // intercept the file chooser that triggerImport's input.click() opens
  const fcPromise = page.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null);
  const importBtn = page.locator('#sheet .menuItem, #sheet button', { hasText: /Import/i }).first();
  await importBtn.tap().catch(() => importBtn.click());
  const fc = await fcPromise;
  if (fc) {
    await fc.setFiles(backupFile.path);
    await page.waitForTimeout(1200); // migrate + restore photos async
    note('import_dialog_seen', lastDialog);
  } else {
    note('import_filechooser', 'NOT FIRED — fallback to setInputFiles');
    const inp = page.locator('input[type="file"]').last();
    if (await inp.count()) { await inp.setInputFiles(backupFile.path); await page.waitForTimeout(1200); }
  }
}
await page.waitForTimeout(800);
await shot(page, 'after-import');

// verify restore
const restored = await page.evaluate(() => {
  const f = SpatMapDebug.getFarm();
  if (!f) return { restored: false };
  return { farmName: f.name, batches: (f.batches || []).length, harvests: (f.harvestLog || []).length,
           plots: (f.plots || []).length, lines: (f.lines || []).length,
           photosReferenced: Object.keys(SpatMapDebug.referencedPhotoIds()).length,
           prevRecoveryKey: !!localStorage.getItem('cageTrackerData:prev') };
});
note('restored', restored);
// verify the photo blob actually came back into IndexedDB
if (photoSetup && photoSetup.photoId) {
  const photoBack = await page.evaluate(async (pid) => {
    try { const rec = await SpatMapDebug.photoGet(pid); return rec && rec.blob ? { ok: true, size: rec.blob.size } : { ok: false }; }
    catch (e) { return { error: String(e) }; }
  }, photoSetup.photoId);
  note('photo_round_trip', photoBack);
}
// render the restored home + scorecard + harvest log to confirm visually
await page.evaluate(() => { SpatMapDebug.enterOverview(); SpatMapDebug.render(); });
await page.waitForTimeout(300);
await shot(page, 'restored-home');
await page.evaluate(() => openSheet(buildHarvestLog));
await page.waitForTimeout(300);
note('restored_harvestlog', (await sheetText(page)).replace(/\n+/g, ' | ').slice(0, 300));
await shot(page, 'restored-harvest-log');
await closeUI();

// ════════ 9. PLAN NEXT SEASON — add a new farm + switch ════════
await openMenu();
await page.waitForTimeout(200);
note('menu_has_newfarm', /New farm/.test(await sheetText(page)));
const newFarmBtn = page.locator('#sheet button', { hasText: /New farm/i }).first();
if (await newFarmBtn.count()) {
  await newFarmBtn.tap().catch(() => newFarmBtn.click());
  await page.waitForTimeout(400);
  note('newfarm_wizard', (await sheetText(page)).replace(/\n+/g, ' | ').slice(0, 300));
  await shot(page, 'new-farm-wizard');
  // S1: name the farm (type so the oninput handler updates model.name)
  const nameInput = page.locator('#sheet input').first();
  if (await nameInput.count()) {
    await nameInput.click().catch(() => {});
    await nameInput.fill('').catch(() => {});
    await nameInput.pressSequentially('Sam Winter Lease 2027', { delay: 15 }).catch(() => {});
  }
  await shot(page, 'new-farm-named');
  // S1 → S2 (gear) → S3 (review) → Create farm
  async function tapBtn(re, label) {
    const b = page.locator('#sheet button', { hasText: re }).first();
    if (await b.count()) { await b.tap().catch(() => b.click()); await page.waitForTimeout(450); return true; }
    return false;
  }
  await tapBtn(/^Next$/i);                 // S1 → S2
  await shot(page, 'new-farm-step2-gear');
  note('newfarm_step2', (await sheetText(page)).replace(/\n+/g, ' | ').slice(0, 180));
  await tapBtn(/^Next$/i);                 // S2 → S3 review
  await shot(page, 'new-farm-step3-review');
  note('newfarm_step3', (await sheetText(page)).replace(/\n+/g, ' | ').slice(0, 220));
  await tapBtn(/Create farm/i);            // S3 → create
  await page.waitForTimeout(500);
  await shot(page, 'new-farm-created');
  note('after_newfarm_state', await page.evaluate(() => {
    const s = SpatMapDebug.state; return { farms: (s.farms || []).map(f => f.name), active: SpatMapDebug.getFarm() && SpatMapDebug.getFarm().name };
  }));
}
await closeUI();

// switch farm (now >1 farm)
await page.evaluate(() => SpatMapDebug.render());
await openMenu();
const menu2 = await sheetText(page);
note('menu_has_switchfarm', /Switch farm/.test(menu2));
if (/Switch farm/.test(menu2)) {
  await tapText('#sheet .menuItem', 'Switch farm');
  await page.waitForTimeout(300);
  note('farmSwitcher_text', (await sheetText(page)).replace(/\n+/g, ' | ').slice(0, 300));
  await shot(page, 'farm-switcher');
  // switch to the original Brightside
  const bright = page.locator('#sheet .menuItem', { hasText: /Brightside/i }).first();
  if (await bright.count()) { await bright.tap().catch(() => bright.click()); await page.waitForTimeout(400); }
  note('active_after_switch', await page.evaluate(() => SpatMapDebug.getFarm() && SpatMapDebug.getFarm().name));
}
await closeUI();

// ════════ 10. LAYOUT EDITING — lay out next year's gear ════════
// plan on the NEW next-season farm if it exists (the honest "draw new gear" canvas)
await page.evaluate(() => {
  const s = SpatMapDebug.state;
  const nf = (s.farms || []).find(f => /Winter Lease/i.test(f.name));
  if (nf) { s.activeFarmId = nf.id; SpatMapDebug.enterOverview(); SpatMapDebug.render(); }
});
note('layout_target_farm', await page.evaluate(() => SpatMapDebug.getFarm() && SpatMapDebug.getFarm().name));
await page.waitForTimeout(200);
await shot(page, 'before-layout');
await openMenu();
const layoutItem = page.locator('#sheet .menuItem', { hasText: /Farm Layout/i }).first();
const beforeLayout = await page.evaluate(() => { const f = SpatMapDebug.getFarm(); return { plots: (f.plots||[]).length, lines: (f.lines||[]).length }; });
note('beforeLayout', beforeLayout);
if (await layoutItem.count()) { await layoutItem.tap().catch(() => layoutItem.click()); await page.waitForTimeout(500); }
await shot(page, 'layout-editor');
note('layout_segs', await page.evaluate(() => Array.from(document.querySelectorAll('.ovSegBtn')).map(b => b.textContent.trim())));

// The +Plot/+Area/+Line seg buttons ARM a draw tool; you then DRAG a box on the canvas to create.
async function armTool(label) {
  const b = page.locator('.ovSegBtn', { hasText: label }).first();
  if (!(await b.count())) return false;
  await b.tap().catch(() => b.click());
  await page.waitForTimeout(350);
  return await page.evaluate(() => { try { return SpatMapDebug.layoutState().tier ? true : true; } catch (e) { return true; } });
}
// drag a rectangle on the layout svg (in screen coords)
async function dragBox(x1, y1, x2, y2) {
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, { steps: 6 });
  await page.mouse.move(x2, y2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(450);
}
const canvas = page.locator('.layoutSvg').first();
const box = (await canvas.count()) ? await canvas.boundingBox() : null;
note('layout_canvas_box', box);

// arm + draw a PLOT (next year's new lease block)
await armTool('+ Plot');
await shot(page, 'layout-plot-armed');
if (box) await dragBox(box.x + box.width * 0.15, box.y + box.height * 0.25, box.x + box.width * 0.7, box.y + box.height * 0.6);
const afterPlot = await page.evaluate(() => { const f = SpatMapDebug.getFarm(); return { plots: (f.plots||[]).length, areas: (f.plots||[]).reduce((n,p)=>n+(p.areas||[]).length,0) }; });
note('afterDrawPlot', afterPlot);
await shot(page, 'layout-after-drawplot');

// arm + draw an AREA inside the new plot
await armTool('+ Area');
if (box) await dragBox(box.x + box.width * 0.22, box.y + box.height * 0.32, box.x + box.width * 0.55, box.y + box.height * 0.5);
const afterArea = await page.evaluate(() => { const f = SpatMapDebug.getFarm(); return { plots: (f.plots||[]).length, areas: (f.plots||[]).reduce((n,p)=>n+(p.areas||[]).length,0) }; });
note('afterDrawArea', afterArea);
await shot(page, 'layout-after-drawarea');

// arm + draw a LINE
await armTool('+ Line');
if (box) await dragBox(box.x + box.width * 0.25, box.y + box.height * 0.4, box.x + box.width * 0.5, box.y + box.height * 0.4);
const afterLine = await page.evaluate(() => { const f = SpatMapDebug.getFarm(); return { plots: (f.plots||[]).length, lines: (f.lines||[]).length, areas: (f.plots||[]).reduce((n,p)=>n+(p.areas||[]).length,0) }; });
note('afterDrawLine', afterLine);
await shot(page, 'layout-after-drawline');

// fallback: if dragging created nothing, prove creation works via the debug add API (so we can still
// report whether the DATA path works vs the gesture being the blocker)
if (afterLine.plots === beforeLayout.plots) {
  const viaDebug = await page.evaluate(() => {
    try { const before = SpatMapDebug.getFarm().plots.length; SpatMapDebug.addPlot(); SpatMapDebug.commit();
      return { before, after: SpatMapDebug.getFarm().plots.length }; } catch (e) { return 'ERR ' + e.message; }
  });
  note('addPlot_via_debug', viaDebug);
  await page.waitForTimeout(300);
  await shot(page, 'layout-after-debug-addplot');
}
note('afterLayout', await page.evaluate(() => { const f = SpatMapDebug.getFarm(); return { plots: (f.plots||[]).length, lines: (f.lines||[]).length, areas: (f.plots||[]).reduce((n,p)=>n+(p.areas||[]).length,0) }; }));

// ── done ──
note('jsErrors', errors.slice(0, 30));
note('all_downloads', downloads.concat([]).map(d => d.name));
writeFileSync(join(SHOTS, '_findings.json'), JSON.stringify(findings, null, 2));
console.log('\nFINDINGS written. JS errors:', errors.length);
await browser.close();
