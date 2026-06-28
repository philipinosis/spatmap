// Renee — FALL harvest/sell/record sim. Drives the REAL touch UI on an iPhone viewport.
// Persona: owner-operator handling harvest + sales; cares about counts, money, grading, clean records.
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const SHOTS = join(HERE, 'reports', 'shots', 'fall-harvest');
const CSVDIR = join(HERE, 'reports', 'csv-fall');
mkdirSync(SHOTS, { recursive: true });
mkdirSync(CSVDIR, { recursive: true });

const log = [];
function note(...a){ const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); log.push(s); console.log(s); }

const errors = [];
let stepN = 0;
async function shot(page, name){
  stepN++;
  const file = `${String(stepN).padStart(2,'0')}-${name}.png`;
  await page.screenshot({ path: join(SHOTS, file), fullPage: false }).catch(e => note('shot fail', name, String(e)));
  note('   shot →', file);
  return file;
}

// pull a compact state snapshot for assertions
async function snap(page){
  return page.evaluate(() => {
    const f = window.SpatMapDebug.getFarm();
    const b = f.barge;
    const dc = (function(){ try { return (typeof farmDashboard==='function') ? farmDashboard(f) : null; } catch(e){ return {err:String(e)}; } })();
    return {
      grades: f.grades, gradePrices: f.settings.gradePrices, defaultPrice: f.settings.defaultPrice,
      marketSizeMm: f.settings.marketSizeMm,
      barge: { state:b.state, count:b.count, sizeMm:b.sizeMm, grade:b.grade,
               splits:(b.splits||[]).map(s=>({label:s.label,count:s.count,sizeMm:s.sizeMm,grade:s.grade})) },
      harvestLog: (f.harvestLog||[]).map(e=>({date:e.date,count:e.count,grade:e.grade,sizeMm:e.sizeMm,ppo:e.pricePerOyster,revenue:e.revenue,note:e.note,from:(e.origin&&e.origin.lineNames)||[]})),
      dash: dc
    };
  });
}

async function sheetText(page){
  return page.evaluate(() => { const s = document.getElementById('sheet'); return s ? s.innerText.replace(/\n+/g,' | ').slice(0,600) : '(no sheet)'; });
}
async function dcText(page){
  return page.evaluate(() => { const d = document.querySelector('.dashcard'); return d ? d.innerText.replace(/\n+/g,' | ') : '(no dashcard)'; });
}

const browser = await chromium.launch({ headless: true });

