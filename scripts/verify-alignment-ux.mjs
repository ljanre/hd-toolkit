import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const context={};runInNewContext(await readFile(new URL('../src/components/alignment-curve-checker/engine.js',import.meta.url),'utf8'),context);
const C=context.AlignmentChecker;
const first={id:'PRIVATE-CURVE-87654',piStation:2000,r:150,delta:40,turn:'R'},g=C.geometry(150,40),second={id:'B',r:200,delta:35,turn:'L'};
const pair=gap=>[first,{...second,piStation:first.piStation-g.T+g.L+gap+C.geometry(200,35).T}];
for(const [rows,expected] of [
 [[],/Add at least one/],[[{id:'A'}],/PI station.*intersection angle.*radius.*L\/R/],
 [[{...first,turn:''}],/L\/R/],[[{...first,r:0}],/invalid values/],[[{...first,delta:180}],/invalid values/],[[{...first,piStation:1}],/invalid values/],
 [[first],/Add another complete curve/],[pair(30),/Inputs sufficient for 2 curves/],[pair(20),/flagged tangent/],[pair(-5),/overlaps or is discontinuous/],
 [[first,{...pair(20)[1],turn:'R'}],/flagged tangent/],[[first,{...pair(60)[1],turn:'R'}],/project review/]
]){const m=C.alignmentSchedule(rows);assert.match(C.alignmentReadiness(rows,m),expected);}
const prompt=C.alignmentPrompt();assert.match(prompt,/PI NO\.\tPI STATION\tI\tR\tTURN/);assert.match(prompt,/do not fabricate/i);assert.match(prompt,/Leave their TSV cells blank/);assert.match(prompt,/next PC - previous PT/);assert.ok(!prompt.includes(first.id));assert.ok(!prompt.includes(String(first.piStation)));
const html=await readFile(new URL('../src/components/alignment-curve-checker/index.html',import.meta.url),'utf8'),app=await readFile(new URL('../src/components/alignment-curve-checker/app.js',import.meta.url),'utf8');
assert.match(html,/<h1>Alignment Checker/);assert.match(html,/Copy Table Format \(Prompt\)/);assert.ok(html.indexOf('id="addRow"')>html.indexOf('id="inputRows"'));assert.match(html,/id="inputReadiness"/);assert.doesNotMatch(html,/Connection screening|Successive curves|Plot labels may be offset/);
assert.match(app,/const text=C\.alignmentPrompt\(\)/);assert.doesNotMatch(app,/C\.alignmentChatTable\(rows/);assert.match(app,/class:'checked-tangent'/);assert.match(app,/class:'pi-marker'/);
runInNewContext(await readFile(new URL('../src/components/alignment-curve-checker/plot-layout.js',import.meta.url),'utf8'),context);
const P=context.AlignmentPlotLayout;
const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
for(const [width,count] of [[280,1],[360,3],[600,6],[759,10],[760,2],[900,4],[1200,8],[1600,12],[1000,30],[1400,50]]){
 const frame=P.frame(width,count,Math.max(0,count-1));
 const items=Array.from({length:count},(_,index)=>({kind:'pi',index,anchorY:index%2?99999:-100,lines:['PI identifier','PC station','PT station','Radius / angle']})).concat(Array.from({length:Math.max(0,count-1)},(_,index)=>({kind:'tangent',index,anchorY:index%3?250:-50,lines:['T01 · REVERSE','PT station','PC station','Length / result']})));
 const boxes=P.place(frame,items);assert.equal(boxes.length,items.length);
 for(const box of boxes){assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=frame.width+1e-6&&box.y+box.height<=frame.height+1e-6);assert.equal(intersects(box,frame.geometry),false,'Annotation covers geometry');}
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.equal(intersects(boxes[i],boxes[j]),false,'Annotation boxes overlap');
}
assert.match(html,/<details[^>]+id="elementsPanel"[^>]*><summary>Calculated curve elements/);assert.match(html,/<details[^>]+id="stationsPanel"[^>]*><summary>Station register/);
assert.ok(html.indexOf('id="checksPanel"')>html.indexOf('id="plotWorkspace"'));assert.ok(html.indexOf('id="checksPanel"')<html.indexOf('id="elementsPanel"'));
assert.doesNotMatch(html,/id="summary"/);assert.doesNotMatch(app,/Illustrative example loaded|\$\('summary'\)/);
console.log('Alignment UX: 12 readiness cases, prompt-only copy, row controls and tangent/PI plotting contracts verified.');

