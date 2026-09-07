import assert from 'node:assert/strict';import {Vector3} from 'three';
import {constrainRoom} from '../app/room-collision.ts';import {friendPose} from '../app/lobby-behavior.ts';
const obstacles=[{x:-4.8,z:-5.5,yaw:.16,halfX:1.12,halfZ:.85},{x:4.8,z:-5.5,yaw:-.16,halfX:1.12,halfZ:.85},{x:7,z:-3,yaw:-Math.PI/2,halfX:1.12,halfZ:.85},{x:-7,z:-3,yaw:Math.PI/2,halfX:1.12,halfZ:.85}];
let checks=0;
for(const r of [.4,.48,.95])for(let x=-9;x<9;x+=.37)for(let z=-7;z<4;z+=.37){const p=constrainRoom(new Vector3(x,0,z),r,obstacles);assert(p.x>=-7.75+r-1e-6&&p.x<=7.75-r+1e-6&&p.z>=-6+r-1e-6&&p.z<=2.7-r+1e-6);for(const o of obstacles){const c=Math.cos(o.yaw),s=Math.sin(o.yaw),lx=c*(p.x-o.x)-s*(p.z-o.z),lz=s*(p.x-o.x)+c*(p.z-o.z);assert(Math.hypot(lx-Math.max(-o.halfX,Math.min(o.halfX,lx)),lz-Math.max(-o.halfZ,Math.min(o.halfZ,lz)))>=r-1e-5);}checks++;}
for(const id of ['hero','yeti']){let plays=0;for(let t=0;t<120;t+=.1)if(friendPose(id,t).action==='Play')plays++;assert(plays>40);}
console.log({roomChecks:checks,consoleVisits:true});
