import type { Enemy, Player, Tile } from './simulation';
import { collisionCandidates } from './terrain-index';

export type EnemyKind = 'guard' | 'pest' | 'rover' | 'plant' | 'beetle' | 'cat' | 'crab' | 'imp';
export function enemyKind(enemy: Enemy): EnemyKind { return enemy.kind ?? 'guard'; }
export const ENEMY_DEATH_TICKS = 36;
/** Defeated collision state is immediate; presentation has a finite, fixed-step tail. */
export function defeatEnemy(enemy: Enemy) {
 if (enemy.defeated) return false;
 enemy.defeated = true; enemy.deathTicks = ENEMY_DEATH_TICKS; enemy.moving = false;
 return true;
}
export function stepEnemyDeath(enemy: Enemy) {
 if (enemy.defeated) enemy.deathTicks = Math.max(0, (enemy.deathTicks ?? 0) - 1);
}
/** A guard's front shield blocks fire, but its back and head remain vulnerable. */
export function enemyBlocksShot(enemy: Enemy, shotX: number) {
 if (enemy.defeated || !['guard','beetle'].includes(enemyKind(enemy))) return false;
 const inFront = (shotX + 3 - (enemy.x + 10)) * enemy.direction >= 0;
 if (inFront) { enemy.phase = 'recover'; enemy.phaseTicks = 18; enemy.moving = false; }
 return inFront;
}
/** Fixed-step AI. Charge direction is locked during its visible warning. */
export function stepEnemy(enemy: Enemy, player: Player, tiles: Tile[], shoot?: (shot: { x:number; y:number; vx:number }) => void) {
 if (enemy.defeated) return;
 const kind = enemyKind(enemy);
 let speed = kind === 'pest' ? 48 : kind === 'beetle' ? 24 : 32;
 if (kind === 'plant' || kind === 'cat') { stepStationary(enemy,player,tiles,shoot); return; }
 if ((kind === 'guard' || kind === 'beetle') && enemy.phase === 'recover') {
  speed = 0; enemy.phaseTicks = Math.max(0, (enemy.phaseTicks ?? 0) - 1);
  if (!enemy.phaseTicks) enemy.phase = 'patrol';
 }
 if (kind === 'pest' || kind === 'imp') {
  enemy.homeY ??= enemy.y;
  const phase = enemy.phase ?? 'patrol';
  if (phase === 'warning') {
   speed = 0; enemy.phaseTicks = Math.max(0, (enemy.phaseTicks ?? 0) - 1);
   if (!enemy.phaseTicks) { enemy.phase = 'jump'; enemy.vy = kind === 'imp' ? -250 : -210; }
  } else if (phase === 'jump') {
   speed = kind === 'imp' ? 58 : 66;
   const oldY = enemy.y;
   enemy.vy = (enemy.vy ?? 0) + 700 / 60;
   const nextY = enemy.y + enemy.vy / 60;
   const surfaces = collisionCandidates(tiles, enemy.x, 20).filter(t => enemy.x < t.x + 16 && enemy.x + 20 > t.x);
   const ceiling = enemy.vy < 0 && surfaces.find(t => oldY >= t.y + 16 && nextY < t.y + 16);
   const floor = enemy.vy >= 0 && surfaces.find(t => oldY + 20 <= t.y && nextY + 20 >= t.y);
   if (ceiling) { enemy.y = ceiling.y + 16; enemy.vy = 0; }
   else if (floor || nextY >= enemy.homeY) {
    enemy.y = floor ? floor.y - 20 : enemy.homeY; enemy.homeY = enemy.y;
    enemy.vy = 0; enemy.phase = 'recover'; enemy.phaseTicks = 60;
   } else enemy.y = nextY;
  } else if (phase === 'recover') {
   speed = 0; enemy.phaseTicks = Math.max(0, (enemy.phaseTicks ?? 0) - 1);
   if (!enemy.phaseTicks) enemy.phase = 'patrol';
  } else {
   const dx = player.x + 10 - (enemy.x + 10);
   if (Math.abs(dx) < 108 && Math.abs(player.y + 42 - (enemy.y + 20)) < 28) {
    enemy.phase = 'warning'; enemy.phaseTicks = 30; speed = 0;
    if (dx) enemy.direction = Math.sign(dx);
   }
  }
 }
 if (kind === 'rover' || kind === 'crab') {
  const phase = enemy.phase ?? 'patrol';
  if (phase !== 'patrol') {
   enemy.phaseTicks = Math.max(0, (enemy.phaseTicks ?? 0) - 1);
   speed = phase === 'charge' ? (kind === 'crab' ? 96 : 112) : 0;
   if (!enemy.phaseTicks) {
    enemy.phase = phase === 'warning' ? 'charge' : phase === 'charge' ? 'recover' : 'patrol';
    enemy.phaseTicks = enemy.phase === 'charge' ? 42 : enemy.phase === 'recover' ? 60 : 0;
   }
  } else {
   const dx = player.x + 10 - (enemy.x + 10);
   const sameFloor = Math.abs(player.y + 42 - (enemy.y + 20)) < 24;
   const a = Math.min(enemy.x + 10, player.x + 10), b = Math.max(enemy.x + 10, player.x + 10);
   const candidate = sameFloor && Math.abs(dx) < 140 && Math.abs(dx) > 24;
   const blocked = candidate && collisionCandidates(tiles, a, b - a).some(t => t.x < b && t.x + 16 > a && t.y < enemy.y + 20 && t.y + 16 > enemy.y);
   if (candidate && !blocked) {
    enemy.phase = 'warning'; enemy.phaseTicks = kind === 'crab' ? 42 : 30; enemy.direction = Math.sign(dx); speed = 0;
   }
  }
 }
 const previous = enemy.x;
 const proposed = Math.max(enemy.left, Math.min(enemy.right, enemy.x + enemy.direction * speed / 60));
 const wall = collisionCandidates(tiles, proposed, 20).find(t => proposed < t.x + 16 && proposed + 20 > t.x && enemy.y < t.y + 16 && enemy.y + 20 > t.y);
 enemy.x = wall ? Math.max(enemy.left, Math.min(enemy.right, enemy.direction > 0 ? wall.x - 20 : wall.x + 16)) : proposed;
 enemy.distance = (enemy.distance ?? 0) + Math.abs(enemy.x - previous);
 enemy.moving = Math.abs(enemy.x - previous) > .001;
 if (speed && (wall || proposed <= enemy.left || proposed >= enemy.right)) {
  enemy.direction *= -1;
  if ((kind === 'rover' || kind === 'crab') && enemy.phase === 'charge') { enemy.phase = 'recover'; enemy.phaseTicks = 60; }
 }
}

