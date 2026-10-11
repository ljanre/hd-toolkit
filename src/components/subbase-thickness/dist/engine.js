/* RN29 Figure 6 deterministic calculation engine — application v1.1.0 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RN29Engine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EXPECTED_MODEL_ID = "RN29_1970_FIG6";
  const EXPECTED_MODEL_VERSION = "1.0.0";
  const EXPECTED_PRODUCTION_SHA256 = "42c9766042c3846571b33890a5f0d6da33e6dae8746626dfe22cf39c3f82b73b";
  const TRAFFIC_UNIT = "million_standard_axles";
  const CBR_UNIT = "percent";
  const EPS = 1e-12;

  function blankResult() {
    return {
      status: null,
      displayStatus: "",
      resultState: "NOT_CALCULABLE",
      uniquenessStatus: "NOT_EVALUATED",
      trafficMsa: null,
      cbrPercent: null,
      correctedThicknessMm: null,
      rawCurveMm: null,
      adjustedRawMm: null,
      minimumRuleMm: null,
      governingUnroundedMm: null,
      literalUpwardMm: null,
      branch: null,
      contextStatus: "CONDITIONAL",
      trace: {
        branchId: null,
        domainRuleIds: [],
        operationIds: [],
        log10Traffic: null,
        lowerCbrCurve: null,
        upperCbrCurve: null,
        cbrInterpolationWeight: null,
        segmentIds: [],
        interpolationMethod: null,
        reportingRuleId: null,
        rawPoint: null,
        lowerPoint: null,
        upperPoint: null,
        governingPoint: null,
      },
      uncertainty: {
        rawGraphicalMm: 5,
        reportingIncrementMm: 10,
        regressionToleranceMm: 1e-6,
        basis: "Conservative graphical band; not a statistical confidence interval.",
      },
      notes: [],
      errors: [],
    };
  }

  function displayStatus(status) {
    return {
      OK: "OK",
      INPUT_REQUIRED: "INPUT REQUIRED",
      INVALID_INPUT: "INVALID INPUT",
      UNIT_MISMATCH: "UNIT MISMATCH",
      OUTSIDE_NOMOGRAPH_RANGE: "OUTSIDE NOMOGRAPH RANGE",
      NO_UNIQUE_RESULT: "NO UNIQUE RESULT",
      MODEL_ERROR: "MODEL ERROR",
    }[status] || String(status || "").replaceAll("_", " ");
  }

  function finishFailure(result, status, code, message, field, branch) {
    result.status = status;
    result.displayStatus = displayStatus(status);
    result.branch = branch || null;
    result.trace.branchId = result.branch;
    result.trace.operationIds = ["OP_VALIDATE"];
    result.errors.push({ code, message, field: field || null });
    return result;
  }

  function scalar(model, parameterId) {
    const row = model.parameters.find((item) => item.Parameter_ID === parameterId);
    if (!row || typeof row.Value_Num !== "number") throw new Error(`Missing model parameter ${parameterId}`);
    return row.Value_Num;
  }

  function curveSegments(model, cbr) {
    return model.parameters
      .filter((item) => item.Parameter_Group === "PCHIP_COEFFICIENT" && item.Curve_CBR === cbr)
      .sort((a, b) => a.X_Lower_Log10_MSA - b.X_Lower_Log10_MSA);
  }

  function curveDomain(model, cbr) {
    const segments = curveSegments(model, cbr);
    if (!segments.length) throw new Error(`No coefficient segments for CBR ${cbr}`);
    return {
      minTraffic: 10 ** segments[0].X_Lower_Log10_MSA,
      maxTraffic: 10 ** segments[segments.length - 1].X_Upper_Log10_MSA,
    };
  }

  function selectSegment(model, cbr, logTraffic) {
    const candidates = curveSegments(model, cbr).filter(
      (row) => logTraffic >= row.X_Lower_Log10_MSA - EPS && logTraffic <= row.X_Upper_Log10_MSA + EPS,
    );
    if (!candidates.length) return null;
    return candidates[candidates.length - 1];
  }

  function evaluateCurve(model, cbr, trafficMsa) {
    const logTraffic = Math.log10(trafficMsa);
    const segment = selectSegment(model, cbr, logTraffic);
    if (!segment) throw new RangeError(`No coefficient segment brackets traffic for CBR ${cbr}`);
    const dx = logTraffic - segment.X_Lower_Log10_MSA;
    const value =
      segment.Coeff_Cubic * dx ** 3 +
      segment.Coeff_Quadratic * dx ** 2 +
      segment.Coeff_Linear * dx +
      segment.Coeff_Constant;
    if (!Number.isFinite(value)) throw new RangeError("Curve evaluation returned a nonfinite value");
    return { value, segmentId: segment.Parameter_ID, logTraffic };
  }

  function roundLiteralUp(valueMm) {
    if (valueMm <= 0) return 0;
    return 10 * Math.ceil((valueMm - 1e-12) / 10);
  }

  function roundGraphicalUp(valueMm, uncertaintyMm) {
    if (valueMm <= 0) return 0;
    return Math.max(0, 10 * Math.ceil((valueMm - uncertaintyMm) / 10));
  }

  function validateModel(model) {
    const errors = [];
    if (!model || typeof model !== "object") errors.push("model payload is missing");
    if (model?.nomographId !== EXPECTED_MODEL_ID) errors.push("nomograph ID mismatch");
    if (model?.modelVersion !== EXPECTED_MODEL_VERSION) errors.push("model version mismatch");
    if (model?.productionDataSha256 !== EXPECTED_PRODUCTION_SHA256) errors.push("production data digest mismatch");
    if (!Array.isArray(model?.parameters) || model.parameters.length !== 129) errors.push("parameter inventory mismatch");
    if (!Array.isArray(model?.referenceLookup) || model.referenceLookup.length !== 294) errors.push("reference lookup inventory mismatch");
    if (!Array.isArray(model?.goldenTests) || model.goldenTests.length !== 55) errors.push("Golden Test inventory mismatch");
    for (let cbr = 2; cbr <= 7; cbr += 1) {
      const expectedCount = cbr === 2 ? 19 : 20;
      if (model && curveSegments(model, cbr).length !== expectedCount) errors.push(`CBR ${cbr} coefficient count mismatch`);
    }
    return { ok: errors.length === 0, errors };
  }

  function calculate(model, trafficInput, cbrInput, options) {
    const result = blankResult();
    const settings = {
      trafficUnit: TRAFFIC_UNIT,
      cbrUnit: CBR_UNIT,
      fullRoadNoteCompliance: false,
      frostSusceptible: null,
      ...(options || {}),
    };
    const modelCheck = validateModel(model);
    if (!modelCheck.ok) {
      return finishFailure(result, "MODEL_ERROR", "MODEL_INTEGRITY", modelCheck.errors.join("; "), null, null);
    }

    if (trafficInput === null || trafficInput === undefined || trafficInput === "") {
      return finishFailure(result, "INPUT_REQUIRED", "INPUT_REQUIRED", "Enter cumulative traffic in million standard axles.", "traffic_msa", null);
    }
    if (cbrInput === null || cbrInput === undefined || cbrInput === "") {
      return finishFailure(result, "INPUT_REQUIRED", "INPUT_REQUIRED", "Enter the subgrade design CBR in percent.", "subgrade_cbr", null);
    }
    if (settings.trafficUnit !== TRAFFIC_UNIT || settings.cbrUnit !== CBR_UNIT) {
      return finishFailure(result, "UNIT_MISMATCH", "UNIT_MISMATCH", "Use million standard axles and percent.", null, null);
    }

    const traffic = Number(trafficInput);
    const cbr = Number(cbrInput);
    result.trafficMsa = traffic;
    result.cbrPercent = cbr;
    if (!Number.isFinite(traffic) || !Number.isFinite(cbr)) {
      return finishFailure(result, "INVALID_INPUT", "INVALID_INPUT", "Inputs must be finite numerical values.", null, null);
    }
    if (traffic < 0.01 || traffic > 100 || cbr < 0) {
      result.trace.domainRuleIds = ["DR_TRAFFIC_RANGE", "DR_CBR_NONNEGATIVE"];
      return finishFailure(
        result,
        "OUTSIDE_NOMOGRAPH_RANGE",
        "OUTSIDE_NOMOGRAPH_RANGE",
        "The input is outside the supported Figure 6 domain.",
        traffic < 0.01 || traffic > 100 ? "traffic_msa" : "subgrade_cbr",
        null,
      );
    }
    if (settings.fullRoadNoteCompliance && settings.frostSusceptible === null) {
      result.trace.domainRuleIds = ["DR_FROST_CONTEXT"];
      return finishFailure(
        result,
        "INPUT_REQUIRED",
        "FROST_CONTEXT_REQUIRED",
        "Frost susceptibility and total construction depth are required for full Road Note compliance.",
        "frost_susceptible",
        null,
      );
    }

    const logTraffic = Math.log10(traffic);
    const threshold = traffic < 0.5 ? 20 : 30;
    result.trace.log10Traffic = logTraffic;
    result.trace.operationIds = ["OP_VALIDATE", "OP_TRANSFORM_TRAFFIC", "OP_SELECT_BRANCH"];
    result.trace.domainRuleIds = ["DR_TRAFFIC_RANGE", "DR_CBR_NONNEGATIVE"];

    if (cbr >= threshold) {
      const branch = "NO_STRUCTURAL_SUBBASE_AT_OR_ABOVE_THRESHOLD";
      result.status = "OK";
      result.displayStatus = "OK";
      result.resultState = "CALCULATED";
      result.uniquenessStatus = "UNIQUE";
      result.rawCurveMm = 0;
      result.adjustedRawMm = 0;
      result.minimumRuleMm = 0;
      result.governingUnroundedMm = 0;
      result.correctedThicknessMm = 0;
      result.literalUpwardMm = 0;
      result.branch = branch;
      result.trace.branchId = branch;
      result.trace.domainRuleIds.push(traffic < 0.5 ? "DR_THRESHOLD_LOW" : "DR_THRESHOLD_HIGH");
      result.trace.operationIds.push("OP_CONTEXT");
      result.trace.reportingRuleId = "PARAM_REPORT_INCREMENT_MM";
      result.notes.push("Separate frost and construction-condition checks remain applicable.");
      return result;
    }

    if (cbr > 7) {
      result.trace.domainRuleIds.push("DR_UNSUPPORTED_GAP");
      return finishFailure(
        result,
        "OUTSIDE_NOMOGRAPH_RANGE",
        "UNSUPPORTED_CBR_GAP",
        "Figure 6 provides no plotted curve or authorized interpolation for this CBR and traffic combination.",
        "subgrade_cbr",
        "UNSUPPORTED_CBR_GAP",
      );
    }

    let raw;
    let adjusted;
    let branch;
    let lower;
    let upper;
    let weight;
    let lowerEval;
    let upperEval;

    if (cbr < 2) {
      const domain = curveDomain(model, 2);
      if (traffic > domain.maxTraffic + EPS) {
        result.trace.domainRuleIds.push("DR_BELOW_CBR2", "DR_CBR2_COUPLED");
        return finishFailure(
          result,
          "OUTSIDE_NOMOGRAPH_RANGE",
          "CBR2_CURVE_CLIPPED",
          "The CBR 2% curve leaves the chart before this traffic value.",
          "traffic_msa",
          "CBR2_CURVE_CLIPPED",
        );
      }
      lower = 2;
      upper = 2;
      weight = 0;
      lowerEval = evaluateCurve(model, 2, traffic);
      upperEval = lowerEval;
      raw = lowerEval.value;
      adjusted = raw + 150;
      branch = "BELOW_CBR2_ADD_150";
      result.trace.domainRuleIds.push("DR_BELOW_CBR2", "DR_CBR2_COUPLED");
      result.trace.operationIds.push("OP_EVAL_CURVES", "OP_BELOW2");
      result.trace.interpolationMethod = "PCHIP_LOG10_TRAFFIC_PLUS_150_MM";
    } else {
      lower = Math.floor(cbr);
      upper = Math.ceil(cbr);
      const maxTraffic = Math.min(curveDomain(model, lower).maxTraffic, curveDomain(model, upper).maxTraffic);
      if (traffic > maxTraffic + EPS) {
        result.trace.domainRuleIds.push("DR_CBR_CURVE_DOMAIN", "DR_CBR2_COUPLED");
        return finishFailure(
          result,
          "OUTSIDE_NOMOGRAPH_RANGE",
          "COUPLED_CURVE_DOMAIN",
          "The selected curve or bracketing curve leaves the chart before this traffic value.",
          "traffic_msa",
          "COUPLED_CURVE_DOMAIN",
        );
      }
      lowerEval = evaluateCurve(model, lower, traffic);
      upperEval = upper === lower ? lowerEval : evaluateCurve(model, upper, traffic);
      weight = cbr - lower;
      raw = lowerEval.value + weight * (upperEval.value - lowerEval.value);
      adjusted = raw;
      branch = Number.isInteger(cbr) ? "EXACT_CURVE" : "BETWEEN_CURVES";
      result.trace.domainRuleIds.push("DR_CBR_CURVE_DOMAIN");
      if (lower === 2 || upper === 2) result.trace.domainRuleIds.push("DR_CBR2_COUPLED");
      result.trace.operationIds.push("OP_EVAL_CURVES");
      if (upper !== lower) result.trace.operationIds.push("OP_INTERP_CBR");
      result.trace.interpolationMethod = upper === lower ? "PCHIP_LOG10_TRAFFIC" : "PCHIP_LOG10_TRAFFIC_THEN_LINEAR_CBR";
    }

    const minimum = traffic < 0.5 ? 80 : 150;
    const governing = Math.max(adjusted, minimum);
    const graphicalSnap = scalar(model, "PARAM_GRAPHICAL_SNAP_MM");
    result.status = "OK";
    result.displayStatus = "OK";
    result.resultState = "CALCULATED";
    result.uniquenessStatus = "UNIQUE";
    result.rawCurveMm = raw;
    result.adjustedRawMm = adjusted;
    result.minimumRuleMm = minimum;
    result.governingUnroundedMm = governing;
    result.correctedThicknessMm = roundGraphicalUp(governing, graphicalSnap);
    result.literalUpwardMm = roundLiteralUp(governing);
    result.branch = branch;
    result.trace.branchId = branch;
    result.trace.lowerCbrCurve = lower;
    result.trace.upperCbrCurve = upper;
    result.trace.cbrInterpolationWeight = weight;
    result.trace.segmentIds = [...new Set([lowerEval.segmentId, upperEval.segmentId])];
    result.trace.rawPoint = engineeringToPlot(traffic, raw, model);
    result.trace.lowerPoint = engineeringToPlot(traffic, lowerEval.value, model);
    result.trace.upperPoint = engineeringToPlot(traffic, upperEval.value, model);
    result.trace.governingPoint = engineeringToPlot(traffic, Math.min(governing, 600), model);
    result.trace.operationIds.push("OP_APPLY_MINIMUM", "OP_REPORT", "OP_CONTEXT");
    result.trace.domainRuleIds.push(traffic < 0.5 ? "DR_MINIMUM_80" : "DR_MINIMUM_150");
    if (upper === 7 && traffic >= 0.49 && traffic <= 4.7) result.trace.domainRuleIds.push("DR_CBR7_OBSCURED");
    result.trace.reportingRuleId = "PARAM_GRAPHICAL_SNAP_MM+PARAM_REPORT_INCREMENT_MM";
    result.notes.push("Separate frost and construction-condition checks remain applicable.");
    return result;
  }

  function engineeringToPlot(trafficMsa, thicknessMm, model) {
    const plotOriginX = model?.displayAsset?.plotOriginX ?? 0;
    const plotOriginY = model?.displayAsset?.plotOriginY ?? 0;
    const plotWidth = model?.displayAsset?.plotWidth ?? 1850;
    const plotHeight = model?.displayAsset?.plotHeight ?? 1108;
    const x = plotOriginX + ((Math.log10(trafficMsa) + 2) / 4) * plotWidth;
    const y = plotOriginY + (1 - thicknessMm / 600) * plotHeight;
    return { x, y };
  }

  function compareNumber(expected, actual, tolerance) {
    if (expected === null || expected === undefined) return actual === null || actual === undefined;
    return typeof actual === "number" && Number.isFinite(actual) && Math.abs(expected - actual) <= tolerance;
  }

  function runGoldenTests(model) {
    const results = model.goldenTests.map((test) => {
      const actual = calculate(model, test.Input_Traffic, test.Input_CBR, {
        trafficUnit: test.Traffic_Unit,
        cbrUnit: test.CBR_Unit,
        fullRoadNoteCompliance: Boolean(test.Full_Compliance),
        frostSusceptible: test.Frost_Susceptible,
      });
      const tolerance = Number(test.Regression_Tolerance_mm ?? 1e-6);
      const checks = {
        status: actual.status === test.Expected_Status,
        branch: (actual.branch ?? null) === (test.Expected_Branch ?? null),
        raw: compareNumber(test.Expected_Raw_mm, actual.rawCurveMm, tolerance),
        adjusted: compareNumber(test.Expected_Adjusted_Raw_mm, actual.adjustedRawMm, tolerance),
        minimum: compareNumber(test.Expected_Minimum_mm, actual.minimumRuleMm, tolerance),
        governing: compareNumber(test.Expected_Governing_mm, actual.governingUnroundedMm, tolerance),
        output: compareNumber(test.Expected_Output_mm, actual.correctedThicknessMm, tolerance),
        literal: compareNumber(test.Expected_Literal_Upward_mm, actual.literalUpwardMm, tolerance),
      };
      return {
        testId: test.Test_ID,
        category: test.Category,
        description: test.Description,
        passed: Object.values(checks).every(Boolean),
        checks,
        expectedStatus: test.Expected_Status,
        actualStatus: actual.status,
        expectedOutputMm: test.Expected_Output_mm,
        actualOutputMm: actual.correctedThicknessMm,
      };
    });
    return {
      total: results.length,
      passed: results.filter((item) => item.passed).length,
      failed: results.filter((item) => !item.passed).length,
      results,
    };
  }

  function runReferenceLookup(model) {
    const results = model.referenceLookup.map((row) => {
      const actual = calculate(model, row.Traffic_MSA, row.CBR_Percent);
      const tolerance = 1e-6;
      const checks = {
        status: actual.status === row.Status,
        branch: (actual.branch ?? null) === (row.Branch ?? null),
        raw: compareNumber(row.Raw_Thickness_mm, actual.rawCurveMm, tolerance),
        adjusted: compareNumber(row.Below_CBR2_Addition_mm === null ? row.Raw_Thickness_mm : row.Raw_Thickness_mm + row.Below_CBR2_Addition_mm, actual.adjustedRawMm, tolerance),
        minimum: compareNumber(row.Minimum_Rule_mm, actual.minimumRuleMm, tolerance),
        governing: compareNumber(row.Governing_Unrounded_mm, actual.governingUnroundedMm, tolerance),
        output: compareNumber(row.Reported_Thickness_mm, actual.correctedThicknessMm, tolerance),
        literal: compareNumber(row.Literal_Upward_mm, actual.literalUpwardMm, tolerance),
      };
      return {
        lookupId: row.Lookup_ID,
        passed: Object.values(checks).every(Boolean),
        checks,
      };
    });
    return {
      total: results.length,
      passed: results.filter((item) => item.passed).length,
      failed: results.filter((item) => !item.passed).length,
      results,
    };
  }

  function formatEngineeringResult(result) {
    if (result.status !== "OK") return { status: result.displayStatus, value: null, unit: "mm" };
    return { status: "OK", value: result.correctedThicknessMm, unit: "mm" };
  }

  return Object.freeze({
    calculate,
    curveDomain,
    displayStatus,
    engineeringToPlot,
    evaluateCurve,
    formatEngineeringResult,
    runGoldenTests,
    runReferenceLookup,
    validateModel,
    constants: Object.freeze({
      EXPECTED_MODEL_ID,
      EXPECTED_MODEL_VERSION,
      EXPECTED_PRODUCTION_SHA256,
      TRAFFIC_UNIT,
      CBR_UNIT,
    }),
  });
});
