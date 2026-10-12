/* Tool routes, access and lazy documents live here; engineering engines remain isolated. */
(() => {
  const groups = [
    { id: 'pavement', title: 'Pavement', icon: '▤' },
    { id: 'hydraulics', title: 'Hydraulics', icon: '≈' },
    { id: 'others', title: 'Others', icon: '⌖' }
  ];
  const tools = {
    traffic: { id: 'trafficTool', title: 'Design Traffic (TBD)', group: 'pavement', icon: '⇄', element: 'design-traffic', page: 'index.html' },
    cbr: { id: 'cbrTool', title: 'Design CBR', group: 'pavement', icon: '◫', element: 'design-cbr', page: 'index.html' },
    pavement: { id: 'pavementTool', title: 'Rigid Pavement Design', group: 'pavement', icon: '▤' },
    flexible: { id: 'flexibleTool', title: 'Flexible Pavement Design (TBD)', group: 'pavement', icon: '▥', element: 'flexible-pavement', page: 'index.html' },
    subbase: { id: 'subbaseTool', title: 'Subbase Thickness Design', label: 'Subbase Thickness', group: 'pavement', icon: '▰', element: 'subbase-thickness', page: 'rigid.html' },
    culvert: { id: 'culvertTool', title: 'Culvert Hydraulics', label: 'Culvert', group: 'hydraulics', icon: '▱', access: 'unavailable', element: 'culvert-hydraulics', page: 'index.html' },
    coordinates: { id: 'coordinatesTool', title: 'PRS92 Converter', label: 'PRS92', group: 'others', icon: '⌖', element: 'coordinate-converter', page: 'index.html' },
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
        if (this.querySelector('iframe')) return;
        const frame = document.createElement('iframe');
        frame.title = tool.title;
        frame.src = './components/' + tool.element + '/' + tool.page + '?v=' + encodeURIComponent(version);
        frame.loading = 'eager';
        this.append(frame);
      }
    });
  }
})();
