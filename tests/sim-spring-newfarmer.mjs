// Spring / new-farmer simulation — persona "April".
// Drives the EMPTY onboarding (fresh-farmer path), builds a farm, stocks seed,
// sets grades + prices, reads the dashboard, then jumps the clock to see the
// growth forecast. Local file, headless iPhone viewport. Screenshots + a JSON
// log are written for human reading.

import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const SHOTS = join(HERE, 'reports', 'shots', 'spring-newfarmer');
mkdirSync(SHOTS, { recursive: true });

const DEVICE = process.env.DEV || 'iPhone 14 Pro Max';
const SPRING = '2026-03-20T09:00:00';   // first day of spring, April's first run
const SUMMER = '2026-06-03T09:00:00';   // +75 days — peek at growth

const log = [];
function L(...a){ const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); log.push(s); console.log(s); }

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices[DEVICE] });
const page = await context.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', e => errors.push(String(e).slice(0, 300)));

await page.clock.setFixedTime(new Date(SPRING));

let shotN = 0;
async function shot(name){
  shotN++;
  const file = String(shotN).padStart(2, '0') + '-' + name + '.png';
  await page.screenshot({ path: join(SHOTS, file), fullPage: false }).catch(e => L('shot fail', name, String(e)));
  L('  shot', file);
  return file;
}
async function pause(ms){ await page.waitForTimeout(ms); }
async function txt(sel){ return (await page.locator(sel).innerText().catch(()=> '')).replace(/\n{2,}/g,'\n').slice(0,500); }
async function sheetText(){ return (await page.locator('#sheet').innerText().catch(()=> '(no sheet)')).slice(0,600); }

async function dump(label){
  const st = await page.evaluate(() => {
    const D = window.SpatMapDebug;
    const f = D && D.getFarm && D.getFarm();
    let ls = null; try { ls = D.layoutState(); } catch(e){}
    return {
      home: D && D.getHomeMode && D.getHomeMode(),
      view: ls && { viewMode: ls.viewMode, scoped: !!ls.viewScope, tier: ls.tier },
      farm: f ? {
        grades: f.grades, prices: f.settings && f.settings.gradePrices, defPrice: f.settings && f.settings.defaultPrice,
        lines: (f.lines||[]).length,
        cages: (f.lines||[]).reduce((n,l)=>n+(l.cages||[]).length,0),
        filled: (f.lines||[]).reduce((n,l)=>n+(l.cages||[]).filter(c=>c.batch).length,0),
        batches: (f.batches||[]).length,
        batchSample: (f.batches||[]).slice(0,2).map(b=>({count:b.count,size:b.sizeMm,ploidy:b.ploidy,hatch:b.hatchery,grade:b.grade,stocked:b.stockedDate})),
      } : null,
    };
  }).catch(e => ({ error: String(e) }));
  L('STATE ['+label+']', JSON.stringify(st));
  return st;
}

// ─────────────────────────────────────────────────────────────────────────
L('=== BOOT (clock faked to ' + SPRING + ') ===');
await page.goto(APP, { waitUntil: 'load' });
await page.waitForFunction('window.SpatMapDebug');
await page.evaluate(() => { SpatMapDebug.state.farms = []; localStorage.removeItem('cageTrackerData'); localStorage.removeItem('spatmap.v2.neighborCoach'); });
await page.reload({ waitUntil: 'load' });
await page.waitForFunction('window.SpatMapDebug');
await pause(300);
await dump('fresh boot');
await shot('onboarding-welcome');

// ─── ONBOARDING WIZARD ───
L('=== ONBOARDING ===');
await page.getByRole('button', { name: 'Build my farm' }).tap();
await pause(250);
await shot('wizard-name-step');

const nameIn = page.locator('.obBody input[type="text"]').first();
await nameIn.tap(); await nameIn.fill('Tidewater Oyster Co.');
await pause(150);
const nextDisabled = await page.getByRole('button', { name: 'Next' }).isDisabled().catch(()=>null);
L('Next disabled after name typed?', nextDisabled);
await shot('name-typed');
await page.getByRole('button', { name: 'Next' }).tap();
await pause(250);
await shot('wizard-gear-step');

// gear: rename default -> FlipFarm rect 6mm; add OysterGro circle 9mm
const t0 = page.locator('.typeRow').first();
await t0.locator('.tname').tap(); await t0.locator('.tname').fill('FlipFarm');
await t0.locator('.sbtn').nth(1).tap();
await t0.locator('.tmesh').tap(); await t0.locator('.tmesh').fill('6');
await page.getByRole('button', { name: 'Add type' }).tap();
await pause(150);
const t1 = page.locator('.typeRow').nth(1);
await t1.locator('.tname').tap(); await t1.locator('.tname').fill('OysterGro');
await t1.locator('.sbtn').nth(2).tap();
await t1.locator('.tmesh').tap(); await t1.locator('.tmesh').fill('9');
await pause(150);
await shot('gear-two-types');
await page.getByRole('button', { name: 'Next' }).tap();
await pause(250);
await shot('wizard-review');

