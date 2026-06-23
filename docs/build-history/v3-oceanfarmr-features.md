# OceanFarmr (formerly SmartOysters) — Feature Inventory & SpatMap Gap Analysis

**Purpose:** Sourced competitive teardown of OceanFarmr to feed the SpatMap v3 build plan.
**Date:** 2026-06-17
**Method:** WebSearch + WebFetch across oceanfarmr.com (software / oyster / pricing / plans-us / plans-au-nz / homepage), the Apple App Store listing, and trade press (Aquaculture North America, The Fish Site, UF/IFAS, coretext). No browser automation used.

> **Honesty note up front:** OceanFarmr is fundamentally a cloud SaaS — app + web dashboard + multi-user accounts + auto-sync. A large share of its value is the *sync and dashboard*, which a single offline HTML file genuinely cannot replicate. Below I tag each feature for what is honestly buildable in SpatMap's offline-single-file model and I do **not** pretend cloud features can be faked. The build payoff is the **[OFFLINE-OK]** shortlist at the very top.

---

## 0. TOP GAPS SPATMAP SHOULD CLOSE — OFFLINE-OK SHORTLIST (build from this)

Ranked by commercial value to a mid-size off-bottom farm (5–20 leases, paid crew). Every item here is implementable client-side in one offline HTML file. This is the build list.

1. **Per-batch grade/size distribution + grade-tally reporting.** OceanFarmr tracks grade/size per batch and rolls it into "how much of each grade do I have." SpatMap already has grades on cages; what's missing is a **farm-wide grade inventory readout and per-batch size history**. High value: grading drives what you can sell this week. *(Mostly already in v7 per notes — verify and harden the rollup.)*
2. **Task scheduling with due-dates + an "what's due / overdue" work queue.** OceanFarmr's core loop is "the app tells you what tasks need doing and when, per batch, with grade-due reminders." SpatMap has a neglect interval but no real **scheduled-task list with due dates, recurrence, and an overdue view**. This is arguably OceanFarmr's #1 selling point and it's fully offline-doable (timers + localStorage). Highest-value gap.
3. **Grade-due / next-action reminders per batch (derived, on-device).** "Notifies farmers when their next grade is due." A pure client app can't push a notification when closed, but it CAN compute and surface a prominent "3 batches due to grade" banner on open. **[HYBRID]** — see note; the *computation* is OFFLINE-OK, only true push needs backend.
4. **Harvest forecasting / harvest-readiness from growth curve.** OceanFarmr's "growth monitoring → harvest readiness timing" and "what we will have in the future." SpatMap has growth projections; extend to a **farm-wide harvest calendar** ("which batches cross market size in which weeks"). Pure math on existing data.
5. **Stock-movement / activity audit log per batch (full lineage timeline view).** OceanFarmr: "a digital log that shows where every batch is, its history and current state." SpatMap captures events; add a **clean chronological life-history view per batch** (reception → stocked → worked → pulled → restocked → harvested). Buyers and the farmer both want this.
6. **Mortality / survival tracking across the cycle.** Already specced in `_notes-and-ideas.md` (live-count → derived mortality). OceanFarmr competitor OysterTracker sells "size, location, growth rates and mortality" as the core value. Close this — it's the number that drives revenue.
7. **Maintenance / gear-repair tickets with photo + status.** OceanFarmr: "take photos where repairs are needed, assign a team member to fix them." SpatMap has per-cage photos; add a **flag-for-repair state + open/closed maintenance list**. Single-user offline version is fine.
8. **Labor / activity time tracking (who/what/how long per job).** OceanFarmr and OysterTracker both pitch "record labor activities and hours to reduce costs." A simple **per-task duration + crew-member-name log** is OFFLINE-OK; live multi-device crew assignment is not.
9. **PDF / CSV export of reports (harvest log, grade inventory, activity).** OceanFarmr leans on "downloadable reports" and "investor-ready data." SpatMap can generate **printable/exportable reports via the browser** (print-to-PDF, CSV blob download) with zero backend.
10. **Data export/backup + import (JSON round-trip).** OceanFarmr's whole moat is "never lose track." An offline app's honest equivalent is **explicit export/import of the full farm to a file** (manual backup, device-to-device hand-off). Cheap, high trust value, no server.
11. **Printable harvest tags (browser print).** Traceability tags (lot/batch, harvest date, lease, grade) can be **laid out in HTML and printed** to a label/sheet printer from the browser. The *record* is OFFLINE-OK; live NSSP submission to a buyer/regulator is not.
12. **Onboarding via farm templates + freeform map setup.** OceanFarmr does paid white-glove mapping; SpatMap's offline answer is **richer self-serve setup** (gear catalog, draw-your-own lines — already in the notes backlog).

