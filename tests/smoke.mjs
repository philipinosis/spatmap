// SpatMap mobile smoke + friction harness.
// Drives the LOCAL file in real phone viewports, seeds deterministic demo data
// (SpatMapDebug.loadBrightside), tours the core screens, and reports friction:
// JS errors, tiny tap targets, tiny text, horizontal overflow, off-screen controls,
// broken persistence, and broken offline reload.
//
// Run:  cd tests && npm run smoke         (headless, ~15s)
//       HEADED=1 npm run smoke            (watch it drive a phone-sized window)
// Output: tests/report/report.md + report.json + *.png

import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const OUT = join(HERE, 'report');
mkdirSync(OUT, { recursive: true });

// Smallest-common + roomy phone. SE is the worst case that surfaces overflow.
const TARGETS = ['iPhone SE', 'iPhone 14 Pro Max'];

// Screens reachable via the app's own testing API.
const SCREENS = [
  ['overview', () => window.SpatMapDebug.enterOverview()],
  ['worklist', () => window.SpatMapDebug.showWorkList()],
  ['layout',   () => window.SpatMapDebug.enterLayout()],
  ['area',     () => { window.SpatMapDebug.enterOverview(); window.SpatMapDebug.drillFirstAreaOverview(); }],
];

// In-page friction audit. Apple HIG minimum tap target is 44x44 CSS px.
// ponytail: cursor:pointer + semantic tags catches most clickable elements;
// it can't see bare addEventListener divs with default cursor — upgrade to
// instrumenting addEventListener if that blind spot ever bites.
function AUDIT() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const vis = el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = el => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (typeof el.className === 'string' && el.className.trim())
      s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    return t ? `${s} "${t}"` : s;
  };
  // A control is a thing the user taps. Exclude SVG internals (map markers, icon
  // paths inherit cursor:pointer from a clickable parent but aren't separate
  // targets) and nested controls (count the outermost tappable, not its children).
  const isControl = el => {
    if (el instanceof SVGElement) return false;
    const tag = el.tagName.toLowerCase();
    if (['button', 'a', 'input', 'select', 'textarea', 'label'].includes(tag)) return true;
    if (el.getAttribute('role') === 'button' || el.hasAttribute('onclick') || el.hasAttribute('tabindex')) return true;
    return getComputedStyle(el).cursor === 'pointer';
  };
  const candidates = Array.from(document.querySelectorAll('body *')).filter(el => vis(el) && isControl(el));
  const candSet = new Set(candidates);
  const outermost = candidates.filter(el => {
    for (let p = el.parentElement; p; p = p.parentElement) if (candSet.has(p)) return false;
    return true;
  });

  const tiny = [], offscreen = [];
  let count = 0;
  for (const el of outermost) {
    count++;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) tiny.push({ el: name(el), w: Math.round(r.width), h: Math.round(r.height) });
    if (r.right < 0 || r.left > vw + 1) offscreen.push({ el: name(el), left: Math.round(r.left), right: Math.round(r.right) });
  }
  const small = Array.from(document.querySelectorAll('body *')).filter(el => {
    if (!vis(el)) return false;
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    return hasText && parseFloat(getComputedStyle(el).fontSize) < 11;
  });
  return {
    vw, vh,
    horizontalOverflow: document.documentElement.scrollWidth > vw + 2,
    scrollW: document.documentElement.scrollWidth,
    interactiveCount: count,
    tinyTargetCount: tiny.length,
    tinyTargets: tiny.sort((a, b) => a.w * a.h - b.w * b.h).slice(0, 15),
    offscreenCount: offscreen.length,
    offscreen: offscreen.slice(0, 10),
    tinyTextCount: small.length,
    tinyText: small.slice(0, 12).map(el => ({ el: name(el), px: +parseFloat(getComputedStyle(el).fontSize).toFixed(1) })),
  };
}

async function waitBoot(page, ms = 10000) {
  return page.waitForFunction('window.SpatMapDebug && typeof window.SpatMapDebug.getFarm === "function"', { timeout: ms })
    .then(() => true).catch(() => false);
}

