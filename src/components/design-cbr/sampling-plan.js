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
  let stationMode=false;
  function read(){const start=stationMode?station($('pitStart').value):0,end=stationMode?station($('pitEnd').value):Number($('pitLength').value);return calculate(start,end,Number($('pitInterval').value));}
  function diagram(plan){
    const x=value=>55+(value-plan.start)/plan.length*650,indices=plan.count<=80?Array.from({length:plan.count},(_,i)=>i):Array.from({length:41},(_,i)=>Math.round(i*(plan.count-1)/40)),labelEvery=Math.max(1,Math.ceil((plan.count-1)/9));
    const marks=indices.map(i=>{const xx=x(plan.at(i)),endpoint=i===0||i===plan.count-1,label=endpoint||i%labelEvery===0;return '<line x1="'+xx+'" y1="58" x2="'+xx+'" y2="119" stroke="#647b85"/><circle cx="'+xx+'" cy="88" r="'+(endpoint?7:5)+'" fill="'+(endpoint?'#155f58':'white')+'" stroke="#155f58" stroke-width="2"/>'+(label?'<text x="'+xx+'" y="48">TP '+String(i+1).padStart(2,'0')+'</text><text x="'+xx+'" y="139">'+chainage(plan.at(i))+'</text>':'');}).join('');
    let dims='';if(plan.count<=11)for(let i=1;i<plan.count;i++){const a=x(plan.at(i-1)),b=x(plan.at(i));dims+='<path d="M'+a+' 151V177M'+b+' 151V177M'+a+' 169H'+b+'" stroke="#708693" fill="none"/><text x="'+((a+b)/2)+'" y="163">'+fmt(plan.at(i)-plan.at(i-1))+' m</text>';}
    return '<svg viewBox="0 0 760 210" role="img" aria-label="Test-pit plan with start and end pits and interior interval stations"><style>text{font:11px Segoe UI,Arial;fill:#294b59;text-anchor:middle}</style><text x="380" y="18" style="font-size:10px;letter-spacing:1px">TEST-PIT STATIONING PLAN · SCHEMATIC</text><rect x="55" y="65" width="650" height="46" fill="#eef4f6" stroke="#637985"/><path d="M55 88H705" stroke="#8b9ca5" stroke-dasharray="10 6"/>'+marks+dims+'<text x="380" y="199">L = '+fmt(plan.length)+' m · Interval = '+fmt(plan.interval)+' m · '+plan.interior+' interior + 2 endpoint pits</text></svg>';
  }
  function update(){
    $('pitLengthField').hidden=stationMode;$('pitStationFields').hidden=!stationMode;
    for(const id of ['pitCount','pitRoadLength','pitInterior'])$(id).textContent='—';
    $('pitStations').replaceChildren();$('pitPlanStatus').classList.remove('invalid');
    try{
      const pending=stationMode?(!$('pitStart').value.trim()||!$('pitEnd').value.trim()):!$('pitLength').value.trim();
      if(pending){$('pitPlanStatus').textContent='Enter the road length or station limits to project test pits.';$('pitDiagram').innerHTML='';return;}
      const plan=read();$('pitCount').textContent=fmt(plan.count);$('pitRoadLength').textContent=fmt(plan.length)+' m';$('pitInterior').textContent=fmt(plan.interior)+' + 2 endpoints';
      $('pitPlanStatus').textContent='Start '+chainage(plan.start)+' → End '+chainage(plan.end)+'. Both endpoints are included once; final spacing '+fmt(plan.lastInterval)+' m.';
      $('pitDiagram').innerHTML=diagram(plan);
      const table=document.createElement('table');table.innerHTML='<thead><tr><th>Test Pit</th><th>Station</th><th>Spacing (m)</th></tr></thead>';
      const body=document.createElement('tbody');for(let i=0;i<Math.min(plan.count,500);i++){const row=document.createElement('tr');for(const value of ['TP '+String(i+1).padStart(2,'0'),chainage(plan.at(i)),i?fmt(plan.at(i)-plan.at(i-1)):'Start']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);}table.append(body);$('pitStations').append(table);
      if(plan.count>500){const note=document.createElement('p');note.textContent='First 500 stations listed; projected total includes all '+fmt(plan.count)+' pits.';$('pitStations').append(note);}
    }catch(error){$('pitPlanStatus').textContent=error.message;$('pitPlanStatus').classList.add('invalid');$('pitDiagram').innerHTML='';}
  }
  $('pitStationMode').addEventListener('change',()=>{
    try{const plan=read();if(stationMode)$('pitLength').value=String(plan.length);else{$('pitStart').value='0+000';$('pitEnd').value=chainage(plan.end);}}catch{}
    stationMode=$('pitStationMode').checked;update();
  });
  for(const id of ['pitLength','pitStart','pitEnd','pitInterval'])$(id).addEventListener('input',update);
  $('clear').addEventListener('click',()=>{stationMode=false;$('pitStationMode').checked=false;$('pitLength').value='';$('pitStart').value='0+000';$('pitEnd').value='';$('pitInterval').value='500';update();});
  update();
})();
