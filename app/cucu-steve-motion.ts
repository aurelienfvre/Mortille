export const COMPANION_PERIOD=44;
export const CATCH_START=4;
export const CATCH_CONTACT=2.6;
export const CATCH_RELEASE=7.4;
export const DOG_SCALE=1.25;
export const CUCU_SCALE=1.55;
export const DOG_WALK_SPEED=.29;
export const companionEase=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*t*(t*(t*6-15)+10);};
export type GroundPoint={x:number;z:number};
const curve=(a:number,b:number,c:number,d:number,t:number)=>{const s=1-t;return s*s*s*a+3*s*s*t*b+3*s*t*t*c+t*t*t*d;};
export function createDogExit(origin:GroundPoint){
 const points:GroundPoint[]=[],distances=[0],elbow=Math.max(5.35,origin.x+.08);
 for(let i=0;i<=160;i++){
  const first=i<=80,t=first?i/80:(i-80)/80;
  // Round the rear corner of the counter before entering the side-cabinet gap.
  const p=first?{x:curve(origin.x,origin.x+(elbow-origin.x)*.6,elbow,elbow,t),z:curve(origin.z,origin.z,.15,.65,t)}:{x:curve(elbow,elbow,5.6,9.3,t),z:curve(.65,1.4,1.5,1.5,t)};
  if(i)distances.push(distances[i-1]+Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z));points.push(p);
 }
 return {points,distances,length:distances.at(-1)!};
}
export function dogExitPose(route:ReturnType<typeof createDogExit>,time:number){
 const ramp=.6,duration=route.length/DOG_WALK_SPEED+ramp,t=Math.max(0,Math.min(duration,time));
 const integral=(v:number)=>.5*(v-ramp/Math.PI*Math.sin(Math.PI*v/ramp));
 let distance:number,speed:number;
 if(t<ramp){distance=DOG_WALK_SPEED*integral(t);speed=DOG_WALK_SPEED*.5*(1-Math.cos(Math.PI*t/ramp));}
 else if(t>duration-ramp){distance=route.length-DOG_WALK_SPEED*integral(duration-t);speed=DOG_WALK_SPEED*.5*(1-Math.cos(Math.PI*(duration-t)/ramp));}
 else{distance=DOG_WALK_SPEED*(t-ramp*.5);speed=DOG_WALK_SPEED;}
 let i=1;while(i<route.distances.length-1 && route.distances[i]<distance)i++;
 const a=route.points[i-1],b=route.points[i],f=(distance-route.distances[i-1])/Math.max(.00001,route.distances[i]-route.distances[i-1]);
 return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,yaw:Math.atan2(b.x-a.x,b.z-a.z),speed,done:time>=duration};
}

export const CUCU_WALK_SPEED=.52;
export type CompanionStation=GroundPoint&{yaw:number};
export type GroundRoute=ReturnType<typeof createDogExit>;
export function companionStations(aspect:number):CompanionStation[]{
 const q=Math.max(0,Math.min(1,(aspect-1.14)/.637)),x=3.65+1.55*q,z=-.45+.65*q;
 return [{x,z,yaw:-.35},{x:-x,z,yaw:.35}];
}
export function companionTravel(stations:CompanionStation[],index:number):GroundRoute{
 const start=stations[index],end=stations[(index+1)%stations.length];
 const waypoints:GroundPoint[]=[start,{x:0,z:-.55},end];
 const points:GroundPoint[]=[{x:start.x,z:start.z}];
 const line=(a:GroundPoint,b:GroundPoint)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.025);for(let i=1;i<=n;i++)points.push({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n});};
 let previous:GroundPoint=start;
 for(let i=1;i<waypoints.length-1;i++){
  const a=waypoints[i-1],b=waypoints[i],c=waypoints[i+1],ab=Math.hypot(b.x-a.x,b.z-a.z),bc=Math.hypot(c.x-b.x,c.z-b.z),r=Math.min(.6,ab*.25,bc*.25);
  const entry={x:b.x+(a.x-b.x)*r/ab,z:b.z+(a.z-b.z)*r/ab},exit={x:b.x+(c.x-b.x)*r/bc,z:b.z+(c.z-b.z)*r/bc};
  line(previous,entry);for(let j=1;j<=32;j++){const t=j/32,u=1-t;points.push({x:u*u*entry.x+2*u*t*b.x+t*t*exit.x,z:u*u*entry.z+2*u*t*b.z+t*t*exit.z});}previous=exit;
 }
 line(previous,end);const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
 return {points,distances,length:distances.at(-1)!};
}
export function companionTravelPose(route:GroundRoute,time:number){
 // Reparameterize the same distance/ramp sampler for the actor's measured pace.
 const ratio=CUCU_WALK_SPEED/DOG_WALK_SPEED;
 const p=dogExitPose(route,time*ratio);return {...p,speed:p.speed*ratio};
}
export function stationDogExit(origin:GroundPoint,side:number):GroundRoute{
 const sign=side<0?-1:1,route=createDogExit({x:origin.x*sign,z:origin.z});
 if(sign<0)for(const p of route.points)p.x=-p.x;
 return route;
}
export function movingActorBlocked(now:GroundPoint,next:GroundPoint,others:GroundPoint[],clearance:number){
 return others.some(p=>Math.hypot(next.x-p.x,next.z-p.z)<clearance && Math.hypot(next.x-p.x,next.z-p.z)<=Math.hypot(now.x-p.x,now.z-p.z)+.015);
}
