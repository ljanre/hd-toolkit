import {readFile} from 'node:fs/promises';
import {runInNewContext, Script} from 'node:vm';
import assert from 'node:assert/strict';
const code=await readFile(new URL('../src/components/coordinate-converter/converter.js',import.meta.url),'utf8');
new Script(code);
const context={};
runInNewContext(code.replace(/populateProvinces\(\);\s*$/, ''),context);
for(const cm of [117,119,121,123,125]) {
  const projected=context.wgs84ToPrs92(14.6,cm,cm);
  const geographic=context.prs92ToWgs84(projected.northing,projected.easting,cm);
  assert.ok(Number.isFinite(projected.northing)&&Number.isFinite(projected.easting));
  assert.ok(Math.abs(geographic.lat-14.6)<0.00001);
  assert.ok(Math.abs(geographic.lon-cm)<0.00001);
}
console.log('Coordinate converter syntax and round-trip consistency passed for all five central meridians.');
