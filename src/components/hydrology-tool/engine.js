/* SI Rational Method; pure functions, no DOM or rounded intermediate values. */
(() => {
  const fail=message=>{throw new Error(message);};
  const number=(value,label,min=0,strict=false)=>{
    if(value==null||String(value).trim()===''||!Number.isFinite(Number(value)))fail('Enter '+label+'.');
    const n=Number(value);if(strict?n<=min:n<min)fail(label+' must be '+(strict?'greater than ':'at least ')+min+'.');return n;
  };
  function areaHa(value,unit){
    const factors={ha:1,m2:1/10000,km2:100};if(!Object.hasOwn(factors,unit))fail('Select a valid area unit.');
    return number(value,'catchment area')*factors[unit];
  }
  function catchment(rows,unit){
    if(!Array.isArray(rows)||!rows.length)fail('Add at least one contributing area.');
    const areas=rows.map((row,i)=>{
      if(String(row.area??'').trim()==='')return {...row,areaHa:0,ca:0,excluded:true};
      const a=areaHa(row.area,unit);if(a===0)return {...row,areaHa:0,ca:0,excluded:true};
      const c=number(row.c,'runoff coefficient C for area '+(i+1));if(c>1)fail('Runoff coefficient C cannot exceed 1.');
      return {...row,areaHa:a,c,ca:a*c,excluded:false};
    });
    const area=areas.reduce((s,r)=>s+r.areaHa,0),ca=areas.reduce((s,r)=>s+r.ca,0);
    if(!Number.isFinite(area)||!Number.isFinite(ca)||area<=0)fail('Enter a positive total contributing area.');
    return {area,ca,c:ca/area,areas};
  }
  function travelTime(rows,references){
    const active=rows.filter(row=>String(row.length??'').trim()!=='');
    if(!active.length)fail('Enter the segments along the principal flow path.');
    const segments=active.map((row,i)=>{
      const length=number(row.length,'length for flow segment '+(i+1),0,true);let velocity;
      if(row.method==='manual')velocity=number(row.velocity,'velocity for flow segment '+(i+1),0,true);
      else{
        const ref=references.find(r=>r.id===row.method);if(!ref)fail('Select a valid velocity method.');
        const slope=number(row.slope,'slope (%) for flow segment '+(i+1),0,true);
        if(slope>100)fail('Review flow-path slopes greater than 100%.');
        velocity=10*ref.k*Math.sqrt(slope/100);
      }
      return {...row,length,velocity,minutes:length/(60*velocity)};
    });
    const minutes=segments.reduce((sum,s)=>sum+s.minutes,0);
    if(!Number.isFinite(minutes)||minutes<=0)fail('Travel time must be finite and positive.');
    return {minutes,segments};
  }
  function curve(points,method){
    if(!['log','linear'].includes(method))fail('Select a valid rainfall interpolation method.');
    const data=points.filter(p=>String(p.duration??'').trim()!==''||String(p.intensity??'').trim()!=='').map(p=>({duration:number(p.duration,'RIDF duration (minutes)',0,true),intensity:number(p.intensity,'RIDF intensity (mm/h)',0,true)})).sort((a,b)=>a.duration-b.duration);
    if(!data.length)fail('Enter the selected return-period RIDF data.');
    for(let i=1;i<data.length;i++){
      if(data[i].duration===data[i-1].duration)fail('RIDF durations must be unique.');
      if(data[i].intensity>data[i-1].intensity)fail('RIDF intensity must not increase with duration; check the source data.');
    }
    return {data,method};
  }
  function interpolate(series,duration){
    const t=number(duration,'rainfall duration',0,true),points=series.data;
    const exact=points.find(p=>Math.abs(p.duration-t)<=1e-10*Math.max(1,t));
    if(exact)return {intensity:exact.intensity,duration:t,exact:true,lower:exact,upper:exact};
    const upper=points.find(p=>p.duration>t),lower=[...points].reverse().find(p=>p.duration<t);
    if(!lower||!upper)fail('Rainfall duration '+t.toFixed(3)+' min is outside the entered RIDF range. Add source data; extrapolation is not used.');
    const fraction=series.method==='log'?Math.log(t/lower.duration)/Math.log(upper.duration/lower.duration):(t-lower.duration)/(upper.duration-lower.duration);
    const intensity=series.method==='log'?Math.exp(Math.log(lower.intensity)+fraction*Math.log(upper.intensity/lower.intensity)):lower.intensity+fraction*(upper.intensity-lower.intensity);
    return {intensity,duration:t,exact:false,lower,upper,fraction};
  }
  function calculate(p,references){
    const basin=catchment(p.areas,p.unit);
    if(basin.area>=80)fail('FHWA HDS-2 §5.3.1 limits this Rational Method application to drainage areas smaller than 80 ha. Select a suitable hydrologic method for this catchment.');
    const period=number(p.period,'design return period (years)',1,true),rainPeriod=number(p.rainPeriod,'return period of the rainfall data (years)',1,true);
    if(period!==rainPeriod)fail('The rainfall-data return period must match the design return period.');
    const travel=p.tcMode==='segments'?travelTime(p.segments,references.velocities):null;
    if(!['manual','segments'].includes(p.tcMode))fail('Select a valid time-of-concentration method.');
    const tc=travel?travel.minutes:number(p.tc,'time of concentration (minutes)',0,true);
    const minimum=String(p.minimum??'').trim()===''?0:number(p.minimum,'approved minimum rainfall duration');
    const duration=Math.max(tc,minimum);let series=null,rain;
    if(p.rainMode==='idf'){series=curve(p.points,p.interpolation);rain=interpolate(series,duration);}
    else if(p.rainMode==='direct'){
      const intensity=number(p.intensity,'rainfall intensity (mm/h)',0,true),sourceDuration=number(p.sourceDuration,'duration of the entered rainfall intensity (minutes)',0,true);
      if(Math.abs(sourceDuration-duration)>1e-6*Math.max(1,duration))fail('The entered intensity duration must equal the adopted rainfall duration (max of Tc and any approved minimum).');
      rain={intensity,duration,exact:true};
    }else fail('Select a valid rainfall-input method.');
    const base=basin.ca*rain.intensity/360;let critical=null;
    if(p.critical){
      const shortArea=areaHa(p.shortArea,p.unit),shortC=number(p.shortC,'short-branch runoff coefficient'),shortTc=number(p.shortTc,'short-branch time of concentration',0,true);
      if(shortArea<=0||shortArea>=basin.area||shortC>1||shortTc>=tc)fail('For the two-branch check, use a positive short-branch area smaller than the total, C between 0 and 1, and a short-branch Tc smaller than the main Tc.');
      const shortCA=shortArea*shortC,longCA=basin.ca-shortCA,longArea=basin.area-shortArea;
      if(longCA<0||longCA>longArea+1e-10)fail('The short branch must be part of the combined catchment; the remaining long-branch C must lie between 0 and 1.');
      const shortDuration=Math.max(shortTc,minimum),shortRain=series?interpolate(series,shortDuration):{intensity:number(p.shortIntensity,'rainfall intensity for the short-branch duration',0,true),duration:shortDuration,exact:true};
      const effectiveCA=longCA*shortTc/tc+shortCA;
      critical={q:shortRain.intensity*effectiveCA/360,shortArea,shortC,shortTc,shortCA,longCA,longArea,longC:longCA/longArea,shortRain,effectiveCA};
    }
    const q=critical?Math.max(base,critical.q):base;
    if(!Number.isFinite(q))fail('The calculated discharge is not finite; check the inputs.');
    return {basin,period,tc,minimum,duration,travel,series,rain,base,critical,q,litres:q*1000,criticalControls:!!critical&&critical.q>base};
  }
  globalThis.Hydrology=Object.freeze({areaHa,catchment,travelTime,curve,interpolate,calculate});
})();
