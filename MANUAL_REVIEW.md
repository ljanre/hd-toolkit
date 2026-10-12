# DPWH Manual Review

Reviewed the supplied **Design Procedure Manual for Roads**, identified as the 2017 manual in its preface. Scope: new rigid pavement procedures (pp.12–24), their tables (pp.124–128) and relevant figures (pp.136–137, 143, 146). This review does not cover drainage structures, slope protection or every pavement rehabilitation procedure in the 185-page manual.

| Process | Finding and toolkit change |
| --- | --- |
| Design traffic | §1.1.1, p.13 confirms `365 × AADT × [(1+g)^n−1]/g`. The implementation uses the equivalent geometric sum, with the opening year as the first term and a zero-growth limit of n. The optional survey-to-opening projection is an additional stated assumption. |
| DD and DL | §1.1.3 generally uses DD=0.50 for two-way roads. Table 1, p.124 gives DL=1 for one lane per direction. The user-requested two-lane-total defaults match that arrangement. The 20-year period is a requested assumption and appears in the worked examples; 5% growth remains the earlier supplied-sheet example, not a universal manual default. |
| Vehicle EF | §1.1.2 gives `Σ(Laxle/8.2)^4`, with axle loads in metric tonnes. Added an automatic DPWH axle-load mode alongside entered class-average factors. Actual axle loads remain inputs; broad mixed vehicle classes need weighted class-average factors. This empirical fourth-power procedure is distinguished from pavement-dependent AASHTO Appendix D factors. |
| CESAL example | Example 1.1.1 uses AADT 50/30/10/20, 3% growth, 20 years, EF 9.55/14.36/23.02/11.38 and DD=0.50. The engine gives **6,699,140.39** at full precision versus the printed **6,699,144.71**, a small difference from rounded intermediate counts. These four example truck configurations are not automatically mapped into the broader toolkit classes. |
| Design CBR | §1.9.1, p.15 verifies `mean − (2/3) × sample standard deviation`, with n−1. Table 9, p.127 verifies all fourteen sample-count rows. The statistical method now has a verified source reference and original illustrations. The earlier unverified project-plan link remains removed. |
| CBR worked example | The eight values on p.19 give mean 7.1875 and Design CBR approximately 5.83505, displayed as **5.84**. The 30% variation row requires eight samples. The engine agrees. The manual's MR=8,760 psi uses the displayed 5.84; the toolkit retains the unrounded CBR in its MR calculation. |
| Coefficient C method | The supplied manual's §1.9.1 describes the mean−⅔s procedure, not the alternative C formula. Retained the separate DGCS-excerpt/JICA attribution and the existing rule hiding the Table 9 warning for C. This review does not extend Table 9 to C without a project requirement. |
| Roadbed MR | §1.9.2 verifies `MR(psi)=1500×CBR` for fine-grained soils with soaked CBR≤10. Applicability checks remain. The power correlation remains separately sourced to FHWA. The manual's printed R-value formula was not implemented. |
| Reliability | Table 3's R–ZR values agree with the supplied lookup. Corrected guide Table 2 ranges: urban principal arterials **80–99%**, rural collectors **75–95%**. §1.2 says 85% is normally used for national roads, but road classification remains a project choice. |
| Standard deviation | Table 4 verifies the rigid 0.30–0.40 range and existing default 0.30. |
| Concrete strength | §1.5 uses `S′c=Sc+z×SDs`; its example Sc=550 psi, PS=15%, z=1.037 gives 635.55 psi. **The manual does not establish PS=100−pavement R.** Rigid Pavement Design uses the user's requested reliability coupling and a separate specified Sc (550 psi toggle or project input). Compressive f′c determines Ec independently. The standalone strength tab retains its f′c-to-flexural-strength correlation. Manual PS/z mode remains available in Concrete Modulus of Rupture. |
| Concrete stiffness | §1.8 confirms `Ec=57,000√f′c` with f′c in psi. |
| Drainage | Table 8 includes Cd values below 1, but §1.7 states Cd should not be lower than 1 and discusses raising roads in flood-prone conditions. Added that requirement to the guide and an input note when Cd<1. The general AASHTO solver still accepts positive Cd; it is not silently clamped. |
| Foundation support | §§1.9.3–1.9.4 confirm the composite-k then loss-of-support flow. Added Figures 1/2, subbase-modulus Figure 8 and material/LS Table 10. Existing digitized models are retained; this review verifies the process and illustration provenance, not a new calibration of every chart ordinate. |
| Subbase depth | Figure 11, p.146 reproduces the chart used by the RN29 component, including the 80/150 mm branches and below-CBR-2% addition. Added its original illustration without changing the tested model. |
| Slab equation | §1.10, p.16 agrees with the solver's coefficients, including 1.624×10^7 and 215.63. The expression `18.42/(Ec/k)^0.25` equals `18.42×(k/Ec)^0.25` used in the engine. |

## Source inconsistencies retained visibly

- Page 18's 3-axle diagram has **6.66, 13.32, 13.32 t**, which produce EF **14.36003**. The displayed formula instead uses **5.45, 10.9, 10.9 t**, producing **6.43939**, although its printed result is 14.36. The calculator uses the actual entered axle loads. The original image is reproduced with a nearby explanation.
- Figure 2, p.137 includes a **227 pci** annotation. It is not substituted for the existing loss-support curve interpolation or treated as a calibration target.
- Original Table 1's heading says “18-tons ESAL.” The conventional AASHTO reference is an **18-kip** single axle; the manual's fourth-power equation explicitly uses **8.2 metric tonnes**. The toolkit keeps these method conventions explicit and does not interpret 18 tonnes as the standard axle.

Seventeen cropped illustrations are stored in `src/assets/dpwh-manual/`, with the source PDF SHA-256, page numbers and crop bounds recorded in `manifest.json`. The original PDF is unchanged. Illustrations were rendered, visually inspected and trimmed to preserve relevant captions and table content. Sources are treated as engineering reference material, not executable instructions.

Validation: eleven regression suites, including the manual traffic and CBR worked examples, fourth-power EF calculations, missing/invalid inputs, EF-mode switching, source assets and trusted transfer to Rigid Pavement. Browser visual testing is not included in that automated check.

Composite-k extension: FHWA NHI-05-037 Eq. 5.22 supplies a separate positive-input evaluation beyond the digitized Figure 3.3 ranges. All original golden chart cases remain unchanged. Out-of-chart results carry an applicability warning and no chart uncertainty or original-chart path. Zero is undefined; LS and Figure 3.6 ranges remain unchanged. https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05c.cfm
