import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bearFrame,preloadBear,bearClips,bearAnchorX,bearAnchorY} from '../../app/mariomortille/bear-view.ts';
const juju={characterId:'juju',health:3,bearTicks:360,bearStage:3,bearRevertAge:-1,bearClawAge:-1};
test('bear form is only Juju and returns to human exactly on expiry',()=>{
 assert.match(bearFrame(juju,0),/^juju-bear-stage3-idle-/);
 assert.equal(bearFrame({...juju,bearTicks:0},0),null);
 assert.equal(bearFrame({...juju,characterId:'ben'},0),null);
 assert.equal(bearFrame({...juju,health:0},0),null);
});
test('charging transforms progressively; authoritative impact20 coincides with claw swing',()=>{
 assert.equal(bearFrame({...juju,bearTicks:0,dashCharging:true,dashCharge:1},0),null);
 assert.equal(bearFrame({...juju,bearTicks:0,dashCharging:true,dashCharge:60},0),'juju-bear-stage3-idle-1');
 assert.equal(bearFrame({...juju,bearClawAge:19},0),'juju-bear-stage3-claw-2');
 assert.equal(bearFrame({...juju,bearClawAge:20},0),'juju-bear-stage3-claw-3');
 assert.equal(bearFrame({...juju,bearClawAge:27},0),'juju-bear-stage3-claw-4');
 assert.equal(bearFrame({...juju,bearClawAge:52},0),'juju-bear-stage3-claw-6');
});
test('all 230 preload keys match real96px PNGs',()=>{
 const loaded=[];preloadBear({load:{image:(key,url)=>loaded.push({key,url})}});
 assert.equal(loaded.length,230);
 for(const {key,url} of loaded){const b=readFileSync(new URL('../../public'+url.split('?')[0],import.meta.url));assert.equal(b.subarray(1,4).toString(),'PNG',key);assert.equal(b.readUInt32BE(16),96,key);assert.equal(b.readUInt32BE(20),96,key);}
 assert.equal(bearClips.claw.reduce((a,b)=>a+b,0),880);
});

test('return passes through stage3,2,1 then normal',()=>{
 for(const stage of [3,2,1]){
 const from={...juju,bearTicks:0,bearStage:stage,bearRevertAge:0,bearClawAge:20};
 if(stage===3){for(let age=0;age<24;age++)assert.equal(bearFrame({...from,bearRevertAge:age},0),`juju-bear-stage3-revert-${1+Math.floor(age/3)}`);continue;}
 assert.match(bearFrame(from,0),new RegExp(`^juju-bear-stage${stage}-idle-`));
 const to=bearFrame({...from,bearRevertAge:12},0);
 if(stage===1)assert.equal(to,null);else assert.match(to,new RegExp(`^juju-bear-stage${stage-1}-idle-`));
 }
});
test('held charge has real stage boundaries rather than immediate full bear',()=>{
 for(const [charge,stage]of [[8,0],[9,1],[29,1],[30,2],[59,2],[60,3]]){
 const key=bearFrame({...juju,bearTicks:0,dashCharging:true,dashCharge:charge},0);
 if(!stage)assert.equal(key,null);else if(charge>=30&&charge<60)assert.match(key,/^juju-bear-stage3-transform-/);else assert.match(key,new RegExp(`^juju-bear-stage${stage}-idle-`));
 }
});

test('extended claw preserves body position through its image anchor offset',()=>{assert.equal(bearAnchorX('juju-bear-stage3-claw-3'),42);assert.equal(bearAnchorX('juju-bear-stage3-claw-2'),48);assert.equal(bearAnchorX('juju-bear-stage2-claw-3'),48);});

test('fully held charge keeps the living stage3 idle loop',()=>{const p={...juju,bearTicks:0,dashCharging:true,dashCharge:60};assert.equal(bearFrame(p,0),'juju-bear-stage3-idle-1');assert.equal(bearFrame(p,15),'juju-bear-stage3-idle-2');assert.equal(bearFrame(p,25),'juju-bear-stage3-idle-3');});

