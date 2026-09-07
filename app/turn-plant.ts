import {Object3D,Quaternion,Vector3} from 'three';
import {plantSideStep} from './side-step-feet';
import {solveLimb} from './limb-ik';
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*t*(t*(t*6-15)+10);};
export function createTurnPlant(scene:Object3D){
 const legs=['L','R'].map(s=>({upper:scene.getObjectByName('thigh'+s)!,lower:scene.getObjectByName('shin'+s)!,foot:scene.getObjectByName('foot'+s)!,plant:new Vector3(),start:new Vector3(),target:new Vector3(),local:new Vector3(),rotation:new Quaternion(),fromRotation:new Quaternion(),toRotation:new Quaternion(),localRotation:new Quaternion()}));
 const root=scene.getObjectByName('root');const bones=legs.flatMap(l=>[l.upper,l.lower,l.foot]).filter(Boolean);
 return {legs,root,bases:bones.map(bone=>({bone,q:new Quaternion()})),rootBase:new Vector3(),applied:false,active:false,phase:0,leg:0,finish:0,lastYaw:NaN,lastPosition:new Vector3(),ready:false,still:0,age:0,stepId:-1,stepFeet:[] as Vector3[],stepFirst:0};
}
export function restoreTurnPlant(s:ReturnType<typeof createTurnPlant>){if(!s.applied)return;for(const b of s.bases)b.bone.quaternion.copy(b.q);if(s.root)s.root.position.copy(s.rootBase);s.applied=false;}
export function applyTurnPlant(s:ReturnType<typeof createTurnPlant>,actor:Object3D,dt:number,action:string){
 if(s.legs.some(l=>!l.upper||!l.lower||!l.foot)||!s.root)return;
 const q=actor.getWorldQuaternion(new Quaternion()),forward=actor.getWorldDirection(new Vector3()),yaw=Math.atan2(forward.x,forward.z),position=actor.getWorldPosition(new Vector3());
 const omega=Number.isFinite(s.lastYaw)?Math.atan2(Math.sin(yaw-s.lastYaw),Math.cos(yaw-s.lastYaw))/Math.max(dt,.001):0;s.lastYaw=yaw;
 const moving=s.ready?position.distanceTo(s.lastPosition)/Math.max(dt,.001):0;s.lastPosition.copy(position);
 if(actor.userData.sideStep&&s.ready){s.active=false;plantSideStep(s,actor.userData.sideStep,forward);return;}
 const bumped=(actor.userData.bumpUntil??0)>(actor.userData.sceneTime??Infinity);
 const turning=(Math.abs(omega)>.08&&moving<.12)&&action!=='Catch';
 if(!s.active&&turning&&s.ready){
  s.active=true;s.age=0;s.phase=0;s.leg=omega>0?0:1;s.finish=2;
  for(const l of s.legs){l.local.copy(actor.worldToLocal(l.foot.getWorldPosition(new Vector3())));l.localRotation.copy(q).invert().multiply(l.foot.getWorldQuaternion(new Quaternion()));l.start.copy(l.plant);l.fromRotation.copy(l.rotation);}
 }
 if(!s.active){for(const l of s.legs){l.foot.getWorldPosition(l.plant);l.foot.getWorldQuaternion(l.rotation);}s.ready=true;return;}
 if(action==='Catch'||moving>.16&&!bumped){s.active=false;return;}
 if(turning){s.still=0;s.finish=2;}else s.still+=dt;
 if(s.phase===0){const l=s.legs[s.leg];l.start.copy(l.plant);l.fromRotation.copy(l.rotation);l.target.copy(actor.localToWorld(l.local.clone()));l.target.y=l.plant.y;l.toRotation.copy(q).multiply(l.localRotation);}
 s.age+=dt;s.phase=Math.min(1,s.phase+dt/.22);const l=s.legs[s.leg],u=smooth(s.phase);
 l.plant.lerpVectors(l.start,l.target,u);l.plant.y+=Math.sin(Math.PI*u)*.055;l.rotation.slerpQuaternions(l.fromRotation,l.toRotation,u);
 for(const b of s.bases)b.q.copy(b.bone.quaternion);s.rootBase.copy(s.root.position);s.applied=true;
 const drop=s.root.getWorldPosition(new Vector3());drop.y-=.12*smooth(s.age/.16)*(s.finish===1&&!turning?1-smooth(s.phase):1);s.root.parent?.worldToLocal(drop);s.root.position.copy(drop);s.root.updateWorldMatrix(false,true);
 for(const leg of s.legs)solveLimb(leg.upper,leg.lower,leg.foot,leg.plant,forward,leg.rotation);
 if(s.phase>=1){l.plant.copy(l.target);s.phase=0;s.leg=1-s.leg;if(!turning&&s.still>.08&&--s.finish<=0)s.active=false;}
}
