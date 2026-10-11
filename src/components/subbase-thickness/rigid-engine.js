/* Road Note 29 (1970), §6.3 paras 47–48 and Table 5. Separate from Figure 6. */
(function(root){
  function calculate({cbr,construction,frost,slab}){
    if(!Number.isFinite(cbr)||cbr<0||cbr>100)throw new Error('Enter a subgrade design CBR between 0 and 100%.');
    if(!['none','risk'].includes(construction))throw new Error('Select the construction-traffic condition.');
    if(!['none','susceptible'].includes(frost))throw new Error('Select the frost condition.');
    if(frost==='susceptible'&&(!Number.isFinite(slab)||slab<=0||slab>1000))throw new Error('Enter the designed concrete slab thickness for the frost check (greater than 0, up to 1000 mm).');
    const classification=cbr<=2?'Weak':cbr>=15?'Very stable':'Normal';
    const base=classification==='Weak'?150:classification==='Normal'?80:0;
    const constructionAddition=construction==='risk'&&classification!=='Very stable'?(cbr<=4?150:80):0;
    const structural=base+constructionAddition;
    const frostMinimum=frost==='susceptible'?Math.max(0,450-slab):0;
    const required=Math.max(structural,frostMinimum);
    const adopted=required;
    return {cbr,classification,base,constructionAddition,structural,frostMinimum,required,adopted,slab,frost,construction};
  }
  root.RigidSubbase={calculate};
})(globalThis);