Everything below #12 in commercial terms (live crew sync, GPS fleet tracking, web dashboard, financing, public lost-gear network) is genuinely **[BACKEND]** and should be treated as out-of-scope for the single-file app, or as a future "pro/sync" tier.

---

## 1. WHAT OCEANFARMR IS (positioning)

- **Tagline / model:** "a software as a service (saas) that combines the best in apps, web-based software, and even finance packages to make your aquaculture farm more productive and profitable." (Apple App Store listing)
- **Originally SmartOysters** (oyster-only); rebranded **OceanFarmr** and expanded to **oysters, mussels, seaweed**, and per the App Store also "echinoderms, finfish, wild harvest, restoration monitoring, and scientific data collection."
- **Three pillars:** (1) iOS/Android **field app**, (2) **web-based dashboard**, (3) **Farm Finance** ("Farm to Own"/"Farm to Buy") financing.
- **Australian-founded** (by an oyster farmer); raised ~A$1.45M to scale abroad (Business News Australia). Won the **2023 NSW Sustainability Award** (Primary Industries).
- App Store/Play ratings are **too sparse to display an average** — adoption is real but not mass-market; trade press + testimonials carry the marketing.

---

## 2. STRUCTURED FEATURE INVENTORY

Format per feature: **what it is** · *why a farmer values it* · **[TAG]** + justification.

### A. Farm mapping / GPS leases
- **GPS-driven interactive map of leases.** Digital map of lease boundaries (lat/longs from lease deeds), lines, and labeled cages; shows "where your leases are, what's planted there and when it was last monitored." · *Find gear/stock in the water; prove monitoring for compliance.* · **[HYBRID]** — SpatMap already has a pannable schematic farm map (offline). Real-world **GPS lat/long lease boundaries + device geolocation "where am I on the map"** needs the Geolocation API (works offline-ish but device-dependent) and ideally a basemap tile source (online). A schematic offline map is OFFLINE-OK; true geo-referenced leases are HYBRID.
- **Location-based reports** ("capture your unique farm practice; track exactly where stock is and its condition"). · *Audit trail of where everything is.* · **[OFFLINE-OK]** as a per-plot/per-line record.
- **"Last monitored" date per lease/area.** · *Spot neglected leases; compliance.* · **[OFFLINE-OK]** (SpatMap has neglect-interval bones already).

### B. Stock & inventory / batch tracking
- **Batch tracking** — "a digital log that shows where every batch is, its history and current state." · *Single source of truth for what you own and where.* · **[OFFLINE-OK]** — SpatMap's batch/lineage model already covers most of this.
- **Inventory record of all stock** — "never lose track of your assets." · *Asset visibility, insurance, valuation.* · **[OFFLINE-OK].**
- **Grade / size per batch** (oysters & mussels). · *Grade = what you can sell now; drives revenue.* · **[OFFLINE-OK]** (largely shipped in v7).
- **Gear catalog** (bags, baskets, trays, cages) tied to stock. · *Know gear counts & condition; reorder.* · **[OFFLINE-OK]** (matches the backlog "master gear catalog" note).
- **Stock movements / operations log** (flip, dry, mix, scrub, split, move). · *Track handling history; reproduce best practice.* · **[OFFLINE-OK].**
- **Growth monitoring** — "takes the guesswork out of harvest timing by integrating data from various sources." Marked **"IN PROGRESS"** on their oyster page → partly aspirational. · *When will this be market size?* · **[OFFLINE-OK]** for the math from logged measurements; the sensor-fed version is HYBRID (see G).

### C. Tasks / labor / crew scheduling
- **Automatic task scheduling** — "record stock movements, automatically schedule farm tasks and manage workflow." · *Nothing falls through the cracks on a busy farm.* · **[OFFLINE-OK]** to generate/track tasks on-device; cross-crew live assignment is BACKEND.
- **Real-time task list shared across the farm** — "a real-time task list makes communication across the farm easy." · *Crew on different boats see the same to-do list.* · **[BACKEND]** — "real-time across the farm" = live multi-device sync; cannot be faked offline.
- **Task assignment to a team member.** · *Accountability; who's doing what.* · **[HYBRID]** — assigning to a name is OFFLINE-OK on one device; pushing it to that person's device is BACKEND.
- **Grade-due / next-action reminders** — "notifies farmers when their next grade is due." · *Grading on time = better survival & price.* · **[HYBRID]** — computing "due" is OFFLINE-OK; a true push notification when the app is closed is BACKEND.
- **Task prioritization.** · *Triage limited crew hours.* · **[OFFLINE-OK].**
- **Labor / activity tracking** (record labor activities & hours — strongest in the OysterTracker competitor; OceanFarmr frames it as workflow). · *Cut labor cost; cost per dozen.* · **[OFFLINE-OK]** for single-user time logging.

