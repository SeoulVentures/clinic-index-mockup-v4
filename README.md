# SeoulClinicIndex — design mockup v4

**This is a design mockup, not a working site.** Every screen is a static HTML
file. Nothing here accepts an enquiry, and there is no backend.

## What v4 changed

Every number on every screen is measured. Nothing is carried over from the
illustration phase.

- **Clinic records come from the Korean national medical facility registry**
  (Ministry of the Interior and Safety). The candidate pool is 2,387 skin and
  plastic clinics across Gangnam, Seocho and Songpa.
- **Prices come from each clinic's own published price page**, fetched on
  24 October 2026. No price is estimated, averaged or converted. Each price
  line shows its source and the date it was read.
- **The funnel is published in full**: 2,387 in the registry, 609 with a
  website on file, 467 reachable, 52 publishing a treatment and an amount,
  46 with a price we can read as a per-procedure figure.
- **Five filters, all from the registry**: year established, operating type,
  administrative neighborhood, parking, Saturday treatment hours. Where the
  registry has no record, the filter says so instead of guessing.
- **A coverage page** (`07 Data coverage`) states what the directory can and
  cannot tell you, including the parts of the collection pipeline that are
  still waiting on a search quota.

## How the collection stays current

Both collection jobs run on machine timers that survive a reboot.

| Job | Target | Cycle | Cost |
|---|---|---|---|
| Find a website | 1,778 clinics with no URL on file | Monthly on the 1st, plus weekly on Thursdays | Free allowance, or $9–$17.50 bought outright |
| Re-read prices | 609 known sites | Weekly, on Tuesdays | None — 126 seconds, measured |
| Re-find dead links | 142 dead URLs | Monthly, on the 1st | Covered by the first row |

The search sweep is scheduled **after** the monthly free search allowance
refreshes. That refresh falls on the first of each month at 09:00 KST — read
from the API's own rate-limit headers, two seconds off the month boundary —
so the sweep runs at 10:00 that day and again on Thursdays. Waking up before
the allowance exists would waste the run.

A clinic is found once and then cached, so the sweep shrinks as it goes. At
600 requests a month it covers 150–300 clinics a month, and roughly six to
twelve months for all 1,778.

## Screens

| Screen | File |
|---|---|
| Home | `index.html` |
| Clinic list | `clinics.html` |
| Clinic detail, prices published | `clinic-detail.html` |
| Registry record, no price | `clinic-detail-minimal.html` |
| Neighborhood guide | `neighborhood.html` |
| Treatment page | `procedure.html` |
| Data coverage | `coverage.html` |
| Palette study | `palette.html` |

## Palette

Six palettes ship in `assets/themes.css`. The default is **Navy & Brass**
(`#1B3557` / `#A8802F` / `#F4F3EF`). Use the switcher in the top navigation, or
pass `?theme=teal` (also `crimson`, `slate`, `aubergine`, `ink`).

## Data and map

Map positions are the registry's own coordinates for clinics with a readable
price. Tiles are OpenStreetMap. Nothing here is from a paid directory.

## Review build

Not the built product. See the SeoulVenture project for the build plan.
