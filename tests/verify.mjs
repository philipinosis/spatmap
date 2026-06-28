import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url'; import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const SHOTS = join(HERE, 'reports/shots/summer-deckhand');
mkdirSync(SHOTS, { recursive: true });
const out = {};

async function newPage(device){
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices[device] });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-07-15T09:00:00') });
  await page.goto(APP, { waitUntil: 'load' });
  await page.waitForFunction('window.SpatMapDebug');
  await page.evaluate(() => { SpatMapDebug.loadBrightside(); SpatMapDebug.save(); SpatMapDebug.render(); });
  await page.waitForTimeout(250);
  return { browser, context, page };
}
async function findRun(page, lineIdx, kind, len){
  return page.evaluate(({lineIdx, kind, len}) => {
    const strips=[...document.querySelectorAll('.cageStrip[data-line-id]')]; const strip=strips[lineIdx]; if(!strip) return null;
    const cells=[...strip.querySelectorAll('.cage[data-cage-id]')];
    const filled=cells.map(c=>!c.querySelector('.cellfill.empty')); const want=(kind==='filled');
    let run=[]; for(let i=0;i<cells.length;i++){ if(filled[i]===want){run.push(i); if(run.length>=len)break;} else run=[]; }
    if(!run.length) return null;
    const a=cells[run[0]],b=cells[run[run.length-1]]; const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
    return { ax:ra.x+ra.width/2,ay:ra.y+ra.height/2,bx:rb.x+rb.width/2,by:rb.y+rb.height/2, ids:run.map(i=>cells[i].getAttribute('data-cage-id')) };
  }, {lineIdx, kind, len});
}
async function dragRun(page, run){
  await page.mouse.move(run.ax,run.ay); await page.mouse.down();
  for(let i=1;i<=8;i++){ await page.mouse.move(run.ax+(run.bx-run.ax)*i/8, run.ay+(run.by-run.ay)*i/8); await page.waitForTimeout(20); }
  await page.mouse.up(); await page.waitForTimeout(300);
}

// ── 1. Real tap-to-drill probe ──
{
  const { browser, page } = await newPage('iPhone 14 Pro Max');
  const area = await page.evaluate(()=>{ const a=document.querySelector('.lp-areabody, [data-area-id]'); if(!a) return null; const r=a.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}; });
  out.drillProbe = { areaRect: area, attempts: [] };
  // attempt A: page.tap at center (touch)
  if (area){
    await page.touchscreen.tap(area.cx, area.cy); await page.waitForTimeout(500);
    out.drillProbe.attempts.push({ how:'touch center', scope: await page.evaluate(()=> SpatMapDebug.getScope&&SpatMapDebug.getScope()!=null), mode: await page.evaluate(()=> SpatMapDebug.getViewMode&&SpatMapDebug.getViewMode()) });
  }
  // reset to overview map
  await page.evaluate(()=> SpatMapDebug.enterOverview()); await page.waitForTimeout(300);
  // attempt B: tap header label area (top of area) where drill is most reliable
  const lbl = await page.evaluate(()=>{ const a=document.querySelector('[data-area-label]'); if(!a) return null; const r=a.getBoundingClientRect(); return {cx:r.x+r.width/2,cy:r.y+r.height/2}; });
  if (lbl){ await page.touchscreen.tap(lbl.cx, lbl.cy); await page.waitForTimeout(500);
    out.drillProbe.attempts.push({ how:'touch area label', scope: await page.evaluate(()=> SpatMapDebug.getScope&&SpatMapDebug.getScope()!=null), mode: await page.evaluate(()=> SpatMapDebug.getViewMode&&SpatMapDebug.getViewMode()) });
  }
  await page.screenshot({ path: join(SHOTS, '23-drill-probe-result.png') });
  await browser.close();
}

