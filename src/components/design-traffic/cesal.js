(() => {
  const C=DesignTraffic,$=id=>document.getElementById(id),factors=[],cells=[],axles=[],configurations=[],distributions=[],classGrowth=[],growthPreviews=[];
  let rows=[],growth=[],result=null,lastEFMode='annex';
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const numeric=input=>input.value.trim()===''||input.validity.badInput?NaN:Number(input.value);
  const fmt=value=>value.toLocaleString('en-US',{maximumFractionDigits:2});
  function esalState(index,value,note,state='pending'){
    const cell=cells[index][5];cell.textContent=value;cell.className='esal-cell esal-'+state;
    if(note){const explanation=el('small',note);explanation.className='esal-note';cell.append(explanation);}
  }
  function loadingNote(index,mode){
    if(mode==='manual')return 'Enter a verified class-average EF to calculate ESAL.';
    const config=configurations[index];
    if(mode==='axle'||!config.options.length)return 'Enter axle loads in tonnes to calculate EF and ESAL.';
    const profile=config.options.find(p=>p.code===config.select.value);
    if(!profile)return 'Select a truck configuration to calculate EF and ESAL.';
    if(!profile.fractions)return 'Axle distribution is unavailable for Code '+profile.code+'. Use verified axle loads or a class-average EF.';
    return 'Enter the adopted GVW in kilograms to calculate EF and ESAL.';
  }
  C.classes.forEach((name,index)=>{
    const tr=el('tr'),data=[],heading=el('th');heading.innerHTML=VehicleAnnex.classVisual(index)+'<span>'+name+'</span>';tr.append(heading);
    for(let i=0;i<6;i++){const td=el('td','—');tr.append(td);data.push(td);}
    const rate=el('input'),ratePreview=el('span');rate.type='number';rate.step='any';rate.placeholder='Rate · %';rate.setAttribute('aria-label',name+' annual growth rate (%)');data[2].textContent='';data[2].append(rate,ratePreview);classGrowth.push(rate);growthPreviews.push(ratePreview);
    const input=el('input');input.type='number';input.min='0';input.step='any';input.setAttribute('aria-label',name+' equivalency factor (ESAL per vehicle)');data[3].textContent='';data[3].append(input);
    const axle=el('input');axle.type='text';axle.hidden=true;axle.placeholder='e.g. 3.6, 14.4';axle.setAttribute('aria-label',name+' axle loads in metric tonnes');data[3].append(axle);axles.push(axle);
    const box=el('div'),select=el('select'),gvw=el('input'),note=el('small');box.className='annex-controls';box.hidden=true;
    const blank=el('option','Select Truck Configuration');blank.value='';select.append(blank);
    const options=VehicleAnnex.profiles.filter(p=>p.classes.includes(index));
    options.forEach(p=>{const option=el('option',p.code+' · '+p.name);option.value=p.code;select.append(option);});
    const initial=options.find(p=>p.fractions);if(initial){select.value=initial.code;gvw.value=String(initial.gvw);}
    select.setAttribute('aria-label',name+' Annex truck configuration');gvw.type='number';gvw.min='0';gvw.step='any';gvw.placeholder='Adopted GVW · kg';gvw.setAttribute('aria-label',name+' adopted gross vehicle weight in kilograms');
    const diagram=el('div'),distribution=el('div');box.append(select,gvw,note,diagram);data[3].append(box,distribution);distributions.push(distribution);configurations.push({box,select,gvw,note,diagram,options});
    select.addEventListener('change',()=>{const p=VehicleAnnex.profiles.find(p=>p.code===select.value);gvw.value=p?String(p.gvw):'';update();});
    factors.push(input);cells.push(data);$('cesalRows').append(tr);
  });
  function update(){
    const years=numeric($('designYears'));
    if(typeof window!=='undefined'&&window.parent&&Number.isInteger(years)&&years>=1&&years<=100)window.parent.postMessage({type:'hd-toolkit-design-period',years},'*');
    distributions.forEach(node=>node.innerHTML='');
    const mode=$('efMode').value||'annex';
    if(mode!==lastEFMode){factors.forEach(input=>{if(lastEFMode==='manual')input.manualValue=input.autoZero?input.savedFactor:input.value;if(mode==='manual'){if(input.autoZero)input.savedFactor=input.manualValue??'';else input.value=input.manualValue??'';}});lastEFMode=mode;}
    result=null;$('applyTraffic').disabled=true;$('cesalTotal').textContent='—';$('designVehicles').textContent='—';$('cesalMillion').textContent='— million ESAL';$('transferStatus').textContent='';$('cesalError').textContent='';
    $('cesalResultLabel').textContent='Cumulative Design-Lane ESAL · W18';
    const uniform=$('growthMode').value==='uniform';$('uniformGrowthField').hidden=!uniform;
    $('growthModeHint').textContent=uniform?'The selected rate applies to every active class.':'Edit Annual Growth (%) in each vehicle row below.';
    classGrowth.forEach((input,i)=>{input.hidden=uniform;growthPreviews[i].hidden=!uniform;const rate=numeric($('uniformGrowth'));growthPreviews[i].textContent=Number.isFinite(rate)?fmt(rate):'—';growthPreviews[i].title='Shared annual growth rate';});
    cells.forEach(data=>[0,1,4,5].forEach(i=>data[i].textContent='—'));
    cells.forEach((_,i)=>esalState(i,'Not Calculated','Complete AADT inputs for this class.'));
    $('cesalPanel').hidden=!$('cesalEnabled').checked;if(!$('cesalEnabled').checked)return;
    const active=rows.filter(row=>row.counts.some(input=>input.value.trim()!==''||input.validity.badInput));
    let aadt;
    try{aadt=C.calculate(active.map(row=>row.counts.map(numeric))).totals;}catch(error){$('cesalError').textContent='Complete the AADT table to populate CESAL by vehicle class.';return;}
    const rates=uniform?Array(10).fill(numeric($('uniformGrowth'))):growth.map(numeric);
    const axleMode=mode==='axle',annexMode=mode==='annex';$('axleMethodNote').hidden=!axleMode&&!annexMode;
    aadt.forEach((value,i)=>{
      if(value===0)esalState(i,'0','No traffic in this class · No ESAL contribution.','zero');
      else esalState(i,'Not Calculated','Complete forecast and loading inputs.');
      if(Number.isFinite(value))cells[i][0].textContent=fmt(value);
      const input=factors[i];
      const config=configurations[i],automatic=axleMode||annexMode;
      if(value===0){if(!input.autoZero){input.savedFactor=input.value;input.autoZero=true;}input.value='0';input.readOnly=true;input.title='No traffic: zero contribution.';}
      else{if(input.autoZero){input.value=input.savedFactor??'';input.autoZero=false;}input.readOnly=automatic;input.title=automatic?'Automatic fourth-power factor from axle loading.':'Enter the project ESAL-per-vehicle factor.';}
      axles[i].hidden=!(axleMode||annexMode&&!config.options.length)||value===0;
      config.box.hidden=!annexMode||value===0||!config.options.length;
      config.note.textContent='';config.diagram.innerHTML='';
      if(annexMode&&value>0){
        const p=config.options.find(p=>p.code===config.select.value);
        if(!config.options.length)input.title='Automatic EF: enter project axle loads in tonnes below.';
        if(p){config.diagram.innerHTML=VehicleAnnex.diagram(p,true);config.note.textContent=p.fractions?'Source GVW: '+fmt(p.gvw)+' kg · Edit adopted weight as needed.':'Axle fractions not supplied for this code. Use entered EF or verified axle loads.';}
      }
    });
    const missing=['designYears','openingDelay','dd','dl'].filter(id=>$(id).value.trim()==='');
    if(missing.length){const labels={designYears:'design period',openingDelay:'survey-to-opening years',dd:'DD',dl:'DL'},note='Enter '+missing.map(id=>labels[id]).join(', ')+'.';aadt.forEach((value,i)=>{if(value>0)esalState(i,'Not Calculated',note);});$('cesalError').textContent='Next: '+note;return;}
    if(factors.some(input=>input.validity.badInput)){$('cesalError').textContent='Complete the vehicle equivalency factor being edited.';return;}
    try{
      const effectiveFactors=factors.map((input,i)=>{
        if(aadt[i]===0)return 0;
        const config=configurations[i];
        if(axleMode||annexMode&&!config.options.length){const factor=C.axleFactor(axles[i].value);if(Number.isFinite(factor))distributions[i].innerHTML=VehicleAnnex.loadDistribution(axles[i].value.trim().split(/[\s,;]+/).map(Number));return factor;}
        if(annexMode&&config.options.length){
          const p=config.options.find(p=>p.code===config.select.value);if(!p||!p.fractions)return NaN;
          if(config.gvw.value.trim()==='')return NaN;
          const calculation=VehicleAnnex.calculate(p.code,numeric(config.gvw));
          distributions[i].innerHTML=VehicleAnnex.loadDistribution(calculation.loads,p.fractions);
          config.note.textContent=calculation.loads.map(v=>fmt(v)+' t').join(' + ')+(calculation.overSourceGVW?' · Above the supplied GVW reference':'');
          return calculation.ef;
        }
        return numeric(input);
      });
      effectiveFactors.forEach((value,i)=>{if(axleMode||annexMode)factors[i].value=Number.isFinite(value)?String(value):'';});
      result=C.cesal({aadt,rates,factors:effectiveFactors,years:numeric($('designYears')),delay:numeric($('openingDelay')),dd:numeric($('dd')),dl:numeric($('dl')),preview:true});
      result.detail.forEach((item,i)=>{
        cells[i][1].textContent=fmt(item.opening);cells[i][4].textContent=fmt(item.vehicles);
        if(item.esal===null)esalState(i,'Pending ESAL',loadingNote(i,mode));
        else if(aadt[i]===0)esalState(i,'0','No traffic in this class · No ESAL contribution.','zero');
        else if(item.esal===0)esalState(i,'0','Adopted EF is zero · Confirm this value is justified.','zero');
        else esalState(i,fmt(item.esal),'','ready');
      });
      $('designVehicles').textContent=fmt(result.vehicles);
      if(result.complete){$('cesalTotal').textContent=fmt(result.total);$('cesalMillion').textContent=fmt(result.million)+' million ESAL · Full precision retained.';}
      else{
        $('cesalResultLabel').textContent='Partial Design-Lane ESAL · Subtotal';
        $('cesalTotal').textContent=fmt(result.subtotal);
        $('cesalMillion').textContent=fmt(result.subtotalMillion)+' million ESAL · '+result.completedClasses+' active classes included; '+result.pendingClasses+' pending EF classes excluded. Missing values are not assumed to be zero.';
        $('cesalError').textContent='Partial ESAL calculated. '+(mode==='manual'?'Enter EF':'Complete axle loads or configuration / GVW')+' for '+result.pendingClasses+' active vehicle classes to complete CESAL. See the notes in each pending row.';
      }
      $('applyTraffic').disabled=!result.complete||result.total<=0||!$('rigidFactors').checked;
      if($('applyTraffic').disabled)$('transferStatus').textContent=result.complete?'To transfer a positive result, confirm rigid-pavement factors.':'Complete pending EF classes before transferring the full CESAL to Rigid Pavement.';
    }catch(error){result=null;$('cesalError').textContent=error.message;aadt.forEach((value,i)=>{if(value>0)esalState(i,'Not Calculated','Check inputs: '+error.message);});}
  }
  globalThis.TrafficCESAL={
    growthInputs:classGrowth,
    updateStations(nextRows,nextGrowth){
      rows=nextRows;growth=nextGrowth;update();
    },
    reset(){for(const input of [...factors,...axles,...configurations.flatMap(c=>[c.select,c.gvw]),...['designYears','openingDelay','dd','dl','uniformGrowth'].map($)]){input.value='';input.autoZero=false;input.savedFactor='';input.manualValue='';input.readOnly=false;}for(const config of configurations){const initial=config.options.find(p=>p.fractions);if(initial){config.select.value=initial.code;config.gvw.value=String(initial.gvw);}}for(const [id,value] of Object.entries({designYears:'20',openingDelay:'0',dd:'0.50',dl:'1.00',uniformGrowth:'5',growthMode:'uniform',efMode:'annex'}))$(id).value=value;$('rigidFactors').checked=false;lastEFMode='annex';update();}
  };
  $('trafficForm').addEventListener('change',update);
  $('applyTraffic').addEventListener('click',()=>{
    update();if(!result||$('applyTraffic').disabled)return;
    if(window.parent===window){$('transferStatus').textContent='Open this tool from HD Toolkit to transfer traffic.';return;}
    window.parent.postMessage({type:'hd-toolkit-cesal',million:result.million,rigidConfirmed:true},'*');
  });
  $('factorHelp').addEventListener('click',()=>{
    $('guideTitle').textContent='Vehicle Factors, DD and DL';$('guideBody').textContent='EF is a class-average number of 18-kip ESALs per vehicle, obtained from axle-load survey data and the adopted pavement model. AASHTO factors depend on axle grouping, pavement type, terminal serviceability and, for rigid pavement, slab thickness. Sum axle factors within each vehicle and weight them over the vehicle-class mix. Do not assign a factor from gross weight alone or map detailed truck configurations to broad classes without weighting. DD allocates two-way loading to the design direction; DL allocates that direction to the design lane. Your example uses DD 0.50 and DL 0.85; these remain project decisions. Its lane table shows 1 lane: 100%; 2: 80–100%; 3: 60–80%; 4: 50–75%. These illustrative ranges do not select a project factor automatically. Enter fractions, not percentages.';$('growthReference').hidden=true;$('guide').showModal();
  });
})();
