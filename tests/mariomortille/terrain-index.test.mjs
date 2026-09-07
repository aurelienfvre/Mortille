import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collisionCandidates} from '../../app/mariomortille/terrain-index.ts';
test('long terrain queries keep original collision order and include all overlaps',()=>{
 const tiles=Array.from({length:16000},(_,i)=>({x:(i%4000)*16,y:Math.floor(i/4000)*16,kind:'ground'}));
 for(const x of [0,17,635,24000,63950]){
  const candidates=collisionCandidates(tiles,x,20);
  const all=tiles.filter(t=>x<t.x+16&&x+20>t.x);
  assert.deepEqual(candidates.filter(t=>all.includes(t)),all);
  assert.ok(candidates.length<32);
 }
 const near=collisionCandidates(tiles,0,20)[0];tiles.splice(tiles.indexOf(near),1);
 assert.ok(!collisionCandidates(tiles,0,20).includes(near));
 const restored=[near,...tiles];assert.ok(collisionCandidates(restored,0,20).includes(near));
});
