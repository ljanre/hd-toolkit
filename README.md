# HD Toolkit

A static highway design toolkit with engineering inputs, live calculations, reference illustrations, and browser-local storage.

## Run locally

Requires Node.js 20 or newer. No package installation is required.

```sh
npm run dev
```

Open http://127.0.0.1:5173. The source entry point is `src/index.html`.

## Check and build

```sh
npm test
npm run build
```

The test command runs 17 regression suites. The build creates a clean production site in root `dist/`, excluding development notes, tests and QA pages. It compacts model tables without changing their values, uses pixel-identical WebP foundation charts, and versions local assets and calculator documents automatically. Deploy the contents of that folder with a static hosting service. The nested `src/components/subbase-thickness/dist/` folder is required source for the supplied subbase module; retain it in the repository.

## Upload to GitHub

1. Create an empty GitHub repository with a `main` branch.
2. Upload the contents of the prepared `GitHub-Upload` folder into the repository root. Upload `src/`, `scripts/`, `.github/`, `.gitignore`, `package.json`, and the Markdown documentation. Include the hidden `.github` folder; it contains the deployment workflow. Do not upload only the ZIP or an extra enclosing folder.
3. In repository **Settings → Pages**, select **GitHub Actions** as the source.
4. Commit to `main`, or manually run **Deploy HD Toolkit to GitHub Pages** in the Actions tab. The workflow checks the app, builds it, and deploys `dist/`.
5. The Pages URL appears after successful deployment. No domain purchase is required.

The upload folder is a snapshot. Later edits to the working project must be copied into the repository before deployment. There is no backend, subscription billing, or payment integration in this version.

## Tools and access

Public tabs: Rigid Pavement Design, Design CBR, Subbase Thickness Design, Rainfall Station Locator, PRS92 Converter, Design Traffic (TBD), and Flexible Pavement Design (TBD). Developer mode enables additional tools: Corrected Subgrade Reaction and Concrete Modulus of Rupture. Calculation-step panels in the pavement, CBR, and subbase design workspaces are Developer-only. Generate Report and Save buttons in those design input panels are disabled placeholders.

The current Developer switch is a client-side interface gate configured in `src/admin-mode.js`. It is not authentication: publicly hosted source and assets remain accessible. Browser-local values and uploaded illustrations stay in the user's browser; there is no shared account database. The rainfall locator uses external map, geocoding, and municipality services and requires internet access.

## Project layout

- `src/`: website, isolated tool components, engineering reference assets.
- `scripts/`: development server, build command, numerical and interface checks.
- `.github/workflows/deploy.yml`: checked GitHub Pages deployment.
- `INPUT_DEFAULTS.md`: input defaults and assumptions.
- `MANUAL_REVIEW.md`: design manual review and method limitations.
- Root `dist/`: generated site, excluded from Git.
- `Local Archive/`: original local reference material, excluded from Git and the upload snapshot.

Component documentation remains beside its source. Rigid design incorporates the subgrade reaction engines; flexible design uses an AASHTO 1993 structural-number calculation. The subbase component offers rigid Table 5 and flexible Figure 6 modes, retaining the supplied flexible RN29 model and regression cases. Design CBR supports the statistical and coefficient-C methods with their sampling and correlation limits.

Regression tests verify implemented behavior and numerical consistency. They do not independently certify engineering assumptions or project designs. Review the component references and use project-specific inputs before adopting results.

## Adding and updating tools

Edit `src/tool-registry.js` for tool order, category, title, access, custom element and document path. The sidebar and router use this registry. Add the tool's hidden host section in `src/index.html` and its calculator document, styles, engine and interface in `src/components/<tool-name>/`. The shared registration creates an iframe only when the tool is selected and retains it on revisits. Standalone engines remain isolated, so tools can be updated independently. Older component registration files are retained for compatibility and their regression checks; the main page loads only the shared registry.

Run `npm test` before publishing. Tests cover model values, lazy activation, stable cache versions, missing development files and clean rebuilds. `npm run build` produces `dist/build-manifest.json` with release identity and sizes. Copy source changes into the GitHub checkout before committing; GitHub Actions builds the same artifact. Do not edit generated files in root `dist/`.

The original PNG charts remain source references. If those charts change, regenerate their exact WebP derivatives with `python scripts/optimize-reference-images.py` (Pillow with WebP support), then run the checks. Normal builds need only Node.js; Python is not required for deployment.

