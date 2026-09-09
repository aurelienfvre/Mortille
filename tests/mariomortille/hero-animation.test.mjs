import {heroAtlasHas} from './hero-atlas-helpers.mjs';
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
 assert.match(heroPose(m,p),/^hero-idle-07$/,'native idle advances at six frames per second');
});
test('jump ascent, apex, descent and contact have separate existing PNGs; equipment stays visible',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);
 const poses=[];
 for(const vy of [-300,-150,0,180]) {p.vy=vy;poses.push(heroPose(m,p));}
 p.grounded=true;p.landing=5;poses.push(heroPose(m,p));p.landing=1;poses.push(heroPose(m,p));
 assert.equal(new Set(poses).size,6);
 for(const pose of poses)assert.ok(existsSync(new URL(`../../assets-source/mariomortille/aurelien/${pose.replace('hero-','')}.png`,import.meta.url)));
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
 advanceHeroMotion(m,p,{...input,jump:true});assert.equal(heroPose(m,p),'hero-cloud-glide-01');seen.add(heroPose(m,p));
 advanceHeroMotion(m,p,{...input,jump:false});assert.equal(heroPose(m,p),'hero-cloud-jump-05','release immediately returns to the equipped falling pose');
 for(let i=0;i<4;i++)advanceHeroMotion(m,p,{...input,jump:false});
 assert.equal(heroPose(m,p),'hero-cloud-jump-05','released flight stays in the falling pose');
 p.power='cobalt';p.landing=0;
 for(const pound of [11,6,1]) {p.pound=pound;seen.add(heroPose(m,p));assert.match(heroPose(m,p),/^hero-cobalt-pound-/);}
 p.pound=0;for(const landing of [5,3,1]){p.landing=landing;seen.add(heroPose(m,p));}
 for(const pose of seen)assert.ok(existsSync(new URL(`../../assets-source/mariomortille/aurelien/${pose.replace('hero-','')}.png`,import.meta.url)),pose);
 p.power='none';assert.match(heroPose(m,p),/^hero-jump-/,'losing equipment must remove its visual immediately');
});

test('Ember idle keeps the shared blink timing and yields to locomotion and casting',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=true;p.power='ember';
 for(const ms of [0,1500,2300,2380,2440,2490,2570,3270]) {
  m.idleMs=ms;const equipped=heroPose(m,p);p.power='none';const plain=heroPose(m,p);p.power='ember';
  assert.equal(equipped,plain.replace('hero-idle','hero-ember-idle'));
  assert.equal(plain,`hero-idle-${String(Math.floor(ms*6/1000)%8+1).padStart(2,'0')}`);
  assert.ok(existsSync(new URL(`../../assets-source/mariomortille/aurelien/${equipped.replace('hero-','')}.png`,import.meta.url)));
 }
 p.vx=115;assert.equal(heroPose(m,p),'hero-ember-walk-01');p.vx=0;p.cooldown=22;advanceHeroMotion(m,p);assert.equal(heroPose(m,p),'hero-ember-cast-04');
});

test('taking damage with every equipment keeps the current PNG body through invulnerability',async()=>{
 const {damage,tick}=await import('../../app/mariomortille/simulation.ts');
 for(const power of ['none','ember','turbo','cloud','cobalt']) {
  const s=createState({...level,tiles:[{x:32,y:160,kind:'solid'}]}),p=s.player,m=makeHeroMotion(p.x);
  p.power=power;p.grounded=false;p.y=20;damage(s,level,p.x+40);
  assert.equal(p.power,'none');assert.equal(heroPose(m,p),'hero-hurt-01');assert.ok(heroRecoil(p)<0);
  for(let i=0;i<90;i++) {
   const pose=heroPose(m,p);assert.ok(pose,'must not fall back to the old atlas');
   assert.ok(existsSync(new URL(`../../assets-source/mariomortille/aurelien/${pose.replace('hero-','')}.png`,import.meta.url)));
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
   assert.ok(heroAtlasHas(pose),pose);
  }
 }
});

test('ordinary dash uses all eight dedicated PNG poses and then returns to locomotion',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x),seen=new Set();
 p.power='none';p.grounded=true;p.vx=250;
 for(let boost=12;boost>0;boost--){
  p.boost=boost;const pose=heroPose(m,p);seen.add(pose);
  assert.match(pose,/^hero-dash-0[1-8]$/);
  assert.ok(heroAtlasHas(pose));
 }
 assert.equal(seen.size,8);p.boost=0;assert.match(heroPose(m,p),/^hero-run-/);
});

