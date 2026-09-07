import {Object3D,Vector3} from 'three';
const left=new Vector3(),right=new Vector3(),anchor=new Vector3();
/** Resolve the current rig, never bones retained from a previous mount or GLB. */
export function catchSupport(actor:Object3D|null,parent:Object3D|null,out:Vector3){
  if(!actor)return false;
  const a=actor.getObjectByName('palmL'),b=actor.getObjectByName('palmR');
  if(!a||!b)return false;
  a.getWorldPosition(left);b.getWorldPosition(right);out.copy(left).add(right).multiplyScalar(.5);
  if(parent)parent.worldToLocal(out);
  return true;
}
/** Anchor coordinates and the object's position must be expressed in the same space. */
export function carryOffset(object:Object3D,carry:Object3D,out:Vector3){
  object.updateWorldMatrix(true,true);carry.getWorldPosition(anchor);
  if(object.parent)object.parent.worldToLocal(anchor);
  return out.copy(anchor).sub(object.position);
}
export function encounterClipTime(action:string,seconds:number){
  if(action==='Fall')return Math.max(0,Math.min(2,(seconds-.3)*2/2.3));
  if(action==='Kiss')return Math.max(0,Math.min(2,(seconds-4.2)*2/1.8));
  if(action==='Held')return Math.max(0,seconds-(seconds>=6?6:2.6))%2;
  return null;
}
