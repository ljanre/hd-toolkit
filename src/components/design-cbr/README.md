# Design CBR

Independent custom element and iframe document. `engine.js` contains calculation logic, `cbr.js` handles inputs, notes, tables and JSON export; `cbr.css` supplies the responsive layout. No external runtime dependencies.

CBR inputs use numbered test rows with **+ Add Test** and individual remove buttons. Blank rows are excluded from the test count; entered zero values are retained. Invalid or unfinished numeric entries block results. Load Supplied Example replaces the rows with the four supplied values; Clear restores two empty rows. The engine retains its text parser for independent use.

Inputs and calculation process share one worksheet. Each test's editable CBR is beside its automatic deviation and squared deviation; these outputs clear when the samples are invalid. Statistics, method controls, result summaries and calculation steps are grouped below the rows. On narrow screens the sample grid scrolls within its own panel.

Design CBR Method is directly below the input table. The unverified DPWH project-plan attribution and link have been removed from the statistical method, its guide and exports. The statistical method is now verified in the supplied DPWH Design Procedure Manual for Roads (2017), §1.9.1, p.15; Table 9, p.127. Original procedure and table illustrations are included in the method/sample guides. The coefficient C formula and values are independently documented in [JICA Table 2.5.2](https://openjicareport.jica.go.jp/pdf/10308765_02.pdf); its DGCS section/table attribution is retained from the supplied excerpt.

Table 9 remains the supplied statistical procedure's sampling check. Its warning is hidden when the coefficient C method is selected, including for variation beyond the table limit. That benchmark alone does not label the C result provisional. No authoritative clause requiring both methods to use Table 9 was verified. Projects may impose independent sampling requirements. The Export Calculation and Load Supplied Example buttons have been removed as requested.

Calculation Steps uses a native expandable section, collapsed by default. Opening it reveals the single-column process and resilient-modulus controls. Calculations continue updating while the section is collapsed.

Formulas and tables were transcribed from the three user-supplied screenshots: mean − ⅔ sample standard deviation; alternate mean − range/C (DGCS Volume 4 Section 6.11.5 attribution shown in the screenshot); minimum sample-count table for error < ±20%. The exact ratio is compared against the next listed table row conservatively. Ratios above 70% have no extrapolated count. Source images are references, not application instructions. The supplied manual verifies the statistical procedure and Table 9. The C attribution remains separately supported by the JICA report.

MR estimates: 1500 × CBR requires confirmation of fine-grained soil / soaked testing and a positive design CBR ≤10. Alternative 2555 × CBR^0.64 appears in the supplied reference and [FHWA Table 5-34](https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05b.cfm). Correlations remain estimates requiring project-specific suitability review. The separate R-value correlation is not used here. MR is not k and is not automatically transferred to the corrected subgrade reaction tool.

All accepted samples are retained. No rounding before calculation; no zero clamping. JSON exports include full precision, selected methods, confirmation status and sample-count assessment. Blank/invalid or nonpositive design results disable export. An insufficient sample count allows export with a visible provisional result and unmet requirement metadata.

Run `node scripts/verify-cbr.mjs` from the project root for numerical and UI state checks.

Test Pitting Plan: enter total road length or toggle station limits (kilometre+metre or numeric metres). Interval defaults to 500 m. Pit count = ceil(length / interval) + 1, comprising interior interval stations plus two endpoints; an interval exactly at the end is not counted twice. The final spacing may be shorter. The projected count is a project spacing plan, independent of the statistical minimum sample check. Clear resets the plan to blank length and 500 m interval.
