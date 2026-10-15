import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../src/components/design-traffic/',import.meta.url),context={};
for(const file of ['engine.js','vehicle-annex.js'])runInNewContext(await readFile(new URL(file,root),'utf8'),context);
const C=context.DesignTraffic,V=context.VehicleAnnex;
const sampleFactors=[V.calculate('1-2',33300).ef,C.axleFactor([.168,.2981,.2793,.2538].map(fraction=>40600*fraction/1000).join(','))];
const sample=C.forecast({aadt:[2197,1865],rates:[3.8,3.8],factors:sampleFactors,years:20,delay:0,dd:.5,dl:.5});
assert.ok(Math.abs(sample.total-140432208.59417623)<0.0001,'Reproduce attached worksheet with its entered fractions, applying DD/DL once');
assert.equal(Math.round(sample.total),140432209);
assert.ok(Math.abs(sample.detail[0].vehicles/.25-23389694.41810464)<.001);
const zero=C.forecast({aadt:[100,0],rates:[0,NaN],factors:[2,NaN],years:20,delay:0,dd:.5,dl:1});assert.equal(zero.total,730000);
const delayed=C.forecast({aadt:[100],rates:[5],factors:[1],years:1,delay:2,dd:1,dl:1});assert.ok(Math.abs(delayed.detail[0].opening-110.25)<1e-10);
const partial=C.forecast({aadt:[100,50],rates:[0,0],factors:[2,NaN],years:20,delay:0,dd:.5,dl:1,preview:true});assert.equal(partial.complete,false);assert.equal(partial.total,null);assert.equal(partial.subtotal,730000);
const byClass={aadt:Array(10).fill(100),rates:Array(10).fill(5),factors:Array(10).fill(1),years:20,delay:0,dd:.5,dl:1};assert.equal(C.cesal(byClass).total,C.forecast(byClass).total);
assert.throws(()=>C.forecast({...byClass,aadt:[-1],rates:[0],factors:[1]}));assert.throws(()=>C.forecast({...byClass,dd:0}));assert.throws(()=>C.forecast({...byClass,years:1.5}));assert.throws(()=>C.forecast({...byClass,delay:-1}));
console.log('Truck configuration forecast: supplied worksheet, zero growth, opening-year projection, partial EF, distribution and vehicle-class compatibility verified.');

const worksheetHtml=await readFile(new URL('index.html',root),'utf8');for(const id of ['sheetApply','sheetExport','sheetPrint','sheetEquation'])assert.ok(!worksheetHtml.includes('id="'+id+'"'),'Removed traffic control/note: '+id);
assert.match(worksheetHtml,/<details id="trafficCalculationSteps"[^>]*hidden/,'Calculation steps must start hidden');

const labelledTruck=V.diagram(V.profiles.find(p=>p.code==='1-1'),true);assert.ok(labelledTruck.includes('0.2W')&&labelledTruck.includes('0.8W'),'EF illustration must show each physical axle share');assert.ok(labelledTruck.includes('W = 18 t'));
