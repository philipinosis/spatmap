// SUMMER DECKHAND sim — persona "Cole": wet/gloved hands, sun glare, one hand on rail, no signal.
// Drives the real touch UI of the daily-work loop in a phone viewport, mid-summer.
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url'; import { dirname, join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const SHOTS = join(HERE, 'reports/shots/summer-deckhand');
mkdirSync(SHOTS, { recursive: true });

const log = { steps: [], audits: {}, tapCosts: {}, asserts: {}, stepErrors: {}, errors: [] };
let shotN = 0;
async function shot(page, name){
  shotN++;
  const f = String(shotN).padStart(2,'0') + '-' + name + '.png';
  await page.screenshot({ path: join(SHOTS, f) });
  log.steps.push(f);
  return f;
}
async function step(name, fn){ try { await fn(); } catch(e){ log.stepErrors[name] = String(e).slice(0,200); console.error('STEP FAIL', name, e.message); } }

async function audit(page, selector, label){
  const data = await page.evaluate((sel) => {
    const vw = window.innerWidth;
    const els = [...document.querySelectorAll(sel)].filter(e=>{
      const cs = getComputedStyle(e); if (cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return false;
      const r = e.getBoundingClientRect(); return r.width>0 && r.height>0;
    });
    const rects = els.map(e=>({ t:(e.textContent||'').trim().slice(0,16), ...e.getBoundingClientRect().toJSON() }));
    return rects.map((r,i)=>{
      let minGap = Infinity;
      rects.forEach((o,j)=>{ if(i===j) return;
        const overlap = (r.left<o.right&&o.left<r.right&&r.top<o.bottom&&o.top<r.bottom);
        const dx = Math.max(0, Math.max(r.left-o.right, o.left-r.right));
        const dy = Math.max(0, Math.max(r.top-o.bottom, o.top-r.bottom));
        const g = overlap ? 0 : Math.max(dx,dy);
        if (g<minGap) minGap=g;
      });
      return { t:r.t, w:Math.round(r.width), h:Math.round(r.height),
        gap:isFinite(minGap)?Math.round(minGap):null, edgeL:Math.round(r.left), edgeR:Math.round(vw-r.right) };
    });
  }, selector);
  log.audits[label] = data;
  return data;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 14 Pro Max'] });
const page = await context.newPage();
page.on('console', m => m.type()==='error' && log.errors.push('console: '+m.text().slice(0,200)));
page.on('pageerror', e => log.errors.push('pageerror: '+String(e).slice(0,200)));

await page.clock.install({ time: new Date('2026-07-15T09:00:00') });
await page.goto(APP, { waitUntil: 'load' });
await page.waitForFunction('window.SpatMapDebug');

// Seed Brightside + a 6-day HEAT water log on the suggested LA gauge so the heat advisory fires offline.
await page.evaluate(() => {
  SpatMapDebug.loadBrightside();
  localStorage.setItem('spatmapUsgsSite', JSON.stringify({ id:'07380249', name:'Caminada Pass NW of Grand Isle, LA', state:'LA', lat:29.2313611, lng:-90.0485278 }));
  const arr = []; const base = Date.UTC(2026,6,9,12,0,0);
  for (let d=0; d<6; d++) for (let s=0; s<2; s++) arr.push({ ms: base + d*86400000 + s*3600000, t: 30 + s*0.5, s: 22, g: 1.4 });
  localStorage.setItem('spatmapCondHist', JSON.stringify({ '07380249': arr }));
  SpatMapDebug.save(); SpatMapDebug.render();
});
await page.waitForTimeout(300);

// ── find a contiguous run of filled/empty cages on a line; returns {ax,ay,bx,by,positions} ──
async function findRun(lineIdx, kind, len){
  return page.evaluate(({lineIdx, kind, len}) => {
    const strips = [...document.querySelectorAll('.cageStrip[data-line-id]')];
    const strip = strips[lineIdx]; if (!strip) return null;
    const cells = [...strip.querySelectorAll('.cage[data-cage-id]')];
    const filled = cells.map(c => !c.querySelector('.cellfill.empty'));
    const want = (kind==='filled');
    let run=[];
    for (let i=0;i<cells.length;i++){
      if (filled[i]===want){ run.push(i); if (run.length>=len) break; }
      else run=[];
    }
    if (run.length<1) return null;
    const a=cells[run[0]], b=cells[run[run.length-1]];
    const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
    return { ax:ra.x+ra.width/2, ay:ra.y+ra.height/2, bx:rb.x+rb.width/2, by:rb.y+rb.height/2, positions:run };
  }, {lineIdx, kind, len});
}
async function dragRun(run){
  await page.mouse.move(run.ax, run.ay); await page.mouse.down();
  const steps=8;
  for (let i=1;i<=steps;i++){ await page.mouse.move(run.ax+(run.bx-run.ax)*i/steps, run.ay+(run.by-run.ay)*i/steps); await page.waitForTimeout(20); }
  await page.mouse.up(); await page.waitForTimeout(300);
}
async function selCount(){ return page.evaluate(()=> document.querySelectorAll('.cage.sel').length); }
async function bargeTotal(){ return page.evaluate(()=>{ const b=SpatMapDebug.getFarm().barge; try{return (typeof bargeTotalCount==='function')?bargeTotalCount(b):(b.count||0);}catch(e){return b&&b.count||0;} }); }
async function popupButtons(){ return page.evaluate(()=> [...document.querySelectorAll('.popup .pbtn')].map(b=>b.textContent.trim())); }
async function closeSheet(){ await page.evaluate(()=>{ try{ if(typeof window.closeSheet==='function') window.closeSheet(); }catch(e){} }); await page.waitForTimeout(150); }

// STEP 1 — overview Map home
await step('overview-home', async ()=>{
  await shot(page, 'overview-map-home');
  await audit(page, '.ovSegBtn', 'ovSegBtn_overview_MapData');
});

// STEP 2 — Data tab → dashboard + heat advisory
await step('dashboard', async ()=>{
  await page.getByRole('tab', { name: 'Data' }).tap();
  await page.waitForTimeout(300);
  await shot(page, 'dashboard-data-tab');
  log.asserts.heatAdvisory = await page.evaluate(() => {
    const a = document.querySelector('.dc-advisory'); if (!a) return { present:false };
    const r = a.getBoundingClientRect();
    return { present:true, tappable:a.classList.contains('dc-advisory-tap'), text:a.innerText.replace(/\s+/g,' ').trim(), w:Math.round(r.width), h:Math.round(r.height) };
  });
  log.asserts.mortalityWatchRow = await page.evaluate(() => { const m=document.querySelector('.dc-watch'); return m?m.innerText.replace(/\s+/g,' ').trim():null; });
  await audit(page, '.dc-advisory, .dc-work, .dc-stat', 'dashboard_controls');
});

// STEP 3 — tap heat advisory → forecast
await step('advisory-tap', async ()=>{
  if (log.asserts.heatAdvisory && log.asserts.heatAdvisory.tappable){
    await page.locator('.dc-advisory-tap').tap(); await page.waitForTimeout(300);
    await shot(page, 'heat-advisory-forecast');
    log.asserts.forecastText = await page.locator('#sheet').innerText().then(t=>t.replace(/\s+/g,' ').slice(0,400)).catch(()=>null);
    await closeSheet();
  }
});

// STEP 4 — back to Map, REAL tap-to-drill into the area
await step('drill', async ()=>{
  await page.getByRole('tab', { name: 'Map' }).tap(); await page.waitForTimeout(300);
  await shot(page, 'overview-map-before-drill');
  const box = await page.evaluate(()=>{ const a=document.querySelector('.lp-areabody, [data-area-id]'); if(!a) return null; const r=a.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; });
  let ok=false;
  if (box){ await page.mouse.click(box.x, box.y); await page.waitForTimeout(500); ok = await page.evaluate(()=> SpatMapDebug.getScope && SpatMapDebug.getScope()!=null); }
  log.asserts.realDrillTap = ok;
  if (!ok){ await page.evaluate(()=> SpatMapDebug.drillFirstAreaOverview()); await page.waitForTimeout(400); }
  await shot(page, 'area-work-view');
  await audit(page, '.lineMenu', 'lineMenu_areaView');
  await audit(page, '[data-cage-id]', 'cageCells_areaView');
});

// STEP 5 — WORK a filled run on line index 0, with "work again 2w"
await step('work', async ()=>{
  const run = await findRun(0, 'filled', 5);
  if (!run) throw new Error('no filled run on line 0');
  await dragRun(run);
  log.asserts.dragSelectCount = await selCount();
  await shot(page, 'line1-drag-selected');
  await audit(page, '.popup .pbtn', 'popupButtons_pbtn');
  log.asserts.popupButtons_work = await popupButtons();
  await page.locator('.popup .pbtn.work').tap(); await page.waitForTimeout(300);
  await shot(page, 'work-sheet-top');
  await audit(page, '#sheet .chip', 'workSheet_chips');
  log.asserts.workSheetOrder = await page.evaluate(()=> [...document.querySelectorAll('#sheet label, #sheet .work-banner')].map(e=>e.textContent.trim().slice(0,40)));
  // combine method + reminder: scroll to 2w, tap, scroll up, tap Tumbled
  await page.evaluate(()=>{ const c=[...document.querySelectorAll('#sheet .chip')].find(x=>x.textContent.trim()==='2w'); if(c) c.scrollIntoView({block:'center'}); });
  await page.waitForTimeout(200); await shot(page, 'work-sheet-reminder-scrolled');
  await page.locator('#sheet .chip', { hasText: /^2w$/ }).tap(); await page.waitForTimeout(150);
  await page.evaluate(()=>{ const c=[...document.querySelectorAll('#sheet .chip')].find(x=>x.textContent.trim()==='Tumbled'); if(c) c.scrollIntoView({block:'center'}); });
  await page.waitForTimeout(150);
  const before = await page.evaluate(()=>{ const f=SpatMapDebug.getFarm(); let n=0; f.lines.forEach(l=>l.cages.forEach(c=>{ if(c.events) n+=c.events.filter(e=>e.type==='worked').length; })); return n; });
  await page.locator('#sheet .chip', { hasText: /^Tumbled$/ }).tap(); await page.waitForTimeout(400);
  const after = await page.evaluate(()=>{ const f=SpatMapDebug.getFarm(); let n=0; f.lines.forEach(l=>l.cages.forEach(c=>{ if(c.events) n+=c.events.filter(e=>e.type==='worked').length; })); return n; });
  log.asserts.workedEventsAdded = after - before;
  await shot(page, 'after-work-tumbled');
  log.tapCosts.work = 'drag(1) + Work(1) + scroll↓ + 2w(1) + scroll↑ + Tumbled(1) = 4 taps + 2 scrolls';
});

// STEP 6 — LOG MORTALITY % on a filled run (find any line with a filled run)
await step('mortality', async ()=>{
  let run=null, li=-1;
  for (let i=1;i<6;i++){ run = await findRun(i,'filled',3); if (run){ li=i; break; } }
  if (!run) throw new Error('no filled run for loss');
  await dragRun(run);
  await shot(page, 'line-selected-for-loss');
  const btns = await popupButtons();
  if (!btns.some(b=>/work/i.test(b))) throw new Error('no Work btn, popup='+btns.join(','));
  await page.locator('.popup .pbtn.work').tap(); await page.waitForTimeout(300);
  await page.evaluate(()=>{ const l=[...document.querySelectorAll('#sheet label')].find(x=>/Log loss/i.test(x.textContent)); if(l) l.scrollIntoView({block:'center'}); });
  await page.waitForTimeout(150); await shot(page, 'loss-section');
  await audit(page, '#sheet .chip', 'lossSheet_chips');
  const livingBefore = await page.evaluate(({li})=>{ const f=SpatMapDebug.getFarm(); let n=0; f.lines[li].cages.forEach(c=>{ if(c.batch&&typeof c.batch.count==='number'&&document.querySelector('.cage.sel[data-cage-id="'+c.id+'"]')) n+=c.batch.count; }); return n; }, {li});
  await page.locator('#sheet .chip', { hasText: /^10%$/ }).tap(); await page.waitForTimeout(120);
  await page.locator('#sheet .chip', { hasText: /^Heat$/ }).tap(); await page.waitForTimeout(120);
  await shot(page, 'loss-10pct-heat-picked');
  await page.locator('#sheet .btn', { hasText: /Log loss/ }).tap(); await page.waitForTimeout(400);
  const livingAfter = await page.evaluate(({li})=>{ const f=SpatMapDebug.getFarm(); let n=0; f.lines[li].cages.forEach(c=>{ if(c.batch&&typeof c.batch.count==='number') n+=c.batch.count; }); return n; }, {li});
  log.asserts.mortality = { line:li, livingBefore_sel:livingBefore, livingAfter_lineTotal:livingAfter };
  await shot(page, 'after-loss-logged');
  log.tapCosts.mortality = 'drag(1) + Work(1) + scroll + 10%(1) + Heat(1) + Log loss(1) = 4 taps + 1 scroll';
});

// STEP 7 — PULL a filled run to the barge
let pulledLine=-1;
await step('pull', async ()=>{
  const bBefore = await bargeTotal();
  let run=null;
  for (let i=0;i<6;i++){ run = await findRun(i,'filled',4); if (run){ pulledLine=i; break; } }
  if (!run) throw new Error('no filled run to pull');
  await dragRun(run);
  await shot(page, 'line-selected-for-pull');
  log.asserts.popupButtons_pull = await popupButtons();
  await page.locator('.popup .pbtn.pull').tap(); await page.waitForTimeout(500);
  await shot(page, 'after-pull');
  const bAfter = await bargeTotal();
  log.asserts.pull = { line:pulledLine, bargeBefore:bBefore, bargeAfter:bAfter, gained:bAfter-bBefore };
  log.tapCosts.pull = 'drag(1) + Pull(1) = 2 actions';
});

// STEP 8 — FILL the just-emptied cages from the barge
await step('fill', async ()=>{
  await page.waitForTimeout(200);
  const run = await findRun(pulledLine>=0?pulledLine:0, 'empty', 2);
  if (!run) throw new Error('no empty run to fill');
  await dragRun(run);
  await shot(page, 'empty-selected-for-fill');
  log.asserts.fillSelectionLabel = await page.evaluate(()=>{ const l=document.querySelector('.popup .lbl'); return l?l.innerText.trim():null; });
  log.asserts.popupButtons_fill = await popupButtons();
  if (await page.locator('.popup .pbtn.fill').count()){
    await page.locator('.popup .pbtn.fill').tap(); await page.waitForTimeout(400);
    await shot(page, 'fill-flow');
    log.asserts.fillSheet = await page.locator('#sheet').innerText().then(t=>t.replace(/\s+/g,' ').slice(0,400)).catch(()=>null);
    await closeSheet();
  }
  log.tapCosts.fill = 'drag empties(1) + Fill(1) [+ batch pick if several] = 2+ actions';
});

// STEP 9 — per-line ⋮ menu
await step('lineMenu', async ()=>{
  await page.evaluate(()=>{ try{ if(typeof window.closeSheet==='function') window.closeSheet(); if(typeof clearSelection==='function') clearSelection(); SpatMapDebug.render(); }catch(e){} });
  await page.waitForTimeout(200);
  await page.locator('.lineMenu').first().tap(); await page.waitForTimeout(300);
  await shot(page, 'line-menu-open');
  log.asserts.lineMenuItems = await page.locator('#sheet').innerText().then(t=>t.replace(/\s+/g,' ').slice(0,400)).catch(()=>null);
  await closeSheet();
});

// STEP 10 — OFFLINE mid-task: go offline, work, reload, verify persistence
await step('offline', async ()=>{
  await context.setOffline(true);
  log.asserts.offline = {};
  let run=null, li=-1;
  for (let i=0;i<6;i++){ run = await findRun(i,'filled',3); if (run){ li=i; break; } }
  if (run){
    await dragRun(run); await shot(page, 'offline-selected');
    const btns = await popupButtons();
    if (btns.some(b=>/work/i.test(b))){
      await page.locator('.popup .pbtn.work').tap(); await page.waitForTimeout(300);
      await page.locator('#sheet .chip', { hasText: /^Washed$/ }).tap(); await page.waitForTimeout(300);
      await shot(page, 'offline-after-work');
    }
  }
  log.asserts.offline.workedEventsInLocalStorage = await page.evaluate(()=>{
    try { const raw=JSON.parse(localStorage.getItem('cageTrackerData')); const f=raw.farms[raw.activeFarmIdx!=null?raw.activeFarmIdx:0]||raw.farms[0];
      let n=0; f.lines.forEach(l=>l.cages.forEach(c=>{ if(c.events) n+=c.events.filter(e=>e.type==='worked').length; })); return n; } catch(e){ return 'ERR:'+e.message; }
  });
  await page.reload({ waitUntil: 'load' }).catch(e=>log.asserts.offline.reloadErr=String(e).slice(0,120));
  const booted = await page.waitForFunction('window.SpatMapDebug && SpatMapDebug.getFarm()', { timeout: 8000 }).then(()=>true).catch(()=>false);
  log.asserts.offline.bootedAfterReload = booted;
  await page.waitForTimeout(400); await shot(page, 'offline-after-reload');
  log.asserts.offline.farmAfterReload = await page.evaluate(()=>{ const f=SpatMapDebug.getFarm(); return f?{name:f.name,lines:f.lines.length}:null; }).catch(()=>null);
  log.asserts.offline.failedExternalReqs = log.errors.filter(e=>/fetch|network|ERR_INTERNET|Failed to fetch/i.test(e)).length;
  await context.setOffline(false);
});

// STEP 11 — Vibrio/spawn: the Water-conditions history sheet (only place they surface) — online vs offline
await step('vibrio', async ()=>{
  await page.evaluate(()=>{ try{ SpatMapDebug.enterOverview(); }catch(e){} });
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ try{ if(typeof openSheet==='function'&&typeof buildCondHistory==='function') openSheet(buildCondHistory); }catch(e){} });
  await page.waitForTimeout(1500);
  await shot(page, 'water-conditions-sheet');
  log.asserts.condSheetText = await page.locator('#sheet').innerText().then(t=>t.replace(/\s+/g,' ').slice(0,500)).catch(()=>null);
  await closeSheet();
});

await browser.close();
writeFileSync(join(SHOTS, '..', '..', 'sim-summer-deckhand.log.json'), JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
