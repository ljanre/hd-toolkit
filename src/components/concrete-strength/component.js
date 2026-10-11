customElements.define('concrete-strength', class extends HTMLElement {
  connectedCallback() {
    if (!this.closest('[hidden]')) this.activate();
  }
  activate() {
    if (this.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.title = 'Concrete Modulus of Rupture';
    frame.src = './components/concrete-strength/index.html';
    frame.loading = 'eager';
    this.append(frame);
  }
});


