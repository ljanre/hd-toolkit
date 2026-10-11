// Isolate culvert styles and calculations; retain the frame when switching tools.
customElements.define('culvert-hydraulics', class extends HTMLElement {
  connectedCallback() {
    if (!this.closest('[hidden]')) this.activate();
  }
  activate() {
    if (this.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.title = 'Culvert Hydraulics';
    frame.src = './components/culvert-hydraulics/index.html';
    frame.loading = 'eager';
    this.append(frame);
  }
});
