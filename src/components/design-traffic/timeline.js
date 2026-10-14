(() => {
 function build(p){
  const keys=['survey','opening','years','growth'];if(keys.some(k=>p[k]===''||p[k]==null)||!p.counts.length)return null;
  const [survey,opening,years,growth]=keys.map(k=>Number(p[k]));
  if(!Number.isInteger(survey)||!Number.isInteger(opening)||survey<1900||opening>2200||opening<survey||!Number.isInteger(years)||years<1||years>100||!Number.isFinite(growth)||growth<=-100)throw Error('Enter valid years, design period and growth greater than −100%.');
  const counts=p.counts.map(Number);if(counts.some(n=>!Number.isFinite(n)||n<0))throw Error('Enter valid included survey AADT.');
  const total=counts.reduce((a,b)=>a+b,0),end=opening+years,points=[];
  for(let year=survey;year<=end;year++){const aadt=total*Math.pow(1+growth/100,year-survey);if(!Number.isFinite(aadt))throw Error('Traffic growth is outside the numeric range.');points.push({year,aadt});}
  return {survey,opening,end,years,growth,points,total,openingAADT:points[opening-survey].aadt,endAADT:points.at(-1).aadt};
 }
 function render(p){const target=document.getElementById('trafficTimeline');if(!target)return;
  try{const r=build(p);if(!r){target.textContent='Enter survey year, opening year and included survey AADT to show the growth timeline.';return;}
   const max=Math.max(1,...r.points.map(p=>p.aadt)),X=year=>85+(year-r.survey)/(r.end-r.survey)*780,Y=n=>270-n/max*205,fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:1});
   let s='<svg viewBox="0 0 960 440" role="img" aria-label="Included traffic growth from survey through opening to design-period end"><rect width="960" height="440" fill="white"/>';
   s+=`<rect x="85" y="55" width="${X(r.opening)-85}" height="215" fill="#f4f0e6"/><rect x="${X(r.opening)}" y="55" width="${865-X(r.opening)}" height="215" fill="#edf7f3"/>`;
   for(let i=0;i<=4;i++){const v=max*i/4;s+=`<line x1="85" x2="865" y1="${Y(v)}" y2="${Y(v)}" stroke="#dce5eb"/><text x="75" y="${Y(v)+4}" text-anchor="end">${fmt(v)}</text>`;}
   s+=`<polyline points="${r.points.map(p=>X(p.year)+','+Y(p.aadt)).join(' ')}" fill="none" stroke="#17665d" stroke-width="3"/><text x="85" y="27">INCLUDED TWO-WAY AADT · vehicles/day</text><text x="865" y="27" text-anchor="end">Annual growth ${fmt(r.growth)}%</text>`;
   const milestones=[{year:r.survey,aadt:r.total,label:'Survey',x:85,anchor:'start'},{year:r.opening,aadt:r.openingAADT,label:'Opening',x:X(r.opening),anchor:'middle'},{year:r.end,aadt:r.endAADT,label:'Design-period end',x:865,anchor:'end'}];
   for(const [i,m] of milestones.entries()){s+=`<line x1="${X(m.year)}" x2="${X(m.year)}" y1="55" y2="270" stroke="#81969b" stroke-dasharray="4 4"/><circle cx="${X(m.year)}" cy="${Y(m.aadt)}" r="5" fill="white" stroke="#17665d" stroke-width="2"/>`;const x=m.x,anchor=r.opening===r.survey&&i===1?'start':m.anchor,labelY=i===1?337:299,valueY=i===1?360:322;s+=`<text x="${x}" y="${labelY}" text-anchor="${anchor}">${m.label} · ${m.year}</text><text x="${x}" y="${valueY}" text-anchor="${anchor}">${fmt(m.aadt)} veh/day</text>`;}
   s+=`<text x="85" y="395">Survey → opening: ${r.opening-r.survey} years · Opening → design-period end: ${r.years} years</text><text x="85" y="419">End boundary = opening year + design period; it is not an additional year in the CESAL sum.</text></svg>`;target.innerHTML=s;
  }catch(e){target.textContent=e.message;}
 }
 globalThis.TrafficTimeline=Object.freeze({build,render});
})();
