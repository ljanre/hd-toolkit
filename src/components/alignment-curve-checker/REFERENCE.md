# Alignment reference basis — 1 November 2026

The user-supplied Plan & Profile, §11.1 Plan / Horizontal Alignment excerpts are the adopted basis for this worksheet update. The excerpt does not identify the full document title or edition; no additional attribution is assumed.

- Reverse curves: avoid abrupt reversal. Where unavoidable, especially in mountainous sections, provide at least 30 m of intervening tangent.
- Compound curves: the larger/flatter radius must not exceed 1.5 times the smaller/sharper radius.
- Broken-back / flat-back: a tangent shorter than 30 m between same-direction curves. Avoid this arrangement unless unusual topography or right-of-way constraints justify it. The worksheet flags the condition; it does not approve an exception.

The former 50 m warning tier from separately published DPWH project-plan notes has been superseded in this worksheet by the supplied note. Reverse gaps of 30 m or more pass the minimum length screen, not full transition/design approval. Superelevation runoff/runout, sight distance, speed/radius compatibility, widening, vehicle tracking and profile coordination require their own evidence.

The excerpt also asks for PI/PC/PT stations, PI coordinates, intersection angle, radius, tangent distance, curve length, superelevation, widening and design speed in design documentation, together with roadway/shoulder/ROW lines, 100 m station marks and sheet match lines. The local schematic remains a station-based curve checker; it is not a completed surveyed plan or documentation-completeness certification.

## Minimum curve radius — DGCS 2015

The full local DGCS Volume 4 (527 PDF pages) was located and read for this update. §3.6.2.1, printed p.3-19, identifies speed and maximum superelevation as controls. Table 3-12, printed pp.3-20–3-21 (PDF pages 95–96), supplies limiting rounded radii for emax 4%, 6%, 8% and 10%. The lookup uses exact printed speeds only; no interpolation or extrapolation. V starts blank; emax defaults to the user-adopted 8% and remains editable. Both controls apply to all curves in the schedule.

Source inconsistency: at 70 km/h / 4%, Table 3-12 prints calculated 203.1 m but rounded 135 m. Table 3-13, p.3-26 (PDF page 101), gives 203 m for 70 km/h at e=4%; the worksheet uses 203 m with this explicit correction. The 4% table is limited to urban conditions by Table 3-13. The 15 km/h / 4% and >100 km/h / 4% cases are absent from the table and remain Not evaluated.

A pass applies to the limiting-radius check, not actual superelevation design. For the selected emax, Tables 3-13–3-16 relate actual design e to R and V. Road-class/project minimums (including Tables 3-1 / 3-2 where applicable) may be more restrictive and must also be checked. The existing supplied-note 30 m tangent criterion is retained; this change does not alter tangent settings.

Radius failures color the radius input, calculated radius cell, curve centerline, curve detail boxes and symbol labels red. Detailed checks reports Rmin and shortfall. Calculation tests independently evaluate V²/[127(emax/100+f)] and compare the rounded values for all 48 supported rows, plus below/equal/above boundaries through the full model chain.

## Turn extraction and import

The copy prompt requires a separate turn audit: incoming/outgoing forward azimuths, signed change, source-angle residual, evidence and uncertainty. Staggered azimuth cells belong to tangent segments; both headings must be oriented in increasing-station travel. Clockwise-from-north signed change is ((Aout−Ain+540) mod 360)−180: positive Right, negative Left. Uniformly converting both back azimuths by 180 degrees preserves that difference. Coordinate confirmation uses E/N vectors and their cross product (positive Left). Missing endpoints, ambiguous row pairing, angle disagreement, zero/180-degree changes and unresolvable direction remain blank. Spiral geometry is flagged as outside this circular reconstruction model.

The five-column TSV format remains unchanged. Alignment imports now normalize Left/Right and lowercase L/R to the dropdown values. A missing TURN stays blank rather than receiving the legacy AUTO placeholder. Other import layouts retain their original behavior.

## Supplementary source details and default emax

The reusable prompt now requests a separate Design Controls table (speed, road classification, terrain, source and scope) and a per-PI Source Details / Review table (V, actual e, widening, T, Lc, PC/PT and spiral station/length details). These do not change the supported five-column import. Speed remains a separately selected shared control, not an automatically imported field; varying speeds must be identified and checked in separate applicable runs.

Maximum superelevation now defaults to 8%, remains editable, and fills an older blank saved maximum. An existing nonblank selection is preserved. No design speed is assumed. The prompt distinguishes the 8% default maximum from actual per-curve e, preserves printed e, and reports any conflicting governing emax for review.

## Screenshot and patched-image transcription

The copy prompt now specifies source inventory, per-cell verbatim transcription and provenance, overlap/seam reconciliation, conflicting-version handling, independent second-pass image reading, row-count reconciliation and categorical uncertainty. The five-column TSV is unchanged; raw readings and normalization/derived checks are separate. Unreadable, cropped, missing or conflicting required fields remain blank. The AI is asked for a Source Verification table and an explicit readiness statement, without claiming guaranteed OCR accuracy. This prompt is a checking procedure, not an OCR engine or proof that any particular screenshot has been accurately read; human source review remains necessary.
