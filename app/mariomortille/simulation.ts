import { collisionCandidates } from './terrain-index';
import { makeBoss, stepBoss, type Boss } from './boss';
/** Deterministic 60 Hz platformer simulation; contains no renderer or DOM state. */
export const STEP = 1 / 60;
export const TILE = 16;
export type Power = 'none' | 'turbo' | 'ember' | 'cloud' | 'cobalt';
export type Controls = { direction: number; jump: boolean; jumpPressed: boolean; run: boolean; downPressed: boolean; powerPressed: boolean };
export type Tile = { x: number; y: number; kind: 'ground' | 'brick' | 'weak' | 'reinforced' | 'ice' };
export type Pickup = { id: string; x: number; y: number; kind: 'coin' | 'secret' | Power; collected: boolean };
export type Enemy = { id: string; x: number; y: number; left: number; right: number; direction: number; defeated: boolean };
export type Level = { boss?: 'raphael'; id: string; width: number; spawn: { x: number; y: number }; tiles: Tile[]; pickups: Pickup[]; enemies?: Enemy[]; checkpoint: number; goal: number };
export type Event = 'jump' | 'land' | 'pound' | 'break' | 'coin' | 'equip' | 'checkpoint' | 'hurt' | 'finish' | 'boost' | 'stomp' | 'fire' | 'secret';
export type Player = { x: number; y: number; vx: number; vy: number; facing: number; grounded: boolean; power: Power; health: number; coyote: number; buffer: number; invulnerable: number; boost: number; cooldown: number; pound: number; landing: number };
export type Projectile = { id: number; x: number; y: number; vx: number; vy: number; life: number };
export type State = { boss: Boss | null; checkpointSpawn: { x: number; y: number }; projectiles: Projectile[]; nextProjectile: number; enemies: Enemy[]; savedEnemies: string[]; player: Player; tiles: Tile[]; pickups: Pickup[]; ticks: number; score: number; checkpoint: boolean; savedScore: number; savedPickups: string[]; savedPower: Power; won: boolean; events: Event[] };
export const WIDTH = 20, HEIGHT = 42;
export function createState(level: Level): State {
  return { boss: level.boss ? makeBoss(level) : null, checkpointSpawn: { ...level.spawn }, projectiles: [], nextProjectile: 0, enemies: (level.enemies ?? []).map(e => ({ ...e })), savedEnemies: [], player: { ...level.spawn, vx: 0, vy: 0, facing: 1, grounded: false, power: 'none', health: 3, coyote: 0, buffer: 0, invulnerable: 0, boost: 0, cooldown: 0, pound: 0, landing: 0 }, tiles: level.tiles.map(t => ({ ...t })), pickups: level.pickups.map(p => ({ ...p })), ticks: 0, score: 0, checkpoint: false, savedScore: 0, savedPickups: [], savedPower: 'none', won: false, events: [] };
}
const approach = (a: number, b: number, d: number) => a < b ? Math.min(a + d, b) : Math.max(a - d, b);
const overlaps = (x: number, y: number, w: number, h: number, t: { x: number; y: number }, size = TILE) => x < t.x + size && x + w > t.x && y < t.y + size && y + h > t.y;
function respawn(s: State, l: Level) {
  const p = s.player;
  p.x = s.checkpointSpawn.x; p.y = s.checkpointSpawn.y;
  s.projectiles = [];
  s.boss = l.boss ? makeBoss(l) : null;
  p.vx = p.vy = p.pound = p.boost = 0; p.grounded = false; p.health = 3; p.invulnerable = 90; p.power = s.savedPower;
  s.score = s.savedScore;
  for (const item of s.pickups) item.collected = s.savedPickups.includes(item.id);
  s.enemies = (l.enemies ?? []).map(e => ({ ...e, defeated: s.savedEnemies.includes(e.id) }));
  s.tiles = l.tiles.map(t => ({ ...t }));
  s.events.push('hurt');
}
export function damage(s: State, l: Level, fromX: number) {
  const p = s.player;
  if (p.invulnerable) return;
  if (p.power !== 'none') p.power = 'none'; else p.health--;
  p.invulnerable = 90; p.vx = p.x < fromX ? -145 : 145; p.vy = -190; p.pound = p.boost = 0;
  if (p.health <= 0) respawn(s, l); else s.events.push('hurt');
}
export function tick(s: State, l: Level, input: Controls) {
  s.events = []; if (s.won) return;
  s.ticks++;
  const p = s.player;
  const oldY = p.y; p.landing = Math.max(0, p.landing - 1);
  p.invulnerable = Math.max(0, p.invulnerable - 1); p.cooldown = Math.max(0, p.cooldown - 1); p.boost = Math.max(0, p.boost - 1);
  p.coyote = p.grounded ? 7 : Math.max(0, p.coyote - 1);
  p.buffer = input.jumpPressed ? 7 : Math.max(0, p.buffer - 1);
  if (input.direction) p.facing = Math.sign(input.direction);
  if (input.powerPressed && p.power === 'turbo' && p.cooldown === 0) { p.boost = 22; p.cooldown = 70; s.events.push('boost'); }
  if (input.powerPressed && p.power === 'ember' && !p.cooldown) { s.projectiles.push({ id: s.nextProjectile++, x: p.x + (p.facing > 0 ? WIDTH : -8), y: p.y + 20, vx: p.facing * 240, vy: -70, life: 120 }); p.cooldown = 22; s.events.push('fire'); }
  const target = p.boost ? p.facing * 320 : input.direction * (input.run ? 180 : 115);
  p.vx = approach(p.vx, target, (p.grounded ? 1100 : 650) * STEP);
  if (p.buffer && p.coyote) { p.vy = -360; p.grounded = false; p.buffer = p.coyote = 0; s.events.push('jump'); }
  if (!input.jump && p.vy < -140) p.vy += 900 * STEP;
  if (input.downPressed && !p.grounded && p.pound === 0) { p.pound = 12; p.vy = -50; }
  if (p.pound > 1) { p.pound--; p.vx *= .7; } else if (p.pound === 1) { p.vy = 580; p.vx *= .8; }
  p.vy = Math.min(p.power === 'cloud' && input.jump && !p.pound ? 85 : 580, p.vy + (p.power === 'cloud' && input.jump && p.vy > 0 ? 200 : 1000) * STEP);
  p.x += p.vx * STEP;
  for (const tile of collisionCandidates(s.tiles, p.x, WIDTH)) if (overlaps(p.x, p.y, WIDTH, HEIGHT, tile)) {
    if (tile.kind === 'weak' && p.boost) { s.tiles.splice(s.tiles.indexOf(tile), 1); s.events.push('break'); continue; }
    p.x = p.vx > 0 ? tile.x - WIDTH : tile.x + TILE; p.vx = 0;
  }
  p.x = Math.max(0, Math.min(l.width - WIDTH, p.x));
  const wasGrounded = p.grounded; p.grounded = false;
  p.y += p.vy * STEP;
  for (const tile of collisionCandidates(s.tiles, p.x, WIDTH)) if (overlaps(p.x, p.y, WIDTH, HEIGHT, tile)) {
    if ((tile.kind === 'weak' || (tile.kind === 'reinforced' && p.power === 'cobalt')) && p.pound === 1 && p.vy > 0) { s.tiles.splice(s.tiles.indexOf(tile), 1); s.events.push('break'); continue; }
    if (p.vy > 0) { p.y = tile.y - HEIGHT; p.grounded = true; if (p.pound) s.events.push('pound'); p.pound = 0; }
    else if (p.vy < 0) p.y = tile.y + TILE;
    p.vy = 0;
  }
  for (const shot of s.projectiles) {
    shot.life--; shot.x += shot.vx * STEP;
    for (const tile of collisionCandidates(s.tiles, shot.x, 6)) if (overlaps(shot.x, shot.y, 6, 6, tile)) {
      if (tile.kind === 'ice') { s.tiles.splice(s.tiles.indexOf(tile), 1); s.events.push('break'); }
      shot.life = 0;
    }
    shot.vy = Math.min(360, shot.vy + 700 * STEP); shot.y += shot.vy * STEP;
    for (const tile of collisionCandidates(s.tiles, shot.x, 6)) if (overlaps(shot.x, shot.y, 6, 6, tile)) {
      if (tile.kind === 'ice') { s.tiles.splice(s.tiles.indexOf(tile), 1); shot.life = 0; s.events.push('break'); }
      else if (shot.vy > 0) { shot.y = tile.y - 6; shot.vy = -190; } else shot.life = 0;
    }
    for (const enemy of s.enemies) if (shot.life > 0 && !enemy.defeated && overlaps(shot.x, shot.y, 6, 6, enemy, 20)) { enemy.defeated = true; shot.life = 0; s.score += 250; s.events.push('stomp'); }
  }
  s.projectiles = s.projectiles.filter(shot => shot.life > 0 && shot.y < 500);
  if (p.grounded && !wasGrounded) { p.landing = 5; s.events.push('land'); }
  for (const enemy of s.enemies) {
    if (enemy.defeated) continue;
    enemy.x += enemy.direction * 32 * STEP;
    if (enemy.x <= enemy.left) { enemy.x = enemy.left; enemy.direction = 1; }
    if (enemy.x >= enemy.right) { enemy.x = enemy.right; enemy.direction = -1; }
    if (overlaps(p.x, p.y, WIDTH, HEIGHT, enemy, 20)) {
      if ((p.vy > 0 && oldY + HEIGHT <= enemy.y + 7) || p.boost > 0) {
        enemy.defeated = true; s.score += 250; p.vy = -230; p.pound = 0; s.events.push('stomp');
      } else damage(s, l, enemy.x);
    }
  }
  stepBoss(s, l, oldY, damage);
  for (const item of s.pickups) if (!item.collected && overlaps(p.x, p.y, WIDTH, HEIGHT, item)) {
    item.collected = true;
    if (item.kind === 'secret') { s.score += 1000; s.events.push('secret'); }
    else if (item.kind === 'coin') { s.score += 100; s.events.push('coin'); }
    else { p.power = item.kind; s.events.push('equip'); }
  }
  if (!s.checkpoint && p.x >= l.checkpoint && p.grounded) { s.checkpoint = true; s.checkpointSpawn = { x: p.x, y: p.y - 1 }; s.savedScore = s.score; s.savedEnemies = s.enemies.filter(e => e.defeated).map(e => e.id); s.savedPower = p.power; s.savedPickups = s.pickups.filter(i => i.collected).map(i => i.id); s.events.push('checkpoint'); }
  if (p.y > 500) respawn(s, l);
  if (p.x >= l.goal && p.grounded && (!s.boss || s.boss.phase === 'defeated')) { s.won = true; s.score += 1000; s.events.push('finish'); }
}
export function spriteFrame(s: State) {
  const p = s.player;
  const row = ['none', 'turbo', 'ember', 'cloud', 'cobalt'].indexOf(p.power);
  const pose = p.landing ? 11 : p.pound ? 10 : !p.grounded ? (p.vy < 0 ? 8 : 9) : Math.abs(p.vx) > 8 ? 2 + Math.floor(s.ticks / 5) % 6 : s.ticks % 210 < 7 ? 1 : 0;
  return row * 12 + pose;
}
