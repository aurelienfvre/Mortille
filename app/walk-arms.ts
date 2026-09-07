import {Object3D,Quaternion,Vector3} from 'three';
/** Keep each elbow in the forward anatomical half-plane, independently of bone roll. */
export function relaxWalkingElbow(upper:Object3D,fore:Object3D,hand:Object3D,actor:Object3D,phase:number){
 const shoulder=upper.getWorldPosition(new Vector3()),elbow=fore.getWorldPosition(new Vector3());
 const direction=elbow.clone().sub(shoulder).normalize();
 const forward=new Vector3(0,0,1).applyQuaternion(actor.getWorldQuaternion(new Quaternion()));
 const bend=forward.addScaledVector(direction,-forward.dot(direction)).normalize();
 const angle=.25+.065*Math.sin(phase-.45);
 const desired=direction.multiplyScalar(Math.cos(angle)).addScaledVector(bend,Math.sin(angle)).normalize();
 const current=hand.getWorldPosition(new Vector3()).sub(elbow).normalize();
 const rotation=new Quaternion().setFromUnitVectors(current,desired).multiply(fore.getWorldQuaternion(new Quaternion()));
 if(fore.parent)rotation.premultiply(fore.parent.getWorldQuaternion(new Quaternion()).invert());
 fore.quaternion.copy(rotation);fore.updateWorldMatrix(false,true);
}
