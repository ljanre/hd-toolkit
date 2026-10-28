import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
const root=new URL('../src/components/hydrology-tool/',import.meta.url),context={};
for(const file of ['reference-data.js','engine.js'])runInNewContext(await readFile(new URL(file,root),'utf8'),context);
const H=context.Hydrology,R=context.HydrologyReferences,close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} differs from ${b}`);

// FHWA HDS-2 Example 5.5 (pp. 5-34–5-35). The book adopts rounded Tc=36 min,
// C≈0.32 and reports Q≈3.3 m³/s; retain the entered land-cover products exactly.
const example={areas:[{area:'21.8',c:'.20'},{area:'1.5',c:'.95'},{area:'20.4',c:'.40'}],unit:'ha',period:'25',rainPeriod:'25',tcMode:'manual',tc:'36',minimum:'',rainMode:'direct',intensity:'85',sourceDuration:'36'};
const r=H.calculate(example,R);close(r.basin.area,43.7);close(r.basin.ca,13.945);close(r.basin.c,.31910755148741415);close(r.q,3.2925694444444447);assert.equal(r.q.toFixed(1),'3.3');
for(const [unit,multiplier] of [['m2',10000],['km2',.01]])close(H.calculate({...example,unit,areas:example.areas.map(a=>({...a,area:Number(a.area)*multiplier}))},R).q,r.q);
const travel=H.travelTime([{method:'manual',length:90,velocity:.30},{method:'manual',length:300,velocity:.64},{method:'manual',length:650,velocity:.46}],R.velocities);
close(travel.minutes,36.36322463768116);
const empirical=H.travelTime([{method:'waterway',length:300,slope:2}],R.velocities);close(empirical.segments[0].velocity,.6462955980041685);close(empirical.minutes,300/(60*.457*10*Math.sqrt(.02)));
assert.throws(()=>H.travelTime([{method:'manual',length:1,velocity:0}],R.velocities));assert.throws(()=>H.travelTime([{method:'waterway',length:1,slope:-2}],R.velocities));
const curve=H.curve([{duration:10,intensity:120},{duration:40,intensity:60}],'log');
close(H.interpolate(curve,20).intensity,120/Math.sqrt(2));assert.equal(H.interpolate(curve,10).exact,true);assert.equal(H.interpolate(curve,40).intensity,60);
close(H.interpolate(H.curve(curve.data,'linear'),20).intensity,100);
assert.throws(()=>H.interpolate(curve,5),/extrapolation/);assert.throws(()=>H.interpolate(curve,60),/extrapolation/);
for(const points of [[{duration:10,intensity:100},{duration:10,intensity:90}],[{duration:10,intensity:90},{duration:20,intensity:100}],[{duration:10,intensity:''}],[{duration:-1,intensity:100}]])assert.throws(()=>H.curve(points,'log'));
assert.equal(H.interpolate(H.curve([{duration:10,intensity:80}],'log'),10).intensity,80);
const withTable=H.calculate({...example,tc:'20',rainMode:'idf',points:curve.data,interpolation:'log'},R);close(withTable.q,13.945*120/Math.sqrt(2)/360);
const floor=H.calculate({...example,tc:10,minimum:36},R);assert.equal(floor.tc,10);assert.equal(floor.duration,36);close(floor.q,r.q);
assert.throws(()=>H.calculate({...example,tc:10},R),/duration/);assert.throws(()=>H.calculate({...example,rainPeriod:50},R),/match/);
const bySegments=H.calculate({...example,tcMode:'segments',segments:travel.segments,sourceDuration:travel.minutes},R);close(bySegments.tc,travel.minutes);close(bySegments.q,r.q);

// HDS-2 Eq. (5.31): 1 ha long branch C=.5 and 1 ha short branch C=.8.
// Q(20 min)=80*(.5+.8)/360; Q'(10 min)=120*(.5*10/20+.8)/360=.35.
const branches={areas:[{area:1,c:.5},{area:1,c:.8}],unit:'ha',period:10,rainPeriod:10,tcMode:'manual',tc:20,rainMode:'idf',points:[{duration:10,intensity:120},{duration:20,intensity:80}],interpolation:'log',critical:true,shortArea:1,shortC:.8,shortTc:10};
const critical=H.calculate(branches,R);close(critical.base,104/360);close(critical.critical.q,.35);close(critical.q,.35);assert.equal(critical.criticalControls,true);
const longer=H.calculate({...branches,points:[{duration:10,intensity:80},{duration:20,intensity:80}]},R);assert.equal(longer.criticalControls,false);close(longer.q,104/360);
close(H.calculate({...branches,rainMode:'direct',intensity:80,sourceDuration:20,shortIntensity:120},R).q,.35);
assert.throws(()=>H.calculate({...branches,shortArea:2},R));assert.throws(()=>H.calculate({...branches,shortC:1,shortArea:1.5},R));assert.throws(()=>H.calculate({...branches,shortTc:20},R));
for(const bad of [{areas:[{area:80,c:.5}]},{areas:[{area:0,c:.5}]},{areas:[{area:-1,c:.5}]},{areas:[{area:1,c:1.01}]},{areas:[{area:1,c:''}]},{intensity:0},{tc:0},{period:1},{minimum:-1}])assert.throws(()=>H.calculate({...example,...bad},R));
const zero=H.calculate({...example,areas:[{area:1,c:0},{area:'',c:''},{area:0,c:''}]},R);assert.equal(zero.q,0);assert.equal(zero.basin.area,1);
close(H.calculate({...example,areas:[{area:79.9999,c:.5}]},R).basin.area,79.9999);
const ranges=[['asphalt',.70,.95],['concrete',.80,.95],['brick',.70,.85],['walks',.75,.85],['roofs',.75,.95],['sandy-flat',.05,.10],['sandy-average',.10,.15],['sandy-steep',.15,.20],['heavy-flat',.13,.17],['heavy-average',.18,.22],['heavy-steep',.25,.35],['parks',.10,.25],['playgrounds',.20,.40],['railroad',.20,.40],['unimproved',.10,.30],['downtown',.70,.95],['neighborhood',.50,.70],['single',.30,.50],['detached',.40,.60],['attached',.60,.75],['suburban',.25,.40],['apartments',.50,.70],['light',.50,.80],['heavy',.60,.90]];
assert.equal(JSON.stringify(R.coefficients.map(r=>[r.id,r.min,r.max])),JSON.stringify(ranges));
assert.equal(JSON.stringify(R.velocities.map(r=>r.k)),JSON.stringify([.076,.152,.213,.274,.305,.457,.491,.619]));
const pdf=await readFile(new URL('fhwa-hds2-excerpts.pdf',root));assert.equal(createHash('sha256').update(pdf).digest('hex'),'4e042aa72f44b1121f75f8b1015ed8e41e9786191813d2e31d0ec1059d80bfe4');
console.log('Hydrology: published worked example, SI conversion, weighted C, velocity/Tc, interpolation boundaries, period/duration matching, two-branch control, limitations and source transcription verified.');
