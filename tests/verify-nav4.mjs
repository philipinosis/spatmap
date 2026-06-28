// verify-nav4.mjs — definitively confirm: two taps on a cage in the OVERVIEW MAP open the cage/stock sheet.
// Taps identical coordinates with dt in the two-tap-open window (>320ms double-tap floor, <700ms timer).
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const SHOTS = join(HERE, 'reports', 'shots', 'verify-nav');
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const overlayState = (page) => page.evaluate(() => {
  const o = document.getElementById('overlay'); const s = document.getElementById('sheet');
  const peek = document.getElementById('oysterPeek');
  return {
    overlayOpen: !!(o && o.classList.contains('open')),
    sheetTxt: (o && o.classList.contains('open')) ? s.innerText.replace(/\s+/g, ' ').trim().slice(0, 120) : '',
    peekVis: !!(peek && peek.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(peek).opacity) > 0.05),
    peekTxt: (peek && peek.getBoundingClientRect().width > 0) ? peek.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : '',
  };
});

async function run(deviceName, dt) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ...devices[deviceName] });
  const page = await ctx.newPage();
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug');
  await page.evaluate(() => { window.SpatMapDebug.loadBrightside(); window.SpatMapDebug.save(); });
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} try { overviewTab = 'map'; } catch (e) {} window.SpatMapDebug.enterOverview(); });
  await sleep(550);

  const cc = await page.evaluate(() => { const el = document.querySelector('#layoutWorld [data-cage-id]'); const r = el.getBoundingClientRect(); return { id: el.getAttribute('data-cage-id'), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; });

  await page.touchscreen.tap(cc.x, cc.y);
  await sleep(40);
  const afterTap1 = await overlayState(page);
  await sleep(dt);
  await page.touchscreen.tap(cc.x, cc.y);   // identical coordinates
  await sleep(450);
  const afterTap2 = await overlayState(page);
  if (afterTap2.overlayOpen) await page.screenshot({ path: join(SHOTS, `${deviceName.replace(/\s+/g, '')}-2tap-stocksheet-dt${dt}.png`) }).catch(() => {});

  await browser.close();
  return { deviceName, dt, cage: cc.id, afterTap1, afterTap2 };
}

for (const d of ['iPhone SE', 'iPhone 14 Pro Max']) {
  for (const dt of [380, 500]) {
    const r = await run(d, dt);
    console.log(`${d} dt=${dt}ms cage=${r.cage}`);
    console.log(`   tap1: peek=${r.afterTap1.peekVis} "${r.afterTap1.peekTxt}" overlay=${r.afterTap1.overlayOpen}`);
    console.log(`   tap2: overlayOpen=${r.afterTap2.overlayOpen} sheet="${r.afterTap2.sheetTxt}"`);
  }
}
console.log('shots:', SHOTS);
