import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createState} from '../../app/mariomortille/simulation.ts';
import {companionPose,partyClips} from '../../app/mariomortille/party-art.ts';
import {makeHeroMotion} from '../../app/mariomortille/hero-animation.ts';
test('every companion action and equipment frame exists in the published atlas',()=>{
 const atlas=JSON.parse(fs.readFileSync(new URL('../../public/mariomortille/party/party-atlas.json',import.meta.url)));
 for(const id of ['ben','juju'])for(const power of ['none','ember','cloud','cobalt','turbo'])for(const [action,count] of Object.entries(partyClips))for(let n=1;n<=count;n++){
  const key=`party-${id}-${power==='none'?'':power+'-'}${action}-${String(n).padStart(2,'0')}`;
  assert.ok(atlas.frames[key],key);
 }
 const p=createState({id:'test',width:600,spawn:{x:0,y:0},tiles:[],pickups:[],goal:590,checkpoint:500}).player;
 const motion=makeHeroMotion(0);
 for(const id of ['ben','juju'])for(const power of ['none','ember','cloud','cobalt','turbo']){
  p.power=power;
  for(const stance of [{grounded:true,vx:0},{grounded:true,vx:180},{grounded:false,vy:-300},{grounded:false,vy:100},{crouching:true},{crouching:false,boost:22},{boost:0,invulnerable:90}]){
   Object.assign(p,stance);assert.ok(atlas.frames[companionPose(id,p,motion)]);
  }
  assert.ok(atlas.frames[companionPose(id,p,motion,true)]);
 }
});

test('approved equipment clips stay inside the actual atlas and hold the final pose',async()=>{
 const {companionEquipment,companionEquipFrame,companionEquipDuration}=await import('../../app/mariomortille/party-art.ts');
 const atlas=JSON.parse(fs.readFileSync(new URL('../../public/mariomortille/party/party-atlas.json',import.meta.url)));
 for(const [id,clip] of Object.entries(companionEquipment)){
  const [character,power]=id.split('-');assert.equal(clip.frames.length,clip.durations.length);
  assert.deepEqual(clip.anchor,[32,58]);let time=0;
  for(let i=0;i<clip.frames.length;i++){
   assert.equal(companionEquipFrame(character,power,time),clip.frames[i]);
   assert.equal(companionEquipFrame(character,power,time+clip.durations[i]-1),clip.frames[i]);
   const f=atlas.frames[clip.frames[i]].frame;
   assert.equal(f.w,64);assert.equal(f.h,64);assert.ok(f.x+64<=atlas.meta.size.w&&f.y+64<=atlas.meta.size.h);
   time+=clip.durations[i];
  }
  assert.equal(companionEquipDuration(character,power),time);
  assert.equal(companionEquipFrame(character,power,time+99999),clip.frames.at(-1));
  assert.equal(companionEquipFrame(character,power,-1),clip.frames[0]);
 }
 assert.equal(companionEquipFrame('unknown','ember',0),null);
});

test('Juju uses release pose for instant shot, actual flight and impact phases',()=>{
 const p=createState({id:'test',width:600,spawn:{x:0,y:0},tiles:[],pickups:[],goal:590,checkpoint:500}).player;
 const m=makeHeroMotion(0);p.power='ember';m.castTicks=22;
 assert.equal(companionPose('juju',p,m),'party-juju-ember-cast-05');
 m.castTicks=15;assert.equal(companionPose('juju',p,m),'party-juju-ember-cast-06');
 p.power='cloud';m.castTicks=0;m.gliding=true;m.glideTicks=1;
 assert.equal(companionPose('juju',p,m),'party-juju-cloud-fly-01');
 p.power='cobalt';m.gliding=false;p.pound=1;
 assert.equal(companionPose('juju',p,m),'party-juju-cobalt-pound-05');
 p.pound=0;p.grounded=true;m.landingMs=0;m.poundLanding=true;
 assert.equal(companionPose('juju',p,m),'party-juju-cobalt-pound-06');
 p.power='none';p.crouching=true;p.vx=30;m.crouchDistance=0;
 assert.equal(companionPose('juju',p,m),'party-juju-crouch-walk-01');
});

test('authored turn profiles do not receive a second mirror',async()=>{
 const {advanceCompanionVisual,companionFlipX}=await import('../../app/mariomortille/party-art.ts');
 const p=createState({id:'test',width:600,spawn:{x:0,y:0},tiles:[],pickups:[],goal:590,checkpoint:500}).player;
 const m=makeHeroMotion(0);p.grounded=true;p.facing=1;advanceCompanionVisual(m,p);p.facing=-1;advanceCompanionVisual(m,p);
 assert.equal(companionPose('juju',p,m),'party-juju-turn-01');assert.equal(companionFlipX('juju',p,m),false);
 for(let i=0;i<23;i++)advanceCompanionVisual(m,p);
 assert.equal(companionPose('juju',p,m),'party-juju-turn-04');assert.equal(companionFlipX('juju',p,m),false);
 advanceCompanionVisual(m,p);assert.equal(companionFlipX('juju',p,m),true);
 p.facing=1;advanceCompanionVisual(m,p);assert.equal(companionFlipX('juju',p,m),true);
 p.power='ember';m.castTicks=22;assert.equal(companionPose('ben',p,m),'party-ben-ember-cast-06');
});

test('every authored companion action has real bounded atlas frames and timings',async()=>{
 const {companionActions,companionActionFrame,companionActionDuration}=await import('../../app/mariomortille/party-art.ts');
 const atlas=JSON.parse(fs.readFileSync(new URL('../../public/mariomortille/party/party-atlas.json',import.meta.url)));
 for(const [key,clip] of Object.entries(companionActions)){
  assert.equal(clip.frames.length,clip.durations.length);assert.ok(clip.frames.length>0);let time=0;
  for(let i=0;i<clip.frames.length;i++){
   const frame=atlas.frames[clip.frames[i]]?.frame;assert.ok(frame,clip.frames[i]);assert.equal(frame.w,64);assert.equal(frame.h,64);
   assert.ok(frame.x>=0&&frame.y>=0&&frame.x+64<=atlas.meta.size.w&&frame.y+64<=atlas.meta.size.h);
   assert.equal(companionActionFrame(key,time),clip.frames[i]);time+=clip.durations[i];
  }
  assert.equal(companionActionDuration(key),time);assert.equal(companionActionFrame(key,time+10000),clip.frames.at(-1));
 }
 assert.equal(companionActionFrame('unknown-action',0),null,'missing actions are not advertised as authored');
});