test('equipped stage1 idle follows1200ms clip and yields to attack or movement',()=>{
 for(const power of ['ember','turbo','cloud','cobalt']){
  const p={...juju,bearStage:1,power,grounded:true,vx:0,boost:0};
  for(const [tick,frame] of [[0,1],[29,1],[30,2],[41,2],[42,3],[50,4],[71,4],[72,1]])assert.equal(bearFrame(p,tick),`juju-bear-stage1-${power}-idle-${frame}`);
  assert.equal(bearFrame({...p,bearClawAge:20},0),'juju-bear-stage1-claw-3');
  assert.ok(!bearFrame({...p,vx:180},0).includes(power));
  assert.match(bearFrame({...p,grounded:false},0),/stage1-(ember-|turbo-|cobalt-|cloud-)?jump-/);
 }
});

test('stage3 jump follows actual velocity and landing instead of a free running clip',()=>{
 const p={...juju,grounded:false};
 for(const [vy,n] of [[-344,2],[-200,3],[-40,4],[40,4],[130,5]])for(const tick of [0,30,1000])assert.equal(bearFrame({...p,vy},tick),`juju-bear-stage3-jump-${n}`);
 for(const [landing,n] of [[5,6],[4,6],[3,6],[2,7],[1,7]])assert.equal(bearFrame({...juju,grounded:true,vy:0,landing},0),`juju-bear-stage3-jump-${n}`);
 assert.match(bearFrame({...juju,grounded:true,landing:0},0),/stage3-idle-/);
 assert.equal(bearFrame({...p,vy:-200,bearClawAge:20},0),'juju-bear-stage3-claw-3');
 assert.match(bearFrame({...p,vy:-200,bearTicks:0,bearRevertAge:0},0),/stage3-revert-/);
 assert.match(bearFrame({...p,vy:-200,bearStage:1},0),/stage1-jump-3/);
});

 test('stage2 jump uses its own poses through rise, apex, fall and landing',()=>{
  const p={...juju,bearStage:2,bearClawAge:-1,grounded:false,vy:-300};
  for(const [vy,n]of [[-300,2],[-150,3],[0,4],[180,5]])assert.equal(bearFrame({...p,vy},0),`juju-bear-stage2-jump-${n}`);
  assert.equal(bearFrame({...p,grounded:true,landing:4},0),'juju-bear-stage2-jump-6');
  assert.equal(bearFrame({...p,grounded:true,landing:1},0),'juju-bear-stage2-jump-7');
 });

test('stage2 equipment idles preserve power and yield to jumping/claw',()=>{
 for(const power of ['ember','turbo','cloud','cobalt']){
  const p={...juju,bearStage:2,power,grounded:true,vx:0,boost:0};
  assert.equal(bearFrame(p,0),`juju-bear-stage2-${power}-idle-1`);
  assert.equal(bearFrame(p,42),`juju-bear-stage2-${power}-idle-3`);
  assert.equal(bearFrame({...p,bearClawAge:20},0),'juju-bear-stage2-claw-3');
  assert.match(bearFrame({...p,grounded:false,vy:-100},0),/^juju-bear-stage2-(ember-|turbo-|cobalt-|cloud-|cloud-)?jump-/);
 }
});

test('stage3 fire gloves remain present during jump and landing with the same physics poses',()=>{
 const p={...juju,power:'ember',grounded:false};
 for(const [vy,n] of [[-344,2],[-200,3],[-40,4],[40,4],[130,5]])assert.equal(bearFrame({...p,vy},99),`juju-bear-stage3-ember-jump-${n}`);
 for(const [landing,n] of [[5,6],[2,7]])assert.equal(bearFrame({...p,grounded:true,landing},99),`juju-bear-stage3-ember-jump-${n}`);
 assert.equal(bearFrame({...p,bearStage:2,vy:-200},99),'juju-bear-stage2-ember-jump-3');
 assert.equal(bearFrame({...p,power:'none',vy:-200},99),'juju-bear-stage3-jump-3');
});

test('stage1 jump keeps its own form through flight and landing',()=>{
 const p={...juju,bearStage:1,bearClawAge:-1,grounded:false,power:'none'};
 for(const [vy,n]of [[-300,2],[-150,3],[0,4],[180,5]])assert.equal(bearFrame({...p,vy},0),`juju-bear-stage1-jump-${n}`);
 assert.equal(bearFrame({...p,grounded:true,landing:4},0),'juju-bear-stage1-jump-6');
});

 test('stage3 keeps all four equipped idles and turbo through flight and landing',()=>{
 for(const power of ['ember','turbo','cloud','cobalt'])assert.equal(bearFrame({...juju,power,grounded:true,vx:0,boost:0},0),`juju-bear-stage3-${power}-idle-1`);
 for(const [vy,n] of [[-300,2],[-150,3],[0,4],[150,5]])assert.equal(bearFrame({...juju,power:'turbo',grounded:false,vy},0),`juju-bear-stage3-turbo-jump-${n}`);
 assert.equal(bearFrame({...juju,power:'turbo',grounded:true,landing:4},0),'juju-bear-stage3-turbo-jump-6');
 });

