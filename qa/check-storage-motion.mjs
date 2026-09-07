import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
const importTS=async path=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
const {storageBox,storageItem,STORAGE_DURATION,STORAGE_SWAP}=await importTS('app/storage-motion.ts');
const {slotPose}=await importTS('app/cartridge-motion.ts');
const assets=JSON.parse(fs.readFileSync('app/hardware-assets.json'));
const cases=JSON.parse(fs.readFileSync('app/hardware-cases.json'));
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
async function load(path){const b=fs.readFileSync('public'+path.split('?')[0]);return (await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}
const models=[];
const carton=await load('/models/hardware/storage-crate.glb');
const flapNodes=['Flap_Front','Flap_Back','Flap_Left','Flap_Right'].map(name=>carton.getObjectByName(name));
for(const [id,spec] of Object.entries(assets)){
 const console=await load(spec.asset),bound=new THREE.Box3().setFromObject(console),size=bound.getSize(new THREE.Vector3()),center=bound.getCenter(new THREE.Vector3()),scale=1.2/Math.max(size.x,size.y,size.z);
 const c=new THREE.Group();c.position.y=.6;c.rotation.x=.16;c.scale.setScalar(scale);console.position.sub(center);c.add(console);models.push({name:'console-'+id,object:c});
 const kind=cases[id],media=await load(kind?.asset??spec.media.asset),g=new THREE.Group();g.position.y=.6;g.scale.setScalar(kind?1.2/Math.max(...kind.size):1.2/Math.max(spec.media.size[0],spec.media.size[1]));g.add(media);models.push({name:'game-'+id,object:g});
}
const source=fs.readFileSync('app/immersive.tsx','utf8');const arc=Number(source.match(/pos\.y=THREE\.MathUtils\.lerp\(pos\.y,([.\d]+),q\)\+([.\d]+)\*Math\.sin/)[2]);const packedY=Number(source.match(/pos\.y=THREE\.MathUtils\.lerp\(pos\.y,([.\d]+),q\)/)[1]);
let samples=0,firstCollision=null,collisions=0,flapCandidates=0,firstFlap=null;
const wallBoxes=[[-2,-1.962,-.75,.75],[1.962,2,-.75,.75],[-2,2,-.75,-.712],[-2,2,.712,.75]];
for(const spacing of [1.65,1.9,2.3])for(const {name,object} of models)for(let slot=-2;slot<=2;slot++){
 const root=new THREE.Group(),hinge=new THREE.Group(),unpivot=new THREE.Group();hinge.position.y=.6;unpivot.position.y=-.6;root.add(hinge);hinge.add(unpivot);unpivot.add(object);
 const base=slotPose(slot,spacing);let prev=null,maxJump=0;
 for(let t=0;t<=STORAGE_DURATION+.001;t+=.01){
  const item=storageItem(t,slot),q=item.pack,b=storageBox(t),scale=base.scale*(1-.77*q);
  root.position.set(THREE.MathUtils.lerp(base.x,slot*.34,q),THREE.MathUtils.lerp(base.y,packedY,q)+arc*Math.sin(Math.PI*q),THREE.MathUtils.lerp(base.z,.55,q));root.scale.setScalar(scale);hinge.rotation.y=THREE.MathUtils.lerp(base.yaw,0,q);root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  if(prev){maxJump=Math.max(maxJump,root.position.distanceTo(prev));}prev=root.position.clone();
  if(item.visible&&b.visible){
   carton.position.set(b.x,b.y,.55);
   flapNodes.forEach((f,i)=>{f.rotation[i<2?'x':'z']=(i%2?-1:1)*-b.open*110*Math.PI/180;});carton.updateMatrixWorld(true);
   for(const f of flapNodes){const fb=new THREE.Box3().setFromObject(f);if(bounds.intersectsBox(fb)){flapCandidates++;firstFlap??={name,spacing,slot,time:+t.toFixed(2),flap:f.name};break;}}

   for(const [x0,x1,z0,z1] of wallBoxes){const wall=new THREE.Box3(new THREE.Vector3(b.x+x0,b.y+.05,.55+z0),new THREE.Vector3(b.x+x1,b.y+1.11,.55+z1));if(bounds.intersectsBox(wall)){collisions++;firstCollision??={name,spacing,slot,time:+t.toFixed(2),box:b,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};break;}}
  }samples++;
 }
 assert.ok(maxJump<.12,`${name} discontinuity ${maxJump}`);
}
for(let slot=-2;slot<=2;slot++){
 assert.equal(storageItem(STORAGE_SWAP-1e-6,slot).visible,false);assert.equal(storageItem(STORAGE_SWAP+1e-6,slot).visible,false);
 assert.equal(storageItem(STORAGE_DURATION,slot).visible,true);assert.equal(storageItem(STORAGE_DURATION,slot).pack,0);
 assert.equal(storageItem(1.55,slot).visible,false,'Box starts closing before packing finishes');
 assert.ok(storageItem(4.55,slot).visible&&storageItem(4.55,slot).pack===0,'Box closes before items have returned');
}
assert.equal(storageBox(STORAGE_SWAP-1e-6).visible,false);assert.equal(storageBox(STORAGE_SWAP).open,0);
const result={duration:STORAGE_DURATION,swap:STORAGE_SWAP,models:models.length,spacings:[1.65,1.9,2.3],samples,packedY,arc,wallAabbCandidates:collisions,firstCollision,flapAabbCandidates:flapCandidates,firstFlap,fiveFinalItemsVisible:true,swapHidden:true};fs.writeFileSync('../blender/storage-motion-qa.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(collisions||flapCandidates)process.exitCode=1;
