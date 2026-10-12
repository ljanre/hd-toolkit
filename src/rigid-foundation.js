/* Reuses the validated standalone Figure 3.3 and Figure 3.6 engines. */
(() => {
  const $=id=>document.getElementById(id),fields={DSB:'foundationDsb',ESB:'foundationEsb',MR:'foundationMr'};
  const number=id=>$(id).value.trim()===''?null:Number($(id).value)/(id==='foundationDsb'?25.4:1);
  const fmt=value=>Number.isFinite(value)?value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
  let previousMode='auto',manualValue='';
  const materialRanges={unbound:[15000,45000],lime:[20000,70000],bituminous:[40000,300000],asphalt:[350000,1000000],'cement-aggregate':[500000,1000000],'cement-treated':[1000000,2000000]};
  function selectMaterial(){const range=materialRanges[$('foundationMaterial').value];if(range)$('foundationEsb').value=String(range[0]);}
  function syncNomographs(){
    $('pavementEquationPlot').innerHTML=$('foundationEquationPlot').innerHTML;
    $('pavementCompositePath').setAttribute('points',$('foundationCompositePath').getAttribute('points')||'');
    $('pavementCompositePoints').innerHTML=$('foundationCompositePoints').innerHTML;
    $('pavementLossPath').setAttribute('points',$('foundationLossPath').getAttribute('points')||'');
    $('pavementLossPoints').innerHTML=$('foundationLossPoints').innerHTML;
    $('pavementCompositeValue').textContent=$('foundationCompositeValue').textContent;
    $('pavementCorrectedValue').textContent=$('foundationCorrectedValue').textContent;
  }
  function getState(){return {mode:$('foundationMode').checked?'auto':'manual',source:'composite',material:$('foundationMaterial').value,dsb:number('foundationDsb'),esb:number('foundationEsb'),mr:number('foundationMr'),ls:number('foundationLs')};}
  function restore(state,value){
    state=state||{mode:'auto'};
    $('foundationMaterial').value=state.material in materialRanges?state.material:state.material==='project'?'project':state.esb===15000||state.esb==null?'unbound':'project';
    $('foundationMode').checked=state.mode!=='manual'&&state.source!=='adjusted';
    for(const [key,id] of Object.entries({dsb:'foundationDsb',esb:'foundationEsb',mr:'foundationMr',ls:'foundationLs'}))$(id).value=Number.isFinite(state[key])?String(key==='dsb'?state[key]*25.4:state[key]):'';
    previousMode=$('foundationMode').checked?'auto':'manual';manualValue=Number.isFinite(value)?String(value):'';
    if(previousMode==='manual')$('k').value=manualValue;
  }
  function update(){
    $('foundationStatus').hidden=true;$('foundationEquationPlot').innerHTML='';
    const state=getState(),manual=state.mode==='manual';
    const range=materialRanges[state.material]||[Number.MIN_VALUE,Number.MAX_VALUE],minimum=range[0],maximum=range[1];
    $('foundationEsb').min=String(minimum);$('foundationEsb').max=String(maximum);
    const rangeText=range.map(value=>value.toLocaleString('en-US')).join('–')+' psi';
    $('foundationEsbHelp').textContent=state.material==='project'?'Positive project modulus; equation method outside 15,000–1,000,000 psi.':'Material range: '+rangeText+'.';
    if(state.mode!==previousMode){if(previousMode==='manual')manualValue=$('k').value;if(manual)$('k').value=manualValue;previousMode=state.mode;}
    $('foundationInputs').hidden=false;
    for(const id of ['foundationMaterial','foundationEsb','foundationMr','foundationLs'])$(id).closest('.field').hidden=manual;
    $('foundationDsb').disabled=false;$('foundationDsb').readOnly=false;
    $('foundationDsb').min='0';$('foundationDsb').max='1000';
    $('foundationDsbHelp').textContent=manual?'Pavement drawing: 0–1,000 mm. Does not change manual kcorr.':'Positive thickness up to 1,000 mm; equation method outside 101.6–508 mm.';
    $('k').readOnly=!manual;$('k').closest('.entry').classList.toggle('auto',!manual);
    $('foundationCompositePath').setAttribute('points','');$('foundationCompositePoints').innerHTML='';$('foundationLossPath').setAttribute('points','');
    $('foundationLossPoints').innerHTML='';
    for(const id of [...Object.values(fields),'foundationLs'])$(id).removeAttribute('aria-invalid');
    if(manual){const thickness=number('foundationDsb');if(thickness!==null&&(!Number.isFinite(thickness)||thickness<0||thickness>1000/25.4))$('foundationDsb').setAttribute('aria-invalid','true');$('foundationStatus').textContent='Using entered, verified kcorr. Subbase Thickness remains editable and controls the pavement illustration. Nomographs are reference charts.';$('foundationCompositeValue').textContent='—';$('foundationEffectiveValue').textContent='—';$('foundationCorrectedValue').textContent=fmt(number('k'))+' pci';syncNomographs();return;}
    if(state.esb!==null&&(!Number.isFinite(state.esb)||state.esb<minimum||state.esb>maximum)){
      $('foundationEsb').setAttribute('aria-invalid','true');$('k').value='';
      for(const id of ['foundationCompositeValue','foundationEffectiveValue','foundationCorrectedValue'])$(id).textContent='—';
      $('foundationStatus').textContent='Subbase Elastic Modulus must be '+(minimum===maximum?minimum.toLocaleString('en-US'):minimum.toLocaleString('en-US')+'–'+maximum.toLocaleString('en-US'))+' psi for the selected material. Revise Eₛᵦ to calculate kcorr.';
      $('foundationStatus').hidden=false;syncNomographs();return;
    }
    const composite=FoundationEquation.calculate(Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,number(id)])));
    Object.entries(fields).forEach(([key,id])=>{if(!['VALID','AT_BOUNDARY','INPUT_REQUIRED'].includes(composite.input_status[key]))$(id).setAttribute('aria-invalid','true');});
    $('foundationEquationPlot').innerHTML=FoundationEquation.plot({DSB:state.dsb,ESB:state.esb,MR:state.mr});
    const effective=composite.result,correction=LossSupportCalculation.calculate(effective,state.ls);
    $('foundationCompositeValue').textContent=fmt(composite.result)+' pci';$('foundationEffectiveValue').textContent=fmt(effective)+' pci';
    $('foundationCorrectedValue').textContent=correction.result===null?'—':Math.round(correction.result)+' pci';
    $('k').value=correction.result===null?'':String(Math.round(correction.result));
    if(composite.graphical_overlay){const overlay=composite.graphical_overlay;$('foundationCompositePath').setAttribute('points',overlay.path_point_ids.map(id=>overlay.points[id].x_pixel+','+overlay.points[id].y_pixel).join(' '));$('foundationCompositePoints').innerHTML=NomographLabels.composite(composite);}
    if(correction.result!==null){$('foundationLossPath').setAttribute('points',correction.point.x+',905 '+correction.point.x+','+correction.point.y+' 190,'+correction.point.y);$('foundationStatus').textContent='Automatic kcorr = '+Math.round(correction.result)+' pci · Composite k taken as effective k · LS '+state.ls+'. Approximate chart reading; design uses whole pci.';}
    if(correction.result!==null)$('foundationLossPoints').innerHTML=NomographLabels.loss(correction);
    else if(correction.status==='INPUT_REQUIRED')$('foundationStatus').textContent='Enter subbase thickness, subbase modulus, subgrade modulus and LS to calculate kcorr.';
    else $('foundationStatus').textContent='Check foundation inputs: '+(correction.status==='OUTPUT_OUTSIDE_CHART'?'corrected k is outside the chart range (1–1,000 pci).':'effective k or LS is outside the printed range.')+' No extrapolation is performed.';
    if(state.ls!==null&&(!Number.isFinite(state.ls)||state.ls<0||state.ls>3))$('foundationLs').setAttribute('aria-invalid','true');
    if(composite.result===null&&composite.range_status!=='INPUT_REQUIRED')$('foundationStatus').textContent='Enter finite positive MR, ESB and subbase thickness. Zero is undefined in the logarithmic equation.';
    if(correction.status!=='INPUT_REQUIRED'&&correction.result===null||composite.result===null&&composite.range_status!=='INPUT_REQUIRED')$('foundationStatus').hidden=false;
    if(composite.range_status==='EQUATION_OUTSIDE_CHART'){$('foundationStatus').hidden=false;$('foundationStatus').textContent='FHWA Eq. 5.22 · Outside printed chart scales; applicability and uncertainty are unvalidated. '+(correction.result===null?'Loss-of-support correction is outside its supported range; enter verified kcorr in manual mode.':'Loss-of-support correction remains within its supported chart range.');}
    syncNomographs();
  }
  window.RigidFoundation={update,restore,getState,selectMaterial};
})();
