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
| **`spatmap.html`** | **The current app.** This is the one to use, edit, and ship. (Internally "v3".) |
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

## What the current build does (v3)

- **Farm overview with money on it** — "$X on the water" (per-grade pricing), oysters sale-ready, what needs work today, recent activity.
- **One pannable map** — every plot tiles into one world; pan from one plot straight into the next.
- **Daily loop** — drag-select cages → Fill / Pull-to-barge / Work / Remove; the barge accumulates harvest; tap it to Harvest off.
- **Tub batch-split** — split the barge into named sub-batches by size; each fill anchors its own growth curve, so different sizes project different market dates.
- **Live water conditions** — water level + rising/falling, temperature, and salinity from the nearest USGS gauge, plus the NWS forecast. Pick any gauge on the coast; manual salinity as the offline fallback.
- **Records to hand a buyer or inspector** — CSV export of stock-on-hand and the harvest log.
- **Work queue + harvest forecast** — what's overdue (tap to jump), and how many oysters hit market size month by month.
- **Photos per cage** (IndexedDB), growth charts, market-ready outlook, durable offline storage.

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

One hosted copy serves many farms — each farmer's layout and data stay on their own phone. The app
also holds multiple farms on one device (tap the farm name to switch).

---

## Back up — important

Data is per-browser, per-device. Clearing site data erases it. The app asks the browser to persist
storage and warns on a failed write, but the real safety net is **⚙ → Export data** on a schedule.
Keep the JSON. Import restores it anywhere.

---

## More docs

- **[docs/USER-GUIDE.md](docs/USER-GUIDE.md)** — full farmer walkthrough.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — data model, storage, durability, conditions feed, how the file is organized.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — what's next (cloud backup, NSSP harvest tags, crew sync) and the feature backlog.
- **[docs/build-history/](docs/build-history/)** — the v7/v2/v3 build specs, design audits, and code reviews, kept for reference.
