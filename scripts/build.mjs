import { readFile, writeFile, mkdir, readdir, rm, chmod } from 'node:fs/promises';
import { resolve, relative, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const project = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(project, 'src');
const output = resolve(project, 'dist');
const webExtensions = new Set(['.html','.js','.css','.png','.svg','.jpg','.jpeg','.webp','.ico','.json','.woff','.woff2']);
export function isRuntimeFile(name) {
  return (webExtensions.has(extname(name)) || name==='components/design-criteria/reference-excerpts.pdf') && !/(^|\/)tests\//.test(name) && !/(^|\/)qa\.(html|js)$/.test(name) && !/^components\/subbase-thickness\/[^/]+\.json$/.test(name) && !/^components\/subgrade-reaction\/figure-3-[36]\.png$/.test(name);
}
async function filesIn(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const results = await Promise.all(entries.map(async entry => {
    const path = resolve(folder, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Build source must not contain symbolic links: ' + path);
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return results.flat().sort();
}
const inputs = await filesIn(source);
await readFile(resolve(source, 'index.html'));
const runtime = inputs.filter(path => isRuntimeFile(relative(source,path).split(sep).join('/')));
const contents = new Map(await Promise.all(runtime.map(async path => [path, await readFile(path)])));
const digest = createHash('sha256');
for (const [path,bytes] of contents) digest.update(relative(source,path)).update(bytes);
// Build logic is part of the release identity, so optimizer changes also invalidate caches.
const version = digest.update(await readFile(fileURLToPath(import.meta.url))).digest('hex').slice(0,12);
function versionUrl(url, file) {
  if (/^(?:[a-z]+:|\/\/|#|data:)/i.test(url)) return url;
  const clean = url.split(/[?#]/)[0].replace(/figure-3-([36])\.png$/, 'figure-3-$1.webp');
  if (!clean || !contents.has(resolve(dirname(file),clean))) return url;
  const parsed = new URL(url,'https://build.invalid/');
  parsed.searchParams.set('v',version);
  return clean + parsed.search + parsed.hash;
}
// This is a fixed generated target, never the working source or GitHub checkout.
if (dirname(output) !== resolve(project) || output === source) throw new Error('Unsafe build output');
async function writableDirectories(folder) {
  await chmod(folder,0o777);
  for(const entry of await readdir(folder,{withFileTypes:true})) {
    if(entry.isSymbolicLink()) throw new Error('Generated output contains a linked path');
    if(entry.isDirectory()) await writableDirectories(resolve(folder,entry.name));
  }
}
try { if(process.platform==='win32') await writableDirectories(output); } catch (error) { if(error.code !== 'ENOENT') throw error; }
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
let originalBytes=0, deployedBytes=0;
for (const [file,bytes] of contents) {
  let data=bytes;
  const name=relative(source,file).split(sep).join('/');
  if(name==='components/subgrade-reaction/model-data.js') {
    const context={};runInNewContext(bytes.toString('utf8'),context);
    data=Buffer.from('// Exact runtime tables; source retains full precision and provenance.\nglobalThis.SubgradeModelTables='+JSON.stringify(context.SubgradeModelTables)+';\n');
  }
  if (['.html','.css','.js'].includes(extname(file))) {
    let text=data.toString('utf8');
    if(extname(file)==='.html') {
      text=text.replace(/((?:src|href)=["'])([^"']+)(["'])/g,(_,prefix,url,end)=>prefix+versionUrl(url,file)+end);
      text=text.replace('<head>','<head>\n  <meta name="hd-toolkit-build" content="'+version+'">');
      text=text.replace(/<img\b([^>]*?)>/g,(tag,attrs)=>'<img'+attrs+(/\bdecoding=/.test(attrs)?'':' decoding="async"')+'>');
    } else if(extname(file)==='.css') {
      text=text.replace(/url\((["']?)([^)'"\s]+)\1\)/g,(_,quote,url)=>'url('+quote+versionUrl(url,file)+quote+')');
    } else {
      text=text.replace(/(["'])((?:\.\.?\/[^"'\n]+|figure-3-[36])\.(?:html|css|js|png|svg|webp)(?:\?[^"'\n]*)?)\1/g,(_,quote,url)=>quote+versionUrl(url,file)+quote);
    }
    data=Buffer.from(text);
  }
  const target=resolve(output,name);
  await mkdir(dirname(target),{recursive:true});await writeFile(target,data);
  originalBytes+=bytes.length;deployedBytes+=data.length;
}
await writeFile(resolve(output,'build-manifest.json'),JSON.stringify({version,files:runtime.length,sourceBytes:originalBytes,deployedBytes,excludedFiles:inputs.length-runtime.length},null,2)+'\n');
console.log(`Built ${runtime.length} runtime files (${inputs.length-runtime.length} development files excluded), ${(deployedBytes/1048576).toFixed(2)} MB; release ${version}.`);
