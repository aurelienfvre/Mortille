import {powerBlockControls} from './power-block-controls.mjs';
/** Real controls only: dodge the committed attack, then jump onto the recovery. */
export function minibossControls(state, normal) {
 const refill=powerBlockControls(state,normal);if(refill)return refill;
 normal=enemyDodgeControls(state,normal);
 const b=state.boss,p=state.player;
 if(b&&b.phase!=='defeated'&&p.power==='turbo'&&Math.abs(p.x-b.x)<650)normal={...normal,powerPressed:false};
 if(b?.kind==='raphael'&&b.phase!=='defeated'&&p.x>=b.initialX-400){
  const dx=b.x+6-p.x;
  let target=b.x+(p.x<b.x?-130:130);
  const jump=p.grounded&&((b.phase==='charge'&&Math.abs(dx)<155)||(b.phase==='stunned'&&Math.abs(dx)<100));
  if(b.phase==='stunned'||(b.phase==='charge'&&!p.grounded))target=b.x+6;
  target=Math.max(b.arenaLeft,Math.min(b.arenaRight,target));
  return {direction:Math.abs(target-p.x)<4?0:Math.sign(target-p.x),run:true,jump:true,jumpPressed:jump,powerPressed:false,downPressed:false};
 }
 if(!b||b.kind==='raphael'||b.phase==='defeated'||p.x<(b.arenaLeft??b.x-200)-16)return normal;
 if(Math.abs(p.x-b.x)>210&&b.phase==='tell')return normal;
 const dx=b.x+6-p.x;
 let target=b.x+(b.direction<0?-90:90),jump=false;
 if(b.phase==='charge') {target=b.kind!=='pirate' ? b.startX-b.direction*60 : p.x;jump=b.kind==='pirate'&&p.grounded&&Math.abs(dx)<140;}
 if(b.phase==='stunned'){target=b.x+(b.kind!=='pirate'&&b.x-b.arenaLeft<50?24:6);jump=p.grounded&&Math.abs(dx)<90;}
 if(b.phase==='recover')target=b.x+(p.x<b.x?-90:90);
 // Mango lands near arena edges: cross under the committed leap, then keep
 // recovery exits on real floor instead of backing into the preceding drop.
 if(b.kind!=='pirate' && b.phase!=='stunned') {
  const lo=b.arenaLeft+4,hi=b.arenaRight;
  if(b.phase==='recover')target=b.x+b.direction*80;
  target=Math.max(lo,Math.min(hi,target));
  if(b.phase!=='charge' && Math.abs(target-b.x)<45)target=Math.max(lo,Math.min(hi,b.x-b.direction*90));
 }
if(b.kind==='lola'&&p.power==='ember'&&b.phase==='stunned') {target=b.x+(p.x<b.x?-100:100);jump=false;}
 if(b.kind==='lola'&&b.phase==='recover')target=b.x+(p.x<b.x?-100:100);
 let direction=Math.abs(target-p.x)<4?0:Math.sign(target-p.x);
 if(b.kind==='lola'&&p.power==='ember'&&b.phase==='stunned'&&Math.abs(target-p.x)<8&&p.facing!==Math.sign(dx))direction=Math.sign(dx);
 return {direction,run:true,jump:true,jumpPressed:jump,powerPressed:p.power==='ember'&&b.phase==='stunned',downPressed:false};
}

export function enemyDodgeControls(state,normal){
 const refill=powerBlockControls(state,normal);if(refill)return refill;
 const p=state.player;
 const threat=state.enemyProjectiles.some(shot=>{
  const dx=shot.x+4-(p.x+10),closing=shot.vx-p.vx;
  return dx*closing<0 && Math.abs(dx)<80 && shot.y+8>p.y && shot.y<p.y+42;
 });
 return p.grounded&&threat?{...normal,jump:true,jumpPressed:true}:normal;
}
