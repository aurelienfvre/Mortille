import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {CAST_MODELS,characterExpression,createExpressionRig,applyExpression} from '../app/character-expression.ts';

const report=[];
for(const [id,model] of Object.entries(CAST_MODELS)){
  const data=fs.readFileSync(`public/models/${model}.glb`);
  const asset=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const rig=createExpressionRig(asset.scene),names=new Set(),materials=new Set();
  let triangles=0,weightedVertices=0,bones=0,weightError=0;
  asset.scene.traverse(o=>{
    if(o.isBone)bones++;
    if(!o.isMesh)return;
    triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
    for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m.name);
    for(const key of Object.keys(o.morphTargetDictionary??{}))names.add(key);
    assert((o.morphTargetInfluences??[]).every(x=>x===0),`${id}: morphs not neutral at export`);
    const weights=o.geometry.attributes.skinWeight,indices=o.geometry.attributes.skinIndex;
    if(weights){
      weightedVertices+=weights.count;
      for(let i=0;i<weights.count;i++){
        const sum=weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i);
        weightError=Math.max(weightError,Math.abs(sum-1));
        for(let j=0;j<4;j++)assert(Number.isFinite(indices.array[i*4+j])&&indices.array[i*4+j]<o.skeleton.bones.length,`${id}: invalid bone index`);
      }
    }
  });
  for(const n of ['Blink_Left','Blink_Right','Smile','MouthOpen','TongueOut'])assert(names.has(n),`${id}: missing ${n}`);
  assert(weightError<.002,`${id}: skin weights error ${weightError}`);
  assert(triangles<220000,`${id}: geometry budget exceeded`);
  for(const n of ['Idle','Walk'])assert(asset.animations.some(c=>c.name===n),`${id}: missing ${n}`);
  if(id==='julien')assert(asset.animations.some(c=>c.name==='Catch'));
  if(id==='steve')for(const n of ['Fall','Held','Kiss'])assert(asset.animations.some(c=>c.name===n));
  let closed=0,count=0,longest=0,maxGap=0,lastEnd=0,tongueFrames=0;
  for(let t=0;t<120;t+=1/120){
    const pose=characterExpression(id,t);applyExpression(rig,pose);
    for(const n of ['blink','smile','mouth','tongue'])assert(Number.isFinite(pose[n])&&pose[n]>=0&&pose[n]<=1,`${id}: invalid ${n}`);
    if(pose.blink>.96){if(!closed){count++;maxGap=Math.max(maxGap,t-lastEnd);}closed+=1/120;longest=Math.max(longest,closed);}
    else if(closed){closed=0;lastEnd=t;}
    if(pose.tongue>.8)tongueFrames++;
  }
  assert(count>=30&&maxGap<5.1&&longest>=.075,`${id}: incomplete or infrequent blinks`);
  if(id==='ben')assert(tongueFrames>500,'Ben never clearly sticks his tongue out');
  applyExpression(rig,{blink:0,smile:0,mouth:0,tongue:0,yaw:0,pitch:0});
  asset.scene.updateMatrixWorld(true);
  const eyes=[];
  asset.scene.traverse(o=>{
    if(!o.isMesh)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    if(/^Iris_/i.test(o.name)||mats.some(m=>/iris noisette/i.test(m.name)))eyes.push(o);
  });
  let closureRays=0;
  for(const eye of eyes){
    applyExpression(rig,{blink:0,smile:0,mouth:0,tongue:0,yaw:0,pitch:0});
    const eyeBounds=new T.Box3().setFromObject(eye),center=eyeBounds.getCenter(new T.Vector3());
    const ray=new T.Raycaster(new T.Vector3(center.x,center.y,3),new T.Vector3(0,0,-1));
    const opened=ray.intersectObject(asset.scene,true)[0];
    assert(opened,`${id}: eye is missing`);
    applyExpression(rig,{blink:1,smile:0,mouth:0,tongue:0,yaw:0,pitch:0});
    const closed=ray.intersectObject(asset.scene,true)[0];
    assert(closed&&!/iris|pupill|pupil|catchlight|reflection|oeil|œil/i.test(closed.object.name),`${id}: closed blink leaves iris visible (${closed?.object.name})`);
    closureRays++;
  }
  assert(closureRays>=2,`${id}: no physical eye closure checked`);
  applyExpression(rig,{blink:0,smile:0,mouth:0,tongue:0,yaw:0,pitch:0});
  const bounds=new T.Box3().setFromObject(asset.scene),size=bounds.getSize(new T.Vector3());
  assert(bounds.min.y>-.04&&bounds.min.y<.1,`${id}: feet not on floor (${bounds.min.y})`);
  assert(size.z>.15,`${id}: model has no head/body depth`);
  report.push({id,model,bytes:data.length,triangles,bones,weightedVertices,weightError,materials:materials.size,morphMeshes:rig.targets.length,closureRays,clips:asset.animations.map(c=>({name:c.name,duration:c.duration})),size:size.toArray(),ground:bounds.min.y,blinks120s:count,maxGap,longest,tongueFrames});
}
let concurrent=0,different=0;
for(let t=0;t<120;t+=.01){const values=Object.keys(CAST_MODELS).map(id=>characterExpression(id,t).blink);if(Math.max(...values)>.1){concurrent++;if(Math.max(...values)-Math.min(...values)>.1)different++;}}
assert(different/concurrent>.95,'Cast blinks in sync');
fs.writeFileSync('../../work/reference-cast-validation.json',JSON.stringify({models:report,blinkIndependence:different/concurrent},null,2));
console.log(JSON.stringify({models:report,blinkIndependence:different/concurrent},null,2));
