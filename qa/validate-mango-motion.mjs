import assert from 'node:assert/strict';import {makeMangoState,updateMango,MANGO_SPEED} from '../app/mango-motion.ts';import {friendPose} from '../app/lobby-behavior.ts';
let samples=0,turns=0,minClearance=Infinity,travel=0;
for(const offset of [0,12,38,67]){
 const m=makeMangoState();let old={...m};
 for(let i=0;i<60*180;i++){
  const time=i/60+offset,others=['hero','yeti'].map(v=>friendPose(v,time));others.push({x:3.65*Math.cos(time*.026),z:-.55});
  const paused=i>=1200&&i<1330;updateMango(m,1/60,others,paused);
  if(paused){assert.equal(m.x,old.x);assert.equal(m.yaw,old.yaw);}
  assert(m.x>=-3.80001&&m.x<=3.80001);assert.equal(m.z,-2.48);assert(m.speed<=MANGO_SPEED+.00001);
  const delta=Math.hypot(m.x-old.x,m.z-old.z);assert(delta<.006,'No Mango teleport');travel+=delta;
  const tangent={x:Math.sin(m.yaw),z:Math.cos(m.yaw)};
  for(const other of others){const px=other.x-m.x,pz=other.z-m.z,along=Math.max(-.7,Math.min(.7,px*tangent.x+pz*tangent.z));const distance=Math.hypot(px-along*tangent.x,pz-along*tangent.z);minClearance=Math.min(minClearance,distance);assert(distance>.57,JSON.stringify({problem:'Dog swept body overlaps a pedestrian',offset,time,m,other,distance,paused}));}
  if(m.mode==='turn'&&old.mode!=='turn')turns++;
  old={...m};samples++;
 }
}
assert(turns>=4,'Dog must complete turns instead of permanently yielding');assert(travel>80,'Dog must travel independently');console.log(JSON.stringify({samples,turns,travel,minClearance,speed:MANGO_SPEED,pass:true}));
