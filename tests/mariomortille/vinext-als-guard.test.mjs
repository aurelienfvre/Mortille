import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import { patchAlsRegistry } from '../../plugins/vinext-als-guard.ts';
const id = '/vinext/dist/shims/internal/als-registry.js';
const source = await readFile(new URL('../../node_modules/vinext/dist/shims/internal/als-registry.js', import.meta.url), 'utf8');
// Execute the installed function body itself with an isolated registry.
function factory(text, registry) {
  const start = text.indexOf('function runOutsideRequestScopes(fn) {');
  const end = text.indexOf('\n//#endregion', start);
  return new Function('_registry', text.slice(start, end) + '\nreturn runOutsideRequestScopes;')(registry);
}
const patched = patchAlsRegistry(source, id).code;
test('installed implementation overflows on10000 dormant stores; guard does not', () => {
  const registry = new Set(Array.from({ length: 10000 }, () => new AsyncLocalStorage()));
  assert.throws(() => factory(source, registry)(() => 7), /call stack/i);
  assert.equal(factory(patched, registry)(() => 7), 7);
});
test('active request scopes exit across promises and restore caller context, including falsey stores', async () => {
  const inactive = Array.from({ length: 10000 }, () => new AsyncLocalStorage());
  const a=new AsyncLocalStorage(), b=new AsyncLocalStorage(), c=new AsyncLocalStorage();
  const outside = factory(patched, new Set([...inactive,a,b,c]));
  await a.run({ request: 1 }, () => b.run(false, () => c.run(null, async () => {
    const result = outside(async () => {
      assert.equal(a.getStore(), undefined); assert.equal(b.getStore(), undefined); assert.equal(c.getStore(), undefined);
      await Promise.resolve(); assert.equal(a.getStore(), undefined); return 9;
    });
    assert.deepEqual(a.getStore(),{request:1}); assert.equal(b.getStore(),false); assert.equal(c.getStore(),null);
    assert.equal(await result,9); assert.deepEqual(a.getStore(),{request:1});
    assert.throws(()=>outside(()=>{throw new Error('callback');}), /callback/); assert.deepEqual(a.getStore(),{request:1});
  })));
});
test('no-op browser stores never recurse through exit and callback executes once', () => {
  const fake={getStore:()=>undefined,exit:()=>{throw new Error('inactive fake exit invoked');}};
  let calls=0;factory(patched,new Set([fake]))(()=>calls++);assert.equal(calls,1);
});
test('parallel requests retain their own parent scopes',async()=>{
 const als=new AsyncLocalStorage(),outside=factory(patched,new Set([als]));
 await Promise.all([1,2].map(id=>als.run(id,async()=>{await outside(async()=>{await Promise.resolve();assert.equal(als.getStore(),undefined);});assert.equal(als.getStore(),id);})));
});
test('transform is targeted, query-compatible, idempotent and rejects upstream drift',()=>{
 assert.equal(patchAlsRegistry(source,'/app/other.js'),null);
 assert.ok(patchAlsRegistry(source,id+'?v=123'));
 assert.equal(patchAlsRegistry(patched,id),null);
 assert.throws(()=>patchAlsRegistry('new implementation',id),/changed/);
});
