(() => {
 const D=WorkbookWideningData;
 function config(input){
  const source=D.vehicles.find(v=>v.code===input.vehicle),vehicle=source?{...source,sumSquares:source.segments.reduce((sum,[factor,length])=>sum+factor*length*length,0)}:null,lanes=Number(input.lanes),width=Number(input.width),emax=Number(input.emax)/100;
  if(!vehicle||!Number.isInteger(lanes)||lanes<2||lanes>8||!Number.isFinite(width)||width<=0||!Number.isFinite(emax)||emax<0||emax>.12)throw Error('Select a vehicle; lanes must be 2–8, width positive and emax 0–12%.');
  const entered=input.clearance===''||input.clearance==null?null:Number(input.clearance);if(entered!=null&&(!Number.isFinite(entered)||entered<0))throw Error('Lateral clearance must be nonnegative.');
  const clearance=entered>0?entered:D.clearance.find(([w])=>Math.abs(w-width)<1e-9)?.[1];if(clearance==null)throw Error('This width has no workbook clearance entry. Enter a positive lateral-clearance override.');
  return {vehicle,lanes,width,emax,clearance,override:entered>0};
 }
 function minimum(c,speed){const f=D.friction.find(([v])=>v===Number(speed))?.[1];if(f==null)throw Error('Speed is outside the Metric friction table.');return Math.floor((speed*speed/(127*(c.emax+f)))/5+.5)*5;}
 function cell(c,R,V){R=Number(R);V=Number(V);if(!Number.isFinite(R)||R<=0)throw Error('Radius must be positive.');const min=minimum(c,V);if(R<min)return {value:null,reason:'Below minimum radius',minimum:min};
  const {u,sumSquares,A,L}=c.vehicle;if(R*R<sumSquares)return {value:null,reason:'Vehicle square-root domain',minimum:min};
  const off=R-Math.sqrt(R*R-sumSquares),front=Math.sqrt(R*R+A*(2*L+A))-R,extra=.1*V/Math.sqrt(R),raw=c.lanes*(u+off+c.clearance)+(c.lanes-1)*front+extra-c.lanes/2*c.width;
  const rounded=Math.sign(raw)*Math.floor(Math.abs(raw)*10+.5)/10,value=Math.max(0,rounded);return {value,raw,minimum:min,offtracking:off,frontAllowance:front,extra};
 }
 globalThis.WorkbookWidening=Object.freeze({config,cell,minimum});
})();
