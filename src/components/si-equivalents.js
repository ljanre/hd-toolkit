/* Display-only unit conversions shared by pavement and subgrade tools. */
(() => {
  const fields = [...document.querySelectorAll('input[data-si-factor]')];
  const outputs = fields.map(input => {
    const output = document.createElement('output');
    output.id = input.id + 'SI';
    output.className = 'si-equivalent';
    output.setAttribute('for', input.id);
    input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), output.id].filter(Boolean).join(' '));
    const field = input.closest('.field');
    field.classList.add('has-si');
    field.append(output);
    return output;
  });
  function update() {
    fields.forEach((input, index) => {
      const value = input.value.trim() === '' ? NaN : Number(input.value);
      const converted = value * Number(input.dataset.siFactor);
      outputs[index].textContent = Number.isFinite(converted) && value >= 0
        ? 'SI ≈ ' + converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + input.dataset.siUnit
        : 'SI — ' + input.dataset.siUnit;
    });
  }
  document.addEventListener('input', update);
  document.addEventListener('change', update);
  globalThis.SIEquivalents = Object.freeze({ update });
  update();
})();
