(() => {
  const C=DesignTraffic,$=id=>document.getElementById(id),rows=[],growth=TrafficCESAL.growthInputs;
  const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  const format=n=>n.toLocaleString('en-US',{maximumFractionDigits:2});
  for(const [i,name] of [...C.classes,'Total',''].entries()){const th=make('th',name);if(i<10)th.innerHTML=VehicleAnnex.classVisual(i)+'<span>'+name+'</span>';$('stationHead').append(th);}
  const totalCells=[];for(let i=0;i<12;i++){const td=make('td',i===11?'':'—');$('stationTotals').append(td);totalCells.push(td);}
  function add(){
    const tr=make('tr'),row={tr,counts:[]};
    C.classes.forEach(name=>{const td=make('td'),input=make('input');input.type='number';input.min='0';input.step='any';input.setAttribute('aria-label',name+' AADT (vehicles/day)');td.append(input);tr.append(td);row.counts.push(input);});
    row.total=make('td','—');tr.append(row.total);const td=make('td'),remove=make('button','−');remove.type='button';remove.className='quiet';remove.setAttribute('aria-label','Remove AADT row');remove.addEventListener('click',()=>{rows.splice(rows.indexOf(row),1);tr.remove();if(!rows.length)add();update();});td.append(remove);tr.append(td);rows.push(row);$('stations').append(tr);return row;
  }
  function update(){
    globalThis.TrafficCESAL?.updateStations(rows,growth);
    $('error').hidden=true;$('total').textContent='—';$('status').textContent='Enter a complete AADT row to calculate totals.';for(let i=0;i<11;i++)totalCells[i].textContent='—';
    const active=[];let invalid=false,incomplete=false;
    for(const row of rows){row.total.textContent='—';const values=row.counts.map(input=>{input.removeAttribute('aria-invalid');const raw=input.value.trim();if(input.validity.badInput||(raw!==''&&(!Number.isFinite(Number(raw))||Number(raw)<0))){invalid=true;input.setAttribute('aria-invalid','true');}return raw===''?null:Number(raw);});
      if(values.some(value=>value!==null)||row.counts.some(input=>input.validity.badInput)){if(values.includes(null))incomplete=true;else if(values.every(v=>Number.isFinite(v)&&v>=0)){const sum=values.reduce((a,b)=>a+b,0);if(!Number.isFinite(sum)){invalid=true;}else{row.total.textContent=format(sum);active.push(values);}}}
    }
    for(const input of growth){input.removeAttribute('aria-invalid');if($('growthMode').value==='class'&&(input.validity.badInput||(input.value.trim()!==''&&!Number.isFinite(Number(input.value))))){input.setAttribute('aria-invalid','true');invalid=true;}}
    if(invalid){$('error').textContent='Check highlighted values. AADT must be a nonnegative number; growth must be a finite percentage.';$('error').hidden=false;return;}
    if(incomplete){$('status').textContent='Complete every vehicle class in each entered AADT row. Use 0 where none apply.';return;}
    if(!active.length)return;
    try{const result=C.calculate(active);result.totals.forEach((v,i)=>totalCells[i].textContent=format(v));totalCells[10].textContent=format(result.total);$('total').textContent=format(result.total);$('status').textContent='Sum of '+active.length+' entered AADT rows · Counts automatically feed CESAL by matching vehicle class.';}catch(error){$('error').textContent=error.message;$('error').hidden=false;}
  }
  $('trafficForm').addEventListener('submit',event=>event.preventDefault());$('trafficForm').addEventListener('input',update);
  $('addStation').addEventListener('click',()=>{const row=add();row.counts[0].focus();update();});
  $('sample').addEventListener('click',()=>{
    rows.splice(0);$('stations').replaceChildren();
    const row=add();
    [1200,650,420,180,90,45,160,110,75,40].forEach((value,i)=>row.counts[i].value=String(value));
    C.suppliedGrowth.forEach((value,i)=>growth[i].value=String(value));update();
    $('status').textContent='Illustrative sample counts · Growth rates from your supplied worksheet · Replace with project data.';
  });
  $('clear').addEventListener('click',()=>{rows.splice(0);$('stations').replaceChildren();growth.forEach(input=>input.value='');globalThis.TrafficCESAL?.reset();add();update();});
  C.classes.forEach((name,i)=>{const tr=make('tr');tr.append(make('td',name),make('td',String(C.suppliedGrowth[i])));$('growthReferenceRows').append(tr);});
  let opener;
  document.querySelectorAll('[data-guide]').forEach(button=>button.addEventListener('click',()=>{opener=button;const isGrowth=button.dataset.guide==='growth';$('guideTitle').textContent=isGrowth?'Traffic Growth Rate':'Annual Average Daily Traffic';$('guideBody').textContent=isGrowth?'Enter annual growth rates from the adopted project traffic study. The table below reproduces the supplied image; its publication, location and time period were not provided. These values are reference examples, not universal recommended defaults. Negative growth can represent a documented decline.':'Use AADT by vehicle class for the project design location and a common traffic study period. Enter adjusted annual average daily values, not raw peak-hour counts. Additional rows are summed; enter non-overlapping components of the same design traffic, not repeated counts or separate stations. Passenger utility and goods utility classifications should follow the source study. Blank rows are excluded; enter zero explicitly for absent vehicle classes.';$('growthReference').hidden=!isGrowth;$('guide').showModal();}));
  $('closeGuide').addEventListener('click',()=>$('guide').close());$('guide').addEventListener('close',()=>opener?.focus());
  $('guide').addEventListener('click',event=>{if(event.target===$('guide')){const r=$('guide').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('guide').close();}});
  for(const p of VehicleAnnex.profiles){const tr=make('tr'),visual=make('td'),distribution=make('td');visual.innerHTML=VehicleAnnex.diagram(p,true);distribution.innerHTML=p.fractions?VehicleAnnex.loadDistribution(VehicleAnnex.calculate(p.code,p.gvw).loads,p.fractions):'<span>Axle Distribution Not Supplied</span>';tr.append(visual,make('td',p.code),make('td',p.name),make('td',format(p.gvw)),distribution,make('td',p.fractions?format(VehicleAnnex.calculate(p.code,p.gvw).ef):'—'));$('annexCatalogue').append(tr);}
  add();update();
})();
