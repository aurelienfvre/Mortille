import { beginTrioGathering, beginTrioDeparture, type TrioGathering, type TrioGuest } from './trio-gathering';
import { defeatEnemy, stepEnemyDeath } from './enemy-behavior';
import { bossHeight, bossFloor } from './boss';
import type { Party } from './party';
import type { Level, State } from './simulation';
export type Trio = { charges:number; amulets:{x:number;y:number;collected:boolean}[]; attack:null|{age:number;x:number;y:number;direction:number;reach:number}; gathering:TrioGathering|null; guests:TrioGuest[]; notice:number };
export function createTrio(level:Level, enabled:boolean):Trio {
 const desired=enabled?[level.spawn.x+180]:[];
 const amulets=desired.flatMap(x=>{
  const floor=level.tiles.filter(t=>t.kind==='ground'&&t.x<=x&&t.x+16>x).sort((a,b)=>a.y-b.y)[0];
  return floor?[{x:x+8,y:floor.y-25,collected:false}]:[];
 });
 return {charges:0,amulets,attack:null,gathering:null,guests:[],notice:0};
}
export function trioReady(party:Party) {
 const lead=party.members.find(m=>m.id===party.active)!.body;
 return party.members.length===3 && !party.transition && party.members.every(m=>m.body.grounded&&Math.abs(m.body.x-lead.x)<=220&&Math.abs(m.body.y-lead.y)<=24);
}
export function collectTrio(party:Party,world:State,pressed:boolean,level?:Level) {
 const trio=party.trio,p=world.player;trio.notice=Math.max(0,trio.notice-1);
 for(const item of trio.amulets)if(!item.collected&&Math.abs(p.x+10-item.x)<21&&p.y<item.y+12&&p.y+42>item.y-12){item.collected=true;trio.charges++;world.events.push('trio-pickup');}
 if(!pressed||trio.attack||trio.gathering||world.won)return;
 if(!trio.charges || party.transition || !p.grounded){trio.notice=120;return;}
 if(!trioReady(party)){
  if(!level || !beginTrioGathering(party,world,level))trio.notice=180;
  return;
 }
 startTrioAttack(party,world);
}
export function startTrioAttack(party:Party,world:State) {
 const trio=party.trio,p=world.player;
 trio.charges--;
 const direction=p.facing,x=(direction>0?Math.max(...party.members.map(m=>m.body.x+20))+20:Math.min(...party.members.map(m=>m.body.x))-20),y=p.y+20;
 const walls=world.tiles.filter(t=>t.y<y+18&&t.y+16>y-18&&(t.x-x)*direction>24).map(t=>direction>0?t.x-x:x-(t.x+16)).filter(d=>d>0);
 const reach=Math.min(900,...walls);
 trio.attack={age:0,x,y,direction,reach};
 for(const m of party.members){m.body.vx=0;m.body.facing=direction;}
 world.events.push('trio-charge');
}
/** A short cinematic is simulated and recorded tick-for-tick, including its cost.
 * After the physical rendezvous, it holds companions and respects boss defenses. Damage is applied once. */
export function stepTrio(party:Party,world:State) {
 const attack=party.trio.attack;if(!attack)return false;
 world.ticks++;world.events=[];attack.age++;
 for(const enemy of world.enemies)if(enemy.defeated)stepEnemyDeath(enemy);
 if(attack.age===60){
  world.events.push('trio-fire');
  const left=attack.direction>0?attack.x:attack.x-attack.reach,right=attack.direction>0?attack.x+attack.reach:attack.x;
  for(const enemy of world.enemies)if(enemy.x+20>=left&&enemy.x<=right&&Math.abs(enemy.y+10-attack.y)<=32&&defeatEnemy(enemy))world.score+=250;
  world.enemyProjectiles=world.enemyProjectiles.filter(s=>s.x<left||s.x>right||Math.abs(s.y-attack.y)>32);
  const b=world.boss;
  if(b&&b.phase==='stunned'&&b.x+32>=left&&b.x<=right&&b.y<attack.y+32&&b.y+bossHeight(b)>attack.y-32){
   const damage=Math.min(2,b.health);b.health-=damage;b.hits+=damage;b.phase=b.health?'recover':'defeated';b.timer=55;
   if(b.kind==='raphael')b.y=bossFloor(b)-80;
   if(!b.health)world.score+=b.kind==='pirate'||b.kind==='lola'?1250:2500;
  }
 }
 if(attack.age>=114){party.trio.attack=null;beginTrioDeparture(party);}
 return true;
}
