/* Custom loading cases use the existing axle EF engine; the editor commits only on Apply. */
(() => {
 const V=VehicleAnnex,C=DesignTraffic,$=id=>document.getElementById(id);
 function validate(draft){
  const layout=V.profiles.find(p=>p.code===draft.layout);if(!layout)throw Error('Select a vehicle layout.');
  const gvw=String(draft.gvw).trim()===''?NaN:Number(draft.gvw);if(!Number.isFinite(gvw)||gvw<=0)throw Error('Enter a positive gross vehicle weight in kg.');
  const text=String(draft.fractions||'').trim(),fractions=text?text.split(/[\s,;]+/).map(Number):null,expected=layout.fractions?.length||5;
  if(fractions&&(fractions.length!==expected||fractions.some(f=>!Number.isFinite(f)||f<0||f>1)||Math.abs(fractions.reduce((a,b)=>a+b,0)-1)>.001))throw Error('Enter '+expected+' axle fractions totaling 1 (tolerance 0.001).');
  if(!draft.useManual&&!fractions)throw Error('Enter verified axle fractions to calculate EF.');
  const calculatedEF=fractions?C.axleFactor(fractions.map(f=>gvw*f/1000).join(',')):null;
  const manualEF=draft.useManual?(String(draft.manualEF).trim()===''?NaN:Number(draft.manualEF)):null;
  if(draft.useManual&&(!Number.isFinite(manualEF)||manualEF<0))throw Error('Enter a verified EF of zero or greater in ESAL/vehicle.');
  return {name:String(draft.name||'New Truck Type').trim().slice(0,80)||'New Truck Type',layout:layout.code,gvw,fractions,fractionsText:text,manualEF,calculatedEF,ef:manualEF??calculatedEF};
 }
 let bound=false,apply,trigger;
 function values(){return {name:$('customName').value,layout:$('customLayout').value,gvw:$('customWeight').value,fractions:$('customFractions').value,useManual:$('customOverride').checked,manualEF:$('customEF').value};}
 function preview(){
  const draft=values(),layout=V.profiles.find(p=>p.code===draft.layout);$('customEFField').hidden=!draft.useManual;
  try{const config=validate(draft);$('customVehiclePlot').innerHTML=V.diagram({...layout,name:config.name,gvw:config.gvw,fractions:config.fractions},true);$('customCalculated').textContent=config.calculatedEF===null?'Not available · axle shares not provided':config.calculatedEF.toLocaleString('en-US',{maximumFractionDigits:6})+' ESAL/vehicle';$('customAdopted').textContent=config.ef.toLocaleString('en-US',{maximumFractionDigits:6})+' ESAL/vehicle'+(config.manualEF!==null?' · entered factor':' · calculated');$('customError').textContent='';$('customSave').disabled=false;}
  catch(error){$('customVehiclePlot').innerHTML=V.diagram({...layout,fractions:null},true);$('customCalculated').textContent='—';$('customAdopted').textContent='—';$('customError').textContent=error.message;$('customSave').disabled=true;}
 }
 function open(initial,onApply,focusTarget){
  if(!bound){
   for(const p of V.profiles){const option=document.createElement('option');option.value=p.code;option.textContent=p.code+' · '+p.name;$('customLayout').append(option);}
   $('customLayout').addEventListener('change',()=>{const layout=V.profiles.find(p=>p.code===$('customLayout').value);$('customWeight').value=layout.gvw;$('customFractions').value=layout.fractions?.join(', ')||'';if($('customOverride').checked)$('customEF').value='';preview();});
   $('customConfigForm').addEventListener('input',preview);$('customConfigForm').addEventListener('change',preview);$('customConfigForm').addEventListener('submit',event=>{event.preventDefault();try{const config=validate(values());apply(config);$('customConfigDialog').close();}catch(error){$('customError').textContent=error.message;}});
   $('customCancel').addEventListener('click',()=>$('customConfigDialog').close());$('customConfigDialog').addEventListener('close',()=>trigger?.focus());bound=true;
  }
  apply=onApply;trigger=focusTarget;$('customName').value=initial.name||'New Truck Type';$('customLayout').value=initial.layout||'1-1';$('customWeight').value=initial.gvw??'';$('customFractions').value=initial.fractions||'';$('customOverride').checked=initial.manualEF!=null;$('customEF').value=initial.manualEF??'';preview();$('customConfigDialog').showModal();$('customName').focus();
 }
 globalThis.VehicleConfiguration=Object.freeze({validate,open});
})();
