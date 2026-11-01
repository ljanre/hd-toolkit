(() => {
 const $=id=>document.getElementById(id),C=AlignmentChecker,H=HSOTool,NS='http://www.w3.org/2000/svg',KEY='hd-hso-tool-v1';
 let results=[];
 const labels={id:'Curve ID',station:'Station reference',delta:'Curve angle',designSpeed:'Design speed',grade:'Grade',sightRadius:'Inside-lane path radius',sightDistance:'Adopted sight distance override',availableOffset:'Available clear offset'};
 const tips={delta:'Total circular-curve angle, decimal degrees or D°M′S″.',designSpeed:'Speed in km/h used when adopted S is blank.',grade:'Signed grade in the direction of travel. Initial 0 means level.',sightRadius:'Radius at the inside-lane path center, not necessarily the road alignment radius.',sightDistance:'Optional adopted stopping sight distance overrides the speed calculation.',availableOffset:'Minimum clear inward distance from the lane path to the obstruction.'};
 const values=()=>[...$('inputRows').children].map(tr=>Object.fromEntries(H.fields.map(f=>[f,tr.querySelector('[data-field="'+f+'"]').value])));
 const options=()=>({reactionTime:$('reactionTime').value,deceleration:$('deceleration').value});
 const format=n=>Number.isFinite(n)?n.toFixed(3):'—';
 function rows(data){$('inputRows').replaceChildren();for(const [i,row] of data.entries()){
  const tr=document.createElement('tr');for(const field of H.fields){const td=document.createElement('td'),input=document.createElement('input');input.dataset.field=field;input.value=row[field]??(field==='grade'?'0':'');input.setAttribute('aria-label',(row.id||'Curve-'+(i+1))+' '+labels[field]);input.title=tips[field]||'';if(!['id','station'].includes(field))input.inputMode='decimal';input.addEventListener('input',update);td.append(input);tr.append(td);}
  for(const key of ['S','required','margin','status']){const cell=document.createElement('td');cell.dataset.result=key;cell.className='auto-result';tr.append(cell);}
  const cell=document.createElement('td'),button=document.createElement('button');button.textContent='Remove';button.setAttribute('aria-label','Remove '+(row.id||'curve'));button.addEventListener('click',()=>{tr.remove();update();});cell.append(button);tr.append(cell);$('inputRows').append(tr);
 }update();}
 function update(){const data=values(),selected=$('selectedCurve').value;results=H.assess(data,options());$('selectedCurve').replaceChildren();
  results.forEach((r,i)=>{const o=document.createElement('option');o.value=i;o.textContent=r.id;$('selectedCurve').append(o);const tr=$('inputRows').children[i];for(const key of ['S','required','margin','status']){const cell=tr.querySelector('[data-result="'+key+'"]');cell.textContent=key==='status'?r.status:format(r[key]);cell.title=r.message;cell.classList.toggle('hso-fail',r.status==='FAIL');}});
  if(selected!==''&&Number(selected)<results.length)$('selectedCurve').value=selected;$('selectedCurve').disabled=!results.length;
  $('summary').textContent=results.filter(r=>r.status==='PASS').length+' passed · '+results.filter(r=>r.status==='FAIL').length+' failed · '+results.filter(r=>r.status==='NOT EVALUATED').length+' not evaluated';
  $('findings').replaceChildren();for(const r of results){const p=document.createElement('p');p.className='finding'+(r.status==='FAIL'?' fail':'');const strong=document.createElement('strong');strong.textContent=r.id+' · '+r.status;p.append(strong,document.createTextNode(r.message));$('findings').append(p);}
  try{localStorage.setItem(KEY,JSON.stringify({rows:data,options:options()}));}catch{$('notice').textContent='Storage unavailable. Copy the table to retain inputs.';}draw();
 }
 function draw(){const plot=$('envelope');plot.replaceChildren();const r=results[Number($('selectedCurve').value)||0];const svg=(tag,attrs={},text)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;plot.append(el);return el;};
  if(!r||!Number.isFinite(r.required)){svg('text',{x:360,y:190,'text-anchor':'middle',fill:'#65766e','font-size':15},r?'Enter valid inputs within the single-curve method range.':'Add a curve to assess horizontal sight offset.');return;}
  const half=r.delta*Math.PI/360,theta=r.S/(2*r.radius),extent=r.radius*Math.sin(half),height=r.radius*(1-Math.cos(half));
  const displayM=Number.isFinite(r.available)&&r.available<=r.radius?r.available:0;
  const scale=Math.min(560/(2*extent||1),230/Math.max(height,displayM,r.required,1)),ox=360,oy=70;
  const point=(angle,radius=r.radius)=>({x:ox+radius*Math.sin(angle)*scale,y:oy+(r.radius-radius*Math.cos(angle))*scale});
  const path=(radius,color,dash='')=>svg('polyline',{points:Array.from({length:101},(_,i)=>point(-half+2*half*i/100,radius)).map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:color,'stroke-width':3,'stroke-dasharray':dash});
  path(r.radius,'#197657');const a=point(-theta),b=point(theta);svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#2778ad','stroke-width':2});
  svg('line',{x1:ox,y1:oy,x2:ox,y2:oy+r.required*scale,stroke:'#2778ad','stroke-width':2});svg('text',{x:ox+9,y:oy+r.required*scale+20,fill:'#2778ad','font-size':12},'HSO '+format(r.required)+' m');
  if(Number.isFinite(r.available)&&r.available<=r.radius)path(r.radius-r.available,r.status==='FAIL'?'#b3342a':'#ba7c17','6 4');
  svg('text',{x:30,y:345,fill:'#197657','font-size':12},'Green: inside-lane path · Blue: sight chord and required offset');
  svg('text',{x:30,y:369,fill:'#65766e','font-size':12},Number.isFinite(r.available)?'Dashed: entered obstruction offset M = '+format(r.available)+' m'+(r.available>r.radius?' (outside diagram range)':''):'Available M not entered; required envelope only');
  svg('text',{x:30,y:30,fill:'#193d35','font-size':14},r.id+' · S = '+format(r.S)+' m · Rs = '+format(r.radius)+' m');
 }
 $('addRow').addEventListener('click',()=>{const data=values();if(data.length>=200){$('notice').textContent='Maximum 200 curves.';return;}let n=data.length+1;while(data.some(r=>r.id==='Curve-'+n))n++;data.push({id:'Curve-'+n,grade:'0'});rows(data);});
 for(const id of ['reactionTime','deceleration'])$(id).addEventListener('input',update);$('selectedCurve').addEventListener('change',draw);
 $('copyTable').addEventListener('click',async()=>{const text=H.table(values(),results,options());try{await navigator.clipboard.writeText(text);$('notice').textContent='HSO table copied. Paste it into ChatGPT.';}catch{$('copyText').value=text;$('copyDialog').showModal();$('copyText').focus();$('copyText').select();}});
 let saved;try{saved=JSON.parse(localStorage.getItem(KEY));if(!saved){const old=JSON.parse(localStorage.getItem('hd-alignment-curve-checker-v3')||'null');if(old?.rows?.length)saved={options:old.options,rows:old.rows.map(r=>({...r,station:r.piStation}))};}}catch{}
 if(saved?.options)for(const id of ['reactionTime','deceleration'])if(saved.options[id]!==undefined)$(id).value=saved.options[id];rows(saved?.rows||[{id:'Curve-1',grade:'0'}]);
})();
