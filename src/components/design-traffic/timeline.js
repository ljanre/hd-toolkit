(() => {
 const colors=['#2563a0','#b65a25','#854ca1','#b13e68','#517824','#386b78','#a8861f','#5e579d'];

 function build(p){
  const keys=['survey','opening','years','growth'];if(keys.some(k=>p[k]===''||p[k]==null)||!p.counts.length)return null;
  const [survey,opening,years,growth]=keys.map(k=>Number(p[k]));
  if(!Number.isInteger(survey)||!Number.isInteger(opening)||survey<1900||opening>2200||opening<survey||!Number.isInteger(years)||years<1||years>100||!Number.isFinite(growth)||growth<=-100)throw Error('Enter valid years, design period and growth greater than −100%.');
  const counts=p.counts.map(Number);if(counts.some(n=>!Number.isFinite(n)||n<0))throw Error('Enter valid included survey AADT.');
  const total=counts.reduce((a,b)=>a+b,0),end=opening+years,points=[];
  for(let year=survey;year<=end;year++){const aadt=total*Math.pow(1+growth/100,year-survey);if(!Number.isFinite(aadt))throw Error('Traffic growth is outside the numeric range.');points.push({year,aadt});}
  const series=counts.map((count,i)=>({label:String(p.labels?.[i]||'Vehicle '+(i+1)),color:colors[i%colors.length],dash:i>=colors.length?'6 3':'',points:points.map(point=>({year:point.year,aadt:count*Math.pow(1+growth/100,point.year-survey)}))}));
  return {survey,opening,end,years,growth,points,total,series,openingAADT:points[opening-survey].aadt,endAADT:points.at(-1).aadt};
 }
 function gantt(r){
  const left=240,right=920,X=year=>left+(year-r.survey)/(r.end-r.survey)*(right-left),fmt=value=>value.toLocaleString('en-US',{maximumFractionDigits:1}),step=Math.max(1,Math.ceil((r.end-r.survey)/7));
  let s='<svg viewBox="0 0 1000 365" role="img" aria-label="Gantt timeline with survey, pre-opening projection, design-period CESAL accumulation and projected end"><rect width="1000" height="365" fill="white"/>';
  const ticks=[];for(let year=r.survey;year<=r.end;year+=step)ticks.push(year);if(ticks.at(-1)!==r.end){if(r.end-ticks.at(-1)<step/2)ticks.pop();ticks.push(r.end);}
  for(const year of ticks)s+=`<line x1="${X(year)}" x2="${X(year)}" y1="43" y2="306" stroke="#e1e9ee"/><text x="${X(year)}" y="30" text-anchor="middle">${year}</text>`;
  const diamond=(year,y,color)=>`<path d="M${X(year)} ${y-7}l7 7-7 7-7-7z" fill="${color}"/>`;
  for(const [label,y] of [['Survey / base count',80],['Pre-opening projection',145],['In-service design period',210],['Projected end boundary',275]])s+=`<text x="15" y="${y+4}">${label}</text><line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="#edf2f5"/>`;
  s+=diamond(r.survey,80,'#8b682d')+`<text x="${left+14}" y="84">Survey ${r.survey} · ${fmt(r.total)} veh/day</text>`;
  const delayWidth=X(r.opening)-left;
  if(delayWidth>0)s+=`<rect x="${left}" y="128" width="${delayWidth}" height="34" rx="4" fill="#f1ddb3"/>`;
  const delayText=r.opening===r.survey?`Same-year opening ${r.opening} · no pre-opening delay`:`${r.survey} → ${r.opening} · ${r.opening-r.survey} years to opening`;
  s+=`<text x="${delayWidth>290?left+10:X(r.opening)+12}" y="149">${delayText}</text>`;
  s+=`<rect x="${X(r.opening)}" y="193" width="${right-X(r.opening)}" height="34" rx="4" fill="#cce8dc" stroke="#17665d"/>`;
  const serviceWidth=right-X(r.opening),shortService=serviceWidth<330;
  s+=`<text x="${shortService?right-10:X(r.opening)+10}" y="${shortService?185:215}" text-anchor="${shortService?'end':'start'}">Opening ${r.opening} → ${r.end} · n = ${r.years} years · CESAL accumulation</text>`;
  s+=diamond(r.end,275,'#2563a0')+`<text x="${right-14}" y="279" text-anchor="end">Projected ${r.end} · ${fmt(r.endAADT)} veh/day</text>`;
  s+=`<line x1="${X(r.opening)}" x2="${X(r.opening)}" y1="105" y2="242" stroke="#17665d" stroke-dasharray="4 4"/><text x="${right}" y="321" text-anchor="end">Opening AADT: ${fmt(r.openingAADT)} veh/day · Annual growth: ${fmt(r.growth)}%</text><text x="15" y="350">Bars represent traffic projection periods, not a construction schedule. End boundary is not an extra CESAL year.</text></svg>`;
  return s;
 }
 function render(p){const target=document.getElementById('trafficTimeline');if(!target)return;
  const ganttTarget=document.getElementById('trafficGantt');if(ganttTarget)ganttTarget.textContent='Enter valid survey/opening years and traffic to show the Gantt timeline.';
  const legend=document.getElementById('trafficLegend');if(legend?.replaceChildren)legend.replaceChildren();
  try{const r=build(p);if(!r){target.textContent='Enter survey year, opening year and included survey AADT to show the growth timeline.';return;}
   const max=Math.max(1,...r.points.map(p=>p.aadt)),X=year=>85+(year-r.survey)/(r.end-r.survey)*780,Y=n=>270-n/max*205,fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:1});
   let s='<svg viewBox="0 0 960 525" role="img" aria-label="Included traffic growth from survey through opening to design-period end"><rect width="960" height="525" fill="white"/>';
   s+=`<rect x="85" y="55" width="${X(r.opening)-85}" height="215" fill="#f4f0e6"/><rect x="${X(r.opening)}" y="55" width="${865-X(r.opening)}" height="215" fill="#edf7f3"/>`;
   for(let i=0;i<=4;i++){const v=max*i/4;s+=`<line x1="85" x2="865" y1="${Y(v)}" y2="${Y(v)}" stroke="#dce5eb"/><text x="75" y="${Y(v)+4}" text-anchor="end">${fmt(v)}</text>`;}
   if(p.showVehicles)for(const series of r.series)s+=`<polyline class="vehicle-series" points="${series.points.map(point=>X(point.year)+','+Y(point.aadt)).join(' ')}" fill="none" stroke="${series.color}" stroke-width="2" stroke-dasharray="${series.dash}"/>`;
   s+=`<polyline points="${r.points.map(p=>X(p.year)+','+Y(p.aadt)).join(' ')}" fill="none" stroke="#17665d" stroke-width="3"/><text x="85" y="27">INCLUDED TWO-WAY AADT · vehicles/day</text><text x="865" y="27" text-anchor="end">Annual growth ${fmt(r.growth)}%</text>`;
   const step=Math.max(1,Math.ceil((r.end-r.survey)/7)),ticks=[];for(let year=r.survey;year<=r.end;year+=step)ticks.push(year);if(ticks.at(-1)!==r.end){if(r.end-ticks.at(-1)<step/2)ticks.pop();ticks.push(r.end);}
   s+='<line x1="85" x2="865" y1="270" y2="270" stroke="#526873"/>';
   for(const year of ticks)s+=`<line x1="${X(year)}" x2="${X(year)}" y1="270" y2="277" stroke="#526873"/><text x="${X(year)}" y="295" text-anchor="middle">${year}</text>`;
   s+='<text x="475" y="319" text-anchor="middle">CALENDAR YEAR</text>';
   const milestones=[{year:r.survey,aadt:r.total,label:'Survey · measured base',detail:'Included two-way survey traffic',color:'#8b682d'},{year:r.opening,aadt:r.openingAADT,label:'Opening · start of service',detail:`Projected ${r.opening-r.survey} years after survey`,color:'#17665d'},{year:r.end,aadt:r.endAADT,label:'Projected · design-period end',detail:`${r.years}-year design period after opening`,color:'#2563a0'}];
   for(const [i,m] of milestones.entries()){const x=85+i*265;s+=`<line x1="${X(m.year)}" x2="${X(m.year)}" y1="55" y2="270" stroke="${m.color}" stroke-dasharray="4 4"/><circle cx="${X(m.year)}" cy="${Y(m.aadt)}" r="${r.opening===r.survey&&i===0?8:5}" fill="white" stroke="${m.color}" stroke-width="2"/><rect x="${x}" y="340" width="250" height="112" rx="6" fill="#f5f8fa" stroke="${m.color}"/><text x="${x+12}" y="361">${m.label}</text><text x="${x+12}" y="384">Year ${m.year} · ${fmt(m.aadt)} veh/day</text><text x="${x+12}" y="407">${m.detail}</text><text x="${x+12}" y="430">${i===0?'Measured AADT input':`AADT = survey × (1 + g)^${m.year-r.survey}`}</text>`;}
   s+=`<text x="85" y="480">Survey → opening: ${r.opening-r.survey} years · Opening → projected end: ${r.years} years · Annual growth ${fmt(r.growth)}%</text><text x="85" y="506">Projected end = opening year + design period; this boundary is not an extra year in the CESAL sum.</text></svg>`;target.innerHTML=s;if(ganttTarget)ganttTarget.innerHTML=gantt(r);
   if(legend&&document.createElement){const heading=document.createElement('h3');heading.textContent='Legend · AADT (veh/day)';legend.append(heading);const entries=[{label:'Total included vehicles',color:'#17665d',points:r.points},...(p.showVehicles?r.series:[])];
    for(const entry of entries){const box=document.createElement('section');box.className='timeline-legend-item';const title=document.createElement('h4'),swatch=document.createElement('span');swatch.className='timeline-swatch';swatch.style.borderColor=entry.color;swatch.style.borderTopStyle=entry.dash?'dashed':'solid';swatch.setAttribute('aria-hidden','true');title.append(swatch,document.createTextNode(entry.label));box.append(title);const list=document.createElement('dl');for(const [label,point] of [['Survey '+r.survey,entry.points[0]],['Opening '+r.opening,entry.points[r.opening-r.survey]],['Projected '+r.end,entry.points.at(-1)]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=fmt(point.aadt);list.append(dt,dd);}box.append(list);legend.append(box);}
   }
  }catch(e){target.textContent=e.message;if(ganttTarget)ganttTarget.textContent=e.message;}
 }
 globalThis.TrafficTimeline=Object.freeze({build,render});
})();
