(() => {
  const get = id => document.getElementById(id);
  const inputs = ['pga', 'unit', 'fpga', 'foundation', 'analysis-case', 'layer', 'project', 'reference'].map(get);
  const fields = ['pga', 'fpga', 'foundation', 'layer'];
  const outputIds = ['kh', 'kv', 'normalized', 'as', 'kh0', 'formula'];
  const format = value => String(Number(value.toPrecision(8)));
  const error = get('error'), status = get('result-status');
  const sourceLabels = {
    'rock-500': 'HazardHunter PH · Rock · 500-year RP',
    'rock-1000': 'HazardHunter PH · Rock · 1000-year RP',
    'rock-2500': 'HazardHunter PH · Rock · 2500-year RP',
    project: 'Project-adopted reference PGA'
  };
  let previousUnit = get('unit').value;
  function update() {
    outputIds.forEach(id => { get(id).textContent = '—'; });
    get('audit').hidden = true;
    error.hidden = true;
    error.textContent = '';
    inputs.forEach(input => input.removeAttribute('aria-invalid'));
    status.textContent = 'Enter PGA, Fpga, source basis and foundation condition.';
    status.dataset.state = 'pending';
    for (const id of ['pga', 'fpga']) {
      const input = get(id);
      if (input.validity.badInput || (input.value !== '' && (!Number.isFinite(input.valueAsNumber) || input.valueAsNumber <= 0))) {
        error.textContent = id === 'pga' ? 'Enter a PGA greater than zero.' : 'Enter a project-adopted Fpga greater than zero.';
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        return;
      }
    }
    if (fields.some(id => get(id).value === '')) return;
    try {
      const result = SeismicCoefficients.calculate({
        pga: get('pga').valueAsNumber, unit: get('unit').value,
        fpga: get('fpga').valueAsNumber, foundation: get('foundation').value,
        analysisCase: get('analysis-case').value, layer: get('layer').value
      });
      get('kh').textContent = format(result.kh);
      get('kv').textContent = '0';
      get('normalized').textContent = format(result.pgaG) + ' g';
      get('as').textContent = `${format(result.fpga)} × ${format(result.pgaG)} = ${format(result.as)}`;
      get('kh0').textContent = `${result.foundationFactor} × ${format(result.as)} = ${format(result.kh0)}`;
      get('formula').textContent = `${result.reduction} × ${format(result.kh0)} = ${format(result.kh)}`;
      status.textContent = result.conditional
        ? 'Conditional wall-inertia example · kh = 0.5 kh0. Verify project applicability and DGCS checks before adoption.'
        : 'Unreduced horizontal coefficient · kh = kh0. No half-coefficient reduction applied.';
      status.dataset.state = result.conditional ? 'conditional' : 'complete';
      get('audit-source').textContent = sourceLabels[get('layer').value];
      get('audit-project').textContent = get('project').value.trim() || 'Not entered';
      get('audit-reference').textContent = get('reference').value.trim() || 'Not entered';
      get('audit').hidden = false;
    } catch (cause) {
      error.textContent = cause.message;
      error.hidden = false;
    }
  }
  inputs.filter(input => input.id !== 'unit').forEach(input => {
    input.addEventListener('input', update);
    input.addEventListener('change', update);
  });
  get('unit').addEventListener('change', () => {
    const pga = get('pga');
    if (pga.value !== '' && Number.isFinite(pga.valueAsNumber) && pga.valueAsNumber > 0) {
      try {
        const normalized = SeismicCoefficients.toG(pga.valueAsNumber, previousUnit);
        const converted = normalized / SeismicCoefficients.units[get('unit').value];
        if (!Number.isFinite(converted) || converted <= 0) throw new RangeError('Unit conversion is outside the supported range.');
        pga.value = String(converted);
      } catch {
        get('unit').value = previousUnit;
      }
    }
    previousUnit = get('unit').value;
    update();
  });
  get('clear').addEventListener('click', () => {
    inputs.forEach(input => { input.value = ''; });
    get('unit').value = previousUnit = 'g';
    get('analysis-case').value = 'unreduced';
    update();
    get('pga').focus();
  });
  get('seismic-form').addEventListener('submit', event => { event.preventDefault(); update(); });
  get('print').addEventListener('click', () => window.print());
  update();
})();
