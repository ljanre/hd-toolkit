/* Project-selected spacing plan; independent of the statistical CBR sample check. */
(() => {
  function station(text){
    const raw=String(text).trim(),match=raw.match(/^(\d+)\s*\+\s*(\d{1,3}(?:\.\d+)?)$/);
    if(match){const metres=Number(match[2]);return metres<1000?Number(match[1])*1000+metres:NaN;}
    return /^\d+(?:\.\d+)?$/.test(raw)?Number(raw):NaN;
  }
  function chainage(value){
    const rounded=Math.round(value*1000)/1000,km=Math.floor(rounded/1000),metres=(rounded-km*1000).toFixed(3).replace(/\.?0+$/,'');
    const [whole,fraction]=metres.split('.');return km+'+'+whole.padStart(3,'0')+(fraction?'.'+fraction:'');
  }
  function calculate(start,end,interval){
    if(![start,end,interval].every(Number.isFinite)||start<0||end<=start||interval<=0)throw new Error('Enter a positive road length and interval; end station must follow start station.');
    const length=end-start,ratio=length/interval,nearest=Math.round(ratio),segments=Math.max(1,Math.abs(ratio-nearest)<Number.EPSILON*8*Math.max(1,ratio)?nearest:Math.ceil(ratio)),count=segments+1;
    if(!Number.isSafeInteger(count)||count<2)throw new Error('The proposed interval produces too many test pits. Increase the interval.');
    return {start,end,length,interval,count,interior:count-2,lastInterval:length-(count-2)*interval,at:i=>i===count-1?end:start+i*interval};
  }
  globalThis.CBRTestPitPlan={station,chainage,calculate};
  if(typeof document==='undefined')return;
  const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:3});
  let stationMode=false,activePlan=null;
  function read(){const start=stationMode?station($('pitStart').value):0,end=stationMode?station($('pitEnd').value):Number($('pitLength').value);return calculate(start,end,Number($('pitInterval').value));}
  function diagram(plan){
    const x=value=>55+(value-plan.start)/plan.length*650;
    const tests=window.CBRWorksheet?.getTests()||Array.from({length:Math.min(plan.count,1000)},(_,i)=>({tp:i+1,station:chainage(plan.at(i)),included:true}));
    const valid=tests.map(test=>({...test,metres:station(test.station)})).filter(test=>Number.isFinite(test.metres)&&test.metres>=plan.start&&test.metres<=plan.end).sort((a,b)=>a.metres-b.metres);
    const display=valid.length<=80?valid:valid.filter((test,i)=>i===0||i===valid.length-1||i%Math.ceil(valid.length/40)===0),labelEvery=Math.max(1,Math.ceil((display.length-1)/9));
    const marks=display.map((test,i)=>{const xx=x(test.metres),endpoint=test.metres===plan.start||test.metres===plan.end,label=i===0||i===display.length-1||i%labelEvery===0,color=test.included?'#155f58':'#a94442';return '<line x1="'+xx+'" y1="58" x2="'+xx+'" y2="119" stroke="#647b85"/><circle cx="'+xx+'" cy="88" r="'+(endpoint?7:5)+'" fill="'+(test.included&&endpoint?'#155f58':'white')+'" stroke="'+color+'" stroke-width="2"/>'+(!test.included?'<path d="M'+(xx-5)+' 83l10 10m-10 0l10-10" stroke="'+color+'" stroke-width="2"/>':'')+(label?'<text x="'+xx+'" y="48">TP '+String(test.tp).padStart(2,'0')+(test.included?'':' (off)')+'</text><text x="'+xx+'" y="139">'+chainage(test.metres)+'</text>':'');}).join('');
    let dims='';if(valid.length<=11)for(let i=1;i<valid.length;i++){const a=x(valid[i-1].metres),b=x(valid[i].metres);dims+='<path d="M'+a+' 151V177M'+b+' 151V177M'+a+' 169H'+b+'" stroke="#708693" fill="none"/><text x="'+((a+b)/2)+'" y="163">'+fmt(valid[i].metres-valid[i-1].metres)+' m</text>';}
    return '<svg viewBox="0 0 760 210" role="img" aria-label="Test-pit plan with start and end pits and interior interval stations"><style>text{font:11px Segoe UI,Arial;fill:#294b59;text-anchor:middle}</style><text x="380" y="18" style="font-size:10px;letter-spacing:1px">TEST-PIT STATIONING PLAN · SCHEMATIC</text><rect x="55" y="65" width="650" height="46" fill="#eef4f6" stroke="#637985"/><path d="M55 88H705" stroke="#8b9ca5" stroke-dasharray="10 6"/>'+marks+dims+'<text x="380" y="199">L = '+fmt(plan.length)+' m · Interval = '+fmt(plan.interval)+' m · '+valid.filter(t=>t.included).length+' included / '+valid.length+' located tests</text></svg>';
  }
  function update(){
    $('pitLengthField').hidden=stationMode;$('pitStationFields').hidden=!stationMode;
    for(const id of ['pitCount','pitRoadLength','pitInterior'])$(id).textContent='—';
    $('pitStations').replaceChildren();$('pitPlanStatus').classList.remove('invalid');
    try{
      const pending=stationMode?(!$('pitStart').value.trim()||!$('pitEnd').value.trim()):!$('pitLength').value.trim();
      if(pending){activePlan=null;$('pitPlanStatus').textContent='Enter the road length or station limits to project test pits.';$('pitDiagram').innerHTML='';return;}
      const plan=read();$('pitCount').textContent=fmt(plan.count);$('pitRoadLength').textContent=fmt(plan.length)+' m';$('pitInterior').textContent=fmt(plan.interior)+' + 2 endpoints';
      $('pitPlanStatus').textContent='Start '+chainage(plan.start)+' → End '+chainage(plan.end)+'. Both endpoints are included once; final spacing '+fmt(plan.lastInterval)+' m.';
      $('pitDiagram').innerHTML=diagram(plan);
      activePlan=plan;window.CBRWorksheet?.setPlan(plan);refresh();
    }catch(error){activePlan=null;$('pitPlanStatus').textContent=error.message;$('pitPlanStatus').classList.add('invalid');$('pitDiagram').innerHTML='';}
  }
  function refresh(){
    if(!activePlan)return;
    $('pitDiagram').innerHTML=diagram(activePlan);
    $('pitStations').replaceChildren();
    const tests=window.CBRWorksheet?.getTests()||[],table=document.createElement('table');table.innerHTML='<thead><tr><th>TP</th><th>Station</th><th>Include</th></tr></thead>';
    const body=document.createElement('tbody');for(const test of tests){const row=document.createElement('tr');for(const value of ['TP '+String(test.tp).padStart(2,'0'),test.station||'—',test.included?'On':'Off']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);}table.append(body);$('pitStations').append(table);
    const outside=tests.filter(t=>!Number.isFinite(station(t.station))||station(t.station)<activePlan.start||station(t.station)>activePlan.end).length;
    $('pitPlanStatus').textContent='Start '+chainage(activePlan.start)+' → End '+chainage(activePlan.end)+'. Projected pits: '+activePlan.interior+' interior + 2 endpoints.'+(outside?' '+outside+' test stations are blank, invalid, or outside the limits and are not plotted.':'');
    if(activePlan.count>1000)$('pitPlanStatus').textContent+=' First 1,000 rows generated (worksheet limit); increase the interval for fewer pits.';
  }
  window.CBRPitDiagram={refresh};
  $('pitStationMode').addEventListener('change',()=>{
    try{const plan=read();if(stationMode)$('pitLength').value=String(plan.length);else{$('pitStart').value='0+000';$('pitEnd').value=chainage(plan.end);}}catch{}
    stationMode=$('pitStationMode').checked;update();
  });
  for(const id of ['pitLength','pitStart','pitEnd','pitInterval'])$(id).addEventListener('input',update);
  $('clear').addEventListener('click',()=>{stationMode=false;$('pitStationMode').checked=false;$('pitLength').value='1000';$('pitStart').value='0+000';$('pitEnd').value='1+000';$('pitInterval').value='500';update();});
  update();
})();