/* ============================ MAIN CLEAN FLOW ============================ */
async function mainFlow(){
  const context = await browser.newContext({ ...devices['iPhone 14 Pro Max'] });
  const page = await context.newPage();
  page.on('console', m => { if (m.type()==='error') errors.push('[console] '+m.text().slice(0,200)); });
  page.on('pageerror', e => errors.push('[pageerror] '+String(e).slice(0,200)));

  // FALL clock
  await page.clock.install({ time: new Date('2026-10-15T09:00:00') });
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug');
  // seed against faked now
  await page.evaluate(() => { SpatMapDebug.loadBrightside(); SpatMapDebug.save(); SpatMapDebug.render(); });
  await page.waitForTimeout(300);
  note('SEED today =', await page.evaluate(()=>todayISO()));
  await shot(page, 'overview-fall-seed');

  // ---- Step: go to Data tab (money HUD) via the [Map|Data] toggle (role=tab) ----
  await page.getByRole('tab', { name: 'Data', exact: true }).first().click();
  await page.waitForTimeout(250);
  note('Data tab (before prices):', await dcText(page));
  await shot(page, 'data-before-prices');

  // ---- Step: set oyster prices via the dashboard CTA ----
  await page.getByText('Set oyster prices').first().click();
  await page.waitForTimeout(250);
  note('Prices sheet:', await sheetText(page));
  // inputs in order: Standard, Petite, Jumbo, Default/ungraded
  const priceInputs = page.locator('#sheet .priceEditor .priceRow input');
  await priceInputs.nth(0).fill('0.85');   // Standard
  await priceInputs.nth(1).fill('0.65');   // Petite
  await priceInputs.nth(2).fill('1.20');   // Jumbo
  await page.waitForTimeout(150);
  await shot(page, 'price-editor-filled');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(250);
  let s = await snap(page);
  note('prices saved:', s.gradePrices, 'default:', s.defaultPrice);

  // ---- Step: $ on the water BEFORE selling tub (still on Data tab; numbers are tab-independent) ----
  await page.waitForTimeout(200);
  const beforeDash = (await snap(page)).dash;
  note('DASH before any harvest: cropValue=$'+beforeDash.cropValue.toFixed(2), 'oysters(incl tub)='+beforeDash.oysters, 'tub='+beforeDash.tub, 'readyOysters='+beforeDash.readyOysters, 'readyCages='+beforeDash.readyCages);
  // compute cage-only crop value to prove whether tub's 3200 Standard are valued
  const calc = await page.evaluate(() => {
    const f = window.SpatMapDebug.getFarm();
    let cageVal=0, cageCount=0;
    f.lines.forEach(l=>l.cages.forEach(c=>{ if(c.batch && c.batch.count!=null){ cageCount+=c.batch.count; const p=priceForGrade(f,c.batch.grade); if(p!=null) cageVal+=c.batch.count*p; }}));
    const tub = bargeTotalCount(f.barge);
    const tubGrade = f.barge.grade, tubPrice = priceForGrade(f, f.barge.grade);
    return { cageVal, cageCount, tub, tubGrade, tubPrice };
  });
  note('CALC cage-only cropValue=$'+calc.cageVal.toFixed(2), 'cageCount='+calc.cageCount, '| tub='+calc.tub, 'tubGrade='+calc.tubGrade, 'tubPrice='+calc.tubPrice);
  note('   => tub value if priced = $'+(calc.tub*(calc.tubPrice||0)).toFixed(2)+'; dashboard $ on the water = $'+beforeDash.cropValue.toFixed(2));
  await shot(page, 'data-after-prices-BEFORE');

  // ---- Step: sell the existing Standard tub. Switch to Map canvas (the barge HUD lives there, not Data) ----
  await page.getByRole('tab', { name: 'Map', exact: true }).first().click();
  await page.waitForTimeout(250);
  await page.locator('.barge').first().click();   // opens quick harvest (plain pile)
  await page.waitForTimeout(250);
  note('Tub tap sheet (quick):', await sheetText(page));
  // go to full sheet for the price field
  await page.getByText('More options').first().click();
  await page.waitForTimeout(250);
  note('Full harvest sheet:', await sheetText(page));
  // count prefilled 3200; set a wholesale override 0.80
  const hCount = page.locator('#sheet input[placeholder="How many"]');
  const hPrice = page.locator('#sheet input[placeholder="$/oyster"]');
  await hCount.fill('3200');
  await hPrice.fill('0.80');
  const hNote = page.locator('#sheet textarea');
  await hNote.fill('Wholesale truck — full tub');
  await shot(page, 'harvest-standard-tub-form');
  await page.getByRole('button', { name: 'Harvest', exact: true }).click();
  await page.waitForTimeout(300);
  s = await snap(page);
  note('AFTER selling tub: barge=', s.barge, '| last log=', s.harvestLog[s.harvestLog.length-1]);

  // ---- Step: harvest log + revenue to date ----
  await page.evaluate(()=>{ if(typeof closeSheet==='function') closeSheet(); });
  await page.getByRole('button', { name: 'Menu' }).first().click();
  await page.waitForTimeout(200);
  await page.locator('#sheet').getByText('Harvest Log', { exact: true }).first().click();
  await page.waitForTimeout(250);
  note('Harvest Log sheet:', await sheetText(page));
  await shot(page, 'harvest-log-after-standard');
  await page.evaluate(()=>closeSheet());
  await page.waitForTimeout(150);

  // ---- Step: $ on the water AFTER selling tub (Data tab) ----
  await page.getByRole('tab', { name: 'Data', exact: true }).first().click();
  await page.waitForTimeout(250);
  const afterDash = (await snap(page)).dash;
  note('DASH after selling tub: cropValue=$'+afterDash.cropValue.toFixed(2), 'oysters(incl tub)='+afterDash.oysters, 'tub='+afterDash.tub);
  note('   delta cropValue =', (afterDash.cropValue-beforeDash.cropValue).toFixed(2), '| delta oysters =', (afterDash.oysters-beforeDash.oysters));
  await shot(page, 'data-AFTER-selling-tub');

  // ---- Step: pull market-ready Jumbos to the now-empty tub ----
  // navigation to the work map (setup); the PULL itself is real taps
  await page.evaluate(()=>SpatMapDebug.showWorkList());
  await page.waitForTimeout(300);
  note('line names:', await page.evaluate(()=>window.SpatMapDebug.getFarm().lines.map(l=>l.name)));
  note('cages in DOM:', await page.evaluate(()=>document.querySelectorAll('[data-cage-id]').length));
  const line3 = await page.evaluate(() => {
    const f = window.SpatMapDebug.getFarm();
    let best=null;
    f.lines.forEach(l=>{ const jum=l.cages.filter(c=>c.batch && c.batch.grade==='Jumbo');
      if(jum.length && (!best || jum.length>best.filled.length))
        best={ name:l.name, filled: jum.map(c=>({id:c.id,label:c.label,grade:c.batch.grade,count:c.batch.count,size:c.batch.sizeMm})) }; });
    return best || { name:'(none)', filled:[] };
  });
  note('Jumbo line =', line3.name, '| filled cages:', line3.filled.length, line3.filled.map(c=>c.label+':'+c.grade+'/'+c.count).join(', '));
  // tap each filled Jumbo cage
  for (const c of line3.filled){
    await page.locator(`[data-cage-id="${c.id}"]`).click();
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(200);
  note('Popup after selecting Line 3:', await page.evaluate(()=>{ const p=document.querySelector('.popup'); return p?p.innerText.replace(/\n+/g,' | '):'(no popup)'; }));
  await shot(page, 'line3-selected-popup');
  // tap Pull
  await page.getByRole('button', { name: 'Pull', exact: true }).click();
  await page.waitForTimeout(300);
  s = await snap(page);
  note('Tub after pulling Line 3:', s.barge);
  await shot(page, 'tub-after-pull-jumbos');

  // ---- Step: TUB BATCH-SPLIT into named sub-batches by size/grade ----
  await page.locator('.barge').first().click();
  await page.waitForTimeout(250);
  // splits tub? it's a plain pile (no splits yet) → quick sheet; need full sheet
  let st = await sheetText(page);
  if (/More options/.test(st)){ await page.getByText('More options').first().click(); await page.waitForTimeout(200); }
  note('Harvest sheet (pre-split):', await sheetText(page));
  // open the split editor
  await page.getByText('Split into batches').first().click();
  await page.waitForTimeout(200);
  // Row 1: Restaurant XL, 2000, 88mm, Jumbo
  let rows = page.locator('#sheet .splitRow');
  await rows.nth(0).locator('input.sr-count').fill('2000');
  await rows.nth(0).locator('input.sr-size').fill('88');
  await rows.nth(0).locator('select.sr-grade').selectOption({ label: 'Jumbo' });
  await rows.nth(0).locator('input.sr-label').fill('Restaurant XL');
  // add a second batch
  await page.getByText('Add batch').first().click();
  await page.waitForTimeout(150);
  rows = page.locator('#sheet .splitRow');
  await rows.nth(1).locator('input.sr-count').fill('2000');
  await rows.nth(1).locator('input.sr-size').fill('78');
  await rows.nth(1).locator('select.sr-grade').selectOption({ label: 'Standard' });
  await rows.nth(1).locator('input.sr-label').fill('Bar select');
  await page.waitForTimeout(150);
  note('split remaining readout:', await page.evaluate(()=>{ const r=document.querySelector('.splitRemain'); return r?r.textContent:'(none)'; }));
  await shot(page, 'split-editor-filled');
  await page.getByRole('button', { name: 'Save batches', exact: true }).click();
  await page.waitForTimeout(300);
  s = await snap(page);
  note('Tub after split:', s.barge);
  await shot(page, 'harvest-sheet-after-split');

  // examine the split chips for a projected market date
  const chipInfo = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('#sheet .batchChip'));
    return chips.map(c => c.innerText.replace(/\n+/g,' | '));
  });
  note('Split chip faces:', JSON.stringify(chipInfo));
  // close + reopen tub to see the barge HUD pill ("N batches sorted")
  await page.evaluate(()=>closeSheet());
  await page.waitForTimeout(150);
  await page.evaluate(()=>SpatMapDebug.render());
  await page.waitForTimeout(200);
  note('Barge HUD pill:', await page.evaluate(()=>{ const b=document.querySelector('.barge'); return b?b.innerText.replace(/\n+/g,' | '):'(no barge)'; }));
  await shot(page, 'barge-hud-sorted');

  // ---- Step: harvest the remainder (1400 Jumbo) with revenue ----
  await page.locator('.barge').first().click();
  await page.waitForTimeout(250);
  note('Harvest sheet (split tub):', await sheetText(page));
  const rCount = page.locator('#sheet input[placeholder="How many"]');
  const rPrice = page.locator('#sheet input[placeholder="$/oyster"]');
  note('remainder count prefilled =', await rCount.inputValue(), '| price prefilled =', await rPrice.inputValue());
  // sell the whole remainder at the standing Jumbo price (no override)
  await shot(page, 'remainder-harvest-form');
  await page.getByRole('button', { name: 'Harvest', exact: true }).click();
  await page.waitForTimeout(300);
  s = await snap(page);
  note('After remainder harvest: barge=', s.barge);
  note('Harvest log entries now:', s.harvestLog.length);
  s.harvestLog.forEach((e,i)=>note('  log['+i+']', JSON.stringify(e)));

  // ---- Step: harvest log + revenue-to-date after remainder ----
  await page.evaluate(()=>closeSheet());
  await page.getByRole('button', { name: 'Menu' }).first().click();
  await page.waitForTimeout(200);
  await page.locator('#sheet').getByText('Harvest Log', { exact: true }).first().click();
  await page.waitForTimeout(250);
  note('Harvest Log (final):', await sheetText(page));
  await shot(page, 'harvest-log-final');
  await page.evaluate(()=>closeSheet());

  // ---- Step: HARVEST FORECAST + grade inventory ----
  await page.getByRole('button', { name: 'Menu' }).first().click();
  await page.waitForTimeout(200);
  await page.locator('#sheet').getByText('Harvest forecast', { exact: true }).first().click();
  await page.waitForTimeout(250);
  note('Harvest forecast sheet:', await sheetText(page));
  await shot(page, 'harvest-forecast');
  const fc = await page.evaluate(()=>{ try{ return harvestForecast(window.SpatMapDebug.getFarm()); }catch(e){ return {err:String(e)}; } });
  note('forecast obj: readyNow=', fc.readyNow, 'months=', JSON.stringify(fc.months), 'later=', fc.later, 'grades=', JSON.stringify(fc.grades));
  await page.evaluate(()=>closeSheet());

  // ---- Step: final dashboard with 4k SORTED oysters sitting in the tub ----
  const finalDash = (await snap(page)).dash;
  note('FINAL dash (4k sorted in tub): cropValue=$'+finalDash.cropValue.toFixed(2), 'oysters(incl tub)='+finalDash.oysters, 'tub='+finalDash.tub);
  const tubVal = await page.evaluate(()=>{ const f=window.SpatMapDebug.getFarm(); let v=0; (f.barge.splits||[]).forEach(s=>{ const p=priceForGrade(f,s.grade); if(p!=null&&s.count!=null) v+=p*s.count; }); return v; });
  note('   sorted-tub value (priced) = $'+tubVal.toFixed(2)+' — NOT included in $ on the water');

  // ---- Step: CSV EXPORTS (Data menu) ----
  await page.getByRole('button', { name: 'Menu' }).first().click();
  await page.waitForTimeout(200);
  await page.locator('#sheet').getByText('Data', { exact: true }).first().click();
  await page.waitForTimeout(250);
  note('Data menu:', await sheetText(page));
  await shot(page, 'data-menu-csv');

  // Stock CSV
  let dl = page.waitForEvent('download', { timeout: 5000 }).catch(()=>null);
  await page.locator('#sheet').getByText('Stock on hand').first().click();
  let d = await dl;
  if (d){ const p = join(CSVDIR, 'stock.csv'); await d.saveAs(p); note('stock CSV saved →', p, '| suggested:', d.suggestedFilename()); }
  else note('!! stock CSV: no download event');
  await page.waitForTimeout(200);

  // Harvest CSV
  dl = page.waitForEvent('download', { timeout: 5000 }).catch(()=>null);
  await page.locator('#sheet').getByText('Harvest log').first().click();
  d = await dl;
  if (d){ const p = join(CSVDIR, 'harvests.csv'); await d.saveAs(p); note('harvest CSV saved →', p, '| suggested:', d.suggestedFilename()); }
  else note('!! harvest CSV: no download event');
  await page.waitForTimeout(200);
  await page.evaluate(()=>closeSheet());

  await context.close();
}