### D. Compliance & traceability (harvest tags, NSSP, food-safety)
- **Harvest notifications & reporting** — "harvest notifications and reporting tools that help organise your time & resources." · *Plan harvest crews & cold chain.* · **[OFFLINE-OK]** for the planning/report; the *notification* is HYBRID.
- **Monitoring records for compliance** ("when it was last monitored… ensuring compliance with regulations"). · *Regulators require dated monitoring logs.* · **[OFFLINE-OK]** as records.
- **Harvest tags / lot traceability.** *Note: not clearly evidenced as a built NSSP-grade module.* OceanFarmr markets compliance generally; I found **no evidence of an NSSP harvest-tag generator, time-temperature/cold-chain logging, or buyer-facing QR traceability** as shipped features. · *US growers must produce NSSP-compliant tags & shellfish-handling records.* · **[OFFLINE-OK]** for a printable tag + record; **[BACKEND]** if it must submit to a state/dealer system. **This is a genuine whitespace** — neither app clearly nails NSSP tags; SpatMap could differentiate with a printable harvest-tag + cold-chain log.

### E. Reporting / analytics / forecasting
- **Web dashboard with real-time visibility / analytics** — "real time data and analytics to make informed decisions." · *Owner/manager sees the whole operation.* · **[BACKEND]** — a multi-device live web dashboard needs a server. A single-device **on-screen dashboard** is OFFLINE-OK.
- **Downloadable reports** (crop performance, operations). · *Share with team/regulator/buyer.* · **[OFFLINE-OK]** via browser print-to-PDF / CSV blob.
- **Investor-ready data** ("really great… to present data to investors"). · *Raise capital, prove the operation.* · **[OFFLINE-OK]** as exportable reports/charts on one device.
- **Harvest-readiness forecasting** (growth → "what we will have in the future"). · *Pre-sell, schedule, smooth cash flow.* · **[OFFLINE-OK]** as projection math.

### F. Multi-user / crew / roles
- **User accounts (2–10 per tier).** · *Each crew member logs their own work.* · **[BACKEND]** — accounts + identity need a server.
- **Auto-sync between field app and web dashboard.** "Automatic synchronization between app and web-based dashboard." · *Office sees field data live.* · **[BACKEND]** — the defining cloud feature.
- **Profile customization, picture uploads.** · *Personalization.* · **[OFFLINE-OK]** locally; cross-user is BACKEND.

### G. Hardware & integrations (printers, scales, sensors, weather/tide)
- **Photo capture for repairs / documentation.** · *Show the problem, not describe it.* · **[OFFLINE-OK]** — SpatMap already stores photos in IndexedDB.
- **Water-quality / temperature sensor integration** (referenced under growth monitoring as a data source; **"IN PROGRESS"** — aspirational, not clearly shipped). · *Temp/salinity drive growth & mortality.* · **[HYBRID]** — pulling **public NOAA/USGS station data** (temp, tide) is OFFLINE-friendly when online (SpatMap already fetches NOAA tide/weather); **proprietary on-farm IoT sensor** integration is BACKEND.
- **Proximity alerts** (App Store: "proximity alerts"). · *Alert when near specific gear/lease.* · **[HYBRID]** — geofencing math is on-device, but reliable background alerts need a native app/backend.
- **iOS / Android / tablet apps; Spanish language support; offline native rebuild (v3.0.0, 2022).** · *Field-grade, works on the boat.* · App platform itself; SpatMap's analog is the **PWA/single-file** model.
- **No evidence of:** label-printer SDK integration, Bluetooth scale integration, accounting/ERP connectors. (Whitespace — but most are HYBRID/BACKEND or niche.)

