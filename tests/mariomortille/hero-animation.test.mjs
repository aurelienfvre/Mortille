import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createState } from '../../app/mariomortille/simulation.ts';
import { makeHeroMotion, advanceHeroMotion, heroPose, heroRecoil } from '../../app/mariomortille/hero-animation.ts';
const level={id:'pose-test',width:1000,spawn:{x:40,y:100},tiles:[],pickups:[],checkpoint:500,goal:900};
test('hero strides follow distance, stop when blocked, and reset after respawn',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=true;p.vx=115;
 const initial=heroPose(m,p);
 for(let i=0;i<10;i++)advanceHeroMotion(m,p);
 assert.equal(heroPose(m,p),initial,'velocity without movement must not animate sliding feet');
 p.x+=16;advanceHeroMotion(m,p);assert.notEqual(heroPose(m,p),initial);
 p.x=600;advanceHeroMotion(m,p);assert.equal(m.distance,0);
 p.vx=0;for(let i=0;i<144;i++)advanceHeroMotion(m,p);
 assert.match(heroPose(m,p),/^hero-idle-0[45]$/,'idle should reach a blink');
});
test('jump ascent, apex, descent and contact have separate existing PNGs; equipment stays visible',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);
 const poses=[];
 for(const vy of [-300,-150,0,180]) {p.vy=vy;poses.push(heroPose(m,p));}
 p.grounded=true;p.landing=5;poses.push(heroPose(m,p));p.landing=1;poses.push(heroPose(m,p));
 assert.equal(new Set(poses).size,6);
 for(const pose of poses)assert.ok(existsSync(new URL(`../../public/mariomortille/characters/aurelien/${pose.replace('hero-','')}.png`,import.meta.url)));
 p.landing=0;
 for(const power of ['turbo','ember','cloud','cobalt']) {p.power=power;assert.equal(heroPose(m,p),`hero-${power}-idle-01`);}
});

test('power actions follow live simulation counters and stop when their conditions end',async()=>{
 const {tick}=await import('../../app/mariomortille/simulation.ts');
 const s=createState(level),p=s.player,m=makeHeroMotion(p.x);
 const input={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:true};
 const seen=new Set();
 for(const power of ['ember','turbo']) {
  p.power=power;p.cooldown=0;p.boost=0;p.y=100;
  for(let i=0;i<22;i++) {
   tick(s,level,{...input,powerPressed:i===0});advanceHeroMotion(m,p,input);
   const pose=heroPose(m,p);seen.add(pose);
   assert.match(pose,new RegExp(`^hero-${power==='ember'?'ember-cast':'turbo-dash'}-`));
  }
  tick(s,level,{...input,powerPressed:false});advanceHeroMotion(m,p,input);assert.match(heroPose(m,p),new RegExp(`^hero-${power}-(jump|walk|run|idle)-`));
 }
 p.power='cloud';p.grounded=false;p.vy=85;
 advanceHeroMotion(m,p,{...input,jump:true});assert.equal(heroPose(m,p),'hero-cloud-glide-05');seen.add(heroPose(m,p));
 advanceHeroMotion(m,p,{...input,jump:false});assert.equal(heroPose(m,p),'hero-cloud-jump-05','release must stop gliding pose');
 p.power='cobalt';p.landing=0;
 for(const pound of [11,6,1]) {p.pound=pound;seen.add(heroPose(m,p));assert.match(heroPose(m,p),/^hero-cobalt-pound-/);}
 p.pound=0;for(const landing of [5,3,1]){p.landing=landing;seen.add(heroPose(m,p));}
 for(const pose of seen)assert.ok(existsSync(new URL(`../../public/mariomortille/characters/aurelien/${pose.replace('hero-','')}.png`,import.meta.url)),pose);
 p.power='none';assert.match(heroPose(m,p),/^hero-jump-/,'losing equipment must remove its visual immediately');
});

test('Ember idle keeps the shared blink timing and yields to locomotion and casting',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=true;p.power='ember';
 for(const ms of [0,1500,2300,2380,2440,2490,2570,3270]) {
  m.idleMs=ms;const equipped=heroPose(m,p);p.power='none';const plain=heroPose(m,p);p.power='ember';
  assert.equal(equipped,plain.replace('hero-idle','hero-ember-idle'));
  assert.ok(existsSync(new URL(`../../public/mariomortille/characters/aurelien/${equipped.replace('hero-','')}.png`,import.meta.url)));
 }
 p.vx=115;assert.equal(heroPose(m,p),'hero-ember-walk-01');p.vx=0;p.cooldown=22;assert.equal(heroPose(m,p),'hero-ember-cast-04');
});

test('taking damage with every equipment keeps the current PNG body through invulnerability',async()=>{
 const {damage,tick}=await import('../../app/mariomortille/simulation.ts');
 for(const power of ['none','ember','turbo','cloud','cobalt']) {
  const s=createState({...level,tiles:[{x:32,y:160,kind:'solid'}]}),p=s.player,m=makeHeroMotion(p.x);
  p.power=power;p.grounded=false;p.y=20;damage(s,level,p.x+40);
  assert.equal(p.power,'none');assert.equal(heroPose(m,p),'hero-hurt-01');assert.ok(heroRecoil(p)<0);
  for(let i=0;i<90;i++) {
   const pose=heroPose(m,p);assert.ok(pose,'must not fall back to the old atlas');
   assert.ok(existsSync(new URL(`../../public/mariomortille/characters/aurelien/${pose.replace('hero-','')}.png`,import.meta.url)));
   // Keep this rendering regression on a safe empty field rather than respawning.
   p.y=20;p.vy=0;
   tick(s,level,{direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false});advanceHeroMotion(m,p);
  }
  assert.equal(heroRecoil(p),0,'rotation resets after the impact');
 }
});

test('all equipped locomotion and checkpoint respawns resolve to new runtime PNGs',async()=>{
 const {damage}=await import('../../app/mariomortille/simulation.ts');
 for(const power of ['turbo','ember','cloud','cobalt']) {
  const s=createState(level),p=s.player,m=makeHeroMotion(p.x);s.savedPower=power;p.health=1;
  damage(s,level,p.x+20);assert.equal(p.power,power,'checkpoint restores equipped variant');
  for(const grounded of [true,false])for(const vx of [0,115,180])for(const phase of [0,20,45,65,85,110]) {
   p.grounded=grounded;p.vx=vx;m.distance=phase;const pose=heroPose(m,p);
   assert.match(pose,new RegExp(`^hero-${power}-`));
   assert.ok(existsSync(new URL(`../../public/mariomortille/characters/aurelien/gameplay/${pose.replace('hero-','')}.png`,import.meta.url)),pose);
  }
 }
});
