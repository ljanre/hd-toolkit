/* DPWH BSDS Guide: Fig. 5.2-3 (As) and Ch. 7, p. 7-10 (wall coefficients).
   This engine covers the stated wall/abutment coefficient cases, not slope design. */
(() => {
  const gravity = 9.80665;
  const units = Object.freeze({ g: 1, percent: 0.01, ms2: 1 / gravity });
  const foundations = Object.freeze({ other: 1, rock: 1.2 });
  const cases = Object.freeze({ unreduced: 1, 'wall-example': 0.5 });
  const layers = Object.freeze(['rock-500', 'rock-1000', 'rock-2500', 'project']);
  function toG(value, unit) {
    if (!Object.hasOwn(units, unit)) throw new RangeError('Select a valid PGA unit.');
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new RangeError('Enter a PGA greater than zero.');
    const result = value * units[unit];
    if (!Number.isFinite(result) || result <= 0) throw new RangeError('PGA is outside the supported numeric range.');
    return result;
  }
  function calculate({ pga, unit, fpga, foundation, analysisCase, layer }) {
    const pgaG = toG(pga, unit);
    if (typeof fpga !== 'number' || !Number.isFinite(fpga) || fpga <= 0) throw new RangeError('Enter a project-adopted Fpga greater than zero.');
    if (!Object.hasOwn(foundations, foundation)) throw new RangeError('Select the wall foundation condition.');
    if (!Object.hasOwn(cases, analysisCase)) throw new RangeError('Select an analysis case.');
    if (!layers.includes(layer)) throw new RangeError('Select the PGA map or project source basis.');
    const as = pgaG * fpga;
    const foundationFactor = foundations[foundation];
    const kh0 = as * foundationFactor;
    const reduction = cases[analysisCase];
    const kh = kh0 * reduction;
    if (![as, kh0, kh].every(value => Number.isFinite(value) && value > 0)) throw new RangeError('Calculated coefficients are outside the supported numeric range.');
    return Object.freeze({ pgaG, fpga, as, foundationFactor, kh0, reduction, kh, kv: 0, conditional: analysisCase === 'wall-example' });
  }
  globalThis.SeismicCoefficients = Object.freeze({ calculate, toG, gravity, units });
})();
