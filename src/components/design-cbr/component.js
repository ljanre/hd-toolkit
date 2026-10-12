customElements.define('design-cbr',class extends HTMLElement {
  connectedCallback(){if(!this.closest('[hidden]'))this.activate();}
  activate(){if(this.querySelector('iframe'))return;const frame=document.createElement('iframe');frame.title='Design CBR';frame.src='./components/design-cbr/index.html?v=pit-plan-1';frame.loading='eager';this.append(frame);}
});
