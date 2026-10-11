customElements.define('subgrade-reaction', class extends HTMLElement {
  connectedCallback() {
    if (!this.closest('[hidden]')) this.activate();
  }
  activate() {
    if (this.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.title = 'Subgrade reaction calculator — AASHTO 1993 Figure 3.3';
    frame.src = './components/subgrade-reaction/index.html';
    frame.loading = 'eager';
    this.append(frame);
  }
});

