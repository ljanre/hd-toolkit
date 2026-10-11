// Ported without changing the supplied Figure 3.3 calculation functions.
(() => {
const APP_CONFIG = Object.freeze({
  APP_ID: 'AASHTO93_FIG3_3_WEB_APP',
  APP_VERSION: 'v1.4.0',
  NOMOGRAPH_ID: 'AASHTO93_RIGID_KINF_FIG3_3',
  MODEL_VERSION: 'v0.4.0',
  DATASET_VERSION: '1.1.0',
  QA_STATUS: 'VALIDATED_WITH_LIMITATIONS',
  OUTPUT_UNIT: 'pci',
  UNCERTAINTY_PERCENT: 6,
  MODEL_SHEETS: Object.freeze([
    '01_METADATA',
    '02_VARIABLES',
    '03_SCALE_DEFINITIONS',
    '04_SCALE_POINTS',
    '05_OPERATIONS',
    '06_INTERPOLATION_RULES',
    '07_REFERENCE_LOOKUP',
    '08_VALIDATION_CASES',
    '09_GOLDEN_TESTS',
    '10_QA_QC_SUMMARY',
    '11_CALCULATOR_TEST',
    '12_DATA_DICTIONARY',
    '13_CHANGELOG'
  ]),
  RUNTIME_MODEL_SHEETS: Object.freeze([
    '01_METADATA',
    '02_VARIABLES',
    '03_SCALE_DEFINITIONS',
    '05_OPERATIONS',
    '06_INTERPOLATION_RULES'
  ]),
  APP_SHEET: '00_APP',
  QA_SHEET: '00_QA',
  LOG_SHEET: '00_LOG',
  INPUT_ORDER: Object.freeze(['DSB', 'ESB', 'MR']),
  INPUT_CELLS: Object.freeze({DSB: 'B8', ESB: 'B9', MR: 'B10'}),
  INPUT_STATUS_CELLS: Object.freeze({DSB: 'E8', ESB: 'E9', MR: 'E10'}),
  RESULT_CELLS: Object.freeze({
    result: 'B14',
    uncertainty: 'B15',
    rangeStatus: 'B16',
    qaStatus: 'B17',
    interpolation: 'B18',
    q: 'B19',
    fingerprint: 'B20',
    modelVersion: 'B21'
  }),
  MODEL_CACHE_KEY: 'AASHTO93_FIG3_3_MODEL_v0_4_0',
  FIGURE: Object.freeze({
    SOURCE_FILENAME: 'ChatGPT Image Sep 15, 2026, 06_24_53 AM.png',
    SOURCE_SHA256: '1c9750ddc68f95189fb2d26ac549e85e35dec919a1ed87beee36f7fe2c8f516f',
    SOURCE_WIDTH_PX: 1086,
    SOURCE_HEIGHT_PX: 1448,
    DISPLAY_FILENAME: 'AASHTO93_Figure3_3_clean_display_v1.3.0.png',
    DISPLAY_SHA256: 'ca15b4a3eba1e30fb76f2aa46e0b4ea870b18d7e092ecbc5d4a09e48c5bacb8d',
    DISPLAY_WIDTH_PX: 1086,
    DISPLAY_HEIGHT_PX: 1046,
    DISPLAY_CROP_SOURCE_PIXELS: Object.freeze({LEFT: 0, TOP: 249, RIGHT: 1086, BOTTOM: 1295}),
    SOURCE_X_GRID: Object.freeze([115, 145, 174, 204, 233, 262, 291, 321, 350, 380, 410, 439, 468, 498, 527, 557, 586, 615, 645, 675, 705, 734, 763, 791, 821, 850, 881, 910, 941, 971, 1000, 1030, 1060]),
    SOURCE_Y_GRID: Object.freeze([266, 297, 329, 361, 394, 426, 458, 490, 521, 553, 584, 615, 646, 677, 708, 738, 770, 801, 833, 866, 898, 929, 961, 992, 1024, 1056, 1088, 1120, 1152, 1184, 1215, 1247, 1278]),
    DISPLAY_X_GRID: Object.freeze([115, 145, 174, 204, 233, 262, 291, 321, 350, 380, 410, 439, 468, 498, 527, 557, 586, 615, 645, 675, 705, 734, 763, 791, 821, 850, 881, 910, 941, 971, 1000, 1030, 1060]),
    DISPLAY_Y_GRID: Object.freeze([17, 48, 80, 112, 145, 177, 209, 241, 272, 304, 335, 366, 397, 428, 459, 489, 521, 552, 584, 617, 649, 680, 712, 743, 775, 807, 839, 871, 903, 935, 966, 998, 1029])
  }),
  EPSILON: 1e-12
});

function calculateNomographWithModel_(inputs, model) {
  const validation = validateInputs_(inputs, model);
  const base = {
    result: null,
    unit: APP_CONFIG.OUTPUT_UNIT,
    range_status: validation.overallStatus,
    input_status: validation.statuses,
    interpolation_used: false,
    estimated_uncertainty: null,
    qa_status: model.qaStatus,
    nomograph_id: model.nomographId,
    model_version: model.modelVersion,
    app_version: APP_CONFIG.APP_VERSION,
    calculation_fingerprint: calculationFingerprint_(inputs, model),
    trace: null,
    graphical_overlay: null
  };

  if (!validation.calculable) {
    return base;
  }

  const dsb = inputs.DSB;
  const esb = inputs.ESB;
  const mr = inputs.MR;
  const s = (18 - dsb) / 12;
  const esbEval = evaluateCurveFamily_(esb, dsb, model.esbCurves);
  const mrEval = evaluateCurveFamily_(mr, dsb, model.mrCurves);
  const q = mrEval.value - esbEval.value;

  const trace = {
    S_DSB: s,
    DSB_CURVE_SEGMENT: dsb < 6 ? 'THIN_EDGE_4_TO_6' : (dsb > 18 ? 'THICK_EDGE_18_TO_20' : 'CORE_6_TO_18'),
    V_ESB: esbEval.value,
    V_MR: mrEval.value,
    Q_RECTIFIED: q,
    ESB_BRACKET: bracketTrace_(esbEval),
    MR_BRACKET: bracketTrace_(mrEval),
    K_BRACKET: null,
    RESULT_SOURCE: 'DIGITAL_NOMOGRAPH',
    GRAPHICAL_ENGINE: 'Q_EQUALS_V_MR_MINUS_V_ESB_THEN_PIECEWISE_LOG_K_INVERSE',
    EQUATION_ROLE: 'QA_REFERENCE_ONLY',
    EXTRAPOLATION_USED: false
  };

  base.interpolation_used = true;
  base.trace = trace;
  base.graphical_overlay = buildGraphicalOverlay_(inputs, trace, model);

  if (q < model.qMin - APP_CONFIG.EPSILON || q > model.qMax + APP_CONFIG.EPSILON) {
    base.range_status = 'OUTSIDE_NOMOGRAPH_RANGE';
    return base;
  }

  const outputEval = qToK_(q, model.kAnchors);
  trace.K_BRACKET = bracketTrace_(outputEval);
  base.result = outputEval.value;
  base.range_status = 'WITHIN_RANGE';
  base.estimated_uncertainty = {
    value: outputEval.value * model.uncertaintyPercent / 100,
    unit: APP_CONFIG.OUTPUT_UNIT,
    percent: model.uncertaintyPercent,
    basis: 'PRACTICAL_GRAPHICAL_ALLOWANCE',
    statistical_confidence_interval: false
  };
  return base;
}

/** Strict user-input validation. All statuses are retained; no silent correction occurs. */
function validateInputs_(inputs, model) {
  const statuses = {};
  let overall = 'WITHIN_RANGE';
  let calculable = true;
  APP_CONFIG.INPUT_ORDER.forEach(function(variableId) {
    const def = model.variables[variableId];
    const status = classifyInput_(inputs[variableId], def.minimum, def.maximum);
    statuses[variableId] = status;
    if (!isCalculableInputStatus_(status)) {
      if (calculable) overall = status;
      calculable = false;
    }
  });
  return {statuses: statuses, overallStatus: overall, calculable: calculable};
}

function classifyInput_(value, minimum, maximum) {
  if (value === null || value === undefined || value === '') return 'INPUT_REQUIRED';
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'NON_NUMERIC';
  if (value < minimum) return 'BELOW_RANGE';
  if (value > maximum) return 'ABOVE_RANGE';
  if (value === minimum || value === maximum) return 'AT_BOUNDARY';
  return 'VALID';
}

function isCalculableInputStatus_(status) {
  return status === 'VALID' || status === 'AT_BOUNDARY';
}

/** Evaluates bracketing printed curves and interpolates in log10 engineering-value space. */
function evaluateCurveFamily_(engineeringValue, dsb, curves) {
  const bracket = findEngineeringBracket_(engineeringValue, curves);
  const lowerV = evaluateCurveAtThickness_(bracket.lower, dsb);
  if (bracket.exact) {
    return {
      value: lowerV,
      lowerAnchor: bracket.lower.engineeringValue,
      upperAnchor: bracket.lower.engineeringValue,
      lowerScaleId: bracket.lower.scaleId,
      upperScaleId: bracket.lower.scaleId,
      fraction: 0,
      exact: true,
      lowerValue: lowerV,
      upperValue: lowerV
    };
  }
  const upperV = evaluateCurveAtThickness_(bracket.upper, dsb);
  const fraction = (
    Math.log10(engineeringValue) - Math.log10(bracket.lower.engineeringValue)
  ) / (
    Math.log10(bracket.upper.engineeringValue) - Math.log10(bracket.lower.engineeringValue)
  );
  return {
    value: lowerV + fraction * (upperV - lowerV),
    lowerAnchor: bracket.lower.engineeringValue,
    upperAnchor: bracket.upper.engineeringValue,
    lowerScaleId: bracket.lower.scaleId,
    upperScaleId: bracket.upper.scaleId,
    fraction: fraction,
    exact: false,
    lowerValue: lowerV,
    upperValue: upperV
  };
}

/** Evaluates the source-calibrated C1 piecewise curve without extrapolation. */
function evaluateCurveAtThickness_(curve, dsb) {
  if (dsb < 6) {
    const t = curve.thinEdge.sign * (dsb - curve.thinEdge.baseDsb);
    return (curve.thinEdge.b2 * t + curve.thinEdge.b1) * t + curve.thinEdge.b0;
  }
  if (dsb > 18) {
    const t = curve.thickEdge.sign * (dsb - curve.thickEdge.baseDsb);
    return (curve.thickEdge.b2 * t + curve.thickEdge.b1) * t + curve.thickEdge.b0;
  }
  return evaluateCubic_(curve, (18 - dsb) / 12);
}

function evaluateCubic_(curve, s) {
  return ((curve.a3 * s + curve.a2) * s + curve.a1) * s + curve.a0;
}

function findEngineeringBracket_(value, sortedItems) {
  for (let i = 0; i < sortedItems.length; i += 1) {
    if (Math.abs(value - sortedItems[i].engineeringValue) <= APP_CONFIG.EPSILON * Math.max(1, Math.abs(value))) {
      return {lower: sortedItems[i], upper: sortedItems[i], exact: true};
    }
    if (i < sortedItems.length - 1 && value > sortedItems[i].engineeringValue && value < sortedItems[i + 1].engineeringValue) {
      return {lower: sortedItems[i], upper: sortedItems[i + 1], exact: false};
    }
  }
  throw new Error('Model invariant violation: no printed-curve bracket found.');
}

/** Inverts the output family piecewise in q versus log10(k) space. */
function qToK_(q, anchors) {
  for (let i = 0; i < anchors.length; i += 1) {
    if (Math.abs(q - anchors[i].q) <= APP_CONFIG.EPSILON) {
      return {
        value: anchors[i].engineeringValue,
        lowerAnchor: anchors[i].engineeringValue,
        upperAnchor: anchors[i].engineeringValue,
        lowerScaleId: anchors[i].scaleId,
        upperScaleId: anchors[i].scaleId,
        fraction: 0,
        exact: true,
        lowerValue: anchors[i].q,
        upperValue: anchors[i].q
      };
    }
    if (i < anchors.length - 1 && q > anchors[i].q && q < anchors[i + 1].q) {
      const fraction = (q - anchors[i].q) / (anchors[i + 1].q - anchors[i].q);
      const logK = Math.log10(anchors[i].engineeringValue) + fraction * (
        Math.log10(anchors[i + 1].engineeringValue) - Math.log10(anchors[i].engineeringValue)
      );
      return {
        value: Math.pow(10, logK),
        lowerAnchor: anchors[i].engineeringValue,
        upperAnchor: anchors[i + 1].engineeringValue,
        lowerScaleId: anchors[i].scaleId,
        upperScaleId: anchors[i + 1].scaleId,
        fraction: fraction,
        exact: false,
        lowerValue: anchors[i].q,
        upperValue: anchors[i + 1].q
      };
    }
  }
  throw new Error('Model invariant violation: no output-line bracket found.');
}

function bracketTrace_(evaluation) {
  return {
    lower_anchor: evaluation.lowerAnchor,
    upper_anchor: evaluation.upperAnchor,
    lower_scale_id: evaluation.lowerScaleId,
    upper_scale_id: evaluation.upperScaleId,
    transformed_fraction: evaluation.fraction,
    exact_printed_anchor: evaluation.exact,
    lower_graphical_value: evaluation.lowerValue,
    upper_graphical_value: evaluation.upperValue
  };
}

/** Builds the auditable red-line construction in clean-display and source coordinates. */
function buildGraphicalOverlay_(inputs, trace, model) {
  const uDsb = (20 - inputs.DSB) / 32;
  const vEsb = trace.V_ESB;
  const vMr = trace.V_MR;
  const points = {
    ESB_POINT: graphicalPoint_('ESB_POINT', uDsb, vEsb),
    OUTPUT_POINT: graphicalPoint_('OUTPUT_POINT', vMr, vEsb),
    TURNING_POINT: graphicalPoint_('TURNING_POINT', vMr, vMr),
    MR_POINT: graphicalPoint_('MR_POINT', uDsb, vMr)
  };
  return {
    source_filename: APP_CONFIG.FIGURE.SOURCE_FILENAME,
    source_sha256: APP_CONFIG.FIGURE.SOURCE_SHA256,
    source_width_px: APP_CONFIG.FIGURE.SOURCE_WIDTH_PX,
    source_height_px: APP_CONFIG.FIGURE.SOURCE_HEIGHT_PX,
    display_filename: APP_CONFIG.FIGURE.DISPLAY_FILENAME,
    display_sha256: APP_CONFIG.FIGURE.DISPLAY_SHA256,
    image_width_px: APP_CONFIG.FIGURE.DISPLAY_WIDTH_PX,
    image_height_px: APP_CONFIG.FIGURE.DISPLAY_HEIGHT_PX,
    display_role: 'DISPLAY_CLEANED_DERIVATIVE_NOT_ENGINEERING_AUTHORITY',
    coordinate_origin: 'TOP_LEFT_OF_CLEAN_DISPLAY_RASTER',
    source_coordinate_origin: 'TOP_LEFT_OF_AUTHORITATIVE_SOURCE_RASTER',
    x_direction: 'LEFT_TO_RIGHT',
    y_direction: 'TOP_TO_BOTTOM',
    mapping_method: 'PIECEWISE_LINEAR_THROUGH_33_BY_33_RECTIFIED_GRID',
    construction: 'ESB_POINT_TO_OUTPUT_POINT_TO_TURNING_POINT_TO_MR_POINT_TO_ESB_POINT',
    path_point_ids: ['ESB_POINT', 'OUTPUT_POINT', 'TURNING_POINT', 'MR_POINT', 'ESB_POINT'],
    inputs: {DSB: inputs.DSB, ESB: inputs.ESB, MR: inputs.MR},
    q_rectified: trace.Q_RECTIFIED,
    output_envelope_status: trace.Q_RECTIFIED >= model.qMin - APP_CONFIG.EPSILON
      && trace.Q_RECTIFIED <= model.qMax + APP_CONFIG.EPSILON
      ? 'WITHIN_PRINTED_OUTPUT_ENVELOPE'
      : 'OUTSIDE_PRINTED_OUTPUT_ENVELOPE',
    points: points
  };
}

function graphicalPoint_(pointId, u, v) {
  const sourceX = rectifiedToPixel_(u, APP_CONFIG.FIGURE.SOURCE_X_GRID);
  const sourceY = rectifiedToPixel_(v, APP_CONFIG.FIGURE.SOURCE_Y_GRID);
  return {
    point_id: pointId,
    u_rectified: u,
    v_rectified: v,
    x_pixel: rectifiedToPixel_(u, APP_CONFIG.FIGURE.DISPLAY_X_GRID),
    y_pixel: rectifiedToPixel_(v, APP_CONFIG.FIGURE.DISPLAY_Y_GRID),
    x_source_pixel: sourceX,
    y_source_pixel: sourceY
  };
}

/** Inverts a 0..1 rectified coordinate through the observed 33-line raster grid. */
function rectifiedToPixel_(value, grid) {
  if (!Number.isFinite(value) || value < -APP_CONFIG.EPSILON || value > 1 + APP_CONFIG.EPSILON) {
    throw new Error('Model invariant violation: graphical coordinate is outside the rectified frame.');
  }
  const bounded = Math.max(0, Math.min(1, value));
  const scaled = bounded * (grid.length - 1);
  const lowerIndex = Math.floor(scaled);
  if (lowerIndex >= grid.length - 1) return grid[grid.length - 1];
  const fraction = scaled - lowerIndex;
  return grid[lowerIndex] + fraction * (grid[lowerIndex + 1] - grid[lowerIndex]);
}

/** Loads and validates the runtime model from authoritative workbook tables. */
function buildModelFromTables_(metadataRows, variableRows, scaleRows, operationRows, ruleRows) {
  const issues = [];
  const metadata = {};
  const metadataIds = {};
  metadataRows.forEach(function(row) {
    requireUniqueId_(metadataIds, row.METADATA_ID, 'METADATA_ID', issues);
    if (metadata[row.FIELD] !== undefined) issues.push('Duplicate metadata FIELD: ' + row.FIELD);
    metadata[row.FIELD] = row.VALUE;
    if (row.NOMOGRAPH_ID !== APP_CONFIG.NOMOGRAPH_ID || row.MODEL_VERSION !== APP_CONFIG.MODEL_VERSION) {
      issues.push('Metadata scope mismatch at ' + row.METADATA_ID + '.');
    }
  });

  requireEqual_(metadata.NOMOGRAPH_TITLE !== undefined, true, 'Missing NOMOGRAPH_TITLE metadata.', issues);
  requireEqual_(metadata.MODEL_STATUS, APP_CONFIG.QA_STATUS, 'Unexpected MODEL_STATUS.', issues);
  requireEqual_(metadata.DATASET_VERSION, APP_CONFIG.DATASET_VERSION, 'Unexpected DATASET_VERSION.', issues);
  requireEqual_(metadata.AUTHORITY_BASIS, 'SUPPLIED_CHART', 'The supplied chart is not marked authoritative.', issues);
  requireEqual_(metadata.EQUATION_ROLE, 'QA_REFERENCE_ONLY', 'Equation role must remain QA_REFERENCE_ONLY.', issues);
  requireEqual_(parseBoolean_(metadata.EQUATION_REPLACEMENT_ALLOWED), false, 'Equation replacement must be disabled.', issues);
  requireEqual_(parseBoolean_(metadata.EXTRAPOLATION_ALLOWED), false, 'Extrapolation must be disabled.', issues);

  const variables = {};
  const variableIds = {};
  variableRows.forEach(function(row) {
    requireUniqueId_(variableIds, row.VARIABLE_ID, 'VARIABLE_ID', issues);
    variables[row.VARIABLE_ID] = {
      variableId: row.VARIABLE_ID,
      name: row.VARIABLE_NAME,
      symbol: row.SYMBOL,
      unit: row.UNIT,
      role: row.ROLE,
      minimum: finiteNumber_(row.MINIMUM, 'Minimum for ' + row.VARIABLE_ID, issues),
      maximum: finiteNumber_(row.MAXIMUM, 'Maximum for ' + row.VARIABLE_ID, issues),
      required: parseBoolean_(row.REQUIRED_FLAG)
    };
  });

  ['DSB', 'ESB', 'MR', 'S_DSB', 'V_ESB', 'V_MR', 'Q_RECTIFIED', 'K_INF'].forEach(function(id) {
    if (!variables[id]) issues.push('Missing required variable ' + id + '.');
  });
  if (variables.DSB) requireRange_(variables.DSB, 4, 20, 'DSB', issues);
  if (variables.ESB) requireRange_(variables.ESB, 15000, 1000000, 'ESB', issues);
  if (variables.MR) requireRange_(variables.MR, 1000, 20000, 'MR', issues);
  if (variables.K_INF) requireRange_(variables.K_INF, 50, 2000, 'K_INF', issues);

  const scaleIds = {};
  const dsbScales = [];
  const esbCurves = [];
  const mrCurves = [];
  const kAnchors = [];
  const turningLines = [];
  scaleRows.forEach(function(row) {
    requireUniqueId_(scaleIds, row.SCALE_ID, 'SCALE_ID', issues);
    if (row.NOMOGRAPH_ID && row.NOMOGRAPH_ID !== APP_CONFIG.NOMOGRAPH_ID) issues.push('Scale scope mismatch at ' + row.SCALE_ID + '.');
    if (row.SCALE_ID === 'SCL_DSB') dsbScales.push(row);
    if (row.SCALE_GROUP_ID === 'SCL_ESB_FAMILY') esbCurves.push(curveFromRow_(row, issues));
    if (row.SCALE_GROUP_ID === 'SCL_MR_FAMILY') mrCurves.push(curveFromRow_(row, issues));
    if (row.SCALE_GROUP_ID === 'SCL_KINF_OUTPUT') kAnchors.push(kAnchorFromRow_(row, issues));
    if (row.SCALE_ID === 'SCL_TURNING_LINE') turningLines.push(row);
  });
  esbCurves.sort(function(a, b) { return a.engineeringValue - b.engineeringValue; });
  mrCurves.sort(function(a, b) { return a.engineeringValue - b.engineeringValue; });
  kAnchors.sort(function(a, b) { return a.engineeringValue - b.engineeringValue; });

  requireEqual_(dsbScales.length, 1, 'Expected exactly one DSB scale.', issues);
  requireEqual_(esbCurves.length, 9, 'Expected exactly nine ESB curves.', issues);
  requireEqual_(mrCurves.length, 9, 'Expected exactly nine MR curves.', issues);
  requireEqual_(kAnchors.length, 11, 'Expected exactly eleven k output anchors.', issues);
  requireEqual_(turningLines.length, 1, 'Expected exactly one turning line.', issues);
  requireAscending_(esbCurves, 'engineeringValue', 'ESB curve anchors', issues);
  requireAscending_(mrCurves, 'engineeringValue', 'MR curve anchors', issues);
  requireAscending_(kAnchors, 'engineeringValue', 'k engineering anchors', issues);
  requireAscending_(kAnchors, 'q', 'k q anchors', issues);

  const operationIds = {};
  operationRows.forEach(function(row) { requireUniqueId_(operationIds, row.OPERATION_ID, 'OPERATION_ID', issues); });
  const ruleIds = {};
  ruleRows.forEach(function(row) { requireUniqueId_(ruleIds, row.RULE_ID, 'RULE_ID', issues); });
  requireEqual_(operationRows.length, 10, 'Expected ten graphical operations.', issues);
  requireEqual_(ruleRows.length, 7, 'Expected seven interpolation rules.', issues);

  const requiredMethods = {
    RULE_DSB_CURVE: 'PIECEWISE_C1',
    RULE_ESB_FAMILY: 'LOG_LINEAR',
    RULE_MR_FAMILY: 'LOG_LINEAR',
    RULE_GEOMETRY: 'GEOMETRIC_INTERSECTION',
    RULE_K_OUTPUT: 'PIECEWISE_LOG_LINEAR'
  };
  ruleRows.forEach(function(row) {
    if (requiredMethods[row.RULE_ID] && row.METHOD !== requiredMethods[row.RULE_ID]) {
      issues.push('Unexpected interpolation method for ' + row.RULE_ID + '.');
    }
    if (parseBoolean_(row.EXTRAPOLATION_ALLOWED)) issues.push('Extrapolation enabled at ' + row.RULE_ID + '.');
  });

  const uncertainty = finiteNumber_(metadata.PRACTICAL_GRAPHICAL_UNCERTAINTY, 'PRACTICAL_GRAPHICAL_UNCERTAINTY', issues);
  requireEqual_(uncertainty, APP_CONFIG.UNCERTAINTY_PERCENT, 'Unexpected graphical uncertainty allowance.', issues);

  if (issues.length) throw new Error('MODEL_CONFIGURATION_ERROR\n' + issues.join('\n'));

  return {
    nomographId: APP_CONFIG.NOMOGRAPH_ID,
    modelVersion: APP_CONFIG.MODEL_VERSION,
    datasetVersion: APP_CONFIG.DATASET_VERSION,
    qaStatus: APP_CONFIG.QA_STATUS,
    uncertaintyPercent: uncertainty,
    variables: variables,
    esbCurves: esbCurves,
    mrCurves: mrCurves,
    kAnchors: kAnchors,
    qMin: kAnchors[0].q,
    qMax: kAnchors[kAnchors.length - 1].q,
    operationCount: operationRows.length,
    ruleCount: ruleRows.length,
    authorityBasis: metadata.AUTHORITY_BASIS,
    equationRole: metadata.EQUATION_ROLE,
    extrapolationAllowed: false
  };
}

function curveFromRow_(row, issues) {
  if (row.SCALE_TYPE !== 'CURVE') issues.push('Expected CURVE scale type at ' + row.SCALE_ID + '.');
  if (row.TRANSFORMATION !== 'PIECEWISE_C1_QUADRATIC_CUBIC_QUADRATIC') issues.push('Unexpected curve transformation at ' + row.SCALE_ID + '.');
  return {
    scaleId: row.SCALE_ID,
    engineeringValue: finiteNumber_(row.ENGINEERING_VALUE, 'Engineering value at ' + row.SCALE_ID, issues),
    a3: finiteNumber_(row.COEFF_A3, 'A3 at ' + row.SCALE_ID, issues),
    a2: finiteNumber_(row.COEFF_A2, 'A2 at ' + row.SCALE_ID, issues),
    a1: finiteNumber_(row.COEFF_A1, 'A1 at ' + row.SCALE_ID, issues),
    a0: finiteNumber_(row.COEFF_A0, 'A0 at ' + row.SCALE_ID, issues),
    thinEdge: {
      baseDsb: finiteNumber_(row.THIN_EDGE_BASE_DSB, 'thin edge base DSB at ' + row.SCALE_ID, issues),
      sign: finiteNumber_(row.THIN_EDGE_SIGN, 'thin edge sign at ' + row.SCALE_ID, issues),
      b0: finiteNumber_(row.THIN_EDGE_B0, 'thin edge B0 at ' + row.SCALE_ID, issues),
      b1: finiteNumber_(row.THIN_EDGE_B1, 'thin edge B1 at ' + row.SCALE_ID, issues),
      b2: finiteNumber_(row.THIN_EDGE_B2, 'thin edge B2 at ' + row.SCALE_ID, issues)
    },
    thickEdge: {
      baseDsb: finiteNumber_(row.THICK_EDGE_BASE_DSB, 'thick edge base DSB at ' + row.SCALE_ID, issues),
      sign: finiteNumber_(row.THICK_EDGE_SIGN, 'thick edge sign at ' + row.SCALE_ID, issues),
      b0: finiteNumber_(row.THICK_EDGE_B0, 'thick edge B0 at ' + row.SCALE_ID, issues),
      b1: finiteNumber_(row.THICK_EDGE_B1, 'thick edge B1 at ' + row.SCALE_ID, issues),
      b2: finiteNumber_(row.THICK_EDGE_B2, 'thick edge B2 at ' + row.SCALE_ID, issues)
    }
  };
}

function kAnchorFromRow_(row, issues) {
  if (row.SCALE_TYPE !== 'PIECEWISE_LOG10') issues.push('Expected PIECEWISE_LOG10 at ' + row.SCALE_ID + '.');
  return {
    scaleId: row.SCALE_ID,
    engineeringValue: finiteNumber_(row.ENGINEERING_VALUE, 'k anchor at ' + row.SCALE_ID, issues),
    q: finiteNumber_(row.Q_ANCHOR, 'q anchor at ' + row.SCALE_ID, issues)
  };
}

/** Audits the current workbook model and returns an evidence-oriented result. */
function formatEngineeringResult_(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '';
  const numeric = Number(value);
  if (numeric === 0) return '0';
  if (numeric >= 100) return String(Math.round(numeric));
  const digits = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(numeric))));
  return numeric.toFixed(digits).replace(/\.?0+$/, '');
}

