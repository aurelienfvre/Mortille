import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBoss,stepBoss,bossHeight,bossFloor} from '../../app/mariomortille/boss.ts';
import {createState} from '../../app/mariomortille/simulation.ts';
const level=kind=>({id:'mini',boss:kind,width:1024,spawn:{x:20,y:150},tiles:Array.from({length:64},(_,i)=>({x:i*16,y:192,kind:'ground'})),pickups:[],enemies:[],checkpoint:200,goal:950});
const setup=kind=>{const l=level(kind),s=createState({...l,boss:undefined});s.boss=makeBoss(l);s.player.x=s.boss.x-150;s.player.y=150;return {l,s};};
test('mini-boss feet use arena terrain, telegraphs lock direction and attacks have distinct trajectories',()=>{
 for(const kind of ['pirate','lola','mango']){
  const {l,s}=setup(kind),b=s.boss;assert.equal(bossFloor(b),192);assert.equal(b.y+bossHeight(b),192);
  const x=b.x;for(let i=0;i<(kind==='mango'?90:kind==='pirate'?65:80);i++)stepBoss(s,l,150,()=>{});
  assert.equal(b.phase,'charge');assert.equal(b.x,x);
  s.player.x=b.x+60;for(let i=0;i<18;i++)stepBoss(s,l,150,()=>{});
  assert.ok(b.x<x,'attack cannot turn toward player after warning');
  assert.equal(b.y+bossHeight(b)<192,kind!=='pirate');
  for(let i=0;i<60&&b.phase!=='stunned';i++)stepBoss(s,l,150,()=>{});
  assert.equal(b.phase,'stunned');assert.ok(b.timer>=78);assert.equal(b.y+bossHeight(b),192);
 }
});
test('closed defense rejects fire; three recovery hits defeat once',()=>{
 const {l,s}=setup('pirate'),b=s.boss;
 s.projectiles=[{id:1,x:b.x+8,y:b.y+8,life:30,vx:0,vy:0}];stepBoss(s,l,150,()=>{});assert.equal(b.health,3);assert.equal(s.projectiles[0].life,0);
 for(let i=0;i<3;i++){
  b.phase='stunned';b.timer=50;s.projectiles=[{id:i+2,x:b.x+8,y:b.y+8,life:30,vx:0,vy:0}];
  stepBoss(s,l,150,()=>{});assert.equal(b.health,2-i);
 }
 assert.equal(b.phase,'defeated');assert.equal(s.score,1250);stepBoss(s,l,150,()=>{});assert.equal(s.score,1250);
});
test('ground lunge stops before a solid arena obstruction',()=>{
 const {l,s}=setup('pirate'),b=s.boss;const wallX=b.x-64;
 s.tiles.push({x:wallX,y:176,kind:'brick'});b.phase='charge';b.timer=36;b.startX=b.x;b.targetX=b.x-132;
 for(let i=0;i<36&&b.phase==='charge';i++)stepBoss(s,l,150,()=>{});
 assert.equal(b.phase,'stunned');assert.ok(b.x>=wallX+16);
});
test('stunned mini-boss body cannot deal passive contact damage',()=>{
 const {l,s}=setup('pirate');s.boss.phase='stunned';s.boss.timer=40;s.player.x=s.boss.x;s.player.y=s.boss.y;s.player.vy=0;let hurts=0;
 stepBoss(s,l,s.player.y,()=>hurts++);assert.equal(hurts,0);assert.equal(s.boss.health,3,'opening still requires a stomp or shot');
});

test('Mango declares a 90-tick leap, reaches 80 pixels and exposes a 110-tick recovery',()=>{
 const {l,s}=setup('mango'),b=s.boss;const startX=b.x;
 assert.equal(b.health,4);assert.equal(b.timer,90);
 for(let i=0;i<90;i++)stepBoss(s,l,150,()=>{});
 assert.equal(b.timer,60);assert.equal(b.targetX,startX-180);
 for(let i=0;i<30;i++)stepBoss(s,l,150,()=>{});
 assert.equal(bossFloor(b)-b.y-bossHeight(b),80);
 for(let i=0;i<30;i++)stepBoss(s,l,150,()=>{});
 assert.equal(b.phase,'stunned');assert.equal(b.timer,110);
 for(let i=0;i<4;i++){
  b.phase='stunned';b.timer=110;
  s.projectiles=[{id:i+1,x:b.x+8,y:b.y+8,life:30,vx:0,vy:0}];
  stepBoss(s,l,150,()=>{});assert.equal(b.health,3-i);
 }
 assert.equal(b.phase,'defeated');assert.equal(s.score,2500);
 stepBoss(s,l,150,()=>{});assert.equal(s.score,2500);
});
test('all boss patterns wake at initialX minus 400 and remain active after retreat',()=>{
 for(const kind of ['pirate','lola','mango','raphael']){
  const {l,s}=setup(kind),b=s.boss;s.player.x=b.initialX-401;const initial=b.timer;
  for(let i=0;i<120;i++)stepBoss(s,l,s.player.y,()=>{});
  assert.equal(b.timer,initial,kind+' does not start outside its introduction');assert.equal(b.activated,false);
  s.player.x=b.initialX-400;stepBoss(s,l,s.player.y,()=>{});assert.equal(b.activated,true);assert.equal(b.timer,initial-1);
  s.player.x=-1000;stepBoss(s,l,s.player.y,()=>{});assert.equal(b.timer,initial-2,kind+' cannot be frozen by retreating');
 }
});
