import { readFile } from 'node:fs/promises';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';

const base = new URL('../src/components/subgrade-reaction/', import.meta.url);
const context = {};
for (const name of ['model-data.js', 'engine.js', 'nomograph-extension.js', 'loss-support.js', 'nomograph-labels.js']) runInNewContext(await readFile(new URL(name, base), 'utf8'), context);
const { calculate, model } = context.SubgradeCalculation;
const extended=context.NomographExtension.calculate({DSB:8,ESB:50000,MR:30000});
assert.equal(extended.range_status,'EXTRAPOLATED_ESTIMATE');
assert.ok(Number.isFinite(extended.result)&&extended.result>calculate({DSB:8,ESB:50000,MR:20000}).result);
assert.equal(extended.graphical_overlay,null,'Original calibrated overlay is not used for an extended chart');
assert.equal(extended.estimated_uncertainty,null,'Do not reuse the digitized chart uncertainty outside its range');
for(const key of ['DSB','ESB','MR'])for(const value of [0,-1,Infinity])assert.equal(context.NomographExtension.calculate({DSB:8,ESB:50000,MR:30000,[key]:value}).result,null);
assert.equal(context.NomographExtension.calculate({DSB:8,ESB:50000,MR:7000}).result,calculate({DSB:8,ESB:50000,MR:7000}).result);
assert.match(context.NomographExtension.plot({DSB:8,ESB:50000,MR:30000},'figure-3-3.png'),/30,000 psi/);
assert.match(context.NomographExtension.plot({DSB:8,ESB:50000,MR:30000},'figure-3-3.png'),/Turning Point/);
assert.match(context.NomographExtension.plot({DSB:8,ESB:50000,MR:7000},'figure-3-3.png'),/viewBox="-40 -30 1420 1230"/);
assert.match(context.NomographExtension.plot({DSB:8,ESB:50000,MR:30000},'figure-3-3.png'),/viewBox="-40 -30 1420 1230"/);
assert.match(context.NomographExtension.plot({DSB:null,ESB:null,MR:null},'figure-3-3.png'),/viewBox="-40 -30 1420 1230"/);
const stableTrace={innerHTML:''},stableContainer={innerHTML:'retained background',querySelector:()=>stableTrace};
context.NomographExtension.updatePlot(stableContainer,context.NomographExtension.plot({DSB:8,ESB:50000,MR:30000},'figure-3-3.png'));
assert.equal(stableContainer.innerHTML,'retained background','Updates must preserve the background image node');
assert.match(stableTrace.innerHTML,/Turning Point/);
for(const boundary of [1000,20000]){
  const mr=boundary===1000?boundary-.001:boundary+.001;
  const original=calculate({DSB:8,ESB:50000,MR:boundary}).result;
  const continued=context.NomographExtension.calculate({DSB:8,ESB:50000,MR:mr}).result;
  assert.ok(Math.abs(continued-original)/original<.00001,'Edge continuation must join the calibrated boundary');
}
const cases = JSON.parse(await readFile(new URL('./subgrade-golden-tests.json', import.meta.url), 'utf8'));
const numberOrNull = value => value === '' || value === undefined ? null : value;
let maxError = 0;
for (const test of cases) {
  const output = calculate({ DSB: numberOrNull(test.DSB_INPUT), ESB: numberOrNull(test.ESB_INPUT), MR: numberOrNull(test.MR_INPUT) });
  const expected = numberOrNull(test.EXPECTED_RESULT_PCI);
  if (expected === null) assert.equal(output.result, null, test.TEST_ID);
  else {
    assert.notEqual(output.result, null, test.TEST_ID);
    const error = Math.abs(output.result - expected);
    assert.ok(error <= test.TOLERANCE_PCI + 1e-9, `${test.TEST_ID}: ${error}`);
    maxError = Math.max(maxError, error);
  }
  const q = numberOrNull(test.EXPECTED_Q);
  if (q === null) assert.equal(output.trace, null, test.TEST_ID);
  else assert.ok(Math.abs(output.trace.Q_RECTIFIED - q) <= 1e-10, test.TEST_ID);
  assert.equal(output.range_status, test.EXPECTED_RANGE_STATUS, test.TEST_ID);
  for (const key of ['DSB', 'ESB', 'MR']) assert.equal(output.input_status[key], test[`EXPECTED_${key}_STATUS`], test.TEST_ID);
  assert.equal(output.interpolation_used, String(test.INTERPOLATION_EXPECTED).toLowerCase() === 'true', test.TEST_ID);
  assert.equal(output.nomograph_id, test.NOMOGRAPH_ID);
  assert.equal(output.model_version, test.MODEL_VERSION);
}
assert.equal(model.extrapolationAllowed, false);
assert.equal(calculate({ DSB: 3.99, ESB: 15000, MR: 1000 }).result, null);
assert.equal(calculate({ DSB: 20.01, ESB: 1000000, MR: 20000 }).result, null);
console.log(`Figure 3.3: ${cases.length} supplied golden tests passed. Maximum error ${maxError.toExponential(3)} pci.`);
const loss = context.LossSupportCalculation.calculate;
assert.equal(loss(540, 0).result, 540);
assert.ok(Math.abs(loss(540, 1).result - 170) < 5, 'Supplied graphical example 540 → approximately 170');
assert.equal(loss(540, null).result, null);
assert.equal(loss(2001, 1).result, null);
assert.equal(loss(540, -0.1).result, null);
assert.equal(loss(540, 3.1).result, null);
assert.equal(loss(1, 3).result, null, 'Reject output below chart');
for (const k of [50, 100, 540, 1000]) {
  let previous = k;
  for (let ls = 0; ls <= 3; ls += .25) {
    const result = loss(k, ls).result;
    assert.ok(result !== null && result <= previous + 1e-9, 'More loss must not increase corrected k');
    previous = result;
  }
}
console.log(`Figure 3.6 checks passed: supplied example 540 pci / LS 1 → ${loss(540, 1).result.toFixed(1)} pci, zero loss, ranges and monotonicity.`);

