(() => {
  const $ = id => document.getElementById(id);
  const fields = { DSB: $('dsb'), ESB: $('esb'), MR: $('mr') };
  const guides = {
    DSB: ['Subbase Thickness', 'Use the thickness of the subbase layer beneath the concrete slab, from the proposed pavement section. Enter inches; divide millimetres by 25.4. This is the subbase thickness, not the concrete slab thickness.', 'Positive input required. Separate edge-curve extrapolation beyond printed range: 4–20 in (101.6–508 mm).'],
    ESB: ['Subbase Elastic Modulus', 'Use the elastic modulus representative of the proposed subbase material and condition, supported by project material testing or the applicable design criteria. Enter psi; multiply MPa by 145.0377. Do not substitute the concrete modulus.', 'Positive input required. Separate edge-curve extrapolation beyond printed range: 15,000–1,000,000 psi (approximately 103–6,895 MPa).'],
    MR: ['Subgrade Resilient Modulus', 'Use the resilient modulus representative of the foundation soil under the design moisture and seasonal conditions, supported by project geotechnical data. Enter psi; multiply MPa by 145.0377. This input is a modulus, not the corrected modulus of subgrade reaction kcorr.', 'Positive input required. Separate edge-curve extrapolation beyond printed range: 1,000–20,000 psi (approximately 6.9–137.9 MPa).'],
    LS: ['Loss of Support Factor', 'Select LS for the subbase material, erosion susceptibility and potential voids beneath the slab. FHWA Table 5-45 gives typical ranges: cement or asphalt treated bases and bituminous stabilized mixtures, 0–1; lime stabilized and unbound granular materials, 1–3; fine-grained or natural subgrade materials, 2–3. These are selection ranges, not automatic defaults.', 'Figure 3.6 prints LS = 0, 1, 2 and 3. LS = 0 gives no reduction. Intermediate factors interpolate log10(kcorr) between the adjacent lines. The result is an approximate chart reading.']
  };
  const fmt = (value, digits = 2) => value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  let current = null;
  let correction = null;
  let opener;
  function update() {
    const inputs = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim() === '' ? null : input.valueAsNumber]));
    current = NomographExtension.calculate(inputs);
    $('extendedPlot').innerHTML=NomographExtension.plot(inputs,'figure-3-3.png');
    for (const [key, input] of Object.entries(fields)) {
      const status = current.input_status[key];
      const invalid = !['VALID', 'AT_BOUNDARY', 'INPUT_REQUIRED'].includes(status);
      input.setAttribute('aria-invalid', String(invalid));
      const error = $(input.id + 'Error');
      error.hidden = !invalid;
      error.textContent = invalid ? 'Enter a finite positive value; zero cannot be plotted on a logarithmic nomograph.' : '';
    }
    const valid = current.result !== null;
    $('result').textContent = valid ? fmt(current.result) : '—';
    $('metric').textContent = valid ? fmt(current.result * 0.271447138) + ' MN/m³' : '— MN/m³';
    $('status').textContent = valid ? (current.range_status==='EXTRAPOLATED_ESTIMATE'?'Extrapolated nomograph estimate · Outside printed scales; result and uncertainty are unverified.':'Within Nomograph Range · Composite k∞') : current.range_status === 'INPUT_REQUIRED' ? 'Enter all three inputs to calculate.' : current.range_status === 'OUTSIDE_NOMOGRAPH_RANGE' ? 'This combination falls outside the printed output range (50–2,000 pci).' : 'Check the highlighted inputs. No extrapolation is permitted.';
    $('allowance').hidden = !current.estimated_uncertainty;
    $('allowance').textContent = current.estimated_uncertainty ? '±' + fmt(current.estimated_uncertainty.value) + ' pci · 6% graphical allowance from the source model; not a statistical confidence interval.' : '';
    $('path').setAttribute('points', '');
    $('points').replaceChildren();
    if (current.graphical_overlay) {
      const overlay = current.graphical_overlay;
      $('path').setAttribute('points', overlay.path_point_ids.map(id => `${overlay.points[id].x_pixel},${overlay.points[id].y_pixel}`).join(' '));
      $('points').innerHTML = NomographLabels.composite(current);
    }
    $('overlay').toggleAttribute('hidden', !$('showPath').checked);
    updateCorrection();
  }
  const readNumber = input => input.value.trim() === '' ? null : input.valueAsNumber;
  function updateCorrection() {
    const manual = $('kSource').value === 'manual';
    $('effectiveField').hidden = !manual;
    $('effectiveK').disabled = !manual;
    const effectiveK = manual ? readNumber($('effectiveK')) : current?.result ?? null;
    const ls = readNumber($('ls'));
    correction = LossSupportCalculation.calculate(effectiveK, ls);
    for (const [id, value, min, max] of [['effectiveK', effectiveK, 1, 2000], ['ls', ls, 0, 3]]) {
      const invalid = value !== null && (!Number.isFinite(value) || value < min || value > max);
      $(id).setAttribute('aria-invalid', String(invalid));
      const error = $(id === 'effectiveK' ? 'effectiveError' : 'lsError');
      error.hidden = !invalid;
      error.textContent = invalid ? `Enter a value from ${min} to ${max}.` : '';
    }
    $('effectiveSummary').textContent = 'Effective k: ' + (Number.isFinite(effectiveK) ? fmt(effectiveK) : '—') + ' pci · ' + (manual ? 'Adjusted Input' : 'Figure 3.3; no seasonal/foundation change assumed');
    const valid = correction.result !== null;
    $('corrected').textContent = valid ? fmt(correction.result, 0) : '—';
    $('correctedMetric').textContent = valid ? fmt(correction.result * 0.271447138, 1) + ' MN/m³' : '— MN/m³';
    $('correctionStatus').textContent = valid ? (ls === 0 ? 'LS = 0 · No Loss-of-Support Reduction' : `Approximate Chart Reading · LS = ${ls}`) : correction.status === 'INPUT_REQUIRED' ? 'Enter effective k and LS to calculate.' : correction.status === 'OUTPUT_OUTSIDE_CHART' ? 'Corrected k falls outside the printed vertical range (1–1,000 pci). No extrapolation is performed.' : 'Check effective k and LS. No extrapolation is permitted.';
    $('apply').disabled = !valid;
    $('export').disabled = !valid;
    $('lossPath').setAttribute('points', valid ? `${correction.point.x},905 ${correction.point.x},${correction.point.y} 190,${correction.point.y}` : '');
    $('lossLabels').innerHTML = valid ? NomographLabels.loss(correction) : '';
    $('lossPoint').toggleAttribute('hidden', !valid);
    if (valid) { $('lossPoint').setAttribute('cx', correction.point.x); $('lossPoint').setAttribute('cy', correction.point.y); }
    $('lossOverlay').toggleAttribute('hidden', !$('showPath').checked);
    globalThis.SIEquivalents?.update();
  }
  $('inputForm').addEventListener('input', update);
  $('inputForm').addEventListener('submit', event => event.preventDefault());
  $('showPath').addEventListener('change', update);
  $('reset').addEventListener('click', () => { $('inputForm').reset(); $('ls').value = ''; $('effectiveK').value = ''; $('kSource').value = 'composite'; update(); fields.DSB.focus(); });
  $('ls').addEventListener('input', updateCorrection);
  $('effectiveK').addEventListener('input', updateCorrection);
  $('kSource').addEventListener('change', updateCorrection);
  $('apply').addEventListener('click', () => {
    if (correction?.result === null || !correction) return;
    // Use the displayed whole-pci graphical reading, avoiding false precision.
    if (window.parent === window) { $('correctionStatus').textContent = 'Open this tool from HD Toolkit to send the result to Pavement Design.'; return; }
    window.parent.postMessage({ type: 'hd-toolkit-kcorr', value: Math.round(correction.result) }, '*');
  });
  document.querySelectorAll('[data-guide]').forEach(button => button.addEventListener('click', () => {
    opener = button;
    const [title, body, range] = guides[button.dataset.guide];
    $('guideTitle').textContent = title;
    $('guideBody').textContent = body;
    $('guideRange').textContent = range;
    $('modulusGuideTable').hidden = button.dataset.guide !== 'ESB';
    $('guide').showModal();
  }));
  $('closeGuide').addEventListener('click', () => $('guide').close());
  $('guide').addEventListener('click', event => { if (event.target === $('guide')) { const r = $('guide').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('guide').close(); } });
  $('guide').addEventListener('close', () => opener?.focus());
  $('export').addEventListener('click', () => {
    if (!correction || correction.result === null) return;
    const report = { tool: 'HD Toolkit — Figures 3.3 and 3.6', outputMeaning: 'Effective k corrected for potential loss of support.', exportedAt: new Date().toISOString(), effectiveKSource: $('kSource').value, assumption: $('kSource').value === 'manual' ? 'User supplies effective k after applicable seasonal/foundation adjustments.' : 'Figure 3.3 composite k is taken as effective k; no seasonal/foundation change assumed.', compositeCalculation: current, lossOfSupportCorrection: correction, designValuePci: Math.round(correction.result) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'HD-Toolkit-Corrected-Subgrade-Reaction.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  update();
})();
