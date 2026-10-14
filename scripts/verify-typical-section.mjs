import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const c={};runInNewContext(await readFile(new URL('../src/components/design-criteria/section-engine.js',import.meta.url),'utf8'),c);
const {build,range}=c.TypicalSection;
const base={width:6.7,shoulder:2.5,crossfall:2,shoulderFall:3,thickness:200,leftGround:1,rightGround:-1,cutSlope:2,fillSlope:2};
const mixed=build(base);assert.ok(mixed.complete);assert.ok(mixed.cutArea>0&&mixed.fillArea>0);
assert.equal(mixed.half,3.35);assert.equal(mixed.edge,5.85);
assert.ok(Math.abs(mixed.formation[2][1]+.2)<1e-9);
for(const k of ['left','right']){const t=mixed[k];assert.ok(Math.abs(t.point[1]-mixed.ground(t.point[0]))<1e-9);}
const cut=build({...base,leftGround:1,rightGround:1,crossfall:0,shoulderFall:0});assert.equal(cut.fillArea,0);assert.ok(Math.abs(cut.cutArea-(11.7*1.2+2*1.2**2))<1e-9,'Rectangle + two side triangles');
const fill=build({...base,leftGround:-1,rightGround:-1,crossfall:0,shoulderFall:0});assert.equal(fill.cutArea,0);assert.ok(Math.abs(fill.fillArea-(11.7*.8+2*.8**2))<1e-9);
const atGrade=build({...base,leftGround:-.2,rightGround:-.2,crossfall:0,shoulderFall:0});assert.equal(atGrade.cutArea,0);assert.equal(atGrade.fillArea,0);
assert.throws(()=>build({...base,width:null}));assert.throws(()=>build({...base,shoulder:-1}));assert.throws(()=>build({...base,fillSlope:0}));
assert.equal(range('softClay',6),null);assert.deepEqual(Array.from(range('softClay',3)),[2.5,3]);assert.deepEqual(Array.from(range('strongRock',12)),[.75,1.2]);
assert.ok(build({...base,leftGround:20,rightGround:-20}).warnings.length>0,'Impossible daylight intersections must warn');
console.log('Typical section: mixed/cut/fill geometry, independent areas, dimensions, daylight, invalid inputs and material ranges passed.');

const sup=build({...base,condition:'superelevated',superelevation:6,direction:'right'});
assert.ok(Math.abs(sup.top[1][1]-.201)<1e-9);assert.ok(Math.abs(sup.top[3][1]+.201)<1e-9);
assert.equal(sup.top[2][1],0);assert.ok(Math.abs(sup.top[4][1]+.351)<1e-9);
for(const key of ['left','right'])assert.ok(Math.abs(sup[key].point[1]-sup.ground(sup[key].point[0]))<1e-9);
const mirror=build({...base,condition:'superelevated',superelevation:6,direction:'left',leftGround:-1,rightGround:1});
assert.ok(Math.abs(mirror.cutArea-sup.cutArea)<1e-9);assert.ok(Math.abs(mirror.fillArea-sup.fillArea)<1e-9);
assert.throws(()=>build({...base,condition:'superelevated',superelevation:13}));
console.log('Superelevation: 6% edge heights, centreline rotation, shoulder continuation, daylight and mirrored earthwork passed.');

const layers=build({...base,baseThickness:150,subbaseThickness:200});
assert.equal(layers.p.totalThickness,550);assert.ok(Math.abs(layers.formation[2][1]+.55)<1e-9);assert.ok(Math.abs(layers.pavementBottom[2][1]+.2)<1e-9);assert.ok(Math.abs(layers.baseBottom[2][1]+.35)<1e-9);
assert.ok(layers.cutArea>mixed.cutArea&&layers.fillArea<mixed.fillArea);
assert.throws(()=>build({...base,baseThickness:-1}));assert.throws(()=>build({...base,subbaseThickness:'bad'}));
console.log('Layered formation: independent pavement/base/subbase boundaries, earthwork changes and invalid thickness checks passed.');

const four=build({...base,lanes:4});assert.equal(four.p.width,13.4);assert.equal(four.p.laneWidth,3.35);
const divided=build({...base,lanes:4,laneWidth:3.5,medianEnabled:true,medianWidth:2});assert.equal(divided.p.width,16);assert.equal(divided.edge,10.5);
assert.equal(build({...base,lanes:4,laneWidth:3.5,medianEnabled:false,medianWidth:2}).p.width,14);
assert.equal(build({...base,lanes:4,medianEnabled:true,medianWidth:''}).p.medianWidth,0);
assert.throws(()=>build({...base,lanes:3,medianEnabled:true}));assert.throws(()=>build({...base,lanes:4,laneWidth:-1}));
console.log('Lane/median layout: preserved lane width, actual platform span, disabled/unknown median and symmetric-layout validation passed.');
