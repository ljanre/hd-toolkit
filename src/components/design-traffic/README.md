# AADT and CESAL

The optional CESAL panel automatically uses the AADT column totals for each matching vehicle class. Reference and Station columns and the CESAL station selector are removed. Additional AADT rows represent non-overlapping components for the same design location and study period; do not sum separate stations or repeated counts. CESAL starts with user-requested two-lane assumptions: 20 years, DD=0.50, DL=1.00, opening delay=0, and a uniform 5% example growth rate from the supplied sheet. Two lanes means one in each direction. These are editable assumptions, not universal minima. AADT and active-class EF remain project inputs. Clear restores these CESAL defaults.

For class i, with growth r as a fraction, n whole design years and m whole years between survey and opening:

- Opening AADT = survey AADT × (1+r)^m.
- Growth sum G = Σ from t=0 to n−1 of (1+r)^t = [(1+r)^n−1]/r. For zero growth, G=n.
- Cumulative design-lane vehicles = 365 × opening AADT × G × DD × DL.
- Class ESAL = cumulative design-lane vehicles × EF.
- CESAL = sum of class ESAL; million ESAL = CESAL/1,000,000.

This is a constant compound-growth implementation. The first design year uses opening AADT, with no extra growth step. Constant DD, DL and EF are assumed. The calculation uses a conventional 365 days/year. The implementation uses log1p/expm1 for small nonzero rates, allows decline above −100%, and blocks nonfinite results. The supported calculation domain is 1–100 design years and 0–100 opening-delay years; these limits are not recommended design values.

Input AADT is two-way. DD and DL must be fractions in (0,1]. If data are already directional or design-lane traffic, use 1 for the corresponding applied factor to avoid double distribution. Zero-traffic classes require no growth/EF; positive-traffic classes require explicit rates and nonnegative ESAL-per-vehicle factors. A factor of zero must be entered explicitly when justified.

EF is an average over the class's actual vehicle and axle-loading distribution, including all axles per vehicle. Broad 3+ and 5+ axle classes require appropriate weighted factors. Manual EF, entered axle loads and the supplied Annex configuration are separate calculation options. The rigid transfer requires an explicit applicability confirmation. The Factor Source / Study Reference field has been removed as requested. Full precision is transferred; the rigid traffic input displays two decimals while preserving the stored precision.

References:

