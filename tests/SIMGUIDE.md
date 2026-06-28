# SpatMap simulation field guide

You are a tester driving the **local** `spatmap.html` in a real phone viewport with
Playwright (Node, headless), the same way `smoke.mjs` does. Your job is to *use the app
like a real oyster farmer across a year* and report how it feels — every friction, dead
end, confusing label, slow step, and thing that works well.

## Hard rules
- **Drive the real touch UI** (tap rendered elements). Use `SpatMapDebug` only for setup,
  state inspection, season/clock control, and assertions — not as a substitute for the
  flows you're testing. Frictions only show up when you tap what a farmer taps.
- **Read your own screenshots.** Capture at every meaningful step and actually look at them
  (Read the PNG). A report written without looking is worthless.
- **Local only.** Never `git commit`/`push`. Never edit `spatmap.html`. You may write your
  own sim script + report under `tests/`.
- **Isolated browser.** Use the Node `playwright` module headless (like `smoke.mjs`). Do
  NOT touch the user's Chrome or the `mcp-chrome` profile; do not `pkill` anything.
- **Prose style:** plain, specific, no AI tells. No "delve/leverage/seamless", no em-dash
  pile-ups, no vague "users may find". Say what happened and what you'd change.

## Setup
Everything is installed. From `~/Desktop/spatmap/tests`, `node yourscript.mjs` runs.
`file://` works here (persistence + offline verified). If localStorage ever misbehaves,
fall back to `python3 -m http.server` in `~/Desktop/spatmap` and load `http://localhost:PORT/spatmap.html`.

## Launch boilerplate (copy from smoke.mjs)
```js
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'url'; import { dirname, join } from 'path';
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = 'file://' + join(HERE, '..', 'spatmap.html');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 14 Pro Max'] }); // or 'iPhone SE'
const page = await context.newPage();
const errors = [];
page.on('console', m => m.type()==='error' && errors.push(m.text()));
page.on('pageerror', e => errors.push(String(e)));
await page.goto(APP, { waitUntil: 'load' });
await page.waitForFunction('window.SpatMapDebug');
```

## Seed data
- `await page.evaluate(() => SpatMapDebug.loadBrightside())` — loads the real Brightside
  demo: 3 cage types (FlipFarm/OyGro/Vexar), grades, ~6 lines, batches at **varied ages**
  (fresh/mid/old drive the color bands and the harvest forecast). Then
  `SpatMapDebug.save(); SpatMapDebug.render();`.
- For a **fresh-farmer** scenario, start from the empty onboarding instead: clear and reload —
  `await page.evaluate(()=>{ SpatMapDebug.state.farms=[]; localStorage.removeItem('cageTrackerData'); })`
  then `page.reload()` and drive the new-farm flow ("New farm" / the onboarding wizard).

## Simulating the SEASON / year cycle
The app derives growth, market dates, heat/spawn/Vibrio warnings and the seasonal growth
multiplier from the real date. Two ways to move through the year:

1. **Fake the clock (best for seasonal UI).** BEFORE `goto`:
   ```js
   await page.clock.install({ time: new Date('2026-07-15T09:00:00') }); // summer
   ```
   Then to jump months, `await page.clock.setFixedTime(new Date('2026-10-15'))` and
   re-render with `await page.evaluate(()=>SpatMapDebug.render())`. Re-seed after install
   so batch ages compute against the faked "now".
2. **Vary batch age** (simpler): the demo already has young→old batches; read the dashboard
   + harvest forecast to see what the app tells you at "today".

Walk at least these checkpoints for your slice of the year and screenshot each:
spring stocking · summer daily work + heat · fall harvest + sale · winter stall + planning.

## SpatMapDebug surface (setup / inspect / assert only)
`state` (getter), `getFarm()`, `save()`, `render()`, `commit()`, `loadBrightside()`,
`enterOverview()`, `showWorkList()`, `enterLayout()`/`exitLayout()`, `getHomeMode()`,
`addPlot()`, `addArea(plotId)`, `setAreaLines(areaId,n)`, `drill(areaId)`,
`drillFirstAreaOverview()`, `buildOverview()`, `buildForecast`, `findAreaById`,
`linesInArea`, `visibleLines`, `LAYOUT`. Use these to set up a board state fast, then
TAP to exercise the flow.

## Driving the real UI — selectors & recipe
- Top nav segmented buttons: `.ovSegBtn` — pick by text ("Overview", "Work", "+ Plot",
  "+ Area", "+ Line", "Select", "Box", "Map", "Data").
- Cages: `[data-cage-id]`. Lines: `[data-line-id]`. Per-line menu: `.lineMenu` (the ⋮).
- Barge / harvest hero: `.barge` (tap to open the harvest sheet).
- Modal sheet: `#sheet` (read `innerText` to discover its buttons). Toast: `#toast`.
- **Discover-then-act:** when you don't know a control, snapshot it:
  `await page.locator('#sheet').innerText()` or `page.getByText('...')`/`getByRole('button',{name})`.
  Tap, then screenshot, then read the screenshot.
- Daily-loop mutations (Fill seed / Work / Pull to barge / Harvest / batch-split) are
  **UI-driven** — there's no debug shortcut. Enter Select (or tap a cage), read `#sheet`,
  drive the form. This is exactly the path whose friction you're measuring.

## Gotchas (from prior testing)
- A **fading toast is not clickable** (opacity animates to 0). To hit a toast button (e.g.
  Undo), click it immediately, or wait for the toast then click while visible.
- After `evaluate`-based navigation, `homeMode` can be left stale — real taps are the truth.
- Dark theme: this is normal, not a bug.
- The screen is touch-first; `tap()` (not just `click()`) better matches a phone.

## What to record — friction log
For each issue: **severity** (blocker / major / minor / polish), **where** (screen +
step), **what happened**, **why it's friction for a farmer** (gloves, sun glare, one hand,
boat motion, no signal), **repro** (the taps), and a **concrete fix**. Note wins too —
what felt fast or obvious. Flag any JS console errors with the step that caused them.

## Output
- Screenshots → `tests/reports/shots/<your-persona>/NN-step.png`.
- Report → `tests/reports/sim-<your-persona>.md`. Structure: persona + scenario; a day-by-day
  / season-by-season narrative of using it; the friction log (sorted by severity); wins;
  top 5 fixes you'd make. Be concrete and quote what you saw on screen.
- **Return** (as your final message to the orchestrator, NOT the whole report): persona,
  counts by severity, your top 5 frictions one line each, anything that blocked you, and
  the report path. Raw data, not prose.
