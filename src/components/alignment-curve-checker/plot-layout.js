/* Screen-space annotation rails keep label boxes outside the equal-scale geometry. */
(() => {
 function frame(width,piCount,tangentCount){
  const mobile=width<760,gap=10;
  if(mobile){
   const railWidth=(width-36)/2,top=500,stack=Math.max(piCount*80,tangentCount*88),height=top+Math.max(stack+48,80);
   return {width,height,geometry:{x:16,y:20,width:width-32,height:450},pi:{x:12,y:top,width:railWidth,height:height-top-12},tangent:{x:24+railWidth,y:top,width:railWidth,height:height-top-12}};
  }
  const left=piCount?Math.min(215,width*.24):0,right=tangentCount?Math.min(255,width*.28):0,height=Math.max(560,piCount*80+72,tangentCount*88+72);
  return {width,height,geometry:{x:left+gap+8,y:24,width:width-left-right-2*gap-16,height:height-48},pi:{x:10,y:16,width:Math.max(0,left-14),height:height-32},tangent:{x:width-right+4,y:16,width:Math.max(0,right-14),height:height-32}};
 }
 function place(frame,items){
  const boxes=[];
  for(const kind of ['pi','tangent']){
   const rail=frame[kind],group=items.filter(i=>i.kind===kind).sort((a,b)=>a.anchorY-b.anchorY||a.index-b.index);
   let cursor=rail.y+28;
   for(const item of group){const height=item.lines.length*15+12,y=Math.max(cursor,Math.min(item.anchorY-height/2,rail.y+rail.height-height));const box={...item,x:rail.x,y,width:rail.width,height};boxes.push(box);cursor=y+height+8;}
   // Shift packed labels upward from the bottom while preserving their order and separation.
   const placed=boxes.filter(b=>b.kind===kind);let bottom=rail.y+rail.height;
   for(let i=placed.length-1;i>=0;i--){placed[i].y=Math.min(placed[i].y,bottom-placed[i].height);bottom=placed[i].y-8;}
  }
  return boxes;
 }
 globalThis.AlignmentPlotLayout=Object.freeze({frame,place});
})();
