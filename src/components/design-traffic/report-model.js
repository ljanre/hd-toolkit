/* Presentation uses the existing forecast outputs; it does not replace the engineering engine. */
(() => {
 const fmt=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
 const esc=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function chart(data){
  if(!data)return {rows:[],total:0,partial:false};
  const rows=data.cases.filter(r=>r.aadt>0&&Number.isFinite(r.ef)&&Number.isFinite(r.contribution)).map(r=>({...r,label:r.custom?r.name+' · '+fmt(r.gvw)+' kg':'Code '+r.code+' · '+fmt(r.gvw)+' kg'})).sort((a,b)=>b.contribution-a.contribution||a.index-b.index);
  const total=rows.reduce((s,r)=>s+r.contribution,0),display=rows.slice(0,10);
  if(rows.length>10)display.push({label:'Other '+(rows.length-10)+' loading cases',contribution:rows.slice(10).reduce((s,r)=>s+r.contribution,0),index:-1});
  return {rows:display.map(r=>({...r,share:total>0?r.contribution/total*100:0})),total,partial:!data.complete};
 }
 function discussion(data){
  const p=data.parameters,cases=data.cases.filter(r=>r.aadt>0),ranked=chart(data),survey=cases.reduce((s,r)=>s+r.aadt,0),opening=cases.reduce((s,r)=>s+r.opening,0),top=ranked.rows[0];
  return `The adopted survey traffic totals ${fmt(survey)} vehicles/day in ${p.survey}. Using annual compound growth of ${fmt(p.growth)}%, the forecast opening traffic in ${p.opening} is ${fmt(opening)} vehicles/day. The cumulative loading period is ${p.years} years, from opening ${p.opening} to the end boundary ${p.opening+p.years}; the end boundary is not an additional loading year.\n\nThe adopted directional factor is ${fmt(p.dd,6)}, and the design-lane factor is ${fmt(p.dl*100,6)}% (${fmt(p.dl,6)}) for ${p.lanes} lane(s) in each direction. The resulting design-lane cumulative equivalent single axle load, W18, is ${fmt(data.total)} ESAL (${fmt(data.total/1e6,6)} million ESAL). These distribution factors have been applied once.\n\n${top&&ranked.total>0?`${top.label} is the largest individual loading contribution, accounting for ${fmt(top.contribution)} ESAL or ${fmt(top.share)}% of W18. The ranked chart compares axle-loading demand rather than vehicle counts; a vehicle with a larger EF can contribute disproportionately to the pavement loading.`:'The entered loading factors produce zero CESAL. Review any adopted zero factors and the intended loading basis before using this estimate in design.'}\n\nThis discussion is a preliminary, editable interpretation of the entered data. Confirm that the traffic counts represent annual-average conditions, that configurations do not overlap, and that the growth rate, axle loading, equivalence method and distribution factors are supported by the approved project study. This report does not establish pavement thickness or approval of a design.`;
 }
 function canReport(data){return !!data&&data.complete&&data.cases.some(r=>r.aadt>0)&&Number.isFinite(data.total);}
 function chartSvg(data){
  const c=chart(data),max=Math.max(0,...c.rows.map(r=>r.contribution)),height=100+c.rows.length*48;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="${height}" viewBox="0 0 1100 ${height}"><rect width="1100" height="${height}" fill="white"/><g font-family="Arial,sans-serif" fill="#203c46"><text x="18" y="25" font-size="19" font-weight="bold">Design-lane CESAL contribution by truck type</text><text x="18" y="48" font-size="13">ESAL · ranked largest first · DD and DL applied once</text><path d="M340 65V${height-25}" stroke="#a6bac1"/>`;
  c.rows.forEach((r,i)=>{const y=72+i*48,label=Array.from(r.label).length>44?Array.from(r.label).slice(0,43).join('')+'…':r.label; s+=`<text x="18" y="${y+19}" font-size="13">${esc(label)}</text><rect x="340" y="${y}" width="${max?r.contribution/max*510:0}" height="27" fill="#19776a"/><text x="870" y="${y+19}" font-size="13">${esc(fmt(r.contribution))} · ${fmt(r.share)}%</text>`;});
  return {svg:s+'</g></svg>',width:1100,height};
 }
 globalThis.CesalReportModel=Object.freeze({fmt,esc,chart,discussion,canReport,chartSvg});
})();
