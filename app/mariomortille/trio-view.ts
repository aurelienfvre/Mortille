import * as Phaser from 'phaser';
import { bitmapText } from './menu-art';
import { trioReady } from './trio';
import type { Party } from './party';
/** Crisp pixel geometry is authored in world pixels; no screen blur or generic particles. */
export function createTrioView(scene:Phaser.Scene,party:Party){
 const amulets=party.trio.amulets.map(a=>scene.add.image(a.x,a.y,'trio-amulet').setDepth(6));
 const beam=scene.add.image(0,0,'trio-ray-1').setOrigin(0,.5).setDepth(11).setVisible(false);
 const ray=scene.add.graphics().setDepth(11),hint=scene.add.graphics().setScrollFactor(0).setDepth(16);
 return {draw(ticks:number){
  const trio=party.trio;amulets.forEach((v,i)=>v.setVisible(!trio.amulets[i].collected).setY(trio.amulets[i].y+[0,-1,-2,-1][Math.floor(ticks/12)%4]));
  ray.clear();hint.clear();beam.setVisible(false);
  const text=trio.gathering?(trio.gathering.phase==='arrive'?'LES ALLIES ARRIVENT...':'LES ALLIES REPARTENT...'):trio.notice?'PASSAGE BLOQUE / AU SOL - AMULETTE CONSERVEE':trio.charges?`V : RAYON TRIO ${trioReady(party)?'PRET':'APPELER LES ALLIES'}`:'';
  if(text){const art=bitmapText(text);for(const p of art.pixels){hint.fillStyle(0x17222f).fillRect(12+p.x+1,337+p.y+1,1,1);hint.fillStyle(0xffedbc).fillRect(12+p.x,337+p.y,1,1);}}
  const a=trio.attack;if(!a)return;
  const age=a.age,charging=age<60;
  const size=charging?3+Math.floor(age/7):age<96?14:Math.max(1,Math.floor((114-age)/2));
  const colors=[0xffbd54,0x72edff,0xc19aff];
  for(let i=0;i<party.members.length;i++){
   const p=party.members[i].body,from={x:p.x+10,y:p.y+18};
   ray.fillStyle(colors[i]);
   for(let t=0;t<=1;t+=.025){const x=Math.round(from.x+(a.x-from.x)*t),y=Math.round(from.y+(a.y-from.y)*t);ray.fillRect(x,y,2,2);}
   ray.fillRect(Math.round(from.x)-3,Math.round(from.y)-3,6,6);
  }
  if(age>=60&&age<96){
   const extent=Math.floor(a.reach*Math.min(1,(age-59)/5));
   beam.setVisible(true).setTexture(`trio-ray-${1+Math.floor(age/6)%4}`).setOrigin(a.direction>0?0:1,.5).setFlipX(a.direction<0).setPosition(Math.round(a.x-12*a.direction),Math.round(a.y)).setDisplaySize(Math.max(1,extent+12),40);
  }
  if(!charging)return;
  ray.fillStyle(0x7560c5).fillRect(Math.round(a.x-size),Math.round(a.y-size+3),size*2,Math.max(1,size*2-6));
  ray.fillStyle(0x6de9ff).fillRect(Math.round(a.x-size+3),Math.round(a.y-size),Math.max(1,size*2-6),size*2);
  ray.fillStyle(0xffffe6).fillRect(Math.round(a.x-size/2),Math.round(a.y-size/2),size,size);
 }};
}
