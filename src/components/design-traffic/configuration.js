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
  function summary(){
    $('sheetSummary').replaceChildren();if(!result)return;
    active.forEach((row,i)=>{const d=result.detail[i],tr=make('tr');const values=[row.select.value+' · '+fmt(n(row.weight))+' kg',fmt(n(row.count)),fmt(d.opening),fmt(row.ef),fmt(d.vehicles/(n($('sheetDD'))*n($('sheetDL')))),fmt(d.vehicles),d.esal===null?'Pending EF':fmt(d.esal)];values.forEach(value=>tr.append(make('td',value)));$('sheetSummary').append(tr);});
  }
  function update(){
    TrafficTimeline.render({survey:$('sheetSurvey').value,opening:$('sheetOpening').value,years:$('sheetYears').value,growth:$('sheetGrowth').value,counts:rows.filter(row=>row.count.value.trim()!==''||row.count.validity.badInput).map(row=>n(row.count))});
    result=null;active=[];$('sheetTotal').textContent='—';$('sheetW18').textContent='—';$('sheetTotalNote').textContent='Cumulative equivalent standard axle loads';$('sheetMillion').textContent='— ×10⁶ ESAL';$('sheetAADT').textContent='—';$('sheetCompletion').textContent='Input Required';$('sheetError').textContent='';$('sheetTransfer').textContent='';['sheetApply','sheetExport','sheetPrint'].forEach(id=>$(id).disabled=true);
    $('sheetAuditTitle').textContent='Design Traffic Summary';
    $('sheetAuditParameters').textContent='Survey '+($('sheetSurvey').value||'—')+' · Opening '+($('sheetOpening').value||'—')+' · n = '+($('sheetYears').value||'—')+' years · r = '+($('sheetGrowth').value||'—')+'% · DD = '+($('sheetDD').value||'—')+' · DL = '+($('sheetDL').value||'—');
    try{
      for(const row of rows){row.automatic.value='';row.note.textContent='';row.automatic.hidden=row.mode.value==='manual';row.manual.hidden=row.mode.value!=='manual';const included=row.count.value.trim()!==''||row.count.validity.badInput;row.tr.classList.toggle('sheet-included',included);if(!included)continue;active.push(row);const count=n(row.count);if(!Number.isFinite(count)||count<0)throw new Error('Enter nonnegative AADT for '+row.select.value+'.');row.ef=count===0?0:factor(row);if(Number.isFinite(row.ef))row.automatic.value=row.ef.toFixed(3);else{row.automatic.value='';row.note.textContent=row.mode.value==='manual'?'Enter adopted EF.':'Enter verified axle fractions.';}}
      if(!active.length){summary();return;}
      const survey=n($('sheetSurvey')),opening=n($('sheetOpening'));if(!Number.isInteger(survey)||!Number.isInteger(opening)||survey<1900||opening>2200||opening<survey)throw new Error('Enter valid survey and opening years (1900–2200); opening cannot precede the survey.');
      result=C.forecast({aadt:active.map(row=>n(row.count)),rates:active.map(()=>n($('sheetGrowth'))),factors:active.map(row=>row.ef),years:n($('sheetYears')),delay:opening-survey,dd:n($('sheetDD')),dl:n($('sheetDL')),preview:true});
      $('sheetAADT').textContent=fmt(active.reduce((sum,row)=>sum+n(row.count),0));$('sheetTotal').textContent=fmt(result.complete?result.total:result.subtotal);$('sheetMillion').textContent=fmt(result.complete?result.million:result.subtotalMillion)+' ×10⁶ ESAL'+(result.complete?'':' · Partial subtotal');$('sheetCompletion').textContent=result.complete?'Complete':'Pending EF';$('sheetW18').textContent=result.complete?fmt(result.total)+' ESAL':'Pending EF';$('sheetTotalNote').textContent=result.complete?'Total for all included loading cases':'Partial subtotal · missing EF excluded';
      if(!result.complete)$('sheetError').textContent=result.pendingClasses+' active loading cases have no EF. Their ESAL is excluded from the subtotal.';
      $('sheetApply').disabled=!result.complete||result.total<=0;
      $('sheetExport').disabled=!result.complete;$('sheetPrint').disabled=!result.complete;
      $('sheetTransfer').textContent=$('sheetApply').disabled?'Complete all included loading cases before transfer.':'';
    }catch(error){$('sheetError').textContent=error.message;result=null;}
    summary();
  }
  function clear(count=3){rows.splice(0);$('sheetRows').replaceChildren();V.profiles.slice(0,count).forEach(profile=>add(profile));$('sheetSurvey').value='';$('sheetOpening').value='';for(const [id,value] of Object.entries({sheetYears:'20',sheetGrowth:'2',sheetDD:'0.50',sheetDL:'1.00'}))$(id).value=value;update();}
  $('configurationForm').addEventListener('input',update);$('configurationForm').addEventListener('change',update);$('configurationForm').addEventListener('submit',event=>event.preventDefault());
  $('sheetClear').addEventListener('click',()=>clear());$('sheetAdd').addEventListener('click',()=>{add();update();});
  $('sheetSample').addEventListener('click',()=>{clear(0);add(V.profiles.find(p=>p.code==='1-2'));add(V.profiles.find(p=>p.code==='11-2'));$('sheetSurvey').value='2025';$('sheetOpening').value='2025';$('sheetGrowth').value='3.8';$('sheetDL').value='0.50';rows.find(row=>row.select.value==='1-2').count.value='2197';const trailer=rows.find(row=>row.select.value==='11-2');trailer.count.value='1865';trailer.fractions.value='0.168, 0.2981, 0.2793, 0.2538';update();});
  $('sheetApply').addEventListener('click',()=>{update();if(!result||$('sheetApply').disabled)return;if(window.parent===window){$('sheetTransfer').textContent='Open this calculator in HD Toolkit to transfer traffic.';return;}window.parent.postMessage({type:'hd-toolkit-design-period',years:n($('sheetYears'))},'*');window.parent.postMessage({type:'hd-toolkit-cesal',million:result.million,rigidConfirmed:true},'*');});
  $('sheetExport').addEventListener('click',()=>{update();if(!result?.complete)return;const lines=[['Survey Year',$('sheetSurvey').value],['Opening Year',$('sheetOpening').value],['Design Period',$('sheetYears').value],['Growth (%)',$('sheetGrowth').value],['DD',$('sheetDD').value],['DL',$('sheetDL').value],[],['Code','GVW kg','Axle Fractions','Survey AADT','Opening AADT','EF','Design-Lane Vehicles','CESAL']];active.forEach((row,i)=>{const d=result.detail[i];lines.push([row.select.value,row.weight.value,row.fractions.value,n(row.count),d.opening,row.ef,d.vehicles,d.esal]);});lines.push(['Total CESAL',result.total],['Million ESAL',result.million]);const text='\uFEFF'+lines.map(line=>line.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),link=make('a');link.href=url;link.download='Design-Traffic-Summary.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  $('sheetPrint').addEventListener('click',()=>window.print());
  clear();
})();
