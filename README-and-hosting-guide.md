# SpatMap — Quick Guide

## What it is
A single-file web app (`index.html`) for tracking oyster cages. No installation, no account, works offline. All data saves automatically to the device it's used on.

## The Brightside farm comes preloaded
The app now opens with the real farm already on the map, built from the working spreadsheet (June 12, 2026). The whole spreadsheet is **Acre 1**:
- **Quarters 1–2** (spreadsheet rows 1–9): rows 1–4 (the sorted Trips/Dips) are whole lines in OyGrow circles — rows 1 & 3 are the top two rows of Quarter 1, rows 2 & 4 the top two of Quarter 2. Rows 5–9 (Jumbos / Brightsides / smalls / doubles) sit below them, left halves in Quarter 1, right halves in Quarter 2.
- **Quarters 3–4** (spreadsheet columns A–D, rows 14–21): Lines A & B left of the boat lane in Quarter 3, C & D right of it in Quarter 4. All of Acre 1 runs horizontal.
- **Acre 2** is not on the spreadsheet — it's on the map but empty, ready for lines when you need it.

Three things to fix on the water (the spreadsheet didn't have them):
1. **Counts and seed sizes** are blank on every batch — tap a cage → it shows "—" until you edit or restock with real numbers.
2. **Placeholder dates**: the Jumbos / Brightsides / Smalls / Doubles lines in quarters 3–4 had no dates, so they're set to Jan 1, 2026 with an "edit me" note. Rows 1–4 use their *sort* dates as stock dates.
3. **Line C position 5** in Acre 2 was marked "Empty or jumbo?" — it's left empty; verify and stock it if there are jumbos in it.

Cage counts per line in Acre 1 default to 6 per side — add or remove cages from each line's ⋯ menu to match reality. Cage types default to Bag except the 6/4 small trips in flips.

## Other farms can build their own map
The layout isn't fixed to Brightside's. ⚙ → **Farm layout** lets any farm:
- Add, rename, or remove **areas** (separate patches of water, like acres)
- Subdivide an area into up to 4 **plots** — boat lanes are drawn between them automatically
- Set each plot's line direction: **→ across** or **↓ down**
- Tap **+ Lines** on any plot (or use + Add line) to bulk-create lines: pick how many lines and how many cages per line, and names count up automatically ("Row 1" + 5 lines → Row 1…Row 5)
- Every new plot (and new area) starts with one empty 6-cage line already on it, so a plot is never blank. Plots hold as many lines as you want — add more with + Lines.

New farms start with the same two-acre, four-quarter template and reshape it from there. Plots whose lines hold stocked cages can't be deleted (move or harvest the cages first); empty lines are removed along with their plot after a confirm. One hosted copy serves many farms — each farmer's layout and data stay on their own phone.

## Editing what's already on the map
- **Edit batch details** — tap a stocked cage → "Edit batch details" to fix the stock date, count, size, source, or notes.
- **Ploidy** (Trips / Dips / Mixed — the chromosome count: trips are triploid, dips diploid) is its own field above Source; **Source** is free text for the hatchery or origin.
- **Change cage type** — tap a stocked or empty cage → Cage type dropdown changes that one cage. To convert many at once, open the line's ⋯ menu → "Change cage type": apply to the whole line, or tick "Only some positions" and give a from–to range (e.g. cages 4–9).
- **Lines never move.** Every line spans the full width (or height) of its plot, and positions are fixed. Pulling the cages off a line (⋯ menu → "Pull cages") leaves the empty line on the map holding its place; re-string it later from the same menu, or remove it entirely (only then do later lines shift up).
- **Spots without a cage.** A position on a line can exist with no cage attached — it shows as a dashed outline holding the spot open. Tap an empty cage → "Take cage off line" to create one, or tap a dashed spot → "Attach cage" to hang a cage there again.

## How to use it
1. Double-click `index.html` to open it in any browser (or open it on your phone — see hosting below).
2. The Brightside farm loads automatically the first time.
3. **The app opens on the whole-farm overview**: every plot is a card showing its lines as rows of colored dots. Tap a plot to open it full-screen with big cages sized for a stylus on the water. **‹ Farm** (or the phone's back button) returns to the overview, and the chips across the top hop straight between plots without going back.
   - **The conditions panel** under the stats shows live salinity and water temperature, the next high and low tide (time + height in feet, e.g. ↑7:44a +1.4 · ↓6:49p −0.4), and the weather (temp, wind, sky). It only appears on the overview — it gets out of the way the moment you open a plot. **Tap the panel to choose the gauge nearest your farm**: it lists every active salinity gauge on the Louisiana coast sorted by distance ("Use my location" sorts from where you're standing), and tides + weather follow your choice automatically. Needs signal to refresh; offline it shows the last readings it saw.
4. Tap **+ Add line** → name it, pick a cage type (square = Bag, rectangle = Flip, circle = OyGrow — you can add your own types), pick which farm section it belongs to, and enter how many cages. The line appears on the map.
5. **The map mirrors the real farm**: an ocean-blue chart split into two acres. Acre 1 has four quarters with a dashed boat lane running between them; Acre 2 is a separate area where lines run vertically. Each line is drawn as an anchor run — rope between two ⚓ anchors with the cages strung along it. Move a line between sections any time from its ⋯ menu.
6. Tap any cage to stock it: date, count, seed size (mm), source, and prep work (graded, tumbled, desiccated, shaken, etc.). You can stock a whole line at once.
7. Tap a stocked cage to log **growth checks**, **mortality**, or **harvest**. Growth checks can apply to the whole line. Each cage shows a growth chart and time in water.
8. **Worked a batch of cages? Select first, fill in once.** Inside a plot, tap **Select**, then tap each cage you worked (or a line's **All** button). The bottom bar gives three quick actions: **Empty** (dump the batches — cages stay on the line, ready to restock), **Remove** (take the cages off the line — each spot stays put as a dashed marker), and **Log** (one form for the whole selection: stock the empties, or growth check / mortality / harvest / note across the stocked ones — counts apply per cage, capped at what each cage has left, and "Full harvest" empties every selected cage in one go).
9. Colors on the map: gray = empty, green = under 6 months, amber = 6–12 months, orange = over 12 months, blue ring = at market size (default 76 mm, changeable in ⚙ settings).
10. **Back up regularly**: ⚙ menu → Export data. Keep the JSON file somewhere safe; Import restores it on any device.

## Hosting — how to get it on your phone and share it

Your data lives in the browser on each device. The file itself can be hosted free so anyone can open it at a web address.

### Easiest: Netlify Drop (5 minutes, free, no coding)
1. Go to **https://app.netlify.com/drop**
2. Create a free account.
3. Drag the folder containing `index.html` onto the page.
4. You get a link like `spatmap.netlify.app` — open it on your phone, then use your phone's "Add to Home Screen" so it works like an app, even offline after first load.
5. To update the app later, drag the new file in again. Your data is NOT on Netlify — it stays on each phone, so updating the app never erases anyone's records.

### Alternative: GitHub Pages (free, better for ongoing updates)
Create a free GitHub account → new repository → upload `index.html` → Settings → Pages → enable. Same result, slightly more steps.

### Sharing with other farms
Any farmer who opens your link can build their own farm — their data stays private on their own device, so one hosted copy serves many farms. The app also supports multiple farms on one device (tap the farm name to switch).

### Later: real accounts and sync (v2)
If you want data shared between crew phones or backed up automatically, the next step is adding a cloud database (e.g., Supabase — has a free tier) with logins per farm. That requires creating service accounts and ~an hour of setup; the app was built so this can be added without starting over. Just ask when you're ready.

## Important notes
- Data is per browser per device. Clearing browser history/site data can erase it — export backups regularly.
- The app works with no signal once loaded; data saves instantly on the device.
