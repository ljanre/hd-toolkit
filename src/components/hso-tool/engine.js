/* Reuses the verified SSD / sight-offset math; no alignment station chain is assumed. */
(() => {
 const C=AlignmentChecker,fields=['id','station','delta','designSpeed','grade','sightRadius','sightDistance','availableOffset'];
 function assess(rows,options={}){
  return rows.map((row,i)=>{
   const id=String(row.id||'Curve-'+(i+1));
   try{const delta=C.angle(row.delta);if(!(delta>0&&delta<180))throw Error('Curve angle must be greater than 0° and less than 180°.');
    return {...C.sightOffsetCheck({id,delta,source:{...row,reactionTime:options.reactionTime??2.5,deceleration:options.deceleration??3.4}}),delta};
   }catch(error){return {id,status:'NOT EVALUATED',S:null,required:null,available:null,margin:null,message:error.message};}
  });
 }
 function table(rows,results,options={}){
  const escape=v=>String(v??'').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
  const headers=['Curve','Station reference','Δ (deg)','V (km/h)','G (%)','Rs (m)','Adopted S (m)','Available M (m)','S used (m)','Required HSO (m)','Margin (m)','Result'];
  const data=[headers,headers.map(()=>'---'),...rows.map((r,i)=>{const h=results[i];return [...fields.map(f=>r[f]),h?.S??'',h?.required??'',h?.margin??'',h?.status??'NOT EVALUATED'];})];
  return 'HSO Tool · t = '+(options.reactionTime??2.5)+' s; a = '+(options.deceleration??3.4)+' m/s². G is + uphill / − downhill. Rs and M refer to the inside-lane vehicle path. Adopted S overrides speed-derived SSD. Single circular-curve envelope only.\n\n'+data.map(row=>'| '+row.map(escape).join(' | ')+' |').join('\n')+'\n\n'+results.map(h=>'- '+h.id+': '+h.message).join('\n');
 }
 globalThis.HSOTool=Object.freeze({fields,assess,table});
})();
