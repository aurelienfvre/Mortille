import {Object3D,Quaternion,Vector3} from 'three';
import {solveLimb} from './limb-ik';
const ease=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createDogFeet(scene:Object3D){
 const legs=['frontL','frontR','rearL','rearR'].map((name,i)=>{
  const type=i<2?'front':'rear',side=i%2?'R':'L';
  return {upper:scene.getObjectByName(type+side)!,lower:scene.getObjectByName(type+'Lower'+side)!,paw:scene.getObjectByName(type+'Paw'+side)!,home:new Vector3(),plant:new Vector3(),start:new Vector3(),target:new Vector3(),rotation:new Quaternion(),localRotation:new Quaternion(),fromRotation:new Quaternion(),toRotation:new Quaternion(),phase:1,group:i===0||i===3?0:1};
 });
 return {legs,bases:legs.flatMap(l=>[l.upper,l.lower,l.paw]).map(bone=>({bone,q:new Quaternion()})),ready:false,applied:false,group:0,previous:new Vector3(),yaw:0};
}
export function restoreDogFeet(s:ReturnType<typeof createDogFeet>){if(s.applied)for(const b of s.bases)b.bone.quaternion.copy(b.q);s.applied=false;}
export function applyDogFeet(s:ReturnType<typeof createDogFeet>,actor:Object3D,dt:number,grounded=true){
 if(s.legs.some(l=>!l.paw))return;
 actor.updateWorldMatrix(true,true);
 const position=actor.getWorldPosition(new Vector3()),forward=actor.getWorldDirection(new Vector3()),yaw=Math.atan2(forward.x,forward.z);
 const distance=position.distanceTo(s.previous),rotation=Math.abs(Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw)));s.previous.copy(position);s.yaw=yaw;
 if(!grounded||(!actor.userData.sideStep&&distance/Math.max(dt,.001)>.06)){s.ready=false;return;}
 if(!s.ready){for(const l of s.legs){l.paw.getWorldPosition(l.plant);l.home.copy(actor.worldToLocal(l.plant.clone()));l.paw.getWorldQuaternion(l.rotation);l.localRotation.copy(actor.getWorldQuaternion(new Quaternion())).invert().multiply(l.rotation);l.phase=1;}s.ready=true;return;}
 const moving=distance>.00015||rotation>.001||!!actor.userData.sideStep||!!actor.userData.crouching;
 if(!moving&&s.legs.every(l=>l.phase>=1))return;
 if(s.legs.every(l=>l.phase>=1)){
  s.group=1-s.group;
  for(const l of s.legs)if(l.group===s.group){l.start.copy(l.plant);l.target.copy(actor.localToWorld(l.home.clone()));l.target.y=l.plant.y;l.fromRotation.copy(l.rotation);l.toRotation.copy(actor.getWorldQuaternion(new Quaternion())).multiply(l.localRotation);l.phase=0;}
 }
 for(const b of s.bases)b.q.copy(b.bone.quaternion);s.applied=true;
 for(const l of s.legs){
  if(l.phase<1){l.phase=Math.min(1,l.phase+dt/.16);const u=ease(l.phase);l.plant.lerpVectors(l.start,l.target,u);l.plant.y+=.035*Math.sin(Math.PI*u);l.rotation.slerpQuaternions(l.fromRotation,l.toRotation,u);}
  // Preserve each supplied leg's anatomical bend side, including the rear hock.
  const pole=l.lower.getWorldPosition(new Vector3()).sub(l.upper.getWorldPosition(new Vector3()));
  solveLimb(l.upper,l.lower,l.paw,l.plant,pole,l.rotation);
 }
}
