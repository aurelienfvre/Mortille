import { defeatEnemy } from './enemy-behavior';
import { bossHeight, bossFloor } from './boss';
import { breakPowerBlock, chargedAttackBreaks } from './power-blocks';
import type { Controls, Player, State, Tile } from './simulation';
export const BEAR_TICKS=360;
export type BearStage=0|1|2|3;
export const BEAR_RETURN_STEP_TICKS=24;
/** One reversible visual transition at a time, without granting another attack. */
export function bearReturnTransition(p:Player) {
 if(p.characterId!=='juju'||(p.bearRevertAge??-1)<0||!(p.bearStage??0))return null;
 return {from:p.bearStage as BearStage,to:((p.bearStage??1)-1) as BearStage,age:p.bearRevertAge??0,duration:BEAR_RETURN_STEP_TICKS};
}
/** 1–8 ticks are a normal tap; only a full 60-tick charge reaches the final form. */
export function bearChargeStage(ticks:number):BearStage {
 if(!Number.isFinite(ticks)||ticks<9)return 0;
 return ticks<30?1:ticks<60?2:3;
}
/** Shared by the charge preview and the persistent post-release costume. */
export function bearVisualStage(p:Player):BearStage {
 if(p.characterId!=='juju')return 0;
 return bearReturnTransition(p)?(p.bearStage??0):p.dashCharging?bearChargeStage(p.dashCharge??0):(p.bearTicks??0)>0?(p.bearStage??0):0;
}
export type CharacterAttack={kind:'claw'|'palm';x:number;y:number;direction:number;reach:number;strength:number;tick:number;characterId:'juju'|'ben';force:number};
export type PalmWave=CharacterAttack&{travel:number;origin:number;hitIds:string[]};
export type Push={ticks:number;vx:number};
const overlap=(x:number,y:number,w:number,h:number,t:{x:number;y:number},size=16)=>x<t.x+size&&x+w>t.x&&y<t.y+size&&y+h>t.y;
function impact(s:State,x:number,y:number,strength:number){s.lastDashImpact={x,y,strength,tick:s.ticks};s.events.push('dash-impact');}
function hitBoss(s:State,a:CharacterAttack,left:number,right:number,push=false) {
 const b=s.boss;
 if(!b||b.phase!=='stunned'||b.x>=right||b.x+32<=left||b.y>=a.y+18||b.y+bossHeight(b)<=a.y-18)return;
 const impactY=b.y+20,amount=Math.min(b.health,2,a.force);
 b.health-=amount;b.hits+=amount;b.phase=b.health?'recover':'defeated';b.timer=55;
 if(push)b.push={ticks:10,vx:a.direction*(48+32*a.strength)};
 if(b.kind==='raphael')b.y=bossFloor(b)-80;
 if(!b.health)s.score+=b.kind==='pirate'||b.kind==='lola'?1250:2500;
 impact(s,b.x+16,impactY,a.strength);
}
/** The same forward geometry drives presentation and authoritative collision. */
export function characterAttack(s:State,kind:CharacterAttack['kind'],strength:number) {
 const p=s.player,direction=p.facing,x=p.x+(direction>0?20:0),y=p.y+20;
 const maximum=kind==='claw'?35+10*strength:140+180*strength;
 const distances=s.tiles.filter(t=>(kind!=='palm'||!chargedAttackBreaks(t.kind,strength))&&t.y<y+18&&t.y+16>y-18).map(t=>direction>0?t.x-x:x-t.x-16).filter(d=>d>=0);
 const reach=Math.max(0,Math.min(maximum,...distances));
 const a:CharacterAttack={kind,x,y,direction,reach,strength,tick:s.ticks,characterId:kind==='claw'?'juju':'ben',force:kind==='claw'?(p.bearStage||1):(strength>=.75?2:1)};
 s.lastCharacterAttack=a;s.events.push(kind==='claw'?'bear-claw':'palm-wave');
 if(kind==='palm'){(s.palmWaves??=[]).push({...a,travel:0,origin:x,hitIds:[]});return;}
 const left=direction>0?x:x-reach,right=direction>0?x+reach:x;
 const hit=(bx:number,by:number,w:number,h:number)=>reach>0&&bx<right&&bx+w>left&&by<y+18&&by+h>y-18;
 for(const e of s.enemies)if(!e.defeated&&hit(e.x,e.y,20,20)&&defeatEnemy(e)){s.score+=250;impact(s,e.x+10,e.y+10,strength);}
 s.enemyProjectiles=s.enemyProjectiles.filter(shot=>!hit(shot.x,shot.y,8,8));hitBoss(s,a,left,right);
}
function advancePush(body:{x:number;y:number;push?:Push},tiles:Tile[],width:number,height:number) {
 const push=body.push;if(!push)return;
 const dx=push.vx/60,next=body.x+dx;
 const blocked=next<0||tiles.some(t=>overlap(next,body.y,width,height,t));
 // Grounded bodies stop at unsupported edges; they never slide over a void.
 const grounded=tiles.some(t=>Math.abs(t.y-body.y-height)<=2&&body.x<t.x+16&&body.x+width>t.x);
 const supported=[next+1,next+width-1].every(x=>tiles.some(t=>Math.abs(t.y-body.y-height)<=2&&x>=t.x&&x<t.x+16));
 if(blocked||(grounded&&!supported)){body.push=undefined;return;}
 body.x=next;if(--push.ticks<=0)body.push=undefined;
}
export function stepPalmWaves(s:State) {
 for(const e of s.enemies){const before=e.x;advancePush(e,s.tiles,20,20);const dx=e.x-before;e.left+=dx;e.right+=dx;}
 for(const p of s.pickups)if(!p.collected&&!p.blocked)advancePush(p,s.tiles,16,16);
 if(s.boss)advancePush(s.boss,s.tiles,32,bossHeight(s.boss));
 for(const a of s.palmWaves??[]){
  const remaining=a.reach-a.travel;if(remaining<=0)continue;
  const advance=Math.min(12,remaining),next=a.x+a.direction*advance;
  let left=Math.min(a.x,next),right=Math.max(a.x,next);
  // Break content only through the shared helper (one emission, 12-tick delay).
  for(const t of [...s.tiles])if(t.x<right&&t.x+16>left&&t.y<a.y+18&&t.y+16>a.y-18){
   if(chargedAttackBreaks(t.kind,a.strength))breakPowerBlock(s,t);
   else {if(a.direction>0)right=Math.min(right,t.x);else left=Math.max(left,t.x+16);a.reach=a.travel+Math.max(0,right-left);}
  }
  const hit=(x:number,y:number,w:number,h:number)=>x<right&&x+w>left&&y<a.y+18&&y+h>a.y-18;
  for(const e of s.enemies)if(!e.defeated&&!a.hitIds.includes(e.id)&&hit(e.x,e.y,20,20)){
   a.hitIds.push(e.id);e.push={ticks:18,vx:a.direction*(140+100*a.strength)};
   if(defeatEnemy(e)){s.score+=250;impact(s,e.x+10,e.y+10,a.strength);}
  }
  for(const p of s.pickups)if(!p.collected&&!p.blocked&&s.ticks>=(p.availableAt??0)&&!a.hitIds.includes('pickup:'+p.id)&&hit(p.x,p.y,16,16)){
   a.hitIds.push('pickup:'+p.id);p.push={ticks:14,vx:a.direction*(70+70*a.strength)};
  }
  s.enemyProjectiles=s.enemyProjectiles.filter(shot=>!hit(shot.x,shot.y,8,8));
  const b=s.boss;if(b&&!a.hitIds.includes('boss')&&hit(b.x,b.y,32,bossHeight(b))){a.hitIds.push('boss');hitBoss(s,a,left,right,true);}
  a.travel+=Math.max(0,right-left);a.x=a.origin+a.direction*a.travel;
 }
 s.palmWaves=(s.palmWaves??[]).filter(a=>a.travel<a.reach);
}
/** Returns true when Juju consumes X, including the claw recovery period. */
export function stepCharacterAbility(s:State,input:Controls) {
 stepPalmWaves(s);
 const p=s.player;p.specialRecovery=Math.max(0,(p.specialRecovery??0)-1);p.clawCooldown=Math.max(0,(p.clawCooldown??0)-1);
 if((p.bearClawAge??-1)>=0){
  p.bearClawAge=(p.bearClawAge??0)+1;
  if(p.bearClawAge===20&&(p.bearTicks??0)>0)characterAttack(s,'claw',p.bearStrength??0);
  if(p.bearClawAge>=53)p.bearClawAge=-1;
 }
 if((p.bearRevertAge??-1)>=0){
  p.bearRevertAge=(p.bearRevertAge??0)+1;
  if(p.bearRevertAge>=BEAR_RETURN_STEP_TICKS){
   p.bearStage=Math.max(0,(p.bearStage??1)-1) as BearStage;
   p.bearRevertAge=p.bearStage?0:-1;
   if(p.bearStage)s.events.push('bear-revert');
   else {p.bearStrength=0;p.clawCooldown=0;p.specialRecovery=0;}
  }
 }else if(p.bearTicks){
  p.bearTicks--;
  if(!p.bearTicks){p.bearRevertAge=0;p.bearClawAge=-1;p.clawCooldown=0;s.events.push('bear-revert');}
 }
 if(bearReturnTransition(p)){
  // Hold the planted transition pose; damage still applies and may reset it on death.
  p.specialRecovery=BEAR_RETURN_STEP_TICKS-(p.bearRevertAge??0);p.vx=0;
  return !!input.powerPressed;
 }
 if(p.characterId==='juju'&&(p.bearTicks??0)>0&&input.powerPressed){
  if(!p.dashCharging&&!p.specialRecovery&&!p.clawCooldown){p.bearClawAge=0;p.clawCooldown=53;p.specialRecovery=53;p.vx=0;}
  return true;
 }
 return false;
}
export function releaseCharacterCharge(s:State,strength:number) {
 const p=s.player;if(!strength||!p.characterId||p.characterId==='aurel')return false;
 p.specialRecovery=p.characterId==='juju'?53:18;p.vx=0;p.boost=0;p.dashStrength=0;p.dashDuration=0;p.dashCooldown=70;
 if(p.characterId==='juju'){p.bearRevertAge=-1;p.bearStage=bearChargeStage(p.dashCharge??Math.round(8+52*strength));p.bearTicks=120*(p.bearStage||1);p.bearStrength=strength;p.clawCooldown=53;p.bearClawAge=0;s.events.push('bear-transform');}
 else characterAttack(s,'palm',strength);
 return true;
}
export function clearCharacterForm(p:Player){p.bearTicks=0;p.bearStage=0;p.bearRevertAge=-1;p.bearStrength=0;p.clawCooldown=0;p.specialRecovery=0;p.bearClawAge=-1;}
