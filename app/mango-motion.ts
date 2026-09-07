export const MANGO_SCALE=2.4;
export const MANGO_MODEL_SPEED=.42;
export const MANGO_SPEED=.65;
export const MANGO_LANE_Z=-2.48;
const STOPS=[[-3.8,-2.48],[-.8,-3.6],[3.7,-2.6],[.4,-1.7],[-3.5,-3.5]];
export type ActorPoint={x:number;z:number};
export type MangoState={x:number;z:number;yaw:number;stop:number;mode:'idle'|'turn'|'walk';time:number;rate:number;turnFrom:number;turnTo:number;speed:number;detour:ActorPoint|null;detourTime:number};
export const makeMangoState=():MangoState=>({x:STOPS[0][0],z:STOPS[0][1],yaw:Math.PI/2,stop:0,mode:'idle',time:0,rate:1,turnFrom:0,turnTo:0,speed:0,detour:null,detourTime:0});
const angle=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
/** Patrol in two dimensions. A nearby pedestrian creates a detour, never an indefinite wait. */
export function updateMango(s:MangoState,delta:number,others:ActorPoint[],paused=false){
 const dt=Math.min(.05,Math.max(0,delta));s.speed=0;if(paused||!dt)return;
 if(s.mode==='idle'){s.time+=dt;if(s.time<1.8)return;s.mode='walk';s.time=0;}
 s.time+=dt;
 if(s.time>20){s.stop=(s.stop+1)%STOPS.length;s.time=0;s.detour=null;}
 const next=(s.stop+1)%STOPS.length,destination={x:STOPS[next][0],z:STOPS[next][1]};
 if(s.detour){s.detourTime+=dt;if(Math.hypot(s.x-s.detour.x,s.z-s.detour.z)<.3||s.detourTime>7)s.detour=null;}
 if(!s.detour){
  const dx=destination.x-s.x,dz=destination.z-s.z,d=Math.hypot(dx,dz),fx=dx/Math.max(d,.001),fz=dz/Math.max(d,.001);
  const obstacle=others.find(p=>{const x=p.x-s.x,z=p.z-s.z,along=x*fx+z*fz;return along>-.3&&along<1.9&&Math.abs(x*fz-z*fx)<1.25;});
  if(obstacle){
   const side=((obstacle.x-s.x)*fz-(obstacle.z-s.z)*fx)>=0?-1:1;
   s.detour={x:Math.max(-4.8,Math.min(4.8,obstacle.x+fz*side*1.6)),z:Math.max(-4.2,Math.min(-.9,obstacle.z-fx*side*1.6))};s.detourTime=0;
  }
 }
 const target=s.detour??destination,dx=target.x-s.x,dz=target.z-s.z,distance=Math.hypot(dx,dz);
 const heading=Math.atan2(dx,dz),error=angle(s.yaw,heading);
 s.yaw+=Math.max(-dt*1.7,Math.min(dt*1.7,error));
 const targetSpeed=MANGO_SPEED*Math.max(.18,Math.cos(error));s.rate+=(targetSpeed-s.rate)*(1-Math.exp(-dt*4));
 const step=Math.min(distance,Math.max(0,s.rate)*dt),oldX=s.x,oldZ=s.z;
 s.x+=Math.sin(s.yaw)*step;s.z+=Math.cos(s.yaw)*step;s.speed=Math.hypot(s.x-oldX,s.z-oldZ)/dt;
 if(!s.detour&&distance<.12){s.stop=next;s.mode='idle';s.time=0;s.rate=0;}
}
