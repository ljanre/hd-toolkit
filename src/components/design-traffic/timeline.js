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
   let s='<svg viewBox="0 0 960 525" role="img" aria-label="Included traffic growth from survey through opening to design-period end"><rect width="960" height="440" fill="white"/>';
   s+=`<rect x="85" y="55" width="${X(r.opening)-85}" height="215" fill="#f4f0e6"/><rect x="${X(r.opening)}" y="55" width="${865-X(r.opening)}" height="215" fill="#edf7f3"/>`;
   for(let i=0;i<=4;i++){const v=max*i/4;s+=`<line x1="85" x2="865" y1="${Y(v)}" y2="${Y(v)}" stroke="#dce5eb"/><text x="75" y="${Y(v)+4}" text-anchor="end">${fmt(v)}</text>`;}
   s+=`<polyline points="${r.points.map(p=>X(p.year)+','+Y(p.aadt)).join(' ')}" fill="none" stroke="#17665d" stroke-width="3"/><text x="85" y="27">INCLUDED TWO-WAY AADT · vehicles/day</text><text x="865" y="27" text-anchor="end">Annual growth ${fmt(r.growth)}%</text>`;
   const step=Math.max(1,Math.ceil((r.end-r.survey)/7)),ticks=[];for(let year=r.survey;year<=r.end;year+=step)ticks.push(year);if(ticks.at(-1)!==r.end){if(r.end-ticks.at(-1)<step/2)ticks.pop();ticks.push(r.end);}
   s+='<line x1="85" x2="865" y1="270" y2="270" stroke="#526873"/>';
   for(const year of ticks)s+=`<line x1="${X(year)}" x2="${X(year)}" y1="270" y2="277" stroke="#526873"/><text x="${X(year)}" y="295" text-anchor="middle">${year}</text>`;
   s+='<text x="475" y="319" text-anchor="middle">CALENDAR YEAR</text>';
   const milestones=[{year:r.survey,aadt:r.total,label:'Survey · measured base',detail:'Included two-way survey traffic',color:'#8b682d'},{year:r.opening,aadt:r.openingAADT,label:'Opening · start of service',detail:`Projected ${r.opening-r.survey} years after survey`,color:'#17665d'},{year:r.end,aadt:r.endAADT,label:'Projected · design-period end',detail:`${r.years}-year design period after opening`,color:'#2563a0'}];
   for(const [i,m] of milestones.entries()){const x=85+i*265;s+=`<line x1="${X(m.year)}" x2="${X(m.year)}" y1="55" y2="270" stroke="${m.color}" stroke-dasharray="4 4"/><circle cx="${X(m.year)}" cy="${Y(m.aadt)}" r="${r.opening===r.survey&&i===0?8:5}" fill="white" stroke="${m.color}" stroke-width="2"/><rect x="${x}" y="340" width="250" height="112" rx="6" fill="#f5f8fa" stroke="${m.color}"/><text x="${x+12}" y="361">${m.label}</text><text x="${x+12}" y="384">Year ${m.year} · ${fmt(m.aadt)} veh/day</text><text x="${x+12}" y="407">${m.detail}</text><text x="${x+12}" y="430">${i===0?'Measured AADT input':`AADT = survey × (1 + r)^${m.year-r.survey}`}</text>`;}
   s+=`<text x="85" y="480">Survey → opening: ${r.opening-r.survey} years · Opening → projected end: ${r.years} years · Annual growth ${fmt(r.growth)}%</text><text x="85" y="506">Projected end = opening year + design period; this boundary is not an extra year in the CESAL sum.</text></svg>`;target.innerHTML=s;
  }catch(e){target.textContent=e.message;}
 }
 globalThis.TrafficTimeline=Object.freeze({build,render});
})();