test('runtime run exports keep one alignment for contact and suspension in each outfit',async()=>{
 const {readFileSync}=await import('node:fs');
 const manifest=JSON.parse(readFileSync(new URL('../../assets-source/mariomortille/aurelien/manifest.json',import.meta.url),'utf8'));
 for(const prefix of ['','turbo-','ember-','cloud-','cobalt-']){
  const frames=manifest.runtime.frames.filter(f=>new RegExp(`^${prefix}run-\\d+\\.png$`).test(f.file));
  assert.equal(frames.length,8);
  assert.equal(new Set(frames.map(f=>f.sourceVerticalOffset)).size,1);
  // Contact and suspension share a clip offset, never individual foot snapping.
  assert.ok(frames.every(f=>f.bounds && f.bounds[3]<=64), 'all eight poses remain inside their runtime cell');
  const floorAt=n=>frames.find(f=>f.file===`${prefix}run-${String(n).padStart(2,'0')}.png`).bounds[3];
  assert.ok(floorAt(4)<floorAt(3) && floorAt(8)<floorAt(7), 'both airborne strides retain foot clearance');
 }
});

test('basic dash retains Ember, Cloud and Cobalt equipment on all eight poses',()=>{
 for(const power of ['ember','cloud','cobalt']){
  const p=createState(level).player,m=makeHeroMotion(p.x),seen=new Set();p.power=power;p.grounded=true;p.vx=250;
  for(let boost=12;boost>0;boost--){
   p.boost=boost;const pose=heroPose(m,p);seen.add(pose);assert.match(pose,new RegExp(`^hero-${power}-dash-0[1-8]$`));
   assert.ok(heroAtlasHas(pose));
  }
  assert.equal(seen.size,8);
  p.boost=0;assert.match(heroPose(m,p),new RegExp(`^hero-${power}-run-`));
 }
});

test('Cloud loops the eight wing poses while gliding and returns to falling on release',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.power='cloud';p.vy=85;
 const seen=new Set();
 for(let i=0;i<106;i++){advanceHeroMotion(m,p,{jump:true});seen.add(heroPose(m,p));}
 assert.deepEqual([...seen],Array.from({length:8},(_,i)=>`hero-cloud-glide-0${i+1}`));
 const held=heroPose(m,p);assert.equal(heroPose(m,p),held,'rendering alone cannot advance animation');
 advanceHeroMotion(m,p,{jump:false});assert.equal(heroPose(m,p),'hero-cloud-jump-05');
 p.grounded=true;advanceHeroMotion(m,p,{jump:false});assert.match(heroPose(m,p),/^hero-cloud-idle-/);
 p.grounded=false;advanceHeroMotion(m,p,{jump:true});assert.equal(heroPose(m,p),'hero-cloud-glide-01');
 p.power='none';advanceHeroMotion(m,p,{jump:true});assert.match(heroPose(m,p),/^hero-jump-/);
});
test('Cobalt pound uses preparation, tuck, descent and recovery in order',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.power='cobalt';
 const seen=[];
 for(const pound of [11,9,6,3,1]){p.pound=pound;seen.push(heroPose(m,p));}
 p.vy=500;seen.push(heroPose(m,p));
 p.pound=0;p.grounded=true;p.vx=0;m.poundLanding=true;for(const age of [0,240]){m.landingMs=age;seen.push(heroPose(m,p));}
 assert.deepEqual(seen,Array.from({length:8},(_,i)=>`hero-cobalt-pound-0${i+1}`));
});

 test('inherited Turbo cooldown never casts or requests a missing sprite, and dash overrides shooting',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.power='turbo';p.cooldown=70;advanceHeroMotion(m,p);
 p.power='ember';
 for(let cooldown=69;cooldown>=0;cooldown--){p.cooldown=cooldown;advanceHeroMotion(m,p);assert.match(heroPose(m,p),/^hero-ember-jump-/);}
 p.cooldown=22;advanceHeroMotion(m,p);assert.equal(heroPose(m,p),'hero-ember-cast-04');
 p.boost=12;assert.equal(heroPose(m,p),'hero-ember-dash-01');
 p.boost=0;p.power='none';advanceHeroMotion(m,p);p.power='ember';advanceHeroMotion(m,p);assert.match(heroPose(m,p),/^hero-ember-jump-/);
 });

