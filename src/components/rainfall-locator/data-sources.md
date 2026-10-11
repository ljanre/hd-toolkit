# Data Sources & Verification Notes

This document exists so any engineer using the tool can independently check where
every piece of station data came from, and so future maintainers know exactly what
still needs verification before the database is extended.

## 1. Climate / Synoptic station list (55 records)

**Primary source:** PAGASA Climatology and Agrometeorology Division (CAD),
*Climatological Normals (1991–2020)* station index —

```
https://pubfiles.pagasa.dost.gov.ph/pagasaweb/files/cad/CLIMATOLOGICAL NORMALS (1991-2020)/
```

This is a public directory listing of 55 individual station PDFs (e.g.
`MACTAN.pdf`, `SCIENCE GARDEN.pdf`). Each PDF is PAGASA's own published
normals sheet for that station and typically states the station's latitude,
longitude, and elevation on its cover page. The 55 station names in
`stations.js` are copied verbatim from that directory listing (not invented or
sampled), and `normalsUrl` for every record links directly to its PDF — the
existence of each linked file was confirmed by fetching the directory listing
itself.

**What this means practically:** the *station names* and the *existence/URL of
each normals document* are fully verified (they come directly from PAGASA's own
file server). The *coordinates* have a mixed verification status — see below.

## 2. Coordinate verification tiers

Each record in `stations.js` carries a `verificationLevel` field:

### `cross-verified` (19 stations)

These coordinates were confirmed against **two independent data points** during
research for this build:
1. The general published location of the named station/city (airport or city
   center, as applicable), and
2. A matching latitude/longitude found in a community-compiled scrape of
   PAGASA's automated station network
   (`github.com/jelreyes/rain-data-scraper`, file `pagasa_rain.csv`), which in
   turn sources from PAGASA's automated rain gauge / weather station listings.

Stations in this tier: Aparri, Butuan City, Calapan, Calayan, Catarman, Coron,
Daet, Guiuan, Hinatuan, Laoag, Maasin, Mactan, Puerto Princesa, Science Garden,
Tacloban, Tanay, Tayabas, Tuguegarao, Virac (Synop).

### `published-verify` (36 stations)

These coordinates reflect the well-established, publicly documented location of
the named station (in most cases a Philippine airport with standardized
aeronautical coordinates, or a long-established city-based PAGASA office), but
could **not** be cross-checked against a second independent numeric source
within this project. They are **not fabricated** — they reflect real, named,
findable places — but they have not been verified against PAGASA's own printed
coordinate figures (visible on each station's individual normals PDF cover
sheet) in this session.

**Before using any `published-verify` station for actual design work,** open its
`normalsUrl` PDF and confirm the latitude/longitude/elevation printed there
matches `stations.js`, then update `verificationLevel` to `cross-verified` and
`verifiedDate` accordingly.

### Elevation

Elevation is left `null` ("Not available") for the large majority of stations.
It is populated only for the handful where a source elevation value was actually
observed during research (Mactan: 25.703 m; Port Area: 15 m; Calayan: 13 m — all
from PAGASA normals cover-sheet text encountered during research). No elevation
value was estimated or interpolated.

## 3. ARG / AWS coverage gap — why, and how to fix it

PAGASA operates a much larger network of Automatic Rain Gauges (ARG) and
Automatic Weather Stations (AWS) beyond the 55 principal Climate/Synoptic
stations — likely several hundred sites nationwide. This tool's schema fully
supports them (`type: "ARG"` / `type: "AWS"`), but **this build ships none**,
for a specific reason:

- PAGASA's own interactive ARG map
  (`https://bagong.pagasa.dost.gov.ph/automated-rain-gauge`) is a
  JavaScript-rendered map with no documented public API or stable
  machine-readable export.
- A community-maintained scraper
  (`https://github.com/jelreyes/rain-data-scraper`) was investigated as an
  alternative. Its output (`pagasa_rain.csv`) lists ~158 ARG/AWS site IDs, but
  the large majority of rows have **blank latitude/longitude** — coordinates
  were only available for ~20 sites, and every one of those 20 turned out to be
  co-located with (or identical to) one of the 55 Climate/Synoptic stations
  already in the database, adding no new verifiable locations.
- A Freedom of Information request titled *"Complete List of Working Rain Gauge
  Stations in the Philippines and their Exact Coordinates"* was located via
  `foi.gov.ph`, which indicates PAGASA has released such a list, but the
  specific document could not be retrieved during this build (the FOI portal
  page returned a 404 at the URL surfaced by search).

