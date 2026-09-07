import fs from 'node:fs';import assert from 'node:assert/strict';import{registerHooks}from'node:module';
registerHooks({resolve(spec,context,next){if(spec.startsWith('.')&&!/\.[a-z]+$/i.test(spec)){const url=new URL(spec+'.ts',context.parentURL);if(fs.existsSync(url))return next(url.href,context);}return next(spec,context);}});
const{Group,Texture,AnimationMixer,Vector3}=await import('three');
const{GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');const{MeshoptDecoder}=await import('three/examples/jsm/libs/meshopt_decoder.module.js');
const{createTurnPlant,restoreTurnPlant,applyTurnPlant}=await import('../app/turn-plant.ts');
const{createHighFive,applyHighFive}=await import('../app/high-five-contact.ts');
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'CPU_TEXTURE',loadTexture:()=>Promise.resolve(new Texture())}));
async function load(id,clip='Idle',time=0){const b=fs.readFileSync(`public/models/${id}-user-v3.glb`),g=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const actor=new Group();actor.add(g.scene);g.scene.scale.setScalar(1.6);const mixer=new AnimationMixer(g.scene);mixer.clipAction(g.animations.find(c=>c.name===clip)).play();mixer.setTime(time);actor.updateMatrixWorld(true);return {...g,actor,mixer};}
let maxError=0,checks=0;const report=[];
for(const id of ['aurelien','ben','julien','raphael']){
 const g=await load(id),s=createTurnPlant(g.scene);let error=0;
 for(let frame=0;frame<190;frame++){
  restoreTurnPlant(s);g.mixer.update(1/60);const u=Math.min(1,Math.max(0,(frame/60-.15)/1.05));g.actor.rotation.y=Math.PI*u*u*u*(u*(u*6-15)+10);g.actor.updateMatrixWorld(true);
  applyTurnPlant(s,g.actor,1/60,'Idle');g.actor.updateMatrixWorld(true);
  if(s.applied)for(const l of s.legs){const e=l.foot.getWorldPosition(new Vector3()).distanceTo(l.plant);error=Math.max(error,e);assert(Number.isFinite(e));checks++;}
 }
 maxError=Math.max(maxError,error);report.push({id,plantError:error});
}
const a=await load('aurelien','HighFive',1.2),b=await load('raphael','HighFive',1.2);a.actor.position.set(3.1,0,-1.65);b.actor.position.set(2.2,0,-1.65);a.actor.rotation.y=-Math.PI/2;b.actor.rotation.y=Math.PI/2;a.actor.updateMatrixWorld(true);b.actor.updateMatrixWorld(true);
const A=createHighFive(a.scene),B=createHighFive(b.scene);applyHighFive(A,a.actor,b.actor,1.2);applyHighFive(B,b.actor,a.actor,1.2);a.actor.updateMatrixWorld(true);b.actor.updateMatrixWorld(true);
const handGap=A.palm.getWorldPosition(new Vector3()).distanceTo(B.palm.getWorldPosition(new Vector3()));
console.log(JSON.stringify({checks,maxError,report,handGap},null,2));assert(maxError<.012,'A planted ankle drifted');assert(handGap<.015,'High-five palms do not touch');
const{relaxWalkingElbow}=await import('../app/walk-arms.ts');
let elbowChecks=0;
for(const id of ['aurelien','ben','julien','raphael']){
 const g=await load(id,'Walk');
 for(let i=0;i<32;i++){
  g.mixer.setTime(i/20);g.actor.rotation.y=i*.17;g.actor.updateMatrixWorld(true);
  for(const side of ['L','R']){
   const upper=g.scene.getObjectByName('upper_arm'+side),fore=g.scene.getObjectByName('forearm'+side),hand=g.scene.getObjectByName('hand'+side);
   relaxWalkingElbow(upper,fore,hand,g.actor,i*.3);
   const u=fore.getWorldPosition(new Vector3()).sub(upper.getWorldPosition(new Vector3())).normalize(),v=hand.getWorldPosition(new Vector3()).sub(fore.getWorldPosition(new Vector3())).normalize();
   const forward=g.actor.getWorldDirection(new Vector3());forward.addScaledVector(u,-u.dot(forward)).normalize();
   assert(v.dot(forward)>0,'Elbow bent backwards');assert(u.angleTo(v)<.34,'Elbow overflexed');elbowChecks++;
  }
 }
}
console.log({elbowChecks});
const{separatePair}=await import('../app/social-collision.ts');
const body=x=>({object:new Group(),radius:.43,position:new Vector3(x,0,0),m:{offset:new Vector3(),velocity:new Vector3(),cooldown:0}});
const left=body(-.25),right=body(.25);separatePair(left,right,10,0);
assert(left.m.step&&right.m.step);
const ld=left.m.step.to.clone().sub(left.m.step.from),rd=right.m.step.to.clone().sub(right.m.step.from);
assert(ld.dot(rd)<0);assert.equal(left.m.velocity.length(),0);
console.log({oppositeDiscreteSteps:true});
const {stepEase}=await import('../app/social-collision.ts');
for(const id of ['aurelien','ben','julien','raphael']){
 const g=await load(id),s=createTurnPlant(g.scene);applyTurnPlant(s,g.actor,1/60,'Idle');
 const step={start:12,from:new Vector3(),to:new Vector3(.42,0,0),yaw:0,progress:0};let error=0;
 for(let i=0;i<=63;i++){
  restoreTurnPlant(s);g.mixer.update(1/60);step.progress=i/63;g.actor.userData.sideStep=step;
  g.actor.position.lerpVectors(step.from,step.to,stepEase((step.progress-.12)/.76));g.actor.updateMatrixWorld(true);
  applyTurnPlant(s,g.actor,1/60,'Idle');g.actor.updateMatrixWorld(true);
  for(const l of s.legs)error=Math.max(error,l.foot.getWorldPosition(new Vector3()).distanceTo(l.plant));
 }
 console.log({id,sideStepFootError:error});assert(error<.012,'Sidestep foot slides');
}
// Remaining near a partner must never restart the avoidance animation indefinitely.
const c=body(0),d=body(.7);separatePair(c,d,20,0);const first=c.m.step;
c.m.step=undefined;d.m.step=undefined;separatePair(c,d,30,0);
assert.equal(c.m.step,undefined,'Same nearby pair retriggers sidesteps');
d.position.x=4;separatePair(c,d,31,0);d.position.x=.7;separatePair(c,d,32,0);
assert(c.m.step&&c.m.step!==first,'New encounter after separation is handled');
console.log({oneStepPerEncounter:true});
const{createDogFeet,restoreDogFeet,applyDogFeet}=await import('../app/dog-footwork.ts');
for(const id of ['mango','steve']){
 const bytes=fs.readFileSync(`public/models/${id}-user-v1.glb`),g=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const actor=new Group();actor.add(g.scene);g.scene.scale.setScalar(id==='mango'?2.4:1.25);const mixer=new AnimationMixer(g.scene);mixer.clipAction(g.animations.find(c=>c.name==='Idle')).play();
 const feet=createDogFeet(g.scene);let error=0;
 for(let i=0;i<180;i++){restoreDogFeet(feet);mixer.update(1/60);actor.rotation.y=i/180*Math.PI/2;actor.updateMatrixWorld(true);applyDogFeet(feet,actor,1/60);if(feet.applied)for(const l of feet.legs)error=Math.max(error,l.paw.getWorldPosition(new Vector3()).distanceTo(l.plant));}
 console.log({id,pawError:error});assert(error<.025,'Dog turn paws slide');
}
const{steveJump}=await import('../app/steve-jump.ts');
const takeoff=new Vector3(2,0,-1),palms=new Vector3(1.5,1.1,-1.2),sample=new Vector3();
assert(steveJump(takeoff,palms,1.65,sample).distanceTo(takeoff)<1e-9);
assert(steveJump(takeoff,palms,2.6,sample).distanceTo(palms)<1e-9);
for(let t=1.65;t<2.6;t+=.01){steveJump(takeoff,palms,t,sample);assert(sample.y>=0&&sample.y<1.4);}
console.log({groundTakeoff:true,palmContact:true});
