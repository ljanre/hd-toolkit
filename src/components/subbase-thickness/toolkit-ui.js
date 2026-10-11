/* Toolkit presentation and live-input behavior; RN29 model calculations stay in app.js. */
(()=>{
  const $=id=>document.getElementById(id);
  for(const id of ['traffic-input','cbr-input'])$(id).addEventListener('input',()=>{
    if($('traffic-input').value.trim()&&$('cbr-input').value.trim())RN29App.calculateFromForm();
    else RN29App.clear();
  });
  const guides={
    'traffic-input':['Design Traffic · W₁₈','Enter total design-lane ESALs, as in Rigid Pavement. Example: 1,000,000 displays as 1.00 ×10⁶ ESAL when you leave the field. On focus the full count returns for editing. The RN29 chart receives the full-precision value in MSA; supported traffic is 10,000–100,000,000 total ESALs (0.01–100 MSA).'],
    'cbr-input':['Subgrade Design CBR','Enter the representative project design CBR in percent. The model selects or interpolates printed chart curves and applies the applicable minimum thickness. Values below 2% use the chart’s additional-thickness branch. Unsupported curve domains produce a limitation message; no extrapolation is performed.']
  };
  const dialog=document.createElement('dialog');dialog.className='subbase-guide';
  const heading=document.createElement('h2'),text=document.createElement('p'),close=document.createElement('button');close.type='button';close.textContent='Close';close.addEventListener('click',()=>dialog.close());
  dialog.append(heading,text,close);document.body.append(dialog);
  for(const [id,[title,description]] of Object.entries(guides)){
    const button=document.createElement('button');button.type='button';button.className='input-guide-button';button.textContent='?';button.setAttribute('aria-label',title+' guide');
    button.addEventListener('click',()=>{heading.textContent=title;text.textContent=description;dialog.showModal();});$(id).closest('.field-group').append(button);
  }
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.data?.type!=='hd-toolkit-admin-state'||typeof event.data.enabled!=='boolean')return;
    $('calculationSteps').hidden=!event.data.enabled;if(!event.data.enabled)$('calculationSteps').open=false;
  });
  if(window.parent!==window)window.parent.postMessage({type:'hd-toolkit-subbase-ready'},'*');
})();
