customElements.define('flexible-pavement',class extends HTMLElement{
  connectedCallback(){if(!this.closest('[hidden]'))this.activate();}
  activate(){if(this.querySelector('iframe'))return;const frame=document.createElement('iframe');frame.title='Flexible Pavement Design';frame.src='./components/flexible-pavement/index.html';frame.loading='eager';this.append(frame);}
});
