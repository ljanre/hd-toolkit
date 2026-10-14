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
// Independent readings from the supplied PDF, printed pp.3-2–3-3.
for(const [classification,terrain,speed,radius,grade,passing] of [
 ['primary','level',95,320,3,645],['primary','rolling',80,220,5,560],['primary','mountainous',60,120,6,420],
 ['secondary','level',90,280,3,615],['secondary','rolling',80,220,5,560],['secondary','mountainous',50,80,6,350],
 ['expressway','level',100,350,3,675],['expressway','rolling',90,280,4,615],['expressway','mountainous',70,160,5,490]
]){const r=build({...base,classification,terrain,standardLevel:'desirable'});assert.equal(r.speed,speed);assert.equal(value(r,'radius'),radius);assert.equal(value(r,'grade'),grade);assert.equal(value(r,'passing'),passing);}
const tourism=build({...base,classification:'tourism'});assert.equal(value(tourism,'pccThickness'),230);assert.equal(value(tourism,'pccCrossfall'),1.5);assert.equal(value(tourism,'acpCrossfall'),2);assert.equal(value(tourism,'row'),null);assert.equal(value(tourism,'superelevation'),null);assert.equal(value(tourism,'verticalLength'),60);
for(const [classification,width,row,grade] of [['provincial',6.1,15,6],['city',6.1,15,6],['municipal',6.1,15,6],['barangay',4,10,10],['fmr',4,6,10]]){const r=build({...base,classification,basis:'system'});assert.equal(value(r,'width'),width);assert.equal(value(r,'row'),row);assert.equal(value(r,'grade'),grade);}
const primarySystem=build({...base,basis:'system'});assert.equal(value(primarySystem,'row'),20);assert.equal(value(primarySystem,'grade'),6);
const desirable=build({...base,standardLevel:'desirable'});assert.equal(value(desirable,'stopping'),null,'95 km/h has no Table 3-8 entry');assert.equal(value(desirable,'nonpassing'),150);
assert.equal(build({...base,classification:'expressway'}).sectionApplicable,false);
assert.throws(()=>build({...base,classification:'tertiary',basis:'table'}));
const functional=build({...base,classification:'tertiary',adt:'1000'});assert.equal(value(functional,'width'),6.6);assert.equal(value(functional,'shoulder'),1.5);assert.equal(value(functional,'grade'),6);assert.equal(value(functional,'passing'),245);
assert.equal(value(build({...base,classification:'others',function:'local',terrain:'mountainous',adt:'500'}),'width'),5.4);
assert.equal(assess({value:1.5,relation:'target'},'2'),'Review departure');
console.log('Attached manual: desirable standards, tourism-only provisions, system classes, functional widths/grades and unsupported cases passed.');