/** Mouth attack uses a separate box so the plant's body remains stompable. */
export function enemyAttackBox(e: Enemy) {
 if(e.defeated || e.kind !== 'plant' || e.phase !== 'charge')return null;
 return {x:e.direction>0?e.x+20:e.x-8,y:e.y+2,width:8,height:16};
}
function stepStationary(e:Enemy,p:Player,tiles:Tile[],shoot?: (shot:{x:number;y:number;vx:number})=>void){
 e.moving=false;
 const cat=e.kind==='cat';
 if(e.phase==='warning'){
  e.phaseTicks=Math.max(0,(e.phaseTicks??0)-1);
  if(!e.phaseTicks){
   e.phase='charge';e.phaseTicks=cat?10:12;
   if(cat)shoot?.({x:e.direction>0?e.x+20:e.x-8,y:e.y+2,vx:e.direction*110});
  }
 }else if(e.phase==='charge'||e.phase==='recover'){
  e.phaseTicks=Math.max(0,(e.phaseTicks??0)-1);
  if(!e.phaseTicks){e.phase=e.phase==='charge'?'recover':'patrol';e.phaseTicks=e.phase==='recover'?(cat?120:84):0;}
 }else{
  const dx=p.x+10-(e.x+10),a=Math.min(e.x+10,p.x+10),b=Math.max(e.x+10,p.x+10);
  const sameFloor=Math.abs(p.y+42-(e.y+20))<32;
  if(!sameFloor || Math.abs(dx)>=(cat?240:72) || Math.abs(dx)<=(cat?48:12))return;
  const wall=collisionCandidates(tiles,a,b-a).some(t=>t.x<b&&t.x+16>a&&t.y<e.y+20&&t.y+16>e.y);
  if(sameFloor&&Math.abs(dx)<(cat?240:72)&&Math.abs(dx)>(cat?48:12)&&!wall){e.phase='warning';e.phaseTicks=cat?45:36;e.direction=Math.sign(dx);}
 }
}
