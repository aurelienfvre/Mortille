import fs from 'node:fs';import assert from 'node:assert/strict';import ts from 'typescript';import {pathToFileURL} from 'node:url';import * as T from 'three';import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';import {slotOf,slotPose,carouselPose,swapDuration} from '../app/cartridge-motion.ts';
const code=ts.transpileModule(fs.readFileSync('app/hardware-motion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'./cartridge-sequence'",JSON.stringify(pathToFileURL(process.cwd()+'/app/cartridge-sequence.ts').href));
const {hardwarePose,hardwareCamera,mediaDisplayScale}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const specs=JSON.parse(fs.readFileSync('app/hardware-assets.json')),cases=JSON.parse(fs.readFileSync('app/hardware-cases.json'));
const read=async path=>{const b=fs.readFileSync('public'+path.split('?')[0]);return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'CPU_QA',loadTexture:()=>Promise.resolve(new T.Texture())})).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const report=[];
for(const [id,s] of Object.entries(specs)){
 s.caseSize=cases[id]?.size;s.caseDisc=cases[id]?.disc.position;
 const display={x:0,y:2.04,z:1.27,pitch:.04,yaw:-.13,scale:1.45},device=await read(s.asset),media=await read(s.media.asset);
 for(const part of Object.values(s.moving))assert(device.scene.getObjectByName(part.node),`${id} missing ${part.node}`);
 if(['ps3','xbox360'].includes(id)){
  assert.equal(s.insertion.mode,'slot',`${id} must use the requested slot drive`);
  assert(!s.moving.tray,`${id} still has a moving tray contract`);
  assert(!device.scene.getObjectByName('Tray'),`${id} still exports a tray`);
  assert.equal(s.insertion.approach[1],s.insertion.contact[1],`${id} enters from above instead of horizontally`);
  assert.equal(s.insertion.contact[1],s.insertion.seated[1],`${id} changes height inside the slot`);
  let lastZ=Infinity;
  for(let t=2.1;t<=4.15;t+=.01){const pose=hardwarePose(s,t,display);assert(pose.mediaPosition[2]<=lastZ+1e-8,`${id} reverses direction while loading`);lastZ=pose.mediaPosition[2];}
 }

 const screen=s.display==='handheld'?device:await read(`/models/hardware/tv-${s.display}.glb`),glass=screen.scene.getObjectByName('Display_Surface');assert(glass?.geometry.attributes.uv,`${id} no screen UV`);
 const normal=glass.geometry.attributes.normal;for(let i=0;i<normal.count;i++)assert(normal.getZ(i)>.99,`${id} wrong screen winding`);
 let last=hardwarePose(s,0,display),maxStep=0;
 for(let t=.001;t<7.6;t+=.001){const p=hardwarePose(s,t,display),distance=Math.hypot(...p.mediaPosition.map((v,i)=>v-last.mediaPosition[i]));assert(p.mediaPosition.every(Number.isFinite));assert(distance<.07,`${id} teleport t${t}: ${distance}`);assert(p.mediaScale>0);maxStep=Math.max(maxStep,distance);last=p;}
 if(s.media.type==='disc'){
  assert.equal(hardwarePose(s,3.39,display).discSpin,0,`${id} spins before pickup`);
  let previous=hardwarePose(s,3.4,display).discSpin;
  for(let t=3.41;t<5.24;t+=.01){const p=hardwarePose(s,t,display);assert(p.discSpin>=previous);assert(p.discSpin-previous<.081,`${id} spin angular jump`);previous=p.discSpin;}
  if(id==='gamecube'){assert(hardwarePose(s,3.94,display).mechanism>.99);assert(hardwarePose(s,3.94,display).discSpin>.8);}
 }
 const holdA=hardwarePose(s,2.66,display),holdB=hardwarePose(s,3.39,display);assert.deepEqual(holdA.mediaPosition,holdB.mediaPosition,`${id} no physical pause`);
 for(const time of [5.95,6.3,6.8,7.59]){const pose=hardwarePose(s,time,display),cam=hardwareCamera(s,time);assert(pose.power>.99);assert(Math.abs(cam.position[0]-pose.displayPosition[0])<.00001);assert(cam.position[2]>pose.displayPosition[2]);}
 const asset=cases[id]?await read(cases[id].asset):media,bounds=new T.Box3().setFromObject(asset.scene),normalScale=mediaDisplayScale(s);
 for(const count of [9])for(const spacing of [1.65,2.3])for(const direction of [-1,1])for(let time=0;time<=swapDuration(0,direction,count);time+=.02){
  const boxes=Array.from({length:count},(_,n)=>{const p=carouselPose(slotOf(n,0,count),slotOf(n,(direction+count)%count,count),time,spacing,undefined,count),matrix=new T.Matrix4().makeTranslation(p.x,p.y,p.z).multiply(new T.Matrix4().makeScale(p.scale,p.scale,p.scale)).multiply(new T.Matrix4().makeTranslation(0,.6,0)).multiply(new T.Matrix4().makeRotationY(p.yaw)).multiply(new T.Matrix4().makeScale(normalScale,normalScale,normalScale));return bounds.clone().applyMatrix4(matrix);});
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)assert(!boxes[i].intersectsBox(boxes[j]),`${id} carousel collision ${i}/${j}`);
 }
 report.push({id,maxStep,screen:s.display,glbNodes:true,hold:true,continuity:true,carousel:true});
}
for(const count of [8,9])for(let i=0;i<count;i++){const n=Array.from({length:count},(_,id)=>slotPose(slotOf(id,i,count),2.3,count)).filter(p=>Math.abs(p.x)<7).length;assert.equal(n,5,`five objects count${count}`);}
fs.writeFileSync('work/hardware-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,consoles:report.length,samples:8*7599,details:report},null,2));