assert.deepEqual([...html.matchAll(/<input type="checkbox" id="([^"]+)" checked/g)].map(m=>m[1]),['checkedTangents']);
assert.doesNotMatch(html,/N\/A/);assert.match(html,/Not Applicable/);assert.match(app,/TANGENT SCHEDULE/);assert.match(app,/Lt = /);

// Independent boundary expectations for reverse tangent guidance.
for(const [gap,status] of [[0,'FAIL'],[10,'FAIL'],[29,'FAIL'],[29.999,'FAIL'],[30,'PASS'],[30.001,'PASS'],[40,'PASS'],[49.999,'PASS'],[50,'PASS'],[50.001,'PASS'],[100,'PASS']]){
 const m=C.alignmentSchedule(pair(gap));assert.equal(m.pairs[0].status,status,`Reverse gap ${gap}`);
 assert.equal(C.complianceChecklist(m)[1].answer,status==='PASS'?'YES':'NO');
 const quality=C.alignmentQualityChecklist(m);assert.equal(quality[0].status,'PASS');assert.equal(quality.find(q=>q.label.includes('reversal')).status,'NOT EVALUATED');
}
for(const width of [280,360,600,759,760,900,1000,1200,1400,1600]){
 const rect={x:0,y:0,width,height:450},anchors=[{x:width/2,y:160,text:'PC'},{x:width/2,y:160,text:'PT'},{x:width/2,y:200,text:'PI'},{x:width/2,y:240,text:'R'}],segments=[[{x:width/2,y:100},{x:width/2,y:350}]];
 const symbols=P.symbols(rect,anchors,segments);assert.equal(symbols.length,4);
 for(let i=0;i<symbols.length;i++){assert.ok(symbols[i].x+symbols[i].width<width);for(let j=i+1;j<symbols.length;j++)assert.equal(intersects(symbols[i],symbols[j]),false);}
}
assert.match(app,/engineering-symbols/);assert.match(app,/\['FAIL','WARNING'\]\.includes\(pair.status\)/);

// Supplied-note boundaries for same-direction tangents and compound radius ratio.
for(const [gap,warning] of [[.1,true],[1,true],[10,true],[20,true],[29,true],[29.999,true],[30,false],[30.001,false],[40,false],[50,false]]){
 const rows=pair(gap);rows[1].turn='R';const m=C.alignmentSchedule(rows);
 assert.equal(m.pairs[0].status,warning?'WARNING':'NOT EVALUATED');
 assert.equal(C.complianceChecklist(m)[2].answer,warning?'NO':'YES');
 assert.equal(C.alignmentQualityChecklist(m).find(q=>q.label==='Same-direction curve arrangement').status,warning?'WARNING':'PASS');
}
for(const ratio of [1,1.2,1.4999,1.5,1.5001,2])assert.equal(C.pairCheck({R:100,s:1},{R:100*ratio,s:1},0).status,ratio<=1.5?'PASS':'FAIL');
assert.doesNotMatch(html,/50 m recommended/);assert.doesNotMatch(C.alignmentPrompt(),/50 m/);

// Independently calculate limiting radii using DGCS side-friction rows and V²/[127(e+f)].
const friction={15:.40,20:.35,30:.28,40:.23,50:.19,60:.17,70:.15,80:.14,90:.13,100:.12,110:.11,120:.09,130:.08};
let radiusCases=0;
for(const emax of [4,6,8,10])for(const [v,f] of Object.entries(friction)){
 const speed=Number(v);if(emax===4&&(speed===15||speed>100))continue;
 const expected=Math.round(speed**2/(127*(emax/100+f))),options={radiusSpeed:speed,radiusEmax:emax};
 for(const [radius,status] of [[expected-.001,'FAIL'],[expected,'PASS'],[expected+.001,'PASS']]){
  const result=C.minimumRadiusCheck(radius,options);assert.equal(result.minimum,expected);assert.equal(result.status,status);
  const m=C.alignmentSchedule([{id:'R-CHECK',piStation:1000,r:radius,delta:20,turn:'R'}],options);
  assert.equal(m.errors.length,0);assert.equal(m.radiusChecks[0].status,status);assert.equal(m.checks.at(-1).status,status);
  assert.equal(C.alignmentQualityChecklist(m).find(q=>q.label==='DGCS limiting minimum radius').status,status);
 }
 radiusCases++;
}
assert.equal(radiusCases,48);assert.equal(C.minimumRadiusCheck(150,{radiusSpeed:70,radiusEmax:4}).minimum,203);
for(const options of [{},{radiusSpeed:30},{radiusEmax:8},{radiusSpeed:35,radiusEmax:8},{radiusSpeed:15,radiusEmax:4},{radiusSpeed:130,radiusEmax:4},{radiusSpeed:30,radiusEmax:5}])assert.equal(C.minimumRadiusCheck(20,options).status,'NOT EVALUATED');
assert.match(app,/radius-deficient/);assert.match(app,/curveColor/);assert.match(html,/radiusSpeed/);assert.match(html,/radiusEmax/);
console.log('DGCS radius: 48 independent limiting-radius cases, 144 full-chain boundary checks and missing/unsupported controls passed.');

// Imports must preserve direction without silently choosing a side.
for(const [source,expected] of [['L','L'],['R','R'],['l','L'],['r','R'],['Left','L'],['Right','R'],['LEFT','L'],['RIGHT','R'],[' left ','L'],[' right ','R']]){
 const [row]=C.parseTable('PI NO.\tPI STATION\tI\tR\tTURN\nA\t1000\t20\t100\t'+source,'alignment');assert.equal(row.turn,expected);assert.equal(C.alignmentSchedule([row]).errors.length,0);
}
const [noTurn]=C.parseTable('PI NO.\tPI STATION\tI\tR\nA\t1000\t20\t100','alignment');assert.equal(noTurn.turn,'');assert.ok(C.alignmentSchedule([noTurn]).errors.length);
for(const text of ['staggered ELEMENTS OF CURVE','TURN audit table OUTSIDE the TSV','Aout - Ain + 540','back azimuths','uE*vN - uN*vE','leave TURN blank','spiral-plus-circular'])assert.ok(C.alignmentPrompt().includes(text),text);
assert.doesNotMatch(C.alignmentPrompt(),/327.42|7\+225|PI 29/,'Prompt must remain generic, not embed current project data.');

assert.match(html,/<option value="8" selected>8% · default/);
for(const text of ['Design Controls table','Source Details / Review table','Actual per-curve superelevation e is NOT emax','never assume missing speed','does not import speed automatically','do not average speeds'])assert.ok(C.alignmentPrompt().includes(text),text);
assert.match(app,/id==='radiusEmax'/);

// View rotation preserves distances and never alters model coordinates.
for(const degrees of [0,15,30,45,60,90,135,180,225,270,315,360]){
 const p={x:103,y:204},origin={x:100,y:200},copy={...p},q=P.rotate(p,origin,degrees);
 assert.ok(Math.abs(Math.hypot(q.x,q.y)-5)<1e-10);assert.deepEqual(p,copy);
 const b=P.rotate({x:106,y:208},origin,degrees);assert.ok(Math.abs(Math.hypot(b.x-q.x,b.y-q.y)-5)<1e-10);
}
const cw=P.rotate({x:0,y:10},{x:0,y:0},90);assert.ok(Math.abs(cw.x-10)<1e-10&&Math.abs(cw.y)<1e-10);
assert.match(html,/id="rotateLeft"/);assert.match(html,/id="rotateRight"/);assert.match(app,/function resetView\(\)\{rotation=0/);
console.log('View rotation: 12 distance-preservation cases, clockwise direction and reset verified.');

// Patched-image extraction must keep provenance and uncertainty outside the import cells.
for(const requirement of ['Inventory every supplied image / patch','printed heading and grid boundaries','transcribe each visible source cell verbatim','At every patch seam','show BOTH literal readings','re-read the original images row-by-row and then column-by-column','Separate literal source transcription','Missing / cropped','Reconcile counts','Source Verification table OUTSIDE the TSV','Needs source verification','not engineering approval or a guarantee of image-reading accuracy'])assert.ok(C.alignmentPrompt().includes(requirement),requirement);
assert.match(C.alignmentPrompt(),/exactly these five headers/);
