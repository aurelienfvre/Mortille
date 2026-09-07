import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {facialPose} from '../app/facial-motion.ts';
import {returnCameraProgress,returnMechanismProgress,RETURN_DURATION} from '../app/return-motion.ts';
let independent=0,blinkFrames=0;
// A blink must reach complete closure, hold it for several rendered frames,
// then reopen progressively; a nonzero morph alone is not a sufficient check.
for(const hero of [true,false]){
 let closes=0,closedFor=0,longestClosure=0,lastEnd=-1,maxGap=0,started=-1;
 for(let t=0;t<120;t+=1/120){
  const p=facialPose(hero,t);
  if(p.blink>.96){if(!closedFor){closes++;if(lastEnd>=0)maxGap=Math.max(maxGap,t-lastEnd);}closedFor+=1/120;longestClosure=Math.max(longestClosure,closedFor);}
  else if(closedFor){lastEnd=t;closedFor=0;}
 }
 assert(closes>=28,'Too few actual eye closures');
 assert(longestClosure>=.06 && longestClosure<=.15,'Closure not readable or unnaturally long');
 assert(maxGap<4.4,'Character stares for too long without blinking');
 console.log({character:hero?'human':'gorille',closesIn120Seconds:closes,longestClosure,maxGap});
}
for(let t=0;t<120;t+=.005){
 const h=facialPose(true,t),y=facialPose(false,t);
 for(const p of [h,y]){assert(p.blink>=0 && p.blink<=1);assert(Math.abs(p.yaw)<=.13);assert(Math.abs(p.pitch)<=.055);}
 if(h.blink>0 || y.blink>0)blinkFrames++;
 if(Math.abs(h.blink-y.blink)>.1)independent++;
}
assert(independent>blinkFrames*.75,'Blinks are synchronized');
for(const cfg of [{name:'aurelien-mortizle-eyelids-v1',cx:.109,cy:1.211,ry:.061},{name:'julien-mortizle-eyelids-v1',cx:.109,cy:1.211,ry:.061},{name:'gorille-eyelids-v1',cx:.133,cy:1.335,ry:.080}]){
 const b=fs.readFileSync(`public/models/${cfg.name}.glb`),g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 let checked=0;
 g.scene.traverse(o=>{if(!o.isMesh)return;
  assert.deepEqual(Object.keys(o.morphTargetDictionary).sort(),['Blink_Left','Blink_Right']);
  const a=o.geometry.attributes.position;
  for(let i=0;i<a.count;i++){
   const p=new T.Vector3().fromBufferAttribute(a,i);
   for(const [key,j] of Object.entries(o.morphTargetDictionary)){
    const d=new T.Vector3().fromBufferAttribute(o.geometry.morphAttributes.position[j],i);
    if((key==='Blink_Left' && a.getX(i)>0)||(key==='Blink_Right' && a.getX(i)<0))assert(d.length()<1e-6,'Blink moves the other eyelid');
    p.add(d);
   }
   assert(p.y>=cfg.cy-cfg.ry-.004 && p.y<=cfg.cy+cfg.ry+.004,'Closed lid extends beyond the eye');checked++;
  }
 });
 g.scene.updateMatrixWorld(true);
 for(const x of [-cfg.cx,cfg.cx]){
  const ray=new T.Raycaster(new T.Vector3(x,cfg.cy,1),new T.Vector3(0,0,-1));
  g.scene.traverse(o=>{if(o.morphTargetInfluences)o.morphTargetInfluences.fill(0);});
  assert.equal(ray.intersectObject(g.scene,true).length,0,'Open eyelid covers the pupil');
  g.scene.traverse(o=>{if(o.morphTargetInfluences)o.morphTargetInfluences.fill(1);});
  assert(ray.intersectObject(g.scene,true).length>0,'Closed eyelid does not cover the pupil from the front');
 }
 console.log({model:cfg.name,eyelidVertices:checked,closure:'both pupils covered by morph geometry'});
}
assert.equal(returnCameraProgress(0),0);assert.equal(returnCameraProgress(RETURN_DURATION),1);
assert(returnCameraProgress(4.1)>1.03,'No arrival rebound');
for(const t of [0,4.1,RETURN_DURATION]){
 const derivative=(returnCameraProgress(t+.0001)-returnCameraProgress(t-.0001))/.0002;
 assert(Math.abs(derivative)<1e-5,'Camera has a velocity discontinuity');
}
let previous=0;
for(let t=0;t<RETURN_DURATION;t+=.005){const q=returnMechanismProgress(t);assert(q>=previous && q<=1);previous=q;}
console.log({independentBlinkFrames:independent,returnDuration:RETURN_DURATION,arrival:'smooth rebound',mechanism:'monotonic'});
