import fs from 'node:fs';import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';import * as T from 'three';
for(const name of ['console-64','game-cartridge','console-tv-sequence']){
const b=fs.readFileSync(`public/models/${name}.glb`);const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
console.log(name,'clips',gltf.animations.map(a=>[a.name,a.duration]));
if(name==='console-tv-sequence'){
 const mixer=new T.AnimationMixer(gltf.scene),a=mixer.clipAction(gltf.animations[0]);a.play();a.paused=true;
 for(const t of [0,1.2,2.65,2.9,3.05,3.38,5.05,7.59]){a.time=t;mixer.update(0);gltf.scene.updateMatrixWorld(true);console.log(t,...['Console_Lift','Cartridge_Lift','Television_Lift','CRT_Television_Screen'].map(n=>{const o=gltf.scene.getObjectByName(n);const box=new T.Box3().setFromObject(o);return [n,o.getWorldPosition(new T.Vector3()).toArray(),box.min.toArray(),box.max.toArray()];}));}
}else{gltf.scene.traverse(o=>{if(o.isMesh){const b=new T.Box3().setFromObject(o);console.log(o.name,b.min.toArray().map(x=>+x.toFixed(3)),b.max.toArray().map(x=>+x.toFixed(3)));}});}}
