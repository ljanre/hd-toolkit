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
