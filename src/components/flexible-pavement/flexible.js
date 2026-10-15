(()=>{
  const $=id=>document.getElementById(id),fmt=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const defaults={r:85,so:.40,p0:4.2,pt:2.0,years:20,mr:9000,baseMr:30000,subMr:15000,a1:.38,a2:.15,a3:.11,m2:1,m3:1,d1:null,d2:200,d3:200,increment:25,auto:true,w:1000000};
  const previousDefaults={...defaults,mr:null,baseMr:null,subMr:null,d2:null,d3:null,w:null};
  const keys=Object.keys(defaults).filter(key=>!['w','auto'].includes(key)),storageKey='hd-flexible-pavement-v1';
  let traffic=null,manualD1='',lastResult;
  function number(id){return $(id).value.trim()===''?NaN:Number($(id).value);}
  function input(){return {...Object.fromEntries(keys.map(key=>[key,number(key)])),w:traffic??NaN,auto:$('auto').checked};}
  function restore(p){for(const key of keys)$(key).value=Number.isFinite(p[key])?String(p[key]):'';$('auto').checked=p.auto!==false;traffic=Number.isFinite(p.w)?p.w:null;manualD1=Number.isFinite(p.manualD1)?String(p.manualD1):!$('auto').checked?$('d1').value:'';formatTraffic();}
  function formatTraffic(){$('w').value=traffic===null?'':(traffic/1e6).toFixed(2);}
  function save(p){try{localStorage.setItem(storageKey,JSON.stringify({...p,manualD1:manualD1===''?null:Number(manualD1)}));}catch{}}
  function draw(p,result){
    const valid=result.errors.length===0,thickness=[valid?result.d1:NaN,p.d2,p.d3];
    const heights=valid?thickness.map((d,i)=>Math.max(i===0?76:92,d/Math.max(...thickness)*138)):[76,124,124];
    const labels=['Asphalt Concrete Surface','Crushed Gravel Base','Granular Subbase','Compacted Subgrade'],patterns=['asphalt','aggregate','subaggregate','soil'];let y=38;
    const details=[['a₁ = '+fmt(p.a1)+' · SN₁ provided = '+fmt(valid?result.surface:NaN)],['E₂ = '+fmt(p.baseMr*.006894757)+' MPa','a₂ = '+fmt(p.a2)+' · m₂ = '+fmt(p.m2)],['E₃ = '+fmt(p.subMr*.006894757)+' MPa','a₃ = '+fmt(p.a3)+' · m₃ = '+fmt(p.m3)],['Mᴿ = '+fmt(p.mr*.006894757)+' MPa · '+fmt(p.mr,0)+' psi']];
    $('layers').innerHTML='<text class="section-title" x="16" y="19">DESIGN PAVEMENT STRUCTURE</text>'+labels.map((label,i)=>{
      const height=i===3?74:heights[i],bottom=y+height;
      const shape=i===3?'<path class="section-material" d="M16 '+y+'H690V'+bottom+'H374l-9 7-9-12-9 5H16Z" fill="url(#soil)"/>':'<rect class="section-material" x="16" y="'+y+'" width="674" height="'+height+'" fill="url(#'+patterns[i]+')"/>';
      const text='<text class="section-layer-label" x="36" y="'+(y+28)+'">'+label+'</text>'+details[i].map((line,j)=>'<text class="section-layer-detail" x="36" y="'+(y+49+j*19)+'">'+line+'</text>').join('');
      const dimensions=i<3?'<path class="section-extension" d="M696 '+y+'H756 M696 '+bottom+'H756"/><path class="section-dimension" d="M750 '+y+'V'+bottom+'" marker-start="url(#sectionArrow)" marker-end="url(#sectionArrow)"/><text class="section-dimension-label" x="774" y="'+(y+height/2-3)+'">D'+['₁','₂','₃'][i]+' = '+fmt(thickness[i],Number.isInteger(thickness[i])?0:2)+' mm</text><text class="section-layer-detail" x="774" y="'+(y+height/2+17)+'">'+fmt(thickness[i]/1000,3)+' m</text>':'<text class="section-layer-detail" x="774" y="'+(y+28)+'">Subgrade</text><text class="section-layer-detail" x="774" y="'+(y+47)+'">Depth schematic</text>';
      y=bottom;return shape+text+dimensions;
    }).join('');
    $('sectionSvg').setAttribute('viewBox','0 0 960 '+(y+24));
    $('drawingDesc').textContent=valid?'Adopted asphalt '+fmt(result.d1)+' mm; base '+fmt(p.d2)+' mm; subbase '+fmt(p.d3)+' mm. Subgrade depth is schematic.':'Layer schematic; complete design inputs to calculate asphalt thickness.';
  }
  function curve(p,result){
    if(result.errors.length){$('curve').innerHTML='<text x="30" y="55" fill="#536977">Complete the design inputs to display the calculated curve.</text>';return;}
    const xmax=Math.max(6,Math.ceil(Math.max(result.required,result.sn)+1)),samples=Array.from({length:81},(_,i)=>({sn:i*xmax/80,log:FlexibleCalc.logCapacity(i*xmax/80,p)})),low=Math.floor(samples[0].log),high=Math.ceil(samples[80].log),x=sn=>70+sn/xmax*630,y=log=>280-(log-low)/(high-low)*240;
    const grid=Array.from({length:6},(_,i)=>{const log=low+(high-low)*i/5,yy=y(log);return '<path d="M70 '+yy+'H700" stroke="#dce5eb"/><text x="60" y="'+(yy+4)+'" text-anchor="end" font-size="12">'+fmt(log,1)+'</text>';}).join('');
    $('curve').innerHTML=grid+'<path d="M70 35V280H700" fill="none" stroke="#7c959b"/><polyline points="'+samples.map(s=>x(s.sn)+','+y(s.log)).join(' ')+'" fill="none" stroke="#17665d" stroke-width="2"/><path d="M70 '+y(Math.log10(p.w))+'H'+x(result.required)+'V280" fill="none" stroke="#c23838" stroke-dasharray="5 4"/><circle cx="'+x(result.required)+'" cy="'+y(Math.log10(p.w))+'" r="5" fill="#c23838"/><text x="'+Math.min(x(result.required)+10,530)+'" y="'+Math.max(30,y(Math.log10(p.w))-12)+'" font-size="12" fill="#ac3535">SN = '+fmt(result.required)+' · '+fmt(p.w/1e6)+' ×10⁶ ESAL</text><text x="'+x(result.required)+'" y="300" text-anchor="middle" font-size="12">'+fmt(result.required)+'</text><text x="700" y="300" text-anchor="end" font-size="12">'+fmt(xmax,0)+'</text><text x="70" y="300" font-size="12">0</text><text x="360" y="330" font-size="13">Structural Number · SN</text><text transform="translate(18 210) rotate(-90)" font-size="13">log₁₀(W₁₈) · ESAL capacity</text>';
  }
  function render(){
    const p=input();lastResult=FlexibleCalc.calculate(p);const result=lastResult,valid=result.errors.length===0;
    try{$('zr').value=fmt(FlexibleCalc.z(p.r),3);}catch{$('zr').value='';}
    $('delta').value=Number.isFinite(p.p0)&&Number.isFinite(p.pt)?fmt(p.p0-p.pt):'';
    for(const id of ['mr','baseMr','subMr'])$(id+'SI').textContent=fmt(p[id]*.006894757)+' MPa';
    $('trafficHelp').textContent=traffic===null?'Enter total flexible-pavement design-lane ESALs; display converts to millions.':fmt(traffic)+' ESAL = '+fmt(traffic/1e6,4)+' ×10⁶ ESAL';
    $('d1').readOnly=p.auto;$('d1').closest('.entry').classList.toggle('auto',p.auto);
    $('increment').disabled=!p.auto;
    if(p.auto)$('d1').value=valid?String(result.d1):'';
    $('rawThickness').textContent=fmt(valid?result.rawD1:NaN);
    $('adoptedThickness').textContent=fmt(valid?result.d1:NaN,p.auto?0:2);
    $('rawConversion').textContent=valid?fmt(result.rawD1/1000,3)+' m · '+fmt(result.rawD1/25.4)+' in':'Enter valid design inputs';
    $('adoptedConversion').textContent=valid?fmt(result.d1/1000,3)+' m · '+fmt(result.d1/25.4)+' in · '+(p.auto?'Rounded up':'Manual thickness'):'Enter valid design inputs';
    $('required').textContent=fmt(valid?result.required:NaN);$('adopted').textContent=fmt(valid?result.sn:NaN);
    $('status').className='status '+(valid?(result.pass?'pass':'fail'):'');
    const missingOnly=result.errors.every(error=>error.startsWith('Enter '));
    $('status').textContent=valid?(result.pass?'Structural number and all three layer-support checks satisfied.':'Adopted thickness fails one or more layer-support checks. Increase asphalt thickness or revise the section.'):missingOnly?'Complete CESAL, material support and layer thicknesses to calculate the section.':result.errors.filter(error=>!error.startsWith('Enter ')).slice(0,3).join(' ');
    const sample=Object.keys(defaults).filter(key=>key!=='d1').every(key=>p[key]===defaults[key]);
    if(sample)$('status').textContent='Sample collector road · 2 lanes · 20 years. Assumed traffic and material values; replace with project data. '+$('status').textContent;
    for(const key of keys){const field=$(key);if(field.readOnly||field.disabled){field.removeAttribute('aria-invalid');continue;}if(field.value.trim()!==''&&(!Number.isFinite(number(key))||field.validity?.valid===false))field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');}
    $('layerRows').innerHTML=[['Asphalt Surface',valid?result.d1:NaN,p.a1,1,valid?result.surface:NaN],['Granular Base',p.d2,p.a2,p.m2,valid?result.base:NaN],['Granular Subbase',p.d3,p.a3,p.m3,valid?result.sub:NaN]].map(row=>'<tr><td>'+row[0]+'</td><td>'+fmt(row[1])+' mm</td><td>'+fmt(row[2])+'</td><td>'+fmt(row[3])+'</td><td>'+fmt(row[4])+'</td></tr>').join('');
    const targets=valid?[result.sn1,result.sn2,result.required]:[NaN,NaN,NaN],provided=valid?[result.surface,result.surface+result.base,result.sn]:[NaN,NaN,NaN];
    $('checkRows').innerHTML=['Asphalt over Base','Asphalt + Base over Subbase','Full Section over Subgrade'].map((label,i)=>'<tr><td>'+label+'</td><td>'+fmt(targets[i])+'</td><td>'+fmt(provided[i])+'</td><td'+(valid?' data-check="'+result.checks[i]+'"':'')+'>'+(valid?(result.checks[i]?'Pass':'Not achieved'):'Pending')+'</td></tr>').join('');
    const params=[['Design Period · n',p.years,'years'],['CESAL · W₁₈',p.w,'ESAL'],['Reliability · R',p.r,'%'],['Standard Normal Deviate · Zᴿ',valid?result.z:NaN,'—'],['Overall Standard Deviation · S₀',p.so,'—'],['Initial Serviceability · p₀',p.p0,'PSI'],['Terminal Serviceability · pₜ',p.pt,'PSI'],['Serviceability Loss · ΔPSI',valid?result.delta:NaN,'PSI'],['Subgrade Resilient Modulus · Mᴿ',p.mr,'psi'],['Base Resilient Modulus · E₂',p.baseMr,'psi'],['Subbase Resilient Modulus · E₃',p.subMr,'psi'],['Required Structural Number · SN',valid?result.required:NaN,'—'],['Adopted Structural Number · SN',valid?result.sn:NaN,'—']];
    $('parameterRows').innerHTML=params.map(row=>'<tr><td>'+row[0]+'</td><td>'+fmt(row[1])+'</td><td>'+row[2]+'</td></tr>').join('');
    $('stepTraffic').textContent=valid?'W₁₈ = '+fmt(p.w)+' ESAL over '+p.years+' years; R = '+fmt(p.r)+'%; Zᴿ = '+fmt(result.z,3)+'; S₀ = '+fmt(p.so)+'.':'Enter project design-lane traffic for the selected design period. Flexible and rigid ESAL factors may differ.';
    $('stepService').textContent=valid?fmt(p.p0)+' − '+fmt(p.pt)+' = '+fmt(result.delta)+'. This uses the entered serviceability loss for traffic; make any environmental allowance before adoption.':'Enter initial and terminal serviceability.';
    $('stepSN').textContent=valid?'Bisection solves the equation: SN = '+fmt(result.required,4)+'; calculated log₁₀(W₁₈) = '+fmt(FlexibleCalc.logCapacity(result.required,p),6)+'; target = '+fmt(Math.log10(p.w),6)+'. Repeating with base E₂ gives SN₁ = '+fmt(result.sn1,4)+' and subbase E₃ gives SN₂ = '+fmt(result.sn2,4)+'.':'Enter traffic and material support to solve the structural number.';
    $('stepLayers').textContent=valid?'D₁ ≥ 25.4 × max[SN₁, SN₂ − a₂D₂m₂, SN − a₂D₂m₂ − a₃D₃m₃] / a₁ = '+fmt(result.rawD1)+' mm. Granular thicknesses are adopted inputs; their inches are D₂/25.4 and D₃/25.4.':'Adopt base and subbase thicknesses; auto mode solves the asphalt thickness that satisfies all layer systems.';
    $('stepChecks').textContent=valid?'Adopted D₁ = '+fmt(result.d1)+' mm '+(p.auto?'(rounded up to '+p.increment+' mm)':'(manual)')+'. Provided SN = '+fmt(result.surface)+' + '+fmt(result.base)+' + '+fmt(result.sub)+' = '+fmt(result.sn)+'. '+(result.pass?'All structural checks pass.':'Review failed checks in the table.')+' Required construction minimums remain project-specific.':'Pending complete inputs.';
    draw(p,result);curve(p,result);save(p);
  }
  const guides={traffic:['CESAL · W₁₈','The sample assumes 1,000,000 design-lane ESALs over 20 years for a two-lane collector; this is not a traffic forecast. Enter cumulative design-lane 18-kip ESALs for flexible pavement, as a whole count (e.g. 3513898.37). On leaving the input it displays 3.51 ×10⁶; full precision is retained. Editing again shows the original count. Rigid pavement equivalency factors must not be reused without verification.'],reliability:['Reliability · R','Default 85%, matching the DPWH manual’s typical national-road value and your rigid tab. Zᴿ uses Table 3 / FHWA Table C-3, with linear interpolation between listed levels. Collector ranges depend on urban/rural classification and agency requirements.'],so:['Overall Standard Deviation · S₀','DPWH Table 4 gives 0.40–0.50 for flexible pavement. The default 0.40 is the documented minimum. FHWA commonly uses 0.45; the calculator permits 0.35–0.50 from that reference.'],serviceability:['Serviceability','DPWH §2.4: initial 4.2; terminal 2.5 or higher for major highways, and 2.0 for lesser traffic. Default terminal 2.0 follows the collector assumption. ΔPSI is computed automatically; account for swelling/frost effects separately where applicable.'],support:['Material Support','Sample assumptions: subgrade 9,000 psi, base 30,000 psi and subbase 15,000 psi. Replace these with project-specific effective/seasonal resilient moduli. Base and subbase moduli are used to calculate required SN for each overlying layer system. They are distinct from structural coefficients aᵢ. Confirm that support increases upward. The 1,000–1,000,000 psi input bounds are calculator limits, not recommended material minima.'],layers:['Layer Coefficients & Drainage','DPWH Table 11: good asphalt concrete a₁ = 0.38, crushed gravel base a₂ = 0.15, compliant granular subbase a₃ = 0.11. These are editable starting assumptions, not measured material properties. The sample adopts 200 mm base and 200 mm subbase; these are not universal construction minima. Thickness D is in inches in the SN equation; entered mm are divided by 25.4.\n\nTable 12 mᵢ ranges (columns: <1%, 1–5%, 5–25%, >25% time near saturation):\nExcellent: 1.40–1.35 | 1.35–1.30 | 1.30–1.20 | 1.20\nGood: 1.35–1.25 | 1.25–1.15 | 1.15–1.00 | 1.00\nFair: 1.25–1.15 | 1.15–1.05 | 1.00–0.80 | 0.80\nPoor: 1.15–1.05 | 1.05–0.80 | 0.80–0.60 | 0.60\nVery poor: 1.05–0.95 | 0.95–0.75 | 0.75–0.40 | 0.40\n\nDPWH §2.6 requires adopted drainage coefficients not lower than 1.0; this worksheet applies that limit. Improve drainage/site elevation where required; do not increase m solely to satisfy the calculation.']};
  document.querySelectorAll('[data-help]').forEach(button=>button.addEventListener('click',()=>{const [title,text]=guides[button.dataset.help];$('guideTitle').textContent=title;$('guideText').textContent=text;$('guide').showModal();}));$('closeGuide').addEventListener('click',()=>$('guide').close());
  $('w').addEventListener('focus',()=>{$('w').value=traffic===null?'':String(traffic);});
  $('w').addEventListener('input',()=>{const raw=$('w').value.trim().replace(/,/g,'');traffic=raw===''?null:Number(raw);render();});
  $('w').addEventListener('blur',()=>{formatTraffic();});
  $('auto').addEventListener('change',()=>{if($('auto').checked)manualD1=$('d1').value;else{manualD1=manualD1||$('d1').value;$('d1').value=manualD1;}render();});
  $('designForm').addEventListener('input',event=>{if(event.target.id==='w'||event.target.id==='auto')return;if(event.target.id==='d1')manualD1=$('d1').value;render();});
  $('designForm').addEventListener('change',event=>{if(event.target.id==='increment')render();});
  $('reset').addEventListener('click',()=>{manualD1='';restore(defaults);render();});
  let initial=defaults;try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&typeof saved==='object'){
    const untouched=Object.keys(previousDefaults).every(key=>saved[key]===previousDefaults[key]);
    initial=untouched?defaults:{...defaults,...saved};
  }}catch{}
  restore(initial);render();
  // The parent shell supplies the current mode after iframe load and on every toggle.
  if(typeof window!=='undefined'){
    window.addEventListener('message',event=>{
      if(event.source!==window.parent||event.data?.type!=='hd-toolkit-admin-state'||typeof event.data.enabled!=='boolean')return;
      const steps=$('calculationSteps');steps.hidden=!event.data.enabled;if(steps.hidden)steps.open=false;
    });
    if(window.parent!==window)window.parent.postMessage({type:'hd-toolkit-flexible-ready'},'*');
  }
})();
