import {Object3D,Vector3} from 'three';
export const SIDESTEP_DURATION=1.05;
export const stepEase=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*t*(t*(t*6-15)+10);};
export type SideStep={start:number;from:Vector3;to:Vector3;yaw:number;progress:number};
export type SocialBody={object:Object3D;radius:number;position:Vector3;m:{offset:Vector3;velocity:Vector3;cooldown:number;step?:SideStep;encounters?:Set<Object3D>}};
/** One discrete opposing step, with no spring, impulse or automatic slide back. */
export function separatePair(a:SocialBody,b:SocialBody,now:number,pass:number){
 const distance=a.position.distanceTo(b.position);
 a.m.encounters??=new Set();b.m.encounters??=new Set();
 if(distance>a.radius+b.radius+.65){a.m.encounters.delete(b.object);b.m.encounters.delete(a.object);}
 if(a.m.encounters.has(b.object)||b.m.encounters.has(a.object))return;
 if(pass!==0||a.m.step||b.m.step||now<a.m.cooldown||now<b.m.cooldown)return;
 const normal=a.position.clone().sub(b.position);normal.y=0;
 if(normal.length()>a.radius+b.radius+.12)return;
 if(normal.lengthSq()<1e-6)normal.set(1,0,0);else normal.normalize();
 a.m.encounters.add(b.object);b.m.encounters.add(a.object);
 const lateral=new Vector3(-normal.z,0,normal.x);
 for(const [body,sign]of [[a,1],[b,-1]]as const){
  if(body.object.userData.castAction==='Catch')continue;
  const step={start:now,from:body.position.clone(),to:body.position.clone().addScaledVector(lateral,sign*.42),yaw:body.object.rotation.y,progress:0};
  body.m.step=step;body.m.cooldown=now+2.5;body.m.velocity.set(0,0,0);
  body.object.userData.sideStep=step;body.object.userData.bumpUntil=now+SIDESTEP_DURATION;body.object.userData.bumpStart=now;
 }
}
