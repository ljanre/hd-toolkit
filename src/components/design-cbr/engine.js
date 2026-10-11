/* Design formulas and lookup tables transcribed from the supplied screenshots. */
(() => {
  const coefficients=[null,null,1.41,1.91,2.24,2.48,2.67,2.83,2.96,3.08,3.18];
  const sampleTable=[[5,3],[10,3],[15,4],[20,5],[25,7],[30,8],[35,11],[40,13],[45,16],[50,19],[55,22],[60,26],[65,30],[70,40]];
  function parse(text){
    if(!text.trim())return [];
    const tokens=text.trim().split(/[\s,;]+/);
    if(tokens.length>1000)throw new Error('Use up to 1,000 CBR values per calculation.');
    return tokens.map((token,i)=>{if(!/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)||!Number.isFinite(Number(token)))throw new Error(`CBR value ${i+1} is not a valid nonnegative number.`);return Number(token);});
  }
  function calculate(values,method='statistical'){
    if(!['statistical','range'].includes(method))throw new Error('Select a supported design method.');
    if(values.length<2)return null;
    if(values.length>1000||values.some(v=>!Number.isFinite(v)||v<0))throw new Error('Use 2–1,000 finite, nonnegative CBR values.');
    const n=values.length,sum=values.reduce((a,b)=>a+b,0),mean=sum/n;
    const deviations=values.map(v=>v-mean),sumSquares=deviations.reduce((a,b)=>a+b*b,0);
    const s=Math.sqrt(sumSquares/(n-1));
    if(!Number.isFinite(mean)||!Number.isFinite(s)||mean<=0)throw new Error('Samples must have a finite positive mean and finite standard deviation.');
    const cv=100*s/mean,min=Math.min(...values),max=Math.max(...values),c=coefficients[Math.min(n,10)];
    const statistical=mean-2*s/3,range=mean-(max-min)/c;
    const design=method==='statistical'?statistical:range;
    const required=sampleTable.find(([threshold])=>cv<=threshold+1e-10);
    return {n,sum,mean,s,sumSquares,cv,min,max,c,statistical,range,design,method,deviations,
      usable:design>0,sampleRequirement:required?{threshold:required[0],minimum:required[1],met:n>=required[1]}:null};
  }
  function modulus(cbr,method,confirmed=false){
    if(!Number.isFinite(cbr)||cbr<=0)return null;
    if(method==='linear'){if(!confirmed||cbr>10)return null;return {psi:1500*cbr,mpa:1500*cbr*.00689476,method};}
    if(method!=='power')throw new Error('Select a supported MR correlation.');
    const psi=2555*cbr**.64;return {psi,mpa:psi*.00689476,method};
  }
  globalThis.DesignCBRCalculation=Object.freeze({parse,calculate,modulus,coefficients,sampleTable});
})();
