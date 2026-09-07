import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
const results=[];
for(const name of ['aurelien-mortizle-v1','julien-mortizle-v1']){
 const buf=fs.readFileSync(`public/models/${name}.glb`),g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');let tris=0,bones=0;const mats=new Map();
 g.scene.traverse(o=>{if(o.isBone)bones++;if(!o.isMesh)return;tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;mats.set(o.material.name,o);});assert.equal(bones,15);
 const hero=name.startsWith('aurelien');assert(tris<=(hero?95000:85000));const fabric=[...mats.keys()].find(s=>hero?/baggy coton noir/.test(s):/denim peint/.test(s));assert(fabric,'Requested trousers material missing');
 assert([...mats.keys()].some(s=>s.includes('semelle Air Force')),'Modelled sneaker soles missing');
 if(hero){assert([...mats.keys()].some(s=>s.includes('cuir blanc Air Force')),'White leather missing');assert(![...mats.keys()].some(s=>s.includes('camouflage cuir peint')));}
 else{
  const camo=[...mats.entries()].filter(([s])=>s.includes('camouflage cuir peint'));assert(camo.length,'Camo missing');
  for(const[,o]of camo){const c=o.geometry.attributes.color;assert(c,'Camo pigments lost');const indices=[...new Set(o.geometry.index.array)],reds=indices.map(i=>c.getX(i));assert(Math.max(...reds)-Math.min(...reds)>.15,'Camouflage flattened into one color');}
  const logo=[...mats.entries()].find(([s])=>s.includes('swoosh rose'));assert(logo,'Pink swoosh missing');assert(logo[1].material.color.r>.8&&logo[1].material.color.b>.3,'Pink logo material changed');assert(g.animations.some(c=>c.name==='Catch'));
 }
 results.push({name,triangles:tris,bytes:buf.length,bones,clips:g.animations.map(c=>c.name),fabric});
}
console.log(JSON.stringify(results,null,2));
