(() => {
'use strict';
const C=AlignmentChecker,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',KEY='hd-alignment-check-v4';
const inputs=['radiusSpeed','radiusEmax'],fields=C.alignmentColumns;
const colors=['#197657','#2778ad','#c47b17','#8b50a6','#ba5451','#218c92'];
let model=null,view=null,drag=null,origin={x:0,y:0},plotFrame=null,drawingLayer=null;
const curveColor=(c,i)=>model?.radiusChecks?.[i]?.status==='FAIL'?'#c33129':colors[i%colors.length];
const f=(n,d=3)=>Number.isFinite(n)?n.toFixed(d):'—';
const badge=status=>{const e=document.createElement('span');e.className='badge '+status.toLowerCase().replaceAll(' ','-');e.textContent=status;return e;};
function options(){return {stationBasis:'stations',minimumTangent:30,maximumRatio:1.5,...Object.fromEntries(inputs.map(id=>[id,$(id).value]))};}
function rows(){return [...$('inputRows').children].map(tr=>Object.fromEntries(fields.map(field=>[field,tr.querySelector('[data-field="'+field+'"]').value])));}
function capture(){return {options:options(),rows:rows()};}
function restore(data){
 if(!data.options?.stationBasis||data.options.stationBasis==='spacing'){
  const legacy=data.options?.stationBasis?C.stationSchedule(data.rows||[],data.options):C.analyze(data.rows||[],data.options||{});
  data={...data,rows:(data.rows||[]).map((r,i)=>{const c=legacy.curves[i];return c?{...r,piStation:C.formatStation(c.piStation),delta:String(c.delta),turn:c.s===1?'R':'L'}:r;})};
 }
 for(const id of inputs)if(data.options?.[id]!==undefined)$(id).value=data.options[id];renderRows(data.rows||[]);calculate();
}
function renderRows(values){
 $('inputRows').replaceChildren();
 for(const [rowIndex,value] of values.entries()){
  const tr=document.createElement('tr');
  for(const field of fields){
   const td=document.createElement('td');

   const control=document.createElement(field==='turn'?'select':'input');
   if(field==='turn')for(const [text,val] of [['Choose…',''],['Left','L'],['Right','R']]){const opt=document.createElement('option');opt.value=val;opt.textContent=text;control.append(opt);}
   control.dataset.field=field;control.value=value[field]??'';control.setAttribute('aria-label',(value.id||'Curve')+' '+({r:'Radius',delta:'Intersection angle',piStation:'PI station',turn:'Direction',id:'PI number'}[field]));
   if(field!=='turn'){control.autocomplete='off';control.spellcheck=false;if(!['id','delta','piStation','givenPC','givenPT'].includes(field))control.inputMode='decimal';}
   if(['piStation','givenPC','givenPT'].includes(field))control.addEventListener('blur',()=>{try{if(control.value.trim())control.value=C.formatStation(C.station(control.value));}catch{}calculate();});
   control.title=({piStation:'Tangent PI station: PC = PI − T; PT = PC + Lc.',delta:'Intersection angle: decimal degrees or D°M′S″.',r:'Simple circular-curve radius, metres.',turn:'Travel in increasing station. Clockwise heading change = Right; counterclockwise = Left. The copy prompt explains staggered azimuth rows and back bearings.'}[field])||'';
   control.addEventListener('input',calculate);td.append(control);tr.append(td);
  }
  const action=document.createElement('td'),button=document.createElement('button');button.textContent='−';button.className='remove-curve';button.title='Remove Curve';button.disabled=values.length===1;button.setAttribute('aria-label','Remove '+value.id);button.addEventListener('click',()=>{tr.remove();renderRows(rows());calculate();});action.append(button);tr.append(action);$('inputRows').append(tr);
 }
 $('addRow').disabled=values.length>=200;
}
function addCell(row,value){const cell=document.createElement('td');cell.textContent=value;row.append(cell);return cell;}
function fillTable(id,records){const target=$(id);target.replaceChildren();for(const record of records){const row=document.createElement('tr');for(const value of record)addCell(row,value);target.append(row);}}
function errors(messages){
 const box=$('errorBox');box.replaceChildren();box.hidden=!messages.length;
 if(messages.length){const strong=document.createElement('strong');strong.textContent='Check the input schedule';box.append(strong);const ul=document.createElement('ul');for(const message of messages){const li=document.createElement('li');li.textContent=message;ul.append(li);}box.append(ul);}
}
function calculate(){
 const raw=rows();
 try{model=C.alignmentSchedule(raw,options());}catch(error){model={errors:['Calculation could not be completed: '+error.message],curves:[],pairs:[],points:[],checks:[],summary:null};}
 const radiusCriterion=C.minimumRadiusCheck(1e9,options());$('radiusBasis').textContent=radiusCriterion.minimum===null?radiusCriterion.message:'Limiting Rmin = '+radiusCriterion.minimum+' m · DGCS Table 3-12, pp. 3-20–3-21. Check actual superelevation and any higher road-class/project minimum separately.'+(radiusCriterion.speed===70&&radiusCriterion.emax===4?' Table 3-13 corroborates 203 m; the inconsistent Table 3-12 rounded cell is not used.':'');
 errors(model.errors);$('inputReadiness').textContent=C.alignmentReadiness(raw,model);
 const generated=!!model.summary&&!model.errors.length;for(const id of ['plotWorkspace','elementsPanel','stationsPanel','checksPanel','compliancePanel','qualityPanel'])$(id).hidden=!generated;
 $('qualityRows').replaceChildren();for(const item of generated?C.alignmentQualityChecklist(model):[]){const row=document.createElement('tr');addCell(row,item.label);addCell(row,item.status==='NOT APPLICABLE'?'Not Applicable':item.status==='NOT EVALUATED'?'Not evaluated':item.status).className=item.status==='WARNING'||item.status==='FAIL'?'quality-alert':'';addCell(row,item.evidence);$('qualityRows').append(row);}
 $('complianceRows').replaceChildren();
 for(const item of generated?C.complianceChecklist(model):[]){
   const tr=document.createElement('tr');tr.dataset.answer=item.answer;addCell(tr,item.label);
   for(const answer of ['YES','NO','N/A']){
     const td=addCell(tr,'');const indicator=document.createElement('span');
     indicator.className='compliance-indicator'+(item.answer===answer?' selected':'');indicator.textContent='●';
     indicator.setAttribute('role','img');indicator.setAttribute('aria-label',(answer==='N/A'?'Not Applicable':answer)+(item.answer===answer?' selected':' not selected'));td.append(indicator);
   }
   const finding=addCell(tr,'');const answer=document.createElement('span');answer.className='checklist-answer';answer.textContent=item.answer==='NOT EVALUATED'?'Not evaluated':item.answer==='N/A'?'Not Applicable':item.answer;finding.append(answer,document.createTextNode(item.reason));$('complianceRows').append(tr);
 }

 [...$('inputRows').children].forEach((tr,i)=>{const invalid=model.errors.some(message=>message.startsWith('Row '+(i+1)+':'));for(const control of tr.querySelectorAll('input,select'))invalid?control.setAttribute('aria-invalid','true'):control.removeAttribute('aria-invalid');const r=tr.querySelector('[data-field=r]'),check=model.radiusChecks?.[i];r.classList.toggle('radius-deficient',check?.status==='FAIL');if(check?.status==='FAIL'){r.setAttribute('aria-invalid','true');r.title=check.message;}else r.title=check?.message||'Simple circular-curve radius, metres.';});
 fillTable('geometryRows',model.curves.map(c=>[c.id,c.s===1?'R':'L',f(c.R),f(c.delta,6),f(c.T),f(c.L),f(c.chord),f(c.external),f(c.middle),C.formatStation(c.pcStation),C.formatStation(c.piStation),C.formatStation(c.ptStation),f(c.gap)]));
 [...$('geometryRows').children].forEach((tr,i)=>tr.children[2]?.classList.toggle('radius-deficient',model.radiusChecks?.[i]?.status==='FAIL'));
 fillTable('pointRows',model.points.filter(p=>p.type!=='Center').map(p=>[p.id,p.station===null?'—':C.formatStation(p.station),p.type==='PI'?'Tangent intersection · not on circular arc':p.type==='Center'?'Circle center':p.type==='PC'?'Beginning of curve':'End of curve']));
 $('checkRows').replaceChildren();for(const check of model.checks){const tr=document.createElement('tr');const status=addCell(tr,'');status.append(badge(check.status));for(const value of [check.subject,check.actual,check.criterion,check.message])addCell(tr,value);$('checkRows').append(tr);}

 try{localStorage.setItem(KEY,JSON.stringify(capture()));}catch{$('notice').textContent='Browser storage is unavailable. Copy the table to retain this schedule.';}
 fitPlot();
}
function svg(name,attributes={},text,parent=drawingLayer||$('plot')){
 const node=document.createElementNS(NS,name);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;parent.append(node);return node;
}
const xy=p=>({x:p.x-origin.x,y:-(p.y-origin.y)});
function fitPlot(){
 if(!model?.curves.length){view=null;draw();return;}
 origin={...model.curves[0].pc};let all=model.curves.flatMap(c=>[...c.points,c.pi]);
 if($('centers').checked)all=all.concat(model.curves.map(c=>c.center));
 const pts=all.map(xy),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
 let minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const rect=$('plot').getBoundingClientRect();plotFrame=AlignmentPlotLayout.frame(Math.max(rect.width,280),$('labels').checked?model.curves.length:0,$('checkedTangents').checked?model.pairs.length:0);
 $('plot').style.height=plotFrame.height+'px';
 const g=plotFrame.geometry,scale=Math.max((maxX-minX||1)/g.width,(maxY-minY||1)/g.height)*1.18;
 view={x:(minX+maxX)/2-(g.x+g.width/2)*scale,y:(minY+maxY)/2-(g.y+g.height/2)*scale,width:plotFrame.width*scale,height:plotFrame.height*scale};draw();
}
function draw(){
 const plot=$('plot');drawingLayer=null;plot.replaceChildren();svg('title',{},'Alignment with separate annotation rails and equal geometry scales');
 if(!view||!model?.curves.length){plot.setAttribute('viewBox','0 0 1000 600');svg('text',{x:500,y:300,'text-anchor':'middle',fill:'#71877a','font-size':18},'Enter valid curve data to plot the alignment.');return;}
 plot.setAttribute('viewBox',[view.x,view.y,view.width,view.height].join(' '));
 const scale=view.width/plotFrame.width,line=1.8*scale,g=plotFrame.geometry;
 const world=(x,y)=>({x:view.x+x*scale,y:view.y+y*scale});
 const geom={...world(g.x,g.y),width:g.width*scale,height:g.height*scale};
 const defs=svg('defs'),clip=svg('clipPath',{id:'alignmentGeometryClip'},undefined,defs);svg('rect',{...geom},undefined,clip);
 const gridLayer=svg('g',{'clip-path':'url(#alignmentGeometryClip)'}),leaders=svg('g',{class:'annotation-leaders'}),geometry=svg('g',{'clip-path':'url(#alignmentGeometryClip)',class:'alignment-geometry'}),labels=svg('g',{class:'annotation-labels'});
 svg('rect',{...geom,fill:'#fafcf9',stroke:'#dce6df','stroke-width':scale,rx:5*scale},undefined,gridLayer);
 drawingLayer=gridLayer;
 if($('grid').checked){
  const raw=geom.width/6,power=10**Math.floor(Math.log10(raw)),step=[1,2,5,10].find(v=>v*power>=raw)*power;
  for(let x=Math.ceil(geom.x/step)*step;x<=geom.x+geom.width;x+=step){svg('line',{x1:x,y1:geom.y,x2:x,y2:geom.y+geom.height,stroke:'#dfe8e0','stroke-width':scale*.7});svg('text',{x:x+3*scale,y:geom.y+geom.height-5*scale,fill:'#809185','font-size':9*scale},f(x+origin.x,step<1?3:0));}
  for(let y=Math.ceil(geom.y/step)*step;y<=geom.y+geom.height;y+=step){svg('line',{x1:geom.x,y1:y,x2:geom.x+geom.width,y2:y,stroke:'#dfe8e0','stroke-width':scale*.7});svg('text',{x:geom.x+4*scale,y:y-3*scale,fill:'#809185','font-size':9*scale},f(origin.y-y,step<1?3:0));}
 }
 drawingLayer=geometry;
 const path=(points,attrs)=>svg('polyline',{points:points.map(p=>{const q=xy(p);return q.x+','+q.y;}).join(' '),fill:'none',...attrs});
 const annotations=[];
 const annotate=(p,lines,color,kind,index)=>{const q=xy(p);annotations.push({p,lines,color,kind,index,anchorY:(q.y-view.y)/scale});};
 model.curves.forEach((c,i)=>{
  const color=curveColor(c,i),prev=model.curves[i-1];
  if(prev){
   const pair=model.pairs[i-1],tone=pair.status==='PASS'?'#18724c':['FAIL','WARNING'].includes(pair.status)?'#c33129':'#a66b00',checked=$('checkedTangents').checked;
   if(checked)path([prev.pt,c.pc],{class:'checked-tangent-halo',stroke:tone,'stroke-width':12*scale,opacity:.17});
   path([prev.pt,c.pc],{class:'checked-tangent','data-connection':prev.id+' → '+c.id,'data-status':pair.status,stroke:checked?tone:pair.status==='FAIL'?'#c33129':'#83988a','stroke-width':checked?4*scale:line,'stroke-dasharray':pair.kind==='Overlap'?[6*scale,4*scale].join(' '):'none'});
  }
  if($('construction').checked)path([c.pc,c.pi,c.pt],{stroke:color,'stroke-width':scale,'stroke-dasharray':[5*scale,4*scale].join(' '),opacity:.45});
  if($('centers').checked){path([c.pc,c.center,c.pt],{stroke:color,'stroke-width':scale,opacity:.3});const o=xy(c.center);svg('circle',{cx:o.x,cy:o.y,r:3*scale,fill:'white',stroke:color,'stroke-width':scale});}
  path(c.points,{class:'curve-centerline',stroke:color,'stroke-width':3*scale,'stroke-linecap':'round'});
  const middle=C.pointOnArc(c.pc,c.startAz,c.s,c.R,c.L*.55),az=c.startAz+c.s*c.delta*.55;
  const tip={x:middle.x+Math.sin(az*Math.PI/180)*7*scale,y:middle.y+Math.cos(az*Math.PI/180)*7*scale},q=xy(tip),b=xy(middle),dx=q.x-b.x,dy=q.y-b.y,len=Math.hypot(dx,dy)||1;
  svg('polygon',{points:[q.x+','+q.y,(b.x-dy/len*3*scale)+','+(b.y+dx/len*3*scale),(b.x+dy/len*3*scale)+','+(b.y-dx/len*3*scale)].join(' '),fill:color});
  for(const p of [c.pc,c.pt]){const q=xy(p);svg('circle',{cx:q.x,cy:q.y,r:3*scale,fill:'white',stroke:color,'stroke-width':line});}
  if($('labels').checked){
   const q=xy(c.pi);svg('path',{class:'pi-marker','data-pi':c.id,d:'M '+q.x+' '+(q.y-6*scale)+' l '+6*scale+' '+12*scale+' h '+(-12*scale)+' Z',fill:color,stroke:'#fff','stroke-width':scale});
   annotate(c.pi,$('stations').checked?[c.id+' · STA. '+C.formatStation(c.piStation),'PC STA. '+C.formatStation(c.pcStation),'PT STA. '+C.formatStation(c.ptStation),'R = '+f(c.R,1)+' m · Δ = '+f(c.delta,3)+'°']:[c.id+' · PI','R = '+f(c.R,1)+' m · Δ = '+f(c.delta,3)+'°'],color,'pi',i);
  }
 });
 if($('checkedTangents').checked)model.pairs.forEach((pair,i)=>{
  const a=model.curves[i],b=model.curves[i+1],mid={x:(a.pt.x+b.pc.x)/2,y:(a.pt.y+b.pc.y)/2},color=pair.status==='PASS'?'#18724c':['FAIL','WARNING'].includes(pair.status)?'#c33129':'#a66b00',direct=Math.abs(pair.gap)<=.05;
  const title='T'+String(i+1).padStart(2,'0')+' · '+pair.kind.toUpperCase();
  const detail=direct?'R/r = '+f(pair.ratio,3)+' · '+pair.status:'Lt = '+f(pair.gap,3)+' m · '+(pair.status==='NOT EVALUATED'?'REVIEW':pair.status);
  const lines=[title,'PT '+a.id+' · '+C.formatStation(a.ptStation),'PC '+b.id+' · '+C.formatStation(b.pcStation),detail];
  const q=xy(mid);if(direct)svg('circle',{class:'connection-marker',cx:q.x,cy:q.y,r:7*scale,fill:'white',stroke:color,'stroke-width':2*scale});annotate(mid,lines,color,'tangent',i);
 });
 // Symbol-only engineering tags remain visible independently of numeric detail boxes.
 const screen=p=>{const q=xy(p);return {x:(q.x-view.x)/scale,y:(q.y-view.y)/scale};};
 const symbolAnchors=[],segments=[];
 model.curves.forEach((c,i)=>{
  const color=curveColor(c,i);
  for(const [text,p] of [['PC',c.pc],['PT',c.pt],['PI',c.pi],['R',C.pointOnArc(c.pc,c.startAz,c.s,c.R,c.L*.55)]])symbolAnchors.push({...screen(p),text,color});
  for(let j=1;j<c.points.length;j++)segments.push([screen(c.points[j-1]),screen(c.points[j])]);
  if(i)segments.push([screen(model.curves[i-1].pt),screen(c.pc)]);
  if(!$('labels').checked){const q=xy(c.pi);svg('path',{class:'pi-marker','data-pi':c.id,d:'M '+q.x+' '+(q.y-4*scale)+' l '+4*scale+' '+8*scale+' h '+(-8*scale)+' Z',fill:color});}
 });
 const symbolLayer=svg('g',{class:'engineering-symbols','clip-path':'url(#alignmentGeometryClip)'},undefined,labels);
 for(const box of AlignmentPlotLayout.symbols(g,symbolAnchors,segments)){
  const p=world(box.anchor.x,box.anchor.y),q=world(box.x+box.width/2,box.y+box.height/2);
  svg('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:box.color,'stroke-width':.8*scale,opacity:.65},undefined,leaders);
  svg('text',{x:q.x,y:q.y+4*scale,'text-anchor':'middle',fill:box.color,'font-size':11*scale,class:'symbol-label'},box.text,symbolLayer);
 }
 const boxes=AlignmentPlotLayout.place(plotFrame,annotations);
 for(const kind of ['pi','tangent'])if(boxes.some(b=>b.kind===kind)){
  const rail=plotFrame[kind],q=world(rail.x,rail.y+12);svg('text',{x:q.x,y:q.y,fill:'#65766e','font-size':9*scale,'font-weight':700},kind==='pi'?'CURVE DATA / CHAINAGE':'TANGENT SCHEDULE',labels);
 }
 for(const box of boxes){
  const p=xy(box.p),q=world(box.x,box.y),w=box.width*scale,h=box.height*scale,mobile=plotFrame.width<760;
  const end=mobile?world(box.x+box.width/2,box.y):world(box.kind==='pi'?box.x+box.width:box.x,box.y+box.height/2);
  svg('line',{x1:p.x,y1:p.y,x2:end.x,y2:end.y,stroke:box.color,opacity:.4,'stroke-width':scale},undefined,leaders);
  const group=svg('g',{class:box.kind+'-callout'},undefined,labels);svg('title',{},box.lines.join(' · '),group);
  svg('rect',{x:q.x,y:q.y,width:w,height:h,rx:5*scale,fill:'#fff',stroke:box.color,'stroke-width':scale},undefined,group);
  const maxChars=Math.max(8,Math.floor((box.width-18)/6.1));box.lines.forEach((text,i)=>{text=String(text);const shown=text.length>maxChars?text.slice(0,maxChars-1)+'…':text;const textNode=svg('text',{x:q.x+8*scale,y:q.y+(18+15*i)*scale,fill:box.color,'font-size':(i===0?11:10.5)*scale,'font-weight':i===0?700:400},shown,group);if(textNode.getComputedTextLength()>w-16*scale){textNode.setAttribute('textLength',w-16*scale);textNode.setAttribute('lengthAdjust','spacingAndGlyphs');}});
 }
 drawingLayer=null;svg('text',{x:geom.x+geom.width-10*scale,y:geom.y+18*scale,'text-anchor':'end',fill:'#456c56','font-size':11*scale},'↑ Local Y');
 $('plotScale').textContent='Equal geometry scales · '+f(scale*100,2)+' m per 100 screen px';
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
for(const id of ['labels','stations','checkedTangents'])$(id).addEventListener('change',fitPlot);for(const id of ['construction','grid'])$(id).addEventListener('change',draw);$('centers').addEventListener('change',fitPlot);
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(fitPlot,100);});
for(const id of inputs)$(id).addEventListener('input',calculate);
$('addRow').addEventListener('click',()=>{const old=rows();if(old.length>=200){$('notice').textContent='Maximum 200 rows.';return;}const ids=new Set(old.map(r=>r.id));let n=old.length+1;while(ids.has('PI-'+n))n++;old.push({id:'PI-'+n,turn:'',r:'',delta:''});renderRows(old);calculate();$('inputRows').lastElementChild.querySelector('[data-field="piStation"]').focus();});
$('pasteOpen').addEventListener('click',()=>{$('pasteError').textContent='';$('pasteDialog').showModal();$('pasteText').focus();});
$('applyPaste').addEventListener('click',()=>{try{const imported=C.parseTable($('pasteText').value,'alignment');renderRows(imported);$('pasteDialog').close();calculate();$('notice').textContent='Imported '+imported.length+' rows. Coordinate columns are ignored. Review angles, L/R directions, stations and highlighted errors.';}catch(error){$('pasteError').textContent=error.message;}});
function sample(name){
 const base={project:'ILLUSTRATIVE EXAMPLE · not surveyed project data',stationBasis:'stations',startStation:'2+000',minimumTangent:'30',maximumRatio:'1.5'};
 let data=[{id:'PI-1',r:'150',delta:'40',turn:'R',gap:'0'},{id:'PI-2',r:'200',delta:'35',turn:'L',gap:'30'}];
 if(name==='reverse20')data[1].gap='20';
 if(name==='compound'||name==='compoundFail')data[1]={id:'PI-2',r:name==='compound'?'225':'300',delta:'35',turn:'R',gap:'0'};
 if(name==='broken')data[1]={id:'PI-2',r:'200',delta:'35',turn:'R',gap:'20'};
 const solved=C.analyze(data,{...base,mode:'sequential'});
 let previousPT=null;
 const stationRows=data.map((r,i)=>{const c=solved.curves[i],pc=previousPT===null?2000:previousPT+Number(r.gap);let pi=Number((pc+c.T).toFixed(3));if(previousPT!==null&&Number(r.gap)>=30&&pi-c.T-previousPT<Number(r.gap))pi+=.001;previousPT=pi-c.T+c.L;return {...r,piStation:C.formatStation(pi)};});
 return {options:base,rows:stationRows,compare:false};
}
$('sample').addEventListener('change',()=>{if(!$('sample').value)return;restore(sample($('sample').value));$('notice').textContent='';$('sample').value='';});
async function copyTable(){
 const text=C.alignmentPrompt();
 try{await navigator.clipboard.writeText(text);$('notice').textContent='Prompt copied. Paste it into your AI chat, then provide the source curve schedule.';}
 catch{$('copyText').value=text;$('copyDialog').showModal();$('copyText').focus();$('copyText').select();$('notice').textContent='Clipboard access unavailable. Copy the selected prompt from the dialog.';}
}
$('copyTable').addEventListener('click',copyTable);$('retryCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('copyText').value);$('copyDialog').close();$('notice').textContent='Table copied. Paste it into ChatGPT.';}catch{$('copyText').focus();$('copyText').select();}});
let saved;try{saved=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('hd-alignment-curve-checker-v3')||localStorage.getItem('hd-alignment-curve-checker-v2')||localStorage.getItem('hd-alignment-curve-checker-v1'));}catch{}
if(saved?.rows?.length)restore(saved);else restore(sample('reverse30'));
})();