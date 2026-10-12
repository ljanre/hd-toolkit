import { readFile, readdir, access } from 'node:fs/promises';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../src/',import.meta.url));
for (const component of ['rainfall-locator','coordinate-converter','subgrade-reaction','subbase-thickness','concrete-strength','design-cbr','design-traffic','flexible-pavement','culvert-hydraulics']) {
  let Registered;
  const context = {customElements:{define:(_,definition)=>{Registered=definition;}},HTMLElement:class {
    constructor(){this.frames=[];this.hidden=true;}
    closest(){return this.hidden?{}:null;} querySelector(){return this.frames[0];} append(frame){this.frames.push(frame);}
  },document:{createElement:()=>({})},URLSearchParams,window:{location:{search:'?v=planner-release'}}};
  runInNewContext(await readFile(path.join(root,'components',component,'component.js'),'utf8'),context);
  const host = new Registered();host.connectedCallback();assert.equal(host.frames.length,0);
  host.hidden=false;host.activate();assert.equal(host.frames.length,1);
  host.hidden=true;host.hidden=false;host.activate();assert.equal(host.frames.length,1,'Revisit must retain tool document');
  assert.equal(host.frames[0].loading,'eager');assert.ok(host.frames[0].title);
  if(component==='design-cbr')assert.match(host.frames[0].src,/v=planner-release/);
}
const events={},nodes=new Map(),classes=new Set(),storage=new Map();
classes.add('admin-mode');
const create = () => ({closest(){return null;},value:'',handlers:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},addEventListener(k,f){this.handlers[k]=f;},dispatchEvent(e){this.lastEvent=e;},focus(){this.focused=true;}});
for (const id of ['flexibleTool','sidebarToggle','pavementTool','subgradeTool','subbaseTool','strengthTool','trafficTool','cbrTool','rainfallTool','coordinatesTool','k','sc','ecMillion','fcMPa','r','wMillion','rigidDesignYears','adminModeToggle','adminModeState','adminPasswordDialog','adminPasswordForm','adminPassword','adminPasswordError','adminPasswordCancel']) nodes.set(id,create());
nodes.set('culvertTool',create());
nodes.get('adminPasswordDialog').showModal=function(){this.open=true;};nodes.get('adminPasswordDialog').close=function(){this.open=false;this.handlers.close();};
nodes.set('foundationSteps',create());
let activations=0;nodes.get('strengthTool').firstElementChild={activate(){activations++;}};
const strengthFrame={contentWindow:{}},subgradeFrame={contentWindow:{}},trafficFrame={contentWindow:{}},skip={};
const strengthLink={...create(),dataset:{tool:'strength'},classList:{toggle(){}}};
const adminLinks=['subgrade','traffic','rainfall','flexible'].map(tool=>({...create(),dataset:{tool},classList:{toggle(){}}}));
const culvertLink={...create(),dataset:{tool:'culvert'},classList:{toggle(){}}};
const shell={document:{getElementById:id=>nodes.get(id),querySelectorAll:selector=>selector==='.tool-group'?[]:[strengthLink,...adminLinks,culvertLink],querySelector:selector=>selector==='concrete-strength iframe'?strengthFrame:selector==='subgrade-reaction iframe'?subgradeFrame:selector==='design-traffic iframe'?trafficFrame:skip,
  body:{classList:{toggle(k,v){if(v)classes.add(k);else classes.delete(k);},contains:k=>classes.has(k)}}},
window:{addEventListener(type,fn){(events[type]??=[]).push(fn);},dispatchEvent(event){dispatch(event.type,event);}},location:{hash:'#strengthTool'},
localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Event:class {constructor(type,opts){this.type=type;Object.assign(this,opts);}}};
const dispatch=(type,event)=>events[type].forEach(fn=>fn(event));
const registryContext={document:{querySelector(){return null;}},window:{location:{search:'?v=test-release'}},URLSearchParams,customElements:{get(){return true;}},HTMLElement:class {}};
runInNewContext(await readFile(path.join(root,'tool-registry.js'),'utf8'),registryContext);
shell.ToolkitRegistry=registryContext.ToolkitRegistry;
runInNewContext(await readFile(path.join(root,'toolkit.js'),'utf8'),shell);
assert.equal(activations,1);assert.equal(nodes.get('strengthTool').hidden,false);
dispatch('message',{source:{},data:{type:'hd-toolkit-concrete-strength',fcMPa:24}});
assert.equal(nodes.get('fcMPa').value,'');
dispatch('message',{source:strengthFrame.contentWindow,data:{type:'hd-toolkit-concrete-strength',fcMPa:-1}});
assert.equal(nodes.get('fcMPa').value,'');
dispatch('message',{source:strengthFrame.contentWindow,data:{type:'hd-toolkit-concrete-strength',fcMPa:24}});
assert.equal(nodes.get('fcMPa').value,24);assert.equal(nodes.get('fcMPa').lastEvent.type,'input');assert.equal(shell.location.hash,'#pavementTool');assert.equal(nodes.get('pavementTool').hidden,false);
dispatch('message',{source:strengthFrame.contentWindow,data:{type:'hd-toolkit-concrete-strength',fcMPa:30,reliability:100}});assert.equal(nodes.get('fcMPa').value,24,'Reject invalid reliability before changing inputs');
dispatch('message',{source:strengthFrame.contentWindow,data:{type:'hd-toolkit-concrete-strength',fcMPa:24,reliability:90}});assert.equal(nodes.get('r').value,90);
dispatch('message',{source:subgradeFrame.contentWindow,data:{type:'hd-toolkit-kcorr',value:170}});
assert.equal(nodes.get('k').value,170);assert.equal(nodes.get('k').lastEvent.type,'input');
dispatch('message',{source:{},data:{type:'hd-toolkit-cesal',million:38.15155046,rigidConfirmed:true}});assert.equal(nodes.get('wMillion').value,'');
dispatch('message',{source:trafficFrame.contentWindow,data:{type:'hd-toolkit-cesal',million:38.15155046,rigidConfirmed:false}});assert.equal(nodes.get('wMillion').value,'');
dispatch('message',{source:trafficFrame.contentWindow,data:{type:'hd-toolkit-cesal',million:38.15155046,rigidConfirmed:true}});assert.equal(nodes.get('wMillion').value,'38151550.46');assert.equal(shell.location.hash,'#pavementTool');
dispatch('message',{source:{},data:{type:'hd-toolkit-design-period',years:25}});assert.equal(nodes.get('rigidDesignYears').value,'');
dispatch('message',{source:trafficFrame.contentWindow,data:{type:'hd-toolkit-design-period',years:25}});assert.equal(nodes.get('rigidDesignYears').value,'25');assert.equal(nodes.get('rigidDesignYears').lastEvent.type,'input');
dispatch('message',{source:trafficFrame.contentWindow,data:{type:'hd-toolkit-design-period',years:0}});assert.equal(nodes.get('rigidDesignYears').value,'25');
nodes.get('rigidDesignYears').manualPeriod=true;nodes.get('rigidDesignYears').value='30';dispatch('message',{source:trafficFrame.contentWindow,data:{type:'hd-toolkit-design-period',years:20}});assert.equal(nodes.get('rigidDesignYears').value,'30','Manual design period must not be overwritten by background traffic updates');
for(const id of ['flexibleTool','pavementTool','subgradeTool','subbaseTool','strengthTool','trafficTool','cbrTool','rainfallTool','coordinatesTool']) {shell.location.hash='#'+id;dispatch('hashchange');assert.equal(nodes.get(id).hidden,false);}
storage.set('hd-admin-mode','true');runInNewContext(await readFile(path.join(root,'admin-mode.js'),'utf8'),shell);
assert.equal(nodes.get('foundationSteps').hidden,true);
assert.equal(nodes.get('adminModeToggle').attributes['aria-checked'],'false','Stored On must not bypass the password after reload');
nodes.get('adminModeToggle').handlers.click();assert.equal(nodes.get('adminPasswordDialog').open,true);assert.equal(strengthLink.hidden,true);
const submitAdmin=()=>nodes.get('adminPasswordForm').handlers.submit({preventDefault(){}});
nodes.get('adminPassword').value='wrong';submitAdmin();assert.equal(nodes.get('adminPasswordError').hidden,false);assert.equal(nodes.get('adminModeToggle').attributes['aria-checked'],'false');assert.equal(nodes.get('adminPassword').value,'');
nodes.get('adminPasswordCancel').handlers.click();assert.equal(nodes.get('adminPasswordDialog').open,false);assert.equal(nodes.get('adminPasswordError').hidden,true);
nodes.get('adminModeToggle').handlers.click();nodes.get('adminPassword').value='revilla123';submitAdmin();assert.equal(nodes.get('adminModeToggle').attributes['aria-checked'],'true');assert.equal(nodes.get('adminPasswordDialog').open,false);assert.equal(nodes.get('adminPassword').value,'');
shell.location.hash='#strengthTool';dispatch('hashchange');assert.equal(strengthLink.hidden,false);
assert.equal(nodes.get('foundationSteps').hidden,false);nodes.get('foundationSteps').open=true;
nodes.get('adminModeToggle').handlers.click();assert.equal(storage.get('hd-admin-mode'),'false');assert.equal(nodes.get('adminModeState').textContent,'Off');
assert.equal(nodes.get('foundationSteps').hidden,true);assert.equal(nodes.get('foundationSteps').open,false);
assert.equal(strengthLink.hidden,true);assert.equal(nodes.get('strengthTool').hidden,true);assert.equal(shell.location.hash,'#pavementTool');
shell.location.hash='#strengthTool';dispatch('hashchange');assert.equal(nodes.get('strengthTool').hidden,true);assert.equal(shell.location.hash,'#pavementTool');
for(const link of adminLinks){assert.equal(link.hidden,true);shell.location.hash='#'+link.dataset.tool+'Tool';dispatch('hashchange');assert.equal(shell.location.hash,'#pavementTool');assert.equal(nodes.get(link.dataset.tool+'Tool').hidden,true);}
nodes.get('adminModeToggle').handlers.click();assert.equal(strengthLink.hidden,true);nodes.get('adminPassword').value='revilla123';submitAdmin();assert.equal(strengthLink.hidden,false);shell.location.hash='#strengthTool';dispatch('hashchange');assert.equal(nodes.get('strengthTool').hidden,false);
for(const link of adminLinks){assert.equal(link.hidden,false);shell.location.hash='#'+link.dataset.tool+'Tool';dispatch('hashchange');assert.equal(nodes.get(link.dataset.tool+'Tool').hidden,false);}
nodes.get('adminModeToggle').handlers.click();assert.equal(shell.location.hash,'#pavementTool');for(const link of adminLinks)assert.equal(link.hidden,true);
shell.location.hash='#flexibleTool';dispatch('hashchange');assert.equal(nodes.get('flexibleTool').hidden,true);assert.equal(shell.location.hash,'#pavementTool');assert.equal(shell.document.title,'HD Toolkit | Rigid Pavement Design');

