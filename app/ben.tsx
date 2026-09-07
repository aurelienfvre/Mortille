'use client';
import {useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group,MathUtils} from 'three';
import Character from './reference-character';

const SCALE=1.6,PACE=.4*SCALE*.86;
const visits=[{x:-2.8,z:-.45,wait:9.5},{x:-2.8,z:-3.95,wait:4.3},{x:2.9,z:-3.95,wait:7.7},{x:2.9,z:-.45,wait:5.2}];
const memory={x:visits[0].x,z:visits[0].z,yaw:0,stop:0,wait:0,speed:0};
const angle=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

/** Ben explores independently and yields to the other actors before crossing their aisle. */
export default function Ben({timeline}:{timeline:{current:number}}){
  const root=useRef<Group>(null),cadence=useRef(1);
  const [action,setAction]=useState('Idle'),clip=useRef('Idle');
  useFrame((state,delta)=>{
    const dt=Math.min(delta,.05),paused=timeline.current>=0;
    let nextAction='Idle';
    if(!paused){
      const station=visits[memory.stop],next=visits[(memory.stop+1)%visits.length];
      if(memory.wait<station.wait){
        memory.wait+=dt;memory.speed=MathUtils.damp(memory.speed,0,8,dt);
        memory.yaw+=angle(memory.yaw,0)*(1-Math.exp(-dt*3));
        if(memory.wait>1.2&&memory.wait<station.wait-.35)nextAction='Dance';
        else if(memory.stop===2&&memory.wait<3.2)nextAction='Wave';
      }else{
        const dx=next.x-memory.x,dz=next.z-memory.z,distance=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
        memory.yaw+=angle(memory.yaw,yaw)*(1-Math.exp(-dt*3.5));
        // SocialPhysics owns encounters; a second proximity stop would prevent its step from starting.
        const goal=Math.abs(angle(memory.yaw,yaw))>.32?0:PACE*Math.min(1,distance/.45);
        memory.speed=MathUtils.damp(memory.speed,goal,6,dt);
        if(distance>.008){const step=Math.min(distance,memory.speed*dt);memory.x+=dx/distance*step;memory.z+=dz/distance*step;}
        else{memory.x=next.x;memory.z=next.z;memory.stop=(memory.stop+1)%visits.length;memory.wait=0;memory.speed=0;}
        if(memory.speed>.015)nextAction='Walk';
      }
    }else memory.speed=0;
    cadence.current=nextAction==='Walk'?memory.speed/(.4*SCALE):1;
    if(root.current){root.current.position.set(memory.x,0,memory.z);root.current.rotation.y=memory.yaw;}
    if(nextAction!==clip.current){clip.current=nextAction;setAction(nextAction);}
    if(process.env.NODE_ENV==='development')state.gl.domElement.dataset.ben=JSON.stringify({...memory,clip:nextAction,paused,scale:SCALE,rootY:0});
  },-2);
  return <group ref={root} name="Lobby_Ben" position={[memory.x,0,memory.z]} rotation={[0,memory.yaw,0]}>
    <Character variant="ben" action={action} cadence={cadence} scale={SCALE}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]} scale={[.38,.3,1]}><circleGeometry args={[1,32]}/><meshBasicMaterial color="#101520" transparent opacity={.18} depthWrite={false}/></mesh>
  </group>;
}
