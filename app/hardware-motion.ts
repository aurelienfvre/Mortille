import {cartridgeEase as ease,type DisplayCartridgePose} from './cartridge-sequence';
export type V3=[number,number,number];
export type HardwareSpec={caseSize?:V3;caseDisc?:V3;asset:string;display:'crt'|'modern'|'handheld';media:{asset:string;type:'cartridge'|'disc';size:V3;label:{position:V3;size:[number,number]}};insertion:{mode:'cart'|'top'|'slot'|'tray'|'front';approach:V3;contact:V3;seated:V3;rotation:V3};moving:{lid?:{node:string;openAngle:number};tray?:{node:string;openDistance:number};power?:{node:string;axis:'x'|'y'|'z';travel:number}};screen?:{node:string;position:V3;size:[number,number]}};
export const HARDWARE_DURATION=7.6;
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export const mix3=(a:V3,b:V3,q:number):V3=>a.map((v,i)=>mix(v,b[i],q)) as V3;
const phase=(t:number,a:number,b:number)=>ease((t-a)/(b-a));
const plus=(a:V3,b:V3):V3=>a.map((v,i)=>v+b[i]) as V3;
const bezier=(a:V3,b:V3,c:V3,d:V3,t:number):V3=>a.map((v,i)=>{const s=1-t;return s*s*s*v+3*s*s*t*b[i]+3*s*t*t*c[i]+t*t*t*d[i];}) as V3;
export const mediaDisplayScale=(s:HardwareSpec)=>1.2/Math.max(s.caseSize?.[0]??s.media.size[0],s.caseSize?.[1]??s.media.size[1]);
// The carousel's legacy origin is at the cartridge's foot. New media assets use a center pivot.
export function displayMediaPose(p:DisplayCartridgePose,s:HardwareSpec){
 const a=p.pitch,b=p.yaw,h=.6*p.scale,depth=(s.caseDisc?.[2]??0)*p.scale*mediaDisplayScale(s);
 return {position:[p.x+Math.sin(b)*depth,p.y+Math.cos(a)*h-Math.sin(a)*Math.cos(b)*depth,p.z+Math.sin(a)*h+Math.cos(a)*Math.cos(b)*depth] as V3,rotation:[a,b,0] as V3,scale:p.scale*mediaDisplayScale(s)};
}
export function hardwarePose(s:HardwareSpec,time:number,display:DisplayCartridgePose){
 const t=Math.max(0,Math.min(HARDWARE_DURATION,time)),handheld=s.display==='handheld';
 const disc=s.media.type==='disc',top=s.insertion.mode==='top';
 const insertEnd=s.insertion.mode==='tray'?4.10:s.insertion.mode==='slot'?4.15:3.53;
 const powerAt=top?4.40:disc?4.18:3.78;
 const rise=phase(t,.25,1.15),lower=phase(t,top?4.52:disc?4.32:3.95,top?5.23:disc?5.16:4.95),power=phase(t,5.25,5.79);
 const scale=handheld?mix(1,1.5,lower):1;
 const final:V3=handheld?[0,3.15-(s.screen?.position[1]??1)*1.5,-1.8-(s.screen?.position[2]??.14)*1.5]:[0,.08,-.7];
 const consolePosition=mix3([0,mix(-1.8,.85,rise),-.7],final,lower);
 const localWorld=(p:V3):V3=>plus(consolePosition,p.map(v=>v*scale) as V3);
 const start=displayMediaPose(display,s),approach=localWorld(s.insertion.approach),contact=localWorld(s.insertion.contact),seated=localWorld(s.insertion.seated);
 let position=start.position,rotation=start.rotation,mediaScale=start.scale;
 const extraction:V3=s.caseSize?[Math.sin(display.yaw)*.40,-Math.sin(display.pitch)*.40,Math.cos(display.yaw)*Math.cos(display.pitch)*.40]:[0,0,0];
 if(s.caseSize&&t<1.4)position=plus(start.position,extraction.map(v=>v*phase(t,.8,1.4)) as V3);
 if(t>1.15 && t<1.4)position=plus(position,[0,.09*phase(t,1.15,1.4),0]);
 else if(t>=1.4 && t<2.1){const q=phase(t,1.4,2.1);position=bezier(plus(plus(start.position,extraction),[0,.09,0]),plus(plus(start.position,extraction),[0,.6,-.12]),plus(approach,[0,.4,.18]),approach,q);rotation=mix3(start.rotation,s.insertion.rotation,q);mediaScale=mix(start.scale,1,q);}
 else if(t>=2.1){
  rotation=s.insertion.rotation;mediaScale=scale;
  if(t<2.65)position=mix3(approach,contact,phase(t,2.1,2.65));
  else if(t<3.4)position=contact;
  else if(s.insertion.mode==='front'){const pushed=plus(seated,[0,.11,0]);position=t<3.62?mix3(contact,pushed,phase(t,3.4,3.62)):mix3(pushed,seated,phase(t,3.62,3.78));}
  else position=mix3(contact,seated,phase(t,3.4,insertEnd));
 }
 const opening=phase(t,.75,1.4),close=phase(t,s.insertion.mode==='front'?3.8:top?3.98:3.4,s.insertion.mode==='front'?4.05:top?4.38:insertEnd);
 // Rotate around the disc's own normal, keeping the media centered in the spindle/tray.
 // Visible pickup is deliberately slow; acceleration happens as the drive closes.
 const spinStart=top?3.53:3.44,elapsed=Math.max(0,t-spinStart);
 const spin=disc?(elapsed<.65?6*elapsed*elapsed:6*.65*.65+7.8*(elapsed-.65)):0;
 rotation=[rotation[0],rotation[1],rotation[2]+spin];
 const mechanism=opening*(1-close);
 const displayPosition:V3=handheld?localWorld(s.screen!.position):[0,mix(7,3.15,phase(t,3.95,5.1)),-2.4];
 return {consolePosition,consoleScale:scale,mediaPosition:position,mediaRotation:rotation,mediaScale,mechanism,power,displayPosition,hatch:phase(t,0,.5)*(1-phase(t,5.0,5.5)),powerPress:Math.sin(Math.PI*phase(t,powerAt,powerAt+.18)),discSpin:spin,phase:t<1.15?'lift':t<2.1?'approach':t<2.65?'contact':t<3.4?'hold':t<powerAt?'insert':t<5.25?'display':'dive'};
}
export function hardwareCamera(s:HardwareSpec,t:number,portrait=false){
 const home:V3=[0,portrait?4.4:4.15,portrait?12.6:9.05],target:V3=[0,1.65,.25];
 const glass:V3=s.display==='handheld'?[0,3.15,-1.8]:[0,3.15,-2.4];
 const focus=phase(t,0,1.5),hop=phase(t,4.75,5.95),dive=phase(t,5.95,7.6),pan=phase(t,3.7,5.8);
 let position=mix3(home,[0,3.6,5.0],focus);
 position=mix3(position,[0,glass[1],glass[2]+3.3],hop);
 position=mix3(position,[0,glass[1],glass[2]+.075],dive);
 // A small shoulder over the console settles before the straight screen dive.
 position[1]+=.20*Math.sin(Math.PI*hop);
 const look=mix3(mix3(target,[0,1.5,-.7],focus),glass,pan);
 return {position,look,fov:mix(portrait?53:46,64,phase(t,6.8,7.6))};
}
