import assert from 'node:assert/strict';import test from 'node:test';
import {boxLevelPowers,breakPowerBlock} from '../../app/mariomortille/power-blocks.ts';
import {createState,tick} from '../../app/mariomortille/simulation.ts';
import {quartierLevels} from '../../app/mariomortille/levels.ts';
const input={direction:0,jump:false,jumpPressed:false,run:false,powerPressed:false,downPressed:false};
function fixture(){return boxLevelPowers({id:'test',width:320,spawn:{x:120,y:262},tiles:Array.from({length:20},(_,i)=>({x:i*16,y:304,kind:'ground'})),pickups:[{id:'power',x:128,y:280,kind:'ember',collected:false},{id:'coin',x:240,y:280,kind:'coin',collected:false}],checkpoint:9999,goal:9999});}
test('power crate is solid overhead, releases once on head bump, then permits collecting its item',()=>{
 const l=fixture(),s=createState(l);tick(s,l,input);assert.equal(s.player.power,'none');assert.equal(s.pickups[0].blocked,true);
 let breaks=0;for(let i=0;i<60;i++){tick(s,l,{...input,jump:i<15,jumpPressed:i===0});breaks+=s.events.filter(e=>e==='break').length;}
 assert.equal(breaks,1);assert.equal(s.tiles.filter(t=>t.content).length,0);assert.equal(s.pickups.length,2);assert.equal(s.player.power,'ember');assert.ok(s.pickups[0].collected);
 for(let i=0;i<50;i++)tick(s,l,{...input,jump:true,jumpPressed:i===0});assert.equal(s.pickups.filter(p=>p.id==='power').length,1);
});
test('break is idempotent and the power waits visibly before it can equip',()=>{
 const s=createState(fixture()),block=s.tiles.find(t=>t.content);breakPowerBlock(s,block);breakPowerBlock(s,block);assert.equal(s.events.filter(e=>e==='break').length,1);assert.equal(s.pickups[0].blocked,false);assert.equal(s.pickups[0].availableAt,12);
});
test('all campaign power pickups have accessible crates without changing coins or creating floor walls',()=>{
 for(const l of quartierLevels){
  for(const item of l.pickups){if(['coin','secret','none'].includes(item.kind)){assert.ok(!item.blocked);continue;}
   assert.ok(item.blocked,item.id);const block=l.tiles.find(t=>t.content===item.id);assert.ok(block,item.id);
   const floor=l.tiles.filter(t=>t.kind==='ground'&&t.x<=item.x+8&&t.x+16>item.x+8&&t.y>=item.y).sort((a,b)=>a.y-b.y)[0];assert.equal(floor.y-(block.y+16),64,'42px standing body passes under the crate');
   assert.ok(!l.tiles.some(t=>t!==block&&t.x<block.x+20&&t.x+16>block.x-4&&t.y<floor.y&&t.y+16>floor.y-96),'crate approach and jump lane are clear of access steps');
  }
 }
});
