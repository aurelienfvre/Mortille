import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createState, tick } from '../../app/mariomortille/simulation.ts';
const level = {id:'dash-test',width:1000,spawn:{x:30,y:100},tiles:[],pickups:[],checkpoint:900,goal:950};
const control = {direction:1,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
test('dash is available with every outfit, Turbo is stronger and taps respect recovery', () => {
  for (const power of ['none','turbo','ember','cloud','cobalt']) {
    const s=createState(level);s.player.power=power;
    tick(s,level,{...control,dashPressed:true});
    assert.equal(s.player.boost,power==='turbo'?22:12);
    assert.ok(s.events.includes('boost'));
    assert.ok(s.player.x > level.spawn.x + 4, 'dash must propel from rest immediately');
    tick(s,level,{...control,dashPressed:true});
    assert.equal(s.events.includes('boost'),false);
  }
});
