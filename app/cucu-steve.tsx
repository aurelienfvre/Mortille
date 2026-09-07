'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
import * as T from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {steveJump} from './steve-jump';
import {createDogFeet,restoreDogFeet,applyDogFeet} from './dog-footwork';
import Character from './character';
import {catchSupport,carryOffset,encounterClipTime} from './catch-support';
import {addCharacterInk} from './ink-shading';
import {CAST_MODELS,castModelUrl,characterExpression,createExpressionRig,applyExpression} from './character-expression';
import {CATCH_START,CATCH_CONTACT,CATCH_RELEASE,DOG_SCALE,CUCU_SCALE,companionEase,companionStations,companionTravel,companionTravelPose,stationDogExit,dogExitPose,movingActorBlocked} from './cucu-steve-motion';
const memory={station:0,mode:'encounter' as 'encounter'|'travel',encounter:0,travel:0,actor:{x:5.2,z:.2,yaw:-.35},landing:new T.Vector3(5.2,0,.7),lastHeld:new T.Vector3(5.2,1.3,.7)};
const turn=(a:number,b:number,f:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*f;
export default function CucuSteve({timeline}:{timeline:{current:number}}){
 const {size}=useThree();
 const stations=useMemo(()=>companionStations(size.width/size.height),[size.width,size.height]);
 const asset=useGLTF(castModelUrl('steve'));
 const dog=useMemo(()=>addCharacterInk(clone(asset.scene)),[asset.scene]);
 const jumpRoot=useMemo(()=>({bone:dog.getObjectByName('root'),base:new T.Vector3(),saved:false}),[dog]);
 const feet=useMemo(()=>createDogFeet(dog),[dog]);
 const ground=useRef({ready:false,position:new T.Vector3(),jump:new T.Vector3(),jumping:false});
 const mixer=useMemo(()=>new T.AnimationMixer(dog),[dog]);
 const face=useMemo(()=>createExpressionRig(dog),[dog]),faceClock=useRef(0);
 const carry=useMemo(()=>dog.getObjectByName('carry_anchor'),[dog]),carryPoint=useMemo(()=>new T.Vector3(),[]);
 const dogRoot=useRef<T.Group>(null),cucu=useRef<T.Group>(null),shadow=useRef<T.Mesh>(null);
 const evacuation=useRef<null|{x:number;z:number;yaw:number;clearX:number}>(null);
 const [action,setAction]=useState('Idle'),currentAction=useRef('Idle');
 const catchTime=useRef(0),cadence=useRef(1),travelRate=useRef(1),turnStart=useRef(memory.actor.yaw);
 const activeDog=useRef<{name:string;action:T.AnimationAction}|null>(null);
 const vectors=useMemo(()=>({left:new T.Vector3(),right:new T.Vector3(),support:new T.Vector3(),target:new T.Vector3(),other:new T.Vector3()}),[]);
 const landing=useRef(memory.landing.clone()),lastHeld=useRef(memory.lastHeld.clone());
 const previousPhase=useRef(memory.encounter),dogRoute=useRef(stationDogExit(memory.landing,stations[memory.station].x));
 const walkingRoute=useRef(companionTravel(stations,memory.station)),dogDone=useRef(false);
 const dogYaw=useRef(memory.actor.yaw+Math.PI/2),others=useRef<{x:number;z:number}[]>([]);
 const tongue=useMemo(()=>dog.getObjectByName('tongue_tip')||dog.getObjectByName('tongue'),[dog]),tongueTip=useMemo(()=>new T.Vector3(),[]);
 const dogPose=useMemo(()=>({neck:dog.getObjectByName('neck'),base:new T.Quaternion(),saved:false,q:new T.Quaternion(),offset:new T.Vector3(),axis:new T.Vector3(1,0,0)}),[dog]);
 const dogYield=useRef(0);
 const stage=useRef({phase:memory.encounter,s:memory.encounter-CATCH_START,paused:false,dt:0,walking:false,dogPaused:false,speed:0});
 useLayoutEffect(()=>{
  const station=stations[memory.station];
  if(memory.mode==='encounter'){
   const dx=station.x-memory.actor.x,dz=station.z-memory.actor.z;
   for(const v of [landing.current,lastHeld.current,memory.landing,memory.lastHeld]){v.x+=dx;v.z+=dz;}
   memory.actor={...station};dogRoute.current=stationDogExit(landing.current,station.x);
  }
  if(memory.mode==='travel'){const adjusted=stations.map(p=>({...p}));adjusted[memory.station]={...memory.actor};walkingRoute.current=companionTravel(adjusted,memory.station);memory.travel=0;turnStart.current=memory.actor.yaw;}
  else walkingRoute.current=companionTravel(stations,memory.station);
 },[stations]);
 useEffect(()=>()=>{mixer.stopAllAction();mixer.uncacheRoot(dog);},[mixer,dog]);
 // This clock runs before Character samples its current skeleton.
 useFrame((state,delta)=>{
  const dt=Math.min(delta,.05),paused=timeline.current>=0;
  others.current.length=0;
  for(const name of ['Lobby_Hero','Lobby_Raphael','Lobby_Ben']){const object=state.scene.getObjectByName(name);if(object){object.getWorldPosition(vectors.other);others.current.push({x:vectors.other.x,z:vectors.other.z});}}
  let speed=0,dogPaused=paused,evacuating=false;
  if(paused && memory.mode==='travel' && !evacuation.current && Math.abs(memory.actor.x)<2.4){
   const sign=Math.sign(memory.actor.x)||Math.sign(stations[(memory.station+1)%stations.length].x);
   evacuation.current={...memory.actor,clearX:sign*3};
  }
  if(evacuation.current){
   const e=evacuation.current,targetX=paused?e.clearX:e.x,dx=targetX-memory.actor.x,dz=e.z-memory.actor.z,distance=Math.hypot(dx,dz);
   if(distance>.008){const step=Math.min(distance,3.5*dt);memory.actor.x+=dx/distance*step;memory.actor.z+=dz/distance*step;memory.actor.yaw=turn(memory.actor.yaw,Math.atan2(dx,dz),1-Math.exp(-dt*13));speed=step/dt;evacuating=true;}
   else if(!paused){memory.actor={x:e.x,z:e.z,yaw:e.yaw};evacuation.current=null;}
  }
  if(!paused && !evacuation.current && memory.mode==='encounter'){
   const phase=memory.encounter;
   if(!dogPaused)memory.encounter+=dt;
   memory.actor.yaw=turn(memory.actor.yaw,stations[memory.station].yaw,1-Math.exp(-dt*7));
   if(memory.encounter>21){memory.mode='travel';memory.travel=0;travelRate.current=1;turnStart.current=memory.actor.yaw;walkingRoute.current=companionTravel(stations,memory.station);}
  }
  if(!paused && !evacuation.current && memory.mode==='travel'){
   const route=walkingRoute.current;
   if(memory.travel<1.7){
    memory.travel+=dt;memory.actor.yaw=turn(turnStart.current,companionTravelPose(route,0).yaw,companionEase(Math.min(1,memory.travel/1.05)));
   }else{
    // Let the shared sidestep resolve encounters instead of waiting outside its trigger radius.
    travelRate.current=T.MathUtils.damp(travelRate.current,1,9,dt);
    memory.travel+=dt*travelRate.current;
    const p=companionTravelPose(route,memory.travel-1.7);
    memory.actor.x=p.x;memory.actor.z=p.z;memory.actor.yaw=turn(memory.actor.yaw,p.yaw,1-Math.exp(-dt*11));speed=p.speed*travelRate.current;
    if(p.done){memory.station=(memory.station+1)%stations.length;memory.mode='encounter';memory.encounter=0;dogDone.current=false;previousPhase.current=-1;speed=0;}
   }
  }
  const phase=memory.encounter,s=phase-CATCH_START,walking=memory.mode==='travel';
  const nextAction=evacuating?'Run':walking?(speed>.025?'Walk':'Idle'):(s>=0&&s<8?'Catch':phase>=13.3?'Dance':'Idle');
  if(nextAction!==currentAction.current){currentAction.current=nextAction;setAction(nextAction);}
  catchTime.current=Math.max(0,Math.min(8,s));cadence.current=evacuating?speed/(2.5*CUCU_SCALE):paused?0:nextAction==='Walk'?speed/(.4*CUCU_SCALE):1;
  if(cucu.current){cucu.current.position.set(memory.actor.x,0,memory.actor.z);cucu.current.rotation.y=memory.actor.yaw;}
  stage.current={phase,s,paused,dt,walking,dogPaused,speed};
 },-2);
 // Palms are read after the child Character mixer has sampled the Catch clip.
 useFrame((state)=>{
  const {phase,s,paused,dt,walking,dogPaused,speed}=stage.current,actor=memory.actor;
  const supportReady=catchSupport(cucu.current,dogRoot.current?.parent??null,vectors.support);
  vectors.target.copy(vectors.support);vectors.target.y-=.114936*DOG_SCALE;
  let dogAction='Idle',visible=true,walkRate=1;
  const o=dogRoot.current;if(!o)return;o.rotation.order='YXZ';
  const actual=cucu.current?.position??new T.Vector3(actor.x,0,actor.z);
  const facing=cucu.current?.rotation.y??actor.yaw;
  if(!ground.current.ready){ground.current.position.set(actual.x+Math.sin(facing)*1.3,0,actual.z+Math.cos(facing)*1.3);ground.current.ready=true;}
  const crouching=!walking&&s>=1.3&&s<1.65;
  const jumping=!walking&&s>=1.65&&s<CATCH_CONTACT;
  const held=!walking&&s>=CATCH_CONTACT&&s<CATCH_RELEASE;
  const lowering=!walking&&s>=CATCH_RELEASE&&phase<13.2;
  if(jumping){
   if(!ground.current.jumping)ground.current.jump.copy(o.position);
   dogAction='Held';ground.current.jump.y=0;const q=companionEase((s-1.65)/(CATCH_CONTACT-1.65));
   steveJump(ground.current.jump,vectors.target,s,o.position);
   o.rotation.set(-.18*Math.sin(Math.PI*q),facing+Math.PI/2,0);
  }else if(held){
   dogAction=s>=4.2&&s<6?'Kiss':'Held';
   const cuddle=companionEase((s-3.2))*(1-companionEase((s-6)/.7));
   o.rotation.set(-.20*cuddle,facing+Math.PI/2+.40*cuddle,0);
   o.position.copy(vectors.target);lastHeld.current.copy(o.position);
  }else if(lowering){
   if(previousPhase.current<CATCH_START+CATCH_RELEASE)landing.current.copy(lastHeld.current);
   o.position.copy(landing.current);o.position.y*=1-companionEase((s-CATCH_RELEASE)/.6);
   ground.current.position.copy(o.position);ground.current.position.y=0;
  }else{
   const follow=walking?-1:1;
   const target=new T.Vector3(actual.x+Math.sin(facing)*follow*.95,0,actual.z+Math.cos(facing)*follow*.95);
   const direction=target.clone().sub(ground.current.position),distance=direction.length();
   const step=Math.min(distance,dt*(walking?.52:.34));
   if(distance>.07&&!paused){ground.current.position.addScaledVector(direction,step/distance);dogYaw.current=turn(dogYaw.current,Math.atan2(direction.x,direction.z),1-Math.exp(-dt*3.5));dogAction='Walk';walkRate=(step/Math.max(dt,.001))/(.22*DOG_SCALE);}
   o.position.copy(ground.current.position);o.rotation.set(0,dogYaw.current,0);
  }
  if(crouching){
   dogAction='Idle';const crouch=companionEase((s-1.3)/.35);
   o.rotation.x=-.06*crouch;
  }
  ground.current.jumping=jumping;
  o.visible=true;o.userData.airborne=jumping||held||lowering;
  if(activeDog.current?.name!==dogAction){
   activeDog.current?.action.fadeOut(.2);const clip=asset.animations.find(c=>c.name===dogAction)||asset.animations.find(c=>c.name==='Idle');
   if(clip){const once=dogAction==='Fall'||dogAction==='Kiss',next=mixer.clipAction(clip);next.reset().setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);next.clampWhenFinished=true;next.fadeIn(.2).play();activeDog.current={name:dogAction,action:next};}
  }
  if(activeDog.current)activeDog.current.action.timeScale=dogAction==='Walk'?walkRate:dogAction==='Fall'?2/(CATCH_CONTACT-.3):dogAction==='Kiss'?2/1.8:1;
  if(dogPose.neck && dogPose.saved)dogPose.neck.quaternion.copy(dogPose.base);
  if(activeDog.current){const time=encounterClipTime(dogAction,s);activeDog.current.action.paused=time!==null;if(time!==null)activeDog.current.action.time=time;}
  restoreDogFeet(feet);if(jumpRoot.saved&&jumpRoot.bone)jumpRoot.bone.position.copy(jumpRoot.base);mixer.update(dogPaused?0:dt);
  o.userData.crouching=crouching;
  if(jumpRoot.bone){
   jumpRoot.base.copy(jumpRoot.bone.position);jumpRoot.saved=true;
   if(crouching){const position=jumpRoot.bone.getWorldPosition(new T.Vector3());position.y-=.035*companionEase((s-1.3)/.35);jumpRoot.bone.parent?.worldToLocal(position);jumpRoot.bone.position.copy(position);}
  }
  faceClock.current+=dt;applyExpression(face,characterExpression('steve',faceClock.current,dogAction));
  if(dogPose.neck){dogPose.base.copy(dogPose.neck.quaternion);dogPose.saved=true;const cuddle=!walking?companionEase((s-3.2)/1)*(1-companionEase((s-6)/.7)):0;dogPose.neck.quaternion.multiply(dogPose.q.setFromAxisAngle(dogPose.axis,-.21*cuddle));}
  if(carry&&(jumping||held)){
   carryOffset(o,carry,carryPoint);vectors.target.copy(vectors.support).sub(carryPoint);
   if(jumping){const q=companionEase((s-1.65)/(CATCH_CONTACT-1.65));steveJump(ground.current.jump,vectors.target,s,o.position);}
   else {o.position.copy(vectors.target);lastHeld.current.copy(o.position);memory.lastHeld.copy(o.position);}
  }

  if(tongue){tongue.updateWorldMatrix(true,false);tongueTip.set(0,0,0).applyMatrix4(tongue.matrixWorld);}
  if(shadow.current){shadow.current.visible=visible;shadow.current.position.set(o.position.x,.013,o.position.z);shadow.current.scale.set(1+.1*o.position.y,1+.1*o.position.y,1);(shadow.current.material as T.MeshBasicMaterial).opacity=.17/(1+.6*o.position.y);}
  previousPhase.current=phase;
  if(process.env.NODE_ENV==='development')state.gl.domElement.dataset.cucuSteve=JSON.stringify({phase,station:memory.station,mode:memory.mode,catchTime:s,action:dogAction,cucuAction:action,cucu:{...actor,speed,rootY:0},visible,paused,dogPaused,model:CAST_MODELS.steve,faceMeshes:face.targets.length,closedCount:face.closedCount,hands:supportReady,dog:{x:o.position.x,y:o.position.y,z:o.position.z},support:vectors.support.toArray(),scale:DOG_SCALE,tongueTip:tongueTip.toArray()});
 },-.3);
 useFrame(()=>{if(dogRoot.current&&!stage.current.paused)applyDogFeet(feet,dogRoot.current,stage.current.dt,!dogRoot.current.userData.airborne);},-.1);
 return <>
  <group ref={cucu} name="Lobby_Cucu" position={[memory.actor.x,0,memory.actor.z]} rotation={[0,memory.actor.yaw,0]}>
   <Character variant="cucu" hero scale={CUCU_SCALE} action={action} clipTimeRef={action==='Catch'?catchTime:undefined} cadence={cadence}/>
   <mesh position={[0,.012,0]} rotation={[-Math.PI/2,0,0]} scale={[.64,.39,1]}><circleGeometry args={[1,32]}/><meshBasicMaterial color="#171a16" transparent opacity={.19} depthWrite={false}/></mesh>
  </group>
  <group name="Rig_Steve" ref={dogRoot} scale={DOG_SCALE} visible={true}><primitive object={dog}/></group>
  <mesh ref={shadow} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.28,24]}/><meshBasicMaterial color="#171a16" transparent opacity={.15} depthWrite={false}/></mesh>
 </>;
}
