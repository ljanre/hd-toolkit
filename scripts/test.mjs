import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const suites = ['scripts/verify.mjs','scripts/verify-defaults.mjs','scripts/verify-illustration.mjs','scripts/verify-converter.mjs','scripts/verify-subgrade.mjs','scripts/verify-si.mjs','scripts/verify-strength.mjs','scripts/verify-cbr.mjs','scripts/verify-traffic.mjs','scripts/verify-shell.mjs','scripts/verify-flexible.mjs','src/components/subbase-thickness/tests/run-tests.js'];
suites.push('src/components/culvert-hydraulics/tests/hydraulics.test.mjs','scripts/verify-rigid-subbase.mjs','scripts/verify-performance.mjs','scripts/verify-project-details.mjs');
const outcomes = await Promise.all(suites.map(suite => new Promise(resolve => {
  const child = spawn(process.execPath,[suite],{cwd:root,windowsHide:true});
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  child.on('error', error => resolve({suite,ok:false,output:error.message}));
  child.on('close', code => resolve({suite,ok:code===0,output}));
})));
for (const outcome of outcomes) {
  console.log(`${outcome.ok?'PASS':'FAIL'} ${outcome.suite}`);
  if (!outcome.ok) console.error(outcome.output);
}
if (outcomes.some(outcome => !outcome.ok)) process.exitCode=1;
