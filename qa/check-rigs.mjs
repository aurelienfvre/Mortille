import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import fs from 'node:fs';import assert from 'node:assert/strict';import * as T from 'three';import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const results=[];
for(const name of ['aurelien-mortizle-v1','julien-mortizle-v1','gorille-mortizle-v1']){
 const b=fs.readFileSync(`public/models/${name}.glb`),g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({name:'CPU_QA_TEXTURES',loadTexture:()=>Promise.resolve(new T.Texture())})).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');const mixer=new T.AnimationMixer(g.scene);
 if(name==='aurelien-mortizle-v1' || name==='julien-mortizle-v1'){
  let checkedPaint=0;
  g.scene.traverse(o=>{
   if(!o.isMesh || !/carnation peinte|fibres radiales/.test(o.material.name))return;
   const colors=o.geometry.attributes.color;assert(colors,'Painted surface lost COLOR_0');
   const ids=[...new Set(o.geometry.index.array)];let sum=0,min=Infinity,max=-Infinity;
   for(const i of ids){const red=colors.getX(i);sum+=red;min=Math.min(min,red);max=Math.max(max,red);}
   const mean=sum/ids.length;
   assert(max-min>(/carnation/.test(o.material.name)?.002:.01),'Sculpted pigmentation was flattened to a uniform color');
   assert(/carnation/.test(o.material.name)?mean>.5 && mean<.95:mean>.05 && mean<.3,'Paint is missing or assigned to the wrong surface');
   checkedPaint++;
  });assert.equal(checkedPaint,3,'Expected face and two painted irises');
 }
 const pos=n=>g.scene.getObjectByName(n).getWorldPosition(new T.Vector3());
 let samples=0,minKnee=Infinity,maxElbow=-Infinity,maxWalkingFlex=0,maxWalkingSpread=0;
 const swings={L:[],R:[]},breathScales=[];
 for(const clipName of ['Idle','Walk','Run','Dance','HighFive']){
  mixer.stopAllAction();const clip=g.animations.find(a=>a.name===clipName),action=mixer.clipAction(clip);action.play();action.paused=true;
  for(let t=.02;t<clip.duration-.02;t+=.02){
   action.time=t;mixer.update(0);g.scene.updateMatrixWorld(true);
   if(clipName==='Idle')breathScales.push(g.scene.getObjectByName('torso').scale.y);
   for(const side of ['L','R']){
    const hip=pos('leg'+side),knee=pos('shin'+side),ankle=pos('foot'+side);const d=ankle.clone().sub(hip).normalize();const offset=knee.clone().sub(hip);const bend=offset.sub(d.multiplyScalar(offset.dot(d))).z;
    assert(bend>=-.0001,`${name} ${clipName} inverted knee ${side} @${t}`);minKnee=Math.min(minKnee,bend);
    const shoulder=pos('arm'+side),elbow=pos('forearm'+side),wrist=pos('hand'+side),a=wrist.clone().sub(shoulder).normalize(),e=elbow.clone().sub(shoulder);const bendE=e.sub(a.multiplyScalar(e.dot(a))).z;
    if(clipName==='Walk' || clipName==='Idle'){
      const upper=elbow.clone().sub(shoulder),lower=wrist.clone().sub(elbow);
      const flex=T.MathUtils.radToDeg(upper.angleTo(lower));
      const spread=T.MathUtils.radToDeg(Math.atan2(Math.abs(upper.x),-upper.y));
      assert(flex<15,`${name} relaxed elbow too bent: ${flex}`);
      assert(spread<10,`${name} arm too far from torso: ${spread}`);
      if(clipName==='Walk')swings[side].push(Math.atan2(upper.z,-upper.y));
      maxWalkingFlex=Math.max(maxWalkingFlex,flex);maxWalkingSpread=Math.max(maxWalkingSpread,spread);
    }
    assert(bendE<=.0001,`${name} ${clipName} inverted elbow ${side} @${t}`);maxElbow=Math.max(maxElbow,bendE);
   }
   samples++;
  }
 }
 const breathRange=Math.max(...breathScales)-Math.min(...breathScales);
 assert(breathRange>.01 && breathRange<.03,`${name} missing or excessive breathing: ${breathRange}`);
 const walkingSwing=Object.fromEntries(Object.entries(swings).map(([side,angles])=>[side,T.MathUtils.radToDeg(Math.max(...angles)-Math.min(...angles))]));
 for(const [side,range] of Object.entries(walkingSwing))assert(range>28 && range<55,`${name} insufficient or excessive arm swing ${side}: ${range}`);
 results.push({model:name,poseSamples:samples,walkingSwing,breathRange,maxWalkingFlex,maxWalkingSpread,minForwardKneeBend:+minKnee.toFixed(4),maxElbowBend:+maxElbow.toFixed(4)});
}
console.log(JSON.stringify(results,null,2));