async function runDevice(deviceName) {
  const browser = await chromium.launch({ headless: !process.env.HEADED });
  const context = await browser.newContext({ ...devices[deviceName] });
  const page = await context.newPage();

  const errors = [];      // {phase, type, text}
  const reqFailures = []; // {phase, url}
  let phase = 'boot';
  page.on('console', m => { if (m.type() === 'error') errors.push({ phase, type: 'console', text: m.text().slice(0, 300) }); });
  page.on('pageerror', e => errors.push({ phase, type: 'pageerror', text: String(e).slice(0, 300) }));
  page.on('requestfailed', r => reqFailures.push({ phase, url: r.url().slice(0, 200) }));

  const result = { device: deviceName, viewport: devices[deviceName].viewport, screens: [], errors, reqFailures };

  // --- boot ---
  await page.goto(APP, { waitUntil: 'load' });
  result.booted = await waitBoot(page);

  // --- seed deterministic demo farm ---
  phase = 'seed';
  result.seeded = await page.evaluate(() => {
    window.SpatMapDebug.loadBrightside();
    window.SpatMapDebug.save();
    window.SpatMapDebug.render();
    const f = window.SpatMapDebug.getFarm();
    return { name: f && f.name, lines: (f && f.lines || []).length, batches: (f && f.batches || []).length };
  }).catch(e => ({ error: String(e) }));

  // --- screen tour + friction audit ---
  for (const [label, nav] of SCREENS) {
    phase = label;
    let audit = null, navErr = null;
    try {
      await page.evaluate(nav);
      await page.waitForTimeout(300);
      audit = await page.evaluate(AUDIT);
    } catch (e) { navErr = String(e).slice(0, 200); }
    const shot = `${deviceName.replace(/\s+/g, '_')}__${label}.png`;
    await page.screenshot({ path: join(OUT, shot), fullPage: false }).catch(() => {});
    result.screens.push({ label, navErr, shot, audit });
  }

  // --- persistence across reload (the offline-tracker core promise) ---
  phase = 'persist';
  const before = await page.evaluate(() => {
    const f = window.SpatMapDebug.getFarm();
    return { name: f && f.name, plots: (f && f.plots || []).length };
  });
  await page.evaluate(() => { window.SpatMapDebug.addPlot(); window.SpatMapDebug.commit(); window.SpatMapDebug.save(); });
  const afterAdd = await page.evaluate(() => ({ plots: (window.SpatMapDebug.getFarm().plots || []).length }));
  await page.reload({ waitUntil: 'load' });
  await waitBoot(page);
  const afterReload = await page.evaluate(() => {
    const f = window.SpatMapDebug.getFarm();
    return { name: f && f.name, plots: (f && f.plots || []).length };
  });
  result.persistence = {
    before, afterAdd, afterReload,
    nameSurvived: afterReload.name === before.name,
    addSurvived: afterReload.plots === afterAdd.plots,
  };

  // --- offline reload (no network at sea) ---
  phase = 'offline';
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  const offlineBoot = await waitBoot(page, 8000);
  const offlineFarm = await page.evaluate(() => {
    const f = window.SpatMapDebug && window.SpatMapDebug.getFarm();
    return f ? f.name : null;
  }).catch(() => null);
  await context.setOffline(false);
  result.offline = { booted: offlineBoot, farm: offlineFarm, externalReqFailures: reqFailures.filter(r => r.phase === 'offline') };

  await browser.close();
  return result;
}

function md(all) {
  const L = [];
  L.push('# SpatMap mobile friction report', '');
  L.push(`Generated against \`spatmap.html\` in ${all.map(r => r.device).join(' + ')}.`, '');
  for (const r of all) {
    const vp = `${r.viewport.width}×${r.viewport.height}`;
    L.push(`## ${r.device} (${vp})`, '');
    L.push(`- Boot: ${r.booted ? 'OK' : '**FAILED**'}`);
    L.push(`- Seed: ${r.seeded && r.seeded.name ? `${r.seeded.name} — ${r.seeded.lines} lines, ${r.seeded.batches} batches` : '**FAILED**'}`);
    L.push(`- Persistence: name ${r.persistence?.nameSurvived ? 'OK' : '**LOST**'}, added-plot ${r.persistence?.addSurvived ? 'OK' : '**LOST**'} (${r.persistence?.before?.plots}→${r.persistence?.afterAdd?.plots}→${r.persistence?.afterReload?.plots})`);
    L.push(`- Offline reload: ${r.offline?.booted ? 'OK' : '**FAILED**'}${r.offline?.externalReqFailures?.length ? ` — ${r.offline.externalReqFailures.length} external request(s) failed offline` : ''}`);
    L.push(`- JS errors: ${r.errors.length ? `**${r.errors.length}**` : '0'}`);
    L.push('');
    if (r.errors.length) {
      L.push('### JS errors');
      for (const e of r.errors.slice(0, 20)) L.push(`- \`[${e.phase}]\` ${e.type}: ${e.text}`);
      L.push('');
    }
    L.push('### Per-screen friction', '');
    L.push('| screen | overflow | tap targets <44px | text <11px | off-screen | controls |');
    L.push('|---|---|---|---|---|---|');
    for (const s of r.screens) {
      if (s.navErr) { L.push(`| ${s.label} | nav error: ${s.navErr} | | | | |`); continue; }
      const a = s.audit || {};
      L.push(`| ${s.label} | ${a.horizontalOverflow ? `**yes** (${a.scrollW}px)` : 'no'} | ${a.tinyTargetCount} | ${a.tinyTextCount} | ${a.offscreenCount} | ${a.interactiveCount} |`);
    }
    L.push('');
    for (const s of r.screens) {
      const a = s.audit; if (!a) continue;
      if (a.tinyTargets?.length) {
        L.push(`<details><summary>${s.label}: smallest tap targets</summary>`, '');
        for (const t of a.tinyTargets) L.push(`- ${t.w}×${t.h}px — ${t.el}`);
        L.push('', '</details>');
      }
    }
    L.push('');
  }
  return L.join('\n');
}

const all = [];
for (const d of TARGETS) {
  process.stdout.write(`running ${d}... `);
  all.push(await runDevice(d));
  console.log('done');
}
writeFileSync(join(OUT, 'report.json'), JSON.stringify(all, null, 2));
writeFileSync(join(OUT, 'report.md'), md(all));

// terse console summary
for (const r of all) {
  const tt = r.screens.reduce((n, s) => n + (s.audit?.tinyTargetCount || 0), 0);
  const ovf = r.screens.filter(s => s.audit?.horizontalOverflow).map(s => s.label);
  console.log(`\n${r.device}: boot=${r.booted} offline=${r.offline?.booted} persist=${r.persistence?.nameSurvived && r.persistence?.addSurvived} jsErrors=${r.errors.length} tinyTargets=${tt} overflow=[${ovf.join(',')}]`);
}
console.log(`\nreport: ${join(OUT, 'report.md')}`);
const hardFail = all.some(r => !r.booted || !r.offline?.booted || r.errors.length);
process.exit(hardFail ? 1 : 0);
