import test from 'node:test';
import assert from 'node:assert/strict';
import {quartierLevels} from '../../app/mariomortille/levels.ts';
import {campaignEnemyKinds,campaignFactions} from '../../app/mariomortille/enemy-roster.ts';
import {prologueLevel} from '../../app/mariomortille/prologue-level.ts';
test('campaign rosters match teams and keep mini-boss arenas clear',()=>{
 for(const l of quartierLevels){
  if(l.boss)assert.equal(campaignFactions[l.id],l.boss,'zone faction follows its boss');
  assert.deepEqual(new Set(l.enemies.map(e=>e.kind)),new Set(campaignEnemyKinds[l.id]));
  if(l.boss)for(const e of l.enemies)assert.ok(e.right+20<(l.boss==='raphael'?l.width-1024:l.goal-640));
 }
});
test('five new prologue encounters have flat clear lanes after initial lessons',()=>{
 const l=prologueLevel,added=l.enemies.filter(e=>e.id.startsWith('tutorial-themed-'));
 assert.equal(added.length,5);
 for(const e of added){
  assert.ok(e.x>3072);
  for(let x=e.left-48;x<=e.right+68;x+=8){
   assert.ok(l.tiles.some(t=>t.kind==='ground'&&x>=t.x&&x<t.x+16&&t.y===e.y+20),e.id+' needs landing space');
   assert.equal(l.tiles.some(t=>x<t.x+16&&x+20>t.x&&e.y-22<t.y+16&&e.y+20>t.y),false,e.id+' has an obstruction');
  }
  assert.ok(l.enemies.every(other=>other===e||Math.abs(other.x-e.x)>240));
 }
});
