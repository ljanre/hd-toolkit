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
const orderBytes=(await readFile(new URL('../src/components/design-criteria/do-112-s2024-reference.pdf',import.meta.url))).length;
assert.ok(manifest.deployedBytes-orderBytes-(await readFile(new URL('../src/components/design-criteria/reference-excerpts.pdf',import.meta.url))).length<6200000,'Runtime budget excluding the two explicitly deployed reference PDFs');
await writeFile(new URL('../dist/stale-build-artifact.txt',import.meta.url),'stale');
await execute(process.execPath,['scripts/build.mjs'],{cwd:root,windowsHide:true});
assert.equal(JSON.parse(await read('dist/build-manifest.json')).version,manifest.version,'Unchanged inputs have a stable cache version');
await assert.rejects(access(new URL('../dist/stale-build-artifact.txt',import.meta.url)),{code:'ENOENT'});
const definitions=new Map();let admin=false;
const context={document:{body:{classList:{contains:()=>admin}},querySelector(){return {content:'release-test'};},createElement(){return {children:[],append(...items){this.children.push(...items);}};}},window:{location:{search:''}},URLSearchParams,customElements:{get:name=>definitions.get(name),define:(name,type)=>definitions.set(name,type)},HTMLElement:class{constructor(){this.frames=[];this.hidden=true;}closest(){return this.hidden?{}:null;}querySelector(selector){return this.frames.find(e=>selector==='iframe'?!!e.src:e.className==='tool-development');}append(frame){this.frames.push(frame);}}};
runInNewContext(await read('src/tool-registry.js'),context);
assert.equal(definitions.size,13);
for(const [name,Type] of definitions){const tool=new Type();tool.connectedCallback();assert.equal(tool.frames.length,0);tool.hidden=false;tool.activate();tool.activate();assert.equal(tool.frames.length,1);if(['flexible-pavement','culvert-hydraulics'].includes(name)){assert.equal(tool.frames[0].className,'tool-development');assert.equal(tool.frames[0].children[1].children[0].textContent,'Under Development');assert.equal(tool.querySelector('iframe'),undefined);admin=true;tool.activate();const frame=tool.querySelector('iframe');assert.ok(frame);assert.equal(tool.frames[0].hidden,true);frame.retainedInput='saved';admin=false;tool.activate();assert.equal(frame.hidden,true);assert.equal(tool.frames[0].hidden,false);admin=true;tool.activate();assert.equal(frame.hidden,false);assert.equal(frame.retainedInput,'saved');assert.equal(tool.frames.length,2);admin=false;continue;}assert.match(tool.frames[0].src,/\?v=release-test$/);assert.ok(tool.frames[0].title);}
for(const key of ['flexible','traffic','rainfall'])assert.equal(context.ToolkitRegistry.tools[key].access,undefined,'Public tool: '+key);
assert.equal(context.ToolkitRegistry.tools.flexible.title,'Flexible Pavement Design (UD)');
assert.equal(context.ToolkitRegistry.tools.traffic.title,'CESAL, W18');
assert.equal(context.ToolkitRegistry.tools.culvert.development,'ud');
console.log('Production build: exact data, optimized assets, stable cache versions, stale-file cleanup and eleven lazy tool registrations verified.');

assert.deepEqual(await readFile(new URL('../dist/components/design-criteria/reference-excerpts.pdf',import.meta.url)),await readFile(new URL('../src/components/design-criteria/reference-excerpts.pdf',import.meta.url)),'Manual excerpts must be deployed unchanged');

assert.deepEqual(await readFile(new URL('../dist/components/design-criteria/do-112-s2024-reference.pdf',import.meta.url)),await readFile(new URL('../src/components/design-criteria/do-112-s2024-reference.pdf',import.meta.url)),'The Department Order reference must be deployed unchanged');

assert.equal(context.ToolkitRegistry.tools.traffic.development,undefined,'CESAL is a public functional tool');
