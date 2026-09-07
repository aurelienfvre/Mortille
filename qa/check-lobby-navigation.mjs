import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeMangoState,updateMango} from '../app/mango-motion.ts';
import {friendPose} from '../app/lobby-behavior.ts';
import {danceStyle} from '../app/dance-style.ts';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {Box3,Vector3,Texture} from 'three';
for(const others of [[],[{x:-2.4,z:-2.9}],[{x:-2.4,z:-2.9},{x:.2,z:-3.4},{x:2.5,z:-2.6}]]){
 const s=makeMangoState(),stops=new Set();let travelled=0;
 for(let i=0;i<7200;i++){updateMango(s,1/60,others);stops.add(s.stop);travelled+=s.speed/60;}
 assert(stops.size>=4);assert(travelled>30);const before={...s};updateMango(s,.05,others,true);assert.equal(s.x,before.x);assert.equal(s.z,before.z);
}
for(const id of ['hero','yeti'])for(let t=0;t<240;t+=.1)assert.notEqual(friendPose(id,t).action,'HighFive');
assert.equal(new Set([0,1,2,3].map(i=>JSON.stringify(danceStyle(i,.7)))).size,4);
const b=fs.readFileSync('public/models/hardware/storage-crate.glb');const g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'T',loadTexture:()=>Promise.resolve(new Texture())})).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
for(const [name,axis,sign]of[['Flap_Front','x',1],['Flap_Back','x',-1],['Flap_Left','z',1],['Flap_Right','z',-1]]){
 const f=g.scene.getObjectByName(name),before=new Box3().setFromObject(f).getCenter(new Vector3());
 f.rotation[axis]=sign*1.9;const after=new Box3().setFromObject(f).getCenter(new Vector3());
 assert(after.y>before.y+.2,`${name} folds inside`);
 console.log(name,before.toArray(),after.toArray());
}
console.log('Patrol with obstacles, pause, no checks, four dances and outward flaps passed');
