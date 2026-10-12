/* FHWA NHI-05-037, Eq. 5.22. A separate published model, not an extension
 * of the digitized chart curves. Outside-chart applicability is unvalidated. */
(() => {
  const source='https://www.fhwa.dot.gov/engineering/geotech/pubs/05037/05c.cfm';
  function evaluate({DSB,ESB,MR}){
    if(![DSB,ESB,MR].every(v=>Number.isFinite(v)&&v>0))return null;
    const d=Math.log(DSB),e=Math.log(ESB),m=Math.log(MR);
    const value=Math.exp(-2.807+.1253*d*d+1.062*m+.1282*d*e-.4114*d-.0581*e-.1317*d*m);
    return Number.isFinite(value)&&value>0?value:null;
  }
  function calculate(inputs){
    const chart=SubgradeCalculation.calculate(inputs);
    if(chart.result!==null||Object.values(inputs).some(v=>v===null))return chart;
    const result=evaluate(inputs);
    if(result===null)return chart;
    return {...chart,result,range_status:'EQUATION_OUTSIDE_CHART',input_status:{DSB:'VALID',ESB:'VALID',MR:'VALID'},
      estimated_uncertainty:null,graphical_overlay:null,trace:{RESULT_SOURCE:'FHWA_EQ_5_22',EXTRAPOLATION_USED:false},
      method:'FHWA_NHI_05_037_EQUATION_5_22',source,
      limitation:'Published equation evaluated outside the printed chart; applicability and uncertainty beyond its scales are not validated.'};
  }
  function plot(inputs){
    const value=evaluate(inputs);if(value===null)return '';
    const fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:2});
    const lo=Math.floor(Math.log10(Math.min(100,inputs.MR/10))),hi=Math.ceil(Math.log10(Math.max(100000,inputs.MR*2)));
    const points=Array.from({length:81},(_,i)=>{const mr=10**(lo+(hi-lo)*i/80);return [mr,evaluate({...inputs,MR:mr})];});
    if(points.some(p=>p[1]===null))return '';
    const yl=Math.floor(Math.log10(Math.min(...points.map(p=>p[1])))),yh=Math.ceil(Math.log10(Math.max(...points.map(p=>p[1]))))+1;
    const x=n=>70+(Math.log10(n)-lo)/(hi-lo)*570,y=n=>275-(Math.log10(n)-yl)/(yh-yl)*210;
    let grid='';for(let i=lo;i<=hi;i++)grid+='<path d="M'+x(10**i)+' 65V275"/><text x="'+x(10**i)+'" y="295">'+fmt(10**i)+'</text>';
    for(let i=yl;i<=yh;i++)grid+='<path d="M70 '+y(10**i)+'H640"/><text x="45" y="'+(y(10**i)+4)+'">'+fmt(10**i)+'</text>';
    const px=x(inputs.MR),py=y(value);
    return '<svg viewBox="0 0 700 335" role="img" aria-label="Equation 5.22 composite subgrade reaction versus positive resilient modulus"><style>text{font:12px Segoe UI,Arial;fill:#294b59;text-anchor:middle}.grid path{stroke:#dce5eb;stroke-width:1}</style><rect width="700" height="335" fill="white"/><text x="350" y="23">FHWA Eq. 5.22 · DSB = '+fmt(inputs.DSB*25.4)+' mm · ESB = '+fmt(inputs.ESB)+' psi</text><rect x="'+x(1000)+'" y="65" width="'+(x(20000)-x(1000))+'" height="210" fill="#edf7f3"/><g class="grid">'+grid+'</g><polyline fill="none" stroke="#17665d" stroke-width="2" points="'+points.map(p=>x(p[0])+','+y(p[1])).join(' ')+'"/><path d="M'+px+' 275V'+py+'H70" fill="none" stroke="#c43228" stroke-dasharray="5 4"/><circle cx="'+px+'" cy="'+py+'" r="5" fill="#c43228"/><text x="350" y="46">MR = '+fmt(inputs.MR)+' psi · Equation k∞ = '+fmt(value)+' pci</text><text x="350" y="320">MR (psi) · logarithmic scale · shaded band: printed MR range</text><text x="25" y="160" transform="rotate(-90 25 160)">k∞ (pci)</text></svg>';
  }
  globalThis.FoundationEquation={evaluate,calculate,plot,source};
})();
