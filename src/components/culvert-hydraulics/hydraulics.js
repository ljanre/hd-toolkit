/* SI calculation core. No DOM dependencies; also used by regression tests. */
(function (root) {
  'use strict';
  const G = 9.80665, KU = 1 / Math.sqrt(0.3048);
  const entrances = {
    boxFlared: {shape:'box', label:'30°–75° flared wingwalls', K:.026, M:1, c:.0347, Y:.81, free:.15, full:.4},
    boxParallel: {shape:'box', label:'Parallel wingwalls (0° flare)', K:.061, M:.75, c:.0423, Y:.82, free:.5, full:.5},
    pipeSquare: {shape:'pipe', label:'Square edge with headwall', K:.0098, M:2, c:.0398, Y:.67, free:.5, full:.5},
    pipeGroove: {shape:'pipe', label:'Groove end with headwall', K:.0018, M:2, c:.0292, Y:.74, free:.2, full:.2},
    pipeProject: {shape:'pipe', label:'Groove end projecting', K:.0045, M:2, c:.0317, Y:.69, free:.2, full:.2}
  };
  function section(p, depth, closed=false) {
    const y=Math.max(1e-12,Math.min(depth,p.D));
    if(p.shape==='box') {
      const A=p.B*y, P=p.B+2*y+(closed?p.B:0);
      return {A,P,R:A/P,T:p.B};
    }
    const theta=2*Math.acos(1-2*y/p.D), A=p.D*p.D/8*(theta-Math.sin(theta)), P=p.D*theta/2;
    return {A,P,R:A/P,T:p.D*Math.sin(theta/2)};
  }
  function critical(p,q) {
    if(p.shape==='box') return Math.min(p.D, Math.cbrt(q*q/(G*p.B*p.B)));
    let lo=p.D*1e-7,hi=p.D*(1-1e-10);
    for(let i=0;i<85;i++){const m=(lo+hi)/2,s=section(p,m);if(G*s.A**3/s.T<q*q)lo=m;else hi=m;}
    return (lo+hi)/2;
  }
  const friction=(p,q,s)=> (p.n*q/(s.A*s.R**(2/3)))**2;
  function normal(p,q){
    if(p.S<=0)return null;
    const capacity=y=>{const s=section(p,y);return s.A*s.R**(2/3)*Math.sqrt(p.S)/p.n;};
    let last=p.D*1e-7;
    // First root: circular open-channel conveyance has a maximum below the crown.
    for(let i=1;i<=1000;i++){const y=p.D*i/1000;if(capacity(y)>=q){let lo=last,hi=y;for(let j=0;j<65;j++){const m=(lo+hi)/2;if(capacity(m)<q)lo=m;else hi=m;}return (lo+hi)/2;}last=y;}
    return null;
  }
  function inlet(p,q){
    const e=entrances[p.entrance], full=section(p,p.D,true), z=KU*q/(full.A*Math.sqrt(p.D));
    const unsub=z0=>{const q0=z0*full.A*Math.sqrt(p.D)/KU,dc=critical(p,q0),s=section(p,dc);return (dc+(q0/s.A)**2/(2*G))/p.D+e.K*z0**e.M-.5*p.S;};
    const sub=z0=>e.c*z0*z0+e.Y-.5*p.S;
    // Explicit straight interpolation of empirical transition endpoints.
    const ratio=z<=3.5?unsub(z):z>=4?sub(z):unsub(3.5)+(sub(4)-unsub(3.5))*(z-3.5)/.5;
    return {hw:Math.max(0,ratio*p.D),z,region:z<=3.5?'Unsubmerged equation':z>=4?'Submerged equation':'Interpolated transition (3.5 < Z < 4)'};
  }
  function validate(p){
    for(const k of ['Q','D','B','N','L','n','allowHW','allowV']) if(!Number.isFinite(p[k])||p[k]<=0)throw Error(k+' must be greater than zero.');
    for(const k of ['S','TW'])if(!Number.isFinite(p[k])||p[k]<0)throw Error(k+' must be zero or positive.');
    if(!Number.isFinite(p.invert))throw Error('Inlet invert must be a finite elevation.');
    if(!Number.isInteger(p.N)||p.N>100)throw Error('Use 1–100 identical barrels.');
    if(p.S>.2)throw Error('Slope exceeds this calculator’s range (0–20%).');
    if(p.n<.008||p.n>.1)throw Error('Manning n must be between 0.008 and 0.100.');
    if(!entrances[p.entrance]||entrances[p.entrance].shape!==p.shape)throw Error('Choose an entrance for the selected shape.');
  }
  function calculate(p){
    validate(p);
    const q=p.Q/p.N,e=entrances[p.entrance],dc=critical(p,q),cs=section(p,dc),sc=friction(p,q,cs),dn=normal(p,q),ic=inlet(p,q);
    const fs=section(p,p.D,true),vf=q/fs.A,hvFull=vf*vf/(2*G),hfFull=friction(p,q,fs)*p.L;
    const H=(1+e.full)*hvFull+hfFull,ho=Math.max(p.TW,(dc+p.D)/2),fullHW=H+ho-p.S*p.L;
    const y=Math.min(p.D,Math.max(p.TW,dc)),os=section(p,y),v=q/os.A,hv=v*v/(2*G);
    const typeI=p.TW<=dc, fy=typeI?Math.min(1.1*dc,p.D):y;
    const hf=friction(p,q,section(p,fy))*p.L,partHW=y+(1+e.free)*hv+hf-p.S*p.L;
    const useFull=p.TW>=p.D||dc>=p.D*(1-1e-8)||partHW>1.2*p.D;
    const oc=Math.max(0,useFull?fullHW:partHW), hw=Math.max(ic.hw,oc),control=ic.hw>oc?'Inlet':'Outlet';
    let type,reason;
    if(hw>1.2*p.D&&control==='Outlet') {type=p.TW>=p.D?'IV-A':'IV-B';reason='HW > 1.2D; '+(p.TW>=p.D?'TW ≥ D: submerged outlet.':'TW < D: partially submerged / free outlet.');}
    else if(hw<=1.2*p.D&&control==='Inlet'&&p.S>=sc&&p.TW<p.D){type='III';reason='HW ≤ 1.2D; S₀ ≥ Sc; inlet control governs.';}
    else if(hw<=1.2*p.D&&control==='Outlet'&&p.S<sc&&p.TW<p.D&&!useFull){type=typeI?'I':'II';reason='HW ≤ 1.2D; S₀ < Sc; '+(typeI?'TW ≤ dc.':'dc < TW < D.');}
    else {type='Review';reason=control==='Inlet'&&hw>1.2*p.D?'Submerged inlet control: outside the manual’s simple Type I–IV diagrams.':'Transition / mixed conditions: no consistent Type I–IV assignment.';}
    const outDepth=control==='Inlet'?dn:Math.min(p.D,Math.max(p.TW,dc));
    const velocity=outDepth?q/section(p,outDepth,p.TW>=p.D).A:null;
    const warnings=[];
    if(type==='Review')warnings.push(reason+' Confirm with a water-surface profile calculation.');
    if(useFull&&hw<=1.2*p.D)warnings.push('The full-flow trial falls below 1.2D. Part/full-flow transition requires a profile check.');
    if(ic.z>3.5&&ic.z<4)warnings.push('Inlet headwater uses linear interpolation between unsubmerged and submerged equations.');
    if(control==='Inlet')warnings.push('Outlet velocity uses normal depth and assumes a sufficiently long barrel. Tailwater backwater / hydraulic jumps are not profiled.');
    if(velocity===null)warnings.push('No normal-depth solution below the crown; outlet velocity requires a profile analysis.');
    if(p.S===0)warnings.push('Horizontal barrel: no uniform-flow depth is available.');
    return {q,dc,sc,dn,ic,oc,hw,control,type,reason,velocity,outDepth,H,ho,partHW,fullHW,useFull,ke:useFull?e.full:e.free,hv:useFull?hvFull:hv,hf:useFull?hfFull:hf,area:fs.A,hwElevation:p.invert+hw,outletInvert:p.invert-p.S*p.L,warnings,hwPass:hw<=p.allowHW,vPass:velocity!==null&&velocity<=p.allowV};
  }
  root.CulvertHydraulics={G,KU,entrances,section,critical,normal,inlet,calculate,validate};
})(globalThis);
