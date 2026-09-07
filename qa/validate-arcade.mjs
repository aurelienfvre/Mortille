import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {createCartridgeSampler} from '../app/cartridge-sequence.ts';
import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';import {carouselPose,slotPose,slotOf,swipeDirection,swapDuration,SWAP_DURATION} from '../app/cartridge-motion.ts';
const read=async n=>{const b=fs.readFileSync(`public/models/${n}.glb`);return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'CPU_QA_TEXTURES',loadTexture:()=>Promise.resolve(new T.Texture())})).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const card=await read('cartridge-nes'),local=new T.Box3().setFromObject(card.scene);
let samples=0;
for(let selected=0;selected<9;selected++){
 const visible=Array.from({length:9},(_,id)=>({id,p:slotPose(slotOf(id,selected),2.3)})).filter(({p})=>Math.abs(p.x)<7);
 assert.equal(visible.length,5,'Exactly five cartridges are exposed at rest');
 assert.deepEqual(visible.map(({id})=>id).sort((a,b)=>a-b),[(selected+7)%9,(selected+8)%9,selected,(selected+1)%9,(selected+2)%9].sort((a,b)=>a-b));
}
for(const dir of [-1,1])for(let id=0;id<9;id++){
 let previous=carouselPose(slotOf(id,0),slotOf(id,(dir+9)%9),0,2.3);
 for(let t=.005;t<=SWAP_DURATION;t+=.005){
  const p=carouselPose(slotOf(id,0),slotOf(id,(dir+9)%9),t,2.3);
  if(Math.abs(previous.x)<7 || Math.abs(p.x)<7){
   assert(Math.abs(p.x-previous.x)<.3,'No visible wrap/teleport');
   assert((p.x-previous.x)*dir<=.00001,'All visible objects follow the same rail direction');
  }
  previous=p;
 }
}
for(const spacing of [1.65,2.3])for(const dir of [-4,-3,-2,-1,1,2,3,4])for(let t=0;t<=swapDuration(0,dir);t+=.005){
 const boxes=[];
 for(let id=0;id<9;id++){
  const old=slotOf(id,0),slot=slotOf(id,(dir+9)%9);
  const p=carouselPose(old,slot,t,spacing);const matrix=new T.Matrix4().makeTranslation(p.x,p.y,p.z).multiply(new T.Matrix4().makeScale(p.scale,p.scale,p.scale)).multiply(new T.Matrix4().makeTranslation(0,.60,0)).multiply(new T.Matrix4().makeRotationY(p.yaw)).multiply(new T.Matrix4().makeTranslation(0,-.60,0));const box=local.clone().applyMatrix4(matrix);boxes.push({id,box});
 }
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!boxes[i].box.intersectsBox(boxes[j].box),`Cartridge collision ${spacing} ${dir} ${t}: ${boxes[i].id}/${boxes[j].id}`);
 samples++;
}
assert.equal(swipeDirection(45),0);assert.equal(swipeDirection(130),-1);assert.equal(swipeDirection(-130),1);
const station=await read('console-tv-sequence');
const sampleCart=createCartridgeSampler(station.animations[0]);
for(const display of [{...slotPose(0,2.3),pitch:0},{x:.02,y:2.044,z:1.26,scale:1.45,pitch:.04,yaw:.20}]){
 const first=sampleCart(0,display);for(const k of ['x','y','z','scale','pitch','yaw'])assert(Math.abs(first[k]-display[k])<.00001,'Exact gallery to launch handoff');
 let before=first;
 for(let t=.005;t<=7.59;t+=.005){const p=sampleCart(t,display);
  assert(Math.hypot(p.x-before.x,p.y-before.y,p.z-before.z)<.055,`Cartridge teleport at ${t}`);
  if(t<1.15)assert(Math.abs(p.y-display.y)<.00001,'Initial cartridge hold accumulates');
  if(t>1.4&&t<2.1)assert(p.z<=before.z+.00001,'Approach must advance without a backward loop');
  if(t>2.14)assert(Math.abs(p.yaw)<.00001&&Math.abs(p.pitch)<.00001,'Cartridge must be straight before contact');
  before=p;
 }
 // Every phase boundary is C2: no positional jump, speed snap or acceleration snap.
 for(const boundary of [1.15,1.4,2.1,2.65,3.4,3.53,3.73]){
  const h=.00002,a=sampleCart(boundary-2*h,display),b=sampleCart(boundary-h,display),c=sampleCart(boundary,display),d=sampleCart(boundary+h,display),e=sampleCart(boundary+2*h,display);
  for(const k of ['x','y','z']){
   assert(Math.abs((c[k]-b[k])/h-(d[k]-c[k])/h)<.025,`Velocity jump ${boundary}/${k}`);
   assert(Math.abs((c[k]-2*b[k]+a[k])/(h*h)-(e[k]-2*d[k]+c[k])/(h*h))<8,`Acceleration jump ${boundary}/${k}`);
  }
 }
 let turns=0,lastDirection=1;
 for(let t=1.4;t<2.1;t+=.001){const dy=sampleCart(t+.001,display).y-sampleCart(t,display).y;if(Math.abs(dy)>1e-8){const dir=Math.sign(dy);if(dir!==lastDirection)turns++;lastDirection=dir;}}
 assert.equal(turns,1,'The spatial arc has one crest, not repeated up/down loops');
 assert(sampleCart(1.75,display).y>2.35,'The approach must form a real raised arc');
 const held=sampleCart(2.8,display);for(let i=0;i<200;i++)assert.deepEqual(sampleCart(2.8,display),held,'Sampling the insertion hold is idempotent');
 assert(Math.abs(sampleCart(2.8,display).y-sampleCart(3.3,display).y)<.001,'Two-step insertion pause drifts');
 assert(sampleCart(3.58,display).y<held.y-.40,'Second press must insert deeply');
}
const consoleFit=await read('console-nes-fit');
consoleFit.scene.updateMatrixWorld(true);
const holeRay=new T.Raycaster(new T.Vector3(0,.8,-.13),new T.Vector3(0,-1,0));
const holeHits=holeRay.intersectObject(consoleFit.scene,true);
assert(!holeHits.length || holeHits[0].point.y<.025,'The cartridge well must be genuinely open down to Y.02');
const physicalCart=station.scene.getObjectByName('Cartridge_Lift');physicalCart.clear();physicalCart.add(card.scene.clone(true));
const physicalConsole=station.scene.getObjectByName('Console_Lift');
for(const child of [...physicalConsole.children])if(child.name!=='Console_Play_Button')physicalConsole.remove(child);
physicalConsole.add(consoleFit.scene);
const mixer=new T.AnimationMixer(station.scene),action=mixer.clipAction(station.animations[0]);action.play();action.paused=true;
assert(station.scene.getObjectByName('CRT_Television_Screen').geometry.attributes.uv,'CRT UVs must survive optimization for its runtime video shader');
const at=t=>{action.time=t;mixer.update(0);const p=sampleCart(t,{...slotPose(0,2.3),pitch:0});physicalCart.position.set(p.x,p.y,p.z);physicalCart.scale.setScalar(p.scale);physicalCart.rotation.set(p.pitch,p.yaw,0);station.scene.updateMatrixWorld(true);};
const pos=n=>station.scene.getObjectByName(n).getWorldPosition(new T.Vector3());
at(2.75);const hold=pos('Cartridge_Lift');at(3.02);assert(hold.distanceTo(pos('Cartridge_Lift'))<.003,'Insertion hold drifts');
at(0);assert(pos('Television_Lift').y>6,'TV must start in ceiling crate');
assert(station.scene.getObjectByName('Television_Crate'),'Suspended crate missing');
assert(pos('Console_Lift').y<0,'Console must start beneath the floor');
assert(new T.Box3().setFromObject(station.scene.getObjectByName('Console_Housing')).max.y<.05,'Console housing obstructs the idle room');
for(let t=2.65;t<7.6;t+=.005){
 at(t);
 const relative=new T.Matrix4().copy(physicalConsole.matrixWorld).invert().multiply(physicalCart.matrixWorld);
 const box=local.clone().applyMatrix4(relative);
 assert(box.min.x>=-.51001&&box.max.x<=.51001,'NES body must fit opening width without resizing');
 assert(box.min.z>=-.24501&&box.max.z<=-.01499,'NES body must fit opening depth');
 assert(box.min.y>=.01999,`Cartridge goes through console floor at ${t}`);
 assert(Math.abs(physicalCart.scale.x-1)<.00001,'No artificial resizing during insertion');
}
for(let t=0;t<2.5;t+=.01){at(t);const a=new T.Box3().setFromObject(station.scene.getObjectByName('Console_Lift')),b=new T.Box3().setFromObject(station.scene.getObjectByName('Cartridge_Lift'));assert(!a.intersectsBox(b),`Console/cart collision before insertion ${t}`);}
at(3.7);assert(Math.abs(pos('Cartridge_Lift').y-1.32)<.002);at(5.3);assert(Math.abs(pos('Television_Lift').y-2.0)<.002);
at(5.3);assert(Math.abs(pos('Console_Lift').y-.18)<.002);assert(Math.abs(pos('Cartridge_Lift').y-.20)<.002);
const activeSource=fs.readFileSync('app/character.tsx','utf8'),activeHuman=activeSource.match(/hero\?'([^']+)'/)?.[1],activeYeti=activeSource.match(/hero\?'[^']+':'([^']+)'/)?.[1];
assert(activeHuman && activeYeti,'Active character assets must be declared');
const stats=[];
for(const n of [activeHuman,activeYeti,'console-tv-sequence','metal-button','cockpit-pupitres','button-icons','cartridge-nes','console-nes-fit']){
 const g=await read(n);let tris=0,draws=0;g.scene.traverse(o=>{if(o.isMesh){tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;draws++;}});
 if([activeHuman,activeYeti].includes(n))assert.deepEqual(g.animations.map(a=>a.name).sort(),['Dance','HighFive','Idle','Run','Walk']);
 stats.push({model:n,triangles:Math.round(tris),primitives:draws,MB:+(fs.statSync(`public/models/${n}.glb`).size/1e6).toFixed(2),clips:g.animations.map(a=>a.name)});
}
console.log(JSON.stringify({collisionSamples:samples,displayedCartridges:5,stableIdentities:'pass',visibleWraps:'none',swipeThresholds:'pass',consoleClearance:'pass',actualConsoleWell:'open Boolean cut',insertionHold:'pass',launchHandoff:'continuous and idempotent',approach:'spatial Bezier, C2 joins, one crest',models:stats},null,2));
