import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
const path='public/models/mango-german-shepherd.glb',bytes=fs.readFileSync(path),g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
assert.deepEqual(g.animations.map(a=>a.name).sort(),['Idle','Walk']);
const mixer=new T.AnimationMixer(g.scene),box=new T.Box3(),combined=new T.Box3();let floor=Infinity,poses=0,triangles=0,draws=0;
g.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;draws++;}});
for(const clip of g.animations){
 mixer.stopAllAction();const a=mixer.clipAction(clip);a.play();a.paused=true;
 for(let i=0;i<=60;i++){
  a.time=clip.duration*i/60;mixer.update(0);g.scene.updateMatrixWorld(true);box.makeEmpty();
  g.scene.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
  assert(Number.isFinite(box.min.y)&&Number.isFinite(box.max.y),'Finite skin geometry');assert(box.min.y>-.008,`Mango paws below floor ${clip.name}/${a.time}: ${box.min.y}`);
  assert(box.max.y<1.8 && box.max.z-box.min.z<2.7,'No limb or skin explosion');
  floor=Math.min(floor,box.min.y);combined.union(box);poses++;
 }
}
const nativeAudit=JSON.parse(fs.readFileSync('../blender/mango-paw-audit.json'));
let plantedError=0;for(const p of nativeAudit){const error=Math.hypot(...p.actual.map((v,i)=>v-p.target[i]));plantedError=Math.max(plantedError,error);assert(error<.0001,'Analytic paw target error');if(p.stance)assert(Math.abs(p.actual[2]-.08)<.0001,'Planted paw lifts or sinks');}
assert(triangles<60000,'Mango triangle budget');assert(draws<=9,'Mango draw-call budget');
const stats={bytes:bytes.length,triangles,draws,clips:g.animations.map(a=>({name:a.name,duration:a.duration})),poses,floor,plantedError,bounds:{min:combined.min.toArray(),max:combined.max.toArray()},pass:true};fs.writeFileSync('work/qa-mango-asset.json',JSON.stringify(stats,null,2));console.log(stats);
