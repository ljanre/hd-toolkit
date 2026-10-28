(() => {
  const $=id=>document.getElementById(id),E=RoadInventory;
  const pageSize=25;let inventory=null,matches=[],page=0,selected=null,timer;
  const filters=()=>({query:$('search').value,REGION:$('region').value,PROVINCE:$('province').value,DEO:$('deo').value,ROAD_SEC_CLASS:$('classification').value});
  const text=value=>String(value??'').trim()||'—';
  const number=value=>String(value).trim()!==''&&Number.isFinite(Number(value))?Number(value).toLocaleString('en-US',{maximumFractionDigits:2}):'—';
  function node(tag,value){const item=document.createElement(tag);item.textContent=value;return item;}
  function fillOptions(id,values,label){const field=$(id),old=field.value;field.replaceChildren(new Option(label,''),...values.map(value=>new Option(value,value)));if(values.includes(old))field.value=old;field.disabled=false;}
  function cascades(){const f=filters();fillOptions('province',E.options(E.search(inventory.records,{REGION:f.REGION}),'PROVINCE'),'All provinces');fillOptions('deo',E.options(E.search(inventory.records,{REGION:f.REGION,PROVINCE:$('province').value}),'DEO'),'All offices');}
  function rows(target,entries){target.replaceChildren(...entries.map(([label,value])=>{const row=document.createElement('tr'),heading=node('th',label);heading.scope='row';row.append(heading,node('td',text(value)));return row;}));}
  function details(){
    $('audit').hidden=!selected;if(!selected)return;
    const r=selected.raw,project=$('project-name').value.trim();
    $('audit-title').textContent=project||text(r.ROAD_NAME);
    $('audit-subtitle').textContent=(project?text(r.ROAD_NAME)+' · ':'')+text(r.PROVINCE)+' · '+text(r.DEO);
    $('class-badge').textContent=text(r.ROAD_SEC_CLASS);
    $('section-id').textContent=text(r.SECTION_ID);$('section-length').textContent=number(r.SEC_LENGTH)+' m';$('route-number').textContent=text(r.ROUTE_NO);
    const duplicates=inventory.records.filter(record=>record.raw.SECTION_ID.trim()===r.SECTION_ID.trim());
    $('duplicate-note').hidden=duplicates.length<2;
    $('duplicate-note').textContent='This section ID appears in '+duplicates.length+' source records. Selected OBJECTID: '+r.OBJECTID+'. Check road name and location before using this reference.';
    const entries=[['Road Name',r.ROAD_NAME],['Section ID',r.SECTION_ID],['Road Section Classification',r.ROAD_SEC_CLASS],['Island',r.ISLAND],['Region',r.REGION],['Province',r.PROVINCE],['District Engineering Office',r.DEO],['Section Length · SEC_LENGTH',number(r.SEC_LENGTH)+' m'],['Length Source',r.SOURCE],['Route Number',r.ROUTE_NO],['Road ID',r.ROAD_ID],['Route ID',r.ROUTE_ID],['Congressional District',r.CONG_DIST],['Direction (source attribute)',r.DIRECTION],['Remarks',r.REMARKS]];
    if($('project-stations').value.trim())entries.unshift(['Project Station Limits · Entered',$('project-stations').value.trim()]);
    if(project)entries.unshift(['Project Name · Entered',project]);
    rows($('details'),entries);rows($('all-attributes'),inventory.columns.map(key=>[key,r[key]]));
    $('source-note').textContent='Source: '+inventory.source+' · Record OBJECTID '+r.OBJECTID+' · Values reproduced from the supplied inventory snapshot.';
  }
  function results(){
    const start=page*pageSize,visible=matches.slice(start,start+pageSize);
    $('matches').replaceChildren(...visible.map(record=>{const r=record.raw,row=document.createElement('tr');row.classList.toggle('selected',selected?.index===record.index);row.append(...[r.SECTION_ID,r.ROAD_NAME,r.PROVINCE,r.ROAD_SEC_CLASS,number(r.SEC_LENGTH)].map(value=>node('td',text(value))));const cell=document.createElement('td'),button=node('button','View');button.type='button';button.dataset.record=record.index;button.setAttribute('aria-label','View '+r.SECTION_ID+' record '+r.OBJECTID);cell.append(button);row.append(cell);return row;}));
    if(!matches.length){const row=document.createElement('tr'),cell=node('td','No matching sections. Try a broader road name, section ID or location.');cell.colSpan=6;row.append(cell);$('matches').append(row);}
    $('match-count').textContent=matches.length.toLocaleString()+' matching records';
    $('page-label').textContent=matches.length?(start+1)+'–'+Math.min(start+pageSize,matches.length)+' of '+matches.length.toLocaleString():'0 records';
    $('previous').disabled=page===0;$('next').disabled=start+pageSize>=matches.length;
  }
  function update(){if(!inventory)return;matches=E.search(inventory.records,filters());page=0;if(selected&&!matches.some(record=>record.index===selected.index)){selected=null;details();}results();}
  async function load(){
    $('load-status').textContent='Loading the supplied CSV inventory…';$('load-status').classList.remove('error');$('retry').hidden=true;
    try{
      const embedded=$('road-inventory-data')?.textContent.trim();
      let data;
      if(embedded) data=JSON.parse(embedded);
      else {
        // Source previews use the same snapshot; production embeds it in this page.
        const version=document.querySelector('meta[name="hd-toolkit-build"]')?.content||new URLSearchParams(location.search).get('v')||'network-1';
        const response=await fetch('network-data.json?v='+encodeURIComponent(version));
        if(!response.ok)throw new Error('Inventory unavailable: HTTP '+response.status);
        data=await response.json();
      }
      inventory=E.load(data);
      $('inventory-count').textContent=inventory.records.length.toLocaleString()+' source records';
      fillOptions('region',E.options(inventory.records,'REGION'),'All regions');fillOptions('classification',E.options(inventory.records,'ROAD_SEC_CLASS'),'All classifications');cascades();update();$('load-status').textContent='Search and select a matching road section to view its audit reference.';
    }catch(error){console.error('Road inventory initialization failed:',error);$('inventory-count').textContent='Inventory unavailable';$('load-status').textContent='Could not open the road inventory. Retry loading or reload this tool.';$('load-status').classList.add('error');$('retry').hidden=false;}
  }
  $('search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(update,140);});
  ['region','province','deo','classification'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='region'){$('province').value='';$('deo').value='';}if(id==='province')$('deo').value='';if(id==='region'||id==='province')cascades();update();}));
  ['project-name','project-stations'].forEach(id=>$(id).addEventListener('input',details));
  $('matches').addEventListener('click',event=>{const button=event.target.closest('button[data-record]');if(!button||!inventory)return;selected=inventory.records[Number(button.dataset.record)];details();results();$('audit').scrollIntoView({behavior:'smooth',block:'start'});});
  $('previous').addEventListener('click',()=>{if(page>0){page--;results();}});$('next').addEventListener('click',()=>{if((page+1)*pageSize<matches.length){page++;results();}});
  $('clear').addEventListener('click',()=>{clearTimeout(timer);['project-name','project-stations','search','region','province','deo','classification'].forEach(id=>$(id).value='');selected=null;details();if(inventory){cascades();update();}$('search').focus();});
  $('retry').addEventListener('click',load);$('print').addEventListener('click',()=>window.print());
  $('download').addEventListener('click',()=>{if(!selected)return;const columns=[...inventory.columns,'PROJECT_NAME_ENTERED','PROJECT_STATION_LIMITS_ENTERED'],raw={...selected.raw,PROJECT_NAME_ENTERED:$('project-name').value.trim(),PROJECT_STATION_LIMITS_ENTERED:$('project-stations').value.trim()};const content='\uFEFF'+E.csv(columns,Object.fromEntries(columns.map(key=>[key,key])))+'\r\n'+E.csv(columns,raw)+'\r\n';const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='Road-Reference-'+selected.raw.SECTION_ID.replace(/[^a-z0-9_-]/gi,'_')+'-'+selected.raw.OBJECTID+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  load();
})();
