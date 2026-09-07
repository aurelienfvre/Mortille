import assert from 'node:assert/strict';
import {friendPose} from '../app/lobby-behavior.ts';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const buffer=fs.readFileSync(new URL('../public/models/arcade-cabinet.glb',import.meta.url));
const cabinet=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
const bounds=new T.Box3().setFromObject(cabinet.scene);
const cabinets=[[4.8,-5.5,-.16],[7,-3,-Math.PI/2],[-4.8,-5.5,.16],[-7,-3,Math.PI/2],[0,-5.85,0]].map(([x,z,yaw])=>bounds.clone().applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,0,z),new T.Quaternion().setFromEuler(new T.Euler(0,yaw,0)),new T.Vector3(1,1,1))));
let clearance=Infinity;
let different=0,movingHero=0,movingYeti=0,minSeparation=Infinity;
const spans={hero:[Infinity,-Infinity],yeti:[Infinity,-Infinity]};
for(let time=.01;time<92;time+=.01){
  const h=friendPose('hero',time),y=friendPose('yeti',time);
  if(h.action!==y.action)different++;
  const separation=Math.hypot(h.x-y.x,h.z-y.z);minSeparation=Math.min(minSeparation,separation);
  assert(separation>1.2,'Characters intersect');
  for(const [name,p] of [['hero',h],['yeti',y]]){
    const prev=friendPose(name,time-.01),distance=Math.hypot(p.x-prev.x,p.z-prev.z);
    assert(distance<.012,`${name} teleports at ${time}`);
    if(p.action==='Walk' && prev.action==='Walk'){
      assert(Math.abs(distance/.01-.4*1.6*(p.rate+prev.rate)/2)<.0002,`${name} foot speed mismatch`);
      if(name==='hero')movingHero++;else movingYeti++;
    }
    assert(p.z>=-3.91 && p.z<=-1.34,'Path leaves the clear floor area');
    spans[name][0]=Math.min(spans[name][0],p.x);spans[name][1]=Math.max(spans[name][1],p.x);
    for(const box of cabinets){
      const x=p.x;
      const dx=Math.max(box.min.x-x,0,x-box.max.x),dz=Math.max(box.min.z-p.z,0,p.z-box.max.z);
      const distance=Math.hypot(dx,dz);clearance=Math.min(clearance,distance);
      assert(distance>.5,`${name} reaches an arcade cabinet at ${time}`);
    }
  }
}
assert(different>1400,'Behavior remains excessively synchronized');
assert(movingHero>1000 && movingYeti>1000,'Both characters need actual routes');
for(const name of ['hero','yeti']){
 const a=friendPose(name,91.99999),b=friendPose(name,92);
 assert(Math.hypot(a.x-b.x,a.z-b.z)<.00001,'Loop jumps');
 assert.equal(friendPose(name,66.5).action,'HighFive');
 assert(spans[name][1]-spans[name][0]>8,'Character remains on one side');
}
console.log({samples:9200,differentActionsSeconds:different/100,heroWalkingSeconds:movingHero/100,yetiWalkingSeconds:movingYeti/100,minSeparation,cabinetClearance:clearance,spans});
