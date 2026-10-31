import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const execute=promisify(execFile);
await execute(process.execPath,['scripts/build.mjs'],{cwd:root,windowsHide:true});
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(await read('dist/build-manifest.json'));
const roadPage=await read('dist/components/project-details/index.html');
const embeddedInventory=roadPage.match(/<script type="application\/json" id="road-inventory-data">([\s\S]*?)<\/script>/);
assert.ok(embeddedInventory,'Published road details must carry the inventory without a data fetch');
const roadData=JSON.parse(embeddedInventory[1]);
assert.deepEqual(roadData,JSON.parse(await read('src/components/project-details/network-data.json')),'Embedded snapshot must preserve every source value and provenance field');
const roadContext={};runInNewContext(await read('dist/components/project-details/engine.js'),roadContext);
assert.equal(roadContext.RoadInventory.load(roadData).records.length,4573);
await assert.rejects(access(new URL('../dist/components/project-details/network-data.json',import.meta.url)),{code:'ENOENT'},'Do not deploy a duplicate inventory');
const original={},optimized={};
runInNewContext(await read('src/components/subgrade-reaction/model-data.js'),original);
runInNewContext(await read('dist/components/subgrade-reaction/model-data.js'),optimized);
assert.equal(JSON.stringify(optimized.SubgradeModelTables),JSON.stringify(original.SubgradeModelTables),'Data compaction must preserve every value and field');
for(const file of ['dist/components/subbase-thickness/tests/test-report.json','dist/components/subbase-thickness/dist/qa.html','dist/components/subgrade-reaction/README.md','dist/components/subgrade-reaction/figure-3-3.png'])await assert.rejects(access(new URL('../'+file,import.meta.url)),{code:'ENOENT'});
for(const file of ['dist/components/subgrade-reaction/figure-3-3.webp','dist/components/subgrade-reaction/figure-3-6.webp','dist/components/subbase-thickness/dist/assets/rn29-figure6-display.png'])await access(new URL('../'+file,import.meta.url));
const html=await read('dist/index.html');
const scripts=new Set([...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(match=>match[1]));
const preloads=[...html.matchAll(/<link rel="preload" as="script" href="([^"]+)"/g)].map(match=>match[1]);
assert.equal(preloads.length,4);for(const url of preloads){assert.ok(scripts.has(url),'Preloads must exactly match versioned script URLs to avoid duplicate requests');assert.ok(url.includes('v='+manifest.version));}

assert.match(html,new RegExp('hd-toolkit-build" content="'+manifest.version));
assert.match(html,new RegExp('tool-registry.js\\?v='+manifest.version));
assert.equal((html.match(/\/component\.js/g)||[]).length,0,'Individual registration scripts should not load in the main page');
assert.ok(manifest.excludedFiles>=23);
const alignmentFiles=['index.html','styles.css','engine.js','app.js'];
const alignmentBytes=(await Promise.all(alignmentFiles.map(file=>readFile(new URL('../dist/components/alignment-curve-checker/'+file,import.meta.url))))).reduce((sum,bytes)=>sum+bytes.length,0);
assert.ok(alignmentBytes<100000,'Alignment Curve Checker must remain below its 100 kB runtime budget');
const orderBytes=(await readFile(new URL('../src/components/design-criteria/do-112-s2024-reference.pdf',import.meta.url))).length;
assert.ok(manifest.deployedBytes-alignmentBytes-orderBytes-(await readFile(new URL('../src/components/design-criteria/reference-excerpts.pdf',import.meta.url))).length-(await readFile(new URL('../src/components/hydrology-tool/fhwa-hds2-excerpts.pdf',import.meta.url))).length<6200000,'Existing toolkit runtime budget excluding the three reference PDFs and separately capped alignment checker');
await writeFile(new URL('../dist/stale-build-artifact.txt',import.meta.url),'stale');
await execute(process.execPath,['scripts/build.mjs'],{cwd:root,windowsHide:true});
assert.equal(JSON.parse(await read('dist/build-manifest.json')).version,manifest.version,'Unchanged inputs have a stable cache version');
await assert.rejects(access(new URL('../dist/stale-build-artifact.txt',import.meta.url)),{code:'ENOENT'});
const definitions=new Map();let admin=false;
const context={document:{body:{classList:{contains:()=>admin}},querySelector(){return {content:'release-test'};},createElement(){return {children:[],append(...items){this.children.push(...items);}};}},window:{location:{search:''}},URLSearchParams,customElements:{get:name=>definitions.get(name),define:(name,type)=>definitions.set(name,type)},HTMLElement:class{constructor(){this.frames=[];this.hidden=true;}closest(){return this.hidden?{}:null;}querySelector(selector){return this.frames.find(e=>selector==='iframe'?!!e.src:e.className==='tool-development');}append(frame){this.frames.push(frame);}}};
runInNewContext(await read('src/tool-registry.js'),context);
assert.equal(definitions.size,18);
assert.ok(definitions.has('alignment-curve-checker'));
assert.equal(context.ToolkitRegistry.tools.alignment.group,'geometry');
assert.equal(context.ToolkitRegistry.tools.alignment.access,undefined);
assert.equal(context.ToolkitRegistry.tools.alignment.development,undefined);
for(const [name,Type] of definitions){const tool=new Type();tool.connectedCallback();assert.equal(tool.frames.length,0);tool.hidden=false;tool.activate();tool.activate();assert.equal(tool.frames.length,1);if(['flexible-pavement','culvert-hydraulics','road-widening','curve-widening','design-criteria'].includes(name)){assert.equal(tool.frames[0].className,'tool-development');assert.equal(tool.frames[0].children[1].children[0].textContent,'Under Development');assert.equal(tool.querySelector('iframe'),undefined);admin=true;tool.activate();const frame=tool.querySelector('iframe');assert.ok(frame);assert.equal(tool.frames[0].hidden,true);frame.retainedInput='saved';admin=false;tool.activate();assert.equal(frame.hidden,true);assert.equal(tool.frames[0].hidden,false);admin=true;tool.activate();assert.equal(frame.hidden,false);assert.equal(frame.retainedInput,'saved');assert.equal(tool.frames.length,2);admin=false;continue;}assert.match(tool.frames[0].src,/\?v=release-test$/);assert.ok(tool.frames[0].title);}
for(const key of ['flexible','traffic','rainfall','calendar','seismic','crossSlope','hydrology'])assert.equal(context.ToolkitRegistry.tools[key].access,undefined,'Public tool: '+key);
assert.equal(context.ToolkitRegistry.tools.hydrology.group,'hydraulics');
assert.equal(context.ToolkitRegistry.tools.hydrology.development,undefined);
assert.equal(context.ToolkitRegistry.tools.crossSlope.group,'geometry');
assert.equal(context.ToolkitRegistry.tools.crossSlope.development,undefined);
assert.equal(context.ToolkitRegistry.tools.flexible.title,'Flexible Pavement Design (UD)');
assert.equal(context.ToolkitRegistry.tools.traffic.title,'CESAL, W18');
assert.equal(context.ToolkitRegistry.tools.culvert.development,'ud');
console.log('Production build: exact data, optimized assets, stable cache versions, stale-file cleanup and eighteen lazy tool registrations verified.');

assert.deepEqual(await readFile(new URL('../dist/components/design-criteria/reference-excerpts.pdf',import.meta.url)),await readFile(new URL('../src/components/design-criteria/reference-excerpts.pdf',import.meta.url)),'Manual excerpts must be deployed unchanged');

assert.deepEqual(await readFile(new URL('../dist/components/design-criteria/do-112-s2024-reference.pdf',import.meta.url)),await readFile(new URL('../src/components/design-criteria/do-112-s2024-reference.pdf',import.meta.url)),'The Department Order reference must be deployed unchanged');

assert.equal(context.ToolkitRegistry.tools.traffic.development,undefined,'CESAL is a public functional tool');
