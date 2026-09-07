const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const t=clamp(x);return t*t*t*(t*(t*6-15)+10);};
export const SWAP_DURATION=1.05;
export const slotOf=(id:number,index:number,count=9)=>((id-index+count+Math.floor(count/2))%count)-Math.floor(count/2);
export const swapDuration=(from:number,to:number,count=9)=>SWAP_DURATION+.18*Math.max(0,Math.abs(slotOf(to,from,count))-1);
export const swipeDirection=(delta:number,threshold=95)=>Math.abs(delta)<threshold?0:delta<0?1:-1;
// Five symmetric display positions on one continuous rail. Recycling happens beyond either
// end of the visible station, never by changing the label of a displayed object.
export const slotPose=(slot:number,spacing:number,count=9)=>{
 const half=count/2,s=((slot+half)%count+count)%count-half;
 const knots=[
  {x:-9,y:1.95,z:.55,scale:.52,yaw:.20},
  {x:-3.95,y:1.95,z:.55,scale:.58,yaw:.20},
  {x:-2.2,y:1.95,z:1.05,scale:.75,yaw:.12},
  {x:0,y:2.0,z:1.27,scale:1.45,yaw:-.13},
  {x:2.2,y:1.95,z:1.05,scale:.75,yaw:-.12},
  {x:3.95,y:1.95,z:.55,scale:.58,yaw:-.20},
  {x:9,y:1.95,z:.55,scale:.52,yaw:-.20},
  {x:13,y:1.95,z:.55,scale:.52,yaw:-.20},
 ];
 if(s < -3) return {...knots[0],x:(-9+(s+3)*4.5)*spacing/2.3};
 const u=Math.min(7,s+3),i=Math.min(6,Math.floor(u)),f=u-i,a=knots[i],b=knots[i+1],q=f*f*(3-2*f);
 return {x:(a.x+(b.x-a.x)*f)*spacing/2.3,y:a.y+(b.y-a.y)*q,z:a.z+(b.z-a.z)*q,scale:a.scale+(b.scale-a.scale)*q,yaw:a.yaw+(b.yaw-a.yaw)*q};
};
export function carouselPose(oldSlot:number,newSlot:number,t:number,spacing:number,start?:ReturnType<typeof slotPose>,count=9){
 const q=ease(t/swapDuration(oldSlot,newSlot,count)),delta=slotOf(newSlot,oldSlot,count),origin=slotPose(oldSlot,spacing,count),p=slotPose(oldSlot+delta*q,spacing,count);
 if(start){p.x+=(start.x-origin.x)*(1-q);p.y+=(start.y-origin.y)*(1-q);p.z+=(start.z-origin.z)*(1-q);p.scale+=(start.scale-origin.scale)*(1-q);}
 return p;
}
