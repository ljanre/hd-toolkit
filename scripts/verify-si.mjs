import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const code = await readFile(new URL('../src/components/si-equivalents.js', import.meta.url), 'utf8');
for (const [file, examples] of [
  ['../src/index.html', { sc: [600, 'SI ≈ 4.14 MPa'], ecMillion: [3.372, 'SI ≈ 23.25 GPa'], k: [215, 'SI ≈ 58.36 MN/m³'], foundationDsb:[6,'SI ≈ 152.40 mm'],foundationEsb:[50000,'SI ≈ 344.74 MPa'],foundationMr:[7000,'SI ≈ 48.26 MPa'],foundationAdjusted:[540,'SI ≈ 146.58 MN/m³'] }],
  ['../src/components/subgrade-reaction/index.html', { dsb: [6, 'SI ≈ 152.40 mm'], esb: [50000, 'SI ≈ 344.74 MPa'], mr: [7000, 'SI ≈ 48.26 MPa'], effectiveK: [540, 'SI ≈ 146.58 MN/m³'] }]
]) {
  const html = await readFile(new URL(file, import.meta.url), 'utf8');
  const fields = [...html.matchAll(/<input\b[^>]*data-si-factor[^>]*>/g)].map(([tag]) => {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
    const field = { classList: { add() {} }, append(output) { this.output = output; } };
    return { id: attrs.id, value: String(examples[attrs.id][0]), dataset: { siFactor: attrs['data-si-factor'], siUnit: attrs['data-si-unit'] },
      getAttribute: key => attrs[key], setAttribute: (key, value) => { attrs[key] = value; }, closest: () => field, field };
  });
  const ctx = { document: { querySelectorAll: () => fields, createElement: () => ({ setAttribute() {} }), addEventListener() {} } };
  runInNewContext(code, ctx);
  for (const input of fields) assert.equal(input.field.output.textContent, examples[input.id][1]);
  fields[0].value = '';
  ctx.SIEquivalents.update();
  assert.ok(fields[0].field.output.textContent.startsWith('SI —'));
  fields[0].value = 'invalid';
  ctx.SIEquivalents.update();
  assert.ok(fields[0].field.output.textContent.startsWith('SI —'));
}
console.log('SI equivalents passed: both tools, pressure/modulus/thickness/reaction conversions, and blank/invalid input clearing.');