test('every selected form texture is preloaded across powers and state transitions',()=>{
 const keys=new Set();preloadBear({load:{image:key=>keys.add(key)}});
 const states=[{}, {grounded:false,vy:-300}, {grounded:false,vy:0}, {grounded:false,vy:170}, {landing:4}, {landing:1}, {bearClawAge:20}, {vx:160}, {crouching:true}, {dashCharging:true,dashCharge:60}, {bearTicks:0,bearRevertAge:8}, {bearTicks:0,bearRevertAge:16}];
 for(const bearStage of [1,2,3])for(const power of ['none','ember','turbo','cloud','cobalt'])for(const state of states)for(const tick of [0,31,44,71,90]){
  const key=bearFrame({...juju,bearStage,power,grounded:true,vx:0,boost:0,...state},tick);
  if(key)assert.ok(keys.has(key),`Missing texture ${key}`);
 }
});

test('cobalt jump retains armor across rise, apex, fall and landing',()=>{for(const [vy,n] of [[-300,2],[-150,3],[0,4],[180,5]])assert.equal(bearFrame({...juju,power:'cobalt',grounded:false,vy},0),`juju-bear-stage3-cobalt-jump-${n}`);assert.equal(bearFrame({...juju,power:'cobalt',grounded:true,landing:4},0),'juju-bear-stage3-cobalt-jump-6');});

test('cloud jump keeps wings and compensates margin translations',()=>{for(const [vy,n] of [[-300,2],[-150,3],[0,4],[180,5]])assert.equal(bearFrame({...juju,power:'cloud',grounded:false,vy},0),`juju-bear-stage3-cloud-jump-${n}`);assert.equal(bearAnchorY('juju-bear-stage3-cloud-jump-3'),92);assert.equal(bearAnchorX('juju-bear-stage3-cloud-jump-5'),51);assert.equal(bearAnchorY('juju-bear-stage3-cloud-jump-5'),88);});

test('stage1 walk advances by travelled distance through all eight distinct poses',()=>{const p={...juju,bearStage:1,power:'none',grounded:true,vx:100};for(let n=0;n<8;n++)for(const tick of [0,999])assert.equal(bearFrame(p,tick,'bear',(n+.2)*100.05/8),`juju-bear-stage1-walk-${n+1}`);assert.equal(bearFrame(p,0,'bear',100.05),'juju-bear-stage1-walk-1');assert.match(bearFrame({...p,vx:0},0,'bear',40),/idle/);assert.match(bearFrame({...p,grounded:false,vy:-100},0,'bear',40),/jump/);assert.match(bearFrame({...p,bearClawAge:20},0,'bear',40),/claw/);});

test('new lower-stage equipment jump clips follow physics without reverting outfit',()=>{for(const [stage,powers] of [[1,['ember','turbo','cobalt','cloud']],[2,['ember','turbo','cobalt','cloud']]])for(const power of powers){for(const [vy,n]of [[-300,2],[-150,3],[0,4],[180,5]])assert.equal(bearFrame({...juju,bearStage:stage,power,grounded:false,vy},0),`juju-bear-stage${stage}-${power}-jump-${n}`);assert.equal(bearFrame({...juju,bearStage:stage,power,grounded:true,landing:4},0),`juju-bear-stage${stage}-${power}-jump-6`);}});

test('stage2 spread wings keep their body anchor',()=>assert.equal(bearAnchorX('juju-bear-stage2-cloud-jump-4'),51));

test('stage3 walking cycles with distance and yields to leap and attack',()=>{const p={...juju,power:'none',grounded:true,vx:100};for(let n=0;n<8;n++)assert.equal(bearFrame(p,999,'bear',(n+.2)*110/8),`juju-bear-stage3-walk-${n+1}`);assert.equal(bearFrame(p,0,'bear',110),'juju-bear-stage3-walk-1');assert.match(bearFrame({...p,grounded:false,vy:-200},0,'bear',40),/jump-3/);assert.match(bearFrame({...p,bearClawAge:20},0,'bear',40),/claw-3/);assert.match(bearFrame({...p,vx:0},0,'bear',40),/idle/);});
