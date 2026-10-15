/* AASHTO 1993 / DPWH Roads Manual 2017, Eq. 2-1. D values are mm at the interface. */
(()=>{
  const reliabilityTable=[[50,0],[60,-.253],[70,-.524],[75,-.674],[80,-.841],[85,-1.037],[90,-1.282],[91,-1.340],[92,-1.405],[93,-1.476],[94,-1.555],[95,-1.645],[96,-1.751],[97,-1.881],[98,-2.054],[99,-2.327],[99.9,-3.090],[99.99,-3.750]];
  function z(r){if(!Number.isFinite(r)||r<50||r>99.99)throw Error('Reliability must be 50–99.99%.');for(let i=1;i<reliabilityTable.length;i++){const [hi,b]=reliabilityTable[i],[lo,a]=reliabilityTable[i-1];if(r<=hi)return a+(b-a)*(r-lo)/(hi-lo);}return -3.75;}
  function logCapacity(sn,p,mr=p.mr){return z(p.r)*p.so+9.36*Math.log10(sn+1)-.20+Math.log10((p.p0-p.pt)/2.7)/(.40+1094/(sn+1)**5.19)+2.32*Math.log10(mr)-8.07;}
  function solve(p,mr=p.mr){const target=Math.log10(p.w);if(logCapacity(0,p,mr)>=target)return 0;let lo=0,hi=1;while(logCapacity(hi,p,mr)<target&&hi<32)hi*=2;if(logCapacity(hi,p,mr)<target)throw Error('Required SN is outside the solver range (0–32).');for(let i=0;i<90;i++){const mid=(lo+hi)/2;if(logCapacity(mid,p,mr)<target)lo=mid;else hi=mid;}return (lo+hi)/2;}
  const labels={w:'CESAL W18',r:'Reliability',so:'Overall Standard Deviation',p0:'Initial Serviceability',pt:'Terminal Serviceability',years:'Design Period',mr:'Subgrade Resilient Modulus',baseMr:'Base Resilient Modulus',subMr:'Subbase Resilient Modulus',a1:'Asphalt Layer Coefficient',a2:'Base Layer Coefficient',a3:'Subbase Layer Coefficient',m2:'Base Drainage Coefficient',m3:'Subbase Drainage Coefficient',d2:'Base Thickness',d3:'Subbase Thickness',increment:'Rounding Increment'};
  function calculate(p){
    const errors=[];for(const [key,label] of Object.entries(labels))if(!Number.isFinite(p[key]))errors.push('Enter '+label+'.');
    if(!p.auto&&!Number.isFinite(p.d1))errors.push('Enter Asphalt Thickness.');
    if(errors.length)return {errors};
    const check=(key,min,max)=>{if(p[key]<min||p[key]>max)errors.push(labels[key]+' must be '+min+'–'+max+'.');};
    check('w',1,1e12);check('r',50,99.99);check('so',.35,.50);check('p0',1.5,4.2);check('pt',1.5,4.2);check('years',1,100);
    if(!Number.isInteger(p.years))errors.push('Design Period must be a whole number of years.');
    if(p.p0<=p.pt)errors.push('Initial Serviceability must exceed Terminal Serviceability.');
    for(const key of ['mr','baseMr','subMr'])check(key,1000,1000000);
    if(p.baseMr<p.subMr||p.subMr<p.mr)errors.push('Material support must increase upward: base MR ≥ subbase MR ≥ subgrade MR.');
    for(const key of ['a1','a2','a3'])check(key,.01,1);
    if(p.a1<p.a2||p.a2<p.a3)errors.push('Layer coefficients must decrease from asphalt to base to subbase.');
    for(const key of ['m2','m3'])check(key,1,1.4);
    for(const key of ['d2','d3'])check(key,1,2000);
    check('increment',1,100);
    if(!p.auto&&(p.d1<=0||p.d1>2000))errors.push('Asphalt Thickness must be greater than 0 and at most 2,000 mm.');
    if(errors.length)return {errors};
    try{
      const required=solve(p),sn1=solve(p,p.baseMr),sn2=solve(p,p.subMr),base=p.a2*p.m2*p.d2/25.4,sub=p.a3*p.m3*p.d3/25.4;
      const rawD1=Math.max(sn1, sn2-base, required-base-sub,0)/p.a1*25.4;
      const d1=p.auto?Math.max(p.increment,Math.ceil((rawD1-1e-9)/p.increment)*p.increment):p.d1;
      const surface=p.a1*d1/25.4,sn=surface+base+sub;
      const checks=[surface>=sn1-1e-9,surface+base>=sn2-1e-9,sn>=required-1e-9];
      if(d1>2000)return {errors:['Required asphalt thickness exceeds 2,000 mm. Review traffic, support and adopted granular layers.']};
      return {errors:[],required,sn1,sn2,rawD1,d1,base,sub,surface,sn,checks,pass:checks.every(Boolean),z:z(p.r),delta:p.p0-p.pt,capacity:10**logCapacity(sn,p)};
    }catch(error){return {errors:[error.message]};}
  }
  globalThis.FlexibleCalc={z,logCapacity,solve,calculate};
})();