shell.location.hash='#culvertTool';dispatch('hashchange');
assert.equal(nodes.get('culvertTool').hidden,true);assert.equal(nodes.get('pavementTool').hidden,false);
assert.equal(culvertLink.hidden,true);assert.equal(shell.location.hash,'#pavementTool');
assert.equal(shell.document.title,'HD Toolkit | Rigid Pavement Design');assert.equal(skip.href,'#designForm');
classes.add('admin-mode');shell.location.hash='#culvertTool';dispatch('hashchange');
assert.equal(culvertLink.hidden,true);assert.equal(nodes.get('culvertTool').hidden,true);assert.equal(shell.location.hash,'#pavementTool');classes.delete('admin-mode');
shell.location.hash='#pavementTool';dispatch('hashchange');assert.equal(nodes.get('culvertTool').hidden,true);
const uiContext={};runInNewContext(await readFile(path.join(root,'components/concrete-strength/engine.js'),'utf8'),uiContext);
const html=await readFile(path.join(root,'components/concrete-strength/index.html'),'utf8');const fields=new Map([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,create()]));
for(const [id,value] of Object.entries({fc:'24',ps:'10',z:'1.476',zSource:'custom',calculationMode:'manual',reliability:'92'}))fields.get(id).value=value;
for(const field of fields.values())Object.defineProperty(field,'valueAsNumber',{get(){return Number(this.value);}});
uiContext.document={getElementById:id=>fields.get(id),querySelectorAll:()=>[]};
runInNewContext(await readFile(path.join(root,'components/concrete-strength/strength.js'),'utf8'),uiContext);
fields.get('z').value='2';fields.get('strengthForm').handlers.input({target:fields.get('z')});
fields.get('zSource').value='1.282';fields.get('zSource').handlers.change();assert.equal(fields.get('z').value,'1.282');assert.equal(fields.get('z').readOnly,true);
fields.get('zSource').value='custom';fields.get('zSource').handlers.change();assert.equal(fields.get('z').value,'2');assert.equal(fields.get('z').readOnly,false);
fields.get('fc').value='0';fields.get('strengthForm').handlers.input({target:fields.get('fc')});assert.equal(fields.get('apply').disabled,true);assert.equal(fields.get('mean').textContent,'—');
fields.get('fc').value='24';fields.get('calculationMode').value='reliability';fields.get('calculationMode').handlers.change();
assert.equal(fields.get('ps').readOnly,true);assert.equal(fields.get('z').readOnly,true);assert.equal(fields.get('ps').value,'8');assert.equal(fields.get('zr').value,'-1.405');
fields.get('reliability').value='90';fields.get('strengthForm').handlers.input({target:fields.get('reliability')});assert.equal(fields.get('ps').value,'10');assert.equal(fields.get('z').value,'1.282');
fields.get('reliability').value='100';fields.get('strengthForm').handlers.input({target:fields.get('reliability')});assert.equal(fields.get('apply').disabled,true);assert.equal(fields.get('mean').textContent,'—');assert.equal(fields.get('zr').value,'');