### H. Sustainability / ecosystem services / lost-gear
- **Environmental-impact screenshots / documentation** — "screenshot of positive environmental impact… awesome for farmers getting funding through environmental offsets." · *Monetize ecosystem services (carbon/nitrogen offsets), grants, ESG.* · **[OFFLINE-OK]** to *capture/record* impact data; selling into a credit market is external/BACKEND.
- **Lost-and-found gear ("adrift gear") network** — added after Hurricane Sally; anyone with the app can scan found gear and the owner is notified; works for non-members; uses phone GPS. · *Recover expensive gear after storms — a real money-saver.* · **[BACKEND]** — a public cross-user scan-and-notify network is fundamentally server-based. Cannot be faked offline.
- **Sustainability positioning** (won 2023 NSW Sustainability Award). · *Brand / grant leverage.* · n/a (positioning).

### I. Onboarding / data import
- **White-glove onboarding**: "comprehensive mapping, on-boarding, and staff training services," config-form intake, customization & troubleshooting. Note: "limited app functionality until subscription activation and onboarding completion." · *Farmers aren't software people; hand-holding lowers the barrier.* · **[BACKEND/service]** — it's a paid human service. SpatMap's offline answer: **strong self-serve setup** (templates, gear checklist, draw-your-own farm) = **[OFFLINE-OK]**.
- **Free farm-management spreadsheet template** (lead magnet on their site). · *Try-before-buy; data they can import later.* · **[OFFLINE-OK]** equivalent: CSV import.