/* ===================== INACCURACY PROBE: grade comingle ===================== */
async function comingleProbe(){
  const context = await browser.newContext({ ...devices['iPhone 14 Pro Max'] });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push('[pageerror/probe] '+String(e).slice(0,200)));
  await page.clock.install({ time: new Date('2026-10-15T09:00:00') });
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug');
  await page.evaluate(() => { SpatMapDebug.loadBrightside(); SpatMapDebug.save(); SpatMapDebug.render(); });
  await page.waitForTimeout(200);
  // tub seeded = 3200 Standard @60mm. Pull ONE Line 3 Jumbo cage (82mm) onto it → comingle.
  await page.evaluate(()=>SpatMapDebug.showWorkList());
  await page.waitForTimeout(250);
  const tubBefore = await snap(page);
  note('PROBE tub before comingle:', tubBefore.barge);
  const oneJumbo = await page.evaluate(()=>{
    const f=window.SpatMapDebug.getFarm();
    for(const l of f.lines){ const c=l.cages.find(x=>x.batch && x.batch.grade==='Jumbo'); if(c) return {id:c.id,label:c.label,grade:c.batch.grade,size:c.batch.sizeMm,count:c.batch.count}; }
    return null;
  });
  note('PROBE pulling one cage:', oneJumbo);
  await page.locator(`[data-cage-id="${oneJumbo.id}"]`).click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Pull', exact: true }).click();
  await page.waitForTimeout(300);
  const tubAfter = await snap(page);
  note('PROBE tub AFTER comingle (Standard pile + 1 Jumbo cage):', tubAfter.barge);
  note('   grade:', tubBefore.barge.grade, '->', tubAfter.barge.grade, '| size:', tubBefore.barge.sizeMm, '->', tubAfter.barge.sizeMm, '| count:', tubBefore.barge.count, '->', tubAfter.barge.count);
  await page.locator('.barge').first().click();
  await page.waitForTimeout(250);
  note('PROBE harvest sheet (comingled tub):', await sheetText(page));
  await shot(page, 'comingle-probe-tub');
  await context.close();
}

try {
  await mainFlow();
  await comingleProbe();
} catch (e) {
  note('!!! SCRIPT ERROR:', String(e), e && e.stack ? e.stack.split('\n').slice(0,4).join(' / ') : '');
}

note('\n=== CONSOLE/PAGE ERRORS ('+errors.length+') ===');
errors.forEach(e=>note(e));
writeFileSync(join(SHOTS, '_run-log.txt'), log.join('\n'));
await browser.close();
note('\nDONE. log → '+join(SHOTS,'_run-log.txt'));
