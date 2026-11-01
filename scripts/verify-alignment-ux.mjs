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
for(const [gap,status] of [[0,'FAIL'],[10,'FAIL'],[29,'FAIL'],[29.999,'FAIL'],[30,'WARNING'],[30.001,'WARNING'],[40,'WARNING'],[49.999,'WARNING'],[50,'PASS'],[50.001,'PASS'],[100,'PASS']]){
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
