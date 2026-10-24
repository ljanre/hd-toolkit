import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const folder = new URL('../src/components/seismic-coefficients/', import.meta.url);
const context = {};
runInNewContext(await readFile(new URL('engine.js',folder),'utf8'),context);
const { calculate, toG, gravity } = context.SeismicCoefficients;
const close = (actual,expected) => assert.ok(Math.abs(actual-expected) <= 1e-12 * Math.max(1,Math.abs(expected)),`${actual} vs ${expected}`);
const base = {pga:0.6,unit:'g',fpga:0.88,foundation:'other',analysisCase:'wall-example',layer:'rock-1000'};
let result = calculate(base);
// Guide Ch. 5 PGA=0.6, Fpga=0.88. Keep As=0.528 without the example's early rounding to 0.53.
close(result.as,0.528);close(result.kh0,0.528);close(result.kh,0.264);assert.equal(result.kv,0);assert.equal(result.conditional,true);
// Ch. 7, p.7-10 example: entered As=0.53 gives kh0=0.53 and half kh=0.265.
result=calculate({...base,pga:0.53,fpga:1});close(result.kh,0.265);
result=calculate({...base,pga:0.53,fpga:1,foundation:'rock'});close(result.kh0,0.636);close(result.kh,0.318);
for (const foundation of ['other','rock']) for (const analysisCase of ['unreduced','wall-example']) {
  for (const [unit,pga] of [['g',0.4],['percent',40],['ms2',0.4*gravity]]) {
    const output=calculate({...base,pga,unit,foundation,analysisCase});
    const expected=0.4*0.88*(foundation==='rock'?1.2:1)*(analysisCase==='unreduced'?1:0.5);
    close(output.kh,expected);assert.equal(output.kv,0);
  }
}
close(toG(40,'percent'),0.4);close(toG(9.80665,'ms2'),1);
for(const pga of [0,-1,NaN,Infinity,'0.4',null,undefined])assert.throws(()=>calculate({...base,pga}));
for(const fpga of [0,-1,NaN,Infinity,'1',null])assert.throws(()=>calculate({...base,fpga}));
for(const key of ['unit','foundation','analysisCase','layer'])for(const value of ['',null,'__proto__','unlisted'])assert.throws(()=>calculate({...base,[key]:value}));
assert.throws(()=>calculate({...base,pga:Number.MAX_VALUE,fpga:2}));
// Record map selection without inventing a hazard value or converting return periods.
for(const layer of ['rock-500','rock-1000','rock-2500','project'])close(calculate({...base,layer}).kh,0.264);
const ids=['pga','unit','fpga','foundation','analysis-case','layer','project','reference','error','result-status','kh','kv','normalized','as','kh0','formula','audit','audit-source','audit-project','audit-reference','clear','print','seismic-form'];
const nodes = new Map(ids.map(id => [id,{id,value:'',valueAsNumber:NaN,validity:{badInput:false},dataset:{},attributes:{},handlers:{},
  addEventListener(type,fn){this.handlers[type]=fn;},removeAttribute(key){delete this.attributes[key];},setAttribute(key,value){this.attributes[key]=value;},focus(){this.focused=true;}
}]));
// Test doubles mirror number inputs' valueAsNumber and sanitizing empty assignment.
for(const id of ['pga','fpga']){const input=nodes.get(id);let value='';Object.defineProperty(input,'value',{get(){return value;},set(next){value=String(next);input.valueAsNumber=value===''?NaN:Number(value);}});}
nodes.get('unit').value='g';nodes.get('analysis-case').value='unreduced';
context.document={getElementById:id=>nodes.get(id)};let prints=0;context.window={print(){prints++;}};
runInNewContext(await readFile(new URL('app.js',folder),'utf8'),context);
const set=(id,value,event='input')=>{nodes.get(id).value=String(value);nodes.get(id).handlers[event]();};
assert.equal(nodes.get('kh').textContent,'—');assert.equal(nodes.get('kv').textContent,'—');
set('pga',0.6);set('fpga',0.88);set('foundation','other');assert.equal(nodes.get('kh').textContent,'—','Source basis remains required');
set('layer','rock-1000');assert.equal(nodes.get('kh').textContent,'0.528');assert.equal(nodes.get('kv').textContent,'0');
set('analysis-case','wall-example','change');assert.equal(nodes.get('kh').textContent,'0.264');assert.equal(nodes.get('result-status').dataset.state,'conditional');
set('foundation','rock','change');assert.equal(nodes.get('kh').textContent,'0.3168');
set('project','<script>test</script>');assert.equal(nodes.get('audit-project').textContent,'<script>test</script>');
set('reference','Report ABC');assert.equal(nodes.get('audit-reference').textContent,'Report ABC');
set('unit','percent','change');close(nodes.get('pga').valueAsNumber,60);assert.equal(nodes.get('kh').textContent,'0.3168');
set('unit','ms2','change');close(nodes.get('pga').valueAsNumber,0.6*gravity);assert.equal(nodes.get('kh').textContent,'0.3168');
set('fpga',-1);assert.equal(nodes.get('error').hidden,false);assert.equal(nodes.get('kh').textContent,'—');assert.equal(nodes.get('audit').hidden,true);
set('fpga','');assert.equal(nodes.get('error').hidden,true);assert.equal(nodes.get('kh').textContent,'—');
set('fpga',1);nodes.get('pga').validity.badInput=true;nodes.get('pga').handlers.input();assert.equal(nodes.get('error').hidden,false);
nodes.get('pga').validity.badInput=false;
nodes.get('print').handlers.click();assert.equal(prints,1);
let prevented=false;nodes.get('seismic-form').handlers.submit({preventDefault(){prevented=true;}});assert.equal(prevented,true);
nodes.get('clear').handlers.click();
for(const id of ['pga','fpga','foundation','layer','project','reference'])assert.equal(nodes.get(id).value,'');
assert.equal(nodes.get('unit').value,'g');assert.equal(nodes.get('analysis-case').value,'unreduced');assert.equal(nodes.get('kh').textContent,'—');assert.equal(nodes.get('kv').textContent,'—');assert.equal(nodes.get('pga').focused,true);
console.log('Seismic coefficients: DPWH numerical examples, full precision, foundation factors, analysis cases, unit conversion, validation, live updates and Clear passed.');
