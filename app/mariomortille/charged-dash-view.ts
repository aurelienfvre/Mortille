import type * as Phaser from 'phaser';
import type {State} from './simulation';
export function preloadChargedDash(scene:Phaser.Scene){
 for(let n=1;n<=3;n++)scene.load.image(`charged-aura-idle-${n}`,`/mariomortille/charged-dash/aura-idle-${n}.png?v=1`);
 for(const name of ['aura','shell','impact'])for(let n=1;n<=6;n++)scene.load.image(`charged-${name}-${n}`,`/mariomortille/charged-dash/${name}-${String(n).padStart(2,'0')}.png?v=1`);
 for(const power of ['none','ember','turbo','cloud','cobalt'])for(let n=1;n<=5;n++)scene.load.image(`aurel-brake-${power}-${n}`,`/mariomortille/charged-dash/aurel/${power}/brake-${String(n).padStart(2,'0')}.png?v=1`);
 for(const power of ['ember','turbo','cloud','cobalt'])for(const action of ['charge','propulsion'])for(let n=1;n<=(action==='charge'?5:4);n++)scene.load.image(`charged-aurel-${power}-${action}-${n}`,`/mariomortille/charged-dash/aurel/${power}/${action}-${String(n).padStart(2,'0')}.png?v=1`);
 for(let n=1;n<=5;n++)scene.load.image(`charged-pose-${n}`,`/mariomortille/characters/aurelien/charged-dash/charge-${String(n).padStart(2,'0')}.png?v=1`);
 for(let n=1;n<=4;n++)scene.load.image(`charged-propulsion-${n}`,`/mariomortille/charged-dash/propulsion-${String(n).padStart(2,'0')}.png?v=1`);
}
export function createChargedDashView(scene:Phaser.Scene){
 const aura=scene.add.image(0,0,'charged-aura-1').setOrigin(.5,88/96).setDepth(-1).setVisible(false);
 const shell=scene.add.image(0,0,'charged-shell-1').setDepth(6).setVisible(false);
 const impact=scene.add.image(0,0,'charged-impact-1').setDepth(9).setVisible(false);
 return {draw(s:State){const p=s.player;const charging=!!p.dashCharging&&p.characterId!=='ben';const boosting=!!p.boost&&(p.dashStrength??0)>0;
  const full=(p.dashCharge??0)>=40;
  aura.setVisible(charging).setPosition(Math.round(p.x+10),Math.round(p.y+42));
  if(full)aura.setTexture(`charged-aura-idle-${[1,2,3,2][Math.floor(s.ticks/12)%4]}`).setOrigin(.5,62/64).setScale(1);
  else aura.setTexture(`charged-aura-${Math.min(4,1+Math.floor((p.dashCharge??0)/10))}`).setOrigin(.5,84/96).setScale(.85,.64);
  shell.setVisible(boosting).setPosition(Math.round(p.x+10),Math.round(p.y+25)).setFlipX(p.facing<0).setTexture(`charged-shell-${1+Math.floor(s.ticks/3)%6}`);
  const hit=s.lastDashImpact;const age=hit?s.ticks-hit.tick:99;impact.setVisible(age>=0&&age<24);if(hit)impact.setPosition(Math.round(hit.x),Math.round(hit.y)).setTexture(`charged-impact-${Math.min(6,1+Math.floor(age/4))}`);
 }};
}
