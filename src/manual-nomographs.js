/* Manual construction aids only: dragging never changes engineering inputs or kcorr. */
(() => {
 const NS='http://www.w3.org/2000/svg',charts=[
  {ids:['pavementCompositePath','foundationCompositePath'],width:1086,height:1046,bounds:[[115,1060],[17,1029]]},
  {ids:['pavementLossPath','foundationLossPath'],width:1241,height:1082,bounds:[[190,1120],[33,905]]}
 ];let enabled=false,drag=null;
 const node=(tag,attrs)=>{const el=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;};
 const clamp=(value,max)=>Math.max(0,Math.min(max,value));
 function paint(chart){for(const view of chart.views){view.group.replaceChildren();if(!enabled)continue;
  view.group.append(node('polyline',{points:chart.points.map(p=>p.join(',')).join(' '),class:'manual-nomograph-line'}));
  for(let i=0;i<chart.points.length-1;i++){const [a,b]=[chart.points[i],chart.points[i+1]],horizontal=Math.abs(a[1]-b[1])<1e-6;view.group.append(node('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'manual-nomograph-segment',tabindex:0,role:'button','aria-label':(horizontal?'Horizontal':'Vertical')+' construction line '+(i+1)+'. Drag '+(horizontal?'up or down':'left or right')+' or use arrow keys.','data-handle':i,style:'cursor:'+(horizontal?'ns-resize':'ew-resize')}));}
 }}
 function move(chart,index,dx,dy){const a=chart.points[Number(index)],b=chart.points[Number(index)+1],axis=Math.abs(a[1]-b[1])<1e-6?1:0,original=a[axis],limit=chart.bounds[axis][1],minimum=chart.bounds[axis][0],others=chart.points.map(p=>p[axis]).filter(v=>Math.abs(v-original)>1e-6),lower=Math.max(minimum,...others.filter(v=>v<original).map(v=>v+1)),upper=Math.min(limit,...others.filter(v=>v>original).map(v=>v-1)),next=Math.max(lower,Math.min(upper,clamp(original+(axis?dy:dx),limit)));
  // Shared coordinates connect adjacent segments and the repeated closing point.
  for(const p of chart.points)if(Math.abs(p[axis]-original)<1e-6)p[axis]=next;
  paint(chart);
 }
 function local(svg,event){return new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());}
 for(const chart of charts){chart.points=[];chart.seed=[];chart.views=chart.ids.map(id=>{const svg=document.getElementById(id).closest('svg'),group=node('g',{class:'manual-nomograph-layer'});const clipId=id+'ManualClip',defs=node('defs',{}),clip=node('clipPath',{id:clipId});clip.append(node('rect',{x:chart.bounds[0][0],y:chart.bounds[1][0],width:chart.bounds[0][1]-chart.bounds[0][0],height:chart.bounds[1][1]-chart.bounds[1][0]}));defs.append(clip);svg.append(defs);group.setAttribute('clip-path','url(#'+clipId+')');svg.append(group);svg.removeAttribute('aria-hidden');svg.setAttribute('role','group');svg.setAttribute('aria-label','Nomograph construction lines');
  svg.addEventListener('pointerdown',event=>{const handle=event.target.closest('[data-handle]');if(!enabled||!handle||event.button!==0)return;event.preventDefault();svg.setPointerCapture(event.pointerId);drag={chart,index:handle.dataset.handle,svg,point:local(svg,event),pointer:event.pointerId};});
  svg.addEventListener('pointermove',event=>{if(!drag||drag.svg!==svg||drag.pointer!==event.pointerId)return;const p=local(svg,event);move(chart,drag.index,p.x-drag.point.x,p.y-drag.point.y);drag.point=p;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,()=>{drag=null;});
  svg.addEventListener('keydown',event=>{const handle=event.target.closest('[data-handle]'),delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!enabled||!handle||!delta)return;event.preventDefault();const step=event.shiftKey?10:1;move(chart,handle.dataset.handle,delta[0]*step,delta[1]*step);group.querySelector('[data-handle="'+handle.dataset.handle+'"]').focus();});
  return {svg,group};});}
 function seedFromInputs(){
  const state=window.RigidFoundation.getState(),composite=NomographExtension.calculate({DSB:state.dsb,ESB:state.esb,MR:state.mr}),loss=LossSupportCalculation.calculate(composite.result,state.ls),overlay=composite.graphical_overlay;
  const points=overlay?overlay.path_point_ids.map(id=>[overlay.points[id].x_pixel,overlay.points[id].y_pixel]):[];
  charts[0].seed=points.filter(p=>p.every(Number.isFinite)).length===points.length?points:[];
  charts[1].seed=loss.result!==null?[[loss.point.x,905],[loss.point.x,loss.point.y],[190,loss.point.y]]:[];
  let constrained=false;for(const chart of charts){chart.seed=chart.seed.map(p=>p.map((value,axis)=>{const bounded=Math.max(chart.bounds[axis][0],Math.min(chart.bounds[axis][1],value));if(bounded!==value)constrained=true;return bounded;}));chart.points=chart.seed.map(p=>[...p]);}
  document.getElementById('manualNomographSeedStatus').textContent=charts.every(chart=>chart.seed.length)?(constrained?'Suggested layout is limited to the printed grid; inputs beyond the grid cannot be read directly.':'Suggested lines captured from foundation inputs. They remain fixed until dragged or reset.'):'Some inputs are missing or outside the chart range. A suggested layout is unavailable for the affected chart; correct inputs, then switch Auto on and off to capture a new layout.';
 }
 function setEnabled(value){if(enabled===value)return;enabled=value;drag=null;if(enabled)seedFromInputs();for(const chart of charts){for(const view of chart.views){view.svg.classList.toggle('manual-nomograph-active',enabled);const extension=view.svg.parentElement.previousElementSibling;if(extension?.classList.contains('nomograph-extension'))extension.hidden=enabled;}paint(chart);}document.getElementById('manualNomographControls').hidden=!enabled;}
 document.getElementById('resetManualNomographs').addEventListener('click',()=>{for(const chart of charts){chart.points=chart.seed.map(p=>[...p]);paint(chart);}});
 window.ManualNomographs={setEnabled};
})();
