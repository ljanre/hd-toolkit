# Culvert Hydraulics integration

The toolkit sidebar route is `#culvertTool`. `component.js` loads the culvert document on first activation and retains it on subsequent tool switches. The parent toolkit provides navigation; the embedded page keeps its input/results, nomograph and method tabs.

The calculation engine and reference assets come from the separately reviewed `CULVERT TAB` module. The original folder is retained in the local workspace under `Local Archive/CULVERT TAB` and excluded from the GitHub upload. The integrated copy is maintained under `src/components/culvert-hydraulics` and included in `dist` by the normal toolkit build.

Run `node scripts/test.mjs` from the repository root for toolkit and hydraulic regression checks, then `node scripts/build.mjs` to refresh the distributable. The 16 hydraulic tests include manual worked examples and flow-regime boundaries. See the in-app Method & references tab for assumptions and the documented screening limitations.
