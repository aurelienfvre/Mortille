import {Object3D,Vector3,Quaternion,Matrix4} from 'three';
import {solveLimb} from './limb-ik';
export function createHighFive(scene:Object3D){const upper=scene.getObjectByName('upper_armR'),lower=scene.getObjectByName('forearmR'),hand=scene.getObjectByName('handR');return {upper,lower,hand,palm:scene.getObjectByName('palmR'),saved:false,bases:[upper,lower,hand].filter(Boolean).map(b=>({bone:b!,q:new Quaternion()}))};}
export function restoreHighFive(s:ReturnType<typeof createHighFive>){if(s.saved)for(const b of s.bases)b.bone.quaternion.copy(b.q);s.saved=false;}
export function applyHighFive(s:ReturnType<typeof createHighFive>,actor:Object3D,partner:Object3D,time:number){
 if(!s.upper||!s.lower||!s.hand||time<0)return;
 const a=actor.getWorldPosition(new Vector3()),b=partner.getWorldPosition(new Vector3());
 const target=a.clone().add(b).multiplyScalar(.5);target.y=1.68;target.z+=.31;
 const normal=b.clone().sub(a);normal.y=0;normal.normalize();const up=new Vector3(0,1,0),right=up.clone().cross(normal).normalize();
 const rotation=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right,up,normal));
 const scale=s.hand.getWorldScale(new Vector3());
 const offset=s.palm?s.hand.worldToLocal(s.palm.getWorldPosition(new Vector3())):new Vector3(0,.04,0);
 const amount=Math.sin(Math.PI*Math.min(1,time/2.4))**2;
 const current=s.hand.getWorldPosition(new Vector3()),end=target.sub(offset.multiply(scale).applyQuaternion(rotation));
 end.lerpVectors(current,end,amount);rotation.slerpQuaternions(s.hand.getWorldQuaternion(new Quaternion()),rotation.clone(),amount);
 for(const x of s.bases)x.q.copy(x.bone.quaternion);s.saved=true;
 solveLimb(s.upper,s.lower,s.hand,end,new Vector3(0,-1,0).addScaledVector(normal,.15),rotation);
}
