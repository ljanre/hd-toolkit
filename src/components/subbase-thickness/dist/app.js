(function () {
  "use strict";

  const model = globalThis.RN29_MODEL;
  const engine = globalThis.RN29Engine;
  const byId = (id) => document.getElementById(id);

  const form = byId("calculator-form");
  const trafficInput = byId("traffic-input");
  const cbrInput = byId("cbr-input");
  const clearButton = byId("clear-button");
  const modelHealth = byId("model-health");
  const qaSummary = byId("qa-summary");
  const resultCard = byId("result-card");
  const statusPill = byId("status-pill");
  const resultValue = byId("result-value");
  const resultMessage = byId("result-message");
  const trafficError = byId("traffic-error");
  const cbrError = byId("cbr-error");
  const activeNotice = byId("active-notice");
  const activeNoticeText = byId("active-notice-text");
  const toggleOverlayButton = byId("toggle-overlay");
  const constructionLines = byId("construction-lines");
  const overlayVertical = byId("overlay-vertical");
  const overlayHorizontal = byId("overlay-horizontal");
  const overlayMinimum = byId("overlay-minimum");
  const overlayBracket = byId("overlay-bracket");
  const overlayLowerPoint = byId("overlay-lower-point");
  const overlayUpperPoint = byId("overlay-upper-point");
  const overlayRawPoint = byId("overlay-raw-point");
  const overlayGoverningPoint = byId("overlay-governing-point");
  const overlayLabelGroup = byId("overlay-label-group");
  const overlayLabelBg = byId("overlay-label-bg");
  const overlayLabel = byId("overlay-label");

  const traceFields = {
    branch: byId("trace-branch"),
    curves: byId("trace-curves"),
    method: byId("trace-method"),
    raw: byId("trace-raw"),
    minimum: byId("trace-minimum"),
    rules: byId("trace-rules"),
  };

  let modelReady = false;
  let latestResult = null;
  let overlayVisible = true;

  const branchLabels = {
    EXACT_CURVE: "Exact printed CBR curve",
    BETWEEN_CURVES: "Between printed CBR curves",
    BELOW_CBR2_ADD_150: "Below CBR 2% · add 150 mm",
    NO_STRUCTURAL_SUBBASE_AT_OR_ABOVE_THRESHOLD: "No structural sub-base threshold",
    UNSUPPORTED_CBR_GAP: "Unsupported CBR gap",
    CBR2_CURVE_CLIPPED: "CBR 2% curve outside frame",
    COUPLED_CURVE_DOMAIN: "Coupled curve domain exceeded",
  };

  function numberText(value, digits) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—";
    const fixed = Number(value).toFixed(digits);
    return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
  }

  function setLine(element, x1, y1, x2, y2) {
    element.setAttribute("x1", String(x1));
    element.setAttribute("y1", String(y1));
    element.setAttribute("x2", String(x2));
    element.setAttribute("y2", String(y2));
  }

  function setHidden(element,hidden){element.toggleAttribute("hidden",Boolean(hidden));}

  function setPoint(element, point) {
    element.setAttribute("cx", String(point.x));
    element.setAttribute("cy", String(point.y));
  }

  function clearFieldErrors() {
    trafficError.textContent = "";
    cbrError.textContent = "";
    trafficInput.setAttribute("aria-invalid", "false");
    cbrInput.setAttribute("aria-invalid", "false");
  }

  function markError(field, message) {
    if (field === "traffic_msa") {
      trafficError.textContent = message;
      trafficInput.setAttribute("aria-invalid", "true");
    } else if (field === "subgrade_cbr") {
      cbrError.textContent = message;
      cbrInput.setAttribute("aria-invalid", "true");
    }
  }

  function resetTraceText() {
    Object.values(traceFields).forEach((element) => {
      element.textContent = "—";
    });
  }

  function hideOverlay() {
    setHidden(constructionLines,true);
    toggleOverlayButton.disabled = true;
    toggleOverlayButton.textContent = "Hide trace";
    overlayVisible = true;
  }

  function renderEmpty() {
    latestResult = null;
    clearFieldErrors();
    resultCard.className = "result-card is-empty";
    statusPill.className = "status-pill status-neutral";
    statusPill.textContent = "INPUT REQUIRED";
    resultValue.textContent = "—";
    resultMessage.textContent = "Enter both project inputs to calculate.";
    activeNotice.hidden = true;
    resetTraceText();
    hideOverlay();
  }

  function curveDescription(result) {
    if (result.branch === "NO_STRUCTURAL_SUBBASE_AT_OR_ABOVE_THRESHOLD") return "Threshold branch";
    if (result.branch === "BELOW_CBR2_ADD_150") return "CBR 2% curve, then add 150 mm";
    const lower = result.trace.lowerCbrCurve;
    const upper = result.trace.upperCbrCurve;
    if (lower === null || upper === null) return "—";
    if (lower === upper) return `CBR ${lower}% curve`;
    return `CBR ${lower}% to ${upper}% · ${numberText(result.trace.cbrInterpolationWeight * 100, 1)}% interval`;
  }

  function renderTrace(result) {
    traceFields.branch.textContent = branchLabels[result.branch] || result.branch || "—";
    traceFields.curves.textContent = curveDescription(result);
    traceFields.method.textContent = result.trace.interpolationMethod
      ? result.trace.interpolationMethod.replaceAll("_", " ").toLowerCase()
      : "—";

    if (result.rawCurveMm === null) {
      traceFields.raw.textContent = "—";
    } else if (result.adjustedRawMm !== result.rawCurveMm) {
      traceFields.raw.textContent = `${numberText(result.rawCurveMm, 3)} mm chart + 150 mm = ${numberText(result.adjustedRawMm, 3)} mm`;
    } else {
      traceFields.raw.textContent = `${numberText(result.rawCurveMm, 3)} mm`;
    }

    if (result.minimumRuleMm === null) {
      traceFields.minimum.textContent = "—";
    } else {
      const governs = result.minimumRuleMm >= result.adjustedRawMm - 1e-9 && result.minimumRuleMm > 0;
      traceFields.minimum.textContent = `${numberText(result.minimumRuleMm, 0)} mm${governs ? " · governs" : ""}`;
    }
    traceFields.rules.textContent = result.trace.domainRuleIds.length ? result.trace.domainRuleIds.join(" · ") : "—";
  }

  function renderNotice(result) {
    const messages = [];
    if (result.trace.domainRuleIds.includes("DR_CBR7_OBSCURED")) {
      messages.push("The printed 150 mm note obscures the raw CBR 7% curve in this region; the validated reconstruction is used and the printed minimum governs where applicable.");
    }
    if (result.branch === "BELOW_CBR2_ADD_150") {
      messages.push("For CBR below 2%, Road Note 29 adds 150 mm to the CBR 2% curve reading.");
    }
    if (result.minimumRuleMm > result.adjustedRawMm) {
      messages.push(`The printed ${numberText(result.minimumRuleMm, 0)} mm minimum controls the result.`);
    }
    activeNotice.hidden = messages.length === 0;
    activeNoticeText.textContent = messages.join(" ");
  }

  function positionLabel(x, y, labelText) {
    const displayWidth = model.displayAsset.widthPx;
    const displayHeight = model.displayAsset.heightPx;
    const labelWidth = Math.min(245, Math.max(118, labelText.length * 8.5));
    const labelHeight = 31;
    const centerX = Math.min(displayWidth - labelWidth / 2 - 7, Math.max(labelWidth / 2 + 7, x));
    const topY = Math.min(displayHeight - labelHeight - 7, Math.max(7, y - 45));
    overlayLabelBg.setAttribute("x", String(centerX - labelWidth / 2));
    overlayLabelBg.setAttribute("y", String(topY));
    overlayLabelBg.setAttribute("width", String(labelWidth));
    overlayLabelBg.setAttribute("height", String(labelHeight));
    overlayLabel.setAttribute("x", String(centerX));
    overlayLabel.setAttribute("y", String(topY + 21));
    overlayLabel.textContent = labelText;
  }

  function renderOverlay(result) {
    hideOverlay();
    if (result.status !== "OK") return;

    const traffic = result.trafficMsa;
    const chartLeft = model.displayAsset.plotOriginX;
    const chartBottom = model.displayAsset.plotBottom;
    let rawPoint = result.trace.rawPoint;

    if (result.branch === "NO_STRUCTURAL_SUBBASE_AT_OR_ABOVE_THRESHOLD") {
      rawPoint = engine.engineeringToPlot(traffic, 0, model);
      setLine(overlayVertical, rawPoint.x, chartBottom - 34, rawPoint.x, chartBottom);
      setLine(overlayHorizontal, chartLeft, chartBottom, rawPoint.x, chartBottom);
      setPoint(overlayRawPoint, rawPoint);
      setHidden(overlayMinimum,true);
      setHidden(overlayBracket,true);
      setHidden(overlayLowerPoint,true);
      setHidden(overlayUpperPoint,true);
      setHidden(overlayGoverningPoint,true);
      positionLabel(rawPoint.x, chartBottom - 8, "0 mm structural sub-base");
    } else if (rawPoint) {
      setLine(overlayVertical, rawPoint.x, chartBottom, rawPoint.x, rawPoint.y);
      setLine(overlayHorizontal, chartLeft, rawPoint.y, rawPoint.x, rawPoint.y);
      setPoint(overlayRawPoint, rawPoint);

      const hasBracket =
        result.trace.lowerPoint &&
        result.trace.upperPoint &&
        result.trace.lowerCbrCurve !== result.trace.upperCbrCurve;
      setHidden(overlayBracket,!hasBracket);
      setHidden(overlayLowerPoint,!hasBracket);
      setHidden(overlayUpperPoint,!hasBracket);
      if (hasBracket) {
        setLine(
          overlayBracket,
          result.trace.lowerPoint.x,
          result.trace.lowerPoint.y,
          result.trace.upperPoint.x,
          result.trace.upperPoint.y,
        );
        setPoint(overlayLowerPoint, result.trace.lowerPoint);
        setPoint(overlayUpperPoint, result.trace.upperPoint);
      }

      const outputInsideChart = result.correctedThicknessMm >= 0 && result.correctedThicknessMm <= 600;
      const outputPoint = outputInsideChart
        ? engine.engineeringToPlot(traffic, result.correctedThicknessMm, model)
        : null;
      const showOutputRule = outputPoint && Math.abs(result.correctedThicknessMm - result.rawCurveMm) > 0.5;
      setHidden(overlayMinimum,!showOutputRule);
      setHidden(overlayGoverningPoint,!showOutputRule);
      if (showOutputRule) {
        setLine(overlayMinimum, chartLeft, outputPoint.y, outputPoint.x, outputPoint.y);
        setPoint(overlayGoverningPoint, outputPoint);
        positionLabel(outputPoint.x, outputPoint.y, `${numberText(result.correctedThicknessMm, 0)} mm corrected`);
      } else if (outputInsideChart) {
        positionLabel(rawPoint.x, rawPoint.y, `${numberText(result.correctedThicknessMm, 0)} mm corrected`);
      } else {
        positionLabel(rawPoint.x, rawPoint.y, `${numberText(result.correctedThicknessMm, 0)} mm · +150 mm rule`);
      }
    } else {
      return;
    }

    const adopted=result.correctedThicknessMm>=0&&result.correctedThicknessMm<=600?engine.engineeringToPlot(traffic,result.correctedThicknessMm,model):rawPoint;
    byId('overlay-callouts').innerHTML=NomographLabels.callouts([
      {x:rawPoint.x,y:chartBottom,lines:['W18 = '+Number(traffic).toFixed(2)+' ×10⁶ ESAL'],dx:-90,dy:10},
      {x:rawPoint.x,y:rawPoint.y,lines:['CBR = '+numberText(result.cbrPercent,2)+'%','Chart = '+numberText(result.rawCurveMm??0,2)+' mm'],dx:16,dy:-65},
      {x:chartLeft,y:adopted.y,lines:['Adopted = '+numberText(result.correctedThicknessMm,0)+' mm'],dx:12,dy:-30}
    ],model.displayAsset.widthPx,model.displayAsset.heightPx,.7);
    setHidden(constructionLines,false);
    overlayVisible = true;
    toggleOverlayButton.disabled = false;
    toggleOverlayButton.textContent = "Hide trace";
  }

  function renderResult(result) {
    latestResult = result;
    clearFieldErrors();
    renderTrace(result);
    renderNotice(result);

    const isOk = result.status === "OK";
    resultCard.className = `result-card ${isOk ? (result.correctedThicknessMm === 0 ? "is-zero" : "is-ok") : "is-error"}`;
    statusPill.className = `status-pill ${isOk ? "status-ok" : "status-error"}`;
    statusPill.textContent = result.displayStatus;

    if (isOk) {
      resultValue.textContent = numberText(result.correctedThicknessMm, 0);
      resultMessage.textContent =
        result.correctedThicknessMm === 0
          ? "Figure 6 indicates no structural sub-base at this threshold. Separate frost and construction checks still apply."
          : "Corrected Figure 6 structural sub-base thickness.";
    } else {
      resultValue.textContent = "—";
      const error = result.errors[0];
      resultMessage.textContent = error?.message || result.displayStatus;
      if (!trafficInput.value.trim()) markError("traffic_msa", "Traffic is required.");
      if (!cbrInput.value.trim()) markError("subgrade_cbr", "CBR is required.");
      if (error?.field) markError(error.field, error.message);
    }

    renderOverlay(result);
  }

  function calculateFromForm() {
    const traffic = globalThis.RN29Traffic ? RN29Traffic.getMsa() : trafficInput.value.trim() || null;
    const cbr = cbrInput.value.trim() || null;
    const result = engine.calculate(model, traffic, cbr);
    renderResult(result);
    return result;
  }

  function calculateAndRender(trafficMsa, subgradeCbr) {
    if (globalThis.RN29Traffic) RN29Traffic.setMsa(trafficMsa);
    else trafficInput.value = String(trafficMsa);
    cbrInput.value = String(subgradeCbr);
    const result = engine.calculate(model, trafficMsa, subgradeCbr);
    renderResult(result);
    return result;
  }

  function registerWebMcpTool() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      const registration = context.registerTool(
        {
          name: "calculate_subbase_thickness",
          title: "Calculate sub-base thickness",
          description:
            "Calculate the corrected Road Note 29 Figure 6 structural sub-base thickness from cumulative traffic in million standard axles and subgrade design CBR in percent, and update the visible calculator.",
          inputSchema: {
            type: "object",
            properties: {
              traffic_msa: {
                type: "number",
                description: "Cumulative traffic in million standard axles; supported individual range 0.01 to 100.",
              },
              subgrade_cbr_percent: {
                type: "number",
                description: "Project-specific subgrade design CBR in percent.",
              },
            },
            required: ["traffic_msa", "subgrade_cbr_percent"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute(input) {
            const result = calculateAndRender(input?.traffic_msa, input?.subgrade_cbr_percent);
            return {
              status: result.status,
              display_status: result.displayStatus,
              corrected_thickness_mm: result.correctedThicknessMm,
              model_id: model.nomographId,
              model_version: model.modelVersion,
            };
          },
        },
        { signal: lifecycle.signal },
      );
      void Promise.resolve(registration).catch(() => lifecycle.abort());
    } catch (_error) {
      lifecycle.abort();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!modelReady) return;
    calculateFromForm();
  });

  clearButton.addEventListener("click", () => {
    form.reset();
    globalThis.RN29Traffic?.reset();
    renderEmpty();
    trafficInput.focus();
  });

  [trafficInput, cbrInput].forEach((input) => {
    input.addEventListener("input", () => {
      input.setAttribute("aria-invalid", "false");
      if (input === trafficInput) trafficError.textContent = "";
      if (input === cbrInput) cbrError.textContent = "";
    });
  });

  toggleOverlayButton.addEventListener("click", () => {
    if (!latestResult || latestResult.status !== "OK") return;
    overlayVisible = !overlayVisible;
    setHidden(constructionLines,!overlayVisible);
    toggleOverlayButton.textContent = overlayVisible ? "Hide trace" : "Show trace";
  });

  function initialize() {
    const modelCheck = engine?.validateModel(model);
    if (!modelCheck?.ok) {
      modelHealth.textContent = "Model error";
      modelHealth.className = "health-badge is-fail";
      qaSummary.textContent = "Model integrity check failed";      renderResult(
        engine.calculate(model, null, null),
      );
      return;
    }

    const regression = engine.runGoldenTests(model);
    modelReady = regression.failed === 0 && regression.total === 55;
    modelHealth.textContent = modelReady ? "Model verified" : "Verification failed";
    modelHealth.className = `health-badge ${modelReady ? "is-pass" : "is-fail"}`;
    qaSummary.textContent = `${regression.passed}/${regression.total} Golden Tests ${modelReady ? "passed" : "checked"}`;    renderEmpty();

    document.dispatchEvent(
      new CustomEvent("rn29-ready", {
        detail: { modelReady, goldenTests: regression },
      }),
    );
    registerWebMcpTool();
  }

  globalThis.RN29App = Object.freeze({
    calculate: (trafficMsa, subgradeCbr) => engine.calculate(model, trafficMsa, subgradeCbr),
    calculateAndRender,
    calculateFromForm,
    clear: renderEmpty,
    getLatestResult: () => latestResult,
    getModelIdentity: () => ({
      nomographId: model.nomographId,
      modelVersion: model.modelVersion,
      applicationVersion: model.applicationVersion,
    }),
  });

  initialize();
})();
