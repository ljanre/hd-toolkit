(() => {
'use strict';
const C=AlignmentChecker,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',KEY='hd-alignment-curve-checker-v1';
const inputs=['project','mode','startStation','startAz','startE','startN','minimumTangent','maximumRatio'],fields=C.columns;
const colors=['#197657','#2778ad','#c47b17','#8b50a6','#ba5451','#218c92'];
let model=null,lastReplacement=null,view=null,drag=null,origin={x:0,y:0};
const f=(n,d=3)=>Number.isFinite(n)?n.toFixed(d):'—';
const badge=status=>{const e=document.createElement('span');e.className='badge '+status.toLowerCase().replaceAll(' ','-');e.textContent=status;return e;};
function options(){return Object.fromEntries(inputs.map(id=>[id,$(id).value]));}
function rows(){return [...$('inputRows').children].map(tr=>Object.fromEntries(fields.map(field=>[field,tr.querySelector('[data-field="'+field+'"]').value])));}
function capture(){return {options:options(),rows:rows(),compare:$('compareInputs').checked,sight:$('showSight').checked};}
function restore(data){for(const id of inputs)if(data.options?.[id]!==undefined)$(id).value=data.options[id];$('compareInputs').checked=!!data.compare;$('showSight').checked=!!data.sight;renderRows(data.rows||[]);calculate();}
function renderRows(values){
 $('inputRows').replaceChildren();
 for(const value of values){
  const tr=document.createElement('tr');
  for(const field of fields){
   const td=document.createElement('td');
   if(['n','e'].includes(field))td.className='pi-only';
   if(field==='gap')td.className='seq-only';
   if(field.startsWith('given'))td.className='compare-only';
   if(['sightRadius','sightDistance','availableOffset'].includes(field))td.className='sight-only';
   const control=document.createElement(field==='turn'?'select':'input');
   if(field==='turn')for(const [text,val] of [['Choose…',''],['Left','L'],['Right','R'],['Auto · interior','AUTO']]){const opt=document.createElement('option');opt.value=val;opt.textContent=text;control.append(opt);}
   control.dataset.field=field;control.value=value[field]??'';control.setAttribute('aria-label',(value.id||'Curve')+' '+({n:'Northing',e:'Easting',r:'Radius',delta:'Intersection angle',piStation:'PI station',gap:'Tangent before',givenT:'Entered T',givenPC:'Entered PC',givenL:'Entered curve length',givenPT:'Entered PT',turn:'Direction',id:'PI number',sightRadius:'Sight path radius',sightDistance:'Required sight distance',availableOffset:'Available horizontal sight offset'}[field]));
   if(field!=='turn'){control.autocomplete='off';control.spellcheck=false;if(!['id','delta','piStation','givenPC','givenPT'].includes(field))control.inputMode='decimal';}
   control.addEventListener('input',calculate);td.append(control);tr.append(td);
  }
  const action=document.createElement('td'),button=document.createElement('button');button.textContent='Remove';button.setAttribute('aria-label','Remove '+value.id);button.addEventListener('click',()=>{lastReplacement=capture();tr.remove();$('undo').disabled=false;calculate();});action.append(button);tr.append(action);$('inputRows').append(tr);
 }
}
function addCell(row,value){const cell=document.createElement('td');cell.textContent=value;row.append(cell);return cell;}
function fillTable(id,records){const target=$(id);target.replaceChildren();for(const record of records){const row=document.createElement('tr');for(const value of record)addCell(row,value);target.append(row);}}
function errors(messages){
 const box=$('errorBox');box.replaceChildren();box.hidden=!messages.length;
 if(messages.length){const strong=document.createElement('strong');strong.textContent='Check the input schedule';box.append(strong);const ul=document.createElement('ul');for(const message of messages){const li=document.createElement('li');li.textContent=message;ul.append(li);}box.append(ul);}
}
function calculate(){
 document.body.dataset.mode=$('mode').value;document.body.classList.toggle('compare',$('compareInputs').checked);document.body.classList.toggle('show-sight',$('showSight').checked);$('sightHelp').hidden=!$('showSight').checked;
 const raw=rows();
 try{model=C.analyze(raw,options());}catch(error){model={errors:['Calculation could not be completed: '+error.message],curves:[],pairs:[],points:[],checks:[],summary:null};}
 errors(model.errors);
 $('complianceRows').replaceChildren();
 for(const item of C.complianceChecklist(model)){
   const tr=document.createElement('tr');tr.dataset.answer=item.answer;addCell(tr,item.label);
   for(const answer of ['YES','NO','N/A']){
     const td=addCell(tr,'');const indicator=document.createElement('span');
     indicator.className='compliance-indicator'+(item.answer===answer?' selected':'');indicator.textContent='●';
     indicator.setAttribute('role','img');indicator.setAttribute('aria-label',answer+(item.answer===answer?' selected':' not selected'));td.append(indicator);
   }
   const finding=addCell(tr,'');const answer=document.createElement('span');answer.className='checklist-answer';answer.textContent=item.answer==='NOT EVALUATED'?'Not evaluated':item.answer;finding.append(answer,document.createTextNode(item.reason));$('complianceRows').append(tr);
 }

 [...$('inputRows').children].forEach((tr,i)=>{const invalid=model.errors.some(message=>message.startsWith('Row '+(i+1)+':'));for(const control of tr.querySelectorAll('input,select'))invalid?control.setAttribute('aria-invalid','true'):control.removeAttribute('aria-invalid');});
 $('summary').replaceChildren();$('pairCards').replaceChildren();
 $('exportResults').disabled=!!model.errors.length;$('printReport').disabled=!!model.errors.length;
 if(model.summary){
  const s=model.summary,items=[['Screening status',s.failed?'Checks failed':s.warnings?'Review warnings':'Further evaluation required',C.formatStation(s.start)+' → '+C.formatStation(s.end)+' · '+(s.continuous?f(s.length,2)+' m':'Discontinuous chain — review geometry')],['Passed',s.passed,'Evaluated checks'],['Failed',s.failed,'Resolve deficiencies'],['Warnings',s.warnings,'Review arrangement'],['Not evaluated',s.notEvaluated,'Further design inputs']];
  items.forEach(([title,value,note],i)=>{const card=document.createElement('div');card.className='stat'+(!i?' title'+(s.failed?' failed':''):'');const label=document.createElement('small'),strong=document.createElement('strong'),small=document.createElement('small');label.textContent=title;strong.textContent=value;small.textContent=note;card.append(label,strong,small);$('summary').append(card);});
  for(const pair of model.pairs){
   const card=document.createElement('div');card.className='pair-card';const h=document.createElement('h3');h.textContent=pair.from+' → '+pair.to+' · '+pair.kind;
   const value=document.createElement('strong');value.textContent=f(pair.gap,2)+' m tangent';const p=document.createElement('p');p.textContent='Radius ratio '+f(pair.ratio,3)+'. '+pair.message;
   card.append(badge(pair.status),h,value,p);$('pairCards').append(card);
  }
  if(!model.pairs.length)$('pairCards').textContent='Add another curve to screen the intervening tangent and radius relationship.';
 }
 fillTable('geometryRows',model.curves.map(c=>[c.id,c.s===1?'R':'L',f(c.R),f(c.delta,6),f(c.T),f(c.L),f(c.chord),f(c.external),f(c.middle),C.formatStation(c.pcStation),C.formatStation(c.piStation),C.formatStation(c.ptStation),f(c.gap),f(c.startAz,6),f(c.endAz,6)]));
 fillTable('pointRows',model.points.map(p=>[p.id,p.station===null?'—':C.formatStation(p.station),f(p.e),f(p.n),p.type==='PI'?'Tangent intersection · not on circular arc':p.type==='Center'?'Circle center':p.type==='PC'?'Beginning of curve':'End of curve']));
 $('checkRows').replaceChildren();for(const check of model.checks){const tr=document.createElement('tr');const status=addCell(tr,'');status.append(badge(check.status));for(const value of [check.subject,check.actual,check.criterion,check.message])addCell(tr,value);$('checkRows').append(tr);}
 $('evaluationStamp').textContent='Evaluation: '+new Date().toLocaleString('en-PH',{timeZone:'Asia/Manila'})+' · Asia/Manila · preliminary circular-curve geometry screening.';
 try{localStorage.setItem(KEY,JSON.stringify(capture()));}catch{$('notice').textContent='Browser storage is unavailable. Export inputs to retain this schedule.';}
 fitPlot();
}
function svg(name,attributes={},text,parent=$('plot')){
 const node=document.createElementNS(NS,name);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;parent.append(node);return node;
}
const xy=p=>({x:p.x-origin.x,y:-(p.y-origin.y)});
function fitPlot(){
 if(!model?.curves.length){view=null;draw();return;}
 origin={...model.curves[0].pc};let all=model.curves.flatMap(c=>[...c.points,c.pi]);
 if($('centers').checked)all=all.concat(model.curves.map(c=>c.center));
 const pts=all.map(xy),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
 let minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const rect=$('plot').getBoundingClientRect(),ratio=rect.width/(rect.height||520),w=Math.max(maxX-minX,1),h=Math.max(maxY-minY,1);
 let width=Math.max(w,h*ratio)*1.25,height=width/ratio;
 view={x:(minX+maxX-width)/2,y:(minY+maxY-height)/2,width,height};draw();
}
function draw(){
 const plot=$('plot');plot.replaceChildren();svg('title',{},'Calculated horizontal alignment, equal scales and north up');
 if(!view||!model?.curves.length){plot.setAttribute('viewBox','0 0 1000 600');svg('text',{x:500,y:300,'text-anchor':'middle',fill:'#71877a','font-size':18},'Enter valid curve data to plot the alignment.');return;}
 plot.setAttribute('viewBox',[view.x,view.y,view.width,view.height].join(' '));
 const rect=plot.getBoundingClientRect(),scale=view.width/Math.max(rect.width,1),line=1.8*scale,font=11*scale;
 if($('grid').checked){
  const raw=view.width/8,power=10**Math.floor(Math.log10(raw)),step=[1,2,5,10].find(v=>v*power>=raw)*power;
  for(let x=Math.ceil(view.x/step)*step;x<=view.x+view.width;x+=step){svg('line',{x1:x,y1:view.y,x2:x,y2:view.y+view.height,stroke:'#dfe8e0','stroke-width':scale*.7});svg('text',{x:x+3*scale,y:view.y+view.height-5*scale,fill:'#809185','font-size':9*scale},f(x+origin.x,step<1?3:0));}
  for(let y=Math.ceil(view.y/step)*step;y<=view.y+view.height;y+=step){svg('line',{x1:view.x,y1:y,x2:view.x+view.width,y2:y,stroke:'#dfe8e0','stroke-width':scale*.7});svg('text',{x:view.x+4*scale,y:y-3*scale,fill:'#809185','font-size':9*scale},f(origin.y-y,step<1?3:0));}
 }
 const path=(points,attrs)=>svg('polyline',{points:points.map(p=>{const q=xy(p);return q.x+','+q.y;}).join(' '),fill:'none',...attrs});
 const label=(p,text,color,offset=0)=>{const q=xy(p);svg('text',{x:q.x+6*scale,y:q.y-(7+offset)*scale,fill:color,'font-size':font,'paint-order':'stroke',stroke:'#fafcf9','stroke-width':3*scale,'stroke-linejoin':'round'},text);};
 model.curves.forEach((c,i)=>{
  const color=colors[i%colors.length],prev=model.curves[i-1];
  if(prev){const pair=model.pairs[i-1],good=c.source.connectionValid&&pair?.kind!=='Overlap';path([prev.pt,c.pc],{stroke:good?'#83988a':'#c4483b','stroke-width':line,'stroke-dasharray':good?'none':[5*scale,4*scale].join(' ')});}
  if($('construction').checked)path([c.pc,c.pi,c.pt],{stroke:color,'stroke-width':scale,'stroke-dasharray':[5*scale,4*scale].join(' '),opacity:.5});
  if($('centers').checked){path([c.pc,c.center,c.pt],{stroke:color,'stroke-width':scale,opacity:.3});const center=xy(c.center);svg('circle',{cx:center.x,cy:center.y,r:3*scale,fill:'white',stroke:color,'stroke-width':scale});label(c.center,'O · R '+f(c.R,2),color);}
  path(c.points,{stroke:color,'stroke-width':3*scale,'stroke-linecap':'round'});
  const middle=C.pointOnArc(c.pc,c.startAz,c.s,c.R,c.L*.55),az=c.startAz+c.s*c.delta*.55;
  const tip={x:middle.x+Math.sin(az*Math.PI/180)*7*scale,y:middle.y+Math.cos(az*Math.PI/180)*7*scale},back=C.pointOnArc(c.pc,c.startAz,c.s,c.R,c.L*.55);
  const q=xy(tip),b=xy(back),dx=q.x-b.x,dy=q.y-b.y,len=Math.hypot(dx,dy)||1;
  svg('polygon',{points:[q.x+','+q.y,(b.x-dy/len*3*scale)+','+(b.y+dx/len*3*scale),(b.x+dy/len*3*scale)+','+(b.y-dx/len*3*scale)].join(' '),fill:color});
  for(const [name,p,station]of [['PC',c.pc,c.pcStation],['PT',c.pt,c.ptStation]]){
   const q=xy(p);svg('circle',{cx:q.x,cy:q.y,r:3*scale,fill:'white',stroke:color,'stroke-width':line});
   if($('labels').checked)label(p,c.id+' '+name+($('stations').checked?' '+C.formatStation(station):''),color,name==='PT'?12:0);
  }
  if($('labels').checked){label(c.pi,c.id+' · R '+f(c.R,1)+' · Δ '+f(c.delta,3)+'°',color,26);const q=xy(c.pi);svg('path',{d:'M '+q.x+' '+(q.y-4*scale)+' l '+4*scale+' '+8*scale+' h '+(-8*scale)+' Z',fill:color});}
 });
 svg('text',{x:view.x+view.width-20*scale,y:view.y+25*scale,'text-anchor':'end',fill:'#456c56','font-size':13*scale},'↑ N');
 $('plotScale').textContent='Equal E / N scales · '+f(scale*100,2)+' m per 100 screen px · E / N in metres';
}
function zoom(factor,point){
 if(!view)return;
 const cx=point?.x??view.x+view.width/2,cy=point?.y??view.y+view.height/2;
 if(view.width*factor<1e-5||view.width*factor>1e11)return;
 view={x:cx+(view.x-cx)*factor,y:cy+(view.y-cy)*factor,width:view.width*factor,height:view.height*factor};draw();
}
function screenPoint(event){const p=new DOMPoint(event.clientX,event.clientY);return p.matrixTransform($('plot').getScreenCTM().inverse());}
$('plot').addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY<0?.85:1.18,screenPoint(event));},{passive:false});
$('plot').addEventListener('pointerdown',event=>{if(!view)return;drag={point:screenPoint(event),view:{...view}};$('plot').setPointerCapture(event.pointerId);});
$('plot').addEventListener('pointermove',event=>{if(!drag)return;const point=screenPoint(event);view.x+=drag.point.x-point.x;view.y+=drag.point.y-point.y;draw();});
for(const type of ['pointerup','pointercancel'])$('plot').addEventListener(type,()=>{drag=null;});
$('plot').addEventListener('keydown',event=>{if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')fitPlot();else zoom(event.key==='-'?1.25:.8);}});
$('zoomIn').addEventListener('click',()=>zoom(.8));$('zoomOut').addEventListener('click',()=>zoom(1.25));$('fit').addEventListener('click',fitPlot);
for(const id of ['labels','stations','construction','grid'])$(id).addEventListener('change',draw);$('centers').addEventListener('change',fitPlot);
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(fitPlot,100);});
for(const id of inputs)$(id).addEventListener('input',calculate);$('compareInputs').addEventListener('change',calculate);$('showSight').addEventListener('change',calculate);
$('addRow').addEventListener('click',()=>{const old=rows();if(old.length>=200){$('notice').textContent='Maximum 200 rows.';return;}const ids=new Set(old.map(r=>r.id));let n=old.length+1;while(ids.has('PI-'+n))n++;old.push({id:'PI-'+n,turn:'',r:'',delta:''});renderRows(old);calculate();});
$('undo').addEventListener('click',()=>{if(!lastReplacement)return;const previous=lastReplacement;lastReplacement=capture();restore(previous);});
$('pasteOpen').addEventListener('click',()=>{$('pasteError').textContent='';$('pasteDialog').showModal();$('pasteText').focus();});
$('applyPaste').addEventListener('click',()=>{try{const imported=C.parseTable($('pasteText').value);lastReplacement=capture();$('undo').disabled=false;renderRows(imported);$('pasteDialog').close();calculate();$('notice').textContent='Imported '+imported.length+' rows. Review terminal directions and highlighted errors.';}catch(error){$('pasteError').textContent=error.message;}});
function sample(name){
 const base={project:'ILLUSTRATIVE EXAMPLE · not surveyed project data',mode:'sequential',startStation:'2+000',startE:'0',startN:'0',startAz:'0',minimumTangent:'30',maximumRatio:'1.5'};
 let data=[{id:'PI-1',r:'150',delta:'40',turn:'R',gap:'0'},{id:'PI-2',r:'200',delta:'35',turn:'L',gap:'30'}],compare=false;
 if(name==='reverse20')data[1].gap='20';
 if(name==='compound'||name==='compoundFail'){data[1]={id:'PI-2',r:name==='compound'?'225':'300',delta:'35',turn:'R',gap:'0'};}
 if(name==='broken')data[1]={id:'PI-2',r:'200',delta:'35',turn:'R',gap:'20'};
 if(name==='coordinate'){
  const source=[...data,{id:'PI-3',r:'180',delta:'25',turn:'R',gap:'45'}];
  const solved=C.analyze(source,{...base,startE:496200,startN:1790800,startAz:30});
  data=solved.curves.map(c=>({id:c.id,n:f(c.pi.y,6),e:f(c.pi.x,6),piStation:C.formatStation(c.piStation),delta:String(c.delta),r:String(c.R),turn:c.s===1?'R':'L',givenT:f(c.T,2),givenPC:C.formatStation(c.pcStation),givenL:f(c.L,2),givenPT:C.formatStation(c.ptStation)}));
  base.mode='pi';base.startAz='';compare=true;
 }
 return {options:base,rows:data,compare};
}
$('sample').addEventListener('change',()=>{if(!$('sample').value)return;lastReplacement=capture();$('undo').disabled=false;restore(sample($('sample').value));$('notice').textContent='Illustrative example loaded. Undo replacement restores the previous schedule.';$('sample').value='';});
let currentExportUrl;
function download(name,text){if(currentExportUrl)URL.revokeObjectURL(currentExportUrl);const blob=new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');currentExportUrl=url;$('saveCsv').href=url;$('saveCsv').download=name;$('exportTitle').textContent=name;$('exportText').value=text;$('exportDialog').showModal();}
$('exportInputs').addEventListener('click',()=>download('alignment-curve-inputs.csv',C.csv(['PI NO.','NORTHING','EASTING','PI STATION','I','R','TURN','TANGENT BEFORE','T','PC','Lc','PT','SIGHT PATH RADIUS','SIGHT DISTANCE','AVAILABLE OFFSET'],rows().map(r=>fields.map(field=>r[field])))));
$('exportResults').addEventListener('click',()=>{
 if(!model?.summary)return;
 const records=[['Project',$('project').value],['Mode',model.mode],['Screening tangent m',model.summary.minimumTangent],['Radius ratio limit',model.summary.maximumRatio],['Evaluation (PH)',new Date().toLocaleString('en-PH',{timeZone:'Asia/Manila'})],[],['COMPLIANCE CHECKLIST'],['Review item','Answer','Reason'],...C.complianceChecklist(model).map(c=>[c.label,c.answer,c.reason]),[],['CURVE ELEMENTS'],['PI','Turn','R (m)','Delta (degrees)','T (m)','Lc (m)','Long chord (m)','External (m)','Middle ordinate (m)','PC station (m)','PI tangent station (m)','PT station (m)','Gap before (m)','Start azimuth','End azimuth'],
 ...model.curves.map(c=>[c.id,c.s===1?'R':'L',c.R,c.delta,c.T,c.L,c.chord,c.external,c.middle,c.pcStation,c.piStation,c.ptStation,c.gap,c.startAz,c.endAz]),[],['POINTS'],['Point','Station (m)','Easting (m)','Northing (m)','Type'],...model.points.map(p=>[p.id,p.station??'',p.e,p.n,p.type]),[],['CHECKS'],['Status','Subject','Actual','Criterion','Finding'],...model.checks.map(c=>[c.status,c.subject,c.actual,c.criterion,c.message])];
 download('alignment-curve-results.csv',records.map(r=>C.csv(r,[])).join('\r\n'));
});
$('printReport').addEventListener('click',()=>{fitPlot();window.print();});
let saved;try{saved=JSON.parse(localStorage.getItem(KEY));}catch{}
if(saved?.rows?.length)restore(saved);else restore(sample('coordinate'));
})();