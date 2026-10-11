# PAGASA Rainfall Station Locator
### Road Drainage & Stormwater Design Reference Tool

A static, client-side web app that helps civil engineers identify **which PAGASA
rainfall/weather stations to investigate** when selecting rainfall data for road
drainage and stormwater design (roadside ditches, cross drains, pipe/box culverts,
storm drains, catch basins, channels, small bridges, and similar structures).

## Purpose

Given a project location anywhere in the Philippines, the tool:

- Finds the nearest PAGASA stations by straight-line (Haversine) distance
- Separately identifies the **nearest rainfall-monitoring station** (ARG/AWS) and
  the **nearest long-term climate/synoptic station**, because these are not
  necessarily the same station and serve different engineering purposes
- Flags a **potential design-rainfall reference station to investigate first** —
  never an automatic final selection
- Plots numbered, named station labels on the map (not just click popups)
  that match the rank (#) column in the results table, with a scale bar and
  north-arrow indicator, so the map is self-explanatory on screen and on paper
- Flags terrain-/orographic-sensitive project locations (Cordillera, Sierra
  Madre corridor, Bicol, Eastern Visayas, Mindanao highlands) for engineering
  review

## Engineering Limitation (read this first)

**The geographically nearest PAGASA station is not automatically the correct
station for design rainfall or IDF analysis.**

Rainfall over the Philippines varies significantly over short distances due to
terrain, elevation, prevailing wind/monsoon exposure, coastal vs. inland setting,
and typhoon tracks. A station 10 km away across a mountain range may be a poor
climatological analog; a station 40 km away in the same exposure/watershed may be
far more representative. This tool cannot make that judgment — it narrows the
field of stations worth investigating and hands the decision to the engineer.

This is why the app always distinguishes:

1. **Nearest rainfall monitoring station** (ARG/AWS) — proximity only.
2. **Nearest long-term climate/synoptic station** — record length matters more
   than proximity for frequency analysis.
3. **Potential design-rainfall reference** — phrased as "investigate first," with
   a fallback of **"Engineering Review Required"** when no nearby candidate is
   climatologically defensible on the available data alone.

## Data Sources

Full source-by-source attribution, including exactly which fields were
cross-verified vs. single-source, is in **`data-sources.md`**. In summary:

- **Climate/Synoptic stations (55 records):** PAGASA Climatology and
  Agrometeorology Division's published *Climatological Normals (1991–2020)*
  station index (`pubfiles.pagasa.dost.gov.ph`).
- **Coordinate cross-checks:** PAGASA's automated station network coordinate
  export and the PANaHON hydromet portal (`panahon.gov.ph`), where a match could
  be found.
- **Geocoding:** OpenStreetMap Nominatim (`nominatim.openstreetmap.org`), used
  client-side only, no key required.
- **Province/municipality dropdown data:** a PSGC-based public dataset
  (`isaacdarcilla/philippine-addresses` on GitHub, served via the jsDelivr CDN
  for CORS support), fetched live in the browser. See `data-sources.md` for its
  known vintage and limitations.
- **ARG/AWS network:** This build ships **zero** independently-verified ARG
  records distinct from the stations above. See `data-sources.md` for why, and
  how to extend the database responsibly instead of guessing coordinates.

## Deployment (GitHub Pages)

1. Push `index.html`, `stations.js`, `README.md`, and `data-sources.md` to the
   root of a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Select your default branch and folder `/ (root)`, then **Save**.
5. Open the URL GitHub provides (typically
   `https://<username>.github.io/<repo-name>/`).

No build step, no backend, no API key, no paid service. Works entirely from
static files.

## Updating the Station Database

All station data lives in **`stations.js`**, intentionally kept separate from
`index.html`'s application logic. To add, correct, or remove a station:

1. Edit the `STATIONS` array in `stations.js`. Use the `climateStation({...})`
   helper for Climate/Synoptic entries, or add a plain object matching the schema
   for `ARG`/`AWS` entries (see schema comment at the top of the file).
2. **Never guess a coordinate or elevation.** If you can't verify a value against
   a named, checkable source, leave it `null` and set
   `verificationLevel: "published-verify"` (or add a `notes` caveat).
3. Update `STATION_DB_META` is computed automatically from the array — no manual
   count-keeping needed — but do update `lastReviewed`.
4. If adding a new station type or region-sensitivity rule, also check
   `TERRAIN_SENSITIVE_PROVINCES` and `STATION_TYPES` for consistency.

## Methodology

- **Distance:** Haversine great-circle formula between the project coordinate and
  each station coordinate, reported in kilometers. This is explicitly a
  **straight-line distance**, not a road-travel distance, and the UI labels it
  as such everywhere it appears.
- **Ranking:** Stations are filtered by selected type and radius, then sorted
  ascending by distance. Ranking never uses provincial boundaries as a factor —
  a station in an adjacent province can outrank one in the "correct" province if
  it is physically closer.
- **Design Reference Status:** "Candidate Identified" only appears when a
  long-term climate station is within 75 km; otherwise the app reports
  "Engineering Review Required." Either way, the language used is "investigate
  first," never "use this station."
- **Municipality/city dropdown:** selecting a province populates the
  Municipality/City dropdown with that province's cities and municipalities,
  fetched at runtime from a public PSGC-based dataset (see Data Sources below)
  rather than shipped as a large embedded file. If the dataset can't be
  reached, or a province has no listed entries, the field automatically falls
  back to manual text entry — the user can also always switch to manual entry
  via the "Can't find it? Enter manually" link.

## Design Rainfall / IDF Data

This tool does **not** include a rainfall/IDF data-entry feature. It is a
station-location and screening tool only. Once a candidate station has been
identified and investigated, obtain verified return-period rainfall intensities
separately from:

- PAGASA (climate data services / rainfall studies)
- DPWH Design Guidelines, Criteria and Standards (DGCS)
- The National Hydraulic Research Center (NHRC)
- Project-specific hydrological studies

No rainfall intensity or IDF value is fetched, stored, computed, or estimated
anywhere in this application.

## Printing / Exporting

The **Print / Save PDF Report** button prints a compact, single-page-oriented
report — deliberately leaner than the on-screen view:

- **Title block:** app name, "Rainfall Station Screening Report," subtitle,
  a generated timestamp, and the project location/coordinates plus the
  nearest-gauge / nearest-climate / design-reference lines.
- **Map:** the live interactive map exactly as shown on screen — numbered,
  named station labels (not just click popups, so the printed page is
  self-explanatory), a scale bar, and a north-arrow indicator. A `beforeprint`
  handler re-fits the map to the current stations right before printing.
- **Table:** the full candidate station table, with page-break rules so rows
  aren't split across pages and the header repeats if it spans more than one.
- **Disclaimer:** a single closing block that merges the Engineering Use
  Notice, the Terrain/Orographic Notice (included only when it actually
  applies to the project location), and the screening-result-specific
  verification requirement — instead of three separate notices.

The on-screen **Engineering Use Notice** banner and **Screening Summary**
card (with its four summary cards) are screen-only — their substance is
folded into the compact title block and closing disclaimer for print, and
print CSS otherwise hides the input forms, filters, buttons, and other
screen-only cards, so only the report content is printed.

## Disclaimer

This is an independent engineering reference and station-location tool. It is
**not an official PAGASA or DPWH application** and is not affiliated with either
agency. Station locations, elevations, and metadata should be verified against
current PAGASA records before final design use. Rainfall intensity, IDF values,
design storm depths, discharges, and drainage structure dimensions must be
calculated and verified by a qualified engineer using authoritative data and
applicable design standards.
