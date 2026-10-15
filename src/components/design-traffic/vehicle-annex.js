/* Transcribed from the four user-supplied Annex A/B images.
   GVW values are source examples, not a verification of current legal limits. */
(() => {
  const profiles=[
    {code:'1-1',name:'Rigid Truck · 2 Axles',gvw:18000,fractions:[.2,.8],kind:'rigid',classes:[6]},
    {code:'1-2',name:'Rigid Truck · Tandem Rear · 3 Axles',gvw:33300,fractions:[.2,.4,.4],kind:'rigid',classes:[7]},
    {code:'1-3',name:'Rigid Truck · Tridem Rear · 4 Axles',gvw:35600,fractions:[.208,.264,.264,.264],kind:'rigid',classes:[7]},
    {code:'11-1',name:'Semi-Trailer · 3 Axles',gvw:34000,fractions:[.112,.444,.444],kind:'semi',classes:[]},
    {code:'11-2',name:'Semi-Trailer · 4 Axles',gvw:40600,fractions:[.1688,.2981,.2793,.2538],kind:'semi',classes:[]},
    {code:'11-3',name:'Semi-Trailer · 5 Axles',gvw:41000,fractions:[.155,.197,.216,.216,.216],kind:'semi',classes:[8]},
    {code:'12-1',name:'Semi-Trailer · 4 Axles',gvw:39700,fractions:[.1688,.2538,.2793,.2981],kind:'semi',classes:[]},
    {code:'12-2',name:'Semi-Trailer · 5 Axles',gvw:41500,fractions:[.112,.222,.222,.222,.222],kind:'semi',classes:[8]},
    {code:'12-3',name:'Semi-Trailer · 6 Axles',gvw:42000,fractions:[.0755,.196,.196,.1875,.1875,.1575],kind:'semi',classes:[8]},
    {code:'11-11',name:'Truck and Trailer · 4 Axles',gvw:39700,fractions:[.169,.298,.254,.279],kind:'trailer',classes:[]},
    {code:'11-12',name:'Truck and Trailer · 5 Axles',gvw:43500,fractions:null,kind:'trailer',classes:[9]},
    {code:'12-11',name:'Truck and Trailer · 5 Axles',gvw:43500,fractions:null,kind:'trailer',classes:[9]},
    {code:'12-12',name:'Truck and Trailer · 6 Axles',gvw:45000,fractions:[.109,.177,.188,.263,.131,.132],kind:'trailer',classes:[9]}
  ];
  function calculate(code,gvwKg){
    const profile=profiles.find(p=>p.code===code);
    if(!profile||!profile.fractions)throw new Error('This configuration has no axle distribution in the supplied Annex B. Enter verified axle loads or a class-average EF.');
    if(!Number.isFinite(gvwKg)||gvwKg<=0)throw new Error('Enter a positive adopted GVW in kilograms.');
    const loads=profile.fractions.map(f=>gvwKg/1000*f);
    const ef=DesignTraffic.axleFactor(loads.join(','));
    const contributions=loads.map(load=>(load/8.2)**4);
    return {profile,loads,contributions,ef,overSourceGVW:gvwKg>profile.gvw};
  }
  function diagram(profile,labels=false){
    const count=profile.fractions?.length??(profile.code==='11-12'||profile.code==='12-11'?5:2);
    const locations={'1-1':[40,232],'1-2':[40,206,234],'1-3':[40,182,208,234],
      '11-1':[40,102,252],'11-2':[40,102,236,264],'11-3':[40,102,220,246,272],
      '12-1':[40,94,122,256],'12-2':[40,94,122,238,266],'12-3':[40,94,122,222,248,274],
      '11-11':[40,102,204,268],'11-12':[40,102,198,250,278],'12-11':[40,90,118,204,268],'12-12':[40,90,118,198,250,278]};
    const positions=locations[profile.code]||Array.from({length:count},(_,i)=>40+i*232/(count-1));
    const body=profile.kind==='rigid'?'<rect x="68" y="19" width="194" height="33" rx="3" fill="#e9eff2"/>':profile.kind==='semi'?'<path d="M80 25H300V48H80Z" fill="#e9eff2"/>':'<path d="M67 23H145V49H67ZM167 28H300V49H167Z" fill="#e9eff2"/><path d="M145 49H167"/>';
    const wheels=positions.map(x=>'<path d="M'+(x-12)+' 48Q'+x+' 42 '+(x+12)+' 48M'+x+' 48V70" stroke="#526572"/><circle cx="'+x+'" cy="60" r="10" fill="#344654"/><circle cx="'+x+'" cy="60" r="6" fill="white"/><circle cx="'+x+'" cy="60" r="2" fill="#526572"/><path d="M'+(x-4)+' 60h8M'+x+' 56v8" stroke="#526572" stroke-width=".6"/>').join('');

    const arrows=labels?positions.map((x,i)=>{const labelX=(i+.5)*320/positions.length,share=profile.fractions?.[i],load=share!=null&&Number.isFinite(profile.gvw)&&profile.gvw>0?(share*profile.gvw/1000):null;return '<path class="axle-load-arrow" d="M'+x+' -12V46" stroke="#c43127" stroke-width="2.2"/><path d="M'+(x-4)+' 39L'+x+' 47L'+(x+4)+' 39Z" fill="#c43127" stroke="#c43127"/><path d="M'+x+' 72L'+labelX+' 92V98" stroke="#8ba0ad"/><text x="'+labelX+'" y="109" text-anchor="middle" font-size="9" stroke="none" fill="#203444">A'+(i+1)+'</text><text x="'+labelX+'" y="123" text-anchor="middle" font-size="9" font-weight="600" stroke="none" fill="#b42318">'+(share==null?'—':Number(share.toFixed(4))+'W')+'</text><text x="'+labelX+'" y="137" text-anchor="middle" font-size="9" stroke="none" fill="#b42318">'+(load==null?'Load pending':Number(load.toFixed(3))+' t')+'</text>';}).join(''):'';

    return '<svg class="vehicle-diagram'+(labels?' engineering-diagram':'')+'" viewBox="0 0 320 '+(labels?210:76)+'" role="img" aria-label="'+profile.name+' · Code '+profile.code+(labels?' · Axle load schematic; not to scale':'')+'" xmlns="http://www.w3.org/2000/svg"><g stroke="#203444" stroke-width="1.2" stroke-linejoin="round" fill="none" transform="translate(0 '+(labels?30:0)+')"><path d="M18 56V27L28 10H63V56Z" fill="#e7edf1"/><path d="M27 28l7-11h18v18H27Z" fill="#f8fbfc"/>'+body+'<path d="M18 53H300M18 56H300M22 54v8h10M15 49h8v7h-8M57 19v32M48 40h7M67 50h225"/><path d="M68 49Q82 46 92 49" stroke="#7e909d"/>'+wheels+arrows+(labels?'<path d="M12 72H308" stroke="#8ba0ad"/><text x="160" y="164" text-anchor="middle" font-size="8" stroke="none" fill="#526b7a">'+(Number.isFinite(profile.gvw)&&profile.gvw>0?'W = '+(profile.gvw/1000)+' t · ':'')+'AXLE LOAD SCHEMATIC · NOT TO SCALE</text>':'')+'</g></svg>';
  }
  function loadDistribution(loads,fractions=null){
    if(!loads.length||loads.some(load=>!Number.isFinite(load)||load<0))return '';
    const contributions=loads.map(load=>(load/8.2)**4),total=contributions.reduce((sum,value)=>sum+value,0),weight=loads.reduce((sum,value)=>sum+value,0);
    const fmt=value=>value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:3});
    return '<div class="load-distribution"><div class="load-equation">EF = Σ (Lᵢ / 8.2 t)⁴ <span>W = '+fmt(weight)+' t</span></div><table aria-label="Axle load and EF contributions"><thead><tr><th>Axle</th><th>Load / W</th><th>Load (t)</th><th>Axle EF</th><th>EF Share</th></tr></thead><tbody>'+loads.map((load,i)=>{const share=total?contributions[i]/total*100:0;return '<tr><th>A'+(i+1)+'</th><td>'+fmt((fractions?.[i]??(weight?load/weight:0))*100)+'%</td><td>'+fmt(load)+'</td><td>'+fmt(contributions[i])+'</td><td><span class="ef-share"><i style="width:'+share+'%"></i></span><span>'+fmt(share)+'%</span></td></tr>';}).join('')+'</tbody><tfoot><tr><th colspan="3">Vehicle EF · Σ Axle EF</th><td colspan="2">'+fmt(total)+'</td></tr></tfoot></table></div>';
  }
  function classVisual(index){
    if(index>=6)return diagram(profiles.find(p=>p.classes.includes(index)&&p.fractions));
    if(index===0)return '<svg class="vehicle-diagram" viewBox="0 0 160 55" role="img" aria-label="Motorcycle" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#203444" stroke-width="3"><circle cx="42" cy="39" r="12"/><circle cx="117" cy="39" r="12"/><path d="M42 39l28-18 21 18h26l-17-28H86M64 17h20"/></g></svg>';
    const bus=index>=4,goods=index===3;
    return '<svg class="vehicle-diagram" viewBox="0 0 160 55" role="img" aria-label="'+DesignTraffic.classes[index]+'" xmlns="http://www.w3.org/2000/svg"><g stroke="#203444" stroke-width="2"><path d="'+(bus?'M16 36V9h125v30H16Z':goods?'M16 38V19h38v-9h88v30H16Z':'M15 39V26l22-15h64l20 15h22v13Z')+'" fill="#e9eff2"/><path d="M'+(bus?'25 15h105v13H25Z':'40 16h54l13 10H27Z')+'" fill="#eef7fa"/><circle cx="39" cy="40" r="9" fill="#203444"/><circle cx="123" cy="40" r="9" fill="#203444"/></g></svg>';
  }
  globalThis.VehicleAnnex={profiles,calculate,diagram,classVisual,loadDistribution};
})();
