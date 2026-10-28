(() => {
  const H=Hydrology,R=HydrologyReferences,$=id=>document.getElementById(id);
  const fields=['project','outlet','period','criterion','areaUnit','tcMode','tc','minimum','tcBasis','rainMode','rainPeriod','station','rainSource','interpolation','intensity','sourceDuration','shortArea','shortC','shortTc','shortIntensity'];
  const areaRows=[],segments=[],points=[];let result=null,unit='ha',counter=0,guideTrigger;
  const fmt=(n,d=4)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const cell=(row,label,node,tag='td')=>{const td=make(tag);td.dataset.label=label;td.append(node);row.append(td);return td;};
  function input(label,type='number',value=''){
    const node=make('input');node.type=type;node.value=value;node.setAttribute('aria-label',label);
    if(type==='number'){node.step='any';node.min='0';}else node.maxLength=200;return node;
  }
  function selection(label,options,value){
    const wrap=make('div'),select=make('select'),text=make('span');wrap.className='select-wrap';text.className='selected-text';text.setAttribute('aria-hidden','true');select.setAttribute('aria-label',label);
    for(const [v,name] of options){const option=make('option',name);option.value=v;select.append(option);}select.value=value;
    const sync=()=>{text.textContent=select.selectedOptions[0]?.textContent||'';};select.addEventListener('change',sync);sync();wrap.append(select,text);return {wrap,select,sync};
  }
  function removeButton(label,list,item,node){
    const button=make('button','−');button.type='button';button.className='remove';button.setAttribute('aria-label',label);
    button.addEventListener('click',()=>{list.splice(list.indexOf(item),1);node.remove();paint();save();});return button;
  }
  function addArea(data={}){
    if(areaRows.length>=50)return;
    const id=++counter,tr=make('tr'),row={tr};
    const selected=selection('Land cover for area '+id,[['manual','Project-specific coefficient'],...R.coefficients.map(r=>[r.id,r.label])],data.reference||'manual');
    row.reference=selected.select;const heading=cell(tr,'Surface',selected.wrap,'th');heading.scope='row';row.name=input('Description for area '+id,'text',data.name||'');row.name.placeholder='Description / subcatchment';row.name.className='row-name';heading.append(row.name);
    row.area=input('Area '+id,'number',data.area??'');cell(tr,'Area',row.area);
    row.c=input('Runoff coefficient for area '+id,'number',data.c??'');row.c.max='1';const cCell=cell(tr,'Adopted C',row.c);row.range=make('small');row.upper=make('button','Use upper range');row.upper.type='button';row.upper.className='upper';cCell.append(row.range,row.upper);
    row.upper.addEventListener('click',()=>{const ref=R.coefficients.find(r=>r.id===row.reference.value);if(ref){row.c.value=String(ref.max);paint();save();}});
    row.ca=make('output','—');cell(tr,'C × A · ha',row.ca);cell(tr,'Remove',removeButton('Remove contributing area '+id,areaRows,row,tr));
    areaRows.push(row);$('areaRows').append(tr);return row;
  }
  function addSegment(data={}){
    if(segments.length>=30)return;
    const id=++counter,tr=make('tr'),row={tr};
    const selected=selection('Velocity method for segment '+id,[['manual','Enter hydraulic / adopted velocity'],...R.velocities.map(r=>[r.id,r.label])],data.method||'manual');row.method=selected.select;cell(tr,'Velocity method',selected.wrap,'th');
    row.length=input('Length of segment '+id,'number',data.length??'');cell(tr,'Length · m',row.length);
    row.slope=input('Slope of segment '+id+' percent','number',data.slope??'');cell(tr,'Slope · %',row.slope);
    row.velocity=input('Velocity of segment '+id,'number',data.velocity??'');cell(tr,'Velocity · m/s',row.velocity);
    row.time=make('output','—');cell(tr,'Travel time · min',row.time);cell(tr,'Remove',removeButton('Remove flow segment '+id,segments,row,tr));
    segments.push(row);$('segmentRows').append(tr);return row;
  }
  function addPoint(data={}){
    if(points.length>=60)return;
    const id=++counter,tr=make('tr'),row={tr};row.duration=input('RIDF duration for point '+id,'number',data.duration??'');row.intensity=input('RIDF intensity for point '+id,'number',data.intensity??'');cell(tr,'Duration · min',row.duration);cell(tr,'Intensity · mm/h',row.intensity);cell(tr,'Remove',removeButton('Remove RIDF point '+id,points,row,tr));points.push(row);$('idfRows').append(tr);return row;
  }
  function read(){
    const state=Object.fromEntries(fields.map(id=>[id,$(id).value]));state.unit=state.areaUnit;state.critical=$('critical').checked;state.example=!$('exampleNotice').hidden;
    state.areas=areaRows.map(r=>({name:r.name.value,reference:r.reference.value,area:r.area.validity.badInput?'invalid':r.area.value,c:r.c.validity.badInput?'invalid':r.c.value}));
    state.segments=segments.map(r=>({method:r.method.value,length:r.length.validity.badInput?'invalid':r.length.value,slope:r.slope.validity.badInput?'invalid':r.slope.value,velocity:r.velocity.validity.badInput?'invalid':r.velocity.value}));
    state.points=points.map(r=>({duration:r.duration.validity.badInput?'invalid':r.duration.value,intensity:r.intensity.validity.badInput?'invalid':r.intensity.value}));
    for(const id of fields)if($(id).validity?.badInput)state[id]='invalid';
    return state;
  }
  function save(){try{localStorage.setItem('hd-hydrology-v1',JSON.stringify(read()));}catch{}}
  function load(state={}){
    for(const id of fields)$(id).value=String(state[id]??({areaUnit:'ha',tcMode:'manual',rainMode:'idf',interpolation:'log'}[id]??''));
    if(!['ha','m2','km2'].includes($('areaUnit').value))$('areaUnit').value='ha';unit=$('areaUnit').value;
    for(const [id,value] of [['tcMode','manual'],['rainMode','idf'],['interpolation','log']])if(!$(id).value)$(id).value=value;
    $('critical').checked=state.critical===true;
    areaRows.splice(0);segments.splice(0);points.splice(0);for(const id of ['areaRows','segmentRows','idfRows'])$(id).replaceChildren();
    (Array.isArray(state.areas)&&state.areas.length?state.areas:[{}]).slice(0,50).forEach(addArea);
    (Array.isArray(state.segments)&&state.segments.length?state.segments:[{}]).slice(0,30).forEach(addSegment);
    (Array.isArray(state.points)&&state.points.length?state.points:[{},{},{}]).slice(0,60).forEach(addPoint);
    $('exampleNotice').hidden=!state.example;paint();
  }
  function note(text){$('reviewNotes').append(make('li',text));}
  function summaryRow(label,value){const tr=make('tr'),th=make('th',label);th.scope='row';tr.append(th,make('td',value));$('resultRows').append(tr);}
  function step(title,text){$('workedSteps').append(make('h3',title),make('p',text));}
  function rainTrace(r){
    if(!r.lower)return 'Entered intensity '+fmt(r.intensity,8)+' mm/h at '+fmt(r.duration,8)+' min.';
    if(r.exact)return 'Exact RIDF point: '+fmt(r.intensity,8)+' mm/h at '+fmt(r.duration,8)+' min.';
    return ($('interpolation').value==='log'?'Log–log':'Linear')+' interpolation between ('+fmt(r.lower.duration)+' min, '+fmt(r.lower.intensity)+' mm/h) and ('+fmt(r.upper.duration)+' min, '+fmt(r.upper.intensity)+' mm/h), at '+fmt(r.duration,8)+' min: i = '+fmt(r.intensity,8)+' mm/h. No extrapolation.';
  }
  function renderResult(p,r){
    $('qResult').textContent=fmt(r.q,4)+' m³/s';$('qLitres').textContent=fmt(r.litres,2)+' L/s';$('copyQ').disabled=false;$('resultDetail').hidden=false;
    $('calculationStatus').textContent='Calculated '+fmt(r.period)+'-year peak discharge · '+(r.criticalControls?'short-duration branch check controls.':'full-catchment condition controls.');
    if(!p.rainSource.trim()||!p.station.trim())note('Record the rainfall source, issue and representative station before adopting this calculation for the project.');
    if(!p.criterion.trim())note('Record the governing return-period criterion and check the required higher-flood hydraulic condition.');
    if(!p.tcBasis.trim())note('Record the flow-path survey / Tc method and any adopted minimum-duration provision.');
    if(r.minimum>r.tc)note('The entered minimum duration controls intensity. Confirm this duration floor is required by the governing project provision.');
    if(r.q===0)note('All contributing runoff coefficients produce zero discharge. Review whether zero runoff represents the design catchment.');
    for(const row of r.basin.areas){const ref=R.coefficients.find(x=>x.id===row.reference);if(!row.excluded&&ref&&(row.c<ref.min||row.c>ref.max))note((row.name||ref.label)+': adopted C = '+fmt(row.c)+' is outside the Table 5.7 range '+ref.min.toFixed(2)+'–'+ref.max.toFixed(2)+'. Record the project-specific basis.');}
    if(!p.critical)note('For combined drainage branches with different Tc values, evaluate the critical shorter-duration condition (§5.3.3). This worksheet does not route an entire drainage network.');
    summaryRow('Total contributing area',fmt(r.basin.area,8)+' ha');summaryRow('Σ(C × A)',fmt(r.basin.ca,8)+' ha');summaryRow('Area-weighted C',fmt(r.basin.c,8));summaryRow('Design return period',fmt(r.period)+' years · AEP '+fmt(100/r.period,3)+'%');summaryRow('Time of concentration',fmt(r.tc,8)+' min');summaryRow('Adopted rainfall duration',fmt(r.duration,8)+' min');summaryRow('Rainfall intensity',fmt(r.rain.intensity,8)+' mm/h');summaryRow('Full-catchment Q',fmt(r.base,8)+' m³/s');
    if(r.critical)summaryRow('Short-duration check Q′',fmt(r.critical.q,8)+' m³/s');summaryRow('Resulting peak Q',fmt(r.q,8)+' m³/s');
    step('Design basis','Project: '+(p.project||'not recorded')+'. Outlet: '+(p.outlet||'not recorded')+'. Return-period criterion: '+(p.criterion||'not recorded')+'.');
    step('1. Catchment and coefficient · Eqs. (5.28)–(5.29)','A = '+fmt(r.basin.area,8)+' ha; Σ(Ci Ai) = '+fmt(r.basin.ca,8)+' ha; Cweighted = Σ(Ci Ai) / A = '+fmt(r.basin.c,8)+'. Areas are non-overlapping and drain to this outlet.');
    if(r.travel)step('2. Time of concentration · Eqs. (2.3)–(2.4)','Tc = Σ[L / (60 V)] = '+r.travel.segments.map(s=>'('+fmt(s.length)+' / (60 × '+fmt(s.velocity,8)+'))').join(' + ')+' = '+fmt(r.tc,8)+' min.');
    else step('2. Adopted time of concentration','Tc = '+fmt(r.tc,8)+' min. Basis: '+(p.tcBasis||'not recorded')+'.');
    step('3. Design intensity','T = '+fmt(r.period)+' years. Duration = max('+fmt(r.tc,8)+', '+fmt(r.minimum)+') = '+fmt(r.duration,8)+' min. '+rainTrace(r.rain)+' Source: '+(p.station||'station not recorded')+'; '+(p.rainSource||'RIDF source not recorded')+'.');
    if(r.series&&!r.rain.exact)step('Interpolation equation',$('interpolation').value==='log'?'ln(i) = ln(i1) + [ln(t/t1) / ln(t2/t1)] × ln(i2/i1).':'i = i1 + [(t − t1) / (t2 − t1)] × (i2 − i1).');
    step('4. Rational peak · Eq. (5.28)','Q = i × Σ(Ci Ai) / 360 = '+fmt(r.rain.intensity,8)+' × '+fmt(r.basin.ca,8)+' / 360 = '+fmt(r.base,8)+' m³/s. Conversion: 1 ha = 10,000 m²; 1 mm = 0.001 m; 1 hour = 3,600 seconds.');
    if(r.critical){const c=r.critical;step('5. Two-branch critical check · Eq. (5.31)','Short branch: A = '+fmt(c.shortArea,8)+' ha, C = '+fmt(c.shortC,8)+', Tc = '+fmt(c.shortTc,8)+' min. Remaining long branch: A = '+fmt(c.longArea,8)+' ha, C = '+fmt(c.longC,8)+'. '+rainTrace(c.shortRain)+' Q′ = '+fmt(c.shortRain.intensity,8)+' × [('+fmt(c.longCA,8)+' × '+fmt(c.shortTc,8)+' / '+fmt(r.tc,8)+') + '+fmt(c.shortCA,8)+'] / 360 = '+fmt(c.q,8)+' m³/s. Adopt max(Q, Q′) = '+fmt(r.q,8)+' m³/s.');}
    step('Hydraulic design input','Peak discharge = '+fmt(r.q,8)+' m³/s. Use unrounded values in further calculations. Check the proposed drain / culvert hydraulically for the governing project conditions; this result does not establish a structure size.');
  }
  function drawCurve(p,r){
    const target=$('idfChart');target.replaceChildren();if(p.rainMode!=='idf')return;
    let series;try{series=r?.series||H.curve(p.points,p.interpolation);}catch{target.append(make('p','Enter RIDF durations and intensities to draw the source curve.'));return;}
    if(series.data.length<2){target.append(make('p','Add a second source point to draw the RIDF curve.'));return;}
    const data=series.data,w=900,h=300,left=76,right=32,top=32,bottom=58;
    const xmin=data[0].duration,xmax=data.at(-1).duration,imin=Math.min(...data.map(x=>x.intensity)),imax=Math.max(...data.map(x=>x.intensity));
    const ymin=imin*.85,ymax=imax*1.15;
    const x=t=>left+Math.log(t/xmin)/Math.log(xmax/xmin)*(w-left-right),y=i=>h-bottom-Math.log(i/ymin)/Math.log(ymax/ymin)*(h-top-bottom);
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('role','img');svg.setAttribute('aria-label','Entered RIDF curve with calculated rainfall-duration markers');
    function el(tag,attrs,text){const n=document.createElementNS(ns,tag);for(const [key,v] of Object.entries(attrs))n.setAttribute(key,String(v));if(text!==undefined)n.textContent=text;svg.append(n);return n;}
    for(let j=0;j<=4;j++){
      const t=xmin*Math.pow(xmax/xmin,j/4),i=ymin*Math.pow(ymax/ymin,j/4);
      el('line',{x1:x(t),y1:top,x2:x(t),y2:h-bottom,stroke:'#dce5eb'});el('text',{x:x(t),y:h-bottom+22,'text-anchor':'middle',fill:'#536977','font-size':12},fmt(t,2));
      el('line',{x1:left,y1:y(i),x2:w-right,y2:y(i),stroke:'#dce5eb'});el('text',{x:left-10,y:y(i)+4,'text-anchor':'end',fill:'#536977','font-size':12},fmt(i,2));
    }
    let path='';for(let j=0;j<160;j++){const t=xmin*Math.pow(xmax/xmin,j/159),i=H.interpolate(series,t).intensity;path+=(j?' L ':'M ')+x(t)+' '+y(i);}
    el('path',{d:path,fill:'none',stroke:'#2f6ea3','stroke-width':2.5});
    for(const p of data)el('circle',{cx:x(p.duration),cy:y(p.intensity),r:4,fill:'#2f6ea3'});
    const mark=(rain,color)=>{if(!rain)return;el('line',{x1:x(rain.duration),y1:top,x2:x(rain.duration),y2:h-bottom,stroke:color,'stroke-dasharray':'5 4'});el('circle',{cx:x(rain.duration),cy:y(rain.intensity),r:6,fill:color,stroke:'white','stroke-width':2});};
    mark(r?.rain,'#17665d');mark(r?.critical?.shortRain,'#b87920');
    el('text',{x:(left+w-right)/2,y:h-12,'text-anchor':'middle',fill:'#203444','font-size':13},'Duration · minutes (log scale)');
    el('text',{x:left,y:18,fill:'#203444','font-size':13},'Intensity · mm/h (log scale)');target.append(svg);
  }
  function paint(){
    $('segmentFields').hidden=$('tcMode').value!=='segments';$('manualTcField').hidden=$('tcMode').value!=='manual';$('idfFields').hidden=$('rainMode').value!=='idf';$('directFields').hidden=$('rainMode').value!=='direct';$('criticalFields').hidden=!$('critical').checked;$('shortIntensityField').hidden=$('rainMode').value!=='direct';
    const unitLabel={ha:'ha',m2:'m²',km2:'km²'}[$('areaUnit').value];$('areaUnitHeading').textContent=unitLabel;document.querySelectorAll('.area-unit-label').forEach(n=>n.textContent=unitLabel);
    for(const row of areaRows){const ref=R.coefficients.find(r=>r.id===row.reference.value);row.range.textContent=ref?'Table 5.7: '+ref.min.toFixed(2)+'–'+ref.max.toFixed(2):'Enter approved project C';row.upper.hidden=!ref;row.ca.textContent='—';}
    for(const row of segments){const manual=row.method.value==='manual';row.velocity.readOnly=!manual;row.slope.disabled=manual;
      if(!manual){const ref=R.velocities.find(r=>r.id===row.method.value),slope=Number(row.slope.value);row.velocity.value=ref&&slope>0?String(10*ref.k*Math.sqrt(slope/100)):'';}
      const len=Number(row.length.value),v=Number(row.velocity.value);row.time.textContent=len>0&&v>0?fmt(len/(60*v),4):'—';
    }
    const p=read();$('copyStatus').textContent='';$('reviewNotes').replaceChildren();$('resultRows').replaceChildren();$('workedSteps').replaceChildren();result=null;$('copyQ').disabled=true;$('resultDetail').hidden=true;$('qResult').textContent='— m³/s';$('qLitres').textContent='— L/s';
    $('totalArea').textContent=$('totalCA').textContent=$('weightedC').textContent='—';
    try{const b=H.catchment(p.areas,p.unit);$('totalArea').textContent=fmt(b.area/({ha:1,m2:1/10000,km2:100}[p.unit]),8)+' '+unitLabel;$('weightedC').textContent=fmt(b.c,6);$('totalCA').textContent=fmt(b.ca,8);b.areas.forEach((a,i)=>areaRows[i].ca.textContent=a.excluded?'—':fmt(a.ca,6));}catch{}
    let tc;try{tc=p.tcMode==='segments'?H.travelTime(p.segments,R.velocities).minutes:Number(p.tc);}catch{}
    const minimum=Number(p.minimum);$('tcOutput').textContent=Number.isFinite(tc)&&tc>0?fmt(tc,4)+' min':'—';$('durationOutput').textContent=Number.isFinite(tc)&&tc>0&&Number.isFinite(minimum)&&minimum>=0?fmt(Math.max(tc,minimum),4)+' min':'—';
    try{result=H.calculate(p,R);renderResult(p,result);}catch(error){$('calculationStatus').textContent=error.message;}
    drawCurve(p,result);
    $('addArea').disabled=areaRows.length>=50;$('addSegment').disabled=segments.length>=30;$('addRainPoint').disabled=points.length>=60;
  }
  $('areaUnit').addEventListener('change',()=>{
    const next=$('areaUnit').value,factors={ha:1,m2:1/10000,km2:100};
    for(const field of [...areaRows.map(r=>r.area),$('shortArea')])if(field.value.trim()!==''&&!field.validity.badInput&&Number.isFinite(Number(field.value)))field.value=String(Number(field.value)*factors[unit]/factors[next]);
    unit=next;
  });
  $('hydrologyForm').addEventListener('input',()=>{paint();save();});$('hydrologyForm').addEventListener('change',()=>{paint();save();});$('hydrologyForm').addEventListener('submit',e=>e.preventDefault());
  for(const [id,add] of [['addArea',addArea],['addSegment',addSegment],['addRainPoint',addPoint]])$(id).addEventListener('click',()=>{add();paint();save();});
  $('resetHydrology').addEventListener('click',()=>{load();save();});
  $('loadExample').addEventListener('click',()=>{
    load({project:'FHWA HDS-2 · Example 5.5',outlet:'Memphis farm-road crossing',period:'25',criterion:'FHWA HDS-2 Example 5.5 · local-authority example criterion',areaUnit:'ha',tcMode:'manual',tc:'36',tcBasis:'Example 5.5 adopts rounded Tc = 36 min; full segment travel time is about 36.36 min.',rainMode:'direct',rainPeriod:'25',station:'Memphis, Tennessee · example only',rainSource:'FHWA HDS-2 Example 5.5, pp. 5-34–5-35 · not Philippine RIDF data',intensity:'85',sourceDuration:'36',areas:[{name:'Parkland',reference:'parks',area:'21.8',c:'.20'},{name:'Impervious commercial',reference:'downtown',area:'1.5',c:'.95'},{name:'Single-family residential',reference:'single',area:'20.4',c:'.40'}],segments:[{method:'manual',length:'90',velocity:'.30'},{method:'manual',length:'300',velocity:'.64'},{method:'manual',length:'650',velocity:'.46'}],example:true});save();
  });
  $('copyQ').addEventListener('click',async()=>{
    if(!result)return;const value=String(result.q);let copied=false;
    try{await navigator.clipboard.writeText(value);copied=true;}catch{
      const field=make('textarea');field.value=value;field.style.cssText='position:fixed;left:-9999px';document.body.append(field);field.select();try{copied=document.execCommand('copy');}catch{}field.remove();$('copyQ').focus();
    }
    $('copyStatus').textContent=copied?'Copied full-precision Q in m³/s.':'Copy unavailable. Q = '+value+' m³/s.';
  });
  $('printHydrology').addEventListener('click',()=>window.print());
  const guides={
    period:['Design return period','Adopt the required frequency from the governing DPWH/project road and drainage-structure criteria. The entered rainfall curve must have the same return period. AEP = 100 / T percent per year. A 25-year return period does not mean a flood occurs only once every 25 years.','The tourism-road extract is limited to its stated road class. A higher return-period discharge / freeboard check is separate; the calculator does not automatically assert compliance.'],
    area:['Contributing catchment area','Delineate the topographic drainage boundary to the proposed inlet, ditch outlet or culvert, including upstream pipes and areas intercepted by the road. Use horizontal plan area, not pavement surface area measured along its slope.','Split different land covers into non-overlapping areas. 1 ha = 10,000 m² = 0.01 km². Changing units converts entered areas. FHWA HDS-2 §5.3.1 assumes an area smaller than 80 ha for this method.'],
    coefficient:['Runoff coefficient C','Use the land-cover range in FHWA HDS-2 Table 5.7, p. 5-33, considering soil, slope, imperviousness and the governing project provision. Values remain editable. C is dimensionless between 0 and 1; do not substitute an SCS curve number.','For mixed covers, Cweighted = Σ(Ci Ai) / ΣAi. Selecting a reference does not assume a midpoint. Use upper range only when justified. A value outside the table remains an explicitly entered project value and is flagged.'],
    tc:['Time of concentration','Tc represents travel from the hydraulically most distant point to the design outlet. Use the longest travel-time path, not necessarily the longest distance. Do not add parallel branches. Include upstream channel/pipe travel.','Enter an adopted project Tc, or compute sequential travel times using Tc = Σ[L/(60V)], with L in metres and V in m/s. FHWA HDS-2 Eqs. (2.3)–(2.4), pp. 2-21–2-22. Empirical cover velocities use Table 2.2, p. 2-24; select a method appropriate to each flow regime.'],
    minimum:['Minimum rainfall duration','Leave blank to use the calculated/adopted Tc directly. Enter a duration floor only when the governing agency/project provision specifies one, and record its source. No universal minimum Tc is assigned.','Intensity is evaluated at max(Tc, entered minimum duration). The physical travel times remain unchanged in the two-branch critical check.'],
    rain:['Design rainfall intensity','Obtain site-representative PAGASA or approved project RIDF data at the design return period and duration. Record the station, data issue and representativeness. The nearest gauge is not automatically a suitable design station.','Enter intensity in mm/h. If the source gives depth P in mm for duration t minutes, i = 60P/t. In direct mode, enter the matching duration. In table mode, supply source points bracketing the adopted duration. Daily rainfall alone is not a short-duration RIDF intensity.'],
    interpolation:['Interpolation between RIDF points','Exact supplied durations use their entered intensity. Log–log interpolation uses ln(i) = ln(i1) + [ln(t/t1)/ln(t2/t1)] ln(i2/i1). Linear interpolation operates directly on duration and intensity.','These are numerical choices, not a DPWH/PAGASA-prescribed interpolation rule. Use the issued RIDF equation or source-prescribed method when available; its intensity can be entered directly. Durations must be unique, intensities positive and non-increasing, and extrapolation is not used.']
  };
  document.querySelectorAll('[data-guide]').forEach(button=>button.addEventListener('click',()=>{guideTrigger=button;const guide=guides[button.dataset.guide];$('guideTitle').textContent=guide[0];$('guideBody').replaceChildren(...guide.slice(1).map(text=>make('p',text)));$('inputGuide').showModal();$('closeGuide').focus();}));
  $('closeGuide').addEventListener('click',()=>$('inputGuide').close());$('inputGuide').addEventListener('close',()=>guideTrigger?.focus());
  for(const ref of R.coefficients){const tr=make('tr');tr.append(make('th',ref.label),make('td',ref.min.toFixed(2)+'–'+ref.max.toFixed(2)));$('coefficientTable').append(tr);}
  for(const ref of R.velocities){const tr=make('tr');tr.append(make('th',ref.label),make('td',ref.k.toFixed(3)));$('velocityTable').append(tr);}
  let saved;try{saved=JSON.parse(localStorage.getItem('hd-hydrology-v1'));if(!saved||typeof saved!=='object')saved=null;}catch{}
  load(saved||{});
})();
