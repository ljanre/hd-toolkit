#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const model = require("../dist/model-data.js");
const engine = require("../dist/engine.js");

const project = path.resolve(__dirname, "..");
const checks = [];

function record(id, passed, detail) {
  checks.push({ Check_ID: id, Disposition: passed ? "PASS" : "FAIL", Detail: detail });
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const modelCheck = engine.validateModel(model);
record("APP_MODEL_001", modelCheck.ok, modelCheck.ok ? "model identity and inventory verified" : modelCheck.errors.join("; "));

const golden = engine.runGoldenTests(model);
record("APP_GOLDEN_001", golden.total === 55 && golden.failed === 0, `${golden.passed}/${golden.total} Golden Tests passed`);

const lookup = engine.runReferenceLookup(model);
record("APP_LOOKUP_001", lookup.total === 294 && lookup.failed === 0, `${lookup.passed}/${lookup.total} reference lookup records reproduced`);

const published = engine.calculate(model, 5, 5);
record(
  "APP_EXAMPLE_001",
  published.status === "OK" && published.correctedThicknessMm === 240 && Math.abs(published.rawCurveMm - 240.80031442432107) <= 1e-12,
  `published example status=${published.status}; corrected=${published.correctedThicknessMm}; raw=${published.rawCurveMm}`,
);

const statusCases = [
  [null, 5, "INPUT_REQUIRED"],
  [1, null, "INPUT_REQUIRED"],
  ["abc", 5, "INVALID_INPUT"],
  [1, "LOW", "INVALID_INPUT"],
  ["NaN", 5, "INVALID_INPUT"],
  [0.009, 5, "OUTSIDE_NOMOGRAPH_RANGE"],
  [100.001, 5, "OUTSIDE_NOMOGRAPH_RANGE"],
  [1, -0.01, "OUTSIDE_NOMOGRAPH_RANGE"],
  [80, 2, "OUTSIDE_NOMOGRAPH_RANGE"],
  [0.1, 19.9, "OUTSIDE_NOMOGRAPH_RANGE"],
  [0.5, 20, "OUTSIDE_NOMOGRAPH_RANGE"],
  [0.1, 20, "OK"],
];
const statusFailures = statusCases.filter(([traffic, cbr, expected]) => engine.calculate(model, traffic, cbr).status !== expected);
record("APP_INPUT_001", statusFailures.length === 0, `${statusCases.length - statusFailures.length}/${statusCases.length} input/status cases passed`);

let state = 20261007;
let repeatabilityFailures = 0;
for (let index = 0; index < 500; index += 1) {
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
    first.rawCurveMm !== second.rawCurveMm ||
    first.correctedThicknessMm !== second.correctedThicknessMm
  ) repeatabilityFailures += 1;
}
record("APP_REPEAT_001", repeatabilityFailures === 0, `500 cases; failures=${repeatabilityFailures}; seed=20261007`);

let denseCount = 0;
let denseFailures = 0;
for (let cbr = 2; cbr <= 7; cbr += 1) {
  const domain = engine.curveDomain(model, cbr);
  let previous = -Infinity;
  for (let index = 0; index <= 1000; index += 1) {
    const logTraffic = Math.log10(domain.minTraffic) + (index / 1000) * (Math.log10(domain.maxTraffic) - Math.log10(domain.minTraffic));
    const value = engine.evaluateCurve(model, cbr, 10 ** logTraffic).value;
    denseCount += 1;
    if (!Number.isFinite(value) || value + 1e-9 < previous) denseFailures += 1;
    previous = value;
  }
}
record("APP_DENSE_001", denseFailures === 0 && denseCount === 6006, `${denseCount} curve evaluations; failures=${denseFailures}`);

const lowerLeft = engine.engineeringToPlot(0.01, 0, model);
const upperRight = engine.engineeringToPlot(100, 600, model);
const overlayPassed =
  Math.abs(lowerLeft.x - 59.5) <= 1e-9 &&
  Math.abs(lowerLeft.y - 462.5) <= 1e-9 &&
  Math.abs(upperRight.x - 789.5) <= 1e-9 &&
  Math.abs(upperRight.y - 25.25) <= 1e-9;
record("APP_OVERLAY_001", overlayPassed, `lower-left=${JSON.stringify(lowerLeft)}; upper-right=${JSON.stringify(upperRight)}`);

const displayPath = path.join(project, "dist", model.displayAsset.filename);
const displayDigest = fs.existsSync(displayPath) ? sha256(displayPath) : null;
record("APP_ASSET_001", displayDigest === model.displayAsset.sha256, `display digest=${displayDigest}`);

const files = [
  "dist/index.html",
  "dist/qa.html",
  "dist/styles.css",
  "dist/model-data.js",
  "dist/engine.js",
  "dist/app.js",
  "dist/qa.js",
  "dist/assets/rn29-figure6-display.png",
  "dist/assets/asset-manifest.json",
  "README.md",
  "CHANGELOG.md",
  "START_WINDOWS.bat",
  "start_macos_linux.sh",
];
const missing = files.filter((relative) => !fs.existsSync(path.join(project, relative)));
record("APP_FILES_001", missing.length === 0, `${files.length - missing.length}/${files.length} required application files present`);

const counts = {
  Executed: checks.length,
  Passed: checks.filter((item) => item.Disposition === "PASS").length,
  Failed: checks.filter((item) => item.Disposition === "FAIL").length,
};
const report = {
  Nomograph_ID: model.nomographId,
  Model_Version: model.modelVersion,
  Application_Version: model.applicationVersion,
  Engineering_Validation_Status: model.engineeringValidationStatus,
  App_Readiness_Status: model.appReadinessStatus,
  Verification_Type: "LOCAL_BROWSER_APPLICATION_ENGINE_AND_ASSET_REGRESSION",
  Counts: counts,
  Golden_Tests: { Total: golden.total, Passed: golden.passed, Failed: golden.failed },
  Reference_Lookup: { Total: lookup.total, Passed: lookup.passed, Failed: lookup.failed },
  Checks: checks,
};
fs.writeFileSync(path.join(project, "tests", "test-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (counts.Failed) process.exit(1);
