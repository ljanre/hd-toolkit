# Figure 3.3 Subgrade Reaction Component

This independent offline component ports the attached AASHTO93 Figure 3.3 Sheet Backed v1.4.0 package into HD Toolkit, followed by loss-of-support correction using the user's Figure 3.6 screenshot. Figure 3.3 produces composite K_INF for semi-infinite subgrade. Step 2 accepts that result (explicitly assuming no seasonal/foundation change) or a separately adjusted effective k, and applies LS to produce kcorr. The Use kcorr button transfers the displayed whole-pci result to the pavement calculator and recalculates its slab thickness.

Source workbook: `AASHTO93_Figure3_3_Google_Sheets_App_v1.1.0.xlsx`. Source model v0.4.0, dataset 1.1.0, status VALIDATED_WITH_LIMITATIONS. The authority is the supplied chart and its digital reconstruction; Equation 5.22 remains QA_REFERENCE_ONLY. Matching source tests does not independently certify the chart or engineering assumptions.

- `engine.js`: original pure calculation, input validation, model validation, fingerprint and graphical mapping functions from Apps_Script_Project/Code.gs. No Google runtime or spreadsheet identifiers required.
- `model-data.js`: exact row objects extracted from the workbook's five runtime tables. All source numeric precision is retained.
- `figure-3-3.png`: unchanged clean display raster supplied with Apps_Script_Project, SHA-256 ca15b4a3eba1e30fb76f2aa46e0b4ea870b18d7e092ecbc5d4a09e48c5bacb8d.
- `index.html`, `subgrade.css`, `subgrade.js`: editable local interface, help dialogs, result, graphic construction and JSON export.
- `component.js`: custom element and iframe isolation.
- `loss-support.js`: approximate log-log reconstruction of the supplied Figure 3.6. Plot bounds are x=190..1120 for 1..2000 pci and y=905..33 for 1..1000 pci. LS=0 is exact identity. Measured endpoints for LS 1, 2, 3 respectively are [(212,905),(1120,118)], [(245,905),(1120,308)], [(282,905),(1120,435)]. Intermediate LS interpolates log10 output between adjacent lines. These are raster measurements, not certified AASHTO coefficients. The supplied example 540 pci / LS=1 reproduces approximately 170 pci. Graphical output is displayed and transferred at whole-pci precision; the export retains reconstruction precision for audit.
- `figure-3-6.png`: unchanged supplied screenshot. The test case/example arrows printed in this screenshot are fixed reference markings; the live overlay is red.

Figure 3.6 input envelope is 1..2000 pci with LS 0..3; corrected outputs outside 1..1000 pci are rejected. The existing Figure 3.3 ±6% allowance applies only to the composite result; no combined confidence interval is claimed. Seasonal averaging and shallow-foundation adjustment are not automated. Use the adjusted-effective-k route when these apply. Reference: https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05c.cfm (Figure 5-27 and Table 5-45).

Inputs are inches and psi, output pci plus a display conversion to MN/m³. 1 pci = 0.271447138 MN/m³. Inputs start blank. The valid ranges are DSB 4–20 in, ESB 15,000–1,000,000 psi, MR 1,000–20,000 psi; the printed output envelope is 50–2,000 pci. No clamping or extrapolation is performed. The source model's ±6% graphical allowance is displayed as such, not as a statistical confidence interval. Full precision is preserved in export; display uses two decimal places.

Reimport with `python scripts/import-subgrade-model.py <source-package-directory>` from the project root. This reads the workbook cached values and source engine without modifying the workbook. It also extracts the 130 golden cases into `scripts/subgrade-golden-tests.json`. Run `node scripts/verify-subgrade.mjs` after any model change.

The UI also evaluates FHWA NHI-05-037 Eq. 5.22 for finite positive inputs outside the chart. This is a separate published empirical equation, not extrapolation of digitized curves. Outside-chart applicability and uncertainty are unvalidated. Zero is not defined. Equation plots show k versus MR with the printed MR range shaded; no outside-range paths are drawn on the original chart. Figure 3.6 limits remain in effect. Source: https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05c.cfm