// Exercise the interface with the actual calculation engine: invalid inputs must
// clear both the result and graphic, so a previous valid result cannot linger.
const html = await readFile(new URL('index.html', base), 'utf8');
const elements = new Map();
function element(id = '') {
  return { id, value: '', checked: true, attributes: {}, handlers: {}, children: [],
    get valueAsNumber() { return Number(this.value); },
    setAttribute(key, value) { this.attributes[key] = String(value); },
    toggleAttribute(key, force) { if (force) this.attributes[key] = ''; else delete this.attributes[key]; },
    addEventListener(type, callback) { this.handlers[type] = callback; },
    replaceChildren() { this.children = []; this.innerHTML = ''; }, append(child) { this.children.push(child); },
    focus() {}, reset() { for (const id of ['dsb', 'esb', 'mr']) elements.get(id).value = ''; }
  };
}
for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
  assert.ok(!elements.has(id), `Duplicate ID: ${id}`);
  elements.set(id, element(id));
}
context.document = {
  getElementById(id) { assert.ok(elements.has(id), `Missing ID: ${id}`); return elements.get(id); },
  querySelectorAll() { return []; }, createElementNS() { return element(); }
};
const ui = await readFile(new URL('subgrade.js', base), 'utf8');
new Script(ui);
runInNewContext(ui, context);
assert.equal(elements.get('result').textContent, '—');
assert.equal(elements.get('export').disabled, true);
elements.get('ls').value = '1';
for (const [id, value] of Object.entries({ dsb: '6', esb: '50000', mr: '7000' })) elements.get(id).value = value;
elements.get('inputForm').handlers.input();
const expected = calculate({ DSB: 6, ESB: 50000, MR: 7000 }).result;
assert.equal(elements.get('result').textContent, expected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
assert.equal(elements.get('export').disabled, false);
assert.notEqual(elements.get('corrected').textContent, '—');
assert.equal(elements.get('apply').disabled, false);
assert.equal(elements.get('dsb').attributes['aria-invalid'], 'false');
assert.equal((elements.get('points').innerHTML.match(/class="nomograph-callout"/g)||[]).length, 4);
assert.match(elements.get('points').innerHTML, /DSB = 152.4 mm/);
assert.match(elements.get('points').innerHTML, /MR = 7,000 psi/);
assert.match(elements.get('lossLabels').innerHTML, /Effective k =/);
assert.match(elements.get('lossLabels').innerHTML, /kcorr ≈/);
assert.ok(elements.get('path').attributes.points.length > 0);
elements.get('showPath').checked = false;
elements.get('showPath').handlers.change();
assert.ok('hidden' in elements.get('overlay').attributes);
elements.get('dsb').value = '0';
elements.get('inputForm').handlers.input();
assert.equal(elements.get('dsb').attributes['aria-invalid'], 'true');
assert.equal(elements.get('dsbError').hidden, false);
assert.equal(elements.get('result').textContent, '—');
assert.equal(elements.get('export').disabled, true);
assert.equal(elements.get('path').attributes.points, '');
assert.equal(elements.get('points').children.length, 0);
assert.equal(elements.get('points').innerHTML, '');
assert.equal(elements.get('corrected').textContent, '—');
assert.equal(elements.get('lossPath').attributes.points, '');
assert.equal(elements.get('lossLabels').innerHTML, '');
elements.get('kSource').value = 'manual';
elements.get('effectiveK').value = '540';
elements.get('kSource').handlers.change();
assert.equal(elements.get('corrected').textContent, Math.round(loss(540, 1).result).toString());
assert.equal(elements.get('export').disabled, false, 'Manual adjusted k works independently of Figure 3.3');
elements.get('ls').value = '4';
elements.get('ls').handlers.input();
assert.equal(elements.get('ls').attributes['aria-invalid'], 'true');
assert.equal(elements.get('apply').disabled, true);
assert.equal(elements.get('lossPath').attributes.points, '');
elements.get('reset').handlers.click();
assert.equal(elements.get('dsb').attributes['aria-invalid'], 'false');
assert.equal(elements.get('status').textContent, 'Enter all three inputs to calculate.');
assert.equal(elements.get('corrected').textContent, '—');
console.log('Subgrade interface: composite and adjusted k routes, correction, invalidation, path visibility and clear behavior passed.');

const listeners = {};
const frame = { contentWindow: {} };
const nodes = new Map();
for (const id of ['flexibleTool','flexibleTool', 'sidebarToggle', 'pavementTool', 'rainfallTool', 'coordinatesTool', 'subgradeTool', 'subbaseTool', 'strengthTool','cbrTool','trafficTool', 'k']) nodes.set(id, element(id));
nodes.set('culvertTool', element('culvertTool'));
nodes.get('k').dispatchEvent = event => { nodes.get('k').lastEvent = event; };
nodes.get('k').focus = () => { assert.equal(nodes.get('pavementTool').hidden, false); };
const shell = {
  document: { getElementById: id => nodes.get(id), querySelectorAll: () => [],
    querySelector: selector => selector === 'subgrade-reaction iframe' ? frame : element(),
    body: { classList: { toggle() {}, contains: name => name === 'admin-mode' } } },
  window: { addEventListener: (type, handler) => { (listeners[type]??=[]).push(handler); } },
  location: { hash: '#subgradeTool' }, localStorage: { getItem: () => null, setItem() {} },
  Event: class { constructor(type, options) { this.type = type; Object.assign(this, options); } }
};
const registryContext={document:{querySelector(){return null;}},window:{location:{search:''}},URLSearchParams,customElements:{get(){return true;}},HTMLElement:class {}};
runInNewContext(await readFile(new URL('../src/tool-registry.js',import.meta.url),'utf8'),registryContext);
shell.ToolkitRegistry=registryContext.ToolkitRegistry;
runInNewContext(await readFile(new URL('../src/toolkit.js', import.meta.url), 'utf8'), shell);
shell.location.hash = '#subbaseTool';
listeners.hashchange.forEach(fn=>fn());
assert.equal(nodes.get('subbaseTool').hidden, false);
assert.equal(nodes.get('subgradeTool').hidden, true);
assert.equal(shell.document.title, 'HD Toolkit | Subbase Thickness Design');
listeners.message.forEach(fn=>fn({ source: {}, data: { type: 'hd-toolkit-kcorr', value: 170 } }));
assert.equal(nodes.get('k').value, '', 'Reject messages from unrelated windows');
listeners.message.forEach(fn=>fn({ source: frame.contentWindow, data: { type: 'hd-toolkit-kcorr', value: 1001 } }));
assert.equal(nodes.get('k').value, '', 'Reject invalid transfer');
listeners.message.forEach(fn=>fn({ source: frame.contentWindow, data: { type: 'hd-toolkit-kcorr', value: 170 } }));
assert.equal(nodes.get('k').value, 170);
assert.equal(nodes.get('k').lastEvent.type, 'input');
assert.equal(shell.location.hash, '#pavementTool');
assert.equal(nodes.get('subgradeTool').hidden, true);
console.log('Pavement transfer passed: frame verification, value limits, input recalculation event and navigation.');
const rigidNodes=new Map();
context.window=context;context.document={getElementById(id){if(!rigidNodes.has(id))rigidNodes.set(id,{value:'',attributes:{},classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},removeAttribute(k){delete this.attributes[k];},closest(){return this;}});return rigidNodes.get(id);}};
runInNewContext(await readFile(new URL('../../rigid-foundation.js',base),'utf8'),context);
const foundation=context.RigidFoundation,rigid=id=>context.document.getElementById(id);
foundation.restore();foundation.update();assert.equal(rigid('k').value,'');assert.equal(rigid('k').readOnly,true);
foundation.restore({mode:'auto',dsb:8,esb:50000,mr:7000,ls:1});foundation.update();
const expectedComposite=calculate({DSB:8,ESB:50000,MR:7000}).result;assert.notEqual(expectedComposite,null);
assert.equal(Number(rigid('k').value),Math.round(loss(expectedComposite,1).result));assert.ok(rigid('foundationCompositePath').attributes.points.length>0);assert.ok(rigid('foundationLossPath').attributes.points.length>0);
assert.equal(rigid('pavementCompositePath').attributes.points,rigid('foundationCompositePath').attributes.points);assert.equal(rigid('pavementLossPath').attributes.points,rigid('foundationLossPath').attributes.points);assert.equal(rigid('pavementCompositePoints').innerHTML,rigid('foundationCompositePoints').innerHTML);
assert.match(rigid('foundationCompositePoints').innerHTML,/DSB = 203.2 mm/);
assert.match(rigid('foundationLossPoints').innerHTML,/LS = 1/);
assert.equal(rigid('pavementLossPoints').innerHTML,rigid('foundationLossPoints').innerHTML);
const savedFoundation=foundation.getState();foundation.restore(savedFoundation);foundation.update();assert.equal(Number(rigid('k').value),Math.round(loss(expectedComposite,1).result));
rigid('foundationMode').checked=false;foundation.update();assert.equal(rigid('k').readOnly,false);assert.equal(rigid('foundationInputs').hidden,false);rigid('k').value='170';
rigid('foundationMode').checked=true;foundation.update();assert.equal(rigid('k').readOnly,true);assert.equal(Number(rigid('k').value),Math.round(loss(expectedComposite,1).result));
rigid('foundationMode').checked=false;foundation.update();assert.equal(rigid('k').value,'170','Switching back to manual preserves the entered value');
foundation.restore({mode:'auto',source:'adjusted',adjusted:540,ls:1},170);foundation.update();assert.equal(Number(rigid('k').value),170,'An older adjusted case retains its adopted k in manual mode');assert.equal(rigid('foundationMode').checked,false);
foundation.restore({mode:'auto',dsb:8,esb:50000,mr:7000,ls:1});foundation.update();
rigid('foundationLs').value='4';foundation.update();assert.equal(rigid('k').value,'','Invalid LS clears the previous design value');assert.equal(rigid('foundationLossPath').attributes.points,'');
assert.equal(rigid('pavementLossPath').attributes.points,'','Duplicate correction path clears when inputs become invalid');
assert.equal(rigid('foundationLossPoints').innerHTML,'');assert.equal(rigid('pavementLossPoints').innerHTML,'');
foundation.restore({mode:'manual'},170);foundation.update();assert.equal(rigid('k').value,'170');assert.equal(rigid('k').readOnly,false);
rigid('foundationDsb').value='250';foundation.update();assert.equal(rigid('foundationDsb').readOnly,false);assert.equal(rigid('foundationDsb').disabled,false);assert.equal(rigid('k').value,'170','Editing shared drawing thickness must preserve manual kcorr');assert.ok(Math.abs(foundation.getState().dsb-250/25.4)<1e-12);
foundation.restore();foundation.update();assert.equal(rigid('k').value,'','Reset clears previous foundation values');
console.log('Integrated foundation support passed: shared engines, live overlays, adjusted input, invalidation, state restoration and manual mode.');

