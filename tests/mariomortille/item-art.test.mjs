import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {itemAssets,itemFrame} from '../../app/mariomortille/item-art.ts';
import {quartierLevels} from '../../app/mariomortille/levels.ts';
test('collectibles use existing PNGs and spinning coins show both faces and edges',()=>{
 const coins=new Set(Array.from({length:48},(_,t)=>itemFrame('coin',t)));
 assert.equal(coins.size,8);assert.equal(itemFrame('coin',48),'coin-01');
 assert.equal(new Set(Array.from({length:40},(_,t)=>itemFrame('secret',t))).size,4);
 for(const asset of itemAssets)assert.ok(existsSync(new URL(`../../public/mariomortille/items/${asset}.png`,import.meta.url)),asset);
 for(const level of quartierLevels)for(const p of level.pickups)assert.ok(itemAssets.includes(itemFrame(p.kind,0)),p.kind);
});
