/* Display whole ESALs while editing; retain full-precision MSA for RN29. */
(()=>{
  const input=document.getElementById('traffic-input'),unit=document.getElementById('traffic-unit'),hint=document.getElementById('traffic-hint');
  let total=null;
  const format=()=>{input.value=total===null?'':Number.isFinite(total)?(total/1e6).toFixed(2):input.value;unit.textContent='×10⁶ ESAL';};
  function describe(){hint.textContent=total===null?'Enter total design-lane ESALs · Range: 10,000–100,000,000':Number.isFinite(total)?total.toLocaleString('en-US',{maximumFractionDigits:6})+' ESAL = '+(total/1e6).toLocaleString('en-US',{maximumFractionDigits:8})+' ×10⁶ ESAL':'Enter a valid total ESAL count.';}
  input.addEventListener('focus',()=>{input.value=total===null?'':Number.isFinite(total)?String(total):input.value;unit.textContent='ESAL';});
  input.addEventListener('input',()=>{const raw=input.value.trim().replace(/,/g,'');total=raw===''?null:Number(raw);describe();});
  input.addEventListener('blur',format);
  globalThis.RN29Traffic={getMsa:()=>total===null?null:total/1e6,setMsa:value=>{total=value===null?null:Number(value)*1e6;format();describe();},reset:()=>{total=null;input.value='';unit.textContent='×10⁶ ESAL';describe();}};
  RN29Traffic.reset();
})();