import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const context={};runInNewContext(await readFile(new URL('../src/components/design-criteria/engine.js',import.meta.url),'utf8'),context);
const {build,assess}=context.DesignCriteria;
const base={classification:'primary',terrain:'level',otherClass:'functional',function:'collector',environment:'rural',adt:'',speed:''};
const value=(r,id)=>r.rows.find(row=>row.id===id).value;
// Explicit independently transcribed reference scenarios, DGCS Table 3-1 pp.3-2.
const cases=[['primary','level',80,220,4,560],['primary','rolling',60,120,5,420],['primary','mountainous',50,80,7,360],['secondary','level',70,160,5,490],['secondary','rolling',60,120,6,420],['secondary','mountainous',40,50,8,270]];
for(const [classification,terrain,speed,radius,grade,passing] of cases){const r=build({...base,classification,terrain});assert.equal(r.speed,speed);assert.equal(value(r,'radius'),radius);assert.equal(value(r,'grade'),grade);assert.equal(value(r,'passing'),passing);}
for(const [terrain,adt,speed] of [['level','399',60],['level','400',80],['rolling','2000',60],['mountainous','2001',60]]){const r=build({...base,classification:'tertiary',terrain,adt});assert.equal(r.speed,speed);assert.equal(value(r,'radius'),null);}
for(const [terrain,adt,speed] of [['level','49',50],['rolling','250',50],['mountainous','400',50]])assert.equal(build({...base,classification:'others',function:'local',terrain,adt}).speed,speed);
assert.equal(build({...base,classification:'others',otherClass:'fmr',terrain:'rolling'}).speed,40);
assert.equal(value(build({...base,classification:'others',otherClass:'barangay'}),'width'),5.5);
const changed=build({...base,speed:'100'});assert.equal(changed.changedSpeed,true);assert.equal(value(changed,'stopping'),185);assert.equal(value(changed,'radius'),220,'Baseline radius must not silently follow override');
assert.equal(build({...base,classification:'tertiary',adt:''}).speed,null);
assert.equal(build({...base,classification:'others',environment:'urban',adt:'1000'}).speed,null);
assert.throws(()=>build({...base,speed:'81'}));assert.throws(()=>build({...base,terrain:'bad'}));
assert.equal(assess({value:220,relation:'min'},'219'),'Review departure');assert.equal(assess({value:220,relation:'min'},'220'),'Meets baseline');assert.equal(assess({value:5,relation:'max'},'6'),'Review departure');assert.equal(assess({value:null,relation:'review'},'5'),'Project review');assert.equal(assess({value:5,relation:'min'},''),'Not adopted');assert.equal(assess({value:5,relation:'min'},'-1'),'Invalid');
console.log('Design criteria: 18 control scenarios, table boundaries, overrides, incomplete controls and adoption checks passed.');
