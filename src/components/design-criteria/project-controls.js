/* Project inputs and transparent traffic arithmetic; no assumed capacity or geometric compliance. */
(() => {
  const fields=['designYear','designVehicle','vehicleNotes','kFactor','directionalSplit','designDhv','heavyVehicles','targetLos','operatingSpeed','pedestrianDemand','cycleDemand','accessControl','accessSpacing','clearZone','roadsideHazards','floodLevel','floodReturn','groundwater','geotechStatus','rowAvailable','constraints'];
  const numeric={designYear:[1900,2200,true],adt:[0,Infinity,false],kFactor:[0,100,false],directionalSplit:[50,100,false],designDhv:[0,Infinity,false],heavyVehicles:[0,100,false],operatingSpeed:[0,200,false],accessSpacing:[0,Infinity,false],clearZone:[0,Infinity,false],floodLevel:[-Infinity,Infinity,false],floodReturn:[1,Infinity,false],groundwater:[-Infinity,Infinity,false],rowAvailable:[0,Infinity,false]};
  const missing=v=>v==null||String(v).trim()==='';
  function evaluate(input,criteria){
    const errors=[],numbers={};
    for(const [id,[min,max,integer]] of Object.entries(numeric)){
      if(missing(input[id])){numbers[id]=null;continue;}
      const n=Number(input[id]);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n))){errors.push(id);numbers[id]=null;}else numbers[id]=n;
    }
    const forecast=numbers.adt!=null&&numbers.kFactor!=null?numbers.adt*numbers.kFactor/100:null;
    const dhv=!missing(input.designDhv)?numbers.designDhv:forecast,ddhv=dhv!=null&&numbers.directionalSplit!=null?dhv*numbers.directionalSplit/100:null;
    const trucks=ddhv!=null&&numbers.heavyVehicles!=null?ddhv*numbers.heavyVehicles/100:null;
    const issues=[];
    if(numbers.designDhv!=null&&forecast!=null&&Math.abs(numbers.designDhv-forecast)>Math.max(1,forecast*.01))issues.push('Entered DHV differs from ADT × K; entered DHV is used. Confirm the traffic basis.');
    if(numbers.operatingSpeed!=null&&criteria?.speed!=null&&numbers.operatingSpeed>criteria.speed)issues.push('Observed / target operating speed exceeds adopted design speed. Review consistency, sight distance and speed management.');
    const requiredRow=criteria?.rows.find(r=>r.id==='row')?.value;
    if(numbers.rowAvailable!=null&&requiredRow!=null&&numbers.rowAvailable<requiredRow)issues.push('Available ROW is below the selected baseline. Review land acquisition or an approved departure.');
    const groups=[
      {title:'Design vehicle',ids:['designVehicle'],impact:'Confirm swept paths, minimum turning radius, off-tracking, curve widening and vertical clearance. A vehicle selection does not calculate these dimensions.',reference:'DGCS §§1.4, 2.6.2 · Tables 1-1–1-2 · pp.1-5–1-6, 2-37; AASHTO Green Book'},
      {title:'Design-year traffic / capacity',ids:['designYear','adt','directionalSplit','targetLos'],extra:dhv!=null,impact:'Use design-year directional demand to check lane count, level of service, auxiliary lanes and intersections. Capacity requires a separate analysis.',reference:'DGCS §2.6.1 · pp.2-36–2-37; TRB Highway Capacity Manual'},
      {title:'Heavy vehicles',ids:['heavyVehicles'],impact:'Review grade performance, climbing lanes and capacity effects. Truck counts are not ESALs; pavement loading also needs axle loads and growth.',reference:'DGCS §2.6.2 · p.2-37; Highway Capacity Manual; pavement-design references'},
      {title:'Operating speed / context',ids:['operatingSpeed'],impact:'Check alignment consistency and roadside context against the selected geometric design speed. Do not substitute observed speed for approved design speed automatically.',reference:'DGCS §3.3–3.4 · pp.3-11–3-12; AASHTO Green Book'},
      {title:'Pedestrians and cyclists',ids:['pedestrianDemand','cycleDemand'],impact:'Establish footpaths, crossings, accessible facilities, bicycle provision and crossing sight distance. Village speeds require pedestrian-risk review.',reference:'DGCS §§2.6.2, 3.4; DPWH Highway Safety Design Standards; AASHTO pedestrian/bicycle guides'},
      {title:'Access and intersections',ids:['accessControl','accessSpacing'],impact:'Review conflict points, turning lanes, access spacing, intersection sight distance and signal needs. No universal spacing is assumed.',reference:'DGCS §§2.6.6, 3.5 and Chapter 4; TRB Access Management Manual'},
      {title:'Clear zone / roadside hazards',ids:['clearZone','roadsideHazards'],impact:'Check recovery area, roadside slopes, fixed obstacles and whether barrier assessment is required. A supplied width is not a clear-zone or barrier design approval.',reference:'DGCS Chapter 8 · Table 8-1 · p.8-2; AASHTO Roadside Design Guide'},
      {title:'Flood and drainage',ids:['floodLevel','floodReturn'],impact:'Establish drainage catchments, rainfall intensity, freeboard, road level, culverts and erosion protection. Specify the flood-level datum; it is not the section’s relative centreline datum.',reference:'DGCS Chapters 2 and 5; Table 3-2 for tourism only; FHWA HEC-22'},
      {title:'Ground and groundwater',ids:['geotechStatus','groundwater'],impact:'Verify soil/rock investigation, bearing support, settlement, cut/fill stability, groundwater and retaining needs. Investigated material must support the section’s material selection.',reference:'DGCS Chapters 6–7; FHWA geotechnical guidance'},
      {title:'ROW / utilities / environment',ids:['rowAvailable','constraints'],impact:'Check section fit, land take, utilities, drainage outlets, environmental restrictions and construction feasibility against the surveyed corridor.',reference:'DGCS §§1.5.5, 2.1, 3.7; project surveys and applicable DPWH requirements'}
    ];
    for(const g of groups){
      g.missing=g.ids.filter(id=>missing(input[id])||errors.includes(id));
      g.status=g.missing.length||g.extra===false?'TO BE ESTABLISHED':'Inputs recorded · design review required';
      if(g.title==='Ground and groundwater'&&input.geotechStatus==='pending')g.status='Investigation pending · design review required';
    }
    return {errors,numbers,forecast,dhv,ddhv,trucks,issues,groups};
  }
  globalThis.ProjectDesignControls=Object.freeze({evaluate,fields});
  if(typeof document==='undefined')return;
  let criteria;
  const $=id=>document.getElementById(id),fmt=n=>n==null?'TO BE ESTABLISHED':n.toLocaleString('en-US',{maximumFractionDigits:1});
  function render(){
    const input=Object.fromEntries([...fields,'adt'].map(id=>[id,$(id).value]));const result=evaluate(input,criteria);
    for(const id of [...fields,'adt'])$(id).setAttribute('aria-invalid',String(result.errors.includes(id)));
    $('traffic-demand').textContent='Two-way DHV: '+fmt(result.dhv)+' veh/h · Directional DHV: '+fmt(result.ddhv)+' veh/h · Directional heavy vehicles: '+fmt(result.trucks)+' veh/h';
    $('project-control-status').textContent=[...(result.errors.length?['Invalid inputs: '+result.errors.map(id=>document.querySelector(`label[for="${id}"]`)?.textContent||id).join(', ')+'.']:[]),...result.issues].join(' ')||'Project inputs are recorded separately from prescribed baselines. Missing information is TO BE ESTABLISHED.';
    const body=$('design-impacts');body.replaceChildren();
    for(const g of result.groups){const tr=document.createElement('tr');for(const value of [g.title,g.status,g.impact,g.reference]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}
  }
  for(const id of [...fields,'adt'])$(id).addEventListener('input',render);
  $('controls').addEventListener('submit',e=>e.preventDefault());
  $('reset').addEventListener('click',()=>{for(const id of fields)$(id).value='';render();});
  document.addEventListener('criteria-updated',e=>{criteria=e.detail;render();});
  render();
})();
