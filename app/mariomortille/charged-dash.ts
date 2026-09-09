import { releaseCharacterCharge } from './character-charge';
import type { Controls, Player, State } from './simulation';
export const DASH_CHARGE_TICKS = 60;
export const DASH_TAP_TICKS = 8;
export function cancelDashCharge(p:Player) { p.dashCharging=false;p.dashCharge=0; }
export function dashSpeed(p:Player) { return (p.power==='turbo'?320:250)+170*(p.dashStrength??0); }
export function chargedDashDamage(p:Player) { return p.boost>0&&(p.dashStrength??0)>0?((p.dashStrength??0)>=.75?2:1):0; }
/** Short holds retain ordinary dash; old edge-only commands remain immediate. */
export function stepChargedDash(s:State,input:Controls) {
 const p=s.player;
 if(!p.boost)p.dashStrength=0;
 if(p.dashCharging&&(p.crouching||!p.grounded||p.pound||p.invulnerable>72||input.jumpPressed))cancelDashCharge(p);
 if(p.dashCharging){
  p.vx=0;
  if(input.dashHeld){
   const previous=p.dashCharge??0;p.dashCharge=Math.min(DASH_CHARGE_TICKS,previous+1);
   if(p.dashCharge===9)s.events.push('dash-charge-low');
   if(p.dashCharge===24)s.events.push('dash-charge-mid');
   if(p.dashCharge===40)s.events.push('dash-charge-high');
   if(p.dashCharge===60&&(previous<60||s.ticks%12===0))s.events.push('dash-charge-full');
  }
  else {
   const held=p.dashCharge??0;
   p.dashStrength=Math.max(0,Math.min(1,(held-DASH_TAP_TICKS)/(DASH_CHARGE_TICKS-DASH_TAP_TICKS)));
   if(releaseCharacterCharge(s,p.dashStrength)){cancelDashCharge(p);return;}
   p.boost=(p.power==='turbo'?22:12)+Math.round(18*p.dashStrength);p.dashDuration=p.boost;
   p.vx=p.facing*dashSpeed(p);p.dashCooldown=70;cancelDashCharge(p);s.events.push('boost');if(p.dashStrength>0)s.events.push('dash-release');
  }
  return;
 }
 if(input.dashPressed&&input.dashHeld&&p.grounded&&!p.crouching&&!p.specialRecovery&&!p.dashCooldown&&!p.boost&&!p.pound&&p.invulnerable<=72&&!input.jumpPressed){
  p.dashCharging=true;p.dashCharge=1;p.vx=0;
 }
}
