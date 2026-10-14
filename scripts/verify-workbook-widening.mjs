import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
const c={};for(const f of ['data.js','engine.js'])runInNewContext(await readFile(new URL('../src/components/road-widening/'+f,import.meta.url),'utf8'),c);
const golden=JSON.parse(await readFile(new URL('./workbook-widening-golden.json',import.meta.url),'utf8')),W=c.WorkbookWidening,config=W.config({...golden.input,emax:golden.input.emax*100});let count=0;
for(const [r,v,expected] of golden.cells){const actual=W.cell(config,r,v).value;assert.equal(actual,expected===''?null:expected,`Metric radius ${r}, speed ${v}`);count++;}
for(const source of c.WorkbookWideningData.vehicles){const p=W.config({vehicle:source.code,lanes:2,width:6.7,emax:8,clearance:''});assert.ok(Math.abs(p.vehicle.sumSquares-source.sumSquares)<1e-8,'Signed segment sum for '+source.code);}
const sample=W.config({vehicle:'WB-12',lanes:2,width:6.7,emax:8,clearance:''});assert.equal(sample.clearance,.775);assert.equal(W.minimum(sample,60),115);assert.equal(W.cell(sample,100,60).value,null);assert.equal(W.minimum({...sample,emax:.12},60),100);
assert.throws(()=>W.config({vehicle:'WB-12',lanes:2,width:6.5,emax:8,clearance:''}));assert.equal(W.config({vehicle:'WB-12',lanes:2,width:6.5,emax:8,clearance:1}).clearance,1);assert.throws(()=>W.config({vehicle:'bad',lanes:2,width:6.7,emax:8}));
console.log(`Workbook Metric: ${count} independently cached cells matched; 19 signed vehicle sums, clearance lookup/override and minimum-radius filters passed.`);
