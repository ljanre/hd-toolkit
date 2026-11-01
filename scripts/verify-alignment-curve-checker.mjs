import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),context={};
runInNewContext(await readFile(new URL('src/components/alignment-curve-checker/engine.js',root),'utf8'),context);
const C=context.AlignmentChecker,results=[];
const alignmentHtml=await readFile(new URL('src/components/alignment-curve-checker/index.html',root),'utf8');
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


for(const [name,radius,delta,turn,gap,secondRadius,secondTurn] of [
 ['reverse threshold',150,40,'R',30,200,'L'],['reverse short',150,40,'R',20,200,'L'],
 ['compound limit',150,40,'R',0,225,'R'],['compound fail',150,40,'R',0,300,'R'],
 ['broken back',150,40,'R',20,200,'R'],['long same direction',150,40,'R',60,200,'R'],
 ['left to right',300,60,'L',45,180,'R'],['equal radius',100,90,'R',0,100,'R'],
 ['small radius',15,25,'L',35,30,'R'],['large radius',5000,5,'R',100,6000,'L']]){
 test('Station-only reconstruction: '+name,()=>{
  const a=geometryIndependent(radius,delta),b=geometryIndependent(secondRadius,35);
  const pc1=1000,pt1=pc1+a.L,pc2=pt1+gap;
  const raw=[{id:'A',r:radius,delta,turn,piStation:pc1+a.T},{id:'B',r:secondRadius,delta:35,turn:secondTurn,piStation:pc2+b.T}];
  const actual=C.stationSchedule(raw,{stationBasis:'stations'});assert.equal(actual.errors.length,0);
  near(actual.curves[0].pcStation,pc1);near(actual.curves[1].pcStation,pc2);near(actual.curves[1].gap,gap);
  near(actual.curves[1].ptStation,pc2+b.L);
  const spaced=C.stationSchedule(raw.map((r,i)=>({...r,gap:i?gap:0})),{stationBasis:'spacing',startStation:pc1});
  near(actual.curves[1].pt.x,spaced.curves[1].pt.x);near(actual.curves[1].pt.y,spaced.curves[1].pt.y);
  assert.deepEqual(actual.checklist.map(c=>c.answer),spaced.checklist.map(c=>c.answer));
  return {input:raw,expectedGap:gap,actualGap:actual.curves[1].gap};
 });
}
function geometryIndependent(r,d){const rad=d*Math.PI/180;return {T:r*Math.sin(rad)/(1+Math.cos(rad)),L:r*rad};}
test('Station inputs reject missing controls and ignore stale coordinates',()=>{
 const valid={id:'A',r:100,delta:90,turn:'R',piStation:'1+100'};
 assert.equal(C.stationSchedule([{...valid,n:'invalid',e:'invalid'}]).errors.length,0);
 for(const change of [{piStation:''},{turn:'AUTO'},{delta:''},{piStation:'0+010'},{r:0}])assert.ok(C.stationSchedule([{...valid,...change}]).errors.length>0);
 const missing=C.stationSchedule([valid,{...valid,id:'B',gap:''}],{stationBasis:'spacing',startStation:1000});assert.ok(missing.errors.length);
});
test('Station import/export has no coordinate columns; legacy headers remain readable',()=>{
 const parsed=C.parseTable('A,1+100,90,100,R,0','station');assert.equal(parsed[0].piStation,'1+100');assert.equal(parsed[0].r,'100');assert.equal(parsed[0].turn,'R');
 const legacy=C.parseTable('PI NO.,NORTHING,EASTING,PI STATION,I,R,TURN\nA,100,200,1+100,90,100,R','station');assert.equal(C.stationSchedule(legacy).errors.length,0);
 assert.equal(C.stationColumns.includes('n'),false);assert.equal(C.stationColumns.includes('e'),false);
});
test('Checklist follows calculated results and appears after plot and registers',()=>{
 const make=gap=>C.stationSchedule([row('A',150,40,'R'),row('B',200,35,'L',gap)],{stationBasis:'spacing',startStation:1000});
 assert.equal(make(20).checklist[1].answer,'NO');assert.equal(make(30).checklist[1].answer,'YES');
 const html=alignmentHtml;assert.ok(html.indexOf('id="compliancePanel"')>html.indexOf('id="plotWorkspace"'));assert.ok(html.indexOf('id="compliancePanel"')>html.indexOf('id="checksPanel"'));
 assert.doesNotMatch(html,/<(?:input|th)[^>]*(?:Northing|Easting)|id="start[EN]"/);
});

