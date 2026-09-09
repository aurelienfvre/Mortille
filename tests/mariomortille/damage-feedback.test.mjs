import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, damage} from '../../app/mariomortille/simulation.ts';
const level={id:'impact',width:1000,spawn:{x:40,y:100},tiles:[],pickups:[],checkpoint:500,goal:900};
test('one impact emits one hurt cue, strips equipment first, and cannot repeat during protection',()=>{
 const s=createState(level); s.player.power='ember';
 damage(s,level,90);
 assert.equal(s.player.power,'none'); assert.equal(s.player.health,3);
 assert.deepEqual(s.events,['hurt']);
 s.events=[];damage(s,level,90);
 assert.deepEqual(s.events,[]); assert.equal(s.player.health,3);
 s.player.invulnerable=0; damage(s,level,90);
 assert.deepEqual(s.events,['hurt']); assert.equal(s.player.health,2);
});
test('fatal impact emits one hurt cue and returns to the checkpoint without duplicating it',()=>{
 const s=createState(level);s.player.health=1;s.checkpointSpawn={x:240,y:100};
 damage(s,level,90);
 assert.deepEqual(s.events,['hurt']);assert.equal(s.player.health,3);assert.equal(s.player.x,240);
});
