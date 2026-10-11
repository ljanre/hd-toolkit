customElements.define('design-traffic',class extends HTMLElement {
  connectedCallback(){if(!this.closest('[hidden]'))this.activate();}
  activate(){if(this.querySelector('iframe'))return;const frame=document.createElement('iframe');frame.title='Design Traffic';frame.src='./components/design-traffic/index.html';frame.loading='eager';this.append(frame);}
});