for(const [V,G,t,a] of [[20,0,2.5,3.4],[30,-6,2.5,3.4],[40,6,2.5,3.4],[50,0,2.5,3.4],[60,-3,2.5,3.4],[70,3,2.5,3.4],[80,0,3,3.4],[90,-6,2,4],[100,6,2.5,3.4],[120,0,2.5,4]]){
 test('Speed / grade SSD and HSO: V='+V+' G='+G,()=>{
  const reaction=278*V*t/1000,braking=(V/Math.sqrt(254))**2/(a/9.81+G/100),expectedS=reaction+braking;
  const Rs=500,angle=90,expectedM=Rs-Math.sqrt(Rs*Rs-(Rs*Math.sin(expectedS/(2*Rs)))**2);
  const actualS=C.stoppingSightDistance(V,G,t,a);near(actualS,expectedS,1e-11);
  const raw={id:'SSD',piStation:2000,r:510,delta:angle,turn:'R',designSpeed:V,grade:G,sightRadius:Rs,availableOffset:expectedM+.1};
  const m=C.stationSchedule([raw],{stationBasis:'stations',reactionTime:t,deceleration:a});assert.equal(m.errors.length,0);near(m.sightOffsets[0].required,expectedM,1e-9);assert.equal(m.checklist[3].answer,'YES');
  const failing=C.stationSchedule([{...raw,availableOffset:Math.max(0,expectedM-.01)}],{stationBasis:'stations',reactionTime:t,deceleration:a});assert.equal(failing.checklist[3].answer,'NO');
  return {inputs:{V,G,t,a,Rs},expectedS,actualS,expectedHSO:expectedM,actualHSO:m.sightOffsets[0].required};
 });
}
test('SSD boundaries, adopted override and missing offset',()=>{
 for(const args of [[0,0],[50,''],[50,-40],[50,0,0],[50,0,2.5,0]])assert.throws(()=>C.stoppingSightDistance(...args));
 assert.ok(C.stoppingSightDistance(60,-6)>C.stoppingSightDistance(60,0));assert.ok(C.stoppingSightDistance(60,6)<C.stoppingSightDistance(60,0));
 const manual=C.sightOffsetCheck({id:'A',delta:90,source:{sightRadius:100,sightDistance:50,designSpeed:'invalid',availableOffset:10}});assert.equal(manual.ssdSource,'Adopted S');assert.equal(manual.S,50);
 const partial=C.sightOffsetCheck({id:'A',delta:90,source:{sightRadius:100,designSpeed:40,grade:0}});assert.ok(partial.required>0);assert.equal(partial.status,'NOT EVALUATED');
 const long=C.sightOffsetCheck({id:'A',delta:5,source:{sightRadius:100,designSpeed:100,grade:0,availableOffset:30}});assert.equal(long.required,null);assert.equal(long.status,'NOT EVALUATED');
});
test('ChatGPT copy includes editable values, assumptions and current findings',()=>{
 const raw=[{id:'A|B',piStation:'2+000',r:200,delta:90,turn:'R',designSpeed:40,grade:0,sightRadius:198.5,availableOffset:10}];
 const m=C.stationSchedule(raw,{reactionTime:2.5,deceleration:3.4});const text=C.chatTable(raw,m,{reactionTime:2.5,deceleration:3.4});
 assert.ok(text.includes('A\\|B'));assert.match(text,/V \(km\/h\)/);assert.match(text,/Reaction time: 2.5 s/);assert.match(text,/Required HSO/);assert.match(text,/Horizontal sight offset: YES/);const roundTrip=C.parseTable(text,'design');assert.equal(roundTrip[0].id,'A|B');assert.equal(roundTrip[0].designSpeed,'40');assert.equal(roundTrip[0].r,'200');assert.equal(roundTrip[0].sightRadius,'198.5');assert.equal(roundTrip[0].availableOffset,'10');
 const blank=C.chatTable([{id:'PI-1'}],null,{});assert.match(blank,/NOT EVALUATED/);assert.equal(C.designColumns.includes('designSpeed'),true);
 const parsed=C.parseTable('PI NO.,PI STATION,I,R,TURN,DESIGN SPEED,GRADE,RS,ADOPTED S,AVAILABLE CLEAR OFFSET\nA,2+000,90,200,R,40,0,198.5,,10','design');assert.equal(parsed[0].designSpeed,'40');assert.equal(parsed[0].grade,'0');assert.equal(parsed[0].availableOffset,'10');
});
test('Removed panels and controls stay absent; HSO inputs and copy remain',()=>{
 for(const id of ['project','stationBasis','startStation','undo','compareInputs','showSight','evaluationStamp'])assert.ok(!alignmentHtml.includes('id="'+id+'"'));
 assert.ok(!alignmentHtml.includes('Method, references &amp; use'));assert.ok(alignmentHtml.includes('id="copyTable"'));assert.ok(!alignmentHtml.includes('id="reactionTime"'));assert.ok(!alignmentHtml.includes('id="deceleration"'));
});
await mkdir(new URL('Reports/',root),{recursive:true});
await writeFile(new URL('Reports/alignment-curve-checker-tests.json',root),JSON.stringify({date:'2026-11-01',tool:'Alignment Curve Checker',baseline:'Speed/grade HSO revision from 4defff4',results,passed:results.length,failed:0,limits:'Independent circle rotation and worked benchmarks. SSD: FHWA-RD-02-045 Eq.3.5.1; HSO: TxDOT Roadway Design Manual 4.7.9, reviewed 2026-11-01. Project tangent/radius screens remain from the user brief; no universal DPWH approval is claimed. Numerical agreement is not design approval.'},null,2)+'\n');
console.log(results.length+' alignment scenario groups passed, including 10 independent rotation cases. Results: Reports/alignment-curve-checker-tests.json');
