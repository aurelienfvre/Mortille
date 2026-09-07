import fs from 'node:fs';import assert from 'node:assert/strict';
import {Group,Texture,Vector3,AnimationMixer} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {catchSupport,carryOffset,encounterClipTime} from '../app/catch-support.ts';
import {DOG_SCALE,CUCU_SCALE} from '../app/cucu-steve-motion.ts';
import {MANGO_SCALE} from '../app/mango-motion.ts';
import {friendPose} from '../app/lobby-behavior.ts';
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'CPU_TEXTURE',loadTexture:()=>Promise.resolve(new Texture())}));
async function load(id){const b=fs.readFileSync(`public/models/${id}-user-${id==='julien'?'v3':'v1'}.glb`);return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const julien=await load('julien'),steve=await load('steve');let cases=0,maxError=0;
for(const x of [-5.2,5.2])for(const parentScale of [.8,1,1.3]){
 const parent=new Group();parent.scale.setScalar(parentScale);parent.rotation.y=.3;parent.position.set(2,0,-1);
 const actor=new Group(),dog=new Group();parent.add(actor,dog);actor.position.set(x,0,.2);actor.rotation.y=x>0?-.35:.35;
 dog.scale.setScalar(DOG_SCALE);dog.rotation.set(-.2,actor.rotation.y+Math.PI/2+.4,0,'YXZ');dog.add(clone(steve.scene));const carry=dog.getObjectByName('carry_anchor');
 const support=new Vector3(),offset=new Vector3();
 for(let mount=0;mount<3;mount++){
  actor.clear();const rig=clone(julien.scene);rig.scale.setScalar(CUCU_SCALE);actor.add(rig);
  const mixer=new AnimationMixer(rig),a=mixer.clipAction(julien.animations.find(c=>c.name==='Catch')).play();
  for(const t of [2.6,3.2,4.8,6.7,7.399]){
   a.time=t;a.paused=true;mixer.update(0);parent.updateMatrixWorld(true);
   assert(catchSupport(actor,parent,support));carryOffset(dog,carry,offset);dog.position.copy(support).sub(offset);parent.updateMatrixWorld(true);
   const expected=rig.getObjectByName('palmL').getWorldPosition(new Vector3()).add(rig.getObjectByName('palmR').getWorldPosition(new Vector3())).multiplyScalar(.5);
   const error=carry.getWorldPosition(new Vector3()).distanceTo(expected);assert(error<1e-7);maxError=Math.max(maxError,error);cases++;
  }
 }
}
assert.equal(catchSupport(new Group(),null,new Vector3()),false);
assert.equal(encounterClipTime('Fall',2.6),2);assert(Math.abs(encounterClipTime('Kiss',5.1)-1)<1e-9);
assert.equal(MANGO_SCALE,2.4);assert(DOG_SCALE>1.15&&DOG_SCALE<1.4);
for(const id of ['hero','yeti']){let dance=0;for(let t=0;t<112;t+=.05){if(friendPose(id,t).action==='Dance')dance+=.05;}assert(dance>7);for(let t=0;t<240;t+=.1)assert.notEqual(friendPose(id,t).action,'HighFive');}
console.log(JSON.stringify({catchChecks:cases,maxAnchorError:maxError,remounts:true,transformedParents:true,mangoScale:MANGO_SCALE,steveScale:DOG_SCALE,danceAndInteractionSchedule:true},null,2));
