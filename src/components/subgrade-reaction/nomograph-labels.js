/* SVG annotations share the exact coordinates used by the chart engines. */
(() => {
  const fmt=value=>value.toLocaleString('en-US',{maximumFractionDigits:2});
  function callouts(records,width,height){
    const boxes=[];
    return records.map(({x,y,lines,dx=18,dy=18})=>{
      const w=Math.min(width-24,Math.max(...lines.map(line=>line.length))*12+24),h=lines.length*28+16;
      const bx=Math.max(12,Math.min(width-w-12,x+dx));
      let by=Math.max(12,Math.min(height-h-12,y+dy));
      for(let attempt=0;attempt<records.length*2;attempt++){
        const overlap=boxes.find(b=>bx<b.x+b.w+8&&bx+w+8>b.x&&by<b.y+b.h+8&&by+h+8>b.y);
        if(!overlap)break;
        const below=overlap.y+overlap.h+12;by=below+h<height-12?below:Math.max(12,overlap.y-h-12);
      }
      boxes.push({x:bx,y:by,w,h});
      const targetX=Math.max(bx,Math.min(bx+w,x)),targetY=Math.max(by,Math.min(by+h,y));
      return '<g class="nomograph-callout"><path d="M'+x+' '+y+'L'+targetX+' '+targetY+'"/><circle cx="'+x+'" cy="'+y+'" r="6"/><rect x="'+bx+'" y="'+by+'" width="'+w+'" height="'+h+'" rx="6"/>'+lines.map((line,i)=>'<text x="'+(bx+12)+'" y="'+(by+30+i*28)+'">'+line+'</text>').join('')+'</g>';
    }).join('');
  }
  function composite(calculation){
    if(calculation.result===null)return '';
    const p=calculation.graphical_overlay.points,input=calculation.graphical_overlay.inputs;
    const record=(id,lines,dx,dy)=>({x:p[id].x_pixel,y:p[id].y_pixel,lines,dx,dy});
    return callouts([
      record('ESB_POINT',['ESB = '+fmt(input.ESB)+' psi','DSB = '+fmt(input.DSB*25.4)+' mm'],-270,-90),
      record('OUTPUT_POINT',['k∞ ≈ '+fmt(calculation.result)+' pci'],20,-60),
      record('TURNING_POINT',['Transfer Point'],20,20),
      record('MR_POINT',['MR = '+fmt(input.MR)+' psi'],-270,20)
    ],1086,1046);
  }
  function loss(correction){
    if(correction.result===null)return '';
    const {x,y}=correction.point;
    return callouts([
      {x,y:905,lines:['Effective k = '+fmt(correction.inputK)+' pci'],dx:-140,dy:24},
      {x,y,lines:['LS = '+fmt(correction.ls)],dx:22,dy:-58},
      {x:190,y,lines:['kcorr ≈ '+fmt(correction.result)+' pci'],dx:-174,dy:18}
    ],1241,1082);
  }
  globalThis.NomographLabels={composite,loss};
})();