test('foot sounds alternate on real contacts, and stop on walls, jumps, landing and dash',async()=>{
 const {heroFootstep}=await import('../../app/mariomortille/hero-animation.ts');
 const p=createState(level).player;p.grounded=true;
 assert.equal(heroFootstep('hero-walk-04','hero-walk-05',p,2),'step-right');
 assert.equal(heroFootstep('hero-walk-08','hero-walk-01',p,2),'step-left');
 for(const prefix of ['hero-','hero-turbo-','hero-ember-','hero-cloud-','hero-cobalt-']){
  assert.equal(heroFootstep(prefix+'run-04',prefix+'run-05',p,3),'step-right');
  assert.equal(heroFootstep(prefix+'run-08',prefix+'run-01',p,3),'step-left');
 }
 for(const [a,b,delta]of [['hero-walk-04','hero-walk-05',0],['hero-run-08','hero-run-01',500],['hero-walk-08','hero-run-05',3],['hero-idle-01','hero-walk-01',1],['hero-run-02','hero-run-03',3]])assert.equal(heroFootstep(a,b,p,delta),null);
 for(const field of ['boost','landing']){p[field]=1;assert.equal(heroFootstep('hero-run-04','hero-run-05',p,3),null);p[field]=0;}
 p.grounded=false;assert.equal(heroFootstep('hero-run-04','hero-run-05',p,3),null);
});
test('crouching selects a lowered equipped pose even during damage and all victory textures exist',()=>{
 for(const power of ['none','turbo','ember','cloud','cobalt']){
  const p=createState(level).player,m=makeHeroMotion(p.x);p.power=power;p.crouching=true;p.grounded=true;p.invulnerable=90;
  const prefix=power==='none'?'hero-':`hero-${power}-`;
  assert.equal(heroPose(m,p),`${prefix}crouch-01`);
  assert.ok(heroAtlasHas(heroPose(m,p)));
  for(const action of ['crouch','victory'])for(const frame of ['01','02'])assert.ok(heroAtlasHas(`${prefix}${action}-${frame}`),`${prefix}${action}-${frame} must load from the runtime atlas`);
 }
});

test('Cobalt uses the same approved locomotion phases as Aurel without changing body scale',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=true;
 for(const vx of [115,200])for(const distance of [0,5,20,45,80,100,140]){
  p.vx=vx;m.distance=distance;p.power='none';const normal=heroPose(m,p);
  p.power='cobalt';assert.equal(heroPose(m,p),normal.replace('hero-','hero-cobalt-'));
 }
});


test('walk/run speed changes preserve stride phase across the threshold and around the loop seam',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=true;p.vx=115;
 for(let i=0;i<15;i++){p.x+=6;advanceHeroMotion(m,p);}
 const initial=m.distance/m.cycleDistance;
 for(const speed of [146,144,240,115,200,115]){
  p.vx=speed;advanceHeroMotion(m,p);
  assert.ok(Math.abs(m.distance/m.cycleDistance-initial)<1e-9,'speed alone preserves cycle progress');
 }
 p.x+=11;advanceHeroMotion(m,p);
 assert.ok(heroPose(m,p).endsWith('-01'),'the next contact wraps the cycle, without a duplicate leading-leg phase');
 p.x+=1000;advanceHeroMotion(m,p);
 assert.equal(m.distance,0);assert.equal(m.cycleDistance,0);
});

test('native walk uses the preview holds and sprint never loops through standing preparation',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=true;p.vx=115;
 const boundaries=[0,60,180,336,450,516,600,756];
 boundaries.forEach((ms,i)=>{m.distance=(ms+.01)/870*100.05;assert.equal(heroPose(m,p),`hero-walk-${String(i+1).padStart(2,'0')}`);});
 m.distance=100.05;assert.equal(heroPose(m,p),'hero-walk-01');
 p.vx=180;const seen=new Set();
 for(let x=0;x<216;x++){m.distance=x;seen.add(heroPose(m,p));}
 assert.deepEqual([...seen],['hero-run-04','hero-run-05','hero-run-06','hero-run-07','hero-run-08']);
});

test('native ground pound progresses into its own impact and recovery, then gives control back',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=false;
 const seen=[];
 for(const value of [12,8,5,2,1]){p.pound=value;advanceHeroMotion(m,p);seen.push(heroPose(m,p));}
 assert.deepEqual(seen,['hero-pound-01','hero-pound-02','hero-pound-03','hero-pound-04','hero-pound-05']);
 p.vy=600;assert.equal(heroPose(m,p),'hero-pound-06');
 p.pound=0;p.grounded=true;p.landing=5;advanceHeroMotion(m,p);
 assert.equal(heroPose(m,p),'hero-pound-07');
 m.landingMs=150;assert.equal(heroPose(m,p),'hero-pound-07');
 m.landingMs=350;assert.equal(heroPose(m,p),'hero-pound-08');
 for(const pose of [...seen,'hero-pound-06','hero-pound-07','hero-pound-08'])assert.ok(heroAtlasHas(pose));
 p.landing=0;p.vx=115;p.x+=2;advanceHeroMotion(m,p);assert.match(heroPose(m,p),/^hero-walk-/);
});