// Subbase integration clears stale results and updates both completed inputs live.
const subbaseUiNodes=new Map(['traffic-input','cbr-input','calculationSteps'].map(id=>[id,{...create(),children:[],append(...children){this.children.push(...children);},closest(){return this;}}]));
let liveCalculations=0,clears=0;const subbaseEvents={},readyMessages=[];
const subbaseUiContext={RN29App:{calculateFromForm(){liveCalculations++;},clear(){clears++;}},document:{getElementById:id=>subbaseUiNodes.get(id),createElement:()=>({...create(),append(){},close(){},showModal(){}}),body:{append(){}}},window:{parent:{postMessage:message=>readyMessages.push(message)},addEventListener:(type,fn)=>subbaseEvents[type]=fn}};
runInNewContext(await readFile(path.join(root,'components/subbase-thickness/toolkit-ui.js'),'utf8'),subbaseUiContext);
subbaseUiNodes.get('traffic-input').value='1';subbaseUiNodes.get('traffic-input').handlers.input();assert.equal(clears,1);
subbaseUiNodes.get('cbr-input').value='5';subbaseUiNodes.get('cbr-input').handlers.input();assert.equal(liveCalculations,1);
subbaseUiNodes.get('traffic-input').value='';subbaseUiNodes.get('traffic-input').handlers.input();assert.equal(clears,2);
assert.equal(readyMessages[0].type,'hd-toolkit-subbase-ready');
subbaseEvents.message({source:subbaseUiContext.window.parent,data:{type:'hd-toolkit-admin-state',enabled:true}});assert.equal(subbaseUiNodes.get('calculationSteps').hidden,false);
subbaseUiNodes.get('calculationSteps').open=true;subbaseEvents.message({source:subbaseUiContext.window.parent,data:{type:'hd-toolkit-admin-state',enabled:false}});assert.equal(subbaseUiNodes.get('calculationSteps').hidden,true);assert.equal(subbaseUiNodes.get('calculationSteps').open,false);

