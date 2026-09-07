import {Object3D,Quaternion,Vector3} from 'three';
/** Analytic two-bone solve with an explicit bend pole; never scale or reverse a limb. */
export function solveLimb(upper:Object3D,lower:Object3D,end:Object3D,target:Vector3,pole:Vector3,endRotation?:Quaternion){
 const h=upper.getWorldPosition(new Vector3()),k=lower.getWorldPosition(new Vector3()),a=end.getWorldPosition(new Vector3());
 const l1=h.distanceTo(k),l2=k.distanceTo(a),direction=target.clone().sub(h),raw=direction.length();
 if(raw<1e-6||l1<1e-6||l2<1e-6)return;
 direction.divideScalar(raw);const distance=Math.min(l1+l2-1e-5,Math.max(Math.abs(l1-l2)+1e-5,raw));
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const bend=pole.clone().addScaledVector(direction,-pole.dot(direction)).normalize();
 const knee=h.clone().addScaledVector(direction,along).addScaledVector(bend,height),ankle=h.clone().addScaledVector(direction,distance);
 const orient=(bone:Object3D,from:Vector3,to:Vector3)=>{
  const q=new Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(bone.getWorldQuaternion(new Quaternion()));
  if(bone.parent)q.premultiply(bone.parent.getWorldQuaternion(new Quaternion()).invert());
  bone.quaternion.copy(q);bone.updateWorldMatrix(false,true);
 };
 orient(upper,k.clone().sub(h),knee.clone().sub(h));
 const now=lower.getWorldPosition(new Vector3());orient(lower,end.getWorldPosition(new Vector3()).sub(now),ankle.clone().sub(now));
 if(endRotation){end.quaternion.copy(endRotation);if(end.parent)end.quaternion.premultiply(end.parent.getWorldQuaternion(new Quaternion()).invert());end.updateWorldMatrix(false,true);}
}
