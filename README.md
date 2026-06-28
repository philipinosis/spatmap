# SpatMap

A single-file, offline web app for tracking oyster gear — cages strung along longlines —
across a farm. Open it in any browser. No install, no account, no server. It keeps working
with no signal once loaded, and every change saves to the device it's used on.

Built for FlipFarm / OysterGro / bag-and-float operations. Seeded with the real Brightside
farm so it opens to a working map, not a blank page.

---

## Which file is what

| File | Role |
|------|------|
| **`spatmap.html`** | **The current app.** This is the one to use, edit, and ship. (Internally "v4".) |
| `index.html` | The build currently **live** at `philipinosis.github.io/spatmap/` (the older "v7"). Frozen until the owner swaps `spatmap.html` in. |
| `supabase-setup.sql` | Postgres schema for **future** optional cloud sync/backup. Not wired up — the app is fully offline today. |
| `docs/` | Documentation (below). |
| `_local/` | Local-only working junk — backups, screenshots, old checkpoints. Gitignored, never in the repo. |

> The app is one HTML file: all markup, CSS, and JS inline. There is no build step.
> Edit `spatmap.html` directly, run `node --check` on the inline script, open it, done.

---

## 60-second start

1. Double-click `spatmap.html` to open it in any browser (or host it — see below — and open on your phone).
2. The Brightside farm loads the first time. You land on the **whole-farm overview**.
3. Tap a plot to open it full-screen. **‹ Farm** returns; the chips across the top hop between plots.
4. Tap a cage to stock or inspect it. Tap **Select** to work many cages with one form.
5. **Back up regularly:** ⚙ → Export data → keep the JSON somewhere safe. Import restores it on any device.

Full walkthrough: **[docs/USER-GUIDE.md](docs/USER-GUIDE.md)**.

---

## What the current build does (v4)

- **Farm overview with money on it** — "$X on the water" (per-grade pricing), oysters sale-ready, what needs work today, recent activity. Stock pulled to the tub still counts in the total (a "+N in tub" chip), so the crop number never drops just because you're working it.
- **One pannable map** — every plot tiles into one world; pan from one plot straight into the next.
- **Daily loop** — drag-select cages → Fill / Pull-to-barge / Work / Remove; the barge accumulates harvest; tap it to Harvest off. Each commit gives a haptic tick for gloved, wet, boat-deck use.
- **Tub batch-split** — split the barge into named sub-batches by size; each fill anchors its own growth curve, so different sizes project different market dates.
- **Revenue tracking** — every harvest records what you got per oyster (the grade price, or a per-sale override you type in), so the harvest log carries a running revenue-to-date and the CSV gains $/oyster and Revenue columns. Unknown price shows "—", never a made-up number.
- **Growth curve fitted to your water** — the seasonal growth shape starts on a default Gulf calendar, then bends toward what your own growth checks show, month by month, as you log them. A "Your growth calendar" card shows fitted-vs-default so you can watch it sharpen. A farm with few checks behaves exactly as before.
- **Watch list** — flags cages losing oysters faster than their peers (median-and-MAD outlier math, only on farms with enough loss data to mean anything). Guidance, not a verdict.
- **Conditions advisory** — a heat or low-salinity warning on the dashboard when several of your recent logged days cross the line, drawn from this device's own water log. Tap it to the harvest forecast. No backend.
- **Seed source scorecard** — survival, time-to-market, and revenue-per-cage grouped by hatchery, built from the records you already keep. Harvests that can't be traced to one source are shown separately, never blamed on a hatchery.
- **Live water conditions** — water level + rising/falling, temperature, and salinity from the nearest USGS gauge, plus the NWS forecast. Pick any gauge on the coast; manual salinity as the offline fallback.
- **Records to hand a buyer or inspector** — CSV export of stock-on-hand and the harvest log.
- **Work queue + harvest forecast** — what's overdue (tap to jump), and how many oysters hit market size month by month.
- **Photos per cage** (IndexedDB), growth charts, market-ready outlook, durable offline storage.
- **Full-fidelity backup** — the Data menu leads with "Full backup (with photos)", and the panic exports (storage-full banner, boot-failure recovery) use it too, so a backup taken in a crisis keeps the cage images.

---

## Hosting — get it on a phone

Data lives in each device's browser. The file itself hosts free so anyone can open it at a URL.

**Easiest — Netlify Drop (5 min, free):** go to <https://app.netlify.com/drop>, create a free
account, drag the folder onto the page. You get a `*.netlify.app` link — open it on the phone, then
"Add to Home Screen" so it runs like an app, offline after first load. To update, drag the new file
in again; data stays on each phone, so updating never erases anyone's records.

**Ongoing updates — GitHub Pages:** this repo already serves `index.html` at
`philipinosis.github.io/spatmap/`. To make the current build live, point the Pages root at
`spatmap.html` (or copy it over `index.html`). That swap is deliberately left to the owner.
Before swapping, back up any live farm data on a test device — the v4 migrator runs on the v7 blob at first open.

One hosted copy serves many farms — each farmer's layout and data stay on their own phone. The app
also holds multiple farms on one device (tap the farm name to switch).

---

## Back up — important

Data is per-browser, per-device. Clearing site data erases it. The app asks the browser to persist
storage and warns on a failed write, but the real safety net is **⚙ → Export data** on a schedule.
Keep the JSON. Import restores it anywhere.

---

## Phone testing

`tests/smoke.mjs` drives the local `spatmap.html` in real phone viewports (iPhone SE +
14 Pro Max), seeds the Brightside demo, tours the core screens, and reports friction:
JS errors, sub-44px tap targets, sub-11px text, horizontal overflow, off-screen controls,
plus persistence-across-reload and offline-reload checks. Screenshots + `report.md` land in
`tests/report/`.

```
cd tests && npm install   # once; browsers are already cached
npm run smoke             # headless, ~15s
HEADED=1 npm run smoke    # watch it drive a phone-sized window
```

---

## More docs

- **[docs/USER-GUIDE.md](docs/USER-GUIDE.md)** — full farmer walkthrough.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — data model, storage, durability, conditions feed, how the file is organized.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — what shipped, what's deliberately deferred (cloud sync, NSSP tags) and why, and the remaining backlog.
- **[docs/build-history/](docs/build-history/)** — the v7/v2/v3/v4 build specs, design audits, and code reviews, kept for reference.