function statusMessage_(output) {
  if (output.result !== null) return 'Result: ' + formatEngineeringResult_(output.result) + ' pci (' + output.range_status + ')';
  if (output.range_status === 'INPUT_REQUIRED') return 'INPUT REQUIRED';
  if (output.range_status === 'OUTSIDE_NOMOGRAPH_RANGE' || output.range_status === 'BELOW_RANGE' || output.range_status === 'ABOVE_RANGE') {
    return 'OUTSIDE NOMOGRAPH RANGE';
  }
  return output.range_status;
}

function calculationFingerprint_(inputs, model) {
  const canonical = [
    model.nomographId,
    model.modelVersion,
    'DSB=' + canonicalValue_(inputs.DSB),
    'ESB=' + canonicalValue_(inputs.ESB),
    'MR=' + canonicalValue_(inputs.MR)
  ].join('|');
  return 'FNV1A32-' + fnv1a32_(canonical);
}

function canonicalValue_(value) {
  if (value === null || value === undefined || value === '') return '<MISSING>';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '<NON_FINITE>';
  return '<' + typeof value + ':' + String(value) + '>';
}

function fnv1a32_(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ('00000000' + (hash >>> 0).toString(16).toUpperCase()).slice(-8);
}

function adaptUiNumber_(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : value;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return value;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : value;
}

