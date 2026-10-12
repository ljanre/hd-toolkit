customElements.define('subbase-thickness', class extends HTMLElement {
  connectedCallback() {
    if (!this.closest('[hidden]')) this.activate();
  }
  activate() {
    if (this.querySelector('iframe')) return;
    const frame = document.createElement('iframe');
    frame.title = 'Subbase Thickness Design — Rigid or Asphalt';
    frame.src = './components/subbase-thickness/rigid.html?v='+encodeURIComponent(new URLSearchParams(window.location.search).get('v')||'nomograph-format-4');
    frame.loading = 'eager';
    this.append(frame);
  }
});

