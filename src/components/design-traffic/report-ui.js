(() => {
 const M=CesalReportModel,$=id=>document.getElementById(id);let current=null,draft=null;
 function update(data){
  current=data;const c=M.chart(data),target=$('cesalContributionChart');target.replaceChildren();
  if(!data||!c.rows.length){const p=document.createElement('p');p.className='chart-empty';p.textContent='Enter positive AADT and an EF to display design-lane loading contributions.';target.append(p);}
  else {
   const list=document.createElement('ol');list.className='cesal-bars';const max=Math.max(0,...c.rows.map(r=>r.contribution));
   for(const r of c.rows){const li=document.createElement('li'),heading=document.createElement('div'),label=document.createElement('span'),value=document.createElement('strong'),track=document.createElement('div'),bar=document.createElement('div');
    heading.className='cesal-bar-heading';label.textContent=r.label;value.textContent=M.fmt(r.contribution)+' ESAL · '+M.fmt(r.share)+'%';heading.append(label,value);
    track.className='cesal-bar-track';track.setAttribute('aria-hidden','true');bar.style.width=(max?r.contribution/max*100:0)+'%';track.append(bar);li.append(heading,track);list.append(li);
   }target.append(list);
  }
  $('cesalChartStatus').textContent=c.partial?'Partial loading contributions — active cases without EF are excluded.':c.rows.length?'Shares of total design-lane CESAL. The ten largest cases are shown separately; any remainder is grouped as Other.':'';
  $('generateCesalReport').disabled=!M.canReport(data);
  $('cesalReportStatus').textContent=M.canReport(data)?'Download an editable Word report with calculation tables, chart and draft discussion.':'Complete the inputs and EF for all positive-AADT cases to generate a report.';
 }
 $('generateCesalReport').addEventListener('click',()=>{
  if(!M.canReport(current))return;
  draft=JSON.parse(JSON.stringify(current));$('cesalReportDiscussion').value=M.discussion(draft);$('cesalReportError').textContent='';$('cesalReportDialog').showModal();$('cesalReportProject').focus();
 });
 $('cesalReportCancel').addEventListener('click',()=>$('cesalReportDialog').close());
 $('cesalReportDialog').addEventListener('close',()=>$('generateCesalReport').focus());
 async function pngOf(chart){
  const url=URL.createObjectURL(new Blob([chart.svg],{type:'image/svg+xml;charset=utf-8'}));
  try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not render the report chart.'));img.src=url;});const canvas=document.createElement('canvas');canvas.width=chart.width*2;canvas.height=chart.height*2;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Could not create the report chart.');return new Uint8Array(await blob.arrayBuffer());}
  finally{URL.revokeObjectURL(url);}
 }
 $('cesalReportForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('downloadCesalWord');if(button.disabled)return;
  button.disabled=true;button.textContent='Generating…';$('cesalReportError').textContent='';
  try{
   const data=draft,meta={project:$('cesalReportProject').value,location:$('cesalReportLocation').value,prepared:$('cesalReportPrepared').value,reference:$('cesalReportReference').value,discussion:$('cesalReportDiscussion').value,date:new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})};
   const chart=M.chartSvg(data),png=await pngOf(chart),bytes=CesalWord.build(data,meta,png,chart),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
   const link=document.createElement('a');link.href=url;link.download='CESAL-W18-'+(meta.project.trim()||'Engineering-Report').replace(/[^a-z0-9_-]+/gi,'-').slice(0,80)+'.docx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('cesalReportDialog').close();
  }catch(error){$('cesalReportError').textContent='Report not generated: '+error.message;}
  finally{button.disabled=false;button.textContent='Download Word (.docx)';}
 });
 globalThis.CesalPresentation=Object.freeze({update});
})();