- [FHWA Traffic Monitoring Guide 2022, Appendix F.3](https://www.fhwa.dot.gov/policyinformation/tmguide/tmg_2022/appendix-f.cfm): ESAL definition, directional and lane distribution, AASHTO Appendix D factor selection and dependence on axle group/pavement/serviceability/slab thickness.
- [FHWA Section 3.3.2.2](https://www.fhwa.dot.gov/policyinformation/tmguide/tmg_2022/traffic-data-methodologies.cfm): axle-load data, equivalency factors and ESAL-per-truck summaries.

The growth equations above are the geometric sum under the stated constant-growth assumption. The supplied screenshot is used as process context. DPWH Department Order 22 (2011) was located, but its PDF was blocked during verification and is not presented as a verified source for the supplied numeric factors.

CESAL starts enabled and updates automatically on input. A uniform-growth mode can override all class rates for the forecast without overwriting the original rates. The UI previews cumulative design-lane vehicles while active EF values remain blank, but keeps the total CESAL pending until every active class has an explicit factor. Zero-traffic EF inputs display automatic zero and restore the prior entered factor when traffic returns. Unspecified project inputs remain blank, and incomplete results cannot be transferred.

The supplied DPWH Design Procedure Manual for Roads (2017), §§1.1.1–1.1.3 (p.13), verifies the growth and distribution process. EF Calculation Method also offers the manual’s Σ(axle-load-tonnes/8.2)^4 procedure. Enter each physical axle load; the engine derives the factor. Original axle illustrations (pp.18–19) and lane distribution Table 1 (p.124) are included. Page 18’s conflicting 3-axle numbers are explained rather than reproduced as a numerical assumption. Switching methods preserves entered manual factors. See ../../../../MANUAL_REVIEW.md for the review scope and discrepancies.

The supplied Annex A/B option adds a 13-configuration catalogue with native SVG vehicle diagrams, axle fractions and source GVW values. Select a compatible truck code and edit the adopted GVW in kilograms. Each axle load in tonnes is GVW × its fraction / 1,000; EF uses the same fourth-power procedure. Source GVW is initially offered for the selected code as a reference loading case, not a verified current legal limit or measured fleet average. A single configuration does not establish a weighted factor for a mixed fleet.

The supplied images omit axle distributions for codes 11-12 and 12-11. These remain pending in Annex mode; use verified axle loads or a class-average EF instead. Source wheel counts and vehicle terminology differ between Annex A and B, so the catalogue identifies configurations by code and axle count. The 5+ AADT categories only offer configurations with at least five axles; three- and four-axle trailer configurations remain visible in the catalogue. Changing calculation methods preserves previously entered manual factors.

Engineering schematics identify physical axles A1…An with load arrows and a ground datum, without implying measured axle spacing. Catalogue and live CESAL breakdowns show each axle's GVW percentage, load in tonnes, fourth-power EF and percentage contribution to vehicle EF. Annex-mode breakdowns follow adopted GVW; entered-axle mode derives the weight percentages from the entered loads. Display rounding does not affect calculations.

Automatic EF is the default and is restored by Clear. Truck reference selections start at 1-1, 1-2, 11-3 and 12-12 respectively, using the supplied GVW; edit them to the project configuration and loading case. Classes with no Annex mapping instead expose project axle-load inputs and calculate EF automatically. Missing active-class loads remain pending rather than becoming zero. Entered Class-Average EF remains available for weighted fleet factors and preserves previous manual entries when switching modes.

CESAL cells explain missing results with row-specific notes for axle loads, configuration, source distribution, GVW, manual EF or incomplete forecast inputs. Pending results use amber styling; zero-traffic classes explicitly show zero contribution. An explicitly entered zero EF has its own justification note. Total CESAL remains pending until every active class is complete.

Growth inputs are consolidated into the CESAL table. One Rate for All Classes shows the adopted shared rate in each row; By Vehicle Class exposes editable annual-growth inputs in the same column. Switching modes retains individual rates. The former separate horizontal growth table has been removed, and its question-mark guide is available beside Growth Rate Mode.

While EF inputs remain pending, the result card displays the subtotal of completed class ESALs and its million-ESAL equivalent. It identifies the included active-class count and excluded pending count. Missing factors remain unknown rather than becoming zero; `total` and `million` remain null until complete, while `subtotal` and `subtotalMillion` expose the computed portion. Rigid Pavement transfer continues to require a complete, positive CESAL and applicability confirmation.

## Truck configuration worksheet

The worksheet selector offers separate vehicle-class and configuration workflows; their totals are never combined. The configuration worksheet allows separate counts and loading cases for the 13 catalogue codes, including repeated codes at different GVW, survey/opening years and project identification. It reuses the forecast engine, exposes raw two-way cumulative vehicles and design-lane vehicles, and applies DD/DL once. Blank count rows are excluded; active rows with missing EF leave a partial subtotal and block transfer. Transfer additionally requires confirmation of traffic coverage and rigid-factor applicability. CSV and print summaries retain the project parameters and included cases.

The attached screenshot example uses survey/opening 2025, n=20, r=3.8%, DD=DL=0.5; code 1-2 has AADT 2,197 at 33,300 kg, code 11-2 has AADT 1,865 at 40,600 kg. Its 11-2 fractions are 0.168, 0.2981, 0.2793, 0.2538 (sum 0.9992). These are retained as entered for the example, not silently normalized or substituted into the existing catalogue. The computed total is 140,432,208.594 ESAL, matching the screenshot rounded to 140,432,209. The configuration UI accepts fraction sums within 0.001 of unity for source rounding, and flags non-unity sums; wider discrepancies block an active loading case. All EF computations preserve full precision. The initial project years and counts remain blank; Load Attached Example explicitly populates this reference case.
