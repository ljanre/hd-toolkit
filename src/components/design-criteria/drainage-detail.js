(() => {
 function build(v){
  const type=v.drainageType;if(!['lined','trapezoidal','vditch'].includes(type))throw Error('Select a drainage type.');
  const read=(id,positive=false)=>{if(v[id]===''||v[id]==null)return null;const n=Number(v[id]);if(!Number.isFinite(n)||n<0||(positive&&n===0))throw Error('Drainage dimensions must be positive; lining and bottom width may be zero.');return n;};
  const width=read('drainageWidth',true),depth=read('drainageDepth',true),bottom=type==='vditch'?0:type==='lined'?width:read('drainageBottom'),lining=type==='vditch'?null:read('drainageLining');
  if(width!=null&&bottom!=null&&bottom>width)throw Error('Canal bottom width cannot exceed its clear top width.');
  const area=width!=null&&depth!=null&&bottom!=null?(width+bottom)*depth/2:null;
  return {type,width,depth,bottom,lining,area,title:{lined:'Rectangular lined canal',trapezoidal:'Trapezoidal lined canal',vditch:'V-ditch (unlined)'}[type]};
 }
 globalThis.DrainageDetail=Object.freeze({build});
})();
