import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState} from '../../app/mariomortille/simulation.ts';
import {createLevelParty,stepPartyControls} from '../../app/mariomortille/party.ts';
import {collectTrio} from '../../app/mariomortille/trio.ts';
import {encodeControls,decodeControls} from '../../app/mariomortille/replay-codec.ts';
const idle={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
const level={id:'quartier-01',width:1200,spawn:{x:64,y:262},tiles:Array.from({length:75},(_,i)=>({x:i*16,y:304,kind:'ground'})),pickups:[],enemies:[],checkpoint:600,goal:1100,boss:'pirate'};
function setup(){const world=createState(level),party=createLevelParty(world,level,['juju','ben']);world.player.grounded=true;party.trio.charges=1;return {world,party};}
test('V roundtrips and consumes a single amulet for one deterministic two-hit opening',()=>{
 const {world,party}=setup();world.boss={...world.boss,x:240,y:264,phase:'stunned',timer:96};
 const command={...idle,trioPressed:true};assert.equal(decodeControls(encodeControls(command)).trioPressed,true);
 collectTrio(party,world,true);assert.equal(party.trio.charges,0);assert.ok(party.trio.attack);
 const positions=party.members.map(m=>m.body.x);
 for(let i=0;i<114;i++)stepPartyControls(party,world,level,command);
 assert.equal(world.boss.health,1);assert.equal(world.boss.hits,2);assert.equal(party.trio.attack,null);assert.deepEqual(party.members.map(m=>m.body.x),positions);
});
test('closed boss defense survives the ray, and distant companions cannot trigger it',()=>{
 const {world,party}=setup();party.members[1].body.x=600;collectTrio(party,world,true);assert.equal(party.trio.charges,1);assert.equal(party.trio.attack,null);
 party.members[1].body.x=36;world.boss.x=240;world.boss.phase='tell';collectTrio(party,world,true);
 for(let i=0;i<60;i++)stepPartyControls(party,world,level,idle);
 assert.equal(world.boss.health,3);
});
test('solid wall stops the ray and replay reproduces the same score',()=>{
 const run=()=>{const {world,party}=setup();world.tiles.push({x:160,y:272,kind:'brick'});world.enemies.push({id:'blocked',kind:'pest',x:200,y:284,left:190,right:210,direction:1,defeated:false});collectTrio(party,world,true);for(let i=0;i<114;i++)stepPartyControls(party,world,level,decodeControls(encodeControls(idle)));return world;};
 const a=run(),b=run();assert.equal(a.enemies[0].defeated,false);assert.deepEqual(a,b);
});

test('solo amulet summons visible moving allies, fires once, then allies walk back out',()=>{
 const world=createState(level);world.player.grounded=true;
 const party=createLevelParty(world,level,[]);assert.equal(party.members.length,1);assert.equal(party.trio.amulets.length,1);
 party.trio.charges=1;stepPartyControls(party,world,level,{...idle,trioPressed:true});
 assert.equal(party.members.length,3);assert.equal(party.trio.charges,1);assert.equal(party.trio.gathering.phase,'arrive');assert.equal(party.trio.attack,null);
 let moving=0,fires=0,charged=false;
 for(let i=0;i<1000;i++){
  const previous=new Map(party.members.map(m=>[m.id,m.body.x]));
  stepPartyControls(party,world,level,idle);
  for(const m of party.members){const dx=Math.abs(m.body.x-previous.get(m.id));assert.ok(dx<=3.01,`no teleport ${m.id}: ${dx}`);if(dx>.1)moving++;}
  if(world.events.includes('trio-fire'))fires++;
  if(party.trio.attack)charged=true;
  if(charged&&!party.trio.attack&&!party.trio.gathering)break;
 }
 assert.ok(moving>20);assert.equal(fires,1);assert.equal(party.trio.charges,0);assert.equal(party.members.length,1);assert.equal(party.active,'aurel');
});
test('distant existing allies run to leader before consuming charge; replay is identical',()=>{
 const run=()=>{
  const {world,party}=setup();world.player.x=600;party.members[1].body.x=32;party.members[2].body.x=900;
  const starts=party.members.map(m=>m.body.x);stepPartyControls(party,world,level,decodeControls(encodeControls({...idle,trioPressed:true})));
  assert.equal(party.trio.charges,1);assert.ok(party.trio.gathering);let maximumStep=0,arrived=false;
  for(let i=0;i<800;i++){
   const xs=party.members.map(m=>m.body.x);stepPartyControls(party,world,level,decodeControls(encodeControls(idle)));
   maximumStep=Math.max(maximumStep,...party.members.map((m,j)=>Math.abs(m.body.x-xs[j])));
   if(party.trio.attack){arrived=true;break;}
  }
  assert.ok(arrived);assert.ok(maximumStep<=3.01);assert.equal(world.player.x,starts[0]);assert.equal(party.trio.charges,0);
  assert.ok(party.members.every(m=>Math.abs(m.body.x-world.player.x)<100));return{world,party};
 };assert.deepEqual(run(),run());
});
test('sealed path cancels rally visibly without spending amulet or moving through wall',()=>{
 const blocked={...level,tiles:[...level.tiles,...Array.from({length:19},(_,i)=>({x:320,y:i*16,kind:'brick'}))]};
 const world=createState(blocked);world.player.grounded=true;world.player.x=500;const party=createLevelParty(world,blocked,['juju','ben']);
 party.members[1].body.x=64;party.trio.charges=1;stepPartyControls(party,world,blocked,{...idle,trioPressed:true});
 for(let i=0;i<1801;i++)stepPartyControls(party,world,blocked,idle);
 assert.equal(party.trio.attack,null);assert.equal(party.trio.charges,1);assert.equal(party.trio.gathering,null);assert.ok(party.trio.notice>0);assert.ok(party.members[1].body.x<=300);
});
test('rally validates a jump over a short gap and refuses switching during approach',()=>{
 const terrain=level.tiles.filter(t=>t.x<128||t.x>=160),l={...level,tiles:terrain};
 const world=createState(l);world.player.grounded=true;world.player.x=340;
 const party=createLevelParty(world,l,['juju','ben']);party.members[1].body.x=64;party.trio.charges=1;
 stepPartyControls(party,world,l,{...idle,trioPressed:true});let airborne=false;
 for(let i=0;i<450&&!party.trio.attack;i++){
  stepPartyControls(party,world,l,{...idle,switchPressed:true});
  airborne||=!party.members[1].body.grounded;assert.equal(party.active,'aurel');
 }
 assert.ok(airborne);assert.ok(party.trio.attack);assert.equal(party.trio.charges,0);
});
