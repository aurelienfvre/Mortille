import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {companionExtras,companionPose,companionTexture,advanceCompanionVisual,companionStandUpFrame} from '../../app/mariomortille/party-art.ts';
import {makeHeroMotion} from '../../app/mariomortille/hero-animation.ts';
import {createState} from '../../app/mariomortille/simulation.ts';
const level={id:'test',width:600,spawn:{x:0,y:0},tiles:[],pickups:[],goal:590,checkpoint:500};
test('supplemental 120 companion poses fit separate atlas, preserving main atlas capacity',()=>{
 const atlas=JSON.parse(fs.readFileSync(new URL('../../public/mariomortille/party/party-extras.json',import.meta.url)));
 assert.equal(Object.keys(atlas.frames).length,120);
 for(const clip of Object.values(companionExtras))for(const key of clip.frames){
  assert.equal(companionTexture(key),'party-extras');assert.deepEqual(clip.anchor,[32,58]);
  const f=atlas.frames[key].frame;assert.equal(f.w,64);assert.equal(f.h,64);assert.ok(f.x+64<=1024&&f.y+64<=512);
 }
 assert.equal(companionTexture('party-juju-idle-01'),'party-atlas');
});
test('stand-up matches 4/5/6/7 tick preview timings independently from Aurel rise timer',()=>{
 for(const id of ['juju','ben'])for(const power of ['none','ember','turbo','cloud','cobalt']){
  const p=createState(level).player,m=makeHeroMotion(0);p.power=power;p.grounded=true;p.crouching=true;advanceCompanionVisual(m,p);p.crouching=false;
  const prefix=`party-extra-${id}-${power==='none'?'':power+'-'}stand-up-`;
  for(let age=0;age<22;age++){
   advanceCompanionVisual(m,p);m.riseTicks=0;
   const n=age<4?1:age<9?2:age<15?3:4;
   assert.equal(companionPose(id,p,m),prefix+String(n).padStart(2,'0'));
   assert.equal(companionStandUpFrame(id,power,age),companionPose(id,p,m));
  }
  advanceCompanionVisual(m,p);assert.ok(!companionPose(id,p,m).includes('stand-up'));
  assert.equal(companionStandUpFrame(id,power,22),null);
  const clip=companionExtras[`${id}-${power==='none'?'':power+'-'}stand-up`];
  assert.ok(Math.abs(clip.durations.reduce((a,b)=>a+b,0)-22*1000/60)<.001);
 }
});
test('stand-up yields to movement, jump, hurt, power, charge and equipment change without restarting',()=>{
 for(const change of [p=>p.vx=20,p=>p.grounded=false,p=>p.invulnerable=90,p=>p.dashCharging=true,p=>p.power='ember']){
  const p=createState(level).player,m=makeHeroMotion(0);p.grounded=true;p.crouching=true;advanceCompanionVisual(m,p);p.crouching=false;advanceCompanionVisual(m,p);change(p);advanceCompanionVisual(m,p);
  assert.ok(!companionPose('juju',p,m).includes('stand-up'));
 }
 for(const input of [{direction:1},{jumpPressed:true},{powerPressed:true}]){
  const p=createState(level).player,m=makeHeroMotion(0);p.grounded=true;p.crouching=true;advanceCompanionVisual(m,p);p.crouching=false;advanceCompanionVisual(m,p);advanceCompanionVisual(m,p,input);
  assert.ok(!companionPose('ben',p,m).includes('stand-up'));advanceCompanionVisual(m,p);assert.ok(!companionPose('ben',p,m).includes('stand-up'));
 }
});
test('pound render follows real state without enabling neutral power or replacing cobalt attack',()=>{
 for(const id of ['juju','ben']){
  const p=createState(level).player,m=makeHeroMotion(0);p.power='none';p.grounded=false;
  p.pound=0;assert.ok(!companionPose(id,p,m).includes('ground-pound'));
  p.pound=12;assert.equal(companionPose(id,p,m),`party-extra-${id}-ground-pound-03`);
  p.pound=1;assert.equal(companionPose(id,p,m),`party-extra-${id}-ground-pound-06`);
  p.power='cobalt';assert.ok(companionPose(id,p,m).startsWith(`party-${id}-cobalt-pound-`));
 }
});
