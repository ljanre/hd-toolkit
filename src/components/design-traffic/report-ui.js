(() => {
 const REPORT_ENABLED=false;
 const M=CesalReportModel,$=id=>document.getElementById(id);let current=null,draft=null,copyTimer;
 function update(data){
  clearTimeout(copyTimer);$('copyCesalW18').disabled=!M.canReport(data);$('copyCesalW18').textContent='Copy W18';$('cesalCopyStatus').textContent='';
  current=data;const c=M.chart(data),target=$('cesalContributionChart');target.replaceChildren();
  if(!data||!c.rows.length){const p=document.createElement('p');p.className='chart-empty';p.textContent='Enter positive AADT and an EF to display design-lane loading contributions.';target.append(p);}
  else {
   const stack=document.createElement('div'),legend=document.createElement('ul');stack.className='cesal-stack';stack.setAttribute('aria-hidden','true');legend.className='cesal-stack-legend';
   for(const r of c.rows){
    const segment=document.createElement('div');segment.className='cesal-stack-segment';segment.style.width=r.share+'%';segment.style.backgroundColor=r.color;segment.title=r.label+' · '+M.fmt(r.contribution)+' ESAL · '+M.fmt(r.share)+'%';if(r.share>=8)segment.textContent=M.fmt(r.share)+'%';stack.append(segment);
    const li=document.createElement('li'),swatch=document.createElement('span'),details=document.createElement('div'),label=document.createElement('span'),value=document.createElement('strong');swatch.className='cesal-stack-swatch';swatch.style.backgroundColor=r.color;swatch.setAttribute('aria-hidden','true');label.textContent=r.label;value.textContent=M.fmt(r.contribution)+' ESAL · '+M.fmt(r.share)+'%';details.append(label,value);li.append(swatch,details);legend.append(li);
   }target.append(stack,legend);
  }
  $('cesalChartStatus').textContent=c.partial?'Partial loading contributions — active cases without EF are excluded.':c.rows.length?c.total>0?'One bar = 100% of design-lane CESAL. Colors match the legend. The ten largest cases are shown separately; any remainder is grouped as Other.':'Total CESAL is zero; no percentage distribution is drawn.':'';
  $('generateCesalReport').disabled=!REPORT_ENABLED||!M.canReport(data);
  $('cesalReportStatus').textContent=!REPORT_ENABLED?'Report generation is temporarily unavailable.':M.canReport(data)?'Download an editable Word report with calculation tables, chart and draft discussion.':'Complete the inputs and EF for all positive-AADT cases to generate a report.';
 }
 $('copyCesalW18').addEventListener('click',async()=>{
  if(!M.canReport(current))return;
  const value=String(current.total),button=$('copyCesalW18');
  try{
   try{if(!navigator.clipboard?.writeText)throw Error('Clipboard API unavailable');await navigator.clipboard.writeText(value);}
   catch{
    const field=document.createElement('textarea'),focused=document.activeElement;field.value=value;field.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(field);
    try{field.focus();field.select();if(!document.execCommand('copy'))throw Error('Clipboard access denied');}finally{field.remove();focused?.focus();}
   }
   button.textContent='Copied';$('cesalCopyStatus').textContent='W18 copied in ESAL.';copyTimer=setTimeout(()=>{button.textContent='Copy W18';$('cesalCopyStatus').textContent='';},2500);
  }catch{$('cesalCopyStatus').textContent='Copy unavailable. Select and copy the W18 value.';}
 });
 $('generateCesalReport').addEventListener('click',()=>{
  if(!REPORT_ENABLED||!M.canReport(current))return;
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
  event.preventDefault();if(!REPORT_ENABLED)return;const button=$('downloadCesalWord');if(button.disabled)return;
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
