import {Vector3} from 'three';
export const STEVE_TAKEOFF=1.65,STEVE_CONTACT=2.6;
/** Ground takeoff to the current palm anchor; zero positional discontinuity on contact. */
export function steveJump(from:Vector3,to:Vector3,time:number,out:Vector3){
 const t=Math.max(0,Math.min(1,(time-STEVE_TAKEOFF)/(STEVE_CONTACT-STEVE_TAKEOFF)));
 const q=t*t*t*(t*(t*6-15)+10);
 return out.lerpVectors(from,to,q).add(new Vector3(0,.22*Math.sin(Math.PI*q),0));
}
