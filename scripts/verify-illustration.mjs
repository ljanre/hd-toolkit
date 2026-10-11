import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
const nodes=new Map();
for(const match of html.matchAll(/\bid="([^"]+)"/g)) {
  const events={};
  nodes.set(match[1],{value:'',checked:false,hidden:false,textContent:'',className:'',disabled:false,events,
    classList:{add(){},remove(){}},setAttribute(key,value){this[key]=value;},removeAttribute(){},
    closest(){return {classList:{add(){},remove(){}}};},addEventListener(name,handler){events[name]=handler;}});
}
nodes.get('foundationDsb').value='150';nodes.get('figureThickness').checked=true;nodes.get('roundStep').value='10';
const context={document:{getElementById(id){assert.ok(nodes.has(id),`Missing ${id}`);return nodes.get(id);}}};
for(const id of ['calculation-core','pavement-illustration']) runInNewContext(html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`))[1],context);
const parameters=context.PavementCalc.DEFAULTS;
const result=context.PavementCalc.solve(parameters);
context.PavementIllustration.update(parameters,result);
assert.equal(nodes.get('dMm').textContent,result.dMm.toFixed(2));
assert.equal(nodes.get('roundedMm').textContent,String(result.roundedMm));
assert.equal(nodes.get('slabDimensionLabel').textContent,'D = '+result.roundedMm+' mm');
assert.match(nodes.get('slabSmallLabel').textContent,/24\.00 MPa/);
assert.match(nodes.get('soilSmallLabel').textContent,/215\.00 pci · 58\.36 MN\/m³/);
assert.equal(nodes.get('roundStep').disabled,false);
assert.equal(nodes.get('structureJ').textContent,parameters.j.toFixed(2));assert.equal(nodes.get('structureSo').textContent,parameters.so.toFixed(2));
assert.equal((html.match(/class="structure-parameters"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)[1].match(/<tr\b/g)||[]).length,14);
nodes.get('figureThickness').checked=false;
nodes.get('figureThickness').events.change();
assert.equal(nodes.get('dMm').textContent,result.dMm.toFixed(2));
assert.equal(nodes.get('roundedMm').textContent,String(result.roundedMm));
assert.equal(nodes.get('slabDimensionLabel').textContent,'D = '+result.dMm.toFixed(2)+' mm');
assert.equal(nodes.get('roundStep').disabled,true);
nodes.get('foundationDsb').value='200';context.PavementIllustration.update(parameters,result);
assert.equal(nodes.get('baseDimensionLabel').textContent,'200 mm');
context.PavementIllustration.restoreSettings({thicknessMode:'rounded',baseMm:150});
assert.equal(nodes.get('foundationDsb').value,'200','Legacy illustration settings must not overwrite the shared foundation thickness');assert.equal(nodes.has('figureBase'),false);
assert.equal(nodes.get('dMm').textContent,result.dMm.toFixed(2));
assert.equal(nodes.get('slabDimensionLabel').textContent,'D = '+result.roundedMm+' mm');
for(const base of [0,1,10,150,1000]) { nodes.get('foundationDsb').value=String(base);
  context.PavementIllustration.restoreSettings({thicknessMode:'rounded',baseMm:base});
  const geometry=context.PavementIllustration.geometry(result.roundedMm,base);
  assert.equal(Number(nodes.get('slabDimension').y2),geometry.slabBottom);
  assert.equal(Number(nodes.get('baseDimension').y1),geometry.slabBottom,'Both dimensions share the interface elevation');
  assert.equal(Number(nodes.get('baseDimension').y2),geometry.baseBottom);
  assert.equal(nodes.get('baseDimensionGroup').display,base>0?'inline':'none');
  assert.ok(Number(nodes.get('baseDimensionLabel').y)-Number(nodes.get('slabDimensionLabel').y)>=48,'Keep label stacks apart for thin subbases');
  assert.equal(nodes.get('baseDimension')['marker-start'],geometry.baseHeight>=14?'url(#dimensionArrow)':'none','Suppress overlapping arrows on very thin layers');
  assert.ok(Number(nodes.get('soilDepthNote').y)<360,'Keep depth annotations inside the drawing');
}
nodes.get('foundationDsb').value='200';context.PavementIllustration.reset();
assert.equal(nodes.get('foundationDsb').value,'200');
assert.equal(context.PavementIllustration.getSettings().baseMm,200);
assert.equal(nodes.get('dMm').textContent,result.dMm.toFixed(2));
assert.equal(nodes.get('layerSubbase').display,'inline');
assert.match(nodes.get('pavementSvg')['aria-label'],/200\.0 millimetres/);
context.PavementIllustration.update(parameters,null);
assert.equal(nodes.get('dMm').textContent,'—');
assert.equal(nodes.get('figureViewport').hidden,true);
assert.equal(nodes.get('structureSc').textContent,'—');assert.equal(nodes.get('structureSupport').textContent,'—');
console.log('Illustration checks passed: rounding toggle, increment state, subbase changes, saved settings and invalid-input state.');