## Project road details inventory

The public Project Road Details tool under Others searches the supplied DPWH national-road CSV snapshot by identifiers, road names and location. It retains all 4,573 source records and 22 fields, including repeated section IDs; users choose a specific record. Project title and station limits are separate entered context, not verified inventory coverage. The snapshot contains no usable geometry or station limits and does not establish design traffic or local urban/rural classifications.

Data is loaded only when opening this tool. `scripts/import-road-network.py <csv-path>` regenerates the compact dictionary-encoded `network-data.json`, preserves every CSV cell and records the source SHA-256. Run the regression checks and review inventory changes before publishing a replacement snapshot.

For Design Traffic, Flexible Pavement Design and Culvert, public mode shows the shared TO BE DEVELOPED panel. Developer Mode reveals the existing calculator and removes the TBD label. Returning to public mode hides the calculator without discarding its inputs.


### Design Criteria typical section

A dimensioned two-lane crowned road section appears above the criteria schedule. Pavement and shoulder widths use project-adopted schedule values, falling back to the selected baseline. Section controls adjust crossfall, pavement material/thickness, ground elevations and cut/fill H:V slopes. The supplied Tables 3-2 and 7-1 provide thickness/crossfall checks and material-height slope guidance. All drawing dimensions are metric.

The initial +1 / −1 m shoulder-edge ground elevations are illustrative, relative to the finished centreline, and must be replaced with survey values. Ground is a straight-line profile; vertical scale is exaggerated. Cut/fill areas are geometric areas to the pavement underside, not quantities or approved slope designs. Separate base/subbase layers, drainage, ROW, berms, protection and surveyed terrain require project design. Table 7-1 conditions and rock-cut assessment remain applicable. `npm test` includes independent cut/fill geometry checks.

### Verified road classifications and criteria

Design Criteria is checked against the user-supplied DGCS Volume 4 (2015). Road-system provisions (§1.5.5), the older Table 3-1 category schedule, tourism Table 3-2, and functional design criteria are separate selectable bases. Added provincial/city/municipal/barangay/FMR/tourism/expressway/parkway selections and minimum/desirable standards where the table provides them. Tertiary is retained as a project classification, with no invented dedicated DGCS table column.

Tourism PCC is 230 mm with 1.5% normal cross slope; ACP is 50 mm with 2%. These requirements do not apply automatically to other classes. Table 3-1 non-passing distances remain separate from Table 3-8 stopping distances. 95 km/h has no exact Table 3-8 row, so it needs project review. Functional rural widths and grades use Tables 3-3–3-5 and 3-27–3-32; unlisted combinations require review. Expressways need a divided multilane design and do not use the two-lane drawing. The tourism ROW printed as 2.10 m is internally inconsistent and is intentionally left for verification.

The tool links to a compact PDF of actual pages from the supplied manual, retaining their original printed page numbers. The entire uploaded manual is not copied into the site. Current Department Orders, design approval and project-specific departures remain separate from baseline comparison.

### Project design controls and impact checklist

Design Criteria includes expandable project inputs for design vehicle/envelope, forecast year, shared ADT, K and D factors, DHV override, heavy vehicles, target LOS, operating speed, pedestrians/cyclists, access, clear zone/hazards, flood/groundwater elevations, investigation status, surveyed ROW and corridor constraints. Unknown inputs remain TO BE ESTABLISHED. Every field has an input guide; a ten-topic impact checklist identifies the required design analyses and references.

DHV = ADT × K/100; directional DHV = DHV × D/100. A separately entered DHV overrides this estimate and discrepancies are flagged. Directional heavy-vehicle demand assumes the entered composition applies to that direction. These are vehicle counts, not capacity, ESAL, or growth calculations. Speed/ROW comparisons flag review without modifying geometry. Project flood and groundwater elevations do not alter the drawing’s illustrative relative datum. Reset clears project inputs. Supplementary AASHTO/TRB/FHWA references are identified for consultation; no unverified numerical standard or default is assigned.

### Engineering section illustration

The section uses chained platform/shoulder/lane dimensions, layer and cut/fill hatching, centreline datum, slope/height annotations, daylight points, an offset/finished-level register and a drawing title block. Editable base/subbase depths move the formation and update geometric earthwork areas. Blank layer depths remain TO BE ESTABLISHED and are omitted; areas are provisional until layer design is established. Entered layers are illustrated across the platform; actual shoulder construction, drains and berms need project details. The section is not to scale and is not a construction drawing.

