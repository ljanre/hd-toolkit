// An isolated document keeps the locator's map, styles and IDs independent.
// Edit rainfall.js, rainfall.css and stations.js within this component folder.
customElements.define('rainfall-locator', class extends HTMLElement {
  connectedCallback() {
    if (!this.closest('[hidden]')) this.activate();
  }
  activate() {
    if (this.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.title = 'PAGASA rainfall station locator';
    frame.src = './components/rainfall-locator/index.html';
    frame.loading = 'eager';
    this.append(frame);
  }
});

