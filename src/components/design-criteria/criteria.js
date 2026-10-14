(() => {
  const $=id=>document.getElementById(id),ids=['classification','designFamily','basis','standardLevel','terrain','otherClass','function','environment','adt','speed'];
  let adopted={},previous=new Map(),result;
  for(const v of DesignCriteria.speeds){const o=document.createElement('option');o.value=v;o.textContent=v;$('speed').append(o);}
  const format=n=>n==null?'TO BE ESTABLISHED':Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
  function update(){
    const input=Object.fromEntries(ids.map(id=>[id,$(id).value]));
    const definition=RoadClassification.entries[input.classification]||RoadClassification.entries.others;
    $('classification-note').textContent=definition.group+' · '+definition.definition+' D.O.112, s.2024, '+definition.reference;

    try{result=DesignCriteria.build(input);}catch(e){$('criteria').replaceChildren();$('status').textContent=e.message;$('section-drawing').replaceChildren();$('section-status').textContent=e.message;$('section-summary').textContent='';$('count').textContent='';$('context').textContent='';document.dispatchEvent(new CustomEvent('criteria-updated',{detail:null}));return;}
    $('other-controls').hidden=result.basis!=='functional';
    $('functional-controls').hidden=false;
    $('standardLevel').disabled=result.basis!=='table'||!['primary','secondary','expressway'].includes(result.designClass);
    $('basis-help').textContent=result.basisLabel;
    $('context').textContent=$('classification').selectedOptions[0].textContent+' · '+$('terrain').selectedOptions[0].textContent+' · Adopted speed '+(result.speed??'—')+' km/h · '+result.basisLabel;
    $('status').textContent=result.changedSpeed?'Adopted speed differs from the baseline. Review alignment criteria for that speed.':'Baseline criteria update as controls change. Enter project values beside each line to compare.';
    if(result.warnings.length)$('status').textContent+=' '+result.warnings.join(' ');
    const body=$('criteria');body.replaceChildren();
    for(const row of result.rows){
      const tr=document.createElement('tr');tr.dataset.id=row.id;
      if(previous.has(row.id)&&previous.get(row.id)!==row.value)tr.className='updated';
      const cells=Array.from({length:5},()=>document.createElement('td'));cells[0].textContent=row.label;
      const guide=document.createElement('button');guide.type='button';guide.className='input-guide-button';guide.textContent='?';guide.setAttribute('aria-label','Input guide: '+row.label);guide.dataset.guideTitle=row.label;guide.dataset.guideText=(row.value==null?'TO BE ESTABLISHED. This selection has no prescribed numerical value. Confirm and adopt a project-specific value. ':('Baseline '+format(row.value)+' '+row.unit+'. '+(row.relation==='min'?'Minimum requirement. ':row.relation==='max'?'Maximum limit. ':'Prescribed value. ')))+row.reference+'. '+row.note;cells[0].append(guide);
      cells[1].textContent=(row.value==null?'':row.relation==='max'?'≤ ':row.relation==='min'?'≥ ':'')+format(row.value)+(row.value==null?'':' '+row.unit);
      const field=document.createElement('input');field.type='number';field.min='0';field.step='any';field.placeholder=row.value==null?'TO BE ESTABLISHED':'—';field.setAttribute('aria-label','Project adopted '+row.label);field.value=adopted[row.id]??'';
      if(row.id==='recommendedSpeed'){field.readOnly=true;field.value=result.speed??'';adopted[row.id]=field.value;field.title='Set the adopted design speed in Design Controls.';}
      else field.addEventListener('input',()=>{adopted[row.id]=field.value;review();});cells[2].append(field);
      const state=()=>{const value=DesignCriteria.assess(row,adopted[row.id]);cells[3].textContent=value;cells[3].className=value==='Meets baseline'?'meets':'review';};
      cells[4].textContent=row.reference+(row.note?' · '+row.note:'');tr.append(...cells);body.append(tr);state();
    }
    previous=new Map(result.rows.map(r=>[r.id,r.value]));review();
  }
  function review(){let count=0;for(const row of result.rows){const tr=$('criteria').querySelector(`[data-id="${row.id}"]`);const state=DesignCriteria.assess(row,adopted[row.id]);tr.children[3].textContent=state;tr.children[3].className=state==='Meets baseline'?'meets':'review';if(state==='Meets baseline')count++;}$('count').textContent=count+' / '+result.rows.length+' meet baseline';CriteriaSection.update(result,adopted);document.dispatchEvent(new CustomEvent('criteria-updated',{detail:result}));}
  $('controls').addEventListener('submit',e=>e.preventDefault());ids.forEach(id=>$(id).addEventListener(id==='adt'?'input':'change',update));
  $('reset').addEventListener('click',()=>{const defaults={classification:'primary',designFamily:'auto',basis:'auto',standardLevel:'minimum',terrain:'level',otherClass:'functional',function:'collector',environment:'rural',adt:'',speed:''};ids.forEach(id=>$(id).value=defaults[id]);adopted={};previous.clear();CriteriaSection.reset();update();});$('print').addEventListener('click',()=>window.print());update();
})();
