'use client';
import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {constrainRoom,type RoomObstacle} from './room-collision';
import {Vector3} from 'three';
import {separatePair,SIDESTEP_DURATION,stepEase,type SocialBody} from './social-collision';
const cast=[['Lobby_Hero',.43],['Lobby_Raphael',.43],['Lobby_Cucu',.48],['Lobby_Ben',.43],['Lobby_Mango',.95]] as const;
export default function SocialPhysics({timeline}:{timeline:{current:number}}){
 const obstacles=useRef<RoomObstacle[]>([]);
 const memory=useRef(new Map<string,SocialBody['m']>());
 useFrame((state,delta)=>{
  if(timeline.current>=0)return;const dt=Math.min(delta,.05),now=state.clock.elapsedTime;
  obstacles.current=[];
  state.scene.traverse(o=>{if(o.userData.roomObstacle){const p=o.getWorldPosition(new Vector3()),f=o.getWorldDirection(new Vector3());obstacles.current.push({x:p.x,z:p.z,yaw:Math.atan2(f.x,f.z),halfX:o.userData.halfX,halfZ:o.userData.halfZ});}});
  const bodies=cast.flatMap(([name,radius])=>{
   const object=state.scene.getObjectByName(name);if(!object)return [];
   if(!memory.current.has(name))memory.current.set(name,{offset:new Vector3(),velocity:new Vector3(),cooldown:0});
   const m=memory.current.get(name)!;
   const route=object.position.clone();
   if(m.step){
    const step=m.step;step.progress=Math.min(1,(now-step.start)/SIDESTEP_DURATION);
    const position=step.from.clone().lerp(step.to,stepEase((step.progress-.12)/.76));
    m.offset.copy(position).sub(route);object.rotation.y=step.yaw;
    object.userData.sideStep=step;
    if(step.progress>=1)m.step=undefined;
   }else object.userData.sideStep=null;
   object.userData.routePosition=route;
   return [{object,radius,m,position:object.position.clone().add(m.offset)}];
  });
  for(let pass=0;pass<2;pass++)for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
   separatePair(bodies[i],bodies[j],now,pass);
  }
  for(let pass=0;pass<2;pass++)for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
   const a=bodies[i],b=bodies[j],delta=a.position.clone().sub(b.position);delta.y=0;const d=delta.length(),gap=a.radius+b.radius-d;
   if(gap>0&&d>1e-6){delta.multiplyScalar(gap/(2*d));a.position.add(delta);b.position.sub(delta);a.m.offset.add(delta);b.m.offset.sub(delta);}
  }
  for(const b of bodies){const before=b.position.clone();constrainRoom(b.position,b.radius,obstacles.current);b.m.offset.add(b.position.clone().sub(before));b.m.offset.y=0;b.object.position.copy(b.position);}
 },-1.5);
 useFrame((state)=>{
  if(timeline.current>=0)return;
  const object=state.scene.getObjectByName('Rig_Steve');if(!object)return;
  if(!memory.current.has('Rig_Steve'))memory.current.set('Rig_Steve',{offset:new Vector3(),velocity:new Vector3(),cooldown:0});
  const m=memory.current.get('Rig_Steve')!,now=state.clock.elapsedTime;
  if(object.userData.airborne){m.offset.set(0,0,0);m.step=undefined;object.userData.sideStep=null;return;}
  const route=object.position.clone();
  if(m.step){const step=m.step;step.progress=Math.min(1,(now-step.start)/SIDESTEP_DURATION);m.offset.copy(step.from).lerp(step.to,stepEase((step.progress-.12)/.76)).sub(route);object.rotation.y=step.yaw;object.userData.sideStep=step;if(step.progress>=1)m.step=undefined;}else object.userData.sideStep=null;
  object.position.add(m.offset);
  const before=object.position.clone();constrainRoom(object.position,.4,obstacles.current);m.offset.add(object.position.clone().sub(before));
  const dog={object,radius:.4,m,position:object.position.clone()};
  for(const [name,radius] of cast){
   if(name==='Lobby_Cucu')continue; // Steve intentionally approaches his handler for the jump.
   const peer=state.scene.getObjectByName(name),peerMemory=memory.current.get(name);
   if(peer&&peerMemory){
    separatePair(dog,{object:peer,radius,m:peerMemory,position:peer.position.clone()},now,0);
    const delta=object.position.clone().sub(peer.position);delta.y=0;const distance=delta.length(),gap=radius+.4-distance;
    if(gap>0&&distance>1e-6){delta.multiplyScalar(gap/distance);object.position.add(delta);m.offset.add(delta);}
   }
  }
  const final=object.position.clone();constrainRoom(object.position,.4,obstacles.current);m.offset.add(object.position.clone().sub(final));
 },-.2);

 return null;
}
