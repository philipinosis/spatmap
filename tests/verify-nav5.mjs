// verify-nav5.mjs — probe the two-tap-open logic deterministically.
// Dispatch two TOUCH pointerdown/up pairs on the SAME cage cell (identical client coords),
// separated by a controlled delay, and read LAYOUT + overlay after each.
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const SHOTS = join(HERE, 'reports', 'shots', 'verify-nav');
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// fire one touch tap (pointerdown+up) at the center of the FIRST cage cell, via real coords through the svg
const tapCageSynthetic = (page) => page.evaluate(() => {
  const cell = document.querySelector('#layoutWorld [data-cage-id]');
  const r = cell.getBoundingClientRect();
  const x = r.x + r.width / 2, y = r.y + r.height / 2;
  const tgt = document.elementFromPoint(x, y) || cell;
  const mk = (type) => new PointerEvent(type, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true });
  tgt.dispatchEvent(mk('pointerdown'));
  tgt.dispatchEvent(mk('pointerup'));
  return { id: cell.getAttribute('data-cage-id'), x: Math.round(x), y: Math.round(y), tgt: tgt.getAttribute('data-cage-id') || tgt.tagName };
});

const probe = (page) => page.evaluate(() => {
  const L = window.SpatMapDebug.LAYOUT;
  const o = document.getElementById('overlay'); const s = document.getElementById('sheet');
  const open = !!(o && o.classList.contains('open'));
  return { lastTapCageId: L.lastTapCageId, hlCage: L.hlCage || null, overlayOpen: open,
    sheetTxt: open ? s.innerText.replace(/\s+/g, ' ').trim().slice(0, 110) : '' };
});

async function run(deviceName, dt) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...devices[deviceName] });
  const page = await ctx.newPage();
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug');
  await page.evaluate(() => { window.SpatMapDebug.loadBrightside(); window.SpatMapDebug.save(); try { overviewTab = 'map'; } catch (e) {} window.SpatMapDebug.enterOverview(); });
  await sleep(550);
  const t1 = await tapCageSynthetic(page);
  const p1 = await probe(page);
  await sleep(dt);
  await tapCageSynthetic(page);
  await sleep(150);
  const p2 = await probe(page);
  if (p2.overlayOpen) await page.screenshot({ path: join(SHOTS, `${deviceName.replace(/\s+/g, '')}-2tap-OPEN-dt${dt}.png`) }).catch(() => {});
  await browser.close();
  return { deviceName, dt, t1, p1, p2 };
}

for (const d of ['iPhone SE', 'iPhone 14 Pro Max']) {
  for (const dt of [120, 200, 330, 450, 600]) {
    const r = await run(d, dt);
    console.log(`${d} dt=${dt} tappedCage=${r.t1.id} tgt=${r.t1.tgt}`);
    console.log(`   after tap1: lastTapCageId=${r.p1.lastTapCageId} hlCage=${r.p1.hlCage} overlay=${r.p1.overlayOpen}`);
    console.log(`   after tap2: overlayOpen=${r.p2.overlayOpen} sheet="${r.p2.sheetTxt}"`);
  }
}
console.log('shots:', SHOTS);
