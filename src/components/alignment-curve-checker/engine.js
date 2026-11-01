/* Simple circular-curve geometry; metric coordinates; azimuth clockwise from north. */
(() => {
'use strict';
const RAD=Math.PI/180,DEG=180/Math.PI;
const finite=n=>Number.isFinite(n);
function number(value,label='Value'){
 if(typeof value==='number'){if(!finite(value))throw Error(label+' must be finite.');return value;}
 const text=String(value??'').trim();
 if(text.includes(',')&&!/^[+-]?\d{1,3}(,\d{3})+(\.\d*)?$/.test(text))throw Error(label+' has invalid thousands separators.');
 if(!text || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.replace(/,/g,'')))throw Error(label+' must be a number.');
 const n=Number(text.replace(/,/g,''));if(!finite(n))throw Error(label+' must be finite.');return n;
}
function station(value){
 const text=String(value??'').trim(),m=/^(\d+)\+(\d+(?:\.\d+)?)$/.exec(text);
 if(m){if(Number(m[2])>=1000)throw Error('Station offset must be less than 1000.');const n=Number(m[1])*1000+Number(m[2]);if(!finite(n))throw Error('Station must be finite.');return n;}
 const n=number(value,'Station');if(n<0)throw Error('Stations must be nonnegative.');return n;
}
function formatStation(value){
 if(!finite(value))return '—';
 const rounded=Math.round(value*1000),sign=rounded<0?'-':'',absolute=Math.abs(rounded);
 return sign+Math.floor(absolute/1000000)+'+'+((absolute%1000000)/1000).toFixed(3).padStart(7,'0');
}
function angle(value){
 const text=String(value??'').trim();
 if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))return number(text,'Angle');
 const m=/^(\d+(?:\.\d+)?)\s*(?:°|d|:)\s*(\d+(?:\.\d+)?)\s*(?:['′m]|:)\s*(\d+(?:\.\d+)?)\s*(?:["″s])?$/i.exec(text);
 if(!m||+m[2]>=60||+m[3]>=60)throw Error('Use decimal degrees or D°M′S″, with minutes and seconds below 60.');
 return +m[1]+(+m[2])/60+(+m[3])/3600;
}
const norm=a=>((a%360)+360)%360;
const diff=(a,b)=>((a-b+540)%360)-180;
const unit=a=>({x:Math.sin(a*RAD),y:Math.cos(a*RAD)});
const add=(p,v,d)=>({x:p.x+v.x*d,y:p.y+v.y*d});
const distance=(p,q)=>Math.hypot(q.x-p.x,q.y-p.y);
const bearing=(p,q)=>norm(Math.atan2(q.x-p.x,q.y-p.y)*DEG);
function geometry(R,delta){
 R=number(R,'Radius');delta=angle(delta);
 if(R<=0||R>1e9)throw Error('Radius must be greater than zero and at most 1,000,000,000 m.');
 if(!(delta>0&&delta<180))throw Error('Intersection angle must be greater than 0° and less than 180° for a simple circular curve.');
 const d=delta*RAD,h=d/2;
 return {R,delta,L:R*d,T:R*Math.tan(h),chord:2*R*Math.sin(h),external:2*R*Math.sin(d/4)**2/Math.cos(h),middle:2*R*Math.sin(d/4)**2};
}
function pointOnArc(pc,a,s,R,u){
 const phi=u/R;
 return add(pc,unit(a+s*phi*DEG/2),2*R*Math.sin(phi/2));
}
function reconstruct(g,pc,a,s){
 const endAz=norm(a+s*g.delta),center=add(pc,unit(a+s*90),g.R),pt=pointOnArc(pc,a,s,g.R,g.L),pi=add(pc,unit(a),g.T);
 const count=Math.min(720,Math.max(12,Math.ceil(g.delta/1.5)));
 return {...g,pc,pt,pi,center,startAz:norm(a),endAz,s,points:Array.from({length:count+1},(_,i)=>pointOnArc(pc,a,s,g.R,g.L*i/count))};
}
function pairCheck(first,second,gap,criteria={minimumTangent:30,maximumRatio:1.5},tolerance=0.05){
 const ratio=Math.max(first.R,second.R)/Math.min(first.R,second.R);
 if(gap < -tolerance)return {kind:'Overlap',status:'FAIL',ratio,gap,actual:gap,limit:0,deficiency:-gap,message:'Curves overlap. Reduce tangent distances, change radii, or revise PI geometry.'};
 const same=first.s===second.s,zero=Math.abs(gap)<=tolerance;
 if(!same)return {kind:'Reverse',status:gap+1e-9>=criteria.minimumTangent?'PASS':'FAIL',ratio,gap,actual:gap,limit:criteria.minimumTangent,deficiency:Math.max(0,criteria.minimumTangent-gap),message:'Supplied Plan / Horizontal Alignment note: avoid abrupt reversal; where unavoidable, reverse tangent must be at least '+criteria.minimumTangent+' m. Verify superelevation transitions separately.'};
 if(zero)return {kind:Math.abs(first.R-second.R)<1e-9?'Same-radius connection':'Compound',status:ratio<=criteria.maximumRatio+1e-12?'PASS':'FAIL',ratio,gap,actual:ratio,limit:criteria.maximumRatio,deficiency:Math.max(0,ratio-criteria.maximumRatio),message:'Direct same-direction connection: compare larger/smaller radius. Equal radii form a continuous circular arc.'};
 return {kind:'Same-direction with tangent',status:gap<criteria.minimumTangent?'WARNING':'NOT EVALUATED',ratio,gap,actual:gap,limit:criteria.minimumTangent,deficiency:Math.max(0,criteria.minimumTangent-gap),message:gap<criteria.minimumTangent?'Short tangent / broken-back screening warning. Review appearance, transitions and driver expectancy.':'Short-tangent warning not triggered. This does not establish overall acceptability.'};
}
// FHWA-RD-02-045 Eq. 3.5.1: metric SSD, grade signed + uphill / - downhill.
function alignmentQualityChecklist(model){
 const valid=!!model?.summary&&!model.errors?.length,curves=model?.curves||[],pairs=model?.pairs||[];
 const entry=(label,status,evidence)=>({label,status,evidence});
 const result=[entry('Station chain and geometric continuity',valid?(model.summary.continuous?'PASS':'FAIL'):'NOT EVALUATED',valid?(model.summary.continuous?'Entered circular curves have a continuous station chain within the calculation tolerance.':'Resolve overlap or station-chain findings in Detailed checks.'):'Enter valid geometry.')];
 const radiusChecks=model?.radiusChecks||[],failed=radiusChecks.filter(r=>r.status==='FAIL'),missing=radiusChecks.filter(r=>r.status==='NOT EVALUATED');
 result.push(entry('DGCS limiting minimum radius',failed.length?'FAIL':!valid||!radiusChecks.length||missing.length?'NOT EVALUATED':'PASS',failed.length?failed.map(r=>r.id+': '+r.message).join(' '):missing.length?missing[0].message:radiusChecks.length?'All radii meet Table 3-12 limiting values for the selected V / emax; actual superelevation, road-class minimums and transitions remain separate checks.':'Select design speed and emax.'));
 result.push(entry('Actual superelevation and road-class compatibility','NOT EVALUATED','The limiting-radius lookup does not check actual crossfall / superelevation or any more restrictive road-class or project minimum. Verify these against DGCS Tables 3-1 and 3-13–3-16 as applicable.'));
 result.push(entry('Superelevation reversal and transition length',pairs.some(p=>p.kind==='Reverse')?'NOT EVALUATED':valid?'NOT APPLICABLE':'NOT EVALUATED',pairs.some(p=>p.kind==='Reverse')?'Reverse curves present. Check runoff and tangent runout lengths, lane rotation, crossfall reversal and any spiral lengths against the available tangent. Meeting the 30 m minimum is not automatic transition approval.':'No reverse connection in the entered schedule; individual curve transitions still require design.'));
 result.push(entry('Same-direction curve arrangement',!valid?'NOT EVALUATED':pairs.some(p=>p.kind==='Same-direction with tangent'&&p.gap<30)?'WARNING':pairs.some(p=>p.kind==='Same-direction with tangent')?'PASS':'NOT APPLICABLE','The supplied note defines broken-back / flat-back as a tangent shorter than 30 m between same-direction curves. Avoid this arrangement unless unusual topography or right-of-way constraints justify it. A length-screen pass does not confirm appearance or transition design.'));
 result.push(entry('Compound-curve justification',pairs.some(p=>p.kind==='Compound')?'NOT EVALUATED':valid?'NOT APPLICABLE':'NOT EVALUATED','Where compound curves are necessary, document terrain/right-of-way constraints and verify the flatter radius is no more than 1.5 times the sharper radius.'));
 result.push(entry('Sight distance and obstruction clearance','NOT EVALUATED','Requires speed, grade, sight-distance criterion and surveyed obstruction envelope; use the separate sight-offset tool and full sightline review.'));
 result.push(entry('Curve widening and vehicle tracking','NOT EVALUATED','Check design vehicle, swept path, lane widths and gradual widening transitions.'));
 result.push(entry('Horizontal / vertical alignment coordination','NOT EVALUATED','Requires vertical profile, terrain and survey orientation. Review hidden dips, sharp curves after long tangents, small-angle kinks and approach visibility.'));
 return result;
}

function stoppingSightDistance(speed,grade,reaction=2.5,deceleration=3.4){
 const V=number(speed,'Design speed'),G=number(grade,'Grade'),t=number(reaction,'Reaction time'),a=number(deceleration,'Deceleration');
 if(V<=0||t<=0||a<=0||Math.abs(G)>=100)throw Error('Speed, reaction time and deceleration must be positive; grade must be between -100% and 100%.');
 const effective=a/9.81+G/100;if(effective<=0)throw Error('Deceleration is insufficient for the entered downgrade.');
 const distance=.278*V*t+V*V/(254*effective);if(!finite(distance))throw Error('SSD exceeds the numerical range.');return distance;
}
function sightOffsetCheck(curve){
 const source=curve.source||{},result={id:curve.id,status:'NOT EVALUATED',required:null,available:null,margin:null,S:null,ssdSource:null};
 let S,radius,available;
 try{
  if(String(source.sightDistance??'').trim()!==''){S=number(source.sightDistance,'Adopted S');if(S<=0)throw Error('Adopted S must be positive.');result.ssdSource='Adopted S';}
  else {S=stoppingSightDistance(source.designSpeed,source.grade,source.reactionTime??2.5,source.deceleration??3.4);result.ssdSource='Speed / grade SSD';}
  result.S=S;
  radius=number(source.sightRadius,'Inside-lane path radius Rs');if(radius<=0)throw Error('Inside-lane path radius must be positive.');
 }catch(error){return {...result,message:error.message};}
 const pathLength=radius*curve.delta*RAD;
 if(S>pathLength+1e-10)return {...result,radius,pathLength,message:'S exceeds this circular lane-path arc (S > Rs × Δ). Full alignment sightline analysis required; HSO is not evaluated.'};
 const required=2*radius*Math.sin(S/(4*radius))**2;Object.assign(result,{radius,pathLength,required});
 try{available=number(source.availableOffset,'Available clear offset M');if(available<0)throw Error('Available clear offset must be nonnegative.');}catch(error){return {...result,message:error.message};}
 const margin=available-required;
 return {...result,available,margin,status:margin>=-1e-9?'PASS':'FAIL',message:result.ssdSource+' '+S.toFixed(3)+' m; required HSO '+required.toFixed(6)+' m; available '+available.toFixed(6)+' m; margin '+margin.toFixed(6)+' m. Constant inside-lane clearance assumed; verify obstacle/eye-height envelope and the adopted project sight-distance criterion.'};
}
function complianceChecklist(model){
 const labels=['Radius requirement of compound curves','Tangent length between PT and PC of reverse curves','Absence of broken-back / flat-back arrangement','Horizontal sight offset'];
 const item=(index,answer,reason)=>({id:['compound','reverse','brokenBack','sightOffset'][index],label:labels[index],answer,reason});
 if(!model?.summary || model.errors?.length)return (model?.scope==='alignment'?labels.slice(0,3):labels).map((_,i)=>item(i,'NOT EVALUATED','Enter valid curve geometry before evaluating this item.'));
 const pairs=model.pairs,unknown=pairs.filter(p=>p.kind==='Overlap'||p.status==='NOT EVALUATED'&&p.kind!=='Same-direction with tangent'),criteria=model.summary;
 function pairItem(index,kind,description){
  const applicable=pairs.filter(p=>p.kind===kind);
  const failed=applicable.filter(p=>p.status==='FAIL');
  if(failed.length)return item(index,'NO',failed.map(p=>p.from+' → '+p.to+': '+(kind==='Compound'?'radius ratio '+p.ratio.toFixed(4)+' > '+criteria.maximumRatio:'tangent '+p.gap.toFixed(4)+' m < '+criteria.minimumTangent+' m')).join('; '));
  if(unknown.length||!criteria.continuous)return item(index,'NOT EVALUATED','Resolve overlaps, station-chain errors or disconnected tangents before confirming this requirement.');
  if(!applicable.length)return item(index,'N/A','No '+description+' occurs in the entered schedule.');
  return item(index,'YES',applicable.length+' '+description+' checked against '+(kind==='Compound'?'larger/smaller radius ≤ '+criteria.maximumRatio:'intervening tangent ≥ '+criteria.minimumTangent+' m')+'.');
 }
 const broken=pairs.filter(p=>p.kind==='Same-direction with tangent'&&p.status==='WARNING');
 const brokenResult=broken.length?item(2,'NO',broken.map(p=>p.from+' → '+p.to+': same-direction tangent '+p.gap.toFixed(4)+' m is shorter than '+criteria.minimumTangent+' m.').join('; ')):unknown.length||!criteria.continuous?item(2,'NOT EVALUATED','Resolve geometric continuity and station-chain errors before confirming absence.'):!pairs.length?item(2,'N/A','At least two successive curves are needed for this arrangement check.'):item(2,'YES','No same-direction positive tangent shorter than '+criteria.minimumTangent+' m was found. This confirms only the selected short-tangent screen; appearance and transition design still need review.');
 if(model.scope==='alignment')return [pairItem(0,'Compound','compound-curve connection'),pairItem(1,'Reverse','reverse-curve connection'),brokenResult];
 const sight=model.sightOffsets||model.curves.map(sightOffsetCheck),bad=sight.filter(s=>s.status==='FAIL'),missing=sight.filter(s=>s.status==='NOT EVALUATED');
 let sightResult;
 if(bad.length)sightResult=item(3,'NO',bad.map(s=>s.id+': offset deficit '+(-s.margin).toFixed(6)+' m.').join('; ')+(missing.length?' Other curves still need evaluation.':''));
 else if(missing.length||!criteria.continuous)sightResult=item(3,'NOT EVALUATED',!criteria.continuous?'Resolve alignment continuity and stationing before confirming horizontal sight offset.':missing.map(s=>s.id+': '+s.message).join(' '));
 else sightResult=item(3,'YES','All '+sight.length+' curves meet HSO ≥ Rs[1 − cos(S/(2Rs))] for the supplied sight-distance and clear-offset inputs. The result is an envelope screen, not full sight-distance approval. Speed-based values use the entered grade, reaction time and deceleration; an adopted S overrides that calculation.');
 return [pairItem(0,'Compound','compound-curve connection'),pairItem(1,'Reverse','reverse-curve connection'),brokenResult,sightResult];
}

function analyze(inputRows,options={}){
 const mode=options.mode||'pi',tol=0.05,angularTol=0.01;
 const checks=[],errors=[],curves=[],pairs=[],points=[];
 const check=(status,subject,actual,criterion,message)=>checks.push({status,subject,actual,criterion,message});
 let startStation,startE,startN,startAz,minimumTangent,maximumRatio;
 try{
  startStation=station(options.startStation??0);startE=number(options.startE??0);startN=number(options.startN??0);
  startAz=options.startAz===''||options.startAz==null?null:angle(options.startAz);
  if(startAz!==null&&(startAz<0||startAz>=360))throw Error('Starting azimuth must be between 0° and less than 360°.');
  minimumTangent=number(options.minimumTangent??30);maximumRatio=number(options.maximumRatio??1.5);
  if(minimumTangent<0||maximumRatio<1)throw Error('Screening tangent must be nonnegative and radius ratio at least 1.');
  if(!['pi','sequential'].includes(mode))throw Error('Invalid reconstruction mode.');
 }catch(e){errors.push(e.message);}
 if(!Array.isArray(inputRows)||inputRows.length<1||inputRows.length>200)errors.push('Enter between 1 and 200 curves.');
 const rows=[];
 if(!errors.length)inputRows.forEach((source,i)=>{
  try{
   const row={...source,id:String(source.id||'PI-'+(i+1)).trim()};
   if(rows.some(r=>r.id===row.id))throw Error('PI numbers must be unique.');
   if(mode==='pi'){row.x=number(source.e,'Easting');row.y=number(source.n,'Northing');if(Math.abs(row.x)>1e9||Math.abs(row.y)>1e9)throw Error('Coordinate magnitude exceeds 1,000,000,000 m.');}
   row.R=number(source.r,'Radius');
   row.delta=String(source.delta??'').trim()===''?null:angle(source.delta);
   row.turn=String(source.turn||'').toUpperCase();
   if(!['L','R','AUTO'].includes(row.turn))throw Error('Choose L, R, or Auto for curve direction.');
   row.piStation=String(source.piStation??'').trim()===''?null:station(source.piStation);
   row.gap=String(source.gap??'').trim()===''?null:number(source.gap,'Tangent before');
   if(row.gap!==null&&row.gap<0)throw Error('Entered tangent before must not be negative.');
   for(const field of ['givenT','givenPC','givenL','givenPT'])row[field]=String(source[field]??'').trim()===''?null:field==='givenPC'||field==='givenPT'?station(source[field]):number(source[field],field);
   rows.push(row);
  }catch(e){errors.push('Row '+(i+1)+': '+e.message);}
 });
 if(!errors.length)rows.forEach((row,i)=>{
  try{
   const interior=mode==='pi'&&i>0&&i<rows.length-1;
   if(mode==='pi'&&i>0&&distance(rows[i-1],row)<=1e-8)throw Error('Consecutive PI coordinates coincide.');
   let inferred;
   if(interior){inferred=diff(bearing(row,rows[i+1]),bearing(rows[i-1],row));if(Math.abs(inferred)<1e-9)throw Error('Collinear PIs do not define a circular curve.');}
   if(row.turn==='AUTO'){if(!interior)throw Error('Terminal rows need an explicit L/R direction.');row.turn=inferred>0?'R':'L';}
   if(row.delta===null){if(!interior)throw Error('Terminal rows need an intersection angle.');row.delta=Math.abs(inferred);}
   row.g=geometry(row.R,row.delta);row.s=row.turn==='R'?1:-1;
   if(interior&&Math.abs(diff(row.s*row.delta,inferred))>angularTol)check('FAIL',row.id+' PI angle/direction',(row.s*row.delta).toFixed(6)+'° vs '+inferred.toFixed(6)+'°','Coordinate bearing change within '+angularTol+'°','Entered angle/direction conflicts with adjoining PI tangents. The plot uses entered values; pair screening will not conceal the mismatch.');
  }catch(e){errors.push('Row '+(i+1)+': '+e.message);}
 });
 if(errors.length)return {errors,curves:[],pairs:[],points:[],checks:[],summary:null};
 for(let i=0;i<rows.length;i++){
  const row=rows[i],prev=curves[i-1];let pc,a,gap=0,pcStation;
  if(mode==='pi'){
   if(i>0)a=bearing(rows[i-1],row);
   else if(startAz!==null)a=startAz;
   else if(rows.length>1)a=norm(bearing(row,rows[i+1])-row.s*row.g.delta);
   else {errors.push('A single PI needs a starting azimuth.');break;}
   pc=add(row,unit(a),-row.g.T);
   if(prev){
    const dx=pc.x-prev.pt.x,dy=pc.y-prev.pt.y,v=unit(prev.endAz);
    gap=dx*v.x+dy*v.y;
    const lateral=Math.abs(dx*v.y-dy*v.x),heading=Math.abs(diff(a,prev.endAz));
    row.connectionValid=lateral<=tol&&heading<=angularTol;
    check(row.connectionValid?'PASS':'FAIL',prev.id+' → '+row.id+' tangent continuity',lateral.toFixed(4)+' m offset; '+heading.toFixed(6)+'°','≤ '+tol+' m lateral, ≤ '+angularTol+'° heading',row.connectionValid?'Curve endpoints lie on a common tangent.':'Geometric discontinuity: revise PI coordinates, angle or direction before classifying the connection.');
   }
   pcStation=row.piStation===null?(prev?prev.ptStation+gap:startStation):row.piStation-row.g.T;
   if(prev)check(Math.abs(pcStation-prev.ptStation-gap)<=tol?'PASS':'FAIL',row.id+' station chain',(pcStation-prev.ptStation-gap).toFixed(4)+' m residual','± '+tol+' m','PC chainage minus previous PT must equal the geometric intervening tangent; no station equations are modeled.');
  }else{
   if(row.delta===null||row.turn==='AUTO'){errors.push(row.id+': Sequential curves need angle and direction.');break;}
   a=prev?prev.endAz:(startAz??0);
   pcStation=row.piStation!==null?row.piStation-row.g.T:prev?prev.ptStation+(row.gap??0):startStation;
   gap=prev?pcStation-prev.ptStation:0;
   pc=prev?add(prev.pt,unit(a),gap):{x:startE,y:startN};
   row.connectionValid=true;
   if(prev&&row.gap!==null&&row.piStation!==null)check(Math.abs(gap-row.gap)<=tol?'PASS':'FAIL',row.id+' entered tangent',gap.toFixed(4)+' m from PI station vs '+row.gap+' m entered','± '+tol+' m','PI station controls stationing when present; conflicting tangent entries are flagged.');
  }
  const c={...reconstruct(row.g,pc,a,row.s),id:row.id,source:row,pcStation,ptStation:pcStation+row.g.L,piStation:pcStation+row.g.T,gap};
  if(!(c.ptStation>c.pcStation))check('FAIL',row.id+' station precision','Non-increasing curve station','PT must exceed PC','Curve length is too small relative to station magnitude for reliable numerical stationing.');
  if(pcStation<0)check('FAIL',row.id+' station',formatStation(pcStation),'Nonnegative station','PI station minus tangent distance precedes zero station.');
  for(const [field,key,label] of [['givenT','T','T'],['givenPC','pcStation','PC'],['givenL','L','Lc'],['givenPT','ptStation','PT']]){
   if(row[field]!==null){const residual=row[field]-c[key];check(Math.abs(residual)<=tol?'PASS':'FAIL',row.id+' entered '+label,residual.toFixed(4)+' m residual','± '+tol+' m',label+' supplied '+row[field]+'; calculated '+c[key].toFixed(6)+'. Check transcription, rounding, units and curve type.');}
  }
  if(prev){
   let pair=pairCheck(prev,c,gap,{minimumTangent,maximumRatio},tol);
   if(mode==='pi'&&!row.connectionValid)pair={...pair,status:'NOT EVALUATED',message:'Adjacent curve tangents are not geometrically continuous. Resolve the continuity failure before using the pairing screen.'};
   pair={...pair,from:prev.id,to:c.id};pairs.push(pair);
   check(pair.status,prev.id+' → '+c.id+' '+pair.kind,Number(pair.actual).toFixed(4)+(pair.kind==='Compound'||pair.kind==='Same-radius connection'?' ratio':' m'),pair.kind==='Compound'||pair.kind==='Same-radius connection'?'Radius ratio ≤ '+maximumRatio:(options.scope==='alignment'&&pair.kind==='Reverse'?'Reverse tangent minimum ≥ '+minimumTangent:'Project tangent screen ≥ '+minimumTangent)+' m',pair.message+(options.scope==='alignment'&&pair.kind==='Reverse'?' Shortfall to minimum: '+pair.deficiency.toFixed(4)+' m.':' Deficiency: '+pair.deficiency.toFixed(4)+((pair.kind==='Compound'||pair.kind==='Same-radius connection')?' ratio units.':' m.')));
  }
  for(const [type,p,sta] of [['PC',c.pc,c.pcStation],['PI',c.pi,c.piStation],['PT',c.pt,c.ptStation],['Center',c.center,null]])points.push({id:c.id+' '+type,type,station:sta,e:p.x,n:p.y});
  curves.push(c);
 }
 if(errors.length)return {errors,curves:[],pairs:[],points:[],checks:[],summary:null};
 const sightOffsets=options.scope==='alignment'?[]:curves.map(sightOffsetCheck);
 for(const sight of sightOffsets)check(sight.status,sight.id+' horizontal sight offset',sight.required===null?'—':sight.required.toFixed(6)+' m required; '+(sight.available==null?'not entered':sight.available.toFixed(6))+' m available','Inside-lane offset ≥ Rs[1 − cos(S/(2Rs))], S ≤ Rs × Δ',sight.message);
 if(options.scope!=='alignment')for(const name of ['Minimum radius / design speed','Superelevation, runoff and transitions','Stopping sight distance / side friction','Curve widening'])check('NOT EVALUATED',name,'—','Applicable standard and project inputs required','Not determined by this geometry screen.');
 const count=status=>checks.filter(c=>c.status===status).length;
 const result={errors,curves,pairs,points,checks,mode,sightOffsets,scope:options.scope||'all',summary:{passed:count('PASS'),failed:count('FAIL'),warnings:count('WARNING'),notEvaluated:count('NOT EVALUATED'),total:checks.length,continuous:curves.every((c,i)=>!i||(c.source.connectionValid&&c.gap>=-tol))&&!checks.some(c=>c.status==='FAIL'&&(c.subject.includes('station chain')||c.subject.includes('station precision'))),length:curves.reduce((sum,c,i)=>sum+c.L+(i?c.gap:0),0),start:curves[0].pcStation,end:curves.at(-1).ptStation,minimumTangent,maximumRatio}};
 result.checklist=complianceChecklist(result);return result;
}
function parseDelimited(text){
 const separator=text.includes('\t')?'\t':',',records=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(!quoted&&field.length){field+=c;}else quoted=!quoted;}
  else if(c===separator&&!quoted){row.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))records.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw Error('Unclosed CSV quotation.');
 row.push(field);if(row.some(x=>x.trim()))records.push(row);
 return records;
}
const columns=['id','n','e','piStation','delta','r','turn','gap','givenT','givenPC','givenL','givenPT','sightRadius','sightDistance','availableOffset'];
function parseTable(text,layout='legacy'){
 const markdown=String(text).split(/\r?\n/).filter(line=>line.trim().startsWith('|'));
 const records=markdown.length>1?markdown.map(line=>line.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(cell=>cell.trim().replace(/\\\|/g,'|'))).filter(row=>!row.every(cell=>/^:?-+:?$/.test(cell))):parseDelimited(text);
 if(!records.length)throw Error('Paste at least one data row.');
 const aliases={vkmh:'designSpeed',gpercent:'grade',rsm:'sightRadius',adoptedsm:'sightDistance',mavailablem:'availableOffset',deg:'delta',rm:'r',designspeed:'designSpeed',v:'designSpeed',grade:'grade',g:'grade',reactiontime:'reactionTime',deceleration:'deceleration',adopteds:'sightDistance',availableclearoffset:'availableOffset',m:'availableOffset',pino:'id',pi:'id',id:'id',northing:'n',n:'n',easting:'e',e:'e',pistation:'piStation',pista:'piStation',station:'piStation',i:'delta',delta:'delta',intersectionangle:'delta',r:'r',radius:'r',turn:'turn',direction:'turn',tangentbefore:'gap',gap:'gap',t:'givenT',pc:'givenPC',lc:'givenL',l:'givenL',curvelength:'givenL',pt:'givenPT',sightradius:'sightRadius',sightpathradius:'sightRadius',rs:'sightRadius',sightdistance:'sightDistance',s:'sightDistance',availableoffset:'availableOffset',hsoavailable:'availableOffset'};
 const normalize=s=>s.toLowerCase().replace(/[^a-z]/g,'');
 const header=records[0].map(s=>s.trim()==='e'?null:aliases[normalize(s)]||null);
 const hasHeader=header.includes('id')&&header.includes('r');
 const names=hasHeader?header:layout==='alignment'?alignmentColumns:layout==='design'?designColumns:layout==='station'?stationColumns:columns;
 const result=(hasHeader?records.slice(1):records).map(fields=>{
  const row={turn:layout==='alignment'?'':'AUTO'};fields.forEach((v,i)=>{if(names[i])row[names[i]]=v.trim();});if(layout==='alignment'){const turn=String(row.turn||'').toUpperCase();row.turn=({LEFT:'L',RIGHT:'R',L:'L',R:'R'})[turn]??row.turn;}return row;
 });
 if(!result.length||result.length>200)throw Error('Import requires 1–200 data rows.');
 return result;
}
function csv(headers,records){
 const quote=v=>{let t=String(v??'');if(/^[=+@\t\r-]/.test(t)&&!/^[-+]?\d+(\.\d+)?$/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
 return [headers,...records].map(row=>row.map(quote).join(',')).join('\r\n');
}
const stationColumns=['id','piStation','delta','r','turn','gap','givenT','givenPC','givenL','givenPT','sightRadius','sightDistance','availableOffset'];
const designColumns=['id','piStation','delta','r','turn','designSpeed','grade','sightRadius','sightDistance','availableOffset'];
function stationSchedule(inputRows,options={}){
 const basis=options.stationBasis||'stations',errors=[];
 if(!['stations','spacing'].includes(basis))errors.push('Select PI stations or first PC + tangent spacing.');
 const rows=(Array.isArray(inputRows)?inputRows:[]).map((r,i)=>{
  if(!['L','R'].includes(String(r.turn||'').toUpperCase()))errors.push('Row '+(i+1)+': Choose Left or Right; direction cannot be inferred from stations.');
  if(String(r.delta??'').trim()==='')errors.push('Row '+(i+1)+': Enter the intersection angle.');
  if(basis==='stations'){
   if(String(r.piStation??'').trim()==='')errors.push('Row '+(i+1)+': Enter the PI station.');
   else try{if(station(r.piStation)-geometry(r.r,r.delta).T<0)errors.push('Row '+(i+1)+': PI station minus T places the PC before station zero.');}catch{}
  }else if(i>0&&String(r.gap??'').trim()==='')errors.push('Row '+(i+1)+': Enter the tangent from the previous PT to this PC (zero for a direct connection).');
  return {...r,reactionTime:r.reactionTime??options.reactionTime,deceleration:r.deceleration??options.deceleration,piStation:basis==='stations'?r.piStation:'',gap:basis==='spacing'?(i?r.gap:0):''};
 });
 const model=analyze(rows,{...options,mode:'sequential',startStation:basis==='stations'?0:options.startStation,startE:0,startN:0,startAz:0});
 if(errors.length)return {...model,errors:[...errors,...model.errors],curves:[],pairs:[],points:[],checks:[],sightOffsets:[],summary:null};
 return model;
}
// DGCS 2015 Table 3-12, pp.3-20–3-21: rounded limiting minimum radius (m).
// 70 km/h, emax=4% uses Table 3-13 p.3-26 (203 m), corroborating 203.1 calculated;
// Table 3-12's rounded cell prints 135 m inconsistently.
const radiusTable={
 4:{20:8,30:22,40:47,50:86,60:135,70:203,80:280,90:375,100:492},
 6:{15:4,20:8,30:21,40:43,50:79,60:123,70:184,80:252,90:336,100:437,110:560,120:756,130:951},
 8:{15:4,20:7,30:20,40:41,50:73,60:113,70:168,80:229,90:304,100:394,110:501,120:667,130:832},
 10:{15:4,20:7,30:19,40:38,50:68,60:105,70:154,80:210,90:277,100:358,110:454,120:597,130:739}
};
function minimumRadiusCheck(radius,options={}){
 const base={status:'NOT EVALUATED',minimum:null,speed:null,emax:null,shortfall:null};
 if(!String(options.radiusSpeed??'').trim()||!String(options.radiusEmax??'').trim())return {...base,message:'Select design speed V and maximum superelevation emax to check minimum radius.'};
 const speed=Number(options.radiusSpeed),emax=Number(options.radiusEmax),minimum=radiusTable[emax]?.[speed];
 if(minimum===undefined)return {...base,speed,emax,message:'No exact DGCS Table 3-12 row for this speed / emax combination. No interpolation or extrapolation is applied.'};
 if(!finite(Number(radius))||Number(radius)<=0)return {...base,speed,emax,message:'Enter a positive radius.'};
 const R=Number(radius),shortfall=Math.max(0,minimum-R),status=R+1e-9>=minimum?'PASS':'FAIL';
 return {status,minimum,speed,emax,shortfall,message:'DGCS Table 3-12 limiting minimum: '+minimum+' m at V = '+speed+' km/h, emax = '+emax+'%. '+(status==='FAIL'?'Radius is deficient by '+shortfall.toFixed(3)+' m.':'Meets the limiting minimum only; verify actual superelevation and applicable road-class/project criteria.')+(speed===70&&emax===4?' Table 3-13 confirms 203 m; inconsistent Table 3-12 rounded cell is not used.':'')};
}
const alignmentColumns=['id','piStation','delta','r','turn'];
function alignmentSchedule(rows,options={}){
 const model={...stationSchedule(rows.map(row=>Object.fromEntries(alignmentColumns.map(key=>[key,row[key]]))),{...options,scope:'alignment'}),scope:'alignment'};
 if('radiusSpeed' in options||'radiusEmax' in options){
  model.radiusChecks=model.curves.map(c=>({id:c.id,...minimumRadiusCheck(c.R,options)}));
  for(const [i,r] of model.radiusChecks.entries())model.checks.push({status:r.status,subject:r.id+' · Minimum curve radius',actual:model.curves[i].R+' m',criterion:r.minimum===null?'Select V / emax':'R ≥ '+r.minimum+' m',message:r.message});
  if(model.summary){model.summary={...model.summary};for(const r of model.radiusChecks){const key=r.status==='FAIL'?'failed':r.status==='PASS'?'passed':'notEvaluated';model.summary[key]++;model.summary.total++;}}
 }
 return model;
}
function alignmentPrompt(){
 return [
 'Prepare an input schedule for the HD Toolkit Alignment Checker from the curve schedule, drawing or image I provide next. Do not use sample or assumed project values.',
 '',
 'Return these outputs:',
 '1. A single fenced TSV code block (tab-separated, not a Markdown table) with exactly these five headers:',
 'PI NO.\tPI STATION\tI\tR\tTURN',
 'One row per curve in alignment order. PI NO. is the unique source curve identifier. PI STATION is the conventional tangent-intersection station, not a PC or PT station. I is the positive intersection angle in decimal degrees or D°M′S″; R is the circular radius in metres; TURN is L or R. Use stations such as 2+100.000 or numeric metres. Do not add units inside numeric cells.',
 '2. Below the code block, list missing or ambiguous fields by curve ID. Leave their TSV cells blank rather than guessing. If no source has been supplied, ask me to attach or paste it; do not fabricate a schedule.',
 '3. Provide a TURN audit table OUTSIDE the TSV: PI ID | evidence / segment assignment | incoming forward azimuth | outgoing forward azimuth | signed change | source angle / residual | TURN | uncertainty. Explain every inferred turn. Keep any coordinates and azimuth columns out of the import block.',
 '4. Return a separate Design Controls table with parameter, source value, unit, curve IDs / station range, source location and missing/conflicting information. Extract design speed V (km/h), road classification and terrain if provided. If speed varies, list each curve or range; do not average speeds or claim one shared speed covers the whole schedule.',
 '5. Set maximum superelevation emax = 8% as the toolkit default, explicitly identified as a default rather than a source value. If the source specifies a different governing emax, report the conflict and the source value for review. Actual per-curve superelevation e is NOT emax: never replace printed e values with 8%, and never treat the largest observed e as the approved maximum.',
 '6. Return a separate Source Details / Review table by PI, extracting available V, actual e (%), widening w (m), source T, Lc, PC and PT stations, and any spiral lengths / TS / SC / CS / ST stations. Keep source values distinct from calculated checks. Use Not provided for missing reference details; do not invent them. Keep this review table OUTSIDE the five-column TSV so it is not mistaken for supported import fields.',
 '7. State whether the data are sufficient to generate each circular curve and to check adjacent connections. At least two complete successive curves are needed for connection checks.',
 '',
 'Requirements:',
 '- Preserve identifiers, source values, order and precision. Resolve duplicates or conflicting readings explicitly. Do not infer left/right from station values or an unsigned angle.',
 'TURN determination (in increasing-station travel direction):',
 '- Prefer explicit source L/R only when clearly tied to the curve and travel direction; cross-check against available geometry and report conflicts rather than silently overriding them.',
 '- In staggered ELEMENTS OF CURVE schedules, AZIMUTH / DISTANCE cells between PI rows generally describe tangent segments between PIs, not the curve occupying the nearest text row. Identify the tangent ending at this PI (incoming) and the tangent leaving it (outgoing) using grid boundaries, PI order, coordinates and distances. Do not shift azimuths by one row just to make a result fit.',
 '- Use azimuths measured clockwise from north, both oriented in increasing-station travel. Verify whether printed bearings are forward or back azimuths. Convert each back azimuth by (A + 180) mod 360 before pairing; never compare one forward bearing with one unconverted back bearing. A uniform 180-degree conversion of BOTH bearings leaves the signed turn unchanged. Do not reverse PI order.',
 '- Convert DMS to decimal degrees. Compute d = ((Aout - Ain + 540) mod 360) - 180. For -180 < d < 0 use L; for 0 < d < 180 use R. A zero change is straight; exactly 180 degrees is ambiguous. Leave TURN blank for either rather than inventing a curve direction.',
 '- Cross-check abs(d) against the source intersection angle I. Report the angular residual and allow only differences explained by printed rounding (for example, whole-second azimuths versus a fractional-second angle). Preserve the source I; do not replace it with the rounded azimuth difference. If the residual exceeds the source precision or the pairing is uncertain, leave TURN blank and request clarification.',
 '- Coordinate fallback: use previous PI, current PI and next PI in increasing-station order. In Easting/Northing coordinates form u = current - previous and v = next - current; z = uE*vN - uN*vE. z > 0 means L, z < 0 means R. Compare with the source I. Do not swap Northing/Easting columns. A first or last PI requires an additional tangent endpoint, adjacent PI or a clearly assigned boundary azimuth; do not guess its turn.',
 '- If a plan image is used, follow increasing station and verify its orientation. Page-left/page-right, the sign of an unsigned angle, alternating curve assumptions, and station progression alone do not determine L/R.',
 '- If spiral lengths or TS/SC/CS/ST data indicate transition curves, flag that this tool reconstructs simple circular curves only. Do not treat a total spiral-plus-circular deflection as circular I or substitute TS/ST for PC/PT. Blank spiral entries alone do not supply turn direction.',
 '- If no reliable explicit direction, matched azimuth pair, or complete coordinate geometry is available, leave TURN blank and identify the exact missing evidence in the audit. Never default missing direction to Right, Left or Auto.',
 '- Required per curve: PI identifier, PI station, 0 < intersection angle < 180 degrees, positive radius and explicit L/R direction. Stations must be nonnegative. Flag unreadable or inconsistent entries.',
 '- For checking only, calculate T = R tan(I/2), Lc = pi R I/180, PC = PI station - T, PT = PC + Lc, and the intervening tangent = next PC - previous PT. Distinguish T from the PT-to-PC connecting tangent. Do not include derived columns in the five-column import block.',
 '- Flag PC before zero and overlapping curves. For reverse curves compare the PT-to-PC tangent with the 30 m minimum. For directly connected same-direction compound curves compare larger/smaller radius with 1.5. For same-direction curves with a positive tangent shorter than 30 m, flag a broken-back screening concern. The app treats gaps within 0.05 m of zero as direct connections.',
 '- For reverse curves flag less than 30 m as Fail and 30 m or more as passing the minimum tangent length only. For same-direction curves, a positive tangent shorter than 30 m is a broken-back warning requiring avoidance or documented exceptional justification. Transition design still requires separate verification; 1.5 is the compound-radius screen. These checks are not universal design approval. If inputs are incomplete, state Not evaluated rather than Pass. Keep sight-offset and georeferenced-position inputs out of the five-column table. Report source design speed V separately so I can select it in the shared radius-check control; never assume missing speed. The toolkit emax default is 8%, subject to governing project criteria. Where speeds vary, identify the separate runs needed: the current shared control applies one speed to all curves and does not import speed automatically.',
 '- In a short separate review after the import block, report errors, connection findings and information still required. The user will paste only the TSV block into Paste table. The generated app output should be curve geometry, PC/PI/PT stations, labelled PI markers, highlighted PT-to-PC tangents and the dynamic connection checklist.'
 ].join('\n');
}
function alignmentReadiness(rows,model){
 const names={id:'PI identifier',piStation:'PI station',delta:'intersection angle',r:'radius',turn:'L/R turn'};
 const missing=rows.flatMap((r,i)=>{const fields=alignmentColumns.filter(key=>!String(r[key]??'').trim());return fields.length?[(r.id||'Row '+(i+1))+': enter '+fields.map(key=>names[key]).join(', ')+'.']:[];});
 if(!rows.length)return 'Add at least one curve with PI station, intersection angle, radius and L/R turn.';
 if(missing.length)return 'Inputs needed — '+missing.join(' ');
 if(model?.errors?.length)return 'All required fields are entered, but invalid values must be corrected before plotting: '+model.errors.join(' ');
 if(!model?.summary)return 'Enter valid circular-curve geometry to complete the check.';
 if(rows.length===1)return 'Sufficient for this curve’s elements and PC/PI/PT stations. Add another complete curve to check connecting tangents and compound/reverse arrangements.';
 if(!model.summary.continuous)return 'Curve elements are available, but the station chain overlaps or is discontinuous. Resolve the marked connection before completing the arrangement checks.';
 return 'Inputs sufficient for '+rows.length+' curves and '+model.pairs.length+' connection check(s). '+(model.summary.failed||model.summary.warnings?'Review the flagged tangent or radius findings below.':model.summary.notEvaluated?'Some connection findings still require project review.':'All selected geometry screens have been evaluated.');
}
function alignmentChatTable(rows,model){
 const esc=value=>String(value??'').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
 const headers=['PI','PI station','Δ (deg)','R (m)','Turn','T (m)','Lc (m)','PC','PT','Tangent before (m)'];
 const records=[headers,headers.map(()=>'---'),...rows.map((r,i)=>{const c=model?.curves?.[i];return [r.id,r.piStation,r.delta,r.r,r.turn,c?.T??'',c?.L??'',c?formatStation(c.pcStation):'',c?formatStation(c.ptStation):'',c?.gap??''];})];
 const findings=model?.summary?complianceChecklist(model).map(c=>'- '+c.label+': '+c.answer+' — '+c.reason).join('\n'):'';
 return 'Alignment Check · simple circular curves · local schematic. Reverse tangents: minimum 30 m; same-direction tangent <30 m flags broken-back; verify transitions separately. Compound larger/smaller radius ≤ 1.5.\n\n'+records.map(row=>'| '+row.map(esc).join(' | ')+' |').join('\n')+(findings?'\n\n'+findings:'');
}
function chatTable(rows,model,options={}){
 const escape=value=>String(value??'').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
 const headers=['PI','PI station','Δ (deg)','R (m)','Turn','V (km/h)','G (%)','Rs (m)','Adopted S (m)','M available (m)','S used (m)','Required HSO (m)','HSO result'];
 const table=[headers,headers.map(()=>'---'),...rows.map((r,i)=>{const h=model?.sightOffsets?.[i];return [r.id,r.piStation,r.delta,r.r,r.turn,r.designSpeed,r.grade,r.sightRadius,r.sightDistance,r.availableOffset,h?.S??'',h?.required??'',h?.status??'NOT EVALUATED'];})];
 const assumptions='Reaction time: '+(options.reactionTime??2.5)+' s; deceleration: '+(options.deceleration??3.4)+' m/s². Grade is signed + uphill / − downhill. Rs is inside-lane path radius; M is measured from that path. Blank adopted S uses speed/grade SSD; entered adopted S overrides it. Local schematic; project screens: tangent ≥ 30 m and compound radius ratio ≤ 1.5.';
 const findings=(model?.summary?complianceChecklist(model):[]).map(c=>'- '+c.label+': '+c.answer+' — '+c.reason).join('\n');
 return assumptions+'\n\n'+table.map(row=>'| '+row.map(escape).join(' | ')+' |').join('\n')+(findings?'\n\n'+findings:'');
}
globalThis.AlignmentChecker={number,station,formatStation,angle,geometry,pointOnArc,reconstruct,analyze,stationSchedule,stationColumns,designColumns,alignmentColumns,alignmentSchedule,alignmentPrompt,alignmentReadiness,alignmentChatTable,stoppingSightDistance,chatTable,pairCheck,minimumRadiusCheck,alignmentQualityChecklist,sightOffsetCheck,complianceChecklist,parseTable,csv,bearing,distance,diff,columns};
})();