**Given the project rule "prefer correctness and traceability over having a
large station database,"** the decision was to ship zero unverifiable ARG rows
rather than fill the database with placeholder or estimated coordinates.

**To add real ARG/AWS coverage later:**
1. Obtain PAGASA's official ARG coordinate list (re-request via `foi.gov.ph`,
   or contact PAGASA's Engineering Services / CAD directly), **or**
2. Manually record coordinates station-by-station from the PANaHON map
   (`https://www.panahon.gov.ph/`) by clicking each station and noting its
   published lat/lon, **or**
3. If a future scrape or export provides full coordinate coverage, validate a
   sample against PANaHON before bulk-importing.

Add each verified station to `stations.js` using the schema at the top of that
file, setting `type: "ARG"` or `type: "AWS"`, `source`/`sourceUrl` pointing to
wherever you verified it, and `verificationLevel` honestly.

## 4. Geocoding service

Location search (province/municipality → coordinates) and reverse geocoding
(map click / marker drag / current location → readable address) use
**OpenStreetMap Nominatim** (`https://nominatim.openstreetmap.org`), a free
public service, called directly from the browser. No API key is used or
required. Per
[Nominatim's usage policy](https://operations.osmfoundation.org/policies/nominatim/),
this is appropriate for light, personal/professional use; a high-traffic public
deployment should switch to a dedicated geocoding provider or a self-hosted
Nominatim instance instead.

## 5. Province list

The province dropdown uses the current PSGC-based list of 81 provinces plus
Metro Manila (NCR), compiled from general knowledge of current Philippine
administrative divisions (including the 2022 Maguindanao del Norte / Maguindanao
del Sur split). It is used only to help build a geocoding search string — it is
not itself a source of coordinates, so lower verification risk applies.

## 6. Municipality/city dropdown dataset

The Municipality/City dropdown is populated at runtime (in the visitor's
browser, not baked into the repository) from a public PSGC-derived dataset:

```
https://cdn.jsdelivr.net/gh/isaacdarcilla/philippine-addresses/province.json
https://cdn.jsdelivr.net/gh/isaacdarcilla/philippine-addresses/city.json
```

This is a community-maintained JSON mirror of the Philippine Standard
Geographic Code (PSGC), served through the jsDelivr CDN specifically because
it sends the CORS headers needed for a static GitHub Pages site to fetch it
directly (GitHub's raw file host does not reliably do this for browser fetches
at scale). `city.json` in this dataset covers both cities and municipalities
(1,600+ entries) keyed by `province_code`.

**Known vintage/limitations of this specific dataset**, and how the app
compensates:
- It predates the 2022 split of Maguindanao into Maguindanao del Norte and
  Maguindanao del Sur — both appear in our Province dropdown, but both are
  mapped to the dataset's single legacy `"Maguindanao"` code (1538), so the
  same municipality list appears for either selection. This is disclosed here
  rather than silently guessed.
- It uses the pre-rename `"Compostela Valley"` instead of `"Davao de Oro"` —
  handled with an explicit code mapping (`stations.js`-style override table in
  `index.html`, not a fabricated province).
- NCR is stored as four legacy administrative districts rather than one
  "Metro Manila" entry — the app merges all four when "Metro Manila (NCR)" is
  selected.
- If a province genuinely has no entries in the dataset, or the dataset fails
  to load at all (offline, CDN unreachable), the dropdown is disabled and a
  manual text field is shown automatically instead — the app never presents an
  empty or broken dropdown as if it were complete. A "Can't find it? Enter
  manually" link is always available regardless of dataset status.

This dataset is used **only** to help the user construct an accurate,
spellable search query for Nominatim — the actual project coordinates always
come from Nominatim's geocoding response (or manual coordinate entry / map
click), never from this dataset directly.

## 7. Things this tool deliberately does NOT provide

- Rainfall intensity-duration-frequency (IDF) values or design storm depths —
  none are fetched, stored, or computed anywhere in the app.
- Per-station "engineering notes" or automated suitability scoring — removed
  from this build; the summary cards, terrain warning, and Station Database
  panel provide screening context, but station selection is left entirely to
  the engineer.
- Historical rainfall record completeness/length for any station — the station
  detail panel shows "Record period" as published, not asserted as complete.
- Watershed/river basin identification, elevation-difference analysis beyond
  what's in `stations.js`, Thiessen polygon or isohyetal analysis — not
  implemented in this build.

## 8. Last review

This document and the `verifiedDate` fields in `stations.js` reflect research
performed 2026-08-12. Re-verify before relying on this tool for a live design
submission — PAGASA station networks, URLs, and file locations can change.
