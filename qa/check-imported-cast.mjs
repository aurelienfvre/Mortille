import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {CAST_MODELS,characterExpression,createExpressionRig,applyExpression} from '../app/character-expression.ts';

const directory=process.env.CAST_ASSET_DIR||'public/models';
const ids=process.argv.slice(2).length?process.argv.slice(2):Object.keys(CAST_MODELS);
const report=[];
const neutral={blink:0,smile:0,mouth:0,tongue:0,yaw:0,pitch:0};
const vec=new T.Vector3();
const update=scene=>{scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();o.computeBoundingSphere();}});};
const bounds=scene=>{
  const box=new T.Box3();
  scene.traverse(o=>{if(!o.isMesh||o.name==='Ink_Outline')return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){o.getVertexPosition(i,vec);box.expandByPoint(vec.applyMatrix4(o.matrixWorld));}});
  return box;
};
for(const id of ids){
  const file=path.join(directory,CAST_MODELS[id]+'.glb'),data=fs.readFileSync(file);
  assert(data.length<25*1024*1024,`${id}: exceeds hosting's file limit`);
  const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  assert((json.images||[]).every(i=>i.bufferView!==undefined),`${id}: external texture`);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'CPU_TEXTURE',loadTexture:()=>Promise.resolve(new T.Texture())}));
  const asset=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const {scene}=asset,face=createExpressionRig(scene),morphs=new Set();
  let triangles=0,bones=0,weightError=0,skinnedVertices=0;
  const eyelids=[];
  scene.traverse(o=>{
    if(o.isBone)bones++;
    if(!o.isMesh)return;
    triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
    if(/eyelid|paupiere/i.test(o.name))eyelids.push(o);
    for(const k of Object.keys(o.morphTargetDictionary||{}))morphs.add(k);
    assert((o.morphTargetInfluences||[]).every(v=>Math.abs(v)<1e-6),`${id}: expression active at export`);
    if(!o.isSkinnedMesh)return;
    const w=o.geometry.attributes.skinWeight,j=o.geometry.attributes.skinIndex;skinnedVertices+=w.count;
    for(let i=0;i<w.count;i++){
      weightError=Math.max(weightError,Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1));
      for(let k=0;k<4;k++)assert(j.getComponent(i,k)<o.skeleton.bones.length,`${id}: bone index out of range`);
    }
  });
  assert(bones>15&&skinnedVertices>1000,`${id}: missing deforming skeleton`);
  assert(weightError<.003,`${id}: unnormalized weights`);
  assert(triangles<130000,`${id}: geometry budget`);
  for(const key of ['Blink_Left','Blink_Right','Smile'])assert(morphs.has(key),`${id}: missing ${key}`);
  if(['ben','mango','steve'].includes(id))for(const key of ['MouthOpen','TongueOut'])assert(morphs.has(key),`${id}: missing ${key}`);
  for(const key of ['Idle','Walk'])assert(asset.animations.some(c=>c.name===key),`${id}: missing ${key}`);
  if(id==='julien')assert(asset.animations.some(c=>c.name==='Catch'),'Julien cannot catch Steve');
  if(id==='steve')for(const key of ['Fall','Held','Kiss'])assert(asset.animations.some(c=>c.name===key),`Steve missing ${key}`);

  // A real closed lid must occlude the original eye, rather than merely have a nonzero weight.
  const closure=[];
  applyExpression(face,{...neutral,blink:1});update(scene);
  for(const lid of eyelids){
    const box=new T.Box3();
    for(let i=0;i<lid.geometry.attributes.position.count;i++){lid.getVertexPosition(i,vec);box.expandByPoint(vec.applyMatrix4(lid.matrixWorld));}
    const center=box.getCenter(new T.Vector3());
    const ray=new T.Raycaster(new T.Vector3(center.x,center.y,3),new T.Vector3(0,0,-1));
    const closed=ray.intersectObject(scene,true)[0];
    applyExpression(face,neutral);update(scene);
    const opened=ray.intersectObject(scene,true)[0];
    assert(closed?.object===lid,`${id}: ${lid.name} fails to cover eye (${closed?.object.name})`);
    assert(opened?.object!==lid,`${id}: ${lid.name} covers eye in neutral`);
    closure.push({lid:lid.name,point:center.toArray(),open:opened?.object.name,closed:closed.object.name});
    applyExpression(face,{...neutral,blink:1});update(scene);
  }
  // Humanoids close their original textured skin directly; no separate lid mesh is needed.
  if(!eyelids.length&&['aurelien','julien','raphael','ben'].includes(id)){
    const eye={aurelien:{cx:.074,cy:1.248,rx:.042,bottom:.026},ben:{cx:.055,cy:1.311,rx:.034,bottom:.025},julien:{cx:.061,cy:1.328,rx:.042,bottom:.031},raphael:{cx:.080,cy:1.616,rx:.056,bottom:.043}}[id];
    for(const side of [-1,1]){
      let changed=0;const samples=[];
      for(const dx of [-.35,0,.35])for(const dy of [-.62,-.34]){
        const ray=new T.Raycaster(new T.Vector3(side*eye.cx+dx*eye.rx,eye.cy+dy*eye.bottom,3),new T.Vector3(0,0,-1));
        applyExpression(face,neutral);update(scene);const opened=ray.intersectObject(scene,true)[0];
        applyExpression(face,{...neutral,blink:1});update(scene);const closed=ray.intersectObject(scene,true)[0];
        const travel=opened&&closed?opened.uv.distanceTo(closed.uv):0;
        assert(opened&&closed&&opened.faceIndex!==closed.faceIndex&&travel>.001,`${id}: blink did not replace the visible eye surface`);
        changed++;samples.push({uvTravel:travel,depthChange:closed.point.z-opened.point.z});
      }
      closure.push({lid:'integrated_'+side,changedSurfaceRays:changed,samples});
    }
  }
  assert(closure.length>=2,`${id}: two physical closures required`);
  applyExpression(face,neutral);update(scene);
  const rest=bounds(scene),height=rest.getSize(new T.Vector3()).y;
  const expected={aurelien:1.55,julien:1.55,ben:1.55,raphael:1.95,mango:.72,steve:.38}[id];
  assert(Math.abs(height-expected)<.04,`${id}: wrong scale ${height}`);
  assert(Math.abs(rest.min.y)<.025,`${id}: incorrect origin/floor ${rest.min.y}`);
  const mixer=new T.AnimationMixer(scene),poses=[];
  for(const name of ['Idle','Walk']){
    const clip=asset.animations.find(c=>c.name===name);mixer.stopAllAction();mixer.clipAction(clip).reset().play();
    const ys=[];
    for(let f=0;f<8;f++){
      mixer.setTime(clip.duration*f/8);update(scene);const box=bounds(scene);
      assert(Number.isFinite(box.min.y)&&box.max.y<expected*1.35,`${id}: invalid ${name} deformation`);
      assert(box.min.y>-.04,`${id}: ${name} goes below floor (${box.min.y})`);
      ys.push(box.min.y);
    }
    poses.push({clip:name,floorMin:Math.min(...ys),floorMax:Math.max(...ys)});
  }
  mixer.stopAllAction();
  let count=0,closed=false,lastEnd=0,maxGap=0,tongueFrames=0;
  for(let t=0;t<120;t+=1/120){
    const p=characterExpression(id,t);applyExpression(face,p);
    if(p.blink>.96){if(!closed){count++;maxGap=Math.max(maxGap,t-lastEnd);}closed=true;}else if(closed){closed=false;lastEnd=t;}
    if(p.tongue>.8)tongueFrames++;
  }
  assert(count>=30&&maxGap<5.1,`${id}: insufficient natural blinking`);
  if(id==='ben')assert(tongueFrames>500,'Ben never sticks his tongue out');
  report.push({id,bytes:data.length,triangles,bones,skinnedVertices,weightError,textures:(json.images||[]).length,morphs:[...morphs],closure,poses,blinksIn120s:count,height,clips:asset.animations.map(c=>({name:c.name,duration:c.duration}))});
}
fs.mkdirSync('../imported-cast/qa',{recursive:true});
fs.writeFileSync('../imported-cast/qa/runtime-'+ids.join('-')+'.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
