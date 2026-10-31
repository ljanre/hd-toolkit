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
 if(!same)return {kind:'Reverse',status:gap+1e-9>=criteria.minimumTangent?'PASS':'FAIL',ratio,gap,actual:gap,limit:criteria.minimumTangent,deficiency:Math.max(0,criteria.minimumTangent-gap),message:'Project reverse-curve tangent screen; verify superelevation transitions separately.'};
 if(zero)return {kind:Math.abs(first.R-second.R)<1e-9?'Same-radius connection':'Compound',status:ratio<=criteria.maximumRatio+1e-12?'PASS':'FAIL',ratio,gap,actual:ratio,limit:criteria.maximumRatio,deficiency:Math.max(0,ratio-criteria.maximumRatio),message:'Direct same-direction connection: compare larger/smaller radius. Equal radii form a continuous circular arc.'};
 return {kind:'Same-direction with tangent',status:gap<criteria.minimumTangent?'WARNING':'NOT EVALUATED',ratio,gap,actual:gap,limit:criteria.minimumTangent,deficiency:Math.max(0,criteria.minimumTangent-gap),message:gap<criteria.minimumTangent?'Short tangent / broken-back screening warning. Review appearance, transitions and driver expectancy.':'Short-tangent warning not triggered. This does not establish overall acceptability.'};
}
function sightOffsetCheck(curve){
 const source=curve.source||{};
 const fields=['sightRadius','sightDistance','availableOffset'];
 const values=fields.map(key=>String(source[key]??'').trim());
 const result={id:curve.id,status:'NOT EVALUATED',required:null,available:null,margin:null};
 if(values.some(v=>v===''))return {...result,message:'Enter required sight distance S, inside-lane path radius Rs, and available clear offset for this curve.'};
 let radius,S,available;
 try{[radius,S,available]=values.map((v,i)=>number(v,fields[i]));}catch(error){return {...result,message:error.message};}
 if(radius<=0||S<=0||available<0)return {...result,message:'Sight-path radius and required distance must be positive; available offset must be nonnegative.'};
 const pathLength=radius*curve.delta*RAD;
 if(S>pathLength+1e-10)return {...result,pathLength,message:'Required sight distance extends beyond this circular curve (S > Rs × Δ). Use a full alignment sightline analysis; this single-curve formula is not applied.'};
 const required=2*radius*Math.sin(S/(4*radius))**2,margin=available-required;
 return {...result,radius,S,pathLength,required,available,margin,status:margin>=-1e-9?'PASS':'FAIL',message:'Required HSO '+required.toFixed(6)+' m; available '+available.toFixed(6)+' m; margin '+margin.toFixed(6)+' m. Assumes the entered minimum clear offset is maintained along the inside-lane sightline envelope. Required sight distance and obstacle clearance must be adopted/verified for the project.'};
}
function complianceChecklist(model){
 const labels=['Radius requirement of compound curves','Tangent length between PT and PC of reverse curves','Absence of broken-back / flat-back arrangement','Horizontal sight offset'];
 const item=(index,answer,reason)=>({id:['compound','reverse','brokenBack','sightOffset'][index],label:labels[index],answer,reason});
 if(!model?.summary || model.errors?.length)return labels.map((_,i)=>item(i,'NOT EVALUATED','Enter valid curve geometry before evaluating this item.'));
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
 const sight=model.sightOffsets||model.curves.map(sightOffsetCheck),bad=sight.filter(s=>s.status==='FAIL'),missing=sight.filter(s=>s.status==='NOT EVALUATED');
 let sightResult;
 if(bad.length)sightResult=item(3,'NO',bad.map(s=>s.id+': offset deficit '+(-s.margin).toFixed(6)+' m.').join('; ')+(missing.length?' Other curves still need evaluation.':''));
 else if(missing.length||!criteria.continuous)sightResult=item(3,'NOT EVALUATED',!criteria.continuous?'Resolve alignment continuity and stationing before confirming horizontal sight offset.':missing.map(s=>s.id+': '+s.message).join(' '));
 else sightResult=item(3,'YES','All '+sight.length+' curves meet HSO ≥ Rs[1 − cos(S/(2Rs))] for the supplied sight-distance and clear-offset inputs. This does not verify that the adopted sight distance meets a speed-based standard.');
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
   check(pair.status,prev.id+' → '+c.id+' '+pair.kind,Number(pair.actual).toFixed(4)+(pair.kind==='Compound'||pair.kind==='Same-radius connection'?' ratio':' m'),pair.kind==='Compound'||pair.kind==='Same-radius connection'?'Radius ratio ≤ '+maximumRatio:'Project tangent screen ≥ '+minimumTangent+' m',pair.message+' Deficiency: '+pair.deficiency.toFixed(4)+((pair.kind==='Compound'||pair.kind==='Same-radius connection')?' ratio units.':' m.'));
  }
  for(const [type,p,sta] of [['PC',c.pc,c.pcStation],['PI',c.pi,c.piStation],['PT',c.pt,c.ptStation],['Center',c.center,null]])points.push({id:c.id+' '+type,type,station:sta,e:p.x,n:p.y});
  curves.push(c);
 }
 if(errors.length)return {errors,curves:[],pairs:[],points:[],checks:[],summary:null};
 const sightOffsets=curves.map(sightOffsetCheck);
 for(const sight of sightOffsets)check(sight.status,sight.id+' horizontal sight offset',sight.required===null?'—':sight.required.toFixed(6)+' m required; '+sight.available.toFixed(6)+' m available','Inside-lane offset ≥ Rs[1 − cos(S/(2Rs))], S ≤ Rs × Δ',sight.message);
 for(const name of ['Minimum radius / design speed','Superelevation, runoff and transitions','Stopping sight distance / side friction','Curve widening'])check('NOT EVALUATED',name,'—','Applicable standard and project inputs required','Not determined by this geometry screen.');
 const count=status=>checks.filter(c=>c.status===status).length;
 const result={errors,curves,pairs,points,checks,mode,sightOffsets,summary:{passed:count('PASS'),failed:count('FAIL'),warnings:count('WARNING'),notEvaluated:count('NOT EVALUATED'),total:checks.length,continuous:curves.every((c,i)=>!i||(c.source.connectionValid&&c.gap>=-tol))&&!checks.some(c=>c.status==='FAIL'&&(c.subject.includes('station chain')||c.subject.includes('station precision'))),length:curves.reduce((sum,c,i)=>sum+c.L+(i?c.gap:0),0),start:curves[0].pcStation,end:curves.at(-1).ptStation,minimumTangent,maximumRatio}};
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
function parseTable(text){
 const records=parseDelimited(text);if(!records.length)throw Error('Paste at least one data row.');
 const aliases={pino:'id',pi:'id',id:'id',northing:'n',n:'n',easting:'e',e:'e',pistation:'piStation',pista:'piStation',station:'piStation',i:'delta',delta:'delta',intersectionangle:'delta',r:'r',radius:'r',turn:'turn',direction:'turn',tangentbefore:'gap',gap:'gap',t:'givenT',pc:'givenPC',lc:'givenL',l:'givenL',curvelength:'givenL',pt:'givenPT',sightradius:'sightRadius',sightpathradius:'sightRadius',rs:'sightRadius',sightdistance:'sightDistance',s:'sightDistance',availableoffset:'availableOffset',hsoavailable:'availableOffset'};
 const normalize=s=>s.toLowerCase().replace(/[^a-z]/g,'');
 const header=records[0].map(s=>s.trim()==='e'?null:aliases[normalize(s)]||null);
 const hasHeader=header.includes('id')&&header.includes('r');
 const names=hasHeader?header:columns;
 const result=(hasHeader?records.slice(1):records).map(fields=>{
  const row={turn:'AUTO'};fields.forEach((v,i)=>{if(names[i])row[names[i]]=v.trim();});return row;
 });
 if(!result.length||result.length>200)throw Error('Import requires 1–200 data rows.');
 return result;
}
function csv(headers,records){
 const quote=v=>{let t=String(v??'');if(/^[=+@\t\r-]/.test(t)&&!/^[-+]?\d+(\.\d+)?$/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
 return [headers,...records].map(row=>row.map(quote).join(',')).join('\r\n');
}
globalThis.AlignmentChecker={number,station,formatStation,angle,geometry,pointOnArc,reconstruct,analyze,pairCheck,sightOffsetCheck,complianceChecklist,parseTable,csv,bearing,distance,diff,columns};
})();