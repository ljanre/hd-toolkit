/* Typical two-lane section. Metres; ground levels relative to finished centreline. */
(() => {
  const slopeRanges = {
    granular: [[0,5,1.5,2],[5,10,1.8,2.5]],
    poorSand: [[0,10,1.8,2.5]],
    siltySand: [[0,5,1.5,2]],
    clay: [[5,10,2,2.5]],
    softClay: [[0,5,2.5,3]],
    strongRock: [[0,10,.5,1],[10,15,.75,1.2]],
    weakRock: [[0,5,.75,1.2],[5,10,1,1.5]],
    residual: [[0,5,1,1.5],[5,10,1.5,2]]
  };
  function range(material,height){
    const rows=slopeRanges[material]||[];
    // Shared limits include both source bands; show their combined envelope for review.
    const matches=rows.filter(([lo,hi])=>height>=lo&&height<=hi);
    return matches.length?[Math.min(...matches.map(r=>r[2])),Math.max(...matches.map(r=>r[3]))]:null;
  }
  function build(p){
    const baseThickness=p.baseThickness==null||p.baseThickness===''?0:Number(p.baseThickness),subbaseThickness=p.subbaseThickness==null||p.subbaseThickness===''?0:Number(p.subbaseThickness);
    if(!Number.isFinite(baseThickness)||!Number.isFinite(subbaseThickness)||baseThickness<0||subbaseThickness<0)throw Error('Base and subbase thickness must be nonnegative millimetres.');
    const condition=p.condition??'crowned',direction=p.direction??'right',e=Number(p.superelevation??6);
    if(!['crowned','superelevated'].includes(condition)||!['left','right'].includes(direction)||!Number.isFinite(e)||e<0||e>12)throw Error('Select a valid section condition, direction and superelevation (0–12%).');
    const keys=['width','shoulder','crossfall','shoulderFall','thickness','leftGround','rightGround','cutSlope','fillSlope'];
    if(keys.some(k=>p[k]==null||p[k]===''||!Number.isFinite(Number(p[k]))))throw Error('Enter valid section dimensions and ground levels.');
    p=Object.fromEntries(keys.map(k=>[k,Number(p[k])]));
    if(p.width<=0||p.shoulder<0||p.crossfall<0||p.crossfall>12||p.shoulderFall<0||p.shoulderFall>12||p.thickness<=0||p.cutSlope<=0||p.fillSlope<=0)throw Error('Widths, thickness and side slopes must be positive; crossfalls must be 0–12%.');
    const half=p.width/2,edge=half+p.shoulder,t=(p.thickness+baseThickness+subbaseThickness)/1000;
    Object.assign(p,{condition,direction,superelevation:e,baseThickness,subbaseThickness,totalThickness:p.thickness+baseThickness+subbaseThickness});
    const signedRate=(direction==='right'?-1:1)*e/100;
    const surface=x=>condition==='superelevated'?(x===0?0:x*signedRate):-Math.min(Math.abs(x),half)*p.crossfall/100-Math.max(0,Math.abs(x)-half)*p.shoulderFall/100;
    const top=[-edge,-half,0,half,edge].map(x=>[x,surface(x)]);
    const pavementBottom=top.map(([x,y])=>[x,y-p.thickness/1000]);
    const baseBottom=top.map(([x,y])=>[x,y-(p.thickness+baseThickness)/1000]);
    const formation=top.map(([x,y])=>[x,y-t]);
    const gradient=(p.rightGround-p.leftGround)/(2*edge),centre=(p.rightGround+p.leftGround)/2;
    const ground=x=>centre+gradient*x;
    const warnings=[];
    function tie(direction){
      const x=direction*edge,y=surface(x)-t,diff=ground(x)-y,cut=diff>0,ratio=cut?p.cutSlope:p.fillSlope;
      const rise=cut?1/ratio:-1/ratio,denom=rise-direction*gradient;
      const distance= Math.abs(diff)<1e-9?0:diff/denom;
      if(!Number.isFinite(distance)||distance<0||distance>100){warnings.push((direction<0?'Left':'Right')+' slope does not meet the ground within 100 m. Revise ground levels or slope.');return null;}
      return {point:[x+direction*distance,ground(x+direction*distance)],cut,ratio,height:Math.abs(diff)};
    }
    const left=tie(-1),right=tie(1);
    const profile=[...(left?[left.point]:[]),...formation,...(right?[right.point]:[])];
    const regions=[];let cutArea=0,fillArea=0;
    for(let i=0;i<profile.length-1;i++){
      const a=profile[i],b=profile[i+1],da=a[1]-ground(a[0]),db=b[1]-ground(b[0]);
      const points=[a];
      if(da*db<0){const w=da/(da-db);points.push([a[0]+w*(b[0]-a[0]),a[1]+w*(b[1]-a[1])]);}
      points.push(b);
      for(let j=0;j<points.length-1;j++){
        const u=points[j],v=points[j+1],du=u[1]-ground(u[0]),dv=v[1]-ground(v[0]);
        const area=Math.abs((du+dv)*(v[0]-u[0])/2);
        if(area<1e-9)continue;
        const type=(du+dv)>0?'fill':'cut';
        regions.push({type,points:[u,v,[v[0],ground(v[0])],[u[0],ground(u[0])]],area});
        if(type==='cut')cutArea+=area;else fillArea+=area;
      }
    }
    return {p,half,edge,surface,top,pavementBottom,baseBottom,formation,left,right,profile,regions,cutArea,fillArea,ground,warnings,complete:!!left&&!!right};
  }
  globalThis.TypicalSection=Object.freeze({build,range});
})();