test('native landing shows compression and recovery but never delays a fresh jump or movement',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=true;p.landing=5;advanceHeroMotion(m,p);
 const seen=new Set();
 for(let ms=0;ms<650;ms+=5){m.landingMs=ms;seen.add(heroPose(m,p));}
 assert.equal(seen.size,8);for(const pose of seen)assert.ok(heroAtlasHas(pose),pose);
 p.grounded=false;p.landing=0;p.vy=-300;advanceHeroMotion(m,p);assert.equal(m.landingMs,-1);assert.match(heroPose(m,p),/^hero-jump-/);
 m.landingMs=100;p.grounded=true;p.vx=180;advanceHeroMotion(m,p);assert.match(heroPose(m,p),/^hero-run-/);
});

test('super dash keeps two propulsion poses visible and preserves all eight stages',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.power='turbo';p.grounded=true;
 const counts={};
 for(let boost=22;boost>0;boost--){p.boost=boost;const pose=heroPose(m,p);counts[pose]=(counts[pose]||0)+1;assert.ok(heroAtlasHas(pose));}
 assert.equal(Object.keys(counts).length,8);
 assert.equal(counts['hero-turbo-dash-04'],5);assert.equal(counts['hero-turbo-dash-05'],5);
 p.boost=0;assert.match(heroPose(m,p),/^hero-turbo-idle-/);
});

test('crouch walk advances only with movement and does not corrupt the standing stride',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=true;p.crouching=true;p.vx=48;
 advanceHeroMotion(m,p);const first=heroPose(m,p);assert.equal(first,'hero-crouch-walk-01');
 for(let i=0;i<15;i++)advanceHeroMotion(m,p);assert.equal(heroPose(m,p),first);
 const poses=new Set();for(let i=0;i<8;i++){p.x+=4.8;advanceHeroMotion(m,p);poses.add(heroPose(m,p));}
 assert.ok(poses.size>=7);for(const pose of poses)assert.ok(heroAtlasHas(pose));assert.equal(m.distance,0);
 p.crouching=false;p.vx=115;advanceHeroMotion(m,p);assert.equal(heroPose(m,p),'hero-stand-up-01');
 for(let i=0;i<8;i++)advanceHeroMotion(m,p);assert.match(heroPose(m,p),/^hero-walk-/);
});
test('dash distance is not reused as walk progress and jumping cancels standing up',()=>{
 const p=createState(level).player,m=makeHeroMotion(p.x);p.grounded=true;p.vx=250;p.boost=12;
 for(let i=0;i<12;i++){p.x+=4;advanceHeroMotion(m,p);}assert.equal(m.distance,0);
 p.boost=0;p.vx=115;advanceHeroMotion(m,p);assert.equal(heroPose(m,p),'hero-walk-01');
 m.riseTicks=7;p.grounded=false;p.vy=-300;advanceHeroMotion(m,p);assert.equal(m.riseTicks,0);assert.match(heroPose(m,p),/^hero-jump-/);
});

test('fire and turbo keep dedicated action families through jump, crouch, pound and landing',()=>{
 for(const power of ['ember','turbo','cloud','cobalt']){
  const p=createState(level).player,m=makeHeroMotion(p.x);p.power=power;
  for(const vy of [-300,-100,0,200]){p.vy=vy;assert.match(heroPose(m,p),new RegExp(`^hero-${power}-jump-`));}
  p.pound=1;p.vy=500;assert.equal(heroPose(m,p),`hero-${power}-pound-06`);
  p.grounded=true;p.pound=0;p.vy=0;p.landing=5;m.previousPound=1;
  advanceHeroMotion(m,p);assert.equal(heroPose(m,p),`hero-${power}-pound-07`);
  p.landing=0;p.crouching=true;p.vx=30;m.landingMs=-1;
  const first=heroPose(m,p);assert.equal(first,`hero-${power}-crouch-walk-01`);
  p.x+=5;advanceHeroMotion(m,p);assert.notEqual(heroPose(m,p),first);
  p.vx=0;assert.match(heroPose(m,p),new RegExp(`^hero-${power}-crouch-0[12]$`));
  p.crouching=false;advanceHeroMotion(m,p);assert.equal(heroPose(m,p),`hero-${power}-stand-up-01`);
  assert.ok(heroAtlasHas(heroPose(m,p)));
 }
});