### D.O.112, s.2024 road classification

Road Classification now follows Section I of the supplied D.O.112: National Primary/Secondary/Tertiary; Local Provincial/City/Municipal/Barangay; and Expressway under Other Roads. Unclassified and TO BE ESTABLISHED are verification states, not additional classified road categories. Tourism, Farm-to-Market and Parkway are separate design-family choices and never change the selected legal road class. Dynamic input guides include each class definition, relevant Attachment 1 terms, Secondary connectivity/island conditions, Attachment 2 bypass/diversion requirements, and the conversion/documentation process. A readable reference PDF contains the four-page order plus Attachments 1–2.

The order supersedes D.O.133, s.2018 and inconsistent issuances. Its 6.10 m carriageway/gravel/maintainable condition and acquired minimum 20 m RROW requirements concern conversion evaluation; they do not replace DGCS geometric design values. Official evaluation, certifications, local-board concurrence and environmental/ROW conditions remain necessary. Incomplete documentation leaves the SRC in its current local/unclassified status. The worksheet does not decide or approve road conversion.

### Reference-style illustration and optional structures

The illustration adapts the supplied Figure 1.1 terminology with a numbered 1–21 key, layer callouts, magnified rigid/flexible pavement detail and daylight-to-daylight footprint. Unknown layers/drainage remain TBE rather than being assigned invented dimensions.

The lane-count dropdown supports 2/3/4/6/8 lanes. Lane width can be adopted explicitly; otherwise it is half the selected two-lane baseline. Road span is lane count × lane width plus entered median width. Median layouts require an even number of lanes in this symmetric model. Turning a median off removes its width; blank median width is shown as an unscaled placeholder and omitted from geometry. Drainage and roadside barrier toggles show schematic symbols only and do not change earthworks. The median is a reserved flush strip; raised/structural profile, hydraulics, barrier offsets/working widths, foundations, lane-direction allocation and capacity require project design. Areas with unresolved median/layer details remain provisional.

### Dimensioned median and guardrail details

Median width and displayed height above pavement, guardrail top-of-rail height, and lane-edge-to-traffic-face setback are editable with no prescribed defaults. Enlarged details show the entered dimensions; zero median height indicates a flush strip. Guardrail setback beyond the shoulder is rejected until an engineered verge/support section is established. Main-view barrier symbols move with the entered setback and height. Beam/post profile is indicative; use the approved tested system for working width, embedment, terminals and foundations. Raised-median construction and barrier foundations are excluded from earthwork calculations. Turning features off preserves their entries but disables dimension inputs; Reset clears them.

### Geometry · Swept Path Analysis and Curve Widening

Two separate public tools are available. Swept Path Analysis provides DGCS vehicle presets, editable rigid/tractor-semitrailer dimensions, a plan silhouette and sampled body positions on a steady circular turn. Its geometric clearance result remains separate from prescribed road widening. A radial section compares the whole-pass body envelope and entered clearance against the lane centred on the front-axle path, identifying inside/outside overrun. Body bands and vertical dimensions are schematic; Design Criteria section inputs are not imported. Road-curve and intersection layouts share an editable front-axle path radius and direction-change angle; intersection mode adds tangent approach/departure axes, without transient steering simulation. The WB-19 preset uses simplified coaxial kingpin and tractor-body assumptions; no transition steering or dynamic simulation is claimed.

Curve Widening replicates the supplied `Curve-Widening_Updated.xlsx` Metric worksheet: 19 design vehicles, signed segment-square sums, the exact width/clearance lookup, speed/friction lookup, minimum-radius exclusion and Excel rounding. All 480 cached Metric grid cells are verified independently. Maximum superelevation defaults to the workbook's 8%; it changes the excluded-cell cutoff. Width remains the workbook's two-lane reference for multi-lane calculations. Unsupported widths require a clearance override.

The report includes an indicative vehicle silhouette above the radius/speed table. Editable table copy, image copy, PNG, CSV and print/PDF are available; clipboard restrictions can be handled with downloads. Exports identify widening units, clearance and maximum superelevation. Workbook results are separate from DGCS tabulated widening and are not automatically applied to Design Criteria.
