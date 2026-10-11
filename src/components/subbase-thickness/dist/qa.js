(function () {
  "use strict";

  const model = globalThis.RN29_MODEL;
  const engine = globalThis.RN29Engine;
  const byId = (id) => document.getElementById(id);

  function numeric(value) {
    return value === null || value === undefined ? "—" : String(value);
  }

  function nearlyEqual(a, b, tolerance) {
    return Math.abs(a - b) <= tolerance;
  }

  function supplementalChecks() {
    const checks = [];
    const modelCheck = engine.validateModel(model);
    checks.push({ name: "Model identity and inventory", passed: modelCheck.ok });

    const lookup = engine.runReferenceLookup(model);
    checks.push({ name: "294 reference lookup records", passed: lookup.failed === 0 && lookup.total === 294 });

    const lowerLeft = engine.engineeringToPlot(0.01, 0, model);
    const upperRight = engine.engineeringToPlot(100, 600, model);
    checks.push({
      name: "Overlay coordinate endpoints",
      passed:
        nearlyEqual(lowerLeft.x, model.displayAsset.plotOriginX, 1e-9) &&
        nearlyEqual(lowerLeft.y, model.displayAsset.plotBottom, 1e-9) &&
        nearlyEqual(upperRight.x, model.displayAsset.plotRight, 1e-9) &&
        nearlyEqual(upperRight.y, model.displayAsset.plotOriginY, 1e-9),
    });

    let state = 20261007;
    let repeatabilityPassed = true;
    for (let index = 0; index < 200; index += 1) {
      state = (1664525 * state + 1013904223) >>> 0;
      const fractionA = state / 4294967296;
      state = (1664525 * state + 1013904223) >>> 0;
      const fractionB = state / 4294967296;
      const traffic = 10 ** (-2 + 4 * fractionA);
      const cbr = 3 + 4 * fractionB;
      const first = engine.calculate(model, traffic, cbr);
      const second = engine.calculate(model, traffic, cbr);
      if (
        first.status !== second.status ||
        first.branch !== second.branch ||
        first.correctedThicknessMm !== second.correctedThicknessMm ||
        first.rawCurveMm !== second.rawCurveMm
      ) {
        repeatabilityPassed = false;
        break;
      }
    }
    checks.push({ name: "200-case repeatability", passed: repeatabilityPassed });

    const invalidCases = [
      [null, 5, "INPUT_REQUIRED"],
      [1, null, "INPUT_REQUIRED"],
      ["abc", 5, "INVALID_INPUT"],
      [0.009, 5, "OUTSIDE_NOMOGRAPH_RANGE"],
      [1, -0.1, "OUTSIDE_NOMOGRAPH_RANGE"],
      [80, 2, "OUTSIDE_NOMOGRAPH_RANGE"],
      [0.1, 19.9, "OUTSIDE_NOMOGRAPH_RANGE"],
    ];
    checks.push({
      name: "Input and coupled-domain statuses",
      passed: invalidCases.every(([traffic, cbr, status]) => engine.calculate(model, traffic, cbr).status === status),
    });
    return checks;
  }

  function render() {
    const started = performance.now();
    const report = engine.runGoldenTests(model);
    const supplemental = supplementalChecks();
    const supplementalPassed = supplemental.filter((item) => item.passed).length;
    const allPassed = report.failed === 0 && supplementalPassed === supplemental.length;

    byId("qa-score-value").textContent = `${report.passed}/${report.total}`;
    byId("qa-score-label").textContent = allPassed ? "Golden Tests passed" : "Verification failure";
    byId("qa-score-value").className = allPassed ? "qa-pass" : "qa-fail";
    byId("qa-model-id").textContent = model.nomographId;
    byId("qa-model-version").textContent = model.modelVersion;
    byId("qa-model-digest").textContent = model.productionDataSha256;
    byId("qa-source-digest").textContent = model.authoritativeSource.sha256;
    byId("qa-display-digest").textContent = model.displayAsset.sha256;
    byId("qa-supplemental").textContent = `${supplementalPassed}/${supplemental.length} PASS · ${supplemental
      .map((item) => item.name)
      .join(" · ")}`;

    const body = byId("qa-results-body");
    body.replaceChildren();
    report.results.forEach((item) => {
      const row = document.createElement("tr");
      row.className = item.passed ? "qa-row-pass" : "qa-row-fail";
      const values = [
        item.testId,
        item.category,
        item.description,
        item.expectedStatus,
        item.actualStatus,
        numeric(item.expectedOutputMm),
        numeric(item.actualOutputMm),
        item.passed ? "PASS" : "FAIL",
      ];
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) cell.scope = "row";
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });

    const elapsed = performance.now() - started;
    byId("qa-run-time").textContent = `Executed locally in ${elapsed.toFixed(1)} ms`;
    document.title = `${allPassed ? "PASS" : "FAIL"} · RN29 Figure 6 Verification`;
  }

  byId("rerun-tests").addEventListener("click", render);
  render();
})();
