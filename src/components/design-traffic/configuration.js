(() => {
  const $=id=>document.getElementById(id),C=DesignTraffic,V=VehicleAnnex,rows=[];let result=null,active=[];
  const n=input=>input.value.trim()===''||input.validity.badInput?NaN:Number(input.value),fmt=value=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:2}):'—';
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const caseCode=row=>row.select.value==='custom'?(row.sampleName||'New Configuration'):row.select.value;
  function visualProfile(row){
    const standard=V.profiles.find(p=>p.code===row.select.value);if(standard)return standard;
    const parts=row.fractions.value.trim().split(/[\s,;]+/).map(Number),valid=row.fractions.value.trim()&&parts.length>=2&&parts.length<=20&&parts.every(v=>Number.isFinite(v)&&v>=0&&v<=1);
    return {code:row.layoutCode||'custom',name:row.sampleName||'New Configuration',gvw:n(row.weight),fractions:valid?parts:null,kind:row.customKind||'rigid'};
  }
  function updateVisual(row,index){
    const profile=visualProfile(row),custom=row.select.value==='custom';row.weight.readOnly=true;row.fractions.readOnly=true;row.edit.hidden=!custom;
    row.weight.title=row.fractions.title=custom?'Edit using Edit Configuration':'Catalogue value · select New Configuration to edit';
    row.linked.textContent='Case '+(index+1)+' · '+(custom?profile.name:profile.code+' · '+profile.name);row.efDiagram.innerHTML=V.diagram(profile,true);row.diagram.innerHTML=V.diagram(profile);
    row.lockNote.textContent=custom?'Custom loading case · use Edit Configuration to revise layout, weight or EF.':'Catalogue GVW and axle shares locked. Select New Configuration in Section 1 to edit.';
  }
  function add(profile=V.profiles[0]){
    if(rows.length>=50)return;
    const tr=make('tr'),efTr=make('tr'),row={tr,efTr},heading=make('th'),select=make('select'),diagram=make('div'),linked=make('div');
    for(const p of V.profiles){const option=make('option',p.code+' · '+p.name);option.value=p.code;select.append(option);}const customOption=make('option','New Configuration');customOption.value='custom';select.append(customOption);select.value=profile.code;select.setAttribute('aria-label','Configuration for loading case '+(rows.length+1));heading.append(select,diagram);tr.append(heading);const efDiagram=make('div'),lockNote=make('small');lockNote.className='ef-lock-note';const edit=make('button','Edit Configuration');edit.type='button';edit.className='edit-custom';edit.hidden=true;row.edit=edit;edit.addEventListener('click',()=>editCustom(row));const efHeading=make('th');efHeading.append(linked,efDiagram,lockNote,edit);efTr.append(efHeading);row.efDiagram=efDiagram;row.lockNote=lockNote;row.select=select;row.diagram=diagram;row.linked=linked;
    function input(parent,label,type='number'){const cell=make('td'),field=make('input');field.type=type;field.step='any';field.min='0';field.setAttribute('aria-label',profile.code+' '+label);cell.append(field);parent.append(cell);return field;}
    row.count=input(tr,'survey AADT');row.count.value='0';row.count.placeholder='AADT';
    for(const [key,label] of [['openingDisplay','opening AADT'],['trafficDisplay','cumulative design traffic']]){const cell=make('td'),output=make('output','—');output.setAttribute('aria-label',profile.code+' '+label);cell.append(output);tr.append(cell);row[key]=output;}
    row.weight=input(efTr,'adopted GVW (kg)');row.fractions=input(efTr,'physical axle fractions','text');row.fractions.placeholder='e.g. 0.2, 0.8';
    const efCell=make('td'),automatic=make('input'),note=make('small');automatic.readOnly=true;automatic.setAttribute('aria-label',profile.code+' calculated EF');note.className='sheet-row-note';efCell.append(automatic,note);efTr.append(efCell);row.automatic=automatic;row.note=note;
    const removeCell=make('td'),remove=make('button','−');remove.type='button';remove.className='remove-truck';remove.setAttribute('aria-label','Remove loading case '+(rows.length+1));remove.addEventListener('click',()=>{rows.splice(rows.indexOf(row),1);tr.remove();efTr.remove();update();});removeCell.append(remove);tr.append(removeCell);
    function setProfile(){const p=V.profiles.find(p=>p.code===select.value);row.sampleName=null;row.adoptedEF=null;row.committedValue=select.value;customOption.textContent='New Configuration';if(p){row.layoutCode=p.code;row.customKind=p.kind;row.weight.value=String(p.gvw);row.fractions.value=p.fractions?p.fractions.join(', '):'';}updateVisual(row,rows.includes(row)?rows.indexOf(row):rows.length);}

    select.addEventListener('change',()=>{if(select.value==='custom'){select.value=row.committedValue;editCustom(row);return;}setProfile();update();});setProfile();rows.push(row);$('sheetRows').append(tr);$('sheetEFRows').append(efTr);return row;
  }
  function editCustom(row){
    VehicleConfiguration.open({name:row.select.value==='custom'?caseCode(row):'New Configuration',layout:row.layoutCode||row.select.value,gvw:row.weight.value,fractions:row.fractions.value,manualEF:row.select.value==='custom'?row.adoptedEF:null},config=>{
      row.select.value='custom';row.committedValue='custom';row.layoutCode=config.layout;row.sampleName=config.name;row.customKind=V.profiles.find(p=>p.code===config.layout).kind;row.adoptedEF=config.manualEF;row.weight.value=String(config.gvw);row.fractions.value=config.fractionsText;row.select.querySelector('option[value=custom]').textContent='New Configuration · '+config.name;update();
    },row.select);
  }
  function factor(row){
    row.note.textContent='';
    if(row.select.value==='custom'&&row.adoptedEF!=null){row.note.textContent='Entered verified EF';return row.adoptedEF;}
    if(!row.fractions.value.trim())return NaN;
    const fractions=row.fractions.value.trim().split(/[\s,;]+/).map(Number),weight=n(row.weight);
    if(!Number.isFinite(weight)||weight<=0)throw new Error('Enter a positive GVW for '+row.select.value+'.');
    const profile=V.profiles.find(item=>item.code===row.select.value),expected=row.select.value==='custom'?(V.profiles.find(p=>p.code===row.layoutCode)?.fractions?.length||5):(profile.fractions?.length||5);
    if(row.select.value==='custom'&&fractions.length<2)throw new Error('New Configuration requires at least two physical axle fractions.');
    if(fractions.length!==expected)throw new Error('Code '+row.select.value+' requires '+expected+' physical axle fractions.');
    if(fractions.length>20||fractions.some(value=>!Number.isFinite(value)||value<0||value>1)||Math.abs(fractions.reduce((sum,value)=>sum+value,0)-1)>0.001)throw new Error('Axle fractions for '+row.select.value+' must be nonnegative shares totaling 1 (within 0.001 for printed rounding).');
    const sum=fractions.reduce((total,value)=>total+value,0);if(Math.abs(sum-1)>1e-6)row.note.textContent='Fractions sum to '+sum.toFixed(4)+'; used as entered without normalization.';
    return C.axleFactor(fractions.map(value=>weight*value/1000).join(','));
  }
  function calculationSteps(){
    const body=$('trafficCalculationBody');body.replaceChildren();
    if(!result){body.append(make('p','Enter valid project years and included loading cases to show substituted calculation steps.'));return;}
    const math=value=>Number.isFinite(value)?value.toLocaleString('en-US',{maximumFractionDigits:6}):'—',delay=n($('sheetOpening'))-n($('sheetSurvey')),years=n($('sheetYears')),rate=n($('sheetGrowth'))/100,dd=n($('sheetDD')),dl=n($('sheetDL'));
    const cases=active.map((row,i)=>({row,d:result.detail[i],traffic:n(row.count)===0?0:365*result.detail[i].opening*result.detail[i].growth,label:`Case ${i+1} · ${caseCode(row)}`}));
    body.append(make('h3','1. Design Traffic'),make('p',`Survey ${$('sheetSurvey').value}; opening ${$('sheetOpening').value}; delay m = ${delay} years; design period n = ${years} years; annual g = ${math(rate)}.`),make('p','Opening AADT = survey AADT × (1+g)^m. G = [(1+g)^n − 1] / g; G = n when g = 0. Design Trafficᵢ = opening AADTᵢ × G × 365.'));
    for(const {row,d,traffic,label} of cases)body.append(make('h4',label),make('p',`Opening AADT = ${math(n(row.count))} × (1 + ${math(rate)})^${delay} = ${math(d.opening)} vehicles/day.`),make('p',n(row.count)===0?'Zero AADT: Design Trafficᵢ = 0 vehicles.':`G = ${math(d.growth)}; Design Trafficᵢ = ${math(d.opening)} × ${math(d.growth)} × 365 = ${math(traffic)} vehicles.`));
    body.append(make('h3','2. Equivalence Factor · EF'),make('p','Axle load (tonnes) = GVW (kg) × axle fraction / 1,000. EFᵢ = Σ(axle load / 8.2)^4.'));
    for(const {row,label} of cases)body.append(make('h4',label),make('p',row.select.value==='custom'&&row.adoptedEF!=null?`Entered verified EF = ${math(row.adoptedEF)} ESAL/vehicle. Layout ${row.layoutCode}; GVW ${math(n(row.weight))} kg.`:`GVW = ${math(n(row.weight))} kg; axle fractions: ${row.fractions.value||'not provided'}. Calculated EF = ${math(row.ef)} ESAL/vehicle${n(row.count)===0?' (zero traffic; no loading contribution)':''}.`));
    body.append(make('h3','3. Distribution Factors'),make('p',`DD = ${math(dd)}; DL = ${math(dl)}. Apply these shares once after summing CESALᵢ.`));
    body.append(make('h3','4. CESAL and W18'));
    for(const {row,d,traffic,label} of cases)body.append(make('h4',label),make('p',d.esal===null?'CESALᵢ pending: enter a verified EF. Excluded from the partial subtotal.':`CESALᵢ = Design Trafficᵢ × EFᵢ = ${math(traffic)} × ${math(row.ef)} = ${math(traffic*row.ef)} ESAL before distribution.`),make('p',d.esal===null?'Design-lane contribution pending.':`Design-lane contribution = ${math(traffic*row.ef)} × ${math(dd)} × ${math(dl)} = ${math(d.esal)} ESAL.`));
    body.append(make('p',result.complete?`W18 = ΣCESALᵢ × ${math(dd)} × ${math(dl)} = ${math(result.total)} ESAL = ${math(result.million)} × 10⁶ ESAL.`:`Partial CESAL subtotal = ${math(result.subtotal)} ESAL; W18 is pending ${result.pendingClasses} missing EF case(s).`),make('p','DD and DL are applied once. Display values are rounded; calculation uses full precision. Projected-end AADT is a boundary value, not an additional year of CESAL.'));
  }
  function previewTraffic(){
    // Keep the first-stage vehicle forecast readable if later EF/distribution inputs are incomplete.
    const included=rows.filter(row=>row.count.value.trim()!==''||row.count.validity.badInput),survey=n($('sheetSurvey')),opening=n($('sheetOpening'));
    if(!included.length||!Number.isInteger(survey)||!Number.isInteger(opening)||survey<1900||opening>2200||opening<survey)return;
    try{const preview=C.forecast({aadt:included.map(row=>n(row.count)),rates:included.map(()=>n($('sheetGrowth'))),factors:included.map(()=>0),years:n($('sheetYears')),delay:opening-survey,dd:1,dl:1,preview:true});included.forEach((row,i)=>{row.openingDisplay.textContent=fmt(preview.detail[i].opening);row.trafficDisplay.textContent=fmt(preview.detail[i].vehicles);});}catch{/* Invalid traffic inputs retain the empty first-stage outputs. */}
  }
  function summary(){
    $('sheetSummary').replaceChildren();for(const row of rows){row.openingDisplay.textContent='—';row.trafficDisplay.textContent='—';}calculationSteps();if(!result){previewTraffic();return;}
    active.forEach((row,i)=>{const d=result.detail[i],tr=make('tr'),designTraffic=n(row.count)===0?0:365*d.opening*d.growth,cesal=d.esal===null?null:designTraffic*row.ef;row.openingDisplay.textContent=fmt(d.opening);row.trafficDisplay.textContent=fmt(designTraffic);const values=[caseCode(row)+' · '+fmt(n(row.weight))+' kg',fmt(n(row.count)),fmt(d.opening),fmt(designTraffic),fmt(row.ef),cesal===null?'Pending EF':fmt(cesal),d.esal===null?'Pending EF':fmt(d.esal)];values.forEach(value=>tr.append(make('td',value)));$('sheetSummary').append(tr);});
  }
  function update(){
    TrafficTimeline.render({survey:$('sheetSurvey').value,opening:$('sheetOpening').value,years:$('sheetYears').value,growth:$('sheetGrowth').value,counts:rows.filter(row=>row.count.value.trim()!==''||row.count.validity.badInput).map(row=>n(row.count)),labels:rows.filter(row=>row.count.value.trim()!==''||row.count.validity.badInput).map((row,i)=>'Case '+(i+1)+' · '+caseCode(row)+' · '+fmt(n(row.weight))+' kg'),showVehicles:$('timelineVehicles').checked});
    result=null;active=[];$('sheetTotal').textContent='—';$('sheetW18').textContent='—';$('sheetTotalNote').textContent='Cumulative equivalent standard axle loads';$('sheetMillion').textContent='— ×10⁶ ESAL';$('sheetAADT').textContent='—';$('sheetCompletion').textContent='Input Required';$('sheetError').textContent='';
    $('sheetAuditTitle').textContent='4. CESAL & W18';
    $('sheetAuditParameters').textContent='Survey '+($('sheetSurvey').value||'—')+' · Opening '+($('sheetOpening').value||'—')+' · n = '+($('sheetYears').value||'—')+' years · r = '+($('sheetGrowth').value||'—')+'% · DD = '+($('sheetDD').value||'—')+' · DL = '+($('sheetDL').value||'—');
    try{
      for(const row of rows)updateVisual(row,rows.indexOf(row));
      for(const row of rows){row.automatic.value='';row.note.textContent='';const included=row.count.value.trim()!==''||row.count.validity.badInput;row.tr.classList.toggle('sheet-included',included);if(!included)continue;active.push(row);const count=n(row.count);if(!Number.isFinite(count)||count<0)throw new Error('Enter nonnegative AADT for '+row.select.value+'.');row.ef=count===0?0:factor(row);if(Number.isFinite(row.ef))row.automatic.value=row.ef.toFixed(3);else{row.automatic.value='';row.note.textContent='Enter verified axle fractions using New Configuration.';}}
      if(!active.length){summary();return;}
      const survey=n($('sheetSurvey')),opening=n($('sheetOpening'));if(!Number.isInteger(survey)||!Number.isInteger(opening)||survey<1900||opening>2200||opening<survey)throw new Error('Enter valid survey and opening years (1900–2200); opening cannot precede the survey.');
      result=C.forecast({aadt:active.map(row=>n(row.count)),rates:active.map(()=>n($('sheetGrowth'))),factors:active.map(row=>row.ef),years:n($('sheetYears')),delay:opening-survey,dd:n($('sheetDD')),dl:n($('sheetDL')),preview:true});
      $('sheetAADT').textContent=fmt(active.reduce((sum,row)=>sum+n(row.count),0));$('sheetTotal').textContent=fmt(result.complete?result.total:result.subtotal);$('sheetMillion').textContent=fmt(result.complete?result.million:result.subtotalMillion)+' ×10⁶ ESAL'+(result.complete?'':' · Partial subtotal');$('sheetCompletion').textContent=result.complete?'Complete':'Pending EF';$('sheetW18').textContent=result.complete?fmt(result.total)+' ESAL':'Pending EF';$('sheetTotalNote').textContent=result.complete?'Total for all included loading cases':'Partial subtotal · missing EF excluded';
      if(!result.complete)$('sheetError').textContent=result.pendingClasses+' active loading cases have no EF. Their ESAL is excluded from the subtotal.';
    }catch(error){$('sheetError').textContent=error.message;result=null;}
    summary();
  }
  function clear(){rows.splice(0);$('sheetRows').replaceChildren();$('sheetEFRows').replaceChildren();V.profiles.forEach(profile=>add(profile));$('sheetSurvey').value='2025';$('sheetOpening').value='2026';for(const [id,value] of Object.entries({sheetYears:'20',sheetGrowth:'2',sheetDD:'0.50',sheetDL:'1.00'}))$(id).value=value;update();}
  $('timelineVehicles').addEventListener('change',update);$('configurationForm').addEventListener('input',update);$('configurationForm').addEventListener('change',update);$('configurationForm').addEventListener('submit',event=>event.preventDefault());
  $('sheetClear').addEventListener('click',()=>clear());$('sheetAdd').addEventListener('click',()=>{add();update();});
  window.addEventListener('message',event=>{if(window.parent===window||event.source!==window.parent||event.data?.type!=='hd-toolkit-admin-state'||typeof event.data.enabled!=='boolean')return;const steps=$('trafficCalculationSteps');steps.hidden=!event.data.enabled;if(steps.hidden)steps.open=false;});
  if(window.parent!==window)window.parent.postMessage({type:'hd-toolkit-traffic-ready'},'*');
  for(const profile of V.profiles){const tr=make('tr');for(const value of [profile.code,profile.name,fmt(profile.gvw)])tr.append(make('td',value));$('magvwRows').append(tr);}
  clear();
})();
