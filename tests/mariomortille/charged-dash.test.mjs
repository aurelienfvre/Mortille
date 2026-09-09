import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,tick,damage} from '../../app/mariomortille/simulation.ts';
import {encodeControls,decodeControls} from '../../app/mariomortille/replay-codec.ts';
import {heroPose,makeHeroMotion} from '../../app/mariomortille/hero-animation.ts';
const level={id:'charged-dash',width:1800,spawn:{x:64,y:262},tiles:Array.from({length:113},(_,i)=>({x:i*16,y:304,kind:'ground'})),pickups:[],enemies:[],checkpoint:1600,goal:1700};
const idle={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
function setup(power='none'){const s=createState(level);s.player.grounded=true;s.player.power=power;return s;}
function charge(s,n){for(let i=0;i<n;i++)tick(s,level,{...idle,dashPressed:i===0,dashHeld:true});}
test('held bit survives replay encoding, including release and ordinary tap compatibility',()=>{
 assert.equal(encodeControls({...idle,dashHeld:true}),2048);assert.deepEqual(decodeControls(2048),{...idle,dashHeld:true});assert.throws(()=>decodeControls(4096));
 const s=setup();charge(s,4);assert.equal(s.player.x,64);assert.ok(s.player.dashCharging);
 tick(s,level,idle);assert.equal(s.player.boost,12);assert.equal(s.player.dashStrength,0);assert.ok(s.player.x>68);assert.equal(s.player.dashCharging,false);
});
test('charge clamps at sixty ticks; stronger release goes further, retains direction and valid sprite indices',()=>{
 const distances=[];
 for(const hold of [4,30,90]){
  const s=setup();charge(s,hold);assert.equal(s.player.dashCharge,Math.min(hold,60));assert.equal(s.player.x,64);
  tick(s,level,{...idle,direction:-1});assert.equal(s.player.facing,1);
  const motion=makeHeroMotion(64);
  while(s.player.boost){assert.match(heroPose(motion,s.player),/^hero-dash-0[1-8]$/);tick(s,level,idle);}
  distances.push(s.player.x-64);
 }
 assert.ok(distances[0]<distances[1]&&distances[1]<distances[2]);
});
test('charge cancels on hurt, crouch or jump, cooldown and continuous held input cannot retrigger',()=>{
 for(const cancel of ['hurt','crouch','jump']){
  const s=setup();charge(s,30);
  if(cancel==='hurt')damage(s,level,0);else tick(s,level,{...idle,dashHeld:true,downHeld:cancel==='crouch',jumpPressed:cancel==='jump',jump:cancel==='jump'});
  assert.equal(s.player.dashCharging,false);tick(s,level,idle);assert.equal(s.player.boost,0);
 }
 const s=setup();charge(s,60);tick(s,level,idle);
 for(let i=0;i<100;i++)tick(s,level,{...idle,dashHeld:true});assert.equal(s.player.dashCharging,false);assert.equal(s.player.boost,0);
});
test('charged dash attacks a mob without bouncing, solid wall still blocks motion',()=>{
 const s=setup();charge(s,60);s.enemies=[{id:'target',kind:'pest',x:92,y:284,left:92,right:92,direction:1,defeated:false}];
 for(let i=0;i<8;i++)tick(s,level,idle);
 assert.equal(s.enemies[0].defeated,true);assert.equal(s.player.health,3);assert.equal(s.player.y,262);
 const w=setup();charge(w,60);w.tiles.push({x:112,y:272,kind:'ground'},{x:112,y:288,kind:'ground'});
 for(let i=0;i<15;i++)tick(w,level,idle);assert.ok(w.player.x<=92);assert.equal(w.tiles.filter(t=>t.x===112&&t.y<304).length,2);
});
test('charged boss impact scales damage only during an open defense',()=>{
 for(const [held,phase,expected] of [[24,'stunned',2],[60,'stunned',1],[60,'tell',3]]){
  const s=setup();charge(s,held);s.boss={kind:'pirate',activated:true,initialX:92,x:92,y:264,groundY:304,arenaLeft:0,arenaRight:900,direction:-1,health:3,phase,timer:99,hits:0};
  for(let i=0;i<5;i++)tick(s,level,idle);assert.equal(s.boss.health,expected);
 }
});
test('replaying held/released commands yields identical state for every outfit',()=>{
 for(const power of ['none','turbo','ember','cloud','cobalt']){
  const a=setup(power),b=setup(power);
  for(let i=0;i<120;i++){
   const input={...idle,...(i<45?{dashHeld:true}:{}),...(i===0?{dashPressed:true}:{})};
   tick(a,level,input);tick(b,level,decodeControls(encodeControls(input)));
  }
  assert.deepEqual(a,b);
 }
});
test('keyboard held state still allows aerial tap and switching cancels pending charge',async()=>{
 const air=setup();air.player.grounded=false;air.player.y=160;tick(air,level,{...idle,dashHeld:true,dashPressed:true});assert.equal(air.player.boost,12);
 const {createParty,switchPartyMember}=await import('../../app/mariomortille/party.ts');
 const s=setup();const party=createParty(s.player,{juju:{...s.player,x:32}});charge(s,30);const source=s.player;
 assert.equal(switchPartyMember(party,s,'juju'),true);assert.equal(source.dashCharging,false);assert.equal(source.boost,0);
});
test('charge audio rises at fixed thresholds and impact records the actual enemy position',()=>{
 const s=setup(),sounds=[];
 for(let i=0;i<60;i++){tick(s,level,{...idle,dashPressed:i===0,dashHeld:true});sounds.push(...s.events.filter(e=>e.startsWith('dash-charge')));}
 assert.deepEqual(sounds,['dash-charge-low','dash-charge-mid','dash-charge-high','dash-charge-full']);
 s.enemies=[{id:'impact',kind:'pest',x:92,y:284,left:92,right:92,direction:1,defeated:false}];
 tick(s,level,idle);assert.ok(s.events.includes('dash-release'));
 for(let i=0;i<8&&!s.lastDashImpact;i++)tick(s,level,idle);
 assert.ok(s.events.includes('dash-impact'));assert.equal(s.lastDashImpact.strength,1);assert.equal(s.lastDashImpact.y,294);assert.equal(s.lastDashImpact.tick,s.ticks);
});
