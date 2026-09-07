import {Mesh, Object3D} from 'three';

export type CastMember='aurelien'|'julien'|'raphael'|'ben'|'mango'|'steve';
export const CAST_MODELS:Record<CastMember,string>={
  aurelien:'aurelien-user-v3',julien:'julien-user-v3',
  raphael:'raphael-user-v3',ben:'ben-user-v3',
  mango:'mango-user-v1',steve:'steve-user-v1',
};
export const castModelUrl=(id:CastMember)=>`/models/${CAST_MODELS[id]}.glb?v=20260906-rig-refined`;
// Ground speed in model metres/second at the exported clip's native playback rate.
export const CAST_STRIDE:Record<CastMember,{walk:number;run:number}>={
  aurelien:{walk:.4,run:2.5},julien:{walk:.4,run:2.5},
  raphael:{walk:.4,run:2.5},ben:{walk:.4,run:2.5},
  mango:{walk:.42,run:.84},steve:{walk:.16,run:.32},
};
const members:CastMember[]=['aurelien','julien','raphael','ben','mango','steve'];
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
const pulse=(t:number,start:number,hold:number,attack=.25,release=.45)=>smooth((t-start)/attack)*(1-smooth((t-start-attack-hold)/release));
export type Expression={blink:number;smile:number;mouth:number;tongue:number;yaw:number;pitch:number};

/** Every actor has a separate blink schedule and attention rhythm; no shared idle loop. */
export function characterExpression(id:CastMember,time:number,action='Idle'):Expression{
  const i=members.indexOf(id),cycle=16.7+i*.71,t=((time+i*1.91)%cycle+cycle)%cycle;
  let blink=0;
  for(const at of [.07,.285,.50,.527,.76,.95].map(f=>f*cycle)){
    const s=t-at;
    if(s>=0 && s<.35)blink=Math.max(blink,s<.075?smooth(s/.075):s<.15?1:1-smooth((s-.15)/.2));
  }
  const period=5.2+i*.57,phase=(time+i*2.1)/period,n=Math.floor(phase),u=smooth((phase-n)*period/1.1);
  const target=(k:number,f:number)=>Math.sin(k*2.399+i*1.71+f);
  const attention=action==='Catch'?0:action==='HighFive'?.12:action==='Idle'?1:.35;
  const yaw=(target(n-1,0)*(1-u)+target(n,0)*u)*.095*attention;
  const pitch=(target(n-1,1.8)*(1-u)+target(n,1.8)*u)*.038*attention;
  let smile=.1+.38*pulse(t,3.1+i*.4,1.7,.8,1.1),mouth=0,tongue=0;
  if(id==='ben' && action==='Idle'){
    tongue=pulse((time+1.1)%13.9,2.1,.85,.28,.42);
    mouth=tongue*.35;smile=Math.max(smile,.34*tongue);
  }
  if(id==='mango'||id==='steve'){
    const pant=pulse(t,3+i*.2,4.5,.7,.8);
    mouth=pant*(.43+.055*Math.sin(time*5.2+i));tongue=pant*.65;
    if(action==='Kiss'){mouth=.75;tongue=1;smile=.45;}
    if(action==='Fall'){mouth=.25;tongue=0;}
  }
  if(action==='HighFive'||action==='Dance')smile=Math.max(smile,.48);
  return {blink,smile,mouth,tongue,yaw,pitch};
}

const keys=['Blink_Left','Blink_Right','Smile','MouthOpen','TongueOut'] as const;
export function createExpressionRig(root:Object3D){
  const targets:{mesh:Mesh;indices:(number|undefined)[]}[]=[];
  root.traverse(o=>{
    const mesh=o as Mesh;
    if(!mesh.isMesh||mesh.name==='Ink_Outline'||!mesh.morphTargetDictionary||!mesh.morphTargetInfluences)return;
    const indices=keys.map(k=>mesh.morphTargetDictionary![k]);
    if(indices.some(i=>i!==undefined))targets.push({mesh,indices});
  });
  return {targets,closed:false,closedCount:0,closedFrames:0};
}
export function applyExpression(rig:ReturnType<typeof createExpressionRig>,pose:Expression){
  const weights=[pose.blink,pose.blink,pose.smile,pose.mouth,pose.tongue];
  for(const {mesh,indices} of rig.targets)for(let k=0;k<indices.length;k++){
    const index=indices[k];if(index!==undefined)mesh.morphTargetInfluences![index]=clamp(weights[k]);
  }
  const closed=pose.blink>.96;
  if(closed){rig.closedFrames++;if(!rig.closed)rig.closedCount++;}
  rig.closed=closed;
}
