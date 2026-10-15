import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
const foundationScripts=await Promise.all(['components/subgrade-reaction/model-data.js','components/subgrade-reaction/engine.js','components/subgrade-reaction/nomograph-extension.js','components/subgrade-reaction/loss-support.js','components/subgrade-reaction/nomograph-labels.js','rigid-foundation.js'].map(file=>readFile(new URL('../src/'+file,import.meta.url),'utf8')));
function node(value=''){
  return {value,hidden:false,disabled:false,events:{},textContent:'',validity:{badInput:false},
    classList:{add(){},remove(){},toggle(){}},attributes:{},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},removeAttribute(k){delete this.attributes[k];},
    closest(){return this;},append(){},replaceChildren(){},
    addEventListener(name,fn){this.events[name]=fn;}};
}
function mount(saved){
  const nodes=new Map();
  for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g))nodes.set(match[1],node(match[0].match(/\bvalue="([^"]*)"/)?.[1]??''));
  nodes.get('roundStep').value='10';
  let lastResult,stored=saved?JSON.stringify(saved):null;
  const context={document:{getElementById:id=>nodes.get(id),createElement:()=>node()},window:{addEventListener(){}},
    localStorage:{getItem:()=>stored,setItem:(key,value)=>stored=value,removeItem:()=>stored=null},
    PavementIllustration:{update(p,r){lastResult=r;},onSettingsChange(){},reset(){},restoreSettings(){},getSettings(){return {baseMm:null};}}};
  foundationScripts.forEach(code=>runInNewContext(code,context));
  for(const id of ['calculation-core','app-interface'])runInNewContext(html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`))[1],context);
  return {nodes,context,result:()=>lastResult,saved:()=>JSON.parse(stored)};
}
const app=mount();
assert.equal(app.nodes.get('fcUnitMPa').checked,false);
assert.equal(Number(app.nodes.get('fcMPa').value),3500);
assert.equal(app.nodes.get('fcMPa').value,'3500.00');
const initialConcreteEc=app.result().n.ec;
app.nodes.get('fcUnitMPa').checked=true;app.nodes.get('fcUnitMPa').events.change.call(app.nodes.get('fcUnitMPa'));
assert.ok(Math.abs(Number(app.nodes.get('fcMPa').value)-24.13)<1e-12);
assert.ok(Math.abs(app.result().n.ec-initialConcreteEc)<1e-8,'Unit conversion must preserve Ec');
const mpaRestored=mount(app.saved());assert.equal(mpaRestored.nodes.get('fcUnitMPa').checked,true);assert.ok(Math.abs(Number(mpaRestored.nodes.get('fcMPa').value)-24.13)<1e-12);
app.nodes.get('fcUnitMPa').checked=false;app.nodes.get('fcUnitMPa').events.change.call(app.nodes.get('fcUnitMPa'));
assert.equal(Number(app.nodes.get('fcMPa').value),3500);
app.nodes.get('fcMPa').value='';app.nodes.get('designForm').events.input();
app.nodes.get('fcUnitMPa').checked=true;app.nodes.get('fcUnitMPa').events.change.call(app.nodes.get('fcUnitMPa'));
assert.equal(app.nodes.get('fcMPa').value,'','Changing units must preserve a blank input');
app.nodes.get('resetInputs').events.click();assert.equal(app.nodes.get('fcUnitMPa').checked,false);
app.nodes.get('fcMPa').value='3500.987';app.nodes.get('fcMPa').events.input();app.nodes.get('designForm').events.input();
app.nodes.get('fcMPa').events.blur();assert.equal(app.nodes.get('fcMPa').value,'3500.99');
assert.ok(Math.abs(app.saved().inputs.fcMPa*145.038-3500.987)<1e-8,'Two-decimal display must preserve calculation precision');
app.nodes.get('resetInputs').events.click();
assert.equal(app.nodes.get('scStandard').checked,true);
assert.ok(Math.abs(app.result().n.sc-635.5525)<1e-8);
assert.ok(Math.abs(app.result().n.ec/1e6-57000*Math.sqrt(3500)/1e6)<1e-9);
app.nodes.get('fcMPa').value=String(30*145.038);app.nodes.get('designForm').events.input();
assert.ok(Math.abs(app.result().n.sc-635.5525)<1e-8,'Specified Sc is independent of compressive strength');
app.nodes.get('scStandard').checked=false;app.nodes.get('scStandard').events.change();
assert.equal(app.nodes.get('scSpecified').readOnly,false);
app.nodes.get('scSpecified').value='600';app.nodes.get('designForm').events.input();
assert.ok(Math.abs(app.result().n.sc-693.33)<1e-8);
const restoredStrength=mount(app.saved());
assert.equal(restoredStrength.nodes.get('scStandard').checked,false);
assert.equal(restoredStrength.nodes.get('scSpecified').value,'600');
assert.ok(Math.abs(restoredStrength.result().n.sc-693.33)<1e-8);
app.nodes.get('scSpecified').value='';app.nodes.get('designForm').events.input();
assert.equal(app.nodes.get('sc').value,'');
assert.equal(app.nodes.get('scSpecified').getAttribute('aria-invalid'),'true');
app.nodes.get('scStandard').checked=true;app.nodes.get('scStandard').events.change();
assert.equal(app.nodes.get('scSpecified').value,'550');
app.nodes.get('resetInputs').events.click();
assert.equal(app.nodes.get('foundationMaterial').value,'unbound');
for(const [material,minimum] of Object.entries({unbound:15000,lime:20000,bituminous:40000,asphalt:350000,'cement-aggregate':500000,'cement-treated':1000000})){
  app.nodes.get('foundationMaterial').value=material;app.nodes.get('foundationMaterial').events.change();assert.equal(Number(app.nodes.get('foundationEsb').value),minimum);
  const maximum={unbound:45000,lime:70000,bituminous:300000,asphalt:1000000,'cement-aggregate':1000000,'cement-treated':2000000}[material];
  assert.equal(Number(app.nodes.get('foundationEsb').min),minimum);assert.equal(Number(app.nodes.get('foundationEsb').max),maximum);
  for(const invalid of [minimum-1,maximum+1]){
    app.nodes.get('foundationEsb').value=String(invalid);app.nodes.get('designForm').events.input();
    assert.equal(app.nodes.get('foundationEsb').getAttribute('aria-invalid'),'true');
    assert.equal(app.nodes.get('k').value,'');assert.equal(app.nodes.get('foundationStatus').hidden,false);
    assert.equal(app.nodes.get('foundationCompositePath').getAttribute('points'),'');assert.equal(app.nodes.get('pavementCompositePath').getAttribute('points'),'');
  }
  app.nodes.get('foundationEsb').value=String(maximum);app.nodes.get('designForm').events.input();assert.equal(app.nodes.get('foundationEsb').getAttribute('aria-invalid'),undefined);
}
app.nodes.get('foundationMaterial').value='project';app.nodes.get('foundationMaterial').events.change();assert.equal(Number(app.nodes.get('foundationEsb').max),Number.MAX_VALUE);
app.nodes.get('foundationMaterial').value='unbound';app.nodes.get('foundationMaterial').events.change();
app.nodes.get('foundationEsb').value='45000';app.nodes.get('designForm').events.input();assert.equal(app.nodes.get('foundationEsb').value,'45000','Adopted material modulus remains editable');
app.nodes.get('resetInputs').events.click();assert.equal(app.nodes.get('foundationMaterial').value,'unbound');assert.equal(Number(app.nodes.get('foundationEsb').value),15000);
assert.equal(app.nodes.get('jCondition').value,'undoweled-aggregate');assert.equal(app.nodes.get('j').readOnly,false);
assert.equal(app.nodes.has('jOriginal'),false);assert.equal(app.nodes.has('jReferenceFigure'),false);
assert.equal(app.nodes.has('foundationSource'),false);assert.equal(app.nodes.has('foundationAdjusted'),false);
for(const [condition,value,figure] of [['doweled-aggregate',3.2,'doweled'],['doweled-hma',2.7,'doweled'],['crcp-hma',2.9,'crcp-hma'],['crcp-pcc',2.3,'crcp-pcc'],['undoweled-aggregate',3.8,'undoweled']]){
  app.nodes.get('jCondition').value=condition;app.nodes.get('jCondition').events.change();
  assert.equal(Number(app.nodes.get('j').value),value);assert.equal(app.result().n.j,value,'Slab calculation uses the selected automatic J');
  assert.equal(app.nodes.get('jNoFigure').hidden,!!figure);assert.equal(app.nodes.get('j').readOnly,false);
  if(figure)assert.equal(app.nodes.get('jFigure').src,'./assets/load-transfer/'+figure+'.svg');
}
app.nodes.get('jCondition').value='crcp-hma';app.nodes.get('jCondition').events.change();
app.nodes.get('j').value='3.05';app.nodes.get('designForm').events.input();assert.equal(app.result().n.j,3.05,'Manual J must remain adopted for the selected condition');
app.nodes.get('r').value='90';app.nodes.get('designForm').events.input();assert.equal(app.nodes.get('j').value,'3.05','Other input edits must not reset J');
app.nodes.get('jCondition').value='project';app.nodes.get('jCondition').events.change();assert.equal(app.nodes.get('j').readOnly,false);
app.nodes.get('j').value='3.05';app.nodes.get('designForm').events.input();assert.equal(app.result().n.j,3.05);
assert.equal(app.nodes.get('jUploadControls').hidden,false);assert.equal(app.nodes.get('jNoFigure').hidden,false);
const imageData='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ9sAAAAASUVORK5CYII=';
app.context.FileReader=class{readAsDataURL(file){this.result=file.data;this.onload();}};
app.context.Image=class{set src(value){this.onload();}};
const imageInput=app.nodes.get('jImageFile');imageInput.files=[{type:'image/png',size:100,name:'My joint layout.png',data:imageData}];imageInput.events.change.call(imageInput);
assert.equal(app.nodes.get('jFigure').src,imageData);assert.equal(app.nodes.get('jNoFigure').hidden,true);assert.equal(app.nodes.get('jRemoveImage').hidden,false);assert.equal(app.result().n.j,3.05,'Uploading a layout must not change adopted J');
const imageRestored=mount(app.saved());assert.equal(imageRestored.nodes.get('jFigure').src,imageData,'Uploaded layout must restore with the saved local case');
imageInput.files=[{type:'image/png',size:3*1024*1024,name:'too-large.png'}];imageInput.events.change.call(imageInput);assert.match(app.nodes.get('jUploadStatus').textContent,/up to 2 MB/);assert.equal(app.nodes.get('jFigure').src,imageData);
imageInput.files=[{type:'image/svg+xml',size:100,name:'unsupported.svg'}];imageInput.events.change.call(imageInput);assert.match(app.nodes.get('jUploadStatus').textContent,/PNG, JPG or WebP/);
app.nodes.get('jRemoveImage').events.click();assert.equal(app.nodes.get('jNoFigure').hidden,false);assert.equal(app.saved().inputs.jImage,null);
app.nodes.get('resetInputs').events.click();
assert.equal(app.nodes.get('rigidDesignYears').value,'20');
assert.doesNotMatch(html.match(/<input id="rigidDesignYears"[^>]*>/)[0],/readonly/);
app.nodes.get('rigidDesignYears').value='25';app.nodes.get('rigidDesignYears').events.input.call(app.nodes.get('rigidDesignYears'),{isTrusted:true});app.nodes.get('designForm').events.input();assert.equal(app.saved().inputs.designYears,25);assert.equal(app.saved().inputs.designYearsManual,true);
assert.equal(mount(app.saved()).nodes.get('rigidDesignYears').manualPeriod,true);
app.nodes.get('resetInputs').events.click();assert.equal(app.nodes.get('rigidDesignYears').value,'20');
const traffic=app.nodes.get('wMillion');traffic.events.focus.call(traffic);assert.equal(traffic.value,'1000000');
traffic.value='38151550.46';app.nodes.get('designForm').events.input();
assert.match(app.nodes.get('wMillionHelp').textContent,/38.15 × 10⁶/);
assert.ok(Math.abs(app.result().n.w-38151550.46)<1e-7);
traffic.events.blur.call(traffic);assert.equal(traffic.value,'38.15');
assert.ok(Math.abs(app.result().n.w-38151550.46)<1e-7,'Display rounding must preserve full ESAL precision');
traffic.events.focus.call(traffic);traffic.value='';app.nodes.get('designForm').events.input();assert.equal(app.result(),null);traffic.events.blur.call(traffic);
app.nodes.get('resetInputs').events.click();
const projectKeys=['r','wMillion','p0','pt','dpsi','fcMPa','sc','ecMillion','cd','j','k'];
const collector={r:85,so:0.30,wMillion:1,p0:4.5,pt:2,dpsi:2.5,fcMPa:3500/145.038,cd:1,j:3.8,k:34};
for(const [key,value] of Object.entries(collector)){assert.equal(Number(app.nodes.get(key).value),key==='fcMPa'?Number((value*145.038).toPrecision(15)):value,key);assert.equal(app.context.PavementCalc.DEFAULT_INPUTS[key],value,key);}
assert.ok(app.result()?.dMm>0,'Collector assumptions calculate on startup');
assert.equal(app.nodes.get('errors').hidden,true);
assert.equal(app.nodes.has('saveCase'),false);
assert.match(app.nodes.get('stepSolve').textContent,/Calculated D/);assert.match(app.nodes.get('stepRounding').textContent,/Meets entered design traffic/);
assert.equal(app.nodes.get('foundationMode').checked,true);for(const [id,value] of Object.entries({foundationDsb:200,foundationEsb:15000,foundationMr:1000,foundationLs:1}))assert.equal(Number(app.nodes.get(id).value),value);
const sample=app.context.PavementCalc.DEFAULTS;
for(const key of app.context.PavementCalc.NUMERIC_KEYS)app.nodes.get(key).value=String(key==='fcMPa'?sample[key]*145.038:sample[key]);
app.nodes.get('designForm').events.input();
assert.ok(app.result()?.dMm>0,'Complete project inputs should calculate');
assert.equal(app.nodes.get('dpsi').value,'2.00');
app.nodes.get('pt').value='3';app.nodes.get('designForm').events.input();assert.equal(app.nodes.get('dpsi').value,'1.50');assert.ok(app.result()?.dMm>0);
app.nodes.get('p0').value='4';app.nodes.get('designForm').events.input();assert.equal(app.nodes.get('dpsi').value,'1.00');
app.nodes.get('p0').value='';app.nodes.get('designForm').events.input();assert.equal(app.nodes.get('dpsi').value,'');assert.equal(app.result(),null);
assert.equal(app.nodes.get('stepSolve').textContent,'Thickness calculation pending.','Invalid inputs clear the previous process result');
app.nodes.get('p0').value='2.5';app.nodes.get('designForm').events.input();assert.equal(app.result(),null,'Initial below terminal must not calculate');
app.nodes.get('resetInputs').events.click();
assert.equal(app.nodes.get('so').value,'0.3');
for(const [key,value] of Object.entries(collector))assert.equal(Number(app.nodes.get(key).value),key==='fcMPa'?Number((value*145.038).toPrecision(15)):value,key);
assert.ok(app.result()?.dMm>0);
const restored=mount({app:'aashto93-rigid-local',version:2,equationConstant:app.context.PavementCalc.CONSTANT,inputs:sample});
assert.equal(restored.nodes.get('jCondition').value,'undoweled-aggregate','Older cases with default J use the requested Undoweled default');
const transferRestored=mount({app:'aashto93-rigid-local',version:2,equationConstant:app.context.PavementCalc.CONSTANT,inputs:{...sample,j:3.05,jCondition:'crcp-hma'}});assert.equal(transferRestored.nodes.get('j').value,'3.05');assert.equal(transferRestored.nodes.get('jNoFigure').hidden,true);
assert.equal(Number(restored.nodes.get('fcMPa').value),3480.91);
const periodRestored=mount({app:'aashto93-rigid-local',version:2,equationConstant:app.context.PavementCalc.CONSTANT,inputs:{...sample,designYears:25}});assert.equal(periodRestored.nodes.get('rigidDesignYears').value,'25');
assert.ok(restored.result()?.dMm>0,'Saved project data must still restore');
const legacyInputs={...sample};delete legacyInputs.p0;const legacyRestored=mount({app:'aashto93-rigid-local',version:2,equationConstant:app.context.PavementCalc.CONSTANT,inputs:legacyInputs});assert.equal(legacyRestored.nodes.get('p0').value,'4.5');assert.equal(legacyRestored.nodes.get('dpsi').value,'2.00');assert.ok(legacyRestored.result()?.dMm>0);
assert.match(html.match(/<input id="dpsi"[^>]*>/)[0],/readonly/);
const strength=await readFile(new URL('../src/components/concrete-strength/index.html',import.meta.url),'utf8');
for(const id of ['reliability','fc','ps','z'])assert.doesNotMatch(strength.match(new RegExp(`<input id="${id}"[^>]*>`))[0],/\bvalue=/);
console.log('Recommended defaults, blank startup, calculation, reset and saved-case restoration passed.');

for(const [j,layout,figure] of [[3.8,'undoweled-aggregate','undoweled'],[3.2,'doweled-aggregate','doweled'],[2.7,'doweled-hma','doweled'],[2.9,'crcp-hma','crcp-hma'],[2.3,'crcp-pcc','crcp-pcc'],[3.05,'crcp-hma','crcp-hma'],[2.8,'crcp-pcc','crcp-pcc'],[3.5,'project',null],[2.2,'project',null]]){app.nodes.get('j').value=String(j);app.nodes.get('j').events.input();app.nodes.get('designForm').events.input();assert.equal(app.nodes.get('jCondition').value,layout,'Editing J selects a matching prescribed joint layout or Others');assert.equal(Number(app.nodes.get('j').value),j,'Matching does not overwrite the adopted coefficient');if(figure)assert.equal(app.nodes.get('jFigure').src,'./assets/load-transfer/'+figure+'.svg');}
