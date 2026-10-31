/* Tool routes, access and lazy documents live here; engineering engines remain isolated. */
(() => {
  const groups = [
    { id: 'pavement', title: 'Pavement', icon: '▤' },
    { id: 'hydraulics', title: 'Hydraulics', icon: '≈' },
    { id: 'geometry', title: 'Geometry', icon: '⌁' },
    { id: 'others', title: 'Others', icon: '⌖' }
  ];
  const tools = {
    traffic: { id: 'trafficTool', title: 'CESAL, W18', group: 'pavement', icon: '⇄', element: 'design-traffic', page: 'index.html' },
    cbr: { id: 'cbrTool', title: 'Design CBR', group: 'pavement', icon: '◫', element: 'design-cbr', page: 'index.html' },
    pavement: { id: 'pavementTool', title: 'Rigid Pavement Design', group: 'pavement', icon: '▤' },
    flexible: { id: 'flexibleTool', title: 'Flexible Pavement Design (UD)', development: 'ud', group: 'pavement', icon: '▥', element: 'flexible-pavement', page: 'index.html' },
    subbase: { id: 'subbaseTool', title: 'Subbase Thickness Design', label: 'Subbase Thickness', group: 'pavement', icon: '▰', element: 'subbase-thickness', page: 'rigid.html' },
    hydrology: { id: 'hydrologyTool', title: 'Hydrology', group: 'hydraulics', icon: '≈', element: 'hydrology-tool', page: 'index.html' },
    culvert: { id: 'culvertTool', title: 'Culvert (UD)', development: 'ud', group: 'hydraulics', icon: '▱', element: 'culvert-hydraulics', page: 'index.html' },
    seismic: { id: 'seismicTool', title: 'Seismic Coefficients kh & kv', label: 'Seismic kh & kv', group: 'others', icon: '∿', element: 'seismic-coefficients', page: 'index.html' },
    calendar: { id: 'calendarTool', title: 'Calendar Days', group: 'others', icon: '▦', element: 'calendar-days', page: 'index.html' },
    coordinates: { id: 'coordinatesTool', title: 'PRS92 Converter', label: 'PRS92', group: 'others', icon: '⌖', element: 'coordinate-converter', page: 'index.html' },
    crossSlope: { id: 'crossSlopeTool', title: 'Cross-Section', group: 'geometry', icon: '∠', element: 'cross-slope', page: 'index.html' },
    widening: { id: 'wideningTool', title: 'Curve Widening (UD)', development: 'ud', group: 'geometry', icon: '↗', element: 'road-widening', page: 'index.html' },
    alignment: { id: 'alignmentTool', title: 'Alignment Curve Checker', group: 'geometry', icon: '⌒', element: 'alignment-curve-checker', page: 'index.html' },
    geometry: { id: 'geometryTool', title: 'Swept Path Analysis (UD)', development: 'ud', group: 'geometry', icon: '⌁', element: 'curve-widening', page: 'index.html' },
    criteria: { id: 'criteriaTool', title: 'Design Criteria (UD)', development: 'ud', group: 'others', icon: '▦', element: 'design-criteria', page: 'index.html' },
    project: { id: 'projectTool', title: 'Project Road Details', group: 'others', icon: '▧', element: 'project-details', page: 'index.html' },
    rainfall: { id: 'rainfallTool', title: 'Rainfall Station Locator', label: 'Rainfall', group: 'others', icon: '☂', element: 'rainfall-locator', page: 'index.html' },
    subgrade: { id: 'subgradeTool', title: 'Corrected Subgrade Reaction', access: 'admin', element: 'subgrade-reaction', page: 'index.html' },
    strength: { id: 'strengthTool', title: 'Concrete Modulus of Rupture', access: 'admin', element: 'concrete-strength', page: 'index.html' }
  };
  Object.values(tools).forEach(Object.freeze);
  globalThis.ToolkitRegistry = Object.freeze({ groups: Object.freeze(groups.map(Object.freeze)), tools: Object.freeze(tools) });
  const version = document.querySelector('meta[name="hd-toolkit-build"]')?.content || new URLSearchParams(window.location.search).get('v') || 'registry-1';
  for (const tool of Object.values(tools)) {
    if (!tool.element || customElements.get(tool.element)) continue;
    customElements.define(tool.element, class extends HTMLElement {
      connectedCallback() { if (!this.closest('[hidden]')) this.activate(); }
      activate() {
        if (tool.development === 'ud') {
          const admin=document.body?.classList?.contains('admin-mode')===true;
          const placeholder=this.querySelector('.tool-development');
          const existingFrame=this.querySelector('iframe');
          if(placeholder)placeholder.hidden=admin;
          if(existingFrame)existingFrame.hidden=!admin;
          if(!admin){
          if (placeholder) return;
          const panel = document.createElement('div');
          panel.className = 'tool-development';
          const title = document.createElement('h2');
          title.textContent = tool.title.replace(' (UD)', '');
          const overlay = document.createElement('div');
          overlay.className = 'tool-development-overlay';
          const message = document.createElement('p');
          message.textContent = 'Under Development';
          overlay.append(message);
          panel.append(title, overlay);
          this.append(panel);
          return;
          }
        }
        if (this.querySelector('iframe')) return;
        const frame = document.createElement('iframe');
        frame.title = tool.title.replace(' (UD)', '');
        frame.src = './components/' + tool.element + '/' + tool.page + '?v=' + encodeURIComponent(version);
        frame.loading = 'eager';
        this.append(frame);
      }
    });
  }
})();
