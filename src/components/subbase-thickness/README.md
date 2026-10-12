# RN29 Figure 6 Local Browser Calculator

This is the Checkpoint 7 standalone browser implementation of Road Note 29 (1970), Figure 6. Application `1.1.0` uses production model `RN29_1970_FIG6` version `1.0.0`, based on validated numerical model `0.3.0`.

## Start the calculator

No installation, spreadsheet, server, or internet connection is required.

- **Windows:** double-click `START_WINDOWS.bat`.
- **macOS/Linux:** run `./start_macos_linux.sh`.
- **Any platform:** open `dist/index.html` directly in a current browser.

The application is designed and packaged to work through a local `file://` URL. All model data, scripts, styles, and chart assets are local.

## Use

1. Enter cumulative traffic in **million standard axles (MSA)**.
2. Enter the project-specific **subgrade design CBR (%)**.
3. Select **Calculate thickness**.
4. Read the sole primary numerical output: **corrected sub-base thickness (mm)**.

Inputs are intentionally blank. The application does not insert typical or default project values.

The complete nomograph supplied on October 10, 2026 is shown with both thickness scales, the logarithmic traffic axis, printed limits, and CBR curves. Its registered overlay updates with every valid result. **Hide trace** clears the overlay without changing the calculated value. The numerical model—not the display image—governs the result.

## Status handling

- Missing values: `INPUT REQUIRED`
- Nonnumeric or nonfinite values: `INVALID INPUT`
- Unsupported individual or coupled combinations: `OUTSIDE NOMOGRAPH RANGE`
- Valid calculable combinations: `OK`
- Model identity or inventory failure: `MODEL ERROR`

No extrapolation is provided. Noncalculable requests return a null numerical result; the interface shows an em dash rather than zero.

## Verification

Open `dist/qa.html` to execute the 55 permanent Golden Tests and supplemental checks in the browser. The main calculator also runs all Golden Tests when it opens and disables calculation if verification fails.

For command-line regression, with Node.js installed:

```text
npm test
```

The release verification includes:

- 55/55 Golden Tests;
- 294/294 production reference lookup records;
- 6,006 dense curve evaluations;
- 500 repeatability cases;
- input, range, coupled-domain, coordinate, asset, and static-interface checks.

Regression tolerance is `0.000001 mm`. The separate engineering graphical uncertainty is `±5 mm` and must not be used as a broad software tolerance.

## Scope and limitations

- Engineering-model status: `VALIDATED_WITH_LIMITATIONS`.
- Application-readiness status: `APP_READY_WITH_LIMITATIONS`.
- The raw CBR 7% curve is obscured by printed annotation over approximately 0.49–4.70 MSA. The reconstructed raw ordinate is used; the printed 150 mm minimum governs where applicable.
- Independent graphical readings were AI-assisted rather than reviewed by a separate human engineer.
- No exact independent governing equation was verified for this edition and figure.
- Figure 6 gives structural sub-base thickness only. Frost susceptibility, total pavement depth, material suitability, winter-construction provisions, and jurisdictional applicability remain separate engineering checks.
- This software does not imply regulatory approval or professional certification.

## Release files

- `CHANGELOG.md` — application revision history
- `dist/index.html` — calculator
- `dist/qa.html` — in-browser verification
- `dist/engine.js` — authoritative application calculation engine
- `dist/model-data.js` — immutable embedded production model and QA fixtures
- `dist/app.js` — calculator interface and overlay logic
- `dist/qa.js` — in-browser QA runner
- `dist/styles.css` — responsive presentation
- `dist/assets/rn29-figure6-display.png` — registered display derivative
- `dist/assets/asset-manifest.json` — source, model, and display asset identities
- `tests/run-tests.js` and `tests/validate_static.py` — release verification

## Change control

Changes to the source edition, control points, coefficient data, scale mapping, interpolation, domain or branch rules, additions, minimums, graphical snap, reporting increment, units, or output semantics require engineering-model review and revalidation. Any code change requires the complete Golden Test and regression suite before release.

Application release: `1.1.0`  
Model release: `1.0.0`  
Numerical model basis: `0.3.0`

Toolkit UI fix: SVG hidden attributes are now toggled explicitly so Figure 6 construction traces render and hide correctly. A shared Figure 3.6 visual theme provides red paths/markers and white, red-bordered value callouts, with distinct labels for raw chart and adopted thickness. Numerical model and domain rules remain unchanged.