await page.getByRole('button', { name: 'Create farm' }).tap();
await pause(600);
await dump('after create');
await shot('layout-firstrun');

await page.getByRole('button', { name: 'Finish' }).tap();
await pause(600);
await dump('after finish (overview home)');
await shot('overview-home');

// ─── PHASE 2: get from the overview to the work map to stock seed ───
L('=== PHASE 2: navigate Overview -> Work to stock ===');
// look for the explicit "Open >" chip the map draws on a scoped area
let navTaps = 0;
let scoped = false;
async function isScoped(){ return await page.evaluate(() => { try { return !!SpatMapDebug.layoutState().viewScope; } catch(e){ return false; } }); }

const chipCount = await page.locator('.lp-openchip').count();
L('Open-> chip present on overview?', chipCount);
if (chipCount){
  await page.locator('.lp-openchip').first().tap(); navTaps++;
  await pause(700);
  scoped = await isScoped();
}
if (!scoped){
  // tap the area body (upper region, away from the centre ropes) a few times
  for (let i=0; i<4 && !scoped; i++){
    const ab = page.locator('.lp-areabody').first();
    const box = await ab.boundingBox().catch(()=>null);
    if (!box){ L('no .lp-areabody box'); break; }
    await page.touchscreen.tap(box.x + box.width*0.5, box.y + box.height*0.18);
    navTaps++;
    await pause(700);
    scoped = await isScoped();
    L('after area-body tap #'+navTaps+' scoped?', scoped);
  }
}
L('navTaps to reach Work map:', navTaps, 'scoped?', scoped);
await dump('after nav attempt');
await shot('after-nav-to-work');
if (!scoped){
  L('FALLBACK: real taps did not drill into Work; using SpatMapDebug.drillFirstAreaOverview to proceed (NAV FRICTION).');
  await page.evaluate(() => SpatMapDebug.drillFirstAreaOverview());
  await pause(600);
  await shot('work-map-via-fallback');
}
L('work map text:', await txt('#app'));

// ─── PHASE 3: stock spring seed ───
L('=== PHASE 3: stock spring seed via Select -> Fill ===');
// tap the first 5 empty cages on the first line
const firstLine = page.locator('.lineRow').first();
const cells = firstLine.locator('.cage');
const cellCount = await cells.count();
L('cages on first line:', cellCount);
for (let i=0; i<Math.min(5, cellCount); i++){
  await cells.nth(i).tap();
  await pause(120);
}
await pause(300);
await shot('cages-selected');
L('popup text:', await txt('.popup'));
const selCount = await page.evaluate(()=> { try { return SpatMapDebug.state && Object.keys(SpatMapDebug.state).length ? null : null; } catch(e){ return null; } });
// tap Fill in the popup
const fillBtn = page.locator('.pbtn.fill');
if (await fillBtn.count()){
  await fillBtn.first().tap();
  await pause(400);
} else { L('NO Fill button in popup'); }
await shot('fill-form');
L('fill sheet text:', await sheetText());

// fill the form
async function fillByPlaceholder(ph, val){ const el = page.getByPlaceholder(ph).first(); if (await el.count()){ await el.tap(); await el.fill(val); L('  filled', ph, '=', val); } else L('  MISSING field', ph); }
await fillByPlaceholder('e.g. 600', '750');     // count
await fillByPlaceholder('e.g. 22', '12');       // size mm
// ploidy chip
const tri = page.locator('#sheet .chip', { hasText: 'Triploid' });
if (await tri.count()){ await tri.first().tap(); L('  tapped Triploid'); }
await fillByPlaceholder('Where the seed came from', 'Grand Isle Hatchery');
await pause(150);
await shot('fill-form-filled');
// submit
const submit = page.locator('#sheet button', { hasText: /^Fill \d+ cage/ });
if (await submit.count()){ await submit.first().tap(); L('tapped Fill N cages'); }
else { L('NO submit Fill button; sheet buttons:', await page.locator('#sheet button').allInnerTexts().catch(()=>[])); }
await pause(600);
await dump('after first stock');
await shot('after-stock');

// stock a SECOND batch on the next line (different seed) to make the map colourful
L('=== stock a second batch on line 2 ===');
const line2 = page.locator('.lineRow').nth(1);
const cells2 = line2.locator('.cage');
const c2n = await cells2.count();
for (let i=0; i<Math.min(4, c2n); i++){ await cells2.nth(i).tap(); await pause(120); }
await pause(250);
const fill2 = page.locator('.pbtn.fill');
if (await fill2.count()){ await fill2.first().tap(); await pause(400); }
await fillByPlaceholder('e.g. 600', '1200');
await fillByPlaceholder('e.g. 22', '10');
const tri2 = page.locator('#sheet .chip', { hasText: 'Triploid' });
if (await tri2.count()) await tri2.first().tap();
await fillByPlaceholder('Where the seed came from', 'Grand Isle Hatchery');
const submit2 = page.locator('#sheet button', { hasText: /^Fill \d+ cage/ });
if (await submit2.count()) await submit2.first().tap();
await pause(600);
await dump('after second stock');
await shot('after-stock-2');

