import type * as Phaser from 'phaser';
import type {State} from './simulation';
export function preloadPalm(scene:Phaser.Scene){
 for(let n=1;n<=6;n++)scene.load.image(`golden-palm-${n}`,`/mariomortille/charged-specials/ben/golden-palm-${n}.png?v=1`);
 for(const power of ['none','ember','turbo','cloud','cobalt'])for(let n=1;n<=8;n++)scene.load.image(`ben-palm-${power}-${n}`,`/mariomortille/charged-specials/ben/${power}/palm-${String(n).padStart(2,'0')}.png?v=1`);
}
export function createPalmView(scene:Phaser.Scene){
 const waves=new Map<string,Phaser.GameObjects.Image>();const glow=scene.add.image(0,0,'golden-palm-6').setDepth(8).setVisible(false);
 return {draw(s:State){const p=s.player;const charging=p.characterId==='ben'&&p.dashCharging;const hit=s.lastCharacterAttack;const flash=hit?.kind==='palm'&&s.ticks-hit.tick<6;
  glow.setVisible(!!charging||!!flash);
  if(charging){
   const charge=Math.min(60,Math.max(0,p.dashCharge??0));
   const full=charge===60;
   // One slow revolution per 2.4 seconds; hold keeps the energy alive without flashing.
   const phase=s.ticks*Math.PI*2/144;
   const size=Math.round(7+15*charge/60+(full?Math.sin(phase)*1:0));
   glow.setPosition(Math.round(p.x+10-6*p.facing),Math.round(p.y+24))
    .setDisplaySize(size,size).setRotation(full?phase:charge*Math.PI/120).setAlpha(1);
  }
  else if(flash)glow.setRotation(0).setAlpha(1).setPosition(Math.round(p.x+10+17*p.facing),Math.round(p.y+13)).setDisplaySize(24,24);
  const keys=new Set<string>();for(const wave of s.palmWaves??[]){const key=`${wave.tick}-${wave.origin}-${wave.direction}`;keys.add(key);let v=waves.get(key);if(!v){v=scene.add.image(0,0,'golden-palm-1').setDepth(7);waves.set(key,v)}const age=s.ticks-wave.tick;v.setPosition(Math.round(wave.x),Math.round(wave.y)).setFlipX(wave.direction<0).setTexture(`golden-palm-${age<2?1:age<5?2:3+Math.floor(age/4)%2}`);}
  for(const [key,v]of waves)if(!keys.has(key)){v.destroy();waves.delete(key)}
 }};
}
