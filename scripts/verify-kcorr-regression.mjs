import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
const root=new URL('../src/',import.meta.url),baseline=JSON.parse(await readFile(new URL('./kcorr-calculation-baseline.json',import.meta.url),'utf8'));
const hash=text=>createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex'),context={};
// V8/libm can differ in the final floating-point bits across supported Node versions.
// Normalize checkout line endings only; keep engine contents and result structures exact.
// Bound only numerical roundoff in calculated results.
function equivalent(actual,expected,path='result'){
 if(typeof expected==='number'){
  assert.equal(typeof actual,'number',path);assert.ok(Number.isFinite(actual),path);
  assert.ok(Math.abs(actual-expected)<=1e-10+Math.abs(expected)*1e-12,`${path}: ${actual} differs from ${expected}`);return;
 }
 if(expected&&typeof expected==='object'){
  assert.deepEqual(Object.keys(actual),Object.keys(expected),path+' structure');
  for(const key of Object.keys(expected))equivalent(actual[key],expected[key],path+'.'+key);return;
 }
 assert.equal(actual,expected,path);
}

for(const [file,expected] of Object.entries(baseline.files)){
 const source=await readFile(new URL(file,root),'utf8');assert.equal(hash(source),expected,'Calculation engine changed since pre-kcorr reference '+baseline.referenceCommit+': '+file);
 if(file.startsWith('components/subgrade-reaction/'))runInNewContext(source,context);
}
const html=await readFile(new URL('index.html',root),'utf8'),core=html.match(/<script id="calculation-core">([\s\S]*?)<\/script>/)[1];
assert.equal(hash(core),baseline.coreHash,'Rigid slab equation and solver must match the pre-kcorr reference');runInNewContext(core,context);
const f=baseline.foundation,readings=[];
for(const DSB of f.dsb)for(const ESB of f.esb)for(const MR of f.mr){const c=context.NomographExtension.calculate({DSB,ESB,MR});for(const LS of f.ls){const l=context.LossSupportCalculation.calculate(c.result,LS);readings.push([DSB,ESB,MR,LS,c.result,c.range_status,l.result,l.status]);}}
assert.equal(readings.length,f.cases);equivalent(readings,f.expected,'foundation');
const slabs=baseline.pavement.inputs.map(input=>context.PavementCalc.solve(input));assert.equal(slabs.length,baseline.pavement.cases);equivalent(slabs,baseline.pavement.expected,'slab');
console.log(`Pre-kcorr baseline ${baseline.referenceCommit}: ${f.cases} foundation/correction cases and ${slabs.length} full slab results match within floating-point roundoff; all protected engineering engines are unchanged.`);
