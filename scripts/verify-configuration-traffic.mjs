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

const labelledTruck=V.diagram(V.profiles.find(p=>p.code==='1-1'),true);assert.ok(labelledTruck.includes('0.2W')&&labelledTruck.includes('0.8W'),'EF illustration must show each physical axle share');assert.ok(!labelledTruck.includes('W = 18 t')&&!labelledTruck.includes('AXLE LOAD SCHEMATIC'),'Removed schematic caption');

assert.ok(!worksheetHtml.includes('<th>EF Source</th>'),'EF Source selector column is removed');assert.ok(labelledTruck.includes('class="axle-load-arrow"')&&labelledTruck.includes('stroke="#c43127"'),'Engineering axle loads use red arrows');assert.ok(labelledTruck.includes('3.6 t')&&labelledTruck.includes('14.4 t'),'Axle diagram shows source loads in tonnes');

runInNewContext(await readFile(new URL('custom-configuration.js',root),'utf8'),context);const custom=context.VehicleConfiguration;
const adopted=custom.validate({name:'Project truck',layout:'1-1',gvw:20000,fractions:'0.25, 0.75',useManual:false});assert.ok(Math.abs(adopted.ef-C.axleFactor('5,15'))<1e-12);
assert.equal(custom.validate({layout:'11-12',gvw:43500,fractions:'',useManual:true,manualEF:'2.5'}).ef,2.5);
for(const draft of [{layout:'1-1',gvw:0,fractions:'0.2,0.8'},{layout:'1-2',gvw:18000,fractions:'0.2,0.8'},{layout:'1-1',gvw:18000,fractions:'0.2,0.7'},{layout:'1-1',gvw:18000,fractions:'0.2,0.8',useManual:true,manualEF:-1}])assert.throws(()=>custom.validate(draft));
const escapedDiagram=V.diagram({...V.profiles[0],name:'<img src=x onerror=alert(1)>'},true);assert.ok(!escapedDiagram.includes('<img'));assert.ok(escapedDiagram.includes('&lt;img'));

// Verify the supplied Annex A code/weight pairs independently of EF calculations.
const magvw=[['1-1',18000],['1-2',33300],['1-3',35600],['11-1',34000],['11-2',40600],['11-3',41000],['12-1',39700],['12-2',41500],['12-3',42000],['11-11',39700],['11-12',43500],['12-11',43500],['12-12',45000]];
assert.equal(JSON.stringify(V.profiles.map(p=>[p.code,p.gvw])),JSON.stringify(magvw));
const wheels=[6,10,14,10,14,18,14,18,22,14,18,18,22];
V.profiles.forEach((p,i)=>assert.ok(p.name.includes('('+wheels[i]+' wheels)'),p.code+' Annex A wheel count'));
for(const code of ['11-1','11-2','11-3'])assert.match(V.profiles.find(p=>p.code===code).name,/Truck-trailer with 2 axles at motor vehicle/);
for(const code of ['12-1','12-2','12-3'])assert.match(V.profiles.find(p=>p.code===code).name,/Truck semi-trailer with 3 axles at motor vehicle/);
for(const removed of ['sheetSample','cesal-flow','Establish opening traffic','Enter annual-average two-way survey counts','Convert each vehicle loading case','Vehicle cases are linked to Section 1.'])assert.ok(!worksheetHtml.includes(removed),removed+' removed');
assert.match(worksheetHtml,/id="sheetSurvey" value="2025"/);assert.match(worksheetHtml,/id="sheetOpening" value="2026"/);
assert.ok(worksheetHtml.indexOf('id="sheetRows"')<worksheetHtml.indexOf('id="sheetAdd"'));

// Exercise the UI's actual percentage conversion against the supplied lane-factor table.
const controller=await readFile(new URL('configuration.js',root),'utf8');
const laneNodes={sheetLanes:{value:'1'},sheetDL:{value:'100',validity:{badInput:false}}};
const laneContext={$:id=>laneNodes[id]};
const laneStart=controller.indexOf('  const laneRanges=');
const laneEnd=controller.indexOf('\n',controller.indexOf('  const n=input=>',laneStart));
runInNewContext(controller.slice(laneStart,laneEnd),laneContext);
for(const [lanes,min,max] of [['1',100,100],['2',80,100],['3',60,80],['4',50,75]]){
  laneNodes.sheetLanes.value=lanes;laneContext.laneDefaults();assert.equal(laneNodes.sheetDL.value,String(max));
  for(const percent of [min,max]){laneNodes.sheetDL.value=String(percent);assert.equal(laneContext.laneFactor(),percent/100);}
  for(const percent of ['',min-.01,max+.01]){laneNodes.sheetDL.value=String(percent);assert.throws(()=>laneContext.laneFactor());}
}
laneNodes.sheetLanes.value='2';laneNodes.sheetDL.value='90.125';assert.equal(laneContext.laneFactor(),.90125);
assert.match(controller,/dl:laneFactor\(\),preview:true/,'Forecast must consume the validated fraction, not the displayed percent');
