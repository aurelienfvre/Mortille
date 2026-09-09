import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,tick} from '../../app/mariomortille/simulation.ts';
import {chargedAttackBreaks} from '../../app/mariomortille/power-blocks.ts';
const level={id:'charged-blocks',width:900,spawn:{x:64,y:262},tiles:Array.from({length:57},(_,i)=>({x:i*16,y:304,kind:'ground'})),pickups:[],enemies:[],checkpoint:800,goal:850};
const idle={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
function setup(id){const s=createState(level);s.player.characterId=id;s.player.grounded=true;return s;}
function hold(s,count){for(let i=0;i<count;i++)tick(s,level,{...idle,dashHeld:true,dashPressed:i===0});}
const mob=x=>({id:'mob'+x,kind:'pest',x,y:284,left:x,right:x,direction:1,defeated:false});
test('ordinary block kinds break without maximum, reinforced needs exactly full and ground never breaks',()=>{
 for(const kind of ['weak','brick','ice']){assert.equal(chargedAttackBreaks(kind,0),true);assert.equal(chargedAttackBreaks(kind,1),true);}
 assert.equal(chargedAttackBreaks('reinforced',51/52),false);assert.equal(chargedAttackBreaks('reinforced',1),true);assert.equal(chargedAttackBreaks('ground',1),false);
});
test('Aurel tap dash and Ben partial palm break each ordinary block',()=>{
 for(const id of ['aurel','ben'])for(const kind of ['weak','brick','ice']){
  const s=setup(id);hold(s,id==='aurel'?4:9);s.tiles.push({x:96,y:272,kind});
  for(let i=0;i<25;i++)tick(s,level,idle);
  assert.equal(s.tiles.some(t=>t.x===96&&t.y===272),false,`${id} ${kind}`);
 }
});
test('59 ticks stops at reinforced; 60 breaks it, reaches enemy, emits content once and stops at structural wall',()=>{
 for(const id of ['aurel','ben'])for(const charge of [59,60]){
  const s=setup(id);hold(s,charge);
  s.tiles.push({x:128,y:272,kind:'reinforced',content:'prize'},{x:240,y:272,kind:'ground'},{x:240,y:288,kind:'ground'});
  s.pickups=[{id:'prize',kind:'ember',x:128,y:272,blocked:true,collected:false}];s.enemies=[mob(180),mob(280)];let releaseTick;
  for(let i=0;i<50;i++){
   tick(s,level,idle);
   if(!s.pickups[0].blocked){releaseTick??=s.ticks;assert.equal(s.pickups[0].availableAt,releaseTick+12);}
  }
  assert.equal(s.tiles.some(t=>t.x===128&&t.kind==='reinforced'),charge<60,`${id} ${charge}`);
  assert.equal(s.enemies[0].defeated,charge===60);assert.equal(s.enemies[1].defeated,false);
  assert.equal(s.pickups.length,1);assert.equal(s.pickups[0].blocked,charge<60);assert.equal(s.tiles.filter(t=>t.x===240&&t.y<304).length,2);assert.ok(s.player.x<=220);
 }
});
test('ordinary Aurel dash and partial Ben palm already defeat an unshielded mob',()=>{
 for(const id of ['aurel','ben']){
  const s=setup(id);hold(s,id==='aurel'?4:9);s.enemies=[mob(100)];
  for(let i=0;i<16;i++)tick(s,level,idle);assert.equal(s.enemies[0].defeated,true);assert.equal(s.player.health,3);
 }
});