// ─── PHASE 4: grades + prices ───
L('=== PHASE 4: grades + prices ===');
// open menu
async function openMenu(){ await page.locator('.menuBtn[aria-label="Menu"]').first().tap(); await pause(350); }
await openMenu();
await shot('menu-open');
L('menu text:', await sheetText());
// Grades
const gradesItem = page.locator('#sheet .menuItem', { hasText: 'Grades' });
if (await gradesItem.count()){ await gradesItem.first().tap(); await pause(350); }
else L('NO Grades menu item');
await shot('grades-sheet');
L('grades sheet:', await sheetText());
const gradeInput = page.getByPlaceholder('Add grade + Enter');
for (const g of ['Standard','Petite','Jumbo']){
  if (await gradeInput.count()){ await gradeInput.first().tap(); await gradeInput.first().fill(g); await page.keyboard.press('Enter'); await pause(200); L('  added grade', g); }
}
await shot('grades-added');
// Done
const gDone = page.locator('#sheet button', { hasText: /^Done$/ });
if (await gDone.count()) await gDone.first().tap();
await pause(300);
await dump('after grades');

// Prices — via menu -> Grades? No, prices live in their own sheet. Reach via Forecast or dashboard.
// Use the dashboard money CTA as the natural discovery path. First go to Data tab.
L('=== set prices ===');
await openMenu();
const pricesViaForecast = page.locator('#sheet .menuItem', { hasText: 'Harvest forecast' });
// Prefer the explicit "Oyster prices" path: open Forecast, then Oyster prices row.
if (await pricesViaForecast.count()){ await pricesViaForecast.first().tap(); await pause(350); }
await shot('forecast-before-prices');
L('forecast sheet:', await sheetText());
const opRow = page.locator('#sheet', { hasText: 'Oyster prices' }).locator('.menuItem', { hasText: 'Oyster prices' });
const opAny = page.locator('#sheet .menuItem', { hasText: 'Oyster prices' });
if (await opAny.count()){ await opAny.first().tap(); await pause(350); }
else { L('NO Oyster prices row in forecast; trying menu fallback'); }
await shot('prices-sheet');
L('prices sheet:', await sheetText());
// fill per-grade prices + default
const priceInputs = page.locator('#sheet .priceRow input');
const priceN = await priceInputs.count();
L('price rows:', priceN);
const priceVals = ['0.55','0.75','1.10','0.45'];   // Standard, Petite, Jumbo, Default
for (let i=0; i<priceN; i++){ await priceInputs.nth(i).tap(); await priceInputs.nth(i).fill(priceVals[i] || '0.50'); await pause(150); }
await shot('prices-filled');
const pDone = page.locator('#sheet button', { hasText: /^Done$/ });
if (await pDone.count()) await pDone.first().tap();
await pause(400);
await dump('after prices');

// ─── PHASE 5: read the dashboard ($ on the water) ───
L('=== PHASE 5: dashboard ===');
// get back to overview home, then Data tab
await page.evaluate(()=> SpatMapDebug.enterOverview());
await pause(500);
await shot('overview-after-stock');
// tap Data toggle
const dataTab = page.locator('.ovSegBtn', { hasText: /^Data$/ });
if (await dataTab.count()){ await dataTab.first().tap(); await pause(500); }
else L('NO Data tab button');
await shot('dashboard');
L('dashboard text:', await txt('#app'));
await dump('dashboard');

// ─── PHASE 6: forecast now + jump clock to summer ───
L('=== PHASE 6: forecast now (spring) ===');
await page.locator('.menuBtn[aria-label="Menu"]').first().tap(); await pause(350);
const fcItem = page.locator('#sheet .menuItem', { hasText: 'Harvest forecast' });
if (await fcItem.count()){ await fcItem.first().tap(); await pause(400); }
await shot('forecast-spring');
L('forecast (spring):', await sheetText());
await page.evaluate(()=> { try { closeSheet(); } catch(e){} });
await pause(200);

L('=== jump clock +75d to ' + SUMMER + ' ===');
await page.clock.setFixedTime(new Date(SUMMER));
await page.evaluate(()=> SpatMapDebug.render());
await pause(400);
await shot('overview-summer');
// reopen forecast
await page.evaluate(()=> SpatMapDebug.enterOverview());
await pause(300);
await page.locator('.menuBtn[aria-label="Menu"]').first().tap(); await pause(350);
const fcItem2 = page.locator('#sheet .menuItem', { hasText: 'Harvest forecast' });
if (await fcItem2.count()){ await fcItem2.first().tap(); await pause(400); }
await shot('forecast-summer');
L('forecast (summer +75d):', await sheetText());
await dump('summer');

writeFileSync(join(SHOTS, '_log.json'), JSON.stringify({ device: DEVICE, errors, log }, null, 2));
L('=== DONE. JS errors:', errors.length, '===');
if (errors.length) L('ERRORS:', JSON.stringify(errors, null, 2));

await browser.close();
