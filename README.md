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

The test command runs 16 regression suites. The build creates a clean production site in root `dist/`, excluding development notes, tests and QA pages. It compacts model tables without changing their values, uses pixel-identical WebP foundation charts, and versions local assets and calculator documents automatically. Deploy the contents of that folder with a static hosting service. The nested `src/components/subbase-thickness/dist/` folder is required source for the supplied subbase module; retain it in the repository.

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

