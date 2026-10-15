/* Manual construction aids only: dragging never changes engineering inputs or kcorr. */
(() => {
 const NS='http://www.w3.org/2000/svg',charts=[
  {ids:['pavementCompositePath','foundationCompositePath'],width:1086,height:1046,initial:[[220,200],[490,350],[650,580],[880,820]]},
  {ids:['pavementLossPath','foundationLossPath'],width:1241,height:1082,initial:[[650,905],[650,430],[190,430]]}
 ];let enabled=false,drag=null;
 const node=(tag,attrs)=>{const el=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;};
 const clamp=(value,max)=>Math.max(0,Math.min(max,value));
 function paint(chart){for(const view of chart.views){view.group.replaceChildren();if(!enabled)continue;
  const line=node('polyline',{points:chart.points.map(p=>p.join(',')).join(' '),class:'manual-nomograph-line','data-handle':'line'});view.group.append(line);
  chart.points.forEach(([x,y],i)=>{const circle=node('circle',{cx:x,cy:y,r:12,class:'manual-nomograph-handle',tabindex:0,role:'button','aria-label':'Manual construction point '+(i+1)+'. Drag or use arrow keys; Shift for larger steps.','data-handle':i});view.group.append(circle);});
 }}
 function move(chart,index,dx,dy){if(index==='line'){const minX=Math.min(...chart.points.map(p=>p[0])),maxX=Math.max(...chart.points.map(p=>p[0])),minY=Math.min(...chart.points.map(p=>p[1])),maxY=Math.max(...chart.points.map(p=>p[1]));dx=Math.max(-minX,Math.min(chart.width-maxX,dx));dy=Math.max(-minY,Math.min(chart.height-maxY,dy));chart.points=chart.points.map(([x,y])=>[x+dx,y+dy]);}else{const p=chart.points[Number(index)];p[0]=clamp(p[0]+dx,chart.width);p[1]=clamp(p[1]+dy,chart.height);}paint(chart);}
 function local(svg,event){return new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());}
 for(const chart of charts){chart.points=chart.initial.map(p=>[...p]);chart.views=chart.ids.map(id=>{const svg=document.getElementById(id).closest('svg'),group=node('g',{class:'manual-nomograph-layer'});svg.append(group);svg.removeAttribute('aria-hidden');svg.setAttribute('role','group');svg.setAttribute('aria-label','Nomograph construction lines');
  svg.addEventListener('pointerdown',event=>{const handle=event.target.closest('[data-handle]');if(!enabled||!handle||event.button!==0)return;event.preventDefault();svg.setPointerCapture(event.pointerId);drag={chart,index:handle.dataset.handle,svg,point:local(svg,event),pointer:event.pointerId};});
  svg.addEventListener('pointermove',event=>{if(!drag||drag.svg!==svg||drag.pointer!==event.pointerId)return;const p=local(svg,event);move(chart,drag.index,p.x-drag.point.x,p.y-drag.point.y);drag.point=p;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(type,()=>{drag=null;});
  svg.addEventListener('keydown',event=>{const handle=event.target.closest('[data-handle]'),delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!enabled||!handle||!delta)return;event.preventDefault();const step=event.shiftKey?10:1;move(chart,handle.dataset.handle,delta[0]*step,delta[1]*step);group.querySelector('[data-handle="'+handle.dataset.handle+'"]').focus();});
  return {svg,group};});}
 function setEnabled(value){if(enabled===value)return;enabled=value;drag=null;for(const chart of charts){for(const view of chart.views){view.svg.classList.toggle('manual-nomograph-active',enabled);const extension=view.svg.parentElement.previousElementSibling;if(extension?.classList.contains('nomograph-extension'))extension.hidden=enabled;}paint(chart);}document.getElementById('manualNomographControls').hidden=!enabled;}
 document.getElementById('resetManualNomographs').addEventListener('click',()=>{for(const chart of charts){chart.points=chart.initial.map(p=>[...p]);paint(chart);}});
 window.ManualNomographs={setEnabled};
})();