### J. Offline behavior
- **Native offline-first with background sync** — "Offline functionality with background syncing upon reconnection" (App Store; v3.0.0 was a "complete rebuild using native iOS with offline functionality"). v3.1.6 added "download status of key data… viewed from the settings screen." · *No cell signal on the water; must work offline then catch up.* · **[OFFLINE-OK]** for the offline half — **this is exactly SpatMap's home turf**. The *sync* half is BACKEND; SpatMap simply doesn't do it (and that's the honest tradeoff: SpatMap is offline-*only*, OceanFarmr is offline-*first-then-sync*).

---

## 3. WHAT SPATMAP LACKS — RANKED BY COMMERCIAL VALUE

SpatMap today: offline single-file; pannable SVG farm map (plots→areas→lines→cages→batches); drag-select Fill/Pull/Work/Harvest vs a barge; growth projections; per-cage photos; NOAA tide/weather bar; localStorage + IndexedDB; **no accounts, no cloud**.

Ranked for a mid-size off-bottom farm (5–20 leases, paid crew):

| # | Missing capability | Commercial value | Buildability |
|---|---|---|---|
| 1 | **Scheduled tasks + due/overdue work queue** (the "tell me what to do today" loop) | Very high — OceanFarmr's core hook | **[OFFLINE-OK]** |
| 2 | **Grade-due / next-action reminders per batch** | Very high — drives price & survival | **[HYBRID]** (compute offline; push = backend) |
| 3 | **Farm-wide grade inventory + harvest forecast calendar** ("what I can sell, and when") | Very high — sales planning, cash flow | **[OFFLINE-OK]** |
| 4 | **Mortality / survival tracking across the cycle** | High — the number revenue depends on | **[OFFLINE-OK]** (specced in notes) |
| 5 | **Maintenance / repair tickets (flag + photo + status)** | High — gear is the capital base | **[OFFLINE-OK]** single-user |
| 6 | **Labor / activity time tracking (cost per job)** | High — labor is the biggest opex | **[OFFLINE-OK]** single-user |
| 7 | **PDF/CSV report export (harvest log, grade tally, activity)** | High — buyers, regulators, investors | **[OFFLINE-OK]** (browser print/blob) |
| 8 | **Full data export/import + backup** | High — trust ("never lose my data") on a no-cloud app | **[OFFLINE-OK]** |
| 9 | **Printable NSSP-style harvest tags + cold-chain/handling log** | High in US (compliance); genuine whitespace vs OceanFarmr | **[OFFLINE-OK]** to print; submission = backend |
| 10 | **Per-batch chronological life-history view (clean timeline)** | Med-high — traceability & QA | **[OFFLINE-OK]** |
| 11 | **Geo-referenced GPS leases + "where am I" on a basemap** | Medium — nice in the field | **[HYBRID]** (Geolocation OK; basemap tiles need online) |
| 12 | **Multi-user accounts** | High for paid-crew farms — *but* | **[BACKEND]** |
| 13 | **Live crew task sync across devices / web dashboard** | High for paid-crew farms — *but* | **[BACKEND]** |
| 14 | **Auto-sync field↔office** | High — *but* | **[BACKEND]** |
| 15 | **Public lost-gear scan-and-notify network** | Medium (storm recovery) — *but* | **[BACKEND]** |
| 16 | **On-farm IoT sensor / Bluetooth scale / label-printer hardware** | Medium — *but* | **[BACKEND/HYBRID]** |
| 17 | **Farm Finance / "Farm to Own" financing** | Low for the app itself (it's a fintech bolt-on) | **[BACKEND]** (external product) |

**Read of the table:** Items #1–#11 are realistic SpatMap v3 territory and several (#1, #3, #4) attack OceanFarmr's *core* selling points without needing a server. Items #12–#17 are where OceanFarmr's cloud architecture genuinely wins and SpatMap, by design, will not follow in a single file. If those ever matter, they're a separate "Sync/Pro" tier with a backend — not a static-file fake.

---

## 4. PRICING & POSITIONING

**Model:** SaaS subscription, monthly or annual (**20% off annual**), **no lock-in contract**, region-priced. Tiers differ **only by number of user accounts** — features are identical across paid tiers. White-glove **setup, mapping, training** bundled in. "Limited app functionality until subscription activation and onboarding completion" (i.e., it's gated, not freemium).

**US / Rest of World (USD/month):**
| Tier | Price | Users |
|---|---|---|
| Lite | $90 | 2 |
| Level I | $180 | 4 |
| Level II | $295 | 6 |
| Level III | $450 | 8 |
| Level IV | $650 | 10 |
| Custom | contact | — |

**Australia / New Zealand (AUD/month):** Lite **A$115**, Level I A$180, Level II A$295, Level III A$450, Level IV A$650, Custom on request. (Only Lite differs from US pricing.)

**Plus:** **Farm Finance** ("Farm to Own"/"Farm to Buy") — an aquaculture financing/cash-flow product bolted onto the SaaS; and **lead-gen** via a free downloadable farm-management spreadsheet template.

**Positioning takeaways for a SpatMap competitor:**
- OceanFarmr charges **$90–$650/mo and gates the app behind onboarding** — there is clear room for a **free / one-time / no-account** offline tool aimed at solo and small farms priced out of, or unwilling to commit to, a per-seat SaaS.
- Their differentiation is **sync + dashboard + accounts + financing** — exactly the things a single-file offline app won't match. SpatMap should **not** compete there; it should win on **zero cost, zero account, instant, works-on-the-water, owns-your-data** and on **nailing the offline-doable core loop** (tasks, grading, mortality, harvest forecast, printable tags/reports) better than OceanFarmr does.
- **Whitespace to exploit:** NSSP harvest tags / US food-safety records (neither app clearly nails this), and a frictionless self-serve onboarding (vs OceanFarmr's paid mapping service).

---

## 5. SOURCES

- OceanFarmr — App Features: https://www.oceanfarmr.com/software
- OceanFarmr — Oyster Farm Management: https://www.oceanfarmr.com/oyster
- OceanFarmr — Pricing (router): https://www.oceanfarmr.com/pricing ; US plans: https://www.oceanfarmr.com/plans-us ; AU/NZ plans: https://www.oceanfarmr.com/plans-au-nz
- OceanFarmr — Homepage: https://www.oceanfarmr.com/
- Apple App Store — oceanfarmr (id1179175431): https://apps.apple.com/us/app/oceanfarmr/id1179175431
- Aquaculture North America — oyster farm app / free services (lost-and-found gear, Hurricane Sally): https://www.aquaculturenorthamerica.com/oyster-farm-app-offers-free-services/
- Aquaculture North America — new management software (OysterTracker comparison context): https://www.aquaculturenorthamerica.com/new-management-software-for-oyster-farms-1945/
- UF/IFAS Florida Shellfish — SmartOysters gear-supplier profile: https://shellfish.ifas.ufl.edu/online-oyster-culture-course/meet-the-gear-suppliers/smartoysters/
- The Fish Site — SmartOysters/OceanFarmr evolution & crowdfunding: https://thefishsite.com/articles/the-evolution-of-an-oyster-farming-startup
- Business News Australia — A$1.45M raise / scaling abroad: https://www.businessnewsaustralia.com/articles/aqua-farming-app-oceanfarmr-secures--1-45-million-as-it-dives-head-first-into-scaling-abroad.html
- coretext — "The digital life of oysters" (SmartOysters batch life): https://stories.coretext.com.au/The-digital-life-of-oysters/

*Caveat: OceanFarmr's marketing copy outruns its shipped feature set in places — "growth monitoring" and sensor integration are explicitly labeled **IN PROGRESS**, and I found no hard evidence of a shipped NSSP harvest-tag/traceability module. Claims tied to those are flagged in-line. OysterTracker (Chip Terry / BoatyardX) is a separate competitor; its labor/mortality framing is cited only as market context, not as an OceanFarmr feature.*
