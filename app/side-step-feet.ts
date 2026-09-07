import {Vector3} from 'three';
import {solveLimb} from './limb-ik';
import {stepEase,type SideStep} from './social-collision';
import type {createTurnPlant} from './turn-plant';
export function plantSideStep(s:ReturnType<typeof createTurnPlant>,step:SideStep,forward:Vector3){
 const delta=step.to.clone().sub(step.from),p=step.progress;
 if(s.stepId!==step.start){
  s.stepId=step.start;s.stepFeet=s.legs.map(l=>l.plant.clone());
  s.stepFirst=s.stepFeet[0].clone().sub(s.stepFeet[1]).dot(delta)>0?0:1;
 }
 for(const b of s.bases)b.q.copy(b.bone.quaternion);s.rootBase.copy(s.root!.position);s.applied=true;
 const root=s.root!,drop=root.getWorldPosition(new Vector3());drop.y-=.13*Math.sin(Math.PI*p);root.parent?.worldToLocal(drop);root.position.copy(drop);root.updateWorldMatrix(false,true);
 for(let i=0;i<2;i++){
  const l=s.legs[i],u=stepEase(i===s.stepFirst?p/.48:(p-.52)/.48);
  l.plant.copy(s.stepFeet[i]).addScaledVector(delta,u);l.plant.y+=.075*Math.sin(Math.PI*u);
  solveLimb(l.upper,l.lower,l.foot,l.plant,forward,l.rotation);
 }
}
