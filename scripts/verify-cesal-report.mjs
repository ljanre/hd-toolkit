import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const root=new URL('../src/components/design-traffic/',import.meta.url),c={TextEncoder};
for(const name of ['engine.js','vehicle-annex.js','report-model.js','word-document.js'])runInNewContext(await readFile(new URL(name,root),'utf8'),c);
const specs=[['1-1',1],['1-3',10],['11-1',10]],parameters={survey:2025,opening:2026,years:20,growth:2,dd:.5,dl:1,lanes:1};
const result=c.DesignTraffic.forecast({aadt:specs.map(r=>r[1]),rates:[2,2,2],factors:specs.map(([code])=>{const p=c.VehicleAnnex.profiles.find(p=>p.code===code);return c.VehicleAnnex.calculate(code,p.gvw).ef;}),years:20,delay:1,dd:.5,dl:1});
const cases=specs.map(([code,aadt],i)=>{const p=c.VehicleAnnex.profiles.find(p=>p.code===code),d=result.detail[i],ef=c.VehicleAnnex.calculate(code,p.gvw).ef,traffic=365*d.opening*d.growth;return {index:i,code,name:p.name,gvw:p.gvw,fractions:p.fractions.join(', '),ef,aadt,opening:d.opening,growthFactor:d.growth,traffic,cesal:traffic*ef,contribution:d.esal};});
const data={parameters,cases,complete:true,total:result.total},M=c.CesalReportModel;
assert.ok(Math.abs(result.total-1348586.636391494)<.01);
const chart=M.chart(data);assert.equal(chart.rows[0].code,'11-1');assert.ok(Math.abs(chart.rows.reduce((s,r)=>s+r.share,0)-100)<1e-10);assert.equal(chart.total,result.total);
assert.equal(new Set(chart.rows.map(r=>r.color)).size,3,'Known truck types have distinct legend colors');
const reranked=M.chart({...data,cases:cases.map((r,i)=>({...r,contribution:i===0?1e9:r.contribution}))});
for(const r of chart.rows)assert.equal(reranked.rows.find(x=>x.code===r.code).color,r.color,'Truck colors stay stable when rank changes');
const stackedSvg=M.chartSvg(data).svg;assert.match(stackedSvg,/One bar = 100%/);
for(const r of chart.rows)assert.ok((stackedSvg.match(new RegExp('fill="'+r.color+'"','g'))||[]).length>=2,'SVG segment and legend share the same color');

const many={...data,cases:Array.from({length:20},(_,i)=>({...cases[0],index:i,contribution:i+1}))};
const grouped=M.chart(many);assert.equal(grouped.rows.length,11);assert.equal(grouped.rows.at(-1).label,'Other 10 loading cases');assert.equal(grouped.rows.reduce((s,r)=>s+r.contribution,0),210);
assert.equal(M.chart({...data,cases:[{...cases[0],aadt:0},{...cases[1],ef:NaN,contribution:null}]}).rows.length,0);
assert.equal(M.canReport(null),false);assert.equal(M.canReport({...data,complete:false}),false);assert.equal(M.canReport({...data,cases:[]}),false);assert.equal(M.canReport(data),true);
assert.equal(M.chart({...data,cases:[{...cases[0],contribution:0}]}).rows[0].share,0);
assert.match(M.discussion(data),/1,348,586.64 ESAL/);assert.match(M.discussion(data),/77.2%/);
assert.match(M.chartSvg({...data,cases:[{...cases[0],custom:true,name:'<script>& review'}]}).svg,/&lt;script&gt;&amp;/);
const png=new Uint8Array([137,80,78,71,13,10,26,10]);
const bytes=c.CesalWord.build(data,{project:'Road <A> & B',discussion:'Edited engineering discussion.',date:'Test date'},png,M.chartSvg(data));
// Read the standard local ZIP records to check native content and embedded image relationships.
const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder(),files=new Map();let offset=0;
while(view.getUint32(offset,true)===0x04034b50){assert.equal(view.getUint16(offset+8,true),0);const size=view.getUint32(offset+18,true),nameSize=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),start=offset+30+nameSize+extra;const name=decoder.decode(bytes.slice(offset+30,offset+30+nameSize));files.set(name,bytes.slice(start,start+size));offset=start+size;}
assert.equal(view.getUint32(offset,true),0x02014b50);assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);
const doc=decoder.decode(files.get('word/document.xml'));
for(const text of ['Road &lt;A&gt; &amp; B','Edited engineering discussion.','1,348,586.64','w:orient="landscape"','w:tblGrid','r:embed="rIdChart"'])assert.ok(doc.includes(text),text);
assert.equal((doc.match(/<w:tbl>/g)||[]).length,4);assert.equal(files.get('word/media/chart.png').length,png.length);
assert.ok(decoder.decode(files.get('word/_rels/document.xml.rels')).includes('Target="media/chart.png"'));
assert.throws(()=>c.CesalWord.build({...data,complete:false},{},png,M.chartSvg(data)));
console.log('CESAL chart/report: ranking, shares, grouping, missing/zero cases, unchanged forecast, draft narrative, escaping, native Word tables, ZIP package and image relationships verified.');
