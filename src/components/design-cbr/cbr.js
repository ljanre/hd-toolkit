(() => {
  const $=id=>document.getElementById(id), C=DesignCBRCalculation;
  const format=(value,places=2)=>value.toLocaleString('en-US',{minimumFractionDigits:places,maximumFractionDigits:places});
  let current=null, values=[], mr=null, guideOpener;
  let sampleInputs=[],sampleNumbers=[],nextSampleId=0,applyingPlan=false;
  function numberRows(){
    sampleInputs.forEach((entry,i)=>{entry.label.textContent='TP '+String(i+1).padStart(2,'0');entry.station.setAttribute('aria-label','Station for TP '+String(i+1).padStart(2,'0'));entry.include.setAttribute('aria-label','Include TP '+String(i+1).padStart(2,'0'));inputLabel(entry,i);entry.remove.setAttribute('aria-label','Remove Test '+(i+1));entry.remove.disabled=sampleInputs.length===1;entry.deviation.setAttribute('aria-label','Test '+(i+1)+' deviation from mean');entry.square.setAttribute('aria-label','Test '+(i+1)+' squared deviation');});
    $('addTest').disabled=sampleInputs.length>=1000;
  }
  function inputLabel(entry,i){entry.input.setAttribute('aria-label','CBR for TP '+String(i+1).padStart(2,'0'));}
  function refreshPlan(){if(!applyingPlan)window.CBRPitDiagram?.refresh();}
  function addSample(value='',focus=false){
    if(sampleInputs.length>=1000)return;
    const row=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input'),entryBox=document.createElement('div'),unit=document.createElement('span'),remove=document.createElement('button'),deviation=document.createElement('output'),square=document.createElement('output');
    row.className='sample-input-row';entryBox.className='sample-entry';unit.textContent='%';unit.setAttribute('aria-hidden','true');
    input.id='cbrSample'+(++nextSampleId);input.type='number';input.min='0';input.step='any';input.inputMode='decimal';input.placeholder='0.00';input.value=String(value);input.setAttribute('aria-describedby','sampleHelp');label.htmlFor=input.id;
    remove.type='button';remove.className='remove-test';remove.textContent='−';remove.title='Remove Test';
    deviation.className='sample-deviation';square.className='sample-square';deviation.textContent='—';square.textContent='—';
    const station=document.createElement('input'),include=document.createElement('input'),includeBox=document.createElement('label'),track=document.createElement('span');station.type='text';station.className='sample-station';station.placeholder='0+000';include.type='checkbox';include.checked=true;include.setAttribute('role','switch');includeBox.className='sample-include';track.className='pit-switch';track.setAttribute('aria-hidden','true');includeBox.append(include);includeBox.append(track);
    const entry={row,label,input,remove,deviation,square,station,include,stationCustom:false};
    station.addEventListener('input',()=>{entry.stationCustom=true;refreshPlan();});include.addEventListener('change',()=>{update();refreshPlan();});
    remove.addEventListener('click',()=>{const index=sampleInputs.indexOf(entry);if(sampleInputs.length<=1)return;sampleInputs.splice(index,1);row.remove();numberRows();update();refreshPlan();sampleInputs[Math.min(index,sampleInputs.length-1)].input.focus();});
    entryBox.append(input);entryBox.append(unit);row.append(label);row.append(entryBox);row.append(remove);row.append(deviation);row.append(square);row.append(station);row.append(includeBox);$('samples').append(row);sampleInputs.push(entry);numberRows();refreshPlan();if(focus)input.focus();
  }
  function setSamples(values){$('samples').replaceChildren();sampleInputs=[];values.forEach(value=>addSample(value));}
  function readSamples(){
    const accepted=[];sampleNumbers=[];
    sampleInputs.forEach(entry=>entry.input.removeAttribute('aria-invalid'));
    sampleInputs.forEach((entry,i)=>{
      entry.row.setAttribute('data-included',String(entry.include.checked));if(!entry.include.checked)return;
      const raw=entry.input.value.trim();
      if(raw===''&&!entry.input.validity?.badInput)return;
      try{const parsed=C.parse(raw);if(entry.input.validity?.badInput||parsed.length!==1)throw new Error();accepted.push(parsed[0]);sampleNumbers.push(i+1);}
      catch{entry.input.setAttribute('aria-invalid','true');throw new Error(`Test ${i+1}: enter one finite, nonnegative CBR value.`);}
    });
    return accepted;
  }
  function rows(id,data){
    const body=$(id);body.replaceChildren();
    for(const cells of data){const tr=document.createElement('tr');for(const text of cells){const td=document.createElement('td');td.textContent=text;tr.append(td);}body.append(tr);}
  }
  rows('minimumRows',C.sampleTable);
  rows('coefficientRows',C.coefficients.slice(2).map((c,i)=>[i===8?'10 or more':i+2,c.toFixed(2)]));
  function update(){
    current=null;mr=null;$('error').hidden=true;$('sampleWarning').hidden=true;$('sampleWarningText').textContent='';
    $('soilConfirmation').hidden=$('mrMethod').value!=='linear';
    $('designFormula').textContent=$('method').value==='range'?'Design CBR = x̄ − (Maximum − Minimum) / C':'Design CBR = x̄ − ⅔s';
    $('designEquation').textContent=$('method').value==='range'?'Eq. (3b)':'Eq. (3a)';
    const rangeMethod=$('method').value==='range';
    $('methodReference').hidden=false;
    $('methodReferenceText').textContent=rangeMethod?'Reference: DGCS Volume 4, Section 6.11.5 · Table 6-22 (supplied excerpt). The same formula and C values are documented in the linked JICA report, Table 2.5.2.':'Reference: DPWH Design Procedure Manual for Roads (2017), §1.9.1, p.15; Table 9, p.127.';
    if(rangeMethod)$('methodReferenceLink').href='https://openjicareport.jica.go.jp/pdf/10308765_02.pdf';else $('methodReferenceLink').href='../../assets/dpwh-manual/cbr-procedure.png';
    $('methodReferenceLink').textContent=rangeMethod?'View JICA Coefficient Table (PDF)':'View Manual Procedure';
    $('designNotation').textContent=$('method').value==='range'?'x̄ = Mean CBR (%); Maximum / Minimum = Extreme test values (%); C = Dimensionless coefficient from Table 6-22, selected by n.':'x̄ = Mean CBR (%); s = Sample standard deviation (percentage points).';
    $('mrFormula').textContent=$('mrMethod').value==='power'?'MR (psi) = 2555 × (Design CBR)⁰·⁶⁴':'MR (psi) = 1500 × Design CBR';
    $('mrEquation').textContent=$('mrMethod').value==='power'?'Eq. (4b)':'Eq. (4a)';
    for(const id of ['design','mrPsi','n','mean','sd','cv','meanTrace','sdTrace','designTrace','mrTrace'])$(id).textContent='—';
    $('mrSI').textContent='— MPa';sampleInputs.forEach(entry=>{entry.deviation.textContent='—';entry.square.textContent='—';});
    $('designStatus').textContent='Enter at least two representative CBR results.';
    $('mrStatus').textContent='Confirm applicability before using a correlation.';
    try{
      values=readSamples();current=C.calculate(values,$('method').value);
      if(!current)return;
      const r=current, requirement=r.sampleRequirement;
      $('n').textContent=r.n;$('mean').textContent=format(r.mean);$('sd').textContent=format(r.s);$('cv').textContent=format(r.cv)+'%';
      $('meanTrace').textContent=`${format(r.sum,4)} / ${r.n} = ${format(r.mean,4)}%`;
      $('sdTrace').textContent=`√[${format(r.sumSquares,4)} / (${r.n} − 1)] = ${format(r.s,4)}`;
      $('designTrace').textContent=r.method==='range'?`${format(r.mean,4)} − (${format(r.max,4)} − ${format(r.min,4)}) / ${r.c.toFixed(2)} = ${format(r.design,4)}%`:`${format(r.mean,4)} − ⅔ × ${format(r.s,4)} = ${format(r.design,4)}%`;
      sampleNumbers.forEach((number,i)=>{const entry=sampleInputs[number-1];entry.deviation.textContent=format(r.deviations[i],4);entry.square.textContent=format(r.deviations[i]**2,4);});
      if(!rangeMethod&&(!requirement||!requirement.met)){
        $('sampleWarningTitle').textContent=requirement?'Minimum Sample Count Not Achieved':'Minimum Sample Count Cannot Be Verified';
        const ratioText=`Calculated s/x̄ = ${format(r.cv)}%${requirement?` → use the ${requirement.threshold}% row of Table 9.`:'.'}`;
        $('sampleWarningText').textContent=ratioText+' '+(requirement?`${r.n} completed tests / ${requirement.minimum} minimum required; the minimum sample count is not achieved. Add at least ${requirement.minimum-r.n} representative tests and recalculate. The design result is provisional until the sample-count criterion is met.`:`This exceeds the supplied table's 70% limit. No minimum count can be determined from this table; obtain project-specific guidance before adopting the result.`);
        $('sampleWarning').hidden=false;
      }
      if(!r.usable){$('designStatus').textContent='The selected method gives a nonpositive design CBR. Review sampling and project criteria before proceeding.';return;}
      $('design').textContent=format(r.design);
      $('designStatus').textContent=rangeMethod?`Calculated using C = ${r.c.toFixed(2)} · Verify project sampling requirements.`:(requirement?.met?'Calculated Design CBR · Check project applicability.':'Provisional Result · Sample-count requirement is not satisfied or unavailable.');
      mr=C.modulus(r.design,$('mrMethod').value,$('fineSoaked').checked);
      if(mr){
        $('mrPsi').textContent=format(mr.psi);$('mrSI').textContent=format(mr.mpa)+' MPa';
        $('mrStatus').textContent=mr.method==='power'?'Empirical estimate · Verify correlation suitability for the soil and project.':'Fine-grained / soaked condition confirmed · Empirical estimate.';
        $('mrTrace').textContent=`${mr.method==='linear'?'1500 × '+format(r.design,4):'2555 × '+format(r.design,4)+'⁰·⁶⁴'} = ${format(mr.psi,4)} psi; × 0.00689476 = ${format(mr.mpa,4)} MPa`;
      }else $('mrStatus').textContent=r.design>10?'The 1500 × CBR correlation is outside its supplied CBR ≤10 limit.':'Confirm fine-grained soil and soaked test conditions to calculate this estimate.';
      
    }catch(error){current=null;$('error').textContent=error.message;$('error').hidden=false;}
  }
  $('cbrForm').addEventListener('submit',event=>event.preventDefault());
  $('cbrForm').addEventListener('input',update);$('cbrForm').addEventListener('change',update);
  $('addTest').addEventListener('click',()=>{addSample('',true);update();});
  $('clear').addEventListener('click',()=>{setSamples(['','']);$('fineSoaked').checked=true;update();sampleInputs[0].input.focus();});
  const guides={
    sampleCount:['Minimum Sample Count','The check compares the number of completed tests with the supplied Table 9 requirement. Calculate variation as 100 × s / x̄, then use the next table percentage at or above that value. Add representative tests for comparable soil and test conditions, then recalculate: the mean, variation and required count may change. Empty rows do not count, and repeating an existing result is not an additional test. If variation exceeds 70%, the table cannot provide a requirement.'],
    samples:['CBR Test Values','Enter representative CBR percentages from comparable locations, soil groups and test conditions. Use at least two values. Zero values are retained; negative values and invalid text are rejected. Keep soaked and unsoaked results separate and assess unusual values before selecting a design value.'],
    method:['Design CBR Method','The mean − ⅔s procedure and sample standard deviation with n − 1 are verified in DPWH Design Procedure Manual for Roads (2017), §1.9.1, p.15. Table 9 appears on p.127 and supports the manual’s 90% probability / 20% difference sampling criterion. The coefficient C method is attributed to DGCS Volume 4 Section 6.11.5/Table 6-22 in your excerpt; the formula and C values are independently documented in JICA Table 2.5.2. Select the applicable project method. The Table 9 warning is shown only for the statistical method, since Table 9 is not an inherent requirement of the C formula.'],
    modulus:['Resilient Modulus Correlation','The supplied 1500 × CBR relationship applies to fine-grained soils with soaked design CBR of 10 or less. Confirm these conditions before calculation. The alternative 2555 × CBR⁰·⁶⁴ is an empirical correlation; assess its suitability for the soil and project. Convert psi to MPa using 0.00689476. Roadbed resilient modulus MR differs from subgrade reaction k and is not directly interchangeable.']
  };
  document.querySelectorAll('[data-guide]').forEach(button=>button.addEventListener('click',()=>{
    guideOpener=button;const key=button.dataset.guide,[title,body]=guides[key];$('guideTitle').textContent=title;
    let explanation=body;
    if(key==='sampleCount'&&current){const r=current,req=r.sampleRequirement;if(r.method==='range')explanation+=' For the selected coefficient C method, this is a separate sampling check, applicable only if the project adopts Table 9; it is not part of the C formula.';explanation+=` Current check: 100 × ${format(r.s,4)} / ${format(r.mean,4)} = ${format(r.cv)}%. `;explanation+=req?(r.method==='range'?`The ${req.threshold}% row gives a ${req.minimum}-test benchmark; ${r.n} completed.`:`Use the ${req.threshold}% row: ${req.minimum} tests required; ${r.n} completed; ${Math.max(0,req.minimum-r.n)} more currently needed.`):'This exceeds the supplied table limit; obtain project-specific guidance.';}
    $('manualCBR').hidden=!['method','sampleCount'].includes(key);$('guideBody').textContent=explanation;$('methodTables').hidden=!['method','sampleCount'].includes(key);$('coefficientReference').hidden=key!=='method';$('guide').showModal();
  }));
  $('closeGuide').addEventListener('click',()=>$('guide').close());
  $('guide').addEventListener('click',event=>{if(event.target===$('guide')){const rect=$('guide').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$('guide').close();}});
  $('guide').addEventListener('close',()=>guideOpener?.focus());
  if(typeof window!=='undefined'){
    window.addEventListener('message',event=>{
      if(event.source!==window.parent||event.data?.type!=='hd-toolkit-admin-state'||typeof event.data.enabled!=='boolean')return;
      const steps=$('calculationSteps');steps.hidden=!event.data.enabled;if(steps.hidden)steps.open=false;
    });
    if(window.parent!==window)window.parent.postMessage({type:'hd-toolkit-cbr-ready'},'*');
  }
  window.CBRWorksheet={getTests:()=>sampleInputs.map((entry,i)=>({tp:i+1,station:entry.station.value,included:entry.include.checked})),setPlan(plan){applyingPlan=true;const target=Math.min(plan.count,1000);while(sampleInputs.length<target)addSample();while(sampleInputs.length>target&&!sampleInputs.at(-1).input.value.trim()){sampleInputs.pop().row.remove();}sampleInputs.forEach((entry,i)=>{if(i<target&&!entry.stationCustom)entry.station.value=CBRTestPitPlan.chainage(plan.at(i));});numberRows();applyingPlan=false;update();}};
  setSamples(['','']);update();
})();
