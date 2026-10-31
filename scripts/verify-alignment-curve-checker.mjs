import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),context={};
runInNewContext(await readFile(new URL('src/components/alignment-curve-checker/engine.js',root),'utf8'),context);
const C=context.AlignmentChecker,results=[];
const near=(actual,expected,tol=1e-7)=>assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),actual+' vs '+expected);
const test=(name,fn)=>{const details=fn()||{};results.push({name,status:'PASS',...details});};
const row=(id,r,delta,turn,gap='',piStation='')=>({id,r,delta,turn,gap,piStation});
const opts={mode:'sequential',startE:0,startN:0,startAz:0,startStation:1000,minimumTangent:30,maximumRatio:1.5};
function oracle(R,degrees,azimuth,turn,e=0,n=0){
 // Independent center + rotation construction, using Cartesian counterclockwise rotation.
 const a=azimuth*Math.PI/180,d=degrees*Math.PI/180,s=turn==='R'?1:-1;
 const center={e:e+s*R*Math.cos(a),n:n-s*R*Math.sin(a)};
 const ve=e-center.e,vn=n-center.n,theta=-s*d;
 return {e:center.e+ve*Math.cos(theta)-vn*Math.sin(theta),n:center.n+ve*Math.sin(theta)+vn*Math.cos(theta)};
}
test('Angle and station parsing',()=>{near(C.angle('68°35′12″'),68+35/60+12/3600);near(C.station('2+100.125'),2100.125);assert.equal(C.formatStation(1999.9996),'2+000.000');assert.throws(()=>C.angle('30°60′00″'));assert.throws(()=>C.station('2+1000'));});
for(const [R,d,az,turn]of [[150,40,0,'R'],[200,35,40,'L'],[100,90,0,'R'],[100,90,90,'L'],[1,179.9,315,'R'],[8000,.000001,123,'L'],[30,68+35/60+12/3600,181,'R'],[250,120,270,'L'],[1e6,.01,45,'R'],[147,7.3,359,'L']]){
 test('Independent rotation: R='+R+' Δ='+d+' az='+az+' '+turn,()=>{
  const g=C.geometry(R,d),solved=C.analyze([row('A',R,d,turn)],{...opts,startAz:az}),c=solved.curves[0],expected=oracle(R,d,az,turn);
  assert.equal(solved.errors.length,0);near(c.pt.x,expected.e,1e-7);near(c.pt.y,expected.n,1e-7);
  near(C.distance(c.pc,c.pt),g.chord,1e-8);near(C.distance(c.pc,c.center),R,1e-8);near(C.distance(c.pt,c.center),R,1e-8);
  near(g.L,R*d*Math.PI/180,1e-10);near(c.ptStation,1000+g.L,1e-10);
  // Independent external distance through T tan(delta/4).
  near(g.external,g.T*Math.tan(d*Math.PI/720),1e-7);
  near(c.endAz,((az+(turn==='R'?1:-1)*d)%360+360)%360);
  return {inputs:{R,delta:d,azimuth:az,turn},expectedEndpoint:expected,actualEndpoint:{e:c.pt.x,n:c.pt.y},tolerance:'1e-7 relative / absolute',curveLength:g.L};
 });
}
test('Worked quarter-circle benchmark',()=>{const g=C.geometry(100,90);near(g.T,100);near(g.L,50*Math.PI);near(g.chord,100*Math.SQRT2);near(g.external,100*(Math.SQRT2-1));near(g.middle,100*(1-Math.SQRT1_2));return {R:100,delta:90,expectedT:100,actualT:g.T,expectedL:50*Math.PI,actualL:g.L};});
test('FHWA worked geometry benchmark (same units)',()=>{const g=C.geometry(1250,84.7114);assert.ok(Math.abs(g.L-1848.12)<.02);assert.ok(Math.abs(g.T-1139.64)<.02);return {inputs:{R:1250,delta:84.7114},expected:{L:1848.12,T:1139.64},actual:{L:g.L,T:g.T},tolerance:'.02 source rounding'};});
for(const [name,turn,r,gap,status,kind]of [
 ['Reverse exact threshold','L',200,30,'PASS','Reverse'],
 ['Reverse deficiency','L',200,20,'FAIL','Reverse'],
 ['Reverse zero tangent','L',200,0,'FAIL','Reverse'],
 ['Compound exact ratio','R',225,0,'PASS','Compound'],
 ['Compound ratio deficiency','R',300,0,'FAIL','Compound'],
 ['Equal radius direct connection','R',150,0,'PASS','Same-radius connection'],
 ['Broken-back short tangent','R',200,20,'WARNING','Same-direction with tangent'],
 ['Same-direction longer tangent','R',200,30,'NOT EVALUATED','Same-direction with tangent']
])test(name,()=>{const model=C.analyze([row('A',150,40,'R'),row('B',r,35,turn,gap)],opts);assert.equal(model.errors.length,0);assert.equal(model.pairs[0].status,status);assert.equal(model.pairs[0].kind,kind);near(model.curves[1].pcStation,1000+150*40*Math.PI/180+gap);return {inputs:{r1:150,r2:r,gap,turn},expected:status,actual:model.pairs[0].status,deficiency:model.pairs[0].deficiency};});
test('Coordinate PI and station chain round trip',()=>{
 const base=C.analyze([row('A',150,40,'R'),row('B',200,35,'L',30),row('C',180,25,'R',45)],{...opts,startE:496200,startN:1790800,startAz:30});
 const rows=base.curves.map(c=>({id:c.id,n:c.pi.y,e:c.pi.x,piStation:c.piStation,r:c.R,delta:c.delta,turn:c.s===1?'R':'L',givenT:c.T,givenPC:c.pcStation,givenL:c.L,givenPT:c.ptStation}));
 const solved=C.analyze(rows,{...opts,mode:'pi',startAz:''});assert.equal(solved.errors.length,0);assert.equal(solved.summary.failed,0);assert.equal(solved.summary.continuous,true);
 solved.curves.forEach((c,i)=>{near(c.pc.x,base.curves[i].pc.x);near(c.pc.y,base.curves[i].pc.y);near(c.pt.x,base.curves[i].pt.x);near(c.ptStation,base.curves[i].ptStation);});
 const inferred=structuredClone(rows);inferred[1].turn='AUTO';inferred[1].delta='';const auto=C.analyze(inferred,{...opts,mode:'pi',startAz:''});near(auto.curves[1].delta,35);assert.equal(auto.curves[1].s,-1);
 rows[1].delta=30;const inconsistent=C.analyze(rows,{...opts,mode:'pi',startAz:''});assert.ok(inconsistent.summary.failed>0);assert.ok(inconsistent.pairs.some(p=>p.status==='NOT EVALUATED'));
 return {inputs:'three PI coordinates from independently connected curves',expected:'no residual failures; interior Auto turn/angle matches; altered angle flagged',actual:'PASS'};
});
test('Supplied schedule residuals and station-controlled overlap',()=>{
 const model=C.analyze([row('A',100,90,'R','','1+100'),{...row('B',100,90,'L',0,'1+200'),givenL:1}],opts);
 assert.ok(model.checks.some(c=>c.subject.includes('entered Lc')&&c.status==='FAIL'));assert.equal(model.summary.continuous,false);assert.equal(model.pairs[0].kind,'Overlap');assert.equal(model.pairs[0].status,'FAIL');
});
test('Invalid data prevents stale geometric output',()=>{
 for(const bad of [{r:0},{r:-1},{delta:180},{delta:0},{delta:'bad'},{turn:'AUTO'},{r:''},{piStation:'-1'}]){
  const m=C.analyze([{...row('A',150,40,'R'),...bad}],opts);assert.ok(m.errors.length||m.summary.failed>0);
  if(m.errors.length)assert.equal(m.curves.length,0);
 }
 const empty=C.analyze([],opts);assert.ok(empty.errors.length);
 const wrong=C.analyze([row('A',100,40,'R')],{...opts,mode:'pi'});assert.ok(wrong.errors.length);
});
test('Attachment-style import ignores e and D',()=>{
 const text='PI NO.\tNORTHING\tEASTING\tPI STATION\tI\tR\tT\te\tD\tPC\tLc\tPT\nPI-1\t1790862.026\t496238.688\t2+100\t68°35′12″\t30\t20.46\t6.31\t57°17′45″\t2+079.54\t35.91\t2+115.45';
 const parsed=C.parseTable(text);assert.equal(parsed[0].r,'30');assert.equal(parsed[0].givenL,'35.91');assert.equal(parsed[0].givenT,'20.46');assert.equal(parsed[0].turn,'AUTO');assert.equal(parsed[0].e,'496238.688');
});
test('CSV round trip and spreadsheet formula protection',()=>{
 const original=[['PI-1','1790','496','2+100','68°35′12″','30','R']];
 const csv=C.csv(['PI NO.','NORTHING','EASTING','PI STATION','I','R','TURN'],original);
 const parsed=C.parseTable(csv);assert.equal(parsed[0].delta,original[0][4]);assert.equal(parsed[0].turn,'R');
 assert.ok(C.csv(['id'],[['=1+1']]).includes("'=1+1"));
});
test('Checklist — reverse tangent Yes and compound N/A',()=>{const m=C.analyze([row('A',150,40,'R'),row('B',200,35,'L',30)],opts);const x=C.complianceChecklist(m);assert.equal(x[0].answer,'N/A');assert.equal(x[1].answer,'YES');assert.equal(x[2].answer,'YES');assert.equal(x[3].answer,'NOT EVALUATED');});
test('Checklist — reverse tangent No',()=>{const m=C.analyze([row('A',150,40,'R'),row('B',200,35,'L',20)],opts);assert.equal(m.checklist[1].answer,'NO');assert.match(m.checklist[1].reason,/20.0000/);});
test('Checklist — compound radius Yes',()=>{const m=C.analyze([row('A',150,40,'R'),row('B',225,35,'R',0)],opts);assert.equal(m.checklist[0].answer,'YES');assert.equal(m.checklist[1].answer,'N/A');});
test('Checklist — compound radius No',()=>{const m=C.analyze([row('A',150,40,'R'),row('B',300,35,'R',0)],opts);assert.equal(m.checklist[0].answer,'NO');});
test('Checklist — broken-back absence No',()=>{const m=C.analyze([row('A',150,40,'R'),row('B',200,35,'R',20)],opts);assert.equal(m.checklist[2].answer,'NO');});
test('Checklist — single curve applicability',()=>{const m=C.analyze([row('A',150,40,'R')],opts);assert.equal(m.checklist[0].answer,'N/A');assert.equal(m.checklist[1].answer,'N/A');assert.equal(m.checklist[2].answer,'N/A');assert.equal(m.checklist[3].answer,'NOT EVALUATED');});
test('Checklist — invalid or overlapping geometry does not receive Yes',()=>{const invalid=C.analyze([row('A',0,40,'R')],opts);assert.ok(C.complianceChecklist(invalid).every(c=>c.answer==='NOT EVALUATED'));const overlap=C.analyze([row('A',100,90,'R','','1+100'),row('B',100,90,'L',0,'1+200')],opts);assert.ok(C.complianceChecklist(overlap).every(c=>c.answer!=='YES'));});
for(const [radius,S]of [[10,5],[20,10],[30,20],[50,40],[75,60],[100,80],[150,100],[250,150],[1000,250],[10000,100]]){
 test('Independent sight-offset sagitta: Rs='+radius+' S='+S,()=>{
  const halfChord=radius*Math.sin(S/(2*radius));
  const expected=radius-Math.sqrt(radius*radius-halfChord*halfChord);
  const curve={id:'HSO',delta:120,source:{sightRadius:radius,sightDistance:S,availableOffset:expected+1}};
  const actual=C.sightOffsetCheck(curve);near(actual.required,expected,1e-9);assert.equal(actual.status,'PASS');
  const failed=C.sightOffsetCheck({...curve,source:{...curve.source,availableOffset:Math.max(0,expected-.01)}});assert.equal(failed.status,'FAIL');
  return {inputs:{insideLaneRadius:radius,requiredSightDistance:S},expectedRequiredOffset:expected,actualRequiredOffset:actual.required,tolerance:'1e-9 relative/absolute; independent chord/square-root sagitta'};
 });
}
test('Sight offset — exact boundary and lane radius rather than alignment radius',()=>{const R=100,S=100*Math.PI/2,expected=100*(1-Math.SQRT1_2);const source={...row('A',103,90,'R'),sightRadius:R,sightDistance:S,availableOffset:expected};const m=C.analyze([source],opts);assert.equal(m.checklist[3].answer,'YES');near(m.sightOffsets[0].required,expected);const fail=C.analyze([{...source,availableOffset:expected-.001}],opts);assert.equal(fail.checklist[3].answer,'NO');return {inputs:{alignmentRadius:103,laneRadius:100,S},expectedOffset:expected,actualOffset:m.sightOffsets[0].required};});
test('Sight offset — missing, invalid and beyond-curve inputs stay unevaluated',()=>{for(const source of [{},{sightRadius:100,sightDistance:50},{sightRadius:0,sightDistance:50,availableOffset:5},{sightRadius:100,sightDistance:-1,availableOffset:5},{sightRadius:100,sightDistance:1000,availableOffset:50},{sightRadius:100,sightDistance:50,availableOffset:-1}])assert.equal(C.sightOffsetCheck({id:'A',delta:40,source}).status,'NOT EVALUATED');});
test('Checklist — partial sight coverage is not Yes; known deficit remains No',()=>{const sight={sightRadius:150,sightDistance:50,availableOffset:10};const m=C.analyze([{...row('A',150,40,'R'),...sight},row('B',200,35,'L',30)],opts);assert.equal(m.checklist[3].answer,'NOT EVALUATED');const fail=C.analyze([{...row('A',150,40,'R'),...sight,availableOffset:0},row('B',200,35,'L',30)],opts);assert.equal(fail.checklist[3].answer,'NO');});
test('Sight input CSV round-trip',()=>{const parsed=C.parseTable(C.csv(['PI NO.','R','I','TURN','SIGHT PATH RADIUS','SIGHT DISTANCE','AVAILABLE OFFSET'],[['A',100,90,'R',98,50,5]]));assert.equal(parsed[0].sightRadius,'98');assert.equal(parsed[0].sightDistance,'50');assert.equal(parsed[0].availableOffset,'5');});

await mkdir(new URL('Reports/',root),{recursive:true});
await writeFile(new URL('Reports/alignment-curve-checker-tests.json',root),JSON.stringify({date:'2026-11-01',tool:'Alignment Curve Checker',baseline:'Public toolkit integration based on 17d94e4',results,passed:results.length,failed:0,limits:'Independent circle rotation and worked benchmarks. Project screening defaults from user brief; full DPWH source not accessible. Numerical agreement is not design approval.'},null,2)+'\n');
console.log(results.length+' alignment scenario groups passed, including 10 independent rotation cases. Results: Reports/alignment-curve-checker-tests.json');
