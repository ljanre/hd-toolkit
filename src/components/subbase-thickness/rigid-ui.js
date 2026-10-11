(()=>{
  const $=id=>document.getElementById(id),ids=['rigid-cbr','construction','frost','slab'];
  const num=id=>$(id).value.trim()===''?NaN:Number($(id).value);
  const fmt=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:2});
  const guides={
    'rigid-cbr':['Subgrade Design CBR','Use a representative project design CBR, not the subbase material CBR. Table 5 classifies CBR ≤2% as weak, >2% and <15% as normal, and ≥15% as very stable. Local soft spots and unsuitable soils require separate treatment.'],
    construction:['Construction Traffic','Select damage risk when heavy vehicles must use the prepared subbase on weak or normal soil and the designer considers damage likely. Paragraph 47 adds 150 mm at CBR ≤4%, or 80 mm on other normal subgrades. No such addition is specified here for very stable subgrades. Check upper-layer material suitability and regulate any damaged surface before slab construction.'],
    frost:['Frost Condition','For frost-susceptible subgrade, paragraph 48 requires at least 450 mm of non-frost-susceptible construction over the soil. This tool subtracts the entered concrete slab thickness to find the required subbase. For Philippine projects, select not applicable only when justified by the site conditions.'],
    slab:['Designed Slab Thickness · D','Enter the concrete slab thickness established by the applicable pavement design. It is used only in the frost total-depth check. No slab thickness is assumed. Enter the designed value when frost protection is required.'],
  };
  let opener;
  document.querySelectorAll('[data-guide]').forEach(button=>button.addEventListener('click',()=>{opener=button;const [title,text]=guides[button.dataset.guide];$('rigid-guide-title').textContent=title;$('rigid-guide-text').textContent=text;$('rigid-guide').showModal();}));
  $('rigid-guide-close').addEventListener('click',()=>$('rigid-guide').close());$('rigid-guide').addEventListener('close',()=>opener?.focus());
  function summary(items){$('rigid-summary').replaceChildren();for(const [label,value] of items){const tr=document.createElement('tr');for(const text of [label,value]){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('rigid-summary').append(tr);}}
  function draw(r){
    const thickness=r?fmt(r.adopted)+' mm':'— mm',soil=r?fmt(r.cbr)+'%':'—';
    const subHeight=r?Math.max(0,Math.min(95,r.adopted*.25)):65,soilY=58+subHeight,height=soilY+68;
    const svg=$('rigid-structure');svg.setAttribute('viewBox','0 0 760 '+height);
    svg.innerHTML='<defs><pattern id="pcc" width="22" height="18" patternUnits="userSpaceOnUse"><path d="M4 3l4 5H2z M16 13h2" fill="none" stroke="#b5c4ca"/></pattern><pattern id="aggregate" width="28" height="24" patternUnits="userSpaceOnUse"><path d="M3 5l6-3 5 7-5 6-7-4z M20 19l5-2 2 5" fill="none" stroke="#aabfc0"/></pattern><pattern id="soil" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 14L14 0" stroke="#c3cdcb"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#536977"/></marker></defs><rect x="1" y="1" width="540" height="57" fill="#f4f7f8" stroke="#536977"/><rect x="1" y="1" width="540" height="57" fill="url(#pcc)"/><text x="16" y="24" fill="#203444" font-family="Segoe UI,sans-serif" font-size="17" font-weight="600">Concrete Slab</text><text x="16" y="44" fill="#536977" font-family="Segoe UI,sans-serif" font-size="12">Thickness from concrete pavement design</text>'+(subHeight>0?'<rect x="1" y="58" width="540" height="'+subHeight+'" fill="#e7efed" stroke="#536977"/><rect x="1" y="58" width="540" height="'+subHeight+'" fill="url(#aggregate)"/>':'')+'<rect x="1" y="'+soilY+'" width="540" height="62" fill="#f7f8f6" stroke="#536977"/><rect x="1" y="'+soilY+'" width="540" height="62" fill="url(#soil)"/><text x="16" y="'+(soilY+25)+'" fill="#203444" font-family="Segoe UI,sans-serif" font-size="17" font-weight="600">Compacted Subgrade</text><text x="16" y="'+(soilY+46)+'" fill="#536977" font-family="Segoe UI,sans-serif" font-size="12">Design CBR = '+soil+'</text><line x1="560" x2="590" y1="58" y2="58" stroke="#9aacb5"/><line x1="560" x2="590" y1="'+soilY+'" y2="'+soilY+'" stroke="#9aacb5"/>'+(subHeight>0?'<line x1="580" x2="580" y1="60" y2="'+(soilY-2)+'" stroke="#536977" marker-start="url(#arrow)" marker-end="url(#arrow)"/>':'')+'<text x="606" y="'+(58+subHeight/2)+'" fill="#203444" font-family="Segoe UI,sans-serif" font-size="16">Dₛᵦ = '+thickness+'</text><text x="606" y="'+(76+subHeight/2)+'" fill="#536977" font-family="Segoe UI,sans-serif" font-size="12">Adopted subbase</text>';
  }
  function update(){
    $('slab-field').hidden=!$('frost').checked;
    $('frost-state').textContent=$('frost').checked?'Yes':'No';
    for(const id of ids)$(id).removeAttribute('aria-invalid');
    $('rigid-result').textContent='—';$('rigid-status').textContent='INPUT REQUIRED';$('rigid-message').textContent='Enter the project CBR and select the construction-traffic condition.';
    document.querySelectorAll('[data-class]').forEach(row=>row.setAttribute('data-active','false'));
    for(const id of ['step-class','step-construction','step-frost','step-adopt'])$(id).textContent='—';summary([]);draw(null);
    if($('rigid-cbr').value.trim()===''&&!$('rigid-cbr').validity?.badInput)return;
    if(!$('construction').value){$('rigid-message').textContent='Select the construction-traffic condition to calculate.';return;}
    if($('frost').checked&&$('slab').value.trim()===''&&!$('slab').validity?.badInput){$('rigid-message').textContent='Enter the designed slab thickness for the frost check.';return;}
    try{
      const r=RigidSubbase.calculate({cbr:num('rigid-cbr'),construction:$('construction').value,frost:$('frost').checked?'susceptible':'none',slab:num('slab')});
      $('rigid-result').textContent=fmt(r.adopted);$('rigid-status').textContent='CALCULATED';$('rigid-message').textContent=r.classification+' subgrade · Reference requirement '+fmt(r.required)+' mm.';
      document.querySelectorAll('[data-class]').forEach(row=>row.setAttribute('data-active',String(row.dataset.class===r.classification)));
      $('step-class').textContent='CBR = '+fmt(r.cbr)+'% → '+r.classification+' → Table 5 minimum '+r.base+' mm.';
      $('step-construction').textContent=r.base+' + '+r.constructionAddition+' = '+r.structural+' mm. '+(r.construction==='risk'?'Heavy construction traffic / damage risk selected.':'No heavy-traffic damage risk selected.');
      $('step-frost').textContent=r.frost==='susceptible'?'max(0, 450 − '+fmt(r.slab)+') = '+fmt(r.frostMinimum)+' mm. Slab and subbase assumed non-frost-susceptible.':'Frost check not applicable under the selected condition.';
      $('step-adopt').textContent='max('+r.structural+', '+fmt(r.frostMinimum)+') = '+fmt(r.adopted)+' mm. No automatic rounding.';
      summary([['Subgrade Design CBR',fmt(r.cbr)+'%'],['Subgrade Classification',r.classification],['Table 5 Minimum',r.base+' mm'],['Construction-Traffic Addition',r.constructionAddition+' mm'],['Frost Minimum Subbase',r.frost==='susceptible'?fmt(r.frostMinimum)+' mm':'Not applicable'],['Adopted Subbase Thickness',r.adopted+' mm']]);draw(r);
    }catch(error){$('rigid-status').textContent='INVALID INPUT';$('rigid-message').textContent=error.message;}
  }
  $('rigid-subbase-form').addEventListener('input',update);$('rigid-subbase-form').addEventListener('change',update);$('rigid-subbase-form').addEventListener('submit',event=>{event.preventDefault();update();});
  $('rigid-clear').addEventListener('click',()=>{$('rigid-cbr').value='';$('construction').value='';$('frost').checked=false;$('slab').value='';update();$('rigid-cbr').focus();});
  window.addEventListener('message',event=>{if(event.source!==window.parent||event.data?.type!=='hd-toolkit-admin-state'||typeof event.data.enabled!=='boolean')return;const steps=$('calculationSteps');steps.hidden=!event.data.enabled;if(steps.hidden)steps.open=false;});
  if(window.parent!==window)window.parent.postMessage({type:'hd-toolkit-subbase-ready'},'*');update();
})();