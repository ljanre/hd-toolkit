(() => {
  const toggle = document.getElementById('sidebarToggle');
  const { tools, groups } = ToolkitRegistry;
  const adminTools = new Set(Object.keys(tools).filter(key => tools[key].access === 'admin'));
  const hiddenTools = new Set(Object.keys(tools).filter(key => tools[key].access === 'unavailable'));
  const navigation = document.getElementById('toolNavigation');
  if (navigation) {
    navigation.innerHTML = groups.map(group => {
      const entries = Object.entries(tools).filter(([,tool]) => tool.group === group.id).map(([key,tool]) => {
        const label = '<span aria-hidden="true">' + tool.icon + '</span><span class="nav-label">' + (tool.label || tool.title) + (tool.access === 'unavailable' ? ' <small>UD</small>' : '') + '</span>';
        return tool.access === 'unavailable' ? '<span class="tool-unavailable" aria-disabled="true">' + label + '</span>' : '<a data-tool="' + key + '" href="#' + tool.id + '" title="' + tool.title + '"' + (tool.access === 'admin' ? ' hidden' : '') + '>' + label + '</a>';
      }).join('');
      return '<details class="tool-group" data-tool-group="' + group.id + '"><summary title="' + group.title + '"><span class="group-icon" aria-hidden="true">' + group.icon + '</span><span class="group-label">' + group.title + '</span></summary><div class="tool-group-items">' + entries + '</div></details>';
    }).join('');
  }

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
    const admin = document.body.classList.contains('admin-mode');
    const displayTitle=tool=>admin&&tool.development==='ud'?tool.title.replace(' (UD)',''):tool.title;
    let active = Object.keys(tools).find(key => location.hash === '#' + tools[key].id) || 'pavement';
    if (hiddenTools.has(active) || (adminTools.has(active) && !admin)) { active = 'pavement'; location.hash = '#pavementTool'; }
    Object.entries(tools).forEach(([key, tool]) => {
      document.getElementById(tool.id).hidden = key !== active;
      if (key === active) document.getElementById(tool.id).firstElementChild?.activate?.();
    });
    document.querySelectorAll('[data-tool]').forEach(link => {
      const tool=tools[link.dataset.tool];
      const label=link.querySelector?.('.nav-label');
      if(label)label.textContent=tool.label||displayTitle(tool);
      link.title=displayTitle(tool);
      link.hidden = hiddenTools.has(link.dataset.tool) || (adminTools.has(link.dataset.tool) && !admin);
      const selected = link.dataset.tool === active;
      link.classList.toggle('nav-current', selected);
      if (selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      if (selected) {
        const group = link.closest('.tool-group');
        if (group) group.open = true;
      }
    });
    document.querySelectorAll('.tool-group').forEach(group => {
      group.classList.toggle('has-current', Boolean(group.querySelector('[aria-current="page"]')));
    });
    document.title = 'HD Toolkit | ' + displayTitle(tools[active]);
    const skip = document.querySelector('.skip-link');
    skip.href = '#' + (active === 'pavement' ? 'designForm' : tools[active].id);
    skip.textContent = active === 'pavement' ? 'Skip to design inputs' : 'Skip to ' + displayTitle(tools[active]);
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

