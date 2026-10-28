/* Presentation uses the existing forecast outputs; it does not replace the engineering engine. */
(() => {
 const fmt=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
 const esc=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const palette=['#0072B2','#B35E00','#007F5F','#A14586','#B63C16','#007B9E','#6953A2','#725235','#8B4C73','#476D2D','#3C6478','#864A23','#4358A0'];
 function chart(data){
  if(!data)return {rows:[],total:0,partial:false};
  const rows=data.cases.filter(r=>r.aadt>0&&Number.isFinite(r.ef)&&Number.isFinite(r.contribution)).map(r=>({...r,label:r.custom?r.name+' · '+fmt(r.gvw)+' kg':'Code '+r.code+' · '+fmt(r.gvw)+' kg'})).sort((a,b)=>b.contribution-a.contribution||a.index-b.index);
  const total=rows.reduce((s,r)=>s+r.contribution,0),display=rows.slice(0,10);
  if(rows.length>10)display.push({label:'Other '+(rows.length-10)+' loading cases',contribution:rows.slice(10).reduce((s,r)=>s+r.contribution,0),index:-1});
  return {rows:display.map((r,i)=>{const index=VehicleAnnex.profiles.findIndex(p=>p.code===r.code);return {...r,color:r.index===-1?'#64748B':palette[(index>=0?index:i)%palette.length],share:total>0?r.contribution/total*100:0};}),total,partial:!data.complete};
 }
 function discussion(data){
  const p=data.parameters,cases=data.cases.filter(r=>r.aadt>0),ranked=chart(data),survey=cases.reduce((s,r)=>s+r.aadt,0),opening=cases.reduce((s,r)=>s+r.opening,0),top=ranked.rows[0];
  return `The adopted survey traffic totals ${fmt(survey)} vehicles/day in ${p.survey}. Using annual compound growth of ${fmt(p.growth)}%, the forecast opening traffic in ${p.opening} is ${fmt(opening)} vehicles/day. The cumulative loading period is ${p.years} years, from opening ${p.opening} to the end boundary ${p.opening+p.years}; the end boundary is not an additional loading year.\n\nThe adopted directional factor is ${fmt(p.dd,6)}, and the design-lane factor is ${fmt(p.dl*100,6)}% (${fmt(p.dl,6)}) for ${p.lanes} lane(s) in each direction. The resulting design-lane cumulative equivalent single axle load, W18, is ${fmt(data.total)} ESAL (${fmt(data.total/1e6,6)} million ESAL). These distribution factors have been applied once.\n\n${top&&ranked.total>0?`${top.label} is the largest individual loading contribution, accounting for ${fmt(top.contribution)} ESAL or ${fmt(top.share)}% of W18. The color-coded distribution chart compares axle-loading demand rather than vehicle counts; a vehicle with a larger EF can contribute disproportionately to the pavement loading.`:'The entered loading factors produce zero CESAL. Review any adopted zero factors and the intended loading basis before using this estimate in design.'}\n\nThis discussion is a preliminary, editable interpretation of the entered data. Confirm that the traffic counts represent annual-average conditions, that configurations do not overlap, and that the growth rate, axle loading, equivalence method and distribution factors are supported by the approved project study. This report does not establish pavement thickness or approval of a design.`;
 }
 function canReport(data){return !!data&&data.complete&&data.cases.some(r=>r.aadt>0)&&Number.isFinite(data.total);}
 function chartSvg(data){
  const c=chart(data),height=175+Math.ceil(c.rows.length/2)*46;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="${height}" viewBox="0 0 1100 ${height}"><rect width="1100" height="${height}" fill="white"/><g font-family="Arial,sans-serif" fill="#203c46"><text x="20" y="27" font-size="19" font-weight="bold">Design-lane CESAL distribution by truck type</text><text x="20" y="51" font-size="13">${c.total>0?'One bar = 100% of design-lane CESAL':'Zero total CESAL — no percentage distribution'} · DD and DL applied once</text><rect x="20" y="72" width="1060" height="44" fill="#edf2f4"/>`;
  let offset=0;
  c.rows.forEach(r=>{const width=r.share/100*1060;s+=`<rect x="${20+offset}" y="72" width="${width}" height="44" fill="${r.color}" stroke="white" stroke-width="1"/>`;if(r.share>=8)s+=`<text x="${20+offset+width/2}" y="99" fill="white" text-anchor="middle" font-size="13" font-weight="bold">${fmt(r.share)}%</text>`;offset+=width;});
  c.rows.forEach((r,i)=>{const x=20+(i%2)*540,y=143+Math.floor(i/2)*46,label=Array.from(r.label).length>55?Array.from(r.label).slice(0,54).join('')+'…':r.label;s+=`<rect x="${x}" y="${y-12}" width="14" height="14" fill="${r.color}"/><text x="${x+23}" y="${y}" font-size="13">${esc(label)}</text><text x="${x+23}" y="${y+18}" font-size="12">${esc(fmt(r.contribution))} ESAL · ${fmt(r.share)}%</text>`;});
  s+=`<text x="20" y="${height-7}" font-size="13" font-weight="bold">Total${c.partial?' (partial)':''}: ${esc(fmt(c.total))} ESAL</text>`;
  return {svg:s+'</g></svg>',width:1100,height};
 }
 globalThis.CesalReportModel=Object.freeze({fmt,esc,chart,discussion,canReport,chartSvg});
})();
