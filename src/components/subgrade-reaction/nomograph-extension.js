/* Optional-range continuation of the digitized nomograph's nearest edge curves.
 * The calibrated engine remains unchanged. Extended results are unverified. */
(() => {
  const model=SubgradeCalculation.model;
  const fmt=n=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:2}):'—';
  function curve(c,d){
    function inside(t){
      if(t<6||t>18){const edge=t<6?c.thinEdge:c.thickEdge,s=edge.sign*(t-edge.baseDsb);return (edge.b2*s+edge.b1)*s+edge.b0;}
      const s=(18-t)/12;return ((c.a3*s+c.a2)*s+c.a1)*s+c.a0;
    }
    if(d>=4&&d<=20)return inside(d);
    const edge=d<4?4:20,h=.0001;
    const slope=d<4?(inside(edge+h)-inside(edge))/h:(inside(edge)-inside(edge-h))/h;
    return inside(edge)+(d-edge)*slope;
  }
  function family(value,d,curves){
    let pair=curves.slice(0,2);
    if(value>=curves.at(-1).engineeringValue)pair=curves.slice(-2);
    else for(let i=0;i<curves.length-1;i++)if(value>=curves[i].engineeringValue&&value<=curves[i+1].engineeringValue){pair=curves.slice(i,i+2);break;}
    const [a,b]=pair,t=Math.log(value/a.engineeringValue)/Math.log(b.engineeringValue/a.engineeringValue);
    return curve(a,d)+t*(curve(b,d)-curve(a,d));
  }
  function pixel(t,axis){
    const grid=axis==='x'?[115,145,174,204,233,262,291,321,350,380,410,439,468,498,527,557,586,615,645,675,705,734,763,791,821,850,881,910,941,971,1000,1030,1060]:[17,48,80,112,145,177,209,241,272,304,335,366,397,428,459,489,521,552,584,617,649,680,712,743,775,807,839,871,903,935,966,998,1029];
    const scaled=t*32,i=Math.max(0,Math.min(31,Math.floor(scaled)));return grid[i]+(scaled-i)*(grid[i+1]-grid[i]);
  }
  function calculate(inputs){
    const original=SubgradeCalculation.calculate(inputs);
    if(original.result!==null||Object.values(inputs).some(v=>v===null))return original;
    if(!['DSB','ESB','MR'].every(k=>Number.isFinite(inputs[k])&&inputs[k]>0))return original;
    const ve=family(inputs.ESB,inputs.DSB,model.esbCurves),vm=family(inputs.MR,inputs.DSB,model.mrCurves),q=vm-ve;
    const anchors=model.kAnchors;let pair=anchors.slice(0,2);
    if(q>=anchors.at(-1).q)pair=anchors.slice(-2);
    else for(let i=0;i<anchors.length-1;i++)if(q>=anchors[i].q&&q<=anchors[i+1].q){pair=anchors.slice(i,i+2);break;}
    const [a,b]=pair,t=(q-a.q)/(b.q-a.q),result=Math.exp(Math.log(a.engineeringValue)+t*Math.log(b.engineeringValue/a.engineeringValue));
    if(!Number.isFinite(result)||result<=0)return original;
    const u=(20-inputs.DSB)/32,point=(x,y)=>({x_pixel:pixel(x,'x'),y_pixel:pixel(y,'y')});
    return {...original,result,range_status:'EXTRAPOLATED_ESTIMATE',input_status:{DSB:'VALID',ESB:'VALID',MR:'VALID'},estimated_uncertainty:null,
      graphical_overlay:null,extension:{inputs,ve,vm,q,points:[point(u,ve),point(vm,ve),point(vm,vm),point(u,vm)]},
      trace:{RESULT_SOURCE:'NOMOGRAPH_EDGE_EXTRAPOLATION',EXTRAPOLATION_USED:true},
      limitation:'Unverified extrapolated estimate beyond printed nomograph scales. No validated error allowance.'};
  }
  function plot(inputs,image){
    const c=calculate(inputs),extended=!!c.extension;
    const p=extended?c.extension.points:c.graphical_overlay?['ESB_POINT','OUTPUT_POINT','TURNING_POINT','MR_POINT'].map(id=>c.graphical_overlay.points[id]):[];
    const mrCurve=extended?Array.from({length:33},(_,i)=>{const d=4+i/2;return {x_pixel:pixel((20-d)/32,'x'),y_pixel:pixel(family(inputs.MR,d,model.mrCurves),'y')};}):[];
    const left=-40,top=-30,right=1380,bottom=1200; // Stable frame across input edits and range transitions.
    const lines=(p.length?p.concat(p[0]):[]).map(p=>p.x_pixel+','+p.y_pixel).join(' ');
    const labels=['ESB = '+fmt(inputs.ESB)+' psi · DSB = '+fmt(inputs.DSB*25.4)+' mm','k∞ ≈ '+fmt(c.result)+' pci','Turning Point','MR = '+fmt(inputs.MR)+' psi'];
    return '<svg viewBox="'+[left,top,right-left,bottom-top].join(' ')+'" role="img" aria-label="Extended composite-k nomograph with stable plotting frame"><rect x="'+left+'" y="'+top+'" width="'+(right-left)+'" height="'+(bottom-top)+'" fill="white"/><image href="'+image+'" width="1086" height="1046"/><g class="nomograph-trace"><polyline points="'+mrCurve.map(p=>p.x_pixel+','+p.y_pixel).join(' ')+'" fill="none" stroke="#c77821" stroke-dasharray="12 8" stroke-width="4"/><polyline points="'+lines+'" fill="none" stroke="#bd2828" stroke-dasharray="'+(extended?'9 5':'none')+'" stroke-width="3"/>'+NomographLabels.callouts(p.map((point,i)=>({x:point.x_pixel,y:point.y_pixel,lines:labels[i].split(' · '),dx:i===0?-240:16,dy:i%2?18:-55})),right,bottom)+'</g></svg>';
  }
  const renderedPlots=new WeakMap();
  function updatePlot(element,markup){
    if(renderedPlots.get(element)===markup)return;
    const trace=element.querySelector?.('.nomograph-trace');
    if(trace){const marker='<g class="nomograph-trace">';trace.innerHTML=markup.slice(markup.indexOf(marker)+marker.length,markup.lastIndexOf('</g></svg>'));}
    else element.innerHTML=markup;
    renderedPlots.set(element,markup);
  }
  globalThis.NomographExtension={calculate,plot,updatePlot};
})();
