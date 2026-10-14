(() => {
  const $=id=>document.getElementById(id),fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
  const names=['condition','superelevation','direction','pavementType','thickness','crossfall','shoulderFall','leftGround','rightGround','cutSlope','fillSlope','material'];
  let last;
  function render(){
    if(!last)return;
    const {result,adopted}=last;
    const read=id=>adopted[id]!==undefined&&adopted[id]!==''?Number(adopted[id]):result.rows.find(r=>r.id===id)?.value;
    const type=$('section-pavementType').value;
    const values=Object.fromEntries(names.map(id=>[id,$('section-'+id).value]));
    const min=type==='pcc'?200:50;
    $('section-thickness-guide').textContent=type==='pcc'?'Table 3-2: PCC ≥200 mm. Final thickness requires pavement design.':'Table 3-2: ACP ≥50 mm (15% of PCC thickness / 25% ACP provision also stated; confirm its application).';
    const superMode=values.condition==='superelevated';
    for(const id of ['superelevation','direction'])$('section-'+id).disabled=!superMode;
    for(const id of ['crossfall','shoulderFall'])$('section-'+id).disabled=superMode;
    const notes=[];
    if(superMode){const limit=read('superelevation');if(!Number.isFinite(limit))notes.push('Adopt a project maximum superelevation in the criteria schedule.');else if(Number(values.superelevation)>limit)notes.push('Superelevation exceeds the schedule maximum of '+fmt(limit)+'%.');if(Number(values.superelevation)===0)notes.push('Zero superelevation produces a level section; check drainage.');}
    if(Number(values.thickness)<min)notes.push('Pavement thickness is below the Table 3-2 minimum.');
    if(!superMode&&(Number(values.crossfall)<1.5||Number(values.crossfall)>2.5))notes.push('Table 3-2: cross slope ≥1.5%; paved-surface guidance 1.5–2.5%. Review the adopted crossfall.');
    let s;
    try{s=TypicalSection.build({...values,width:read('width'),shoulder:read('shoulder')});}
    catch(e){$('section-drawing').replaceChildren();$('section-summary').textContent='';$('section-slope-guide').textContent='';$('section-status').textContent=e.message+' Adopt pavement and shoulder widths in the schedule when no baseline is available.';return;}
    const extent=Math.max(s.edge+3,...s.profile.map(p=>Math.abs(p[0])));
    const sx=460/extent,X=x=>600+x*sx;
    const allY=[...s.profile.map(p=>p[1]),s.ground(-extent),s.ground(extent),0];
    const ymin=Math.min(...allY),ymax=Math.max(...allY),sy=Math.min(85,235/Math.max(1,ymax-ymin)),Y=y=>265+(ymax+ymin)/2*sy-y*sy;
    const coords=pts=>pts.map(([x,y])=>X(x)+','+Y(y)).join(' ');
    const line=(a,b,cl)=>`<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" class="${cl}"/>`;
    function dimension(x1,x2,y,label){return `<path d="M${X(x1)} ${Y(0)-8}V${y-8}M${X(x2)} ${Y(0)-8}V${y-8}" class="extension"/><line x1="${X(x1)}" y1="${y}" x2="${X(x2)}" y2="${y}" class="dimension" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/><text x="${X((x1+x2)/2)}" y="${y-9}" text-anchor="middle" class="dim-label">${label}</text>`;}
    let svg=`<svg viewBox="0 0 1200 560" role="img" aria-labelledby="section-svg-title section-svg-desc"><title id="section-svg-title">Typical two-lane road section with cut and fill</title><desc id="section-svg-desc">Pavement ${fmt(s.p.width)} metres; shoulders ${fmt(s.p.shoulder)} metres each; ${superMode?'superelevation '+fmt(s.p.superelevation):'crossfall '+fmt(s.p.crossfall)} percent; pavement ${fmt(s.p.thickness)} millimetres. ${s.complete?'Cut area '+fmt(s.cutArea)+' and fill area '+fmt(s.fillArea)+' square metres.':'Side slopes need review.'}</desc><defs><marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#536977"/></marker><pattern id="pcc-hatch" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#71818b" stroke-width=".6"/></pattern></defs>`;
    for(const region of s.regions)svg+=`<polygon points="${coords(region.points)}" class="earth-${region.type}"/>`;
    svg+=`<polygon points="${coords([...s.top,...s.formation.slice().reverse()])}" fill="${type==='pcc'?'url(#pcc-hatch)':'#536977'}"/>`;
    svg+=`<polyline points="${coords(s.profile)}" class="formation"/><polyline points="${coords(s.top)}" class="surface"/>`;
    svg+=line([-extent,s.ground(-extent)],[extent,s.ground(extent)],'ground');
    svg+=`<line x1="600" x2="600" y1="135" y2="470" class="centreline"/><text x="600" y="128" text-anchor="middle" class="dim-label">℄</text>`;
    svg+=dimension(-s.half,s.half,53,`TRAVELLED WAY ${fmt(s.p.width)} m`)+dimension(-s.half,0,91,`LANE ${fmt(s.half)} m`)+dimension(0,s.half,91,`LANE ${fmt(s.half)} m`);
    if(s.p.shoulder>0)svg+=dimension(-s.edge,-s.half,53,`SHOULDER ${fmt(s.p.shoulder)} m`)+dimension(s.half,s.edge,53,`SHOULDER ${fmt(s.p.shoulder)} m`);
    for(const d of [-1,1]){
      const x=d*s.half*.5,y=s.surface(x),arrowDirection=superMode?(values.direction==='right'?1:-1):d;
      svg+=`<text x="${X(x)}" y="${Y(y)-25}" text-anchor="middle" class="dim-label">${superMode?'e = '+fmt(s.p.superelevation):fmt(s.p.crossfall)}%</text>`;
      svg+=`<line x1="${X(x-arrowDirection*.35)}" y1="${Y(y)-17}" x2="${X(x+arrowDirection*.35)}" y2="${Y(y)-13}" class="dimension" marker-end="url(#dim-arrow)"/>`;
      if(s.p.shoulder>0){const xx=d*(s.half+s.p.shoulder*.5);svg+=`<text x="${X(xx)}" y="${Y(s.surface(xx))-12}" text-anchor="middle" class="dim-label">${fmt(superMode?s.p.superelevation:s.p.shoulderFall)}%</text>`;}
    }
    // Thickness dimension placed outside the road with a leader to the pavement layer.
    const thicknessX=s.half*.8, thicknessTop=s.surface(thicknessX);
    const ty=Y(thicknessTop-s.p.thickness/2000);
    svg+=`<line x1="${X(thicknessX)}" x2="${X(thicknessX)}" y1="${Y(thicknessTop)}" y2="${Y(thicknessTop-s.p.thickness/1000)}" class="dimension" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/>`;
    svg+=`<path d="M${X(s.half*.8)} ${ty}L${X(s.edge)+30} 410H${X(s.edge)+70}" class="extension"/><text x="${X(s.edge)+35}" y="435" class="dim-label">${type.toUpperCase()} ${fmt(s.p.thickness)} mm</text>`;
    for(const [key,label] of [['left','LEFT'],['right','RIGHT']]){
      const tie=s[key];if(!tie)continue;
      const direction=key==='left'?-1:1,x=direction*s.edge;
      const rr=TypicalSection.range(values.material,tie.height);
      if(!rr)notes.push(label+': material / height is outside the supplied Table 7-1 bands.');
      else if(tie.ratio<rr[0]||tie.ratio>rr[1])notes.push(label+': adopted slope '+fmt(tie.ratio)+':1 is outside Table 7-1 range '+rr.map(fmt).join('–')+':1.');
      const at=X((x+tie.point[0])/2),yy=Y((s.surface(x)-s.p.thickness/1000+tie.point[1])/2);
      svg+=`<text x="${at}" y="${yy+(tie.cut?-26:32)}" text-anchor="middle" class="slope-label">${tie.cut?'CUT':'FILL'} ${fmt(tie.ratio)}H:1V</text>`;
      const dimX=X(x)+direction*18;
      svg+=`<line x1="${dimX}" x2="${dimX}" y1="${Y(s.surface(x)-s.p.thickness/1000)}" y2="${Y(s.ground(x))}" class="dimension"/><text x="${dimX+direction*10}" y="${(Y(s.surface(x)-s.p.thickness/1000)+Y(s.ground(x)))/2}" text-anchor="${direction<0?'end':'start'}" class="dim-label">h=${fmt(tie.height)} m</text>`;
    }
    svg+=`<text x="95" y="500" class="dim-label">FINISHED CENTRELINE = 0.00 m · Ground elevations relative to this datum</text><text x="95" y="526" class="dim-label">Horizontal and vertical scales differ · ${superMode?'SUPERELEVATED · '+values.direction.toUpperCase()+' SIDE LOW · SHOULDERS FOLLOW e':'Two-lane crowned section'} · Dimensions govern</text></svg>`;
    $('section-drawing').innerHTML=svg;
    $('section-summary').textContent=s.complete?'Geometric areas to formation: Cut '+fmt(s.cutArea)+' m² · Fill '+fmt(s.fillArea)+' m². No volume, shrinkage or bulking allowance.':'Earthwork areas unavailable until both slopes meet the ground.';
    const rangeText=[s.left,s.right].filter(Boolean).map(tie=>{const r=TypicalSection.range(values.material,tie.height);return (tie.cut?'Cut':'Fill')+' height '+fmt(tie.height)+' m: '+(r?r.map(fmt).join('–')+'H:1V':'not covered');});
    $('section-slope-guide').textContent='Table 7-1 reference: '+rangeText.join(' · ')+'. Shared height boundaries require review of both bands.';
    $('section-status').textContent=[...s.warnings,...notes].join(' ')||'Section updates with adopted values, or the baseline where an adopted value is blank.';
    $('section-status').classList.toggle('section-warning',notes.length>0||s.warnings.length>0);
  }
  names.forEach(id=>$('section-'+id).addEventListener('input',render));
  globalThis.CriteriaSection={update(result,adopted){last={result,adopted};render();},reset(){ $('section-controls').reset(); }};
})();
