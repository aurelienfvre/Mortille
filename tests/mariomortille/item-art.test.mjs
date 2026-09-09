import {prologueLevel} from '../../app/mariomortille/prologue-level.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {itemAssets,itemFrame,effectFrame} from '../../app/mariomortille/item-art.ts';
import {quartierLevels} from '../../app/mariomortille/levels.ts';
test('collectibles use existing PNGs and spinning coins show both faces and edges',()=>{
 const coins=new Set(Array.from({length:64},(_,t)=>itemFrame('coin',t)));
 assert.equal(coins.size,16);assert.equal(itemFrame('coin',64),'coin-01');
 assert.equal(new Set(Array.from({length:64},(_,t)=>itemFrame('secret',t))).size,16);
 for(const asset of itemAssets)assert.ok(existsSync(new URL(`../../public/mariomortille/items/${asset}.png`,import.meta.url)),asset);
 for(const level of [prologueLevel,...quartierLevels])for(const p of level.pickups)assert.ok(itemAssets.includes(itemFrame(p.kind,0)),p.kind);
});

test('every power pickup animates and one-shot effects terminate',()=>{
 for(const kind of ['turbo','ember','cloud','cobalt']){
  assert.equal(new Set(Array.from({length:64},(_,t)=>itemFrame(kind,t))).size,16);
  assert.equal(itemFrame(kind,64),itemFrame(kind,0));
 }
 assert.equal(effectFrame('pickup-burst',31),'pickup-burst-08');
 assert.equal(effectFrame('pickup-burst',32),null);
 assert.equal(effectFrame('impact',32),null);
 assert.equal(effectFrame('fireball',40),'fireball-01');
});
