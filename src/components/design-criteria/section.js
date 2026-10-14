(() => {
  const $=id=>document.getElementById(id),fmt=n=>(Math.abs(Number(n))<1e-9?0:Number(n)).toLocaleString('en-US',{maximumFractionDigits:2});
  const names=['lanes','laneWidth','medianWidth','condition','superelevation','direction','pavementType','thickness','baseThickness','subbaseThickness','crossfall','shoulderFall','leftGround','rightGround','cutSlope','fillSlope','material'];
  let last;const touched=new Set();
  function render(){
    if(!last)return;
    const {result,adopted}=last;
    const read=id=>adopted[id]!==undefined&&adopted[id]!==''?Number(adopted[id]):result.rows.find(r=>r.id===id)?.value;
    const type=$('section-pavementType').value;
    const min=result.tourism?(type==='pcc'?230:50):null;
    if(result.tourism){if(!touched.has('thickness'))$('section-thickness').value=min;if(!touched.has('crossfall'))$('section-crossfall').value=type==='pcc'?1.5:2;}
    $('section-thickness-guide').textContent=result.tourism?'Tourism Table 3-2: PCC 230 mm / 1.5% cross slope; ACP 50 mm / 2%.':'Thickness and normal crossfall are illustrative project inputs; tourism Table 3-2 is not a general highway standard. Use the pavement design and selected surfacing figure.';
    const values=Object.fromEntries(names.map(id=>[id,$('section-'+id).value]));
    values.medianEnabled=$('section-medianEnabled').checked;
    values.drainage=$('section-drainage').checked;values.barriers=$('section-barriers').checked;
    $('section-medianWidth').disabled=!values.medianEnabled;
    const superMode=values.condition==='superelevated';
    for(const id of ['superelevation','direction'])$('section-'+id).disabled=!superMode;
    for(const id of ['crossfall','shoulderFall'])$('section-'+id).disabled=superMode;
    const notes=[];
    if(superMode){const limit=read('superelevation');if(!Number.isFinite(limit))notes.push('Adopt a project maximum superelevation in the criteria schedule.');else if(Number(values.superelevation)>limit)notes.push('Superelevation exceeds the schedule maximum of '+fmt(limit)+'%.');if(Number(values.superelevation)===0)notes.push('Zero superelevation produces a level section; check drainage.');}
    if(min!=null&&Number(values.thickness)<min)notes.push('Pavement thickness is below the tourism Table 3-2 requirement.');
    if(result.tourism&&!superMode&&Number(values.crossfall)!==(type==='pcc'?1.5:2))notes.push('Crossfall differs from tourism Table 3-2: PCC 1.5%, ACP 2%.');
    let s;
    try{if(!result.sectionApplicable)throw Error('Expressways require a divided multilane section: at least two 3.6 m lanes per direction (§3.1). This two-lane drawing is not applicable.');s=TypicalSection.build({...values,width:read('width'),shoulder:read('shoulder')});}
    catch(e){$('section-drawing').replaceChildren();$('section-summary').textContent='';$('section-slope-guide').textContent='';$('section-status').textContent=e.message+' Adopt pavement and shoulder widths in the schedule when no baseline is available.';return;}
    const extent=Math.max(s.edge+3,...s.profile.map(p=>Math.abs(p[0])));
    const sx=460/extent,X=x=>600+x*sx;
    const allY=[...s.profile.map(p=>p[1]),s.ground(-extent),s.ground(extent),0];
    const ymin=Math.min(...allY),ymax=Math.max(...allY),sy=Math.min(70,220/Math.max(1,ymax-ymin)),Y=y=>315+(ymax+ymin)/2*sy-y*sy;
    const coords=pts=>pts.map(([x,y])=>X(x)+','+Y(y)).join(' ');
    const line=(a,b,cl)=>`<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" class="${cl}"/>`;
    function dimension(x1,x2,y,label){return `<path d="M${X(x1)} ${Y(s.surface(x1))-8}V${y-8}M${X(x2)} ${Y(s.surface(x2))-8}V${y-8}" class="extension"/><line x1="${X(x1)}" y1="${y}" x2="${X(x2)}" y2="${y}" class="dimension" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/><text x="${X((x1+x2)/2)}" y="${y-9}" text-anchor="middle" class="dim-label">${label}</text>`;}
    let svg=`<svg viewBox="0 0 1200 1180" role="img" aria-labelledby="section-svg-title section-svg-desc"><title id="section-svg-title">Typical ${s.p.lanes}-lane road section with cut and fill</title><desc id="section-svg-desc">Pavement ${fmt(s.p.width)} metres; shoulders ${fmt(s.p.shoulder)} metres each; ${superMode?'superelevation '+fmt(s.p.superelevation):'crossfall '+fmt(s.p.crossfall)} percent; pavement ${fmt(s.p.thickness)} millimetres. ${s.complete?'Cut area '+fmt(s.cutArea)+' and fill area '+fmt(s.fillArea)+' square metres.':'Side slopes need review.'}</desc><defs><marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#536977"/></marker><pattern id="cut-hatch" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#fce9dc"/><path d="M0 10L10 0" stroke="#b47b52" stroke-width=".6"/></pattern><pattern id="fill-hatch" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#e3f1e9"/><path d="M0 0L12 12M0 12L12 0" stroke="#83a792" stroke-width=".5"/></pattern><pattern id="aggregate-hatch" width="15" height="12" patternUnits="userSpaceOnUse"><path d="M2 3l3-2 3 4-4 3zM11 8l2-2 2 3" fill="none" stroke="#7b8b96" stroke-width=".7"/></pattern><pattern id="pcc-hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#71818b" stroke-width=".6"/></pattern></defs>`;
    for(const region of s.regions)svg+=`<polygon points="${coords(region.points)}" class="earth-${region.type}" style="fill:url(#${region.type}-hatch)"/>`;
    svg+=`<polygon points="${coords([...s.top,...s.pavementBottom.slice().reverse()])}" fill="${type==='pcc'?'url(#pcc-hatch)':'#536977'}"/>`;
    if(s.p.baseThickness>0)svg+=`<polygon points="${coords([...s.pavementBottom,...s.baseBottom.slice().reverse()])}" fill="#dae2e7"/><polygon points="${coords([...s.pavementBottom,...s.baseBottom.slice().reverse()])}" fill="url(#aggregate-hatch)"/>`;
    if(s.p.subbaseThickness>0)svg+=`<polygon points="${coords([...s.baseBottom,...s.formation.slice().reverse()])}" fill="#ede5d6"/><polygon points="${coords([...s.baseBottom,...s.formation.slice().reverse()])}" fill="url(#aggregate-hatch)"/>`;
    svg+=`<polyline points="${coords(s.pavementBottom)}" class="layer-boundary"/><polyline points="${coords(s.baseBottom)}" class="layer-boundary"/>`;
    svg+=`<polyline points="${coords(s.profile)}" class="formation"/><polyline points="${coords(s.top)}" class="surface"/>`;
    svg+=line([-extent,s.ground(-extent)],[extent,s.ground(extent)],'ground');
    svg+=`<line x1="600" x2="600" y1="125" y2="485" class="centreline"/><text x="600" y="128" text-anchor="middle" class="dim-label">℄</text>`;
    svg+=dimension(-s.edge,s.edge,30,`[20] ROADWAY / PLATFORM ${fmt(2*s.edge)} m`);
    svg+=dimension(-s.half,s.half,53,`TRAFFIC LANES ${fmt(s.p.lanes*s.p.laneWidth)} m${s.p.medianWidth>0?' + MEDIAN '+fmt(s.p.medianWidth)+' m':''}`);
    const lanes=[];let laneStart=-s.half;
    for(let i=0;i<s.p.lanes;i++){
      if(s.p.medianWidth>0&&i===s.p.lanes/2)laneStart+=s.p.medianWidth;
      const laneEnd=laneStart+s.p.laneWidth;lanes.push([laneStart,laneEnd]);
      svg+=dimension(laneStart,laneEnd,91,`${s.p.lanes>4?'':'[18] '}${fmt(s.p.laneWidth)} m`);laneStart=laneEnd;
    }
    for(const [i,[a,b]] of lanes.entries())if(i>0){svg+=`<circle cx="${X(a)}" cy="${Y(s.surface(a))}" r="2" fill="white" stroke="#647d89"/>`;}
    if(values.medianEnabled){
      const mx=X(-s.p.medianWidth/2),mw=s.p.medianWidth>0?s.p.medianWidth*sx:28;
      svg+=`<g class="optional-median"><rect x="${s.p.medianWidth>0?mx:586}" y="${Y(s.surface(0))-6}" width="${mw}" height="22" fill="#f4e4b9" fill-opacity=".9" stroke="#ad8734" stroke-dasharray="4 3"/><text x="600" y="176" text-anchor="middle" class="dim-label">MEDIAN ${s.p.medianWidth>0?fmt(s.p.medianWidth)+' m':'TO BE ESTABLISHED'}</text><path d="M600 185V${Y(0)-10}" class="term-leader"/></g>`;
      if(s.p.medianWidth>0)svg+=dimension(-s.p.medianWidth/2,s.p.medianWidth/2,145,fmt(s.p.medianWidth)+' m');
    }
    for(const d of [-1,1]){
      const xx=X(d*s.edge),yy=Y(s.surface(d*s.edge));
      if(values.barriers)svg+=`<g class="optional-barrier" aria-label="Schematic roadside barrier"><path d="M${xx} ${yy}v-28m-12 5h24m-20 6h16" fill="none" stroke="#5b6772" stroke-width="3"/></g>`;
      if(values.drainage)svg+=`<g class="optional-drainage" aria-label="Schematic side drainage"><path d="M${xx+d*35} ${yy+12}l${d*14} 18l${d*14} -18" fill="none" stroke="#3287a8" stroke-width="2" stroke-dasharray="4 2"/></g>`;
    }
    if(s.p.shoulder>0)svg+=dimension(-s.edge,-s.half,53,`[19] SHOULDER ${fmt(s.p.shoulder)} m`)+dimension(s.half,s.edge,53,`[19] SHOULDER ${fmt(s.p.shoulder)} m`);
    for(const d of [-1,1]){
      const x=d*s.half*.5,y=s.surface(x),arrowDirection=superMode?(values.direction==='right'?1:-1):d;
      svg+=`<text x="${X(x)}" y="${Y(y)-25}" text-anchor="middle" class="dim-label">${superMode?'e = '+fmt(s.p.superelevation):'[13] '+fmt(s.p.crossfall)}%</text>`;
      svg+=`<line x1="${X(x-arrowDirection*.35)}" y1="${Y(y)-17}" x2="${X(x+arrowDirection*.35)}" y2="${Y(y)-13}" class="dimension" marker-end="url(#dim-arrow)"/>`;
      if(s.p.shoulder>0){const xx=d*(s.half+s.p.shoulder*.5);svg+=`<text x="${X(xx)}" y="${Y(s.surface(xx))-12}" text-anchor="middle" class="dim-label">[17] ${fmt(superMode?s.p.superelevation:s.p.shoulderFall)}%</text>`;}
    }
    // Thickness dimension placed outside the road with a leader to the pavement layer.
    const thicknessX=s.half*.8, thicknessTop=s.surface(thicknessX);
    const ty=Y(thicknessTop-s.p.thickness/2000);
    svg+=`<line x1="${X(thicknessX)}" x2="${X(thicknessX)}" y1="${Y(thicknessTop)}" y2="${Y(thicknessTop-s.p.thickness/1000)}" class="dimension" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/>`;
    svg+=`<text x="${X(thicknessX)+12}" y="${ty+4}" class="dim-label">t</text>`;
    for(const [key,label] of [['left','LEFT'],['right','RIGHT']]){
      const tie=s[key];if(!tie)continue;
      const direction=key==='left'?-1:1,x=direction*s.edge;
      const rr=TypicalSection.range(values.material,tie.height);
      if(!rr)notes.push(label+': material / height is outside the supplied Table 7-1 bands.');
      else if(tie.ratio<rr[0]||tie.ratio>rr[1])notes.push(label+': adopted slope '+fmt(tie.ratio)+':1 is outside Table 7-1 range '+rr.map(fmt).join('–')+':1.');
      const at=X((x+tie.point[0])/2),yy=Y((s.surface(x)-s.p.totalThickness/1000+tie.point[1])/2);
      svg+=`<text x="${at}" y="${yy+(tie.cut?-26:32)}" text-anchor="middle" class="slope-label">${tie.cut?'[11] CUT':'[1] FILL'} ${fmt(tie.ratio)}H:1V</text>`;
      const dimX=X(x)+direction*18;
      svg+=`<line x1="${dimX}" x2="${dimX}" y1="${Y(s.surface(x)-s.p.totalThickness/1000)}" y2="${Y(s.ground(x))}" class="dimension"/><text x="${dimX+direction*10}" y="${(Y(s.surface(x)-s.p.totalThickness/1000)+Y(s.ground(x)))/2}" text-anchor="${direction<0?'end':'start'}" class="dim-label">h=${fmt(tie.height)} m</text>`;
    }
    const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const label=(x,y,text,cl='drawing-note')=>`<text x="${x}" y="${y}" class="${cl}">${esc(text)}</text>`;
    for(const [key,d] of [['left',-1],['right',1]])if(s[key]){
      const pt=s[key].point;svg+=`<circle cx="${X(pt[0])}" cy="${Y(pt[1])}" r="3.5" class="survey-point"/>`;
      svg+=`<text x="${X(pt[0])+d*8}" y="${Y(pt[1])+45}" text-anchor="${d<0?'end':'start'}" class="drawing-note">${key==='left'?'L daylight':'R daylight'}</text>`;
    }
    // Numbered callouts use the terminology supplied in Figure 1.1.
    function numbered(id,point,bx,by){return `<path d="M${X(point[0])} ${Y(point[1])}L${bx} ${by}" class="term-leader"/><circle cx="${bx}" cy="${by}" r="11" class="term-bubble"/><text x="${bx}" y="${by+4}" text-anchor="middle" class="term-number">${id}</text>`;}
    svg+=numbered(2,[-extent*.78,s.ground(-extent*.78)],80,170);
    const layerX=s.half*.25;
    svg+=numbered(type==='pcc'?9:8,[layerX,s.surface(layerX)-s.p.thickness/2000],665,465);
    if(s.p.baseThickness>0)svg+=numbered(7,[layerX,s.surface(layerX)-(s.p.thickness+s.p.baseThickness/2)/1000],715,490);
    if(s.p.subbaseThickness>0)svg+=numbered(6,[layerX,s.surface(layerX)-(s.p.thickness+s.p.baseThickness+s.p.subbaseThickness/2)/1000],765,515);
    svg+=numbered(type==='pcc'?14:5,[0,-s.p.totalThickness/1000],575,515);
    if(s.complete){
      const left=s.left.point[0],right=s.right.point[0];
      svg+=`<line x1="${X(left)}" x2="${X(right)}" y1="535" y2="535" class="dimension" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/><text x="${X((left+right)/2)}" y="531" text-anchor="middle" class="drawing-note">[21] Daylight-to-daylight footprint ${fmt(right-left)} m</text>`;
    }
    // Datum and level register are separate from the geometry to keep leaders readable.
    svg+=`<line x1="${X(-s.edge)}" x2="${X(s.edge)}" y1="${Y(0)}" y2="${Y(0)}" class="datum-line"/>`;
    svg+=`<rect x="45" y="550" width="350" height="160" rx="4" class="drawing-panel"/><rect x="420" y="550" width="340" height="160" rx="4" class="drawing-panel"/><rect x="785" y="550" width="370" height="160" rx="4" class="drawing-panel"/>`;
    svg+=label(60,575,'OFFSET / FINISHED LEVEL (m)','drawing-heading');
    for(const [i,[name,x]] of [['L shoulder',-s.edge],['L lane edge',-s.half],['Centreline',0],['R lane edge',s.half],['R shoulder',s.edge]].entries()){
      svg+=label(60,600+i*21,name)+label(195,600+i*21,(x>0?'+':'')+fmt(x))+label(275,600+i*21,(s.surface(x)>0?'+':'')+fmt(s.surface(x)));
    }
    svg+=label(435,575,'PAVEMENT / FOUNDATION','drawing-heading')+label(435,600,type.toUpperCase()+' surfacing: '+fmt(s.p.thickness)+' mm')+label(435,623,'Base: '+(values.baseThickness===''?'TO BE ESTABLISHED':fmt(s.p.baseThickness)+' mm'))+label(435,646,'Subbase: '+(values.subbaseThickness===''?'TO BE ESTABLISHED':fmt(s.p.subbaseThickness)+' mm'))+label(435,669,'CL formation level: −'+fmt(s.p.totalThickness/1000)+' m')+label(435,692,'Layer depths applied across platform');
    svg+=label(800,575,'EARTHWORK / OPTIONAL STRUCTURES','drawing-heading')+label(800,600,s.complete?'CUT '+fmt(s.cutArea)+' m²  /  FILL '+fmt(s.fillArea)+' m²':'Daylight tie-ins: TO BE ESTABLISHED')+label(800,623,'EG at L / R shoulder: '+fmt(s.p.leftGround)+' / '+fmt(s.p.rightGround)+' m')+label(800,646,'Drains '+(values.drainage?'ON · schematic':'OFF')+' / Barriers '+(values.barriers?'ON · schematic':'OFF'))+label(800,669,'Median '+(values.medianEnabled?(s.p.medianWidth>0?fmt(s.p.medianWidth)+' m · flush reserve':'ON · TBE'):'OFF')+' / dimensions require design')+label(800,692,'Ground profile requires surveyed section');
    svg+=`<rect x="45" y="730" width="1110" height="50" class="drawing-title-block"/>`;
    svg+=label(60,750,'TYPICAL SECTION · '+(superMode?'SUPERELEVATED · '+values.direction.toUpperCase()+' SIDE LOW':'NORMAL CROWN'),'drawing-heading');
    svg+=label(60,771,'Relative datum: finished CL = 0.00 m · Not to scale; vertical exaggeration · Dimensions govern');
    svg+=label(795,750,'SHOULDERS '+(superMode?'FOLLOW e':'FALL OUTWARD'),'drawing-heading')+label(795,771,'Concept section · Project design required');
    svg+=`<rect x="45" y="800" width="350" height="335" rx="4" class="drawing-panel"/><rect x="420" y="800" width="735" height="335" rx="4" class="drawing-panel"/>`;
    svg+=label(60,824,'[16] PAVEMENT STRUCTURE DETAIL','drawing-heading')+label(60,844,'Enlarged schematic · layer heights not to scale');
    let ly=865;
    const detailLayer=(text,height,fill)=>{svg+=`<rect x="65" y="${ly}" width="115" height="${height}" fill="${fill}" stroke="#536977" stroke-width=".8"/><line x1="180" y1="${ly+height/2}" x2="195" y2="${ly+height/2}" class="term-leader"/>`;svg+=label(205,ly+height/2+4,text);ly+=height;};
    detailLayer((type==='pcc'?'[9] PCC slab ':'[8] ACP surface ')+fmt(s.p.thickness)+' mm',35,type==='pcc'?'url(#pcc-hatch)':'#536977');
    if(values.baseThickness===''||s.p.baseThickness>0)detailLayer('[7] Base '+(values.baseThickness===''?'TBE':fmt(s.p.baseThickness)+' mm'),35,s.p.baseThickness>0?'url(#aggregate-hatch)':'#f3f6f8');else{svg+=label(205,ly+14,'[7] Base omitted (0 mm)');ly+=22;}
    if(values.subbaseThickness===''||s.p.subbaseThickness>0)detailLayer('[6] Subbase '+(values.subbaseThickness===''?'TBE':fmt(s.p.subbaseThickness)+' mm'),35,s.p.subbaseThickness>0?'#ede5d6':'#f3f6f8');else{svg+=label(205,ly+14,'[6] Subbase omitted (0 mm)');ly+=22;}
    detailLayer('[5 / 14] Subgrade',40,'url(#fill-hatch)');
    svg+=label(60,1043,'[4] Selected material / prepared roadbed: TBE')+label(60,1066,'[12] Shoulder base: TO BE ESTABLISHED')+label(60,1089,'[3 / 10] Ditch / ditch slope: TBE')+label(60,1112,'TBE = TO BE ESTABLISHED; not dimensioned');
    svg+=label(435,824,'STRUCTURAL DESIGN TERMINOLOGY · NUMBERED KEY','drawing-heading');
    const terms=['Fill slope','Original ground','Ditch — TBE','Selected material / prepared roadbed — TBE','Subgrade (flexible section)','Subbase','Base course','Surface course (ACP)','Pavement slab (PCC)','Ditch slope — TBE','Cut slope','Shoulder base — TBE','Crown slope / crossfall','Subgrade (rigid section)','Roadbed soil — investigation required','Pavement structure','Shoulder slope','Traffic lanes','Shoulder','Roadway','Roadbed / grading footprint'];
    terms.forEach((term,i)=>{const col=i<11?0:1,row=i<11?i:i-11;svg+=label(435+col*355,850+row*24,(i+1)+'. '+term);});
    svg+=label(435,1126,'Terminology adapted from supplied Figure 1.1; only the selected pavement is modeled.');
    svg+='</svg>';
    $('section-drawing').innerHTML=svg;
    $('section-summary').textContent=s.complete?'Geometric areas to entered formation: Cut '+fmt(s.cutArea)+' m² · Fill '+fmt(s.fillArea)+' m². No volume, shrinkage or bulking allowance.':'Earthwork areas unavailable until both slopes meet the ground.';
    if(values.baseThickness===''||values.subbaseThickness==='')notes.push('Base / subbase thickness is TO BE ESTABLISHED; unentered layers are omitted and earthwork areas are provisional.');
    if(values.drainage||values.barriers)notes.push('Drainage / barrier symbols are schematic; dimensions, location, foundations and earthworks are TO BE ESTABLISHED.');
    if(values.medianEnabled)notes.push('Median is a reserved flush strip; structural profile and median earthworks are TO BE ESTABLISHED. Areas remain provisional.'+(values.medianWidth===''?' Median width is omitted from calculated geometry.':''));
    if(s.p.lanes!==2)notes.push('Lane count describes layout, not capacity; default lane width is half the selected two-lane baseline.');
    const rangeText=[s.left,s.right].filter(Boolean).map(tie=>{const r=TypicalSection.range(values.material,tie.height);return (tie.cut?'Cut':'Fill')+' height '+fmt(tie.height)+' m: '+(r?r.map(fmt).join('–')+'H:1V':'not covered');});
    $('section-slope-guide').textContent='Table 7-1 reference: '+rangeText.join(' · ')+'. Shared height boundaries require review of both bands.';
    $('section-status').textContent=[...s.warnings,...notes].join(' ')||'Section updates with adopted values, or the baseline where an adopted value is blank.';
    $('section-status').classList.toggle('section-warning',notes.length>0||s.warnings.length>0);
  }
  names.forEach(id=>$('section-'+id).addEventListener('input',()=>{touched.add(id);render();}));
  for(const id of ['drainage','barriers','medianEnabled'])$('section-'+id).addEventListener('change',render);
  globalThis.CriteriaSection={update(result,adopted){last={result,adopted};render();},reset(){ touched.clear();$('section-controls').reset(); }};
})();
