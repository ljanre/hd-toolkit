(() => {
  const $=id=>document.getElementById(id),C=DesignTraffic,V=VehicleAnnex,rows=[];let result=null,active=[];
  const n=input=>input.value.trim()===''||input.validity.badInput?NaN:Number(input.value),fmt=value=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:2}):'—';
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  function add(profile=V.profiles[0]){
    if(rows.length>=50)return;
    const tr=make('tr'),row={tr},heading=make('th'),select=make('select'),diagram=make('div');
    for(const p of V.profiles){const option=make('option',p.code+' · '+p.name);option.value=p.code;select.append(option);}select.value=profile.code;select.setAttribute('aria-label','Configuration for loading case '+(rows.length+1));heading.append(select,diagram);tr.append(heading);row.select=select;row.diagram=diagram;
    function input(label,type='number'){const cell=make('td'),field=make('input');field.type=type;field.step='any';field.min='0';field.setAttribute('aria-label',profile.code+' '+label);cell.append(field);tr.append(cell);return field;}
    row.count=input('survey AADT');row.count.placeholder='AADT';row.weight=input('adopted GVW (kg)');row.fractions=input('physical axle fractions','text');row.fractions.placeholder='e.g. 0.2, 0.8';
    const modeCell=make('td'),mode=make('select');for(const [value,label] of [['auto','From Axle Fractions'],['manual','Entered EF']]){const option=make('option',label);option.value=value;mode.append(option);}mode.setAttribute('aria-label',profile.code+' EF source');modeCell.append(mode);tr.append(modeCell);row.mode=mode;
    const efCell=make('td'),automatic=make('input'),manual=make('input'),note=make('small');automatic.readOnly=true;automatic.setAttribute('aria-label',profile.code+' calculated EF');manual.type='number';manual.min='0';manual.step='any';manual.setAttribute('aria-label',profile.code+' entered EF');manual.hidden=true;note.className='sheet-row-note';efCell.append(automatic,manual,note);tr.append(efCell);row.automatic=automatic;row.manual=manual;row.note=note;
    const removeCell=make('td'),remove=make('button','−');remove.type='button';remove.setAttribute('aria-label','Remove loading case '+(rows.length+1));remove.addEventListener('click',()=>{rows.splice(rows.indexOf(row),1);tr.remove();update();});removeCell.append(remove);tr.append(removeCell);
    function setProfile(){const p=V.profiles.find(p=>p.code===select.value);row.weight.value=String(p.gvw);row.fractions.value=p.fractions?p.fractions.join(', '):'';row.diagram.innerHTML=V.diagram(p);}
    select.addEventListener('change',()=>{setProfile();update();});setProfile();rows.push(row);$('sheetRows').append(tr);return row;
  }
  function factor(row){
    row.note.textContent='';row.automatic.hidden=row.mode.value==='manual';row.manual.hidden=row.mode.value!=='manual';
    if(row.mode.value==='manual')return n(row.manual);
    if(!row.fractions.value.trim())return NaN;
    const fractions=row.fractions.value.trim().split(/[\s,;]+/).map(Number),weight=n(row.weight);
    if(!Number.isFinite(weight)||weight<=0)throw new Error('Enter a positive GVW for '+row.select.value+'.');
    const profile=V.profiles.find(item=>item.code===row.select.value),expected=profile.fractions?.length||5;
    if(fractions.length!==expected)throw new Error('Code '+row.select.value+' requires '+expected+' physical axle fractions.');
    if(fractions.length>20||fractions.some(value=>!Number.isFinite(value)||value<0||value>1)||Math.abs(fractions.reduce((sum,value)=>sum+value,0)-1)>0.001)throw new Error('Axle fractions for '+row.select.value+' must be nonnegative shares totaling 1 (within 0.001 for printed rounding).');
    const sum=fractions.reduce((total,value)=>total+value,0);if(Math.abs(sum-1)>1e-6)row.note.textContent='Fractions sum to '+sum.toFixed(4)+'; used as entered without normalization.';
    return C.axleFactor(fractions.map(value=>weight*value/1000).join(','));
  }
  function calculationSteps(){
    const body=$('trafficCalculationBody');body.replaceChildren();
    if(!result){body.append(make('p','Enter valid project years and included loading cases to show substituted calculation steps.'));return;}
    const math=value=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:6}):'—',delay=n($('sheetOpening'))-n($('sheetSurvey')),years=n($('sheetYears')),rate=n($('sheetGrowth'))/100,dd=n($('sheetDD')),dl=n($('sheetDL'));
    body.append(make('h3','1. Establish project factors'),make('p',`Survey ${$('sheetSurvey').value}; opening ${$('sheetOpening').value}; delay m = ${delay} years; design period n = ${years} years; annual r = ${math(rate)}; DD = ${math(dd)}; DL = ${math(dl)}.`));
    body.append(make('h3','2. Calculate each included loading case'),make('p','Opening AADT = survey AADT × (1+r)^m. G = [(1+r)^n − 1] / r; G = n when r = 0. Axle load (tonnes) = GVW (kg) × fraction / 1,000. Automatic EF = Σ(axle load / 8.2)^4.'));
    const list=make('ol');active.forEach((row,i)=>{const d=result.detail[i],item=make('li'),count=n(row.count);item.append(make('h4',`Case ${i+1} · ${row.select.value} · GVW ${math(n(row.weight))} kg`));
      item.append(make('p',row.mode.value==='manual'?`Adopted entered EF = ${math(row.ef)} ESAL/vehicle.`:`Axle fractions: ${row.fractions.value||'not provided'}. Calculated EF = ${math(row.ef)} ESAL/vehicle${count===0?' (zero traffic; no loading contribution)':''}.`));
      item.append(make('p',`Opening AADT = ${math(count)} × (1 + ${math(rate)})^${delay} = ${math(d.opening)} vehicles/day.`));
      item.append(make('p',count===0?'Zero AADT: cumulative vehicles and CESAL = 0.':`G = ${math(d.growth)}; cumulative two-way vehicles = 365 × ${math(d.opening)} × ${math(d.growth)} = ${math(d.vehicles/(dd*dl))}.`));
      item.append(make('p',`Design-lane vehicles = cumulative two-way vehicles × ${math(dd)} × ${math(dl)} = ${math(d.vehicles)}.`));
      item.append(make('p',d.esal===null?'CESAL pending: enter a verified EF. This case is excluded from the partial subtotal.':`CESAL = ${math(d.vehicles)} × ${math(row.ef)} = ${math(d.esal)} ESAL.`));list.append(item);});body.append(list);
    body.append(make('h3','3. Sum design traffic · W18'),make('p',result.complete?`W18 = ΣCESAL = ${math(result.total)} ESAL = ${math(result.million)} × 10⁶ ESAL.`:`Partial CESAL subtotal = ${math(result.subtotal)} ESAL; W18 is pending ${result.pendingClasses} missing EF case(s).`),make('p','DD and DL are applied once. Display values are rounded; the calculation uses full precision. Projected-end AADT is a boundary value, not an additional year of CESAL.'));
  }
  function summary(){
    $('sheetSummary').replaceChildren();calculationSteps();if(!result)return;
    active.forEach((row,i)=>{const d=result.detail[i],tr=make('tr');const values=[row.select.value+' · '+fmt(n(row.weight))+' kg',fmt(n(row.count)),fmt(d.opening),fmt(row.ef),fmt(d.vehicles/(n($('sheetDD'))*n($('sheetDL')))),fmt(d.vehicles),d.esal===null?'Pending EF':fmt(d.esal)];values.forEach(value=>tr.append(make('td',value)));$('sheetSummary').append(tr);});
  }
  function update(){
    TrafficTimeline.render({survey:$('sheetSurvey').value,opening:$('sheetOpening').value,years:$('sheetYears').value,growth:$('sheetGrowth').value,counts:rows.filter(row=>row.count.value.trim()!==''||row.count.validity.badInput).map(row=>n(row.count)),labels:rows.filter(row=>row.count.value.trim()!==''||row.count.validity.badInput).map((row,i)=>'Case '+(i+1)+' · '+row.select.value+' · '+fmt(n(row.weight))+' kg'),showVehicles:$('timelineVehicles').checked});
    result=null;active=[];$('sheetTotal').textContent='—';$('sheetW18').textContent='—';$('sheetTotalNote').textContent='Cumulative equivalent standard axle loads';$('sheetMillion').textContent='— ×10⁶ ESAL';$('sheetAADT').textContent='—';$('sheetCompletion').textContent='Input Required';$('sheetError').textContent='';
    $('sheetAuditTitle').textContent='Design Traffic Summary';
    $('sheetAuditParameters').textContent='Survey '+($('sheetSurvey').value||'—')+' · Opening '+($('sheetOpening').value||'—')+' · n = '+($('sheetYears').value||'—')+' years · r = '+($('sheetGrowth').value||'—')+'% · DD = '+($('sheetDD').value||'—')+' · DL = '+($('sheetDL').value||'—');
    try{
      for(const row of rows){row.automatic.value='';row.note.textContent='';row.automatic.hidden=row.mode.value==='manual';row.manual.hidden=row.mode.value!=='manual';const included=row.count.value.trim()!==''||row.count.validity.badInput;row.tr.classList.toggle('sheet-included',included);if(!included)continue;active.push(row);const count=n(row.count);if(!Number.isFinite(count)||count<0)throw new Error('Enter nonnegative AADT for '+row.select.value+'.');row.ef=count===0?0:factor(row);if(Number.isFinite(row.ef))row.automatic.value=row.ef.toFixed(3);else{row.automatic.value='';row.note.textContent=row.mode.value==='manual'?'Enter adopted EF.':'Enter verified axle fractions.';}}
      if(!active.length){summary();return;}
      const survey=n($('sheetSurvey')),opening=n($('sheetOpening'));if(!Number.isInteger(survey)||!Number.isInteger(opening)||survey<1900||opening>2200||opening<survey)throw new Error('Enter valid survey and opening years (1900–2200); opening cannot precede the survey.');
      result=C.forecast({aadt:active.map(row=>n(row.count)),rates:active.map(()=>n($('sheetGrowth'))),factors:active.map(row=>row.ef),years:n($('sheetYears')),delay:opening-survey,dd:n($('sheetDD')),dl:n($('sheetDL')),preview:true});
      $('sheetAADT').textContent=fmt(active.reduce((sum,row)=>sum+n(row.count),0));$('sheetTotal').textContent=fmt(result.complete?result.total:result.subtotal);$('sheetMillion').textContent=fmt(result.complete?result.million:result.subtotalMillion)+' ×10⁶ ESAL'+(result.complete?'':' · Partial subtotal');$('sheetCompletion').textContent=result.complete?'Complete':'Pending EF';$('sheetW18').textContent=result.complete?fmt(result.total)+' ESAL':'Pending EF';$('sheetTotalNote').textContent=result.complete?'Total for all included loading cases':'Partial subtotal · missing EF excluded';
      if(!result.complete)$('sheetError').textContent=result.pendingClasses+' active loading cases have no EF. Their ESAL is excluded from the subtotal.';
    }catch(error){$('sheetError').textContent=error.message;result=null;}
    summary();
  }
  function clear(count=3){rows.splice(0);$('sheetRows').replaceChildren();V.profiles.slice(0,count).forEach(profile=>add(profile));$('sheetSurvey').value='';$('sheetOpening').value='';for(const [id,value] of Object.entries({sheetYears:'20',sheetGrowth:'2',sheetDD:'0.50',sheetDL:'1.00'}))$(id).value=value;update();}
  $('timelineVehicles').addEventListener('change',update);$('configurationForm').addEventListener('input',update);$('configurationForm').addEventListener('change',update);$('configurationForm').addEventListener('submit',event=>event.preventDefault());
  $('sheetClear').addEventListener('click',()=>clear());$('sheetAdd').addEventListener('click',()=>{add();update();});
  $('sheetSample').addEventListener('click',()=>{clear(0);add(V.profiles.find(p=>p.code==='1-2'));add(V.profiles.find(p=>p.code==='11-2'));$('sheetSurvey').value='2025';$('sheetOpening').value='2025';$('sheetGrowth').value='3.8';$('sheetDL').value='0.50';rows.find(row=>row.select.value==='1-2').count.value='2197';const trailer=rows.find(row=>row.select.value==='11-2');trailer.count.value='1865';trailer.fractions.value='0.168, 0.2981, 0.2793, 0.2538';update();});
  window.addEventListener('message',event=>{if(window.parent===window||event.source!==window.parent||event.data?.type!=='hd-toolkit-admin-state'||typeof event.data.enabled!=='boolean')return;const steps=$('trafficCalculationSteps');steps.hidden=!event.data.enabled;if(steps.hidden)steps.open=false;});
  if(window.parent!==window)window.parent.postMessage({type:'hd-toolkit-traffic-ready'},'*');
  clear();
})();
