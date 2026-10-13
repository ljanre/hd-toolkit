(() => {
  const classes=['Motorcycle','Passenger Car','Passenger Utility','Goods Utility','Small Bus','Large Bus','Rigid Truck 2 Axle','Rigid Truck 3+ Axle','Truck Semi-Trailer 5+ Axle','Truck Trailer 5+ Axle'];
  const suppliedGrowth=[2.334,1.932,1.851,1.932,1.932,1.851,1.851,1.851,1.851,1.851];
  function calculate(rows){
    if(!rows.length)throw new Error('Enter at least one complete AADT row.');
    const totals=Array(10).fill(0),rowTotals=[];
    for(const row of rows){
      if(row.length!==10||row.some(value=>typeof value!=='number'||!Number.isFinite(value)||value<0))throw new Error('Enter a nonnegative AADT for every vehicle class. Enter 0 when none apply.');
      row.forEach((value,i)=>totals[i]+=value);rowTotals.push(row.reduce((a,b)=>a+b,0));
    }
    const total=totals.reduce((a,b)=>a+b,0);
    if(!Number.isFinite(total))throw new Error('The combined traffic exceeds the numeric range.');
    return {totals,rowTotals,total};
  }
  function cesal({aadt,rates,factors,years,delay,dd,dl,preview=false}){
    calculate([aadt]);
    if(!Number.isInteger(years)||years<1||years>100)throw new Error('Enter a design period from 1 to 100 whole years.');
    if(!Number.isInteger(delay)||delay<0||delay>100)throw new Error('Enter 0–100 whole years from the traffic survey to opening.');
    if(!Number.isFinite(dd)||dd<=0||dd>1||!Number.isFinite(dl)||dl<=0||dl>1)throw new Error('DD and DL must be fractions greater than 0 and at most 1.');
    if(rates.length!==10||factors.length!==10)throw new Error('Provide ten growth rates and vehicle factors.');
    const detail=aadt.map((value,i)=>{
      if(value===0)return {opening:0,growth:null,vehicles:0,esal:0};
      if(!Number.isFinite(rates[i])||rates[i]<=-100)throw new Error('Enter annual growth greater than −100% for every class with traffic.');
      const missing=Number.isNaN(factors[i])&&preview;
      if(!missing&&(!Number.isFinite(factors[i])||factors[i]<0))throw new Error('Enter a nonnegative ESAL/vehicle factor for every class with traffic.');
      const r=rates[i]/100,log=Math.log1p(r),growth=r===0?years:Math.expm1(years*log)/r;
      const opening=value*Math.exp(delay*log),vehicles=365*opening*growth*dd*dl,esal=missing?null:vehicles*factors[i];
      return {opening,growth,vehicles,esal};
    });
    const complete=detail.every(item=>item.esal!==null),sum=detail.reduce((sum,item)=>sum+(item.esal??0),0);
    const vehicles=detail.reduce((sum,item)=>sum+item.vehicles,0);
    if(!Number.isFinite(sum)||!Number.isFinite(vehicles))throw new Error('Forecast exceeds the numeric range. Reduce inputs.');
    const pendingClasses=detail.filter(item=>item.esal===null).length;
    const completedClasses=detail.filter((item,i)=>aadt[i]>0&&item.esal!==null).length;
    return {detail,total:complete?sum:null,million:complete?sum/1e6:null,subtotal:sum,subtotalMillion:sum/1e6,pendingClasses,completedClasses,vehicles,complete};
  }
  function axleFactor(text){
    if(!text.trim())return NaN;
    const loads=text.trim().split(/[\s,;]+/).map(Number);
    if(loads.length>20||loads.some(value=>!Number.isFinite(value)||value<0)||!loads.some(value=>value>0))throw new Error('Enter 1–20 axle loads in metric tonnes, separated by commas. At least one load must be positive.');
    const factor=loads.reduce((sum,load)=>sum+Math.pow(load/8.2,4),0);
    if(!Number.isFinite(factor))throw new Error('Axle loads exceed the numeric range.');
    return factor;
  }
  globalThis.DesignTraffic={classes,suppliedGrowth,calculate,cesal,axleFactor};
})();
