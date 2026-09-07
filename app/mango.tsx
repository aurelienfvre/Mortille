'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {addCharacterInk} from './ink-shading';
import {CAST_MODELS,castModelUrl,characterExpression,createExpressionRig,applyExpression} from './character-expression';
import {createDogFeet,restoreDogFeet,applyDogFeet} from './dog-footwork';
import {makeMangoState,updateMango,MANGO_SCALE,MANGO_MODEL_SPEED} from './mango-motion';
const memory=makeMangoState();
export default function Mango({timeline}:{timeline:{current:number}}){
 const source=useGLTF(castModelUrl('mango'));
 const model=useMemo(()=>addCharacterInk(clone(source.scene)),[source.scene]);
 const feet=useMemo(()=>createDogFeet(model),[model]);
 const mixer=useMemo(()=>new T.AnimationMixer(model),[model]);
 const face=useMemo(()=>createExpressionRig(model),[model]),faceClock=useRef(0);
 const root=useRef<T.Group>(null),active=useRef<T.AnimationAction|null>(null),currentClip=useRef('');
 const statePoint=useMemo(()=>new T.Vector3(),[]),others=useRef<{x:number;z:number}[]>([]);
 useEffect(()=>()=>{mixer.stopAllAction();mixer.uncacheRoot(model);},[mixer,model]);
 useFrame((state,delta)=>{
  const dt=Math.min(.05,delta),paused=timeline.current>=0;others.current.length=0;
  for(const name of ['Lobby_Hero','Lobby_Raphael','Lobby_Cucu','Lobby_Ben']){const object=state.scene.getObjectByName(name);if(object){object.getWorldPosition(statePoint);others.current.push({x:statePoint.x,z:statePoint.z});}}
  updateMango(memory,dt,others.current,paused);
  if(root.current){root.current.position.set(memory.x,0,memory.z);root.current.rotation.y=memory.yaw;}
 },-2);
 const previous=useRef(new T.Vector3(memory.x,0,memory.z));
 useFrame((state,delta)=>{
  const dt=Math.min(.05,delta),paused=timeline.current>=0;
  const bumped=!!root.current&&(root.current.userData.bumpUntil??0)>state.clock.elapsedTime;
  const travelled=root.current?root.current.position.distanceTo(previous.current)/Math.max(dt,.001):0;
  if(root.current){previous.current.copy(root.current.position);root.current.userData.castAction=bumped||travelled>.02?'Walk':'Idle';root.current.rotation.z=bumped?.055*Math.sin(Math.PI*Math.min(1,(state.clock.elapsedTime-root.current.userData.bumpStart)/.8)):0;}
  const speed=Math.max(memory.speed,Math.min(1.5,travelled));
  const name=speed>.015||bumped?'Walk':'Idle';
  if(name!==currentClip.current){active.current?.fadeOut(.24);const clip=source.animations.find(c=>c.name===name);if(clip){active.current=mixer.clipAction(clip);active.current.reset().setLoop(T.LoopRepeat,Infinity).fadeIn(.24).play();currentClip.current=name;}}
  if(active.current)active.current.timeScale=paused?0:name==='Walk'?Math.max(bumped?.35:0,speed/(MANGO_MODEL_SPEED*MANGO_SCALE)):1;
  restoreDogFeet(feet);mixer.update(paused?0:dt);
  if(root.current&&!paused)applyDogFeet(feet,root.current,dt);
  faceClock.current+=dt;applyExpression(face,characterExpression('mango',faceClock.current,name));
  if(process.env.NODE_ENV==='development')state.gl.domElement.dataset.mango=JSON.stringify({...memory,model:CAST_MODELS.mango,faceMeshes:face.targets.length,closedCount:face.closedCount,clip:name,paused,scale:MANGO_SCALE,rootY:0});
 },-1);
 return <group name="Lobby_Mango" ref={root} position={[memory.x,0,memory.z]} rotation={[0,memory.yaw,0]}>
  <group scale={MANGO_SCALE}><primitive object={model}/></group>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,-.02]} scale={[.26,.72,1]}><circleGeometry args={[1,32]}/><meshBasicMaterial color="#171812" transparent opacity={.18} depthWrite={false}/></mesh>
 </group>;
}
