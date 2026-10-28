# Hydrology worksheet · technical basis

Reviewed 28 October 2026. This is a Rational Method calculation worksheet, not a replacement for a drainage-network model or a declaration of compliance with every DPWH drainage provision.

## Primary numerical reference

**FHWA, Highway Hydrology, Hydraulic Design Series No. 2, second edition, October 2002, FHWA-NHI-02-001**, authors Richard H. McCuen, Peggy A. Johnson and Robert M. Ragan.

- Official publication locator: <https://www.fhwa.dot.gov/engineering/hydraulics/pubs/02001/02001.pdf>.
- The full publication was actually read from the teaching repository mirror: <https://github.com/dustykat/ce-3354-webroot/blob/1a4141ede9217ca912d06d6b403faba72ac70105/3-Readings/FHWAHighwayHydrology/FHWA-NHI-02-001.pdf>. Direct FHWA retrieval was unavailable in the execution environment. The PDF identifies the title, edition, publication number, date and authors on its first two pages.
- Full source PDF SHA-256: `1a5f96deda2af4ef1e7eac66f0fb32bc7c86df4d4880cb5f8a99a6c4c3f969ac`.
- The shipped `fhwa-hds2-excerpts.pdf` contains original PDF pages 59, 60, 62, 197–201, unchanged in content. These are printed pp. 2-21, 2-22, 2-24, 5-31–5-35. Excerpt SHA-256: `4e042aa72f44b1121f75f8b1015ed8e41e9786191813d2e31d0ec1059d80bfe4`.

The eight excerpt pages support every implemented empirical reference and equation:

| Worksheet operation | Reference |
| --- | --- |
| `Q = i Σ(Ci Ai) / 360`, m³/s with mm/h and ha | Eq. (5.28), p. 5-31 |
| Area-weighted runoff coefficient | Eq. (5.29), p. 5-32 |
| 24 coefficient ranges | Table 5.7, p. 5-33, citing ASCE (1960) |
| Sequential travel time `L / (60 V)` and sum along the principal path | Eqs. (2.3)–(2.4), pp. 2-21–2-22 |
| Eight empirical velocity coefficients; `V = 10 k √S` in SI | Eq. (2.7), Table 2.2, p. 2-24, citing McCuen (1989) |
| Optional two-branch critical condition and adoption of max(Q, Q′) | §5.3.3, Eqs. (5.30)–(5.31), pp. 5-32–5-34 |
| Published numerical example | Example 5.5, pp. 5-34–5-35 |

The area limit is specifically HDS-2 §5.3.1: **smaller than 80 ha**. It is implemented as a domain limit for this worksheet and is not presented as an independently verified DPWH limit. The method's uniform-rainfall, full-contribution and frequency assumptions are stated in the UI. No universal runoff frequency factor, rainfall uplift, return period, minimum Tc, Philippine rainfall intensity or hydraulic structure size is assigned.

## Philippine project criteria and rainfall

The tourism-road reference is reproduced from the already supplied **DPWH DGCS Volume 4, Table 3-2, printed p. 3-3**, in `../design-criteria/reference-excerpts.pdf`: pipe culvert design at 15 years with sufficient freeboard for the 25-year flood; box culvert at 25 years with sufficient freeboard for the 50-year flood. These criteria are explicitly scoped to that table and do not auto-populate a general highway criterion. The engineer supplies the actual governing classification, issuance, return period and higher-flood requirement.

PAGASA/project RIDF data are user inputs, including their return period, representative station and source issue. There is no rainfall download, geographically invented intensity, daily-to-short-duration disaggregation or automatic selection of the nearest gauge. The issued RIDF equation can be evaluated externally and its intensity entered directly at the adopted duration. Table mode provides explicitly selected log–log or linear interpolation; neither is claimed to be prescribed by PAGASA/DPWH. Extrapolation and mismatched design/rainfall return periods are rejected. Direct intensity must identify the matching duration. A source-specified duration floor is optional and never changes the physical Tc used in the branch time ratio.

## Calculation and adoption

Areas are converted to hectares before calculation. Changing the area unit converts the numeric entries, including the short-branch area. Blank/zero-area rows are excluded; positive areas require C from 0 to 1. Cover selection displays a range; adoption is explicit. Values outside the reference range remain project inputs and are flagged.

The optional two-branch check treats the entered short branch as a subset of the overall area. It derives long-branch area and C by subtracting the short branch's area and CA from the combined totals. It validates that the remaining C lies between 0 and 1 and that short Tc is less than main Tc. This is Eq. (5.31), not an invented generalization to an arbitrary number of branches. Larger networks or significant storage need a suitable model.

The example loads Memphis inputs, explicitly labelled as an example rather than Philippine project rainfall. The book adopts rounded Tc = 36 min and i = 85 mm/h. The worksheet retains the entered cover products exactly: total area 43.7 ha, ΣCA = 13.945 ha, Cweighted = 0.31910755148741415, Q = 3.2925694444444447 m³/s, reproducing the book's rounded 3.3 m³/s. Switching to the provided three travel-time segments computes approximately 36.36322463768116 min; direct rainfall must then be supplied at that duration.

Calculations use full precision. Copy Q copies a raw m³/s number. Source metadata, project criteria and hydraulic adoption remain visible; the UI does not label the calculation as an approved structure design. Inputs are saved only in the browser. Printing provides the inputs, calculation trace, results and references; no report is issued or sent externally.
