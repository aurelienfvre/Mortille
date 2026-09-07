import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
const bytes=fs.readFileSync('public/models/midnight-room.glb');
const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
const down=new THREE.Vector3(0,-1,0),up=new THREE.Vector3(0,1,0),ray=new THREE.Raycaster();
let floorSamples=0,actorColumns=0,shaftSamples=0,minFloor=Infinity,maxFloor=-Infinity;
for(let x=-7.75;x<=7.75;x+=.5)for(let z=-5.6;z<=5.6;z+=.4){
 ray.set(new THREE.Vector3(x,.40,z),down);ray.far=1;const hits=ray.intersectObjects(meshes,false);assert(hits.length,'Floor gap');
 const y=hits[0].point.y;assert(y>=-.0301&&y<=.004,'Invalid floor surface '+y);minFloor=Math.min(minFloor,y);maxFloor=Math.max(maxFloor,y);floorSamples++;
 ray.set(new THREE.Vector3(x,.06,z),up);ray.far=5.5;assert(!ray.intersectObjects(meshes,false).length,'Architectural obstacle in circulation');actorColumns++;
}
for(let x=-2.6;x<=2.6;x+=.65)for(let z=-4.5;z<=4.5;z+=.75){
 ray.set(new THREE.Vector3(x,1.2,z),up);ray.far=8;assert(!ray.intersectObjects(meshes,false).length,'CRT shaft obstructed');shaftSamples++;
}
assert.equal(gltf.animations.length,0);assert.equal(meshes.length,10);
console.log(JSON.stringify({floorSamples,actorColumns,shaftSamples,minFloor,maxFloor,meshes:meshes.length,bytes:bytes.length},null,2));
