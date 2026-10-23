import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const root = new URL('../src/components/calendar-days/', import.meta.url);
const context = { Intl };
runInNewContext(await readFile(new URL('engine.js', root), 'utf8'), context);
const { calculate, limits, elapsedDays, deadline } = context.CalendarDays;
// Check both sides of every boundary, including centavo amounts.
const cases = [[0.01,15],[25e6,15],[49999999.99,15],[50e6,30],[50000000.01,30],
  [99999999.99,30],[100e6,30],[100000000.01,45],[125e6,45],
  [149999999.99,45],[150e6,45],[150000000.01,60],[175e6,60],
  [199999999.99,60],[200e6,60],[200000000.01,90],[500e6,90]];
for (const [amount, days] of cases) assert.equal(calculate(amount).days, days, String(amount));
for (const amount of [0,-1,NaN,Infinity,-Infinity,'50000000',null,undefined,Number.MAX_VALUE]) assert.throws(() => calculate(amount));
const nodes = new Map(['amount','days','result-note','amount-error','clear','ntp-date','document-date','document-type','document-date-label','date-error','elapsed','elapsed-note','due-date','limit-check','day-progress'].map(id => [id, {
  value:'',valueAsNumber:NaN,validity:{badInput:false,valid:true},attributes:{},handlers:{},dataset:{},
  addEventListener(type,fn){this.handlers[type]=fn;},
  setAttribute(key,value){this.attributes[key]=value;},removeAttribute(key){delete this.attributes[key];},focus(){this.focused=true;}
}]));
const rows = limits.map(() => ({classList:{selected:false,add(){this.selected=true;},remove(){this.selected=false;}}}));
context.document = {getElementById:id=>nodes.get(id),querySelectorAll:()=>rows};
runInNewContext(await readFile(new URL('app.js', root),'utf8'),context);
const amount=nodes.get('amount'),days=nodes.get('days'),error=nodes.get('amount-error');
assert.equal(days.textContent,'—');
for (const [value,expected] of cases) {
  amount.value=String(value);amount.valueAsNumber=value;amount.handlers.input();
  assert.equal(days.textContent,String(expected));assert.equal(error.hidden,true);
  assert.equal(rows.filter(row=>row.classList.selected).length,1);
}
amount.value='-1';amount.valueAsNumber=-1;amount.handlers.input();
assert.equal(days.textContent,'—');assert.equal(error.hidden,false);assert.equal(amount.attributes['aria-invalid'],'true');
assert.equal(rows.some(row=>row.classList.selected),false);
nodes.get('clear').handlers.click();assert.equal(amount.value,'');assert.equal(days.textContent,'—');assert.equal(error.hidden,true);assert.equal(amount.focused,true);
amount.validity.badInput=true;amount.handlers.input();assert.equal(error.hidden,false,'Malformed number must show an error');

// Date-only arithmetic must remain stable across leap days, year ends and DST.
for (const [start,end,expected] of [
  ['2026-01-01','2026-01-01',0],['2026-01-01','2026-01-02',1],
  ['2024-02-28','2024-03-01',2],['2025-02-28','2025-03-01',1],
  ['2025-12-31','2026-01-01',1],['2026-03-07','2026-03-10',3],
  ['2026-10-31','2026-11-02',2]
]) assert.equal(elapsedDays(start,end),expected);
for (const invalid of ['',null,'2026-2-03','2026-02-30','2025-02-29','2026-13-01','0000-01-01']) {
  assert.throws(()=>elapsedDays(invalid,'2026-03-01'));
  assert.throws(()=>elapsedDays('2026-01-01',invalid));
}
assert.throws(()=>elapsedDays('2026-02-01','2026-01-31'));
assert.equal(deadline('2024-02-28',15).slice(0,10),'2024-03-14');
assert.equal(deadline('2026-12-15',30).slice(0,10),'2027-01-14');
const ntp=nodes.get('ntp-date'),issued=nodes.get('document-date'),type=nodes.get('document-type');
amount.validity.badInput=false;
nodes.get('clear').handlers.click();
ntp.value='2026-01-01';issued.value='2026-01-16';issued.handlers.input();
assert.equal(nodes.get('elapsed').textContent,'15','Dates work without an amount');
assert.equal(days.textContent,'—');
amount.value='25000000';amount.valueAsNumber=25e6;amount.handlers.input();
assert.equal(nodes.get('due-date').textContent,'16 Jan 2026');
assert.equal(nodes.get('limit-check').textContent,'At the calendar day limit.');
issued.value='2026-01-17';issued.handlers.change();
assert.equal(nodes.get('limit-check').textContent,'Over the limit by 1 day.');
assert.equal(nodes.get('limit-check').dataset.state,'over');
issued.value='2026-01-15';issued.handlers.input();
assert.equal(nodes.get('limit-check').textContent,'Within the limit · 1 day remaining.');
type.value='certificate';type.handlers.change();
assert.equal(nodes.get('document-date-label').textContent,'Certificate of No Changes issued date');
assert.match(nodes.get('elapsed-note').textContent,/Certificate of No Changes/);
issued.value='2025-12-31';issued.handlers.input();
assert.equal(nodes.get('date-error').hidden,false);
assert.equal(nodes.get('elapsed').textContent,'—');
assert.equal(nodes.get('day-progress').hidden,true);
assert.equal(issued.attributes['aria-invalid'],'true');
issued.value='2026-01-01';issued.handlers.input();
assert.equal(nodes.get('elapsed').textContent,'0');
assert.equal(nodes.get('date-error').hidden,true);
ntp.value='';ntp.validity.badInput=true;ntp.handlers.input();
assert.equal(ntp.attributes['aria-invalid'],'true');
ntp.validity.badInput=false;
nodes.get('clear').handlers.click();
assert.equal(ntp.value,'');assert.equal(issued.value,'');assert.equal(type.value,'plan');
assert.equal(nodes.get('elapsed').textContent,'—');assert.equal(nodes.get('due-date').textContent,'—');
console.log('Calendar Days: amount boundaries, date arithmetic, leap years, invalid dates, interactive limit checks and Clear passed.');
