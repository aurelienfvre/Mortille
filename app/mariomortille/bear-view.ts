import type * as Phaser from 'phaser';
import type { Player } from './simulation';
import { bearReturnTransition, bearVisualStage } from './character-charge';

// Only the bear family has approved artwork; gorilla/chimera are not available yet.
export const BEAR_FORM_SKINS = { bear: { texturePrefix: 'juju-bear', assetPath: '/mariomortille/party/juju/bear' } } as const;
export type BearFormSkin = keyof typeof BEAR_FORM_SKINS;
export const BEAR_ART_VERSION = 'juju-stages-13-p3-walk';
export const bearEquippedIdleDurations=[500,200,120,380] as const;
export const bearEquippedIdlePowers=['ember','turbo','cloud','cobalt'] as const;
export const bearClips = { idle: [200,160,140,220], claw: [150,180,80,110,130,230] } as const;
type BearAction = 'walk'|'idle'|'claw'|'jump'|'transform'|'revert';
interface BearAnimation { stage:number; power:string; action:BearAction; key:string; path:string; durations:readonly number[] }
const jumpDurations=[120,100,140,160,140,100,120,180] as const;
function animation(stage:number,power:string,action:BearAction,durations:readonly number[]):BearAnimation {
 const equipped=power!=='none';
 return {stage,power,action,durations,key:`stage${stage}${equipped?`-${power}`:''}-${action}`,path:`stage${stage}/${equipped?power+'/':''}${action}`};
}
// Register only reviewed, shipped clips. Both rendering and loading use this list.
export const bearAnimationRegistry:readonly BearAnimation[]=[
 ...[1,2,3].flatMap(stage=>[
  animation(stage,'none','idle',bearClips.idle),
  animation(stage,'none','claw',bearClips.claw),
  animation(stage,'none','jump',jumpDurations),
  ...bearEquippedIdlePowers.map(power=>animation(stage,power,'idle',bearEquippedIdleDurations)),
 ]),
 ...bearEquippedIdlePowers.map(power=>animation(1,power,'jump',jumpDurations)),
 ...bearEquippedIdlePowers.map(power=>animation(2,power,'jump',jumpDurations)),
 animation(1,'none','walk',Array(8).fill(150)),
 animation(3,'none','walk',[140,110,100,110,140,110,100,110]),
 animation(3,'none','transform',Array(8).fill(63)),
 animation(3,'none','revert',Array(8).fill(50)),
 ...bearEquippedIdlePowers.map(power=>animation(3,power,'jump',jumpDurations)),
];
function clipFor(stage:number,power:string,action:BearAction){
 return bearAnimationRegistry.find(clip=>clip.stage===stage&&clip.power===power&&clip.action===action)
  ??bearAnimationRegistry.find(clip=>clip.stage===stage&&clip.power==='none'&&clip.action===action)!;
}
function frameKey(skin:BearFormSkin,clip:BearAnimation,n:number){return `${BEAR_FORM_SKINS[skin].texturePrefix}-${clip.key}-${n}`;}
function timedFrame(durations: readonly number[], age: number, loop: boolean) {
 const total = durations.reduce((a,b)=>a+b,0);
 let remaining = loop ? Math.max(0,age)%total : Math.min(total-1,Math.max(0,age));
 for(let i=0;i<durations.length;i++){if(remaining<durations[i])return i+1;remaining-=durations[i];}
 return durations.length;
}
/** Uses authoritative stages; no invented walking frames or stretched body morphs. */
export function bearFrame(body: Player, tick: number, skin: BearFormSkin = 'bear', distance=0): string | null {
 if(body.characterId!=='juju'||body.health<=0)return null;
 const returning=bearReturnTransition(body);
 if(returning?.from===3)return `${BEAR_FORM_SKINS[skin].texturePrefix}-stage3-revert-${Math.min(8,1+Math.floor(returning.age*8/returning.duration))}`;
 if(!returning&&body.dashCharging&&(body.dashCharge??0)>=30&&(body.dashCharge??0)<60)return `${BEAR_FORM_SKINS[skin].texturePrefix}-stage3-transform-${Math.min(8,1+Math.floor(((body.dashCharge??30)-30)*8/30))}`;
 const stage=returning?(returning.age<returning.duration/2?returning.from:returning.to):bearVisualStage(body);
 if(!stage)return null;
 if(!returning&&(body.bearClawAge??-1)>=0&&(body.bearTicks??0)>0)
  return `${BEAR_FORM_SKINS[skin].texturePrefix}-stage${stage}-claw-${timedFrame(bearClips.claw,(body.bearClawAge??0)*1000/60,false)}`;
 if((stage===1||stage===2||stage===3)&&!returning&&!body.dashCharging&&(body.bearTicks??0)>0){
  const jumpClip=clipFor(stage,body.power,'jump');
  if(body.grounded===false){const n=body.vy < -260?2:body.vy < -65?3:body.vy <=65?4:5;return frameKey(skin,jumpClip,n);}
  if(body.landing>0)return frameKey(skin,jumpClip,body.landing>=3?6:7);
 }
 if((stage===1||(stage===3&&body.power==='none'))&&!returning&&!body.dashCharging&&body.grounded&&!body.crouching&&!body.boost&&Math.abs(body.vx)>8&&Math.abs(body.vx)<=145)
  return frameKey(skin,clipFor(stage,body.power,'walk'),1+Math.floor(Math.max(0,distance)%(stage===3?110:100.05)/(stage===3?110:100.05)*8));
 if((stage===1||stage===2||stage===3)&&bearEquippedIdlePowers.includes(body.power as typeof bearEquippedIdlePowers[number])&&body.grounded&&Math.abs(body.vx)<=8&&!body.boost&&!body.crouching)
  return frameKey(skin,clipFor(stage,body.power,'idle'),timedFrame(bearEquippedIdleDurations,tick*1000/60,true));
 return `${BEAR_FORM_SKINS[skin].texturePrefix}-stage${stage}-idle-${timedFrame(bearClips.idle,tick*1000/60,true)}`;
}
// Full extended paw needs extra right margin; compensate its stored image translation.
export function bearAnchorX(key:string){return key.endsWith('-stage3-claw-3')?42:(key.endsWith('-stage3-cloud-jump-5')||key.endsWith('-stage2-cloud-jump-4'))?51:48;}
export function bearAnchorY(key:string){return key.endsWith('-stage3-cloud-jump-3')?92:88;}
export function preloadBear(scene: Phaser.Scene, skin: BearFormSkin = 'bear') {
 const {texturePrefix,assetPath}=BEAR_FORM_SKINS[skin];
 for(const clip of bearAnimationRegistry)for(let n=1;n<=clip.durations.length;n++)
  scene.load.image(`${texturePrefix}-${clip.key}-${n}`,`${assetPath}/${clip.path}-${String(n).padStart(2,'0')}.png?v=${BEAR_ART_VERSION}`);
}
