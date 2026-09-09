import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,tick} from '../../app/mariomortille/simulation.ts';
import {createLevelParty,stepPartyControls,switchPartyMember} from '../../app/mariomortille/party.ts';
import {encodeControls,decodeControls} from '../../app/mariomortille/replay-codec.ts';
const l={id:'character-charge',width:1600,spawn:{x:64,y:262},tiles:Array.from({length:100},(_,i)=>({x:i*16,y:304,kind:'ground'})),pickups:[],enemies:[],checkpoint:1450,goal:1550};
const idle={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
function setup(id,power='none'){const s=createState(l);s.player.grounded=true;s.player.characterId=id;s.player.power=power;return s;}
function hold(s,n=60){for(let i=0;i<n;i++)tick(s,l,{...idle,dashHeld:true,dashPressed:i===0});}
const enemy=x=>({id:'target'+x,kind:'pest',x,y:284,left:x,right:x,direction:1,defeated:false});
test('tap C remains normal dash for all heroes; only Aurel long hold propels',()=>{
 for(const id of ['aurel','juju','ben']){
  const s=setup(id);hold(s,4);tick(s,l,idle);assert.equal(s.player.boost,12);assert.equal(s.player.x>64,true);assert.equal(s.lastCharacterAttack,undefined);
 }
 const s=setup('aurel');hold(s);tick(s,l,idle);assert.equal(s.player.boost,30);assert.equal(s.lastCharacterAttack,undefined);
});
test('Juju transforms for six seconds, claws initially and on X, then keeps original outfit',()=>{
 const s=setup('juju','ember');hold(s);s.enemies=[enemy(120)];tick(s,l,idle);
 assert.equal(s.player.bearTicks,360);assert.equal(s.player.boost,0);assert.equal(s.player.x,64);assert.equal(s.enemies[0].defeated,false);assert.ok(s.events.includes('bear-transform'));
 for(let i=0;i<19;i++)tick(s,l,idle);assert.equal(s.enemies[0].defeated,false);tick(s,l,idle);assert.equal(s.enemies[0].defeated,true);
 assert.equal(s.lastCharacterAttack.kind,'claw');assert.equal(s.player.power,'ember');
 tick(s,l,{...idle,powerPressed:true});assert.equal(s.projectiles.length,0);assert.equal(s.events.includes('bear-claw'),false);
 while(s.player.clawCooldown)tick(s,l,idle);s.enemies.push(enemy(124));tick(s,l,{...idle,powerPressed:true});
 assert.equal(s.player.bearClawAge,0);for(let i=0;i<20;i++)tick(s,l,idle);
 assert.equal(s.enemies[1].defeated,true);assert.ok(s.events.includes('bear-claw'));assert.equal(s.projectiles.length,0);
 while(s.player.bearTicks>1)tick(s,l,idle);tick(s,l,idle);assert.equal(s.player.bearTicks,0);assert.ok(s.events.includes('bear-revert'));assert.equal(s.player.power,'ember');
 while((s.player.bearRevertAge??-1)>=0)tick(s,l,idle);
 tick(s,l,{...idle,powerPressed:true});assert.equal(s.projectiles.length,1);
});
test('Ben palm is frontal, bounded by walls and leaves enemies behind untouched',()=>{
 const s=setup('ben');hold(s);s.enemies=[enemy(30),enemy(180),enemy(300)];s.tiles.push({x:240,y:272,kind:'ground'},{x:240,y:288,kind:'ground'});tick(s,l,idle);
 assert.equal(s.player.x,64);assert.equal(s.player.boost,0);assert.equal(s.lastCharacterAttack.kind,'palm');assert.equal(s.lastCharacterAttack.reach,156);
 assert.ok(s.events.includes('palm-wave'));assert.deepEqual(s.enemies.map(e=>e.defeated),[false,false,false]);
 for(let i=0;i<30;i++)tick(s,l,idle);assert.deepEqual(s.enemies.map(e=>e.defeated),[false,true,false]);assert.ok(s.enemies[1].x>180&&s.enemies[1].x+20<=240);
});
test('palm and claw respect boss defense and scale damage with charge',()=>{
 for(const id of ['juju','ben'])for(const [ticks,phase,health] of [[24,'stunned',2],[60,'stunned',1],[60,'tell',3]]){
  const s=setup(id);hold(s,ticks);s.boss={kind:'pirate',activated:true,initialX:110,x:110,y:264,groundY:304,arenaLeft:0,arenaRight:900,direction:-1,health:3,phase,timer:99,hits:0};tick(s,l,idle);for(let i=0;i<20;i++)tick(s,l,idle);assert.equal(s.boss.health,health);
 }
});
test('party bodies carry correct identity and encoded switching/charges replay identically',()=>{
 const run=()=>{
  const s=createState(l);s.player.grounded=true;const p=createLevelParty(s,l,['juju','ben']);
  assert.deepEqual(p.members.map(m=>m.body.characterId),['aurel','juju','ben']);
  switchPartyMember(p,s,'juju');for(let i=0;i<90;i++)stepPartyControls(p,s,l,idle);
  for(let i=0;i<61;i++)stepPartyControls(p,s,l,decodeControls(encodeControls({...idle,...(i<60?{dashHeld:true}:{}),...(i===0?{dashPressed:true}:{})})));
  assert.ok(s.player.bearTicks>0);assert.equal(s.player.characterId,'juju');for(let i=0;i<20;i++)stepPartyControls(p,s,l,idle);assert.equal(s.lastCharacterAttack.kind,'claw');return{s,p};
 };assert.deepEqual(run(),run());
});
test('palm breaks weak content once with delayed release, pushes free objects and stops at reinforced wall',()=>{
 const s=setup('ben');hold(s,59);
 s.tiles.push({x:128,y:272,kind:'weak',content:'gift'},{x:224,y:272,kind:'reinforced'},{x:224,y:288,kind:'reinforced'},{x:256,y:272,kind:'weak'});
 s.pickups=[{id:'gift',kind:'ember',x:128,y:272,collected:false,blocked:true},{id:'free',kind:'coin',x:180,y:280,collected:false}];
 tick(s,l,idle);let releaseAt;
 for(let i=0;i<45;i++){
  tick(s,l,idle);const gift=s.pickups[0];if(!gift.blocked){releaseAt??=gift.availableAt;assert.equal(gift.availableAt,releaseAt);assert.equal(s.pickups.length,2);}
 }
 assert.ok(releaseAt);assert.equal(s.tiles.some(t=>t.x===128&&t.kind==='weak'),false);assert.equal(s.tiles.some(t=>t.x===256&&t.kind==='weak'),true);
 assert.equal(s.tiles.filter(t=>t.kind==='reinforced').length,2);assert.ok(s.pickups[1].x>180&&s.pickups[1].x+16<=224);assert.equal(s.palmWaves.length,0);
});
test('three bear stages use exact hold boundaries, persist on release and restore outfit',async()=>{
 const {bearChargeStage,bearVisualStage}=await import('../../app/mariomortille/character-charge.ts');
 for(const [held,stage] of [[0,0],[8,0],[9,1],[29,1],[30,2],[59,2],[60,3],[90,3]])assert.equal(bearChargeStage(held),stage);
 for(const [held,stage] of [[9,1],[29,1],[30,2],[59,2],[60,3]]){
  const s=setup('juju','cobalt');hold(s,held);assert.equal(bearVisualStage(s.player),stage);
  tick(s,l,idle);assert.equal(s.player.bearStage,stage);assert.equal(s.player.bearTicks,stage*120);assert.equal(bearVisualStage(s.player),stage);
  s.boss={kind:'pirate',activated:true,initialX:110,x:110,y:264,groundY:304,arenaLeft:0,arenaRight:900,direction:-1,health:3,phase:'stunned',timer:99,hits:0};
  for(let i=0;i<20;i++)tick(s,l,idle);assert.equal(s.lastCharacterAttack.force,stage);assert.equal(s.boss.health,3-Math.min(stage,2));s.boss=null;
  while(s.player.bearTicks||(s.player.bearRevertAge??-1)>=0)tick(s,l,idle);assert.equal(s.player.bearStage,0);assert.equal(bearVisualStage(s.player),0);assert.equal(s.player.power,'cobalt');
 }
});
test('form expiry visibly descends every stage, blocks fresh attacks, then restores original equipment',async()=>{
 const {bearReturnTransition,bearVisualStage,BEAR_RETURN_STEP_TICKS}=await import('../../app/mariomortille/character-charge.ts');
 for(const initial of [1,2,3]){
  const s=setup('juju','ember');Object.assign(s.player,{bearStage:initial,bearTicks:1,bearStrength:1,bearClawAge:-1});
  tick(s,l,idle);assert.equal(s.player.bearTicks,0);
  for(let stage=initial;stage>0;stage--){
   assert.deepEqual(bearReturnTransition(s.player),{from:stage,to:stage-1,age:0,duration:24});
   for(let age=0;age<BEAR_RETURN_STEP_TICKS;age++){
    assert.equal(bearVisualStage(s.player),stage);assert.equal(s.player.bearRevertAge,age);
    tick(s,l,stage===1&&age===BEAR_RETURN_STEP_TICKS-1?idle:{...idle,direction:1,powerPressed:true,dashHeld:true,dashPressed:true});
    assert.equal(s.projectiles.length,0);assert.equal(s.player.dashCharging,false);assert.equal(s.player.bearClawAge,-1);
   }
  }
  assert.equal(bearReturnTransition(s.player),null);assert.equal(bearVisualStage(s.player),0);assert.equal(s.player.power,'ember');
  tick(s,l,{...idle,powerPressed:true});assert.equal(s.projectiles.length,1);
 }
});
test('reset clears a partial return immediately without changing the retained equipment',async()=>{
 const {clearCharacterForm,bearReturnTransition}=await import('../../app/mariomortille/character-charge.ts');
 const s=setup('juju','cloud');Object.assign(s.player,{bearStage:2,bearTicks:0,bearRevertAge:12,specialRecovery:12});
 clearCharacterForm(s.player);assert.equal(bearReturnTransition(s.player),null);assert.equal(s.player.bearStage,0);assert.equal(s.player.specialRecovery,0);assert.equal(s.player.power,'cloud');
});
test('nonfatal damage preserves the descent while death resets it immediately',async()=>{
 const {damage}=await import('../../app/mariomortille/simulation.ts');
 const s=setup('juju');Object.assign(s.player,{bearStage:2,bearTicks:0,bearRevertAge:8,specialRecovery:16});
 damage(s,l,500);assert.equal(s.player.health,2);assert.equal(s.player.bearStage,2);assert.equal(s.player.bearRevertAge,8);
 s.player.invulnerable=0;s.player.health=1;damage(s,l,500);assert.equal(s.player.bearStage,0);assert.equal(s.player.bearRevertAge,-1);
});
test('progressive return has the same exact stages and timing through replay encoding',()=>{
 const run=encoded=>{const s=setup('juju');Object.assign(s.player,{bearStage:3,bearTicks:1,bearRevertAge:-1});const seen=[];
  for(let i=0;i<76;i++){const c={...idle,direction:i<72?1:0,powerPressed:i%7===0};tick(s,l,encoded?decodeControls(encodeControls(c)):c);seen.push([s.player.bearStage,s.player.bearRevertAge,s.player.x,s.player.bearTicks]);}return seen;
 };assert.deepEqual(run(false),run(true));
});

test('all equipped powers survive each bear charge stage and the complete return sequence',()=>{
 for(const power of ['none','ember','turbo','cloud','cobalt'])for(const [held,stage] of [[20,1],[45,2],[60,3]]){
  const s=setup('juju',power);hold(s,held);tick(s,l,idle);
  assert.equal(s.player.bearStage,stage);assert.equal(s.player.power,power);
  let frames=0;
  while(s.player.bearTicks>0||(s.player.bearRevertAge??-1)>=0){
   tick(s,l,idle);assert.equal(s.player.power,power,`${power}: stage ${stage}, tick ${frames}`);
   assert.ok(++frames<500,'form must finish its descent');
  }
  assert.equal(s.player.bearStage,0);assert.equal(s.player.power,power);
 }
});
