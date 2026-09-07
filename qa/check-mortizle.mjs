import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {games} from '../app/catalog.ts';
import {spritePixels,palette} from '../app/sprites.ts';
const suffixes=['MORTILLE','ORTEIL','MORILLE','GRORILLE'];
assert.equal(games.length,9);assert.equal(new Set(games.map(g=>g.name)).size,9);
for(const g of games){assert(suffixes.some(s=>g.name.endsWith(s)));assert(!/OMÉO|OMEO| MORI$/.test(g.name));}
for(const suffix of suffixes)assert(games.some(g=>g.name.endsWith(suffix)),`Missing suffix ${suffix}`);
assert.equal(games.find(g=>g.id==='kart').name,'KARTORTEIL');
for(let frame=0;frame<4;frame++){
 const rows=spritePixels('gorilla',frame);assert.equal(rows.length,24);
 for(const row of rows)for(const pixel of row)assert(palette[pixel],`Unknown palette pixel ${pixel}`);
 assert(rows.slice(0,6).some(r=>r.includes('j')),'Green cap missing');
}
for(const file of ['page.tsx','layout.tsx','catalog.ts','immersive.tsx','game-player.tsx']){
 const source=fs.readFileSync('app/'+file,'utf8');assert(!/ARCADOMÉO|ArcadOméo|OMÉO INTERACTIVE|MARIOMÉO|PACOMÉO/.test(source),`Old visible brand ${file}`);
}
const data=fs.readFileSync('public/models/mortizle-cabinet.glb');
const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.length),'');
const screen=gltf.scene.getObjectByName('CRT_Surface');assert(screen?.isMesh);assert(screen.geometry.attributes.uv,'Runtime screen UVs must survive GLB optimization');
assert(screen.geometry.attributes.position.count>0);
const bounds=new T.Box3().setFromObject(gltf.scene),size=bounds.getSize(new T.Vector3());
assert(size.y>3&&size.y<3.5,'Rebranding must preserve cabinet scale');
console.log(JSON.stringify({pass:true,brand:'MORTIZLE',games:games.map(g=>g.name),suffixes,pixelFrames:4,cabinetUVs:screen.geometry.attributes.uv.count,bytes:data.length},null,2));
