import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const root = new URL('../src/components/calendar-days/', import.meta.url);
const context = {};
runInNewContext(await readFile(new URL('engine.js', root), 'utf8'), context);
const { calculate, limits } = context.CalendarDays;
// Check both sides of every boundary, including centavo amounts.
const cases = [[0.01,15],[25e6,15],[49999999.99,15],[50e6,30],[50000000.01,30],
  [99999999.99,30],[100e6,30],[100000000.01,45],[125e6,45],
  [149999999.99,45],[150e6,45],[150000000.01,60],[175e6,60],
  [199999999.99,60],[200e6,60],[200000000.01,90],[500e6,90]];
for (const [amount, days] of cases) assert.equal(calculate(amount).days, days, String(amount));
for (const amount of [0,-1,NaN,Infinity,-Infinity,'50000000',null,undefined,Number.MAX_VALUE]) assert.throws(() => calculate(amount));
const nodes = new Map(['amount','days','result-note','amount-error','clear'].map(id => [id, {
  value:'',valueAsNumber:NaN,validity:{badInput:false},attributes:{},handlers:{},
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
console.log('Calendar Days: all ranges, exact boundaries, invalid input, live updates and Clear passed.');
