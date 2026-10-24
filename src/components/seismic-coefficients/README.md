# Seismic Coefficients kh & kv

Public tool under Others at `#seismicTool`. Interactive manual input of reference PGA, PGA unit, map/source basis, project-adopted Fpga, foundation condition and coefficient case. Project/location and report references are optional context. Print/PDF includes the current inputs and calculation record. The host retains inputs when switching tools; there is no remote storage or automatic map query.

## Numerical scope and sources

Primary references reviewed 25 October 2026:

- [DPWH BSDS Design Standard Guide Manual](https://www.dpwh.gov.ph/dpwh/sites/default/files/BSDS%20Design%20Standard%20Guide%20Manual.pdf), Fig. 5.2-3 and Chapter 7, p. 7-10; the latter cites DGCS 2015 §16.2.6.1.
- [DPWH D.O. 18, s.2020](https://www.dpwh.gov.ph/dpwh/sites/default/files/issuances/DO_18_s2020.pdf), prescribing the guide and related bridge seismic manuals.
- [HazardHunter PH](https://hazardhunter.georisk.gov.ph/map), listing separate rock-site PGA maps at 500-, 1000- and 2500-year return periods, as well as a separate stiff-soil map.

As = Fpga × PGA(g). kh0 = As for other foundations, or 1.2 As for walls founded on hard or soft rock. The initial analysis case reports the unreduced kh0. The selectable Chapter 7 wall-inertia example reports kh = 0.5 kh0 as a conditional calculation, with a persistent applicability note. kv = 0 follows that wall/abutment example; no ±0.5 kh rule is inferred.

The worksheet is limited to these coefficient cases. It does not adopt a universal slope-stability coefficient or calculate seismic earth pressures, stability, force combinations or suitability of the half-coefficient method. The designer must verify governing DGCS checks (including PGA and backslope), movement/restraint requirements and project applicability separately. Source layers do not select or imply the project's design earthquake, and changing the recorded return period does not rescale PGA.

Fpga has no preset. Enter the factor established for the project site classification and adopted reference motion. Do not reapply it to an already adjusted PGA. No unverified site-class table is embedded, and rock-site map condition is not automatically equated with wall foundation condition.

Unit changes preserve the entered physical acceleration: 1 g = 9.80665 m/s² and 1% g = 0.01 g. Inputs and intermediate calculations retain full floating-point precision; display uses eight significant digits. With PGA=0.6 and Fpga=0.88 the tool retains As=0.528; half kh on other foundations is 0.264. The manual's rounded As=0.53 gives its illustrated kh=0.265 when entered with Fpga=1.

## Verification

`node scripts/verify-seismic-coefficients.mjs` checks independent numerical examples, unit equivalence, both foundation conditions and coefficient cases, invalid/missing inputs, source bookkeeping, clearing stale results, live UI changes, print action and Clear. The repository-wide tests cover registration, public routing, lazy loading and versioned production assets.
