/* Graphical reconstruction of the user-supplied Figure 3.6 raster.
 * Endpoints are measured in source-image pixels, not an AASHTO equation.
 * Intermediate LS values interpolate log10(corrected k) between printed lines.
 */
(() => {
  const frame = Object.freeze({ left: 190, right: 1120, top: 33, bottom: 905, xMax: 2000, yMax: 1000 });
  const lines = [null, [[212, 905], [1120, 118]], [[245, 905], [1120, 308]], [[282, 905], [1120, 435]]];
  function point(k, corrected) {
    return {
      x: frame.left + Math.log10(k) / Math.log10(frame.xMax) * (frame.right - frame.left),
      y: frame.bottom - Math.log10(corrected) / 3 * (frame.bottom - frame.top)
    };
  }
  function logReading(k, ls) {
    if (ls === 0) return Math.log10(k); // No loss of support leaves k unchanged.
    const [[x1, y1], [x2, y2]] = lines[ls];
    const x = point(k, 1).x;
    const y = y1 + (x - x1) * (y2 - y1) / (x2 - x1);
    return (frame.bottom - y) / (frame.bottom - frame.top) * 3;
  }
  function calculate(k, ls) {
    const empty = status => ({ result: null, status, inputK: k, ls });
    if (k === null || ls === null) return empty('INPUT_REQUIRED');
    if (!Number.isFinite(k) || !Number.isFinite(ls) || k < 1 || k > 2000 || ls < 0 || ls > 3) return empty('INPUT_OUTSIDE_RANGE');
    const lower = Math.floor(ls), upper = Math.ceil(ls);
    const logK = logReading(k, lower) + (ls - lower) * (logReading(k, upper) - logReading(k, lower));
    const result = ls === 0 ? k : 10 ** logK;
    if (result < 1 || result > 1000) return empty('OUTPUT_OUTSIDE_CHART');
    return { result, status: 'WITHIN_RANGE', inputK: k, ls, point: point(k, result),
      method: 'APPROXIMATE_FIGURE_3_6_LOG_GRAPHICAL_READING',
      fractionalLsMethod: 'LINEAR_INTERPOLATION_OF_LOG10_OUTPUT_BETWEEN_PRINTED_LS_LINES',
      source: 'User supplied Figure 3.6 raster', modelVersion: 'figure-3-6-raster-v1', approximate: ls !== 0 };
  }
  globalThis.LossSupportCalculation = Object.freeze({ calculate, frame });
})();
