import {Vector3} from 'three';
export type RoomObstacle={x:number;z:number;yaw:number;halfX:number;halfZ:number};
/** Floor-space collision for the walls, counter and rotated console cabinets. */
export function constrainRoom(point:Vector3,radius:number,obstacles:RoomObstacle[]){
 for(let pass=0;pass<12;pass++){
  point.x=Math.max(-7.75+radius,Math.min(7.75-radius,point.x));point.z=Math.max(-6+radius,Math.min(2.7-radius,point.z));
  for(const o of obstacles){
   const c=Math.cos(o.yaw),s=Math.sin(o.yaw),dx=point.x-o.x,dz=point.z-o.z;
   let x=c*dx-s*dz,z=s*dx+c*dz;
   const qx=Math.max(-o.halfX,Math.min(o.halfX,x)),qz=Math.max(-o.halfZ,Math.min(o.halfZ,z));
   const ex=x-qx,ez=z-qz,d=Math.hypot(ex,ez);
   if(d>=radius)continue;
   const candidates=[{x:o.halfX+radius,z},{x:-o.halfX-radius,z},{x,z:o.halfZ+radius},{x,z:-o.halfZ-radius}];
   if(d>1e-6)candidates.push({x:qx+ex/d*radius,z:qz+ez/d*radius});
   const valid=candidates.map(p=>({x:o.x+c*p.x+s*p.z,z:o.z-s*p.x+c*p.z})).filter(p=>p.x>=-7.75+radius&&p.x<=7.75-radius&&p.z>=-6+radius&&p.z<=2.7-radius);
   valid.sort((a,b)=>(a.x-point.x)**2+(a.z-point.z)**2-(b.x-point.x)**2-(b.z-point.z)**2);
   if(valid[0]){point.x=valid[0].x;point.z=valid[0].z;}
  }
 }
 return point;
}