function blankToNull_(value) {
  return value === '' || value === undefined ? null : value;
}

function parseBoolean_(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return Boolean(value);
}

function finiteNumber_(value, label, issues) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    issues.push(label + ' must be finite.');
    return NaN;
  }
  return numeric;
}

function requireRange_(variable, expectedMin, expectedMax, label, issues) {
  if (variable.minimum !== expectedMin || variable.maximum !== expectedMax) {
    issues.push(label + ' range mismatch.');
  }
}

function requireAscending_(items, key, label, issues) {
  for (let i = 1; i < items.length; i += 1) {
    if (!(items[i][key] > items[i - 1][key])) {
      issues.push(label + ' are not strictly increasing.');
      return;
    }
  }
}

function requireUniqueId_(seen, id, label, issues) {
  if (id === null || id === undefined || id === '') {
    issues.push('Missing ' + label + '.');
    return;
  }
  if (seen[id]) issues.push('Duplicate ' + label + ': ' + id);
  seen[id] = true;
}

function requireEqual_(actual, expected, message, issues) {
  if (actual !== expected) issues.push(message + ' Expected ' + expected + '; found ' + actual + '.');
}


const t = globalThis.SubgradeModelTables;
const model = buildModelFromTables_(t['01_METADATA'], t['02_VARIABLES'], t['03_SCALE_DEFINITIONS'], t['05_OPERATIONS'], t['06_INTERPOLATION_RULES']);
globalThis.SubgradeCalculation = Object.freeze({
  model,
  calculate: inputs => calculateNomographWithModel_(inputs, model)
});
})();
