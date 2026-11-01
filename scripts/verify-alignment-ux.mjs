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
console.log('Alignment UX: 12 readiness cases, prompt-only copy, row controls and tangent/PI plotting contracts verified.');
