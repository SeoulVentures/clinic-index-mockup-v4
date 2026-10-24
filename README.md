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
