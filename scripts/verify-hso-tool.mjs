import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const context={};
for(const file of ['alignment-curve-checker/engine.js','hso-tool/engine.js'])runInNewContext(await readFile(new URL('../src/components/'+file,import.meta.url),'utf8'),context);
const C=context.AlignmentChecker,H=context.HSOTool;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
for(const [V,G,t,a,Rs] of [[20,0,2.5,3.4,100],[30,-6,2.5,3.4,150],[40,6,2.5,3.4,200],[50,0,2.5,3.4,250],[60,-3,2.5,3.4,300],[70,3,2.5,3.4,350],[80,0,3,3.4,400],[90,-6,2,4,500],[100,6,2.5,3.4,600],[120,0,2.5,4,700]]){
 const S=278*V*t/1000+(V/Math.sqrt(254))**2/(a/9.81+G/100),x=Rs*Math.sin(S/(2*Rs)),required=Rs-Math.sqrt(Rs*Rs-x*x);
 const row={id:'HSO',delta:90,designSpeed:V,grade:G,sightRadius:Rs,availableOffset:required+.1};
 const [pass]=H.assess([row],{reactionTime:t,deceleration:a});near(pass.S,S);near(pass.required,required);assert.equal(pass.status,'PASS');
 const [fail]=H.assess([{...row,availableOffset:Math.max(0,required-.01)}],{reactionTime:t,deceleration:a});assert.equal(fail.status,'FAIL');
}
for(const [turn,radius,gap] of [['L',200,30],['L',200,20],['R',225,0],['R',300,0],['R',200,20],['R',200,60],['R',150,0],['L',100,0],['L',800,45],['R',500,100]]){
 const a=C.geometry(150,40),b=C.geometry(radius,35),rows=[{id:'A',piStation:1000+a.T,r:150,delta:40,turn:'R',designSpeed:0,sightRadius:'invalid'},{id:'B',piStation:1000+a.L+gap+b.T,r:radius,delta:35,turn}];
 const solved=C.alignmentSchedule(rows);assert.equal(solved.errors.length,0);near(solved.curves[1].gap,gap);assert.equal(solved.sightOffsets.length,0);assert.equal(solved.checklist.length,3);assert.ok(solved.checks.every(c=>!/sight|superelevation|friction/i.test(c.subject)));
 assert.ok(!C.alignmentChatTable(rows,solved).includes('HSO'));assert.ok(!C.alignmentChatTable(rows,solved).includes('Horizontal sight offset'));
}
const partial=H.assess([{id:'Partial',delta:90,designSpeed:40,grade:0,sightRadius:100}])[0];assert.equal(partial.status,'NOT EVALUATED');assert.ok(partial.required>0);assert.equal(partial.available,null);
const chain=C.stationSchedule([{id:'A',piStation:2000,delta:90,r:100,turn:'R',designSpeed:40,grade:0,sightRadius:100}]);assert.equal(chain.errors.length,0);assert.equal(chain.sightOffsets[0].status,'NOT EVALUATED');
assert.equal(H.assess([{delta:5,designSpeed:100,grade:0,sightRadius:100,availableOffset:20}])[0].required,null);
for(const delta of ['',0,180,'bad'])assert.equal(H.assess([{delta}])[0].status,'NOT EVALUATED');
const row={id:'Curve-1',station:'2+000',delta:90,sightRadius:100,sightDistance:50,availableOffset:10};const result=H.assess([row]);assert.equal(result[0].status,'PASS');assert.match(H.table([row],result),/Station reference/);assert.match(H.table([row],result),/Required HSO/);
const alignmentHtml=await readFile(new URL('../src/components/alignment-curve-checker/index.html',import.meta.url),'utf8');assert.doesNotMatch(alignmentHtml,/HSO|Reaction time|Deceleration|Path radius|Adopted S/);assert.match(alignmentHtml,/<h1>Alignment Check/);
const registry=await readFile(new URL('../src/tool-registry.js',import.meta.url),'utf8');assert.match(registry,/title: 'HSO Tool', group: 'geometry'/);assert.match(registry,/title: 'Alignment Checker'/);
console.log('HSO separation: 10 independent SSD/HSO cases, 10 alignment isolation cases, partial inputs, limits, copy and navigation passed.');