// ── 2. Mortality clean check ──
{
  const { browser, page } = await newPage('iPhone 14 Pro Max');
  await page.evaluate(()=> SpatMapDebug.drillFirstAreaOverview()); await page.waitForTimeout(300);
  const run = await findRun(page, 0, 'filled', 4);
  const before = await page.evaluate((ids)=>{ const f=SpatMapDebug.getFarm(); let n=0; f.lines.forEach(l=>l.cages.forEach(c=>{ if(ids.includes(c.id)&&c.batch&&typeof c.batch.count==='number') n+=c.batch.count; })); return n; }, run.ids);
  await dragRun(page, run);
  await page.locator('.popup .pbtn.work').tap(); await page.waitForTimeout(300);
  await page.evaluate(()=>{ const l=[...document.querySelectorAll('#sheet label')].find(x=>/Log loss/i.test(x.textContent)); if(l) l.scrollIntoView({block:'center'}); });
  await page.waitForTimeout(150);
  await page.locator('#sheet .chip', { hasText: /^25%$/ }).tap(); await page.waitForTimeout(120);
  await page.locator('#sheet .btn', { hasText: /Log loss/ }).tap(); await page.waitForTimeout(400);
  const after = await page.evaluate((ids)=>{ const f=SpatMapDebug.getFarm(); let n=0; f.lines.forEach(l=>l.cages.forEach(c=>{ if(ids.includes(c.id)&&c.batch&&typeof c.batch.count==='number') n+=c.batch.count; })); return n; }, run.ids);
  out.mortalityCheck = { ids: run.ids.length, before, after, pctDropped: before? Math.round((before-after)/before*100):null };
  await page.screenshot({ path: join(SHOTS, '24-mortality-verified.png') });
  await browser.close();
}

// ── 3. Fill clean check ──
{
  const { browser, page } = await newPage('iPhone 14 Pro Max');
  await page.evaluate(()=> SpatMapDebug.drillFirstAreaOverview()); await page.waitForTimeout(300);
  // pull a filled run to barge
  const fr = await findRun(page, 0, 'filled', 4);
  await dragRun(page, fr);
  await page.locator('.popup .pbtn.pull').tap(); await page.waitForTimeout(500);
  const bargeAfterPull = await page.evaluate(()=>{ const b=SpatMapDebug.getFarm().barge; return (typeof bargeTotalCount==='function')?bargeTotalCount(b):b.count; });
  const emptyNow = await page.evaluate((ids)=>{ const f=SpatMapDebug.getFarm(); let e=0; f.lines.forEach(l=>l.cages.forEach(c=>{ if(ids.includes(c.id)&&!c.batch) e++; })); return e; }, fr.ids);
  // select the emptied cages and Fill
  const er = await findRun(page, 0, 'empty', 3);
  await dragRun(page, er);
  const fillBtns = await page.evaluate(()=> [...document.querySelectorAll('.popup .pbtn')].map(b=>b.textContent.trim()));
  await page.locator('.popup .pbtn.fill').tap(); await page.waitForTimeout(500);
  const filledBack = await page.evaluate((ids)=>{ const f=SpatMapDebug.getFarm(); let fl=0; f.lines.forEach(l=>l.cages.forEach(c=>{ if(ids.includes(c.id)&&c.batch) fl++; })); return fl; }, er.ids);
  const bargeAfterFill = await page.evaluate(()=>{ const b=SpatMapDebug.getFarm().barge; return (typeof bargeTotalCount==='function')?bargeTotalCount(b):b.count; });
  out.fillCheck = { pulledIds: fr.ids.length, bargeAfterPull, emptyAfterPull: emptyNow, fillBtns, selectedEmpties: er.ids.length, filledBackCount: filledBack, bargeAfterFill };
  await page.screenshot({ path: join(SHOTS, '25-fill-verified.png') });
  await browser.close();
}

// ── 4. iPhone SE worst-case tap-target pass ──
{
  const { browser, page } = await newPage('iPhone SE');
  const vp = page.viewportSize();
  await page.evaluate(()=> SpatMapDebug.drillFirstAreaOverview()); await page.waitForTimeout(300);
  const aud = await page.evaluate(()=>{
    const vw=window.innerWidth;
    function m(sel){ return [...document.querySelectorAll(sel)].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;}).map(e=>{const r=e.getBoundingClientRect();return {t:(e.textContent||'').trim().slice(0,10),w:Math.round(r.width),h:Math.round(r.height),edgeR:Math.round(vw-r.right),edgeL:Math.round(r.left)};}); }
    return { lineMenu: m('.lineMenu').slice(0,2), cages: m('[data-cage-id]').slice(0,3), };
  });
  out.iphoneSE = { viewport: vp, ...aud };
  await page.screenshot({ path: join(SHOTS, '26-iphoneSE-area.png') });
  // also overview seg + dashboard on SE
  await page.evaluate(()=> SpatMapDebug.enterOverview()); await page.waitForTimeout(300);
  await page.screenshot({ path: join(SHOTS, '27-iphoneSE-overview.png') });
  out.iphoneSE.ovSeg = await page.evaluate(()=>{ const vw=window.innerWidth; return [...document.querySelectorAll('.ovSegBtn')].map(e=>{const r=e.getBoundingClientRect();return {t:e.textContent.trim(),w:Math.round(r.width),h:Math.round(r.height),edgeR:Math.round(vw-r.right)};}); });
  await browser.close();
}

writeFileSync(join(SHOTS, '..', '..', 'verify.log.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
