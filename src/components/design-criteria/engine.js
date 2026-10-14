/* Verified against the user's DGCS Volume 4 (2015), printed pp. 1-9–1-11, 3-1–3-17. */
(() => {
  const source='https://studylib.net/doc/26109499/dgcs-volume-4-compress';
  const table={
    primary:{minimum:{speed:[80,60,50],radius:[220,120,80],grade:[4,5,7],width:6.7,shoulder:2.5,row:30,nonpassing:[115,70,60],passing:[560,420,360]},desirable:{speed:[95,80,60],radius:[320,220,120],grade:[3,5,6],width:6.7,shoulder:3,row:30,nonpassing:[150,115,70],passing:[645,560,420]}},
    secondary:{minimum:{speed:[70,60,40],radius:[160,120,50],grade:[5,6,8],width:6.1,shoulder:1.5,row:30,nonpassing:[90,70,40],passing:[490,420,270]},desirable:{speed:[90,80,50],radius:[280,220,80],grade:[3,5,6],width:6.1,shoulder:2,row:30,nonpassing:[135,115,60],passing:[615,560,350]}},
    expressway:{minimum:{speed:[90,70,60],radius:[260,160,100],grade:[4,5,7],width:6.7,shoulder:3,row:60,nonpassing:[135,90,70],passing:[615,490,420]},desirable:{speed:[100,90,70],radius:[350,280,160],grade:[3,4,5],width:7.3,shoulder:3,row:60,nonpassing:[160,135,90],passing:[675,615,490]}},
    barangay:{minimum:{speed:[70,50,40],radius:[160,85,50],grade:[6,7,9],width:5.5,shoulder:1,row:30,nonpassing:[90,60,40],passing:[490,350,270]}},
    fmr:{minimum:{speed:[60,40,30],radius:[120,55,30],grade:[6,8,10],width:4,shoulder:.5,row:20,nonpassing:[70,40,40],passing:[420,270,190]}}
  };
  const system={primary:[6.7,20,6,'§1.5.5.1 · p. 1-9'],secondary:[6.7,20,6,'§1.5.5.1 · p. 1-9'],tertiary:[6.7,20,6,'§1.5.5.1 · p. 1-9'],provincial:[6.1,15,6,'§1.5.5.2 · p. 1-9'],city:[6.1,15,6,'§1.5.5.3 · p. 1-10'],municipal:[6.1,15,6,'§1.5.5.4 · p. 1-10'],barangay:[4,10,10,'§1.5.5.5 · p. 1-10'],fmr:[4,6,10,'§1.5.5.7 · pp. 1-10–1-11']};
  const speeds=[20,30,40,50,60,70,80,90,95,100,110,120,130];
  const ssd=new Map([[20,20],[30,35],[40,50],[50,65],[60,85],[70,105],[80,130],[90,160],[100,185],[110,220],[120,250],[130,285]]);
  const psd=new Map([[30,120],[40,140],[50,160],[60,180],[70,210],[80,245],[90,280],[100,320],[110,355],[120,395],[130,440]]);
  const grades={
    localRural:{speeds:[20,30,40,50,60,70,80,90,100],values:[[9,8,7,7,7,7,6,6,5],[12,11,11,10,10,9,8,7,6],[17,16,15,14,13,12,10,10,null]],table:27},
    collectorRural:{speeds:[30,40,50,60,70,80,90,100],values:[[7,7,7,7,7,6,6,5],[10,10,9,8,8,7,7,6],[12,11,10,10,10,9,9,8]],table:28},
    collectorUrban:{speeds:[30,40,50,60,70,80,90,100],values:[[9,9,9,9,8,7,7,6],[12,12,11,10,9,8,8,7],[14,13,12,12,11,10,10,9]],table:29},
    arterialRural:{speeds:[60,70,80,90,100,110,120,130],values:[[5,5,4,4,3,3,3,3],[6,6,5,5,4,4,4,4],[8,7,7,6,6,5,5,5]],table:30},
    arterialUrban:{speeds:[50,60,70,80,90,100],values:[[8,7,6,6,5,5],[9,8,7,7,6,6],[11,10,9,9,8,8]],table:31},
    expressway:{speeds:[80,90,100,110,120,130],values:[[4,4,3,3,3,3],[5,5,4,4,4,4],[6,6,6,5,null,null]],table:32}
  };
  const names={primary:'National Primary',secondary:'National Secondary',tertiary:'National Tertiary',provincial:'Provincial',city:'City',municipal:'Municipal',barangay:'Barangay',fmr:'Farm-to-Market',tourism:'Tourism',expressway:'Expressway',parkway:'Parkway',unclassified:'Unclassified / conversion subject',others:'TO BE ESTABLISHED / verify classification'};
  function build(input){
    const terrain=['level','rolling','mountainous'].indexOf(input.terrain),classification=input.classification;
    if(terrain<0||!names[classification])throw Error('Select a road classification and terrain.');
    let basis=input.basis||'auto';
    if(!['auto','table','system','functional'].includes(basis))throw Error('Select a prescribed criteria basis.');
    const family=input.designFamily||'auto';if(!['auto','tourism','fmr','parkway'].includes(family))throw Error('Select a valid design family.');
    const designClass=family==='auto'?classification:family;
    const legacy=designClass==='others'&&['barangay','fmr'].includes(input.otherClass)?input.otherClass:designClass;
    if(basis==='auto')basis=designClass==='parkway'?'functional':table[legacy]||designClass==='tourism'?'table':system[classification]&&classification!=='tertiary'?'system':'functional';
    const level=input.standardLevel||'minimum';if(!['minimum','desirable'].includes(level))throw Error('Select minimum or desirable criteria.');
    const b=basis==='table'?(table[legacy]?.[level]||table[legacy]?.minimum):null;
    const tourism=basis==='table'&&designClass==='tourism';
    if(basis==='table'&&!b&&!tourism)throw Error('This classification has no dedicated Table 3-1 or 3-2 column. Select road-system or functional criteria.');
    if(basis==='system'&&!system[classification])throw Error('No unambiguous road-system baseline is available for this selection; choose another basis.');
    const rows=[],warnings=[];
    const add=(id,label,value,unit,relation,reference,note='')=>rows.push({id,label,value,unit,relation,reference,note});
    const national=['primary','secondary','tertiary'].includes(classification);
    if(family!=='auto')warnings.push('Selected '+family+' design family does not reclassify the road under D.O.112, s.2024.');
    if(national)warnings.push('Classification definitions follow D.O.112, s.2024. DGCS geometric criteria remain a separate design basis; Tertiary has no dedicated Table 3-1 column.');
    if(basis==='system')warnings.push('Chapter 1 system values are shown explicitly. Table 3-1 gives different category values; confirm the governing project basis rather than combining them.');
    if(basis==='table'&&!tourism){const band={fmr:'under 200',barangay:'200–400',secondary:'400–1,000',primary:'1,000–2,000',expressway:'over 2,000'}[legacy];warnings.push('Table 3-1 selected column ADT: '+band+' vehicles/day. This older schedule reproduces 1984 standards and excludes tourism; the volume band does not reclassify a road automatically.');}
    if(b&&classification==='expressway')warnings.push('§3.1 requires at least two 3.6 m through lanes per direction with continuous paved shoulders. Table 3-1 widths are reproduced separately; do not interpret them as a complete divided-road section. §3.4 specifies expressway speed ≥80 km/h.');
    let recommendation=b?.speed[terrain]??(tourism?[60,40,30][terrain]:null),speedReference=tourism?'Table 3-2 · p. 3-3':'Table 3-1 · p. 3-2';
    const volumeMissing=input.adt===''||input.adt==null,volume=Number(input.adt);
    if(!volumeMissing&&(!Number.isFinite(volume)||volume<0))throw Error('Design-year ADT must be a nonnegative vehicle count.');
    const fn=classification==='expressway'?'expressway':designClass==='parkway'?'parkway':input.function;
    if(basis==='system')speedReference='§3.4 · p. 3-12';
    if(basis==='functional'){
      if(fn==='expressway')recommendation=80;
      speedReference='§3.4 · p. 3-12';
      if(['local','collector'].includes(fn)&&input.environment==='rural'&&!volumeMissing){
        const band=fn==='collector'?(volume<400?0:volume<=2000?1:2):[50,250,400,1500,2000].filter(n=>volume>=n).length;
        const values=fn==='local'?[[50,50,60,80,80,80],[30,50,50,60,60,60],[30,30,30,50,50,50]]:[[60,80,100],[50,60,80],[30,50,60]];
        recommendation=values[terrain][band];speedReference=`Table 3-${fn==='local'?6:7} · pp. 3-12–3-13`;
        if(volume===400&&fn==='collector')warnings.push('ADT 400 is a shared printed boundary; the higher design-speed band is selected.');
      }
      warnings.push('Functional criteria depend on speed, design volume and environment; no administrative-class equivalence is assumed. In villages §3.4 limits design speed to 50 or 30 km/h according to pedestrian conditions.');
    }
    add('recommendedSpeed','Baseline design speed',recommendation,'km/h','min',speedReference,recommendation==null?'Adopt a speed after checking §3.4 ranges and project conditions.':'A geometric design control, not a posted limit.');
    const adopted=input.speed===''||input.speed==null?recommendation:Number(input.speed),speed=speeds.includes(adopted)?adopted:null;
    if(input.speed!==''&&input.speed!=null&&speed==null)throw Error('Adopted speed must be one of the listed values (20–130 km/h, including 95).');
    if(b){
      const ref='Table 3-1 · p. 3-2 · '+(table[legacy].desirable?level:'single column');
      for(const [id,label,unit,relation] of [['radius','Baseline horizontal radius','m','min'],['grade','Baseline maximum grade','%','max'],['width','Pavement / travelled-way width','m','min'],['shoulder','Shoulder width · each side','m','min'],['row','Right-of-way width','m','min'],['nonpassing','Baseline non-passing sight distance','m','min'],['passing','Baseline passing sight distance','m','min']]){
        const value=Array.isArray(b[id])?b[id][terrain]:b[id];
        add(id,label,value,unit,relation,ref,id==='width'&&legacy==='barangay'?'Printed pavement-width range 5.5–6.0 m; lower limit shown.':['radius','grade','nonpassing','passing'].includes(id)&&speed!==recommendation?'Printed baseline only; recheck for the adopted speed.':'');
      }
      add('superelevation','Maximum superelevation',8,'%','max',ref);
    } else if(tourism){
      const ref='Table 3-2 · p. 3-3';
      for(const [id,label,value,unit,relation,note=''] of [
        ['width','Pavement / travelled-way width',6.1,'m','min','Two lanes.'],['shoulder','Shoulder width · each side',1.5,'m','min','Minimum gravel surfacing.'],['radius','Horizontal radius',50,'m','min'],['reverseTangent','Tangent between reverse curves',30,'m','min'],['verticalLength','Vertical curve length',60,'m','min'],['grade','Maximum longitudinal grade',12,'%','max'],['cutGrade','Minimum grade on cut sections',.5,'%','min'],['pccThickness','PCC pavement thickness',230,'mm','min','Prescribed 230 mm, not 200 mm from the earlier screenshot. Final pavement design remains required.'],['acpThickness','ACP pavement thickness',50,'mm','min'],['pccCrossfall','PCC roadway cross slope',1.5,'%','target'],['acpCrossfall','ACP roadway cross slope',2,'%','target'],['pipeDiameter','Minimum pipe drainage diameter',910,'mm','min'],['boxFlood','Box culvert design flood',25,'years','min','Freeboard to contain the 50-year flood.'],['pipeFlood','Pipe culvert design flood',15,'years','min','Freeboard to contain the 25-year flood.']])add(id,label,value,unit,relation,ref,note);
      add('superelevation','Maximum superelevation',null,'%','review','§3.6.2 · pp. 3-20–3-29','Table 3-2 does not prescribe a maximum; adopt a project rate.');
      add('row','Right-of-way width',null,'m','review','§1.5.5.6 · p. 1-10','Printed tourism ROW is 2.10 m, narrower than its 6.10 m travelled way. Do not use this inconsistent value as a design criterion; verify with DPWH.');
      warnings.push('Tourism Table 3-2 only: common-material cut slope 1.5:1–1:1; soft/rippable rock 0.5:1–1:1; hard/solid rock 0.25:1 or natural break. Protection as needed; safety devices per DPWH Highway Safety Design Standards Part 2 (May 2012).');
    } else if(basis==='system'){
      const [width,row,grade,ref]=system[classification];
      add('width','Pavement / travelled-way width',width,'m','min',ref);add('row','Right-of-way width',row,'m','min',ref);add('grade','Maximum grade',grade,'%','max',ref);
      for(const [id,label,unit] of [['radius','Horizontal radius','m'],['shoulder','Shoulder width · each side','m'],['superelevation','Maximum superelevation','%']])add(id,label,null,unit,'review',ref,'Not specified in this classification provision.');
    } else {
      let width=null,shoulder=null,ref='§3.1 / §3.4 · pp. 3-1, 3-12';
      if(input.environment==='rural'&&!volumeMissing&&speed!=null){
        const band=volume<400?0:volume<1500?1:volume<=2000?2:3;
        if(['local','collector'].includes(fn)&&speed>=20&&speed<=100&&speed!==95){
          const local=fn==='local';ref=`Table 3-${local?3:4} · p. 3-10`;
          const values=local?(speed===20?[5.4,6,6,6.6]:speed<=60?[5.4,6,6.6,7.2]:speed<=80?[6,6.6,6.6,7.2]:[6.6,6.6,7.2,7.2]):speed<=50?[6,6,6.6,7.2]:speed<=80?[6,6.6,6.6,7.2]:[6.6,6.6,7.2,7.2];
          width=values[band];shoulder=[.6,1.5,1.8,2.4][band];
          if(local&&input.terrain==='mountainous'&&volume>=400&&volume<=600){width=5.4;shoulder=.6;}
          else if(local&&band===1&&speed>60)shoulder=Math.max(shoulder,(9-width)/2);
          warnings.push('Rural width-table reconstruction and shoulder-reduction exceptions require project review; they are not applied automatically.');
        } else if(fn==='arterial'&&speed>=60&&speed!==95){
          ref='Table 3-5 · p. 3-11';width=(speed>=100||speed>=80&&band>=2||band===3)?7.2:6.6;shoulder=[1.2,1.8,1.8,2.4][band];
        }
      }
      add('width','Pavement / travelled-way width',width,'m',width==null?'review':'min',ref);
      add('shoulder','Shoulder width · each side',shoulder,'m',shoulder==null?'review':'min',ref);
      for(const [id,label,unit] of [['radius','Horizontal radius','m'],['row','Right-of-way width','m'],['superelevation','Maximum superelevation','%']])add(id,label,null,unit,'review','§3.6 / §3.7','Project-specific alignment / cross-section review required.');
      const g=grades[fn==='expressway'?'expressway':fn+(input.environment==='urban'?'Urban':'Rural')];
      const grade=g?.values[terrain][g.speeds.indexOf(speed)]??null;
      add('grade','Maximum grade · functional recommendation',grade,'%','max',g?`Table 3-${g.table} · p. 3-${g.table<30?40:41}`:'§3.6.3 · p. 3-39','No short-grade / low-volume relaxation is assumed. National-road permissions and curve compensation apply separately.');
      if(fn==='expressway')warnings.push('Expressway capacity, divided-section geometry and paved shoulders require a separate section design; minimum two 3.6 m lanes per direction (§3.1).');
      if(fn==='arterial')warnings.push('§3.4 arterial speed range: rural 60–120 km/h; urban 50–100 km/h, with context-specific exceptions.');
    }
    add('stopping','Stopping sight distance · level roadway',ssd.get(speed)??null,'m','min','Table 3-8 · p. 3-15',speed===95?'95 km/h is not tabulated; no interpolation is assumed. Table 3-1 non-passing value remains separately identified.':'Separate from Table 3-1 non-passing sight distance; graded-road checks use Table 3-9.');
    if(basis==='functional')add('passing','Passing sight distance · two-lane highway',psd.get(speed)??null,'m','min','Table 3-11 · p. 3-17','Not the older Table 3-1 passing-distance schedule.');
    return {rows,speed,recommendation,source,classification,terrain:input.terrain,changedSpeed:speed!==recommendation,basis,tourism,designClass,standardLevel:level,warnings,sectionApplicable:classification!=='expressway'&&!(basis==='functional'&&fn==='expressway'),basisLabel:basis==='table'?(tourism?'Tourism · Table 3-2':'Table 3-1 · '+(table[legacy].desirable?level:'single column')):basis==='system'?'Road-system classification · §1.5.5':'Functional design · §§3.1–3.6'};
  }
  function assess(row,value){
    if(value===''||value==null)return 'Not adopted';const n=Number(value);if(!Number.isFinite(n)||n<0)return 'Invalid';
    if(row.value==null||row.relation==='review')return 'Project review';
    return (row.relation==='min'?n>=row.value:row.relation==='max'?n<=row.value:Math.abs(n-row.value)<1e-9)?'Meets baseline':'Review departure';
  }
  globalThis.DesignCriteria=Object.freeze({build,assess,speeds:Object.freeze(speeds)});
})();
