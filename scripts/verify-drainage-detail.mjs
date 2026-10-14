import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
const c={};runInNewContext(await readFile(new URL('../src/components/design-criteria/drainage-detail.js',import.meta.url),'utf8'),c);
const build=c.DrainageDetail.build,b={drainageType:'lined',drainageWidth:1,drainageDepth:.6,drainageLining:100};
assert.equal(build(b).area,.6);assert.equal(build({...b,drainageType:'vditch'}).area,.3);assert.ok(Math.abs(build({...b,drainageType:'trapezoidal',drainageBottom:.5}).area-.45)<1e-9);
assert.equal(build({...b,drainageDepth:''}).area,null);assert.throws(()=>build({...b,drainageType:'trapezoidal',drainageBottom:2}));assert.throws(()=>build({...b,drainageDepth:-1}));
console.log('Drainage detail: rectangular, trapezoidal and V-ditch areas, missing dimensions and invalid sizes passed.');
