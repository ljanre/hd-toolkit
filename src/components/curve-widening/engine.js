(() => {
 const presets={P:{width:2.13,wheelbase:3.35,front:.91,rear:1.52},'SU-9':{width:2.44,wheelbase:6.10,front:1.22,rear:1.83},'SU-12':{width:2.44,wheelbase:7.62,front:1.22,rear:3.20},'BUS-12':{width:2.59,wheelbase:7.70,front:1.93,rear:2.73},'CITY-BUS':{width:2.59,wheelbase:7.62,front:2.13,rear:2.44},'WB-19':{width:2.59,wheelbase:5.94,front:1.22,rear:0,articulated:true,hitch:0,trailerWheelbase:12.50,trailerFront:.76,trailerRear:1.37}};
 function calculate(v){
  const p={};for(const id of ['radius','laneWidth','clearance','width','wheelbase','front','rear','angle']){if(v[id]===''||v[id]==null)throw Error('Enter all vehicle and path dimensions.');p[id]=Number(v[id]);if(!Number.isFinite(p[id])||p[id]<0)throw Error('Dimensions must be finite and nonnegative.');}
  if(p.width<=0||p.wheelbase<=0||p.laneWidth<=0||p.radius<=p.wheelbase||p.angle<10||p.angle>180)throw Error('Front-axle path radius must exceed wheelbase; widths must be positive; angle must be 10–180°.');
  const rearRadius=Math.sqrt(p.radius*p.radius-p.wheelbase*p.wheelbase);if(rearRadius<=p.width/2)throw Error('The turn is too tight for this body width.');
  const tractor={radius:rearRadius,width:p.width,front:p.wheelbase+p.front,rear:p.rear,phase:0};
  const bodies=[tractor];let articulation=0;
  if(v.articulated){
   for(const id of ['hitch','trailerWheelbase','trailerFront','trailerRear']){p[id]=Number(v[id]);if(v[id]===''||v[id]==null||!Number.isFinite(p[id])||(id!=='hitch'&&p[id]<0))throw Error('Enter valid articulation / trailer dimensions.');}
   if(p.trailerWheelbase<=0)throw Error('Trailer wheelbase must be positive.');
   const hr=Math.hypot(rearRadius,p.hitch);if(hr<=p.trailerWheelbase)throw Error('Hitch radius is too small for the trailer wheelbase.');
   const tr=Math.sqrt(hr*hr-p.trailerWheelbase*p.trailerWheelbase);if(tr<=p.width/2)throw Error('Trailer body overlaps the turn centre.');
   articulation=Math.atan2(p.hitch,rearRadius)-Math.atan2(p.trailerWheelbase,tr);
   bodies.push({radius:tr,width:p.width,front:p.trailerWheelbase+p.trailerFront,rear:p.trailerRear,phase:articulation});
  }
  const inner=Math.min(...bodies.map(b=>b.radius-b.width/2)),outer=Math.max(...bodies.map(b=>Math.hypot(b.radius+b.width/2,Math.max(b.front,b.rear))));
  const inside=Math.max(0,p.radius-p.laneWidth/2-(inner-p.clearance)),outside=Math.max(0,outer+p.clearance-(p.radius+p.laneWidth/2));
  return {p,bodies,rearRadius,inner,outer,sweptWidth:outer-inner,offtracking:p.radius-Math.min(...bodies.map(b=>b.radius)),inside,outside,geometricExtra:inside+outside,articulation};
 }
 function standard(v){
  const t=globalThis.CurveWideningStandards,speed=t.speeds.indexOf(Number(v.speed)),width=t.widths.indexOf(Number(v.roadWidth)),row=t.widening[Number(v.roadRadius)],n=Number(v.lanes);
  if(![2,3,4].includes(n)||speed<0||width<0||!row||row[width*6+speed]==null)return null;
  let adjustment=0;if(v.vehicle!=='WB-19'){const index=t.adjustVehicles.indexOf(v.vehicle);if(index<0||!t.adjustments[Number(v.roadRadius)])return null;adjustment=t.adjustments[Number(v.roadRadius)][index];}
  const raw=Math.max(0,(row[width*6+speed]+adjustment)*n/2);return {base:row[width*6+speed],adjustment,raw,recommended:raw<.6?0:Math.round(raw*10)/10};
 }
 function corners(body,theta){const a=theta+body.phase,c=Math.cos(a),s=Math.sin(a);return [[-body.width/2,-body.rear],[body.width/2,-body.rear],[body.width/2,body.front],[-body.width/2,body.front]].map(([rad,tan])=>[(body.radius+rad)*c-tan*s,(body.radius+rad)*s+tan*c]);}
 globalThis.CurveGeometry=Object.freeze({presets,calculate,standard,corners});
})();
