import extrasData from './party-extras.json' with {type:'json'};
export const companionExtras:Record<string,{frames:string[];durations:number[];anchor:number[];source:string}>=extrasData;
export const companionTexture=(frame:string)=>frame.startsWith('party-extra-')?'party-extras':'party-atlas';
import actionsData from './party-actions.json' with {type:'json'};
export const companionActions:Record<string,{frames:string[];durations:number[];anchor:number[];source:string;releaseFrame?:number}>=actionsData;
import equipmentData from './party-equipment.json' with {type:'json'};
export const companionEquipment:Record<string,{frames:string[];durations:number[];anchor:number[];source:string}>=equipmentData;
import type {Player,Controls} from './simulation';
import type {HeroMotion} from './hero-animation';
export const partyClips={idle:8,walk:8,run:8,jump:8,fall:2,crouch:4,dash:8,hurt:1,victory:8} as const;
export function companionPose(id:'juju'|'ben',p:Player,m:HeroMotion,won=false){
 const power=p.power==='none'?'':p.power+'-';
 const key=(action:string)=>`${id}-${power}${action}`;
 const pick=(action:string,age:number,start=0)=>companionActionFrame(key(action),age,start);
 let authored:string|null=null;
 if(p.invulnerable>70) authored=companionActionProgress(key('hurt'),(90-p.invulnerable)/20);
 else if(companionRiseActive(m,p)) authored=companionStandUpFrame(id,p.power,companionRises.get(m)!.age);
 else if(p.pound>0&&p.power!=='cobalt') authored=companionExtras[key('ground-pound')]?.frames[p.pound>9?2:p.pound>1?3:5]??null;
 else if(m.poundLanding&&m.landingMs>=0&&p.grounded&&Math.abs(p.vx)<=8&&p.power!=='cobalt') authored=companionExtras[key('ground-pound')]?.frames[m.landingMs<100?6:7]??null;
 else if(p.crouching&&Math.abs(p.vx)>1) authored=companionActionLoop(key('crouch-walk'),m.crouchDistance/28*800);
 else if(p.boost&&p.power==='turbo') authored=companionActionProgress(key('super-dash'),Math.max(0,1-p.boost/(p.dashDuration||22)));
 else if(p.boost) authored=companionActionProgress(key('dash'),Math.max(0,1-p.boost/(p.dashDuration||12)));
 else if(p.power==='ember'&&m.castTicks) authored=pick('cast',(22-m.castTicks)*1000/60,(companionActions[key('cast')]?.releaseFrame??5)-1);
 else if(p.power==='cloud'&&m.gliding) authored=companionActionLoop(key('fly'),Math.max(0,m.glideTicks-1)*1000/60);
 else if(p.power==='cobalt'&&p.pound>1) authored=companionActionProgress(key('pound'),p.pound>9?.25:.375);
 else if(p.power==='cobalt'&&p.pound===1) authored=companionActions[key('pound')]?.frames[4]??null;
 else if(m.landingMs>=0&&p.grounded&&Math.abs(p.vx)<=8) authored=p.power==='cobalt'&&m.poundLanding?pick('pound',m.landingMs,5):pick('land',m.landingMs);
 else if(companionTurnActive(id,p,m)) authored=companionActionProgress(key('turn'),(24-(companionTurns.get(m)?.ticks??0))/24);
 else if(m.skidding) authored=pick('brake',Math.max(0,180-Math.abs(p.vx)));
 if(authored&&!won)return authored;
 let action:keyof typeof partyClips='idle',n=1;
 if(won){action='victory';n=Math.floor(m.idleMs/160)%8+1;}
 else if(p.invulnerable && p.invulnerable > 70){action='hurt';n=1;}
 else if(p.crouching||p.dashCharging){action='crouch';n=3;}
 else if(p.boost){action='dash';n=Math.min(8,1+Math.floor(Math.max(0,1-p.boost/(p.dashDuration||22))*8));}
 else if(!p.grounded){action=p.vy>60?'fall':'jump';n=p.vy>60?1:p.vy < -200?3:4;}
 else if(Math.abs(p.vx)>8){action=Math.abs(p.vx)>145?'run':'walk';n=Math.floor(m.distance/(action==='run'?108:100.05)*8)%8+1;}
 else n=Math.floor(m.idleMs/170)%8+1;
 return `party-${id}-${p.power === 'none' ? '' : p.power+'-'}${action}-${String(n).padStart(2,'0')}`;
}

