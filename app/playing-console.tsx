import {useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group,Object3D,Vector3,Quaternion} from 'three';
import {solveLimb} from './limb-ik';
export function createConsolePose(scene:Object3D){return ['L','R'].map(side=>({side,upper:scene.getObjectByName('upper_arm'+side)!,lower:scene.getObjectByName('forearm'+side)!,hand:scene.getObjectByName('hand'+side)!,saved:false,q:[new Quaternion(),new Quaternion(),new Quaternion()]}));}
export function restoreConsolePose(rig:ReturnType<typeof createConsolePose>){for(const l of rig)if(l.saved){[l.upper,l.lower,l.hand].forEach((b,i)=>b.quaternion.copy(l.q[i]));l.saved=false;}}
export function consolePose(rig:ReturnType<typeof createConsolePose>,actor:Object3D,t:number){
 const forward=actor.getWorldDirection(new Vector3());
 for(const l of rig){if(!l.hand)continue;[l.upper,l.lower,l.hand].forEach((b,i)=>l.q[i].copy(b.quaternion));l.saved=true;
  const target=actor.localToWorld(new Vector3(l.side==='L'?-.14:.14,1.38,.4));
  target.y+=.012*Math.sin(t*4);target.lerpVectors(l.hand.getWorldPosition(new Vector3()),target,Math.min(1,t/.6));
  solveLimb(l.upper,l.lower,l.hand,target,forward.clone().multiplyScalar(.2).add(new Vector3(0,-1,0)));
 }
}
export function Gamepad({actor,active}:{actor:Group|null;active:boolean}){
 return <group visible={active} position={[0,.86,.25]}>
  <mesh><boxGeometry args={[.22,.045,.1]}/><meshStandardMaterial color="#303b52" roughness={.7}/></mesh>
  {[-1,1].map(s=><group key={s} position={[s*.11,-.015,.015]}><mesh rotation={[0,0,-s*.3]}><capsuleGeometry args={[.035,.065,5,10]}/><meshStandardMaterial color="#303b52" roughness={.7}/></mesh><mesh position={[0,.045,0]}><sphereGeometry args={[.014,10,8]}/><meshStandardMaterial color={s<0?'#8acdde':'#eb99b5'}/></mesh></group>)}
 </group>;
}
