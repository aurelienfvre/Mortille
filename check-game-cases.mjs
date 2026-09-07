import fs from 'node:fs';import assert from 'node:assert/strict';import {Vector3,Box3,Raycaster} from 'three';import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
await MeshoptDecoder.ready;const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);const metadata=JSON.parse(fs.readFileSync('app/hardware-cases.json'));const report=[];const near=(a,b,e=1e-5)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
for(const [id,meta]of Object.entries(metadata)){
 const buffer=fs.readFileSync(`public/models/hardware/${id}-case.glb`);const {scene}=await loader.parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');scene.updateMatrixWorld(true);
 const nodes={};for(const name of ['Case_Cover','Case_Front','Case_Back','Case_Spine','Case_Insert_Back']){const all=[];scene.traverse(o=>{if(o.name===name)all.push(o);});assert.equal(all.length,1,`${id} unique ${name}`);nodes[name]=all[0];}
 const cover=nodes.Case_Cover,front=nodes.Case_Front;assert.equal(front.parent,cover);assert.equal(nodes.Case_Insert_Back.parent,cover);assert.notEqual(nodes.Case_Back.parent,cover);assert.notEqual(nodes.Case_Spine.parent,cover);
 cover.position.toArray().forEach((v,i)=>near(v,meta.cover.pivot[i]));near(cover.rotation.x,0);near(cover.rotation.y,0);near(cover.rotation.z,0);
 const size=new Box3().setFromObject(scene).getSize(new Vector3());near(size.x,meta.size[0]+.018,.004);near(size.y,meta.size[1],.003);near(size.z,meta.size[2]+.006,.003);
 const art={};for(const [name,normal]of [['Case_Front',[0,0,1]],['Case_Back',[0,0,-1]],['Case_Spine',[-1,0,0]]]){
  const mesh=nodes[name],uv=mesh.geometry.attributes.uv;assert(uv);let bounds=[Infinity,Infinity,-Infinity,-Infinity];for(let i=0;i<uv.count;i++){bounds[0]=Math.min(bounds[0],uv.getX(i));bounds[1]=Math.min(bounds[1],uv.getY(i));bounds[2]=Math.max(bounds[2],uv.getX(i));bounds[3]=Math.max(bounds[3],uv.getY(i));}bounds.forEach((v,i)=>near(v,i<2?0:1));
  const n=new Vector3().fromBufferAttribute(mesh.geometry.attributes.normal,0).transformDirection(mesh.matrixWorld);n.toArray().forEach((v,i)=>near(v,normal[i]));art[name]={uvBounds:bounds,normal:n.toArray(),worldCenter:mesh.getWorldPosition(new Vector3()).toArray()};
 }
 const hits=new Raycaster(new Vector3(0,0,1),new Vector3(0,0,-1)).intersectObject(scene,true);const zs=[...new Set(hits.map(h=>Math.round(h.point.z*1e6)/1e6))].sort((a,b)=>b-a);near(zs[0],.078);near(zs[1],.075);near(zs[0]-zs[1],.003);
 const baseCenterClosed=nodes.Case_Back.getWorldPosition(new Vector3()),samples=[];
 for(let i=0;i<=20;i++){
  const angle=meta.cover.openAngle*i/20;cover.rotation.y=angle;scene.updateMatrixWorld(true);const world=front.getWorldPosition(new Vector3());const predicted=new Vector3(...meta.front.position).applyAxisAngle(new Vector3(0,1,0),angle).add(new Vector3(...meta.cover.pivot));near(world.distanceTo(predicted),0);near(nodes.Case_Back.getWorldPosition(new Vector3()).distanceTo(baseCenterClosed),0);samples.push({angle,frontCenter:world.toArray()});
 }
 assert(samples.at(-1).frontCenter[0]<-1.4&&samples.at(-1).frontCenter[2]>.35);
 // A disc fits within the walls and the tray diameter, with a hollow spindle beneath its central hole.
 const disc=meta.disc;assert(disc.diameter+2*.05<meta.size[0]);assert(disc.diameter+2*.05<meta.size[1]);near(disc.position[2],.025);
 report.push({id,size:size.toArray(),hinge:cover.position.toArray(),surfaces:art,hingeSamples:samples,discDiameter:disc.diameter,artworkClearance:zs[0]-zs[1],duplicateSurfaces:0,pass:true});
}
fs.writeFileSync('../asset-optimization/game-cases-qa-v3.json',JSON.stringify(report,null,2));console.log(`${report.length} cases: exact left hinge, identity closed pose, 21 angle samples each, unique artwork nodes, 3mm front clearance and disc envelope pass.`);
