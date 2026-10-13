(() => {
  const $=id=>document.getElementById(id),ids=['classification','terrain','otherClass','function','environment','adt','speed'];
  let adopted={},previous=new Map(),result;
  for(const v of DesignCriteria.speeds){const o=document.createElement('option');o.value=v;o.textContent=v;$('speed').append(o);}
  const format=n=>n==null?'Project review':Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
  function update(){
    const input=Object.fromEntries(ids.map(id=>[id,$(id).value]));
    $('other-controls').hidden=['primary','secondary'].includes(input.classification);
    $('functional-controls').hidden=input.otherClass!=='functional';
    try{result=DesignCriteria.build(input);}catch(e){$('criteria').replaceChildren();$('status').textContent=e.message;return;}
    $('context').textContent=$('classification').selectedOptions[0].textContent+' · '+$('terrain').selectedOptions[0].textContent+' · Adopted speed '+(result.speed??'—')+' km/h';
    $('status').textContent=result.changedSpeed?'Adopted speed differs from the baseline. Review alignment criteria for that speed.':'Baseline criteria update as controls change. Enter project values beside each line to compare.';
    const body=$('criteria');body.replaceChildren();
    for(const row of result.rows){
      const tr=document.createElement('tr');tr.dataset.id=row.id;
      if(previous.has(row.id)&&previous.get(row.id)!==row.value)tr.className='updated';
      const cells=Array.from({length:5},()=>document.createElement('td'));cells[0].textContent=row.label;
      cells[1].textContent=(row.value==null?'':row.relation==='max'?'≤ ':row.relation==='min'?'≥ ':'')+format(row.value)+(row.value==null?'':' '+row.unit);
      const field=document.createElement('input');field.type='number';field.min='0';field.step='any';field.placeholder='—';field.setAttribute('aria-label','Project adopted '+row.label);field.value=adopted[row.id]??'';
      if(row.id==='recommendedSpeed'){field.readOnly=true;field.value=result.speed??'';adopted[row.id]=field.value;field.title='Set the adopted design speed in Design Controls.';}
      else field.addEventListener('input',()=>{adopted[row.id]=field.value;review();});cells[2].append(field);
      const state=()=>{const value=DesignCriteria.assess(row,adopted[row.id]);cells[3].textContent=value;cells[3].className=value==='Meets baseline'?'meets':'review';};
      cells[4].textContent=row.reference+(row.note?' · '+row.note:'');tr.append(...cells);body.append(tr);state();
    }
    previous=new Map(result.rows.map(r=>[r.id,r.value]));review();
  }
  function review(){let count=0;for(const row of result.rows){const tr=$('criteria').querySelector(`[data-id="${row.id}"]`);const state=DesignCriteria.assess(row,adopted[row.id]);tr.children[3].textContent=state;tr.children[3].className=state==='Meets baseline'?'meets':'review';if(state==='Meets baseline')count++;}$('count').textContent=count+' / '+result.rows.length+' meet baseline';}
  $('controls').addEventListener('submit',e=>e.preventDefault());ids.forEach(id=>$(id).addEventListener(id==='adt'?'input':'change',update));
  $('reset').addEventListener('click',()=>{const defaults={classification:'primary',terrain:'level',otherClass:'functional',function:'collector',environment:'rural',adt:'',speed:''};ids.forEach(id=>$(id).value=defaults[id]);adopted={};previous.clear();update();});$('print').addEventListener('click',()=>window.print());update();
})();
