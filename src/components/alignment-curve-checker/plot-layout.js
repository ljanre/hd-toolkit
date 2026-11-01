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
 function symbols(rect,anchors,segments){
  const placed=[],inside=(p,b)=>p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;
  const overlaps=(a,b)=>a.x<b.x+b.width+4&&a.x+a.width+4>b.x&&a.y<b.y+b.height+4&&a.y+a.height+4>b.y;
  const hits=(a,b,box)=>{let lo=0,hi=1;for(const [v,d,min,max] of [[a.x,b.x-a.x,box.x-4,box.x+box.width+4],[a.y,b.y-a.y,box.y-4,box.y+box.height+4]]){if(Math.abs(d)<1e-9){if(v<min||v>max)return false;}else{let t1=(min-v)/d,t2=(max-v)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return false;}}return true;};
  for(const anchor of anchors){
   if(!inside(anchor,rect))continue;
   let selected=null;
   for(const radius of [18,28,42,60,84,115,150]){
    for(const [dx,dy] of [[1,-1],[-1,-1],[1,1],[-1,1],[1,0],[-1,0],[0,-1],[0,1]]){
     const b={...anchor,x:anchor.x+dx*radius-10,y:anchor.y+dy*radius-8,width:20,height:16};
     if(!inside(b,rect)||!inside({x:b.x+b.width,y:b.y+b.height},rect)||placed.some(p=>overlaps(b,p))||segments.some(([a,c])=>hits(a,c,b)))continue;
     selected=b;break;
    }if(selected)break;
   }
   if(selected)placed.push({...selected,anchor});
  }return placed;
 }
 function rotate(point,origin,degrees){const radians=degrees*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians),x=point.x-origin.x,y=point.y-origin.y;return {x:x*c+y*s,y:x*s-y*c};}
 globalThis.AlignmentPlotLayout=Object.freeze({frame,place,symbols,rotate});
})();
