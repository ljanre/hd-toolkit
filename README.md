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

The test command runs 14 regression suites. The build copies the source and required assets into the root `dist/` folder. Deploy the contents of that folder with a static hosting service. The nested `src/components/subbase-thickness/dist/` folder is required source for the supplied subbase module; retain it in the repository.

## Upload to GitHub

1. Create an empty GitHub repository with a `main` branch.
2. Upload the contents of the prepared `GitHub-Upload` folder into the repository root. Upload `src/`, `scripts/`, `.github/`, `.gitignore`, `package.json`, and the Markdown documentation. Include the hidden `.github` folder; it contains the deployment workflow. Do not upload only the ZIP or an extra enclosing folder.
3. In repository **Settings → Pages**, select **GitHub Actions** as the source.
4. Commit to `main`, or manually run **Deploy HD Toolkit to GitHub Pages** in the Actions tab. The workflow checks the app, builds it, and deploys `dist/`.
5. The Pages URL appears after successful deployment. No domain purchase is required.

The upload folder is a snapshot. Later edits to the working project must be copied into the repository before deployment. There is no backend, subscription billing, or payment integration in this version.

## Tools and access

Public tabs: Rigid Pavement Design, Design CBR, Subbase Thickness Design, Rainfall Station Locator, PRS92 Converter, Design Traffic (TBD), and Flexible Pavement Design (TBD). Admin mode enables additional tools: Corrected Subgrade Reaction and Concrete Modulus of Rupture. Calculation-step panels in the pavement, CBR, and subbase design workspaces are Admin-only. Generate Report and Save buttons in those design input panels are disabled placeholders.

The current Admin switch is a client-side interface gate configured in `src/admin-mode.js`. It is not authentication: publicly hosted source and assets remain accessible. Browser-local values and uploaded illustrations stay in the user's browser; there is no shared account database. The rainfall locator uses external map, geocoding, and municipality services and requires internet access.

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