/** Only reviewed clips are registered; absent clips retain that companion's own outfit. */
export function companionEquipFrame(id:'juju'|'ben',power:Exclude<Player['power'],'none'>,ageMs:number):string|null {
 const clip=companionEquipment[`${id}-${power}`];
 if(!clip)return null;
 let elapsed=Math.max(0,Number.isFinite(ageMs)?ageMs:0);
 for(let i=0;i<clip.frames.length-1;i++){
  if(elapsed<clip.durations[i])return clip.frames[i];
  elapsed-=clip.durations[i];
 }
 return clip.frames[clip.frames.length-1];
}
export function companionEquipDuration(id:'juju'|'ben',power:Exclude<Player['power'],'none'>):number|null {
 return companionEquipment[`${id}-${power}`]?.durations.reduce((a,b)=>a+b,0)??null;
}

export function companionActionFrame(key:string,age:number,start=0):string|null {
 const clip=companionActions[key];if(!clip)return null;
 let elapsed=Math.max(0,Number.isFinite(age)?age:0);
 for(let i=Math.min(start,clip.frames.length-1);i<clip.frames.length-1;i++){
  if(elapsed<clip.durations[i])return clip.frames[i];elapsed-=clip.durations[i];
 }
 return clip.frames.at(-1)!;
}
export function companionActionDuration(key:string){return companionActions[key]?.durations.reduce((a,b)=>a+b,0)??0;}
export function companionActionLoop(key:string,age:number){const duration=companionActionDuration(key);return duration?companionActionFrame(key,Math.max(0,age)%duration):null;}
export function companionActionProgress(key:string,progress:number){const duration=companionActionDuration(key);return duration?companionActionFrame(key,Math.max(0,Math.min(1,progress))*duration):null;}

type TurnState={facing:number;from:number;ticks:number};
const companionTurns=new WeakMap<HeroMotion,TurnState>();
export const companionStandUpTicks=[4,5,6,7] as const;
export const companionStandUpDurationTicks=22;
type RiseState={wasCrouching:boolean;age:number;power:Player['power']};
const companionRises=new WeakMap<HeroMotion,RiseState>();
export function companionStandUpFrame(id:'juju'|'ben',power:Player['power'],ageTicks:number){
 if(ageTicks<0||ageTicks>=companionStandUpDurationTicks)return null;
 const clip=companionExtras[`${id}-${power==='none'?'':power+'-'}stand-up`];
 let age=ageTicks;
 for(let i=0;i<4;i++){if(age<companionStandUpTicks[i])return clip?.frames[i]??null;age-=companionStandUpTicks[i];}
 return null;
}
function companionRiseActive(m:HeroMotion,p:Player){return (companionRises.get(m)?.age??-1)>=0&&p.grounded&&!p.crouching&&!p.boost&&!p.dashCharging&&Math.abs(p.vx)<=8&&p.invulnerable<=70&&!m.castTicks;}
export function advanceCompanionVisual(m:HeroMotion,p:Player,input?:Controls){
 const rise=companionRises.get(m)??{wasCrouching:p.crouching??false,age:-1,power:p.power};
 if(rise.wasCrouching&&!p.crouching)rise.age=0;
 else if(rise.age>=0)rise.age++;
 if(rise.age>=companionStandUpDurationTicks||!p.grounded||p.crouching||p.boost||p.dashCharging||p.invulnerable>70||Math.abs(p.vx)>8||m.castTicks||p.pound||rise.power!==p.power||input?.direction||input?.jumpPressed||input?.powerPressed)rise.age=-1;
 rise.wasCrouching=!!p.crouching;rise.power=p.power;companionRises.set(m,rise);
 const state=companionTurns.get(m)??{facing:p.facing,from:p.facing,ticks:0};
 state.ticks=Math.max(0,state.ticks-1);
 if(state.facing!==p.facing && p.grounded && Math.abs(p.vx)<80){state.from=state.facing;state.ticks=24;}
 state.facing=p.facing;companionTurns.set(m,state);
}
function companionTurnActive(id:string,p:Player,m:HeroMotion){return !!companionTurns.get(m)?.ticks&&p.grounded&&!p.crouching&&!p.boost&&p.invulnerable<=70&&Math.abs(p.vx)<80&&!!companionActions[`${id}-${p.power==='none'?'':p.power+'-'}turn`];}
/** Authored turn already changes profile. Mirror the complete clip only for left-to-right. */
export function companionFlipX(id:'juju'|'ben',p:Player,m:HeroMotion){return companionTurnActive(id,p,m)?companionTurns.get(m)!.from<0:p.facing<0;}
