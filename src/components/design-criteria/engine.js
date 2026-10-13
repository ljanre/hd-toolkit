/* DPWH DGCS Volume 4 (2015), selected geometric criteria only. */
(() => {
  const source='https://studylib.net/doc/26109499/dgcs-volume-4-compress';
  const baseline={
    primary:{speed:[80,60,50],radius:[220,120,80],grade:[4,5,7],width:6.7,shoulder:2.5,row:30,passing:[560,420,360]},
    secondary:{speed:[70,60,40],radius:[160,120,50],grade:[5,6,8],width:6.1,shoulder:1.5,row:30,passing:[490,420,270]},
    barangay:{speed:[70,50,40],radius:[160,85,50],grade:[6,7,9],width:5.5,shoulder:1,row:30,passing:[490,350,270]},
    fmr:{speed:[60,40,30],radius:[120,55,30],grade:[6,8,10],width:4,shoulder:.5,row:20,passing:[420,270,190]}
  };
  const speeds=[20,30,40,50,60,70,80,90,100,110,120,130];
  const stopping=[20,35,50,65,85,105,130,160,185,220,250,285];
  function build(input){
    const terrain=['level','rolling','mountainous'].indexOf(input.terrain);
    if(terrain<0||!['primary','secondary','tertiary','others'].includes(input.classification))throw Error('Select a road classification and terrain.');
    const key=['primary','secondary'].includes(input.classification)?input.classification:input.otherClass;
    const b=baseline[key]; const rows=[];
    const add=(id,label,value,unit,relation,reference,note='')=>rows.push({id,label,value,unit,relation,reference,note});
    let recommendation=b?.speed[terrain],speedReference='Table 3-1 · p. 3-2';
    if(!b){
      const volume=Number(input.adt);
      if(input.adt!==''&&(!Number.isFinite(volume)||volume<0))throw Error('Design-year ADT must be a nonnegative vehicle count.');
      if(['local','collector'].includes(input.function)&&input.environment==='rural'&&input.adt!==''&&Number.isFinite(volume)&&volume>=0){
        const bins=input.function==='local'?[50,250,400,1500,2000]:[400,2000];
        // Boundaries use the higher band conservatively; collector 2,000 remains in middle band.
        const band=input.function==='collector'?(volume<400?0:volume<=2000?1:2):bins.filter(n=>volume>=n).length;
        const values=input.function==='local'?[[50,50,60,80,80,80],[30,50,50,60,60,60],[30,30,30,50,50,50]]:[[60,80,100],[50,60,80],[30,50,60]];
        recommendation=values[terrain][band];speedReference=`Table 3-${input.function==='local'?6:7} · pp. 3-12–3-13`;
      }
    }
    add('recommendedSpeed','Baseline design speed',recommendation??null,'km/h','min',speedReference,recommendation==null?'Select a rural local/collector function and design-year ADT, or enter an adopted speed.':'Geometric design speed; not a posted speed limit.');
    const adopted=input.speed===''||input.speed==null?recommendation:Number(input.speed);
    const speed=speeds.includes(adopted)?adopted:null;
    if(input.speed!==''&&input.speed!=null&&speed==null)throw Error('Adopted design speed must be a listed value from 20 to 130 km/h.');
    if(b){
      add('radius','Baseline horizontal radius',b.radius[terrain],'m','min','Table 3-1 · p. 3-2',speed!==recommendation?'Baseline only: changed speed requires a separate radius/superelevation check.':'Check adopted superelevation and side friction during alignment design.');
      add('grade','Baseline maximum grade',b.grade[terrain],'%','max','Table 3-1 · p. 3-2','Apply national-road grade restrictions and curve compensation under §3.6.3.');
      add('width','Pavement / travelled-way width',b.width,'m','min','Table 3-1 · p. 3-2',key==='barangay'?'Printed range 5.5–6.0 m; 5.5 m is the lower bound.':'Baseline section; lane capacity and widening require separate review.');
      add('shoulder','Shoulder width · each side',b.shoulder,'m','min','Table 3-1 · p. 3-2');
      add('row','Right-of-way width',b.row,'m','min','Table 3-1 · p. 3-2');
      add('superelevation','Maximum superelevation',8,'%','max','Table 3-1 · p. 3-2');
      add('passing','Baseline passing sight distance',b.passing[terrain],'m','min','Table 3-1 · p. 3-2',speed!==recommendation?'Recheck for changed speed; baseline does not update with an override.':'Two-lane overtaking criterion.');
    } else {
      for(const [id,label,unit] of [['radius','Horizontal radius','m'],['grade','Maximum grade','%'],['width','Travelled-way width','m'],['shoulder','Shoulder width · each side','m'],['row','Right-of-way width','m'],['superelevation','Maximum superelevation','%']])add(id,label,null,unit,'review','§3.6 / §3.7','Project-specific review required; no automatic Primary/Secondary equivalence.');
    }
    add('stopping','Stopping sight distance · level roadway',speed==null?null:stopping[speeds.indexOf(speed)],'m','min','Table 3-8 · p. 3-15','Check graded-road sight distance separately (Table 3-9).');
    return {rows,speed,recommendation,source,classification:input.classification,terrain:input.terrain,changedSpeed:speed!==recommendation};
  }
  function assess(row,value){
    if(value===''||value==null)return 'Not adopted';
    const n=Number(value);if(!Number.isFinite(n)||n<0)return 'Invalid';
    if(row.value==null||row.relation==='review')return 'Project review';
    return (row.relation==='min'?n>=row.value:n<=row.value)?'Meets baseline':'Review departure';
  }
  globalThis.DesignCriteria=Object.freeze({build,assess,speeds:Object.freeze(speeds)});
})();