async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await scan(file);else if(file.endsWith('.js'))new Script(await readFile(file,'utf8'));else if(file.endsWith('.html')){
  const contents=await readFile(file,'utf8');
  for(const [,target] of contents.matchAll(/<(?:script|img|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)){
    if(/^(?:https?:|data:|#|\/\/)/.test(target))continue;
    await access(path.resolve(path.dirname(file),target.split(/[?#]/)[0]));
  }
}}}
await scan(root);
console.log('Toolkit shell checks passed: deferred component loads, routes, trusted result transfers, Admin preference, custom-z retention, invalidation, JavaScript syntax and local HTML assets.');


// Flexible subbase uses whole ESAL entry without rounding the MSA calculation value.
const trafficNodes=new Map(['traffic-input','traffic-unit','traffic-hint'].map(id=>[id,create()]));
const trafficContext={document:{getElementById:id=>trafficNodes.get(id)}};
runInNewContext(await readFile(path.join(root,'components/subbase-thickness/traffic-input.js'),'utf8'),trafficContext);
const trafficEntry=trafficNodes.get('traffic-input'),trafficUnit=trafficNodes.get('traffic-unit');
trafficEntry.handlers.focus();assert.equal(trafficUnit.textContent,'ESAL');
trafficEntry.value='1,234,567.89';trafficEntry.handlers.input();assert.equal(trafficContext.RN29Traffic.getMsa(),1.23456789);
trafficEntry.handlers.blur();assert.equal(trafficEntry.value,'1.23');assert.equal(trafficUnit.textContent,'×10⁶ ESAL');assert.equal(trafficContext.RN29Traffic.getMsa(),1.23456789,'Display rounding must not change the calculation');
trafficEntry.handlers.focus();assert.equal(trafficEntry.value,'1234567.89');
trafficEntry.value='10000';trafficEntry.handlers.input();assert.equal(trafficContext.RN29Traffic.getMsa(),.01);
trafficContext.RN29Traffic.setMsa(2.5);assert.equal(trafficEntry.value,'2.50');trafficEntry.handlers.focus();assert.equal(trafficEntry.value,'2500000');
trafficEntry.value='invalid';trafficEntry.handlers.input();assert.ok(Number.isNaN(trafficContext.RN29Traffic.getMsa()));
trafficContext.RN29Traffic.reset();assert.equal(trafficEntry.value,'');assert.equal(trafficContext.RN29Traffic.getMsa(),null);
