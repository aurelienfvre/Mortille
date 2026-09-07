import type { AnimationClip, KeyframeTrack } from 'three';
export type DisplayCartridgePose={x:number;y:number;z:number;scale:number;pitch:number;yaw:number};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const cartridgeEase=(v:number)=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10);};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const bezier=(a:number,b:number,c:number,d:number,t:number)=>{const s=1-t;return s*s*s*a+3*s*s*t*b+3*s*t*t*c+t*t*t*d;};
// Every pose is absolute. Constant mixer channels must never receive += offsets.
// Quintic reparameterization gives the spatial Bézier zero velocity and
// acceleration where it joins the anticipation, alignment, and contact phases.
export function createCartridgeSampler(clip:AnimationClip){
 const track=clip.tracks.find(t=>t.name==='Console_Lift.position') as KeyframeTrack & {createInterpolant:()=>{evaluate:(t:number)=>ArrayLike<number>}};
 if(!track)throw new Error('Missing Blender console translation channel');
 const consolePosition=track.createInterpolant();
 return (time:number,display:DisplayCartridgePose):DisplayCartridgePose=>{
  if(time<=1.15)return {...display};
  if(time<1.4){const q=cartridgeEase((time-1.15)/.25);return {...display,y:display.y+.08*q,pitch:display.pitch-.045*q};}
  if(time<2.1){
   const q=cartridgeEase((time-1.4)/.7);
   return {x:bezier(display.x,display.x*.65,0,0,q),y:bezier(display.y+.08,display.y+.46,2.66,2.35,q),z:bezier(display.z,display.z-.12,-.48,-.48,q),scale:mix(display.scale,1,q),pitch:mix(display.pitch-.045,0,q),yaw:mix(display.yaw,0,q)};
  }
  const aligned={x:0,y:1.74,z:-.48,scale:1,pitch:0,yaw:0};
  if(time<2.65)return {...aligned,y:mix(2.35,1.74,cartridgeEase((time-2.1)/.55))};
  if(time<3.4)return aligned;
  const floor=consolePosition.evaluate(time)[1]+.02;
  if(time<3.53)return {...aligned,y:mix(1.74,floor,cartridgeEase((time-3.4)/.13))};
  const spring=.008*Math.pow(Math.sin(Math.PI*clamp((time-3.53)/.2)),4);
  return {...aligned,y:floor+spring};
 };
}
