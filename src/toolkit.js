(() => {
  const toggle = document.getElementById('sidebarToggle');
  const adminTools = new Set(['strength', 'subgrade', 'traffic', 'rainfall', 'flexible']);
  const hiddenTools = new Set(['culvert']);
  function syncCalculationAccess(){
    const enabled=document.body.classList.contains('admin-mode');
    const steps=document.getElementById('foundationSteps');
    if(steps){steps.hidden=!enabled;if(!enabled)steps.open=false;}
    document.querySelector('flexible-pavement iframe')?.contentWindow?.postMessage?.({type:'hd-toolkit-admin-state',enabled},'*');
    document.querySelector('subbase-thickness iframe')?.contentWindow?.postMessage?.({type:'hd-toolkit-admin-state',enabled},'*');
    document.querySelector('design-cbr iframe')?.contentWindow?.postMessage?.({type:'hd-toolkit-admin-state',enabled},'*');
  }
  function collapse(value) {
    document.body.classList.toggle('sidebar-collapsed', value);
    toggle.setAttribute('aria-expanded', String(!value));
    toggle.setAttribute('aria-label', value ? 'Expand sidebar' : 'Collapse sidebar');
    toggle.title = value ? 'Expand sidebar' : 'Collapse sidebar';
    try { localStorage.setItem('hd-sidebar-collapsed', String(value)); } catch {}
  }
  try { collapse(localStorage.getItem('hd-sidebar-collapsed') === 'true'); } catch {}
  toggle.addEventListener('click', () => collapse(!document.body.classList.contains('sidebar-collapsed')));
  function selectTool() {
    syncCalculationAccess();
    const tools = {
      pavement: { id: 'pavementTool', title: 'Rigid Pavement Design' },
      flexible: { id: 'flexibleTool', title: 'Flexible Pavement Design' },
      subgrade: { id: 'subgradeTool', title: 'Corrected Subgrade Reaction' },
      subbase: { id: 'subbaseTool', title: 'Subbase Thickness Design' },
      traffic: { id: 'trafficTool', title: 'Design Traffic' },
      cbr: { id: 'cbrTool', title: 'Design CBR' },
      strength: { id: 'strengthTool', title: 'Concrete Modulus of Rupture' },
      rainfall: { id: 'rainfallTool', title: 'Rainfall Station Locator' },
      coordinates: { id: 'coordinatesTool', title: 'PRS92 ⇄ WGS 84 Converter' },
      culvert: { id: 'culvertTool', title: 'Culvert Hydraulics' }
    };
    const admin = document.body.classList.contains('admin-mode');
    let active = Object.keys(tools).find(key => location.hash === '#' + tools[key].id) || 'pavement';
    if (hiddenTools.has(active) || (adminTools.has(active) && !admin)) { active = 'pavement'; location.hash = '#pavementTool'; }
    Object.entries(tools).forEach(([key, tool]) => {
      document.getElementById(tool.id).hidden = key !== active;
      if (key === active) document.getElementById(tool.id).firstElementChild?.activate?.();
    });
    document.querySelectorAll('[data-tool]').forEach(link => {
      link.hidden = hiddenTools.has(link.dataset.tool) || (adminTools.has(link.dataset.tool) && !admin);
      const selected = link.dataset.tool === active;
      link.classList.toggle('nav-current', selected);
      if (selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = 'HD Toolkit | ' + tools[active].title;
    const skip = document.querySelector('.skip-link');
    skip.href = '#' + (active === 'pavement' ? 'designForm' : tools[active].id);
    skip.textContent = active === 'pavement' ? 'Skip to design inputs' : 'Skip to ' + tools[active].title;
  }
  window.addEventListener('hashchange', selectTool);
  window.addEventListener('hd-admin-mode-change', selectTool);
  window.addEventListener('message',event=>{
    const frame=document.querySelector('flexible-pavement iframe');
    if(frame&&event.source===frame.contentWindow&&event.data?.type==='hd-toolkit-flexible-ready')syncCalculationAccess();
    const subbaseFrame=document.querySelector('subbase-thickness iframe');
    if(subbaseFrame&&event.source===subbaseFrame.contentWindow&&event.data?.type==='hd-toolkit-subbase-ready')syncCalculationAccess();
    const cbrFrame=document.querySelector('design-cbr iframe');
    if(cbrFrame&&event.source===cbrFrame.contentWindow&&event.data?.type==='hd-toolkit-cbr-ready')syncCalculationAccess();
  });
  window.addEventListener('message', event => {
    const frame = document.querySelector('concrete-strength iframe');
    if (!document.body.classList.contains('admin-mode')) return;
    if (!frame || event.source !== frame.contentWindow || event.data?.type !== 'hd-toolkit-concrete-strength') return;
    const { fcMPa } = event.data;
    if (!Number.isFinite(fcMPa) || fcMPa <= 0) return;
    const reliability=event.data.reliability;
    if(reliability!==undefined&&(!Number.isFinite(reliability)||reliability<50||reliability>99.99))return;
    if(reliability!==undefined)document.getElementById('r').value=reliability;
    document.getElementById('fcMPa').value = fcMPa;
    document.getElementById('fcMPa').dispatchEvent(new Event('input', { bubbles: true }));
    location.hash = '#pavementTool'; selectTool(); document.getElementById('fcMPa').focus();
  });
  window.addEventListener('message', event => {
    const frame = document.querySelector('subgrade-reaction iframe');
    if (!document.body.classList.contains('admin-mode')) return;
    if (!frame || event.source !== frame.contentWindow || event.data?.type !== 'hd-toolkit-kcorr') return;
    const value = event.data.value;
    if (!Number.isFinite(value) || value < 1 || value > 1000) return;
    const input = document.getElementById('k');
    if(window.RigidFoundation)window.RigidFoundation.restore({...window.RigidFoundation.getState(),mode:'manual'},value);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    location.hash = '#pavementTool';
    selectTool();
    input.focus();
  });
  window.addEventListener('message', event => {
    const frame=document.querySelector('design-traffic iframe');
    if (!document.body.classList.contains('admin-mode')) return;
    if(!frame||event.source!==frame.contentWindow)return;
    if(event.data?.type==='hd-toolkit-design-period'){
      const years=event.data.years;if(!Number.isInteger(years)||years<1||years>100)return;
      const period=document.getElementById('rigidDesignYears');if(period.manualPeriod)return;period.value=String(years);period.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    if(event.data?.type!=='hd-toolkit-cesal'||event.data.rigidConfirmed!==true)return;
    const value=event.data.million;if(!Number.isFinite(value)||value<=0)return;
    const input=document.getElementById('wMillion');input.dispatchEvent(new Event('focus'));input.value=String(value*1e6);
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('blur'));
    location.hash='#pavementTool';selectTool();document.getElementById('pavementTool').focus();
  });
  selectTool();
})();

