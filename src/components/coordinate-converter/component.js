// Document isolation prevents this tool's styles and global functions from
// colliding with the pavement calculator or rainfall locator.
customElements.define('coordinate-converter', class extends HTMLElement {
  connectedCallback() {
    if (!this.closest('[hidden]')) this.activate();
  }
  activate() {
    if (this.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.title = 'PRS92 to WGS 84 coordinate converter';
    frame.src = './components/coordinate-converter/index.html';
    frame.loading = 'eager';
    this.append(frame);
  }
});

