import { stepCharacterAbility, clearCharacterForm, type CharacterAttack, type PalmWave, type Push, type BearStage } from './character-charge';
import { cancelDashCharge, stepChargedDash, dashSpeed, chargedDashDamage } from './charged-dash';
import { breakPowerBlock, chargedAttackBreaks } from './power-blocks';
import { stepEnemy, stepEnemyDeath, defeatEnemy, enemyBlocksShot, enemyAttackBox, type EnemyKind } from './enemy-behavior';
import { collisionCandidates } from './terrain-index';
import { makeBoss, stepBoss, type Boss } from './boss';
/** Deterministic 60 Hz platformer simulation; contains no renderer or DOM state. */
export const STEP = 1 / 60;
export const TILE = 16;
export type Power = 'none' | 'turbo' | 'ember' | 'cloud' | 'cobalt';
export type Controls = { direction: number; jump: boolean; jumpPressed: boolean; run: boolean; downPressed: boolean; powerPressed: boolean; dashPressed?: boolean; dashHeld?: boolean; downHeld?: boolean; switchPressed?: boolean; trioPressed?: boolean };
export type Tile = { content?: string; x: number; y: number; kind: 'ground' | 'brick' | 'weak' | 'reinforced' | 'ice' };
export type Pickup = { push?:Push; blocked?: boolean; availableAt?: number; id: string; x: number; y: number; kind: 'coin' | 'secret' | Power; collected: boolean };
export type Enemy = { push?:Push; kind?: EnemyKind; phase?: 'patrol' | 'warning' | 'charge' | 'recover' | 'jump'; deathTicks?: number; homeY?: number; vy?: number; phaseTicks?: number; distance?: number; moving?: boolean; id: string; x: number; y: number; left: number; right: number; direction: number; defeated: boolean };
export type Level = { boss?: 'raphael' | 'pirate' | 'lola' | 'mango'; id: string; width: number; spawn: { x: number; y: number }; tiles: Tile[]; pickups: Pickup[]; enemies?: Enemy[]; checkpoint: number; goal: number };
export type Event = 'bear-transform'|'bear-revert'|'bear-claw'|'palm-wave' | 'dash-charge-low' | 'dash-charge-mid' | 'dash-charge-high' | 'dash-charge-full' | 'dash-release' | 'dash-impact' | 'trio-pickup' | 'trio-charge' | 'trio-fire' | 'jump' | 'land' | 'pound' | 'break' | 'coin' | 'equip' | 'checkpoint' | 'hurt' | 'finish' | 'boost' | 'stomp' | 'fire' | 'secret';
export type Player = { characterId?:'aurel'|'juju'|'ben'; bearTicks?:number; bearStage?:BearStage; bearRevertAge?:number; bearClawAge?:number; bearStrength?:number; clawCooldown?:number; specialRecovery?:number; dashCharging?: boolean; dashCharge?: number; dashStrength?: number; dashDuration?: number; crouching: boolean; x: number; y: number; vx: number; vy: number; facing: number; grounded: boolean; power: Power; health: number; coyote: number; buffer: number; invulnerable: number; boost: number; dashCooldown: number; cooldown: number; pound: number; landing: number };
export type Projectile = { id: number; x: number; y: number; vx: number; vy: number; life: number };
export type EnemyProjectile = { id: number; x: number; y: number; vx: number; life: number };
export type State = { palmWaves?:PalmWave[]; lastCharacterAttack?:CharacterAttack; lastDashImpact?:{x:number;y:number;tick:number;strength:number}; enemyProjectiles: EnemyProjectile[]; nextEnemyProjectile: number; boss: Boss | null; checkpointSpawn: { x: number; y: number }; projectiles: Projectile[]; nextProjectile: number; enemies: Enemy[]; savedEnemies: string[]; player: Player; tiles: Tile[]; pickups: Pickup[]; ticks: number; score: number; checkpoint: boolean; savedScore: number; savedPickups: string[]; savedPower: Power; won: boolean; events: Event[] };
export const WIDTH = 20, HEIGHT = 42, CROUCH_HEIGHT = 28;
/** y remains the standing origin; feet are invariant across stance changes. */
export const playerHitbox = (p: Player) => ({ x: p.x, y: p.y + (p.crouching ? HEIGHT - CROUCH_HEIGHT : 0), width: WIDTH, height: p.crouching ? CROUCH_HEIGHT : HEIGHT });
function makeEnemies(level: Level): Enemy[] {
 return (level.enemies ?? []).map((e, i) => ({ ...e, kind: e.kind ?? (level.id.startsWith('quartier') ? (['guard', 'pest', 'rover'] as const)[i % 3] : 'guard') }));
}
export function createState(level: Level): State {
  return { enemyProjectiles: [], nextEnemyProjectile: 0, boss: level.boss ? makeBoss(level) : null, checkpointSpawn: { ...level.spawn }, projectiles: [], nextProjectile: 0, enemies: makeEnemies(level), savedEnemies: [], player: { characterId:'aurel',bearClawAge:-1,bearStage:0,bearRevertAge:-1,bearTicks:0,bearStrength:0,clawCooldown:0,specialRecovery:0,dashCharging:false,dashCharge:0,dashStrength:0,dashDuration:0,crouching: false, ...level.spawn, vx: 0, vy: 0, facing: 1, grounded: false, power: 'none', health: 3, coyote: 0, buffer: 0, invulnerable: 0, boost: 0, dashCooldown: 0, cooldown: 0, pound: 0, landing: 0 }, tiles: level.tiles.map(t => ({ ...t })), pickups: level.pickups.map(p => ({ ...p })), ticks: 0, score: 0, checkpoint: false, savedScore: 0, savedPickups: [], savedPower: 'none', won: false, events: [] };
}
const approach = (a: number, b: number, d: number) => a < b ? Math.min(a + d, b) : Math.max(a - d, b);
const overlaps = (x: number, y: number, w: number, h: number, t: { x: number; y: number }, size = TILE) => x < t.x + size && x + w > t.x && y < t.y + size && y + h > t.y;
function respawn(s: State, l: Level) {
  const p = s.player;
  cancelDashCharge(p);clearCharacterForm(p);p.dashStrength=0;
  p.crouching = false; p.x = s.checkpointSpawn.x; p.y = s.checkpointSpawn.y;
  s.projectiles = []; s.enemyProjectiles = [];s.palmWaves=[];
  s.boss = l.boss ? makeBoss(l) : null;
  p.vx = p.vy = p.pound = p.boost = 0; p.grounded = false; p.health = 3; p.invulnerable = 90; p.power = s.savedPower;
  s.score = s.savedScore;
  for (const item of s.pickups) { item.collected = s.savedPickups.includes(item.id); item.blocked = l.pickups.find(original=>original.id===item.id)?.blocked; item.availableAt=0; }
  s.enemies = makeEnemies(l).map(e => ({ ...e, defeated: s.savedEnemies.includes(e.id) }));
  s.tiles = l.tiles.map(t => ({ ...t }));
  s.events.push('hurt');
}
export function damage(s: State, l: Level, fromX: number) {
  const p = s.player;
  if (p.invulnerable) return;
  cancelDashCharge(p);p.dashStrength=0;p.specialRecovery=0;p.bearClawAge=-1;
  if (p.power !== 'none') p.power = 'none'; else p.health--;
  p.invulnerable = 90; p.vx = p.x < fromX ? -145 : 145; p.vy = -190; p.pound = p.boost = 0;
  if (p.health <= 0) respawn(s, l); else s.events.push('hurt');
}
export function tick(s: State, l: Level, input: Controls) {
  s.events = []; if (s.won) return;
  s.ticks++;
  const p = s.player;
  const wantsCrouch = !!input.downHeld && p.grounded;
  const standingBlocked = () => collisionCandidates(s.tiles, p.x, WIDTH).some(tile => overlaps(p.x, p.y, WIDTH, HEIGHT, tile));
  if (wantsCrouch) { p.crouching = true; p.boost = 0; }
  else if (p.crouching && !standingBlocked()) p.crouching = false;
  const box = () => playerHitbox(p);
  const oldY = p.y; p.landing = Math.max(0, p.landing - 1);
  p.dashCooldown = Math.max(0, p.dashCooldown - 1);
  p.invulnerable = Math.max(0, p.invulnerable - 1); p.cooldown = Math.max(0, p.cooldown - 1); p.boost = Math.max(0, p.boost - 1);
  p.coyote = p.grounded ? 7 : Math.max(0, p.coyote - 1);
  p.buffer = input.jumpPressed ? 7 : Math.max(0, p.buffer - 1);
  if (input.direction && !p.dashCharging && !p.boost && !p.specialRecovery) p.facing = Math.sign(input.direction);
  const characterPowerConsumed=stepCharacterAbility(s,input);
  stepChargedDash(s,input);
  if (!characterPowerConsumed && !p.specialRecovery && !p.dashCharging && !p.crouching && input.powerPressed && p.power === 'turbo' && p.cooldown === 0 && p.dashCooldown === 0) { p.boost = 22; p.dashDuration=22;p.dashStrength=0; p.cooldown = 70; p.dashCooldown = 70; s.events.push('boost'); }
  if (!characterPowerConsumed && !p.specialRecovery && !p.dashCharging && input.powerPressed && p.power === 'ember' && !p.cooldown) { s.projectiles.push({ id: s.nextProjectile++, x: p.x + (p.facing > 0 ? WIDTH : -8), y: box().y + box().height / 2, vx: p.facing * 240, vy: -70, life: 120 }); p.cooldown = 22; s.events.push('fire'); }
  if (!p.specialRecovery && !p.dashCharging && !p.crouching && ((input.dashPressed && (!input.dashHeld || !p.grounded)) || (!characterPowerConsumed && input.powerPressed && p.power === 'none')) && !p.dashCooldown && !p.boost) { p.boost = p.power === 'turbo' ? 22 : 12;p.dashDuration=p.boost;p.dashStrength=0; p.vx = p.facing * (p.power === 'turbo' ? 320 : 250); p.dashCooldown = 70; s.events.push('boost'); }
  const target = p.dashCharging || p.specialRecovery ? 0 : p.crouching ? input.direction * 48 : p.boost ? p.facing * dashSpeed(p) : input.direction * (input.run ? 180 : 115);
  p.vx = p.crouching && !input.direction ? 0 : approach(p.vx, target, (p.grounded ? 1100 : 650) * STEP);
  if (!p.specialRecovery && !p.dashCharging && !p.crouching && p.buffer && p.coyote) { p.vy = -360; p.grounded = false; p.buffer = p.coyote = 0; s.events.push('jump'); }
  if (!input.jump && p.vy < -140) p.vy += 900 * STEP;
  if (input.downPressed && !p.grounded && p.pound === 0) { p.pound = 12; p.vy = -50; }
  if (p.pound > 1) { p.pound--; p.vx *= .7; } else if (p.pound === 1) { p.vy = 580; p.vx *= .8; }
  p.vy = Math.min(p.power === 'cloud' && input.jump && !p.pound ? 85 : 580, p.vy + (p.power === 'cloud' && input.jump && p.vy > 0 ? 200 : 1000) * STEP);
  p.x += p.vx * STEP;
  for (const tile of collisionCandidates(s.tiles, p.x, WIDTH)) if (overlaps(p.x, box().y, WIDTH, box().height, tile)) {
    if (p.boost && (((p.characterId??'aurel')==='aurel' && chargedAttackBreaks(tile.kind,p.dashStrength??0)) || (tile.kind==='weak'&&p.power==='turbo'))) { breakPowerBlock(s,tile); continue; }
    p.x = p.vx > 0 ? tile.x - WIDTH : tile.x + TILE; p.vx = 0;
  }
  p.x = Math.max(0, Math.min(l.width - WIDTH, p.x));
  const wasGrounded = p.grounded; p.grounded = false;
  p.y += p.vy * STEP;
  for (const tile of collisionCandidates(s.tiles, p.x, WIDTH)) if (overlaps(p.x, box().y, WIDTH, box().height, tile)) {
    if ((tile.kind === 'weak' || (tile.kind === 'reinforced' && p.power === 'cobalt')) && p.pound === 1 && p.vy > 0) { breakPowerBlock(s,tile); continue; }
    if (tile.content && p.vy < 0) { breakPowerBlock(s,tile); p.vy=0; continue; }
    if (p.vy > 0) { p.y = tile.y - HEIGHT; p.grounded = true; if (p.pound) s.events.push('pound'); p.pound = 0; }
    else if (p.vy < 0) p.y = tile.y + TILE - (p.crouching ? HEIGHT - CROUCH_HEIGHT : 0);
    p.vy = 0;
  }
  for (const enemy of s.enemies) stepEnemyDeath(enemy);
  for (const shot of s.projectiles) {
    shot.life--; shot.x += shot.vx * STEP;
    for (const tile of collisionCandidates(s.tiles, shot.x, 6)) if (overlaps(shot.x, shot.y, 6, 6, tile)) {
      if (tile.kind === 'ice') { breakPowerBlock(s,tile); }
      shot.life = 0;
    }
    shot.vy = Math.min(360, shot.vy + 700 * STEP); shot.y += shot.vy * STEP;
    for (const tile of collisionCandidates(s.tiles, shot.x, 6)) if (overlaps(shot.x, shot.y, 6, 6, tile)) {
      if (tile.kind === 'ice') { s.tiles.splice(s.tiles.indexOf(tile), 1); shot.life = 0; s.events.push('break'); }
      else if (shot.vy > 0) { shot.y = tile.y - 6; shot.vy = -190; } else shot.life = 0;
    }
    for (const enemy of s.enemies) if (shot.life > 0 && !enemy.defeated && overlaps(shot.x, shot.y, 6, 6, enemy, 20)) { shot.life = 0; if (!enemyBlocksShot(enemy, shot.x) && defeatEnemy(enemy)) { s.score += 250; s.events.push('stomp'); } }
  }
  s.projectiles = s.projectiles.filter(shot => shot.life > 0 && shot.y < 500);
  if (p.grounded && !wasGrounded) { p.landing = 5; s.events.push('land'); }
  for (const enemy of s.enemies) {
    if (enemy.defeated) continue;
    stepEnemy(enemy, p, s.tiles, shot => s.enemyProjectiles.push({ ...shot, id:s.nextEnemyProjectile++, life:150 }));
    if (overlaps(p.x, box().y, WIDTH, box().height, enemy, 20)) {
      if ((p.vy > 0 && oldY + HEIGHT <= enemy.y + 7) || (p.boost > 0 && (p.power === 'turbo' || (p.characterId??'aurel')==='aurel' || chargedDashDamage(p)>0))) {
        if(chargedDashDamage(p)){s.lastDashImpact={x:enemy.x+10,y:enemy.y+10,tick:s.ticks,strength:p.dashStrength??0};s.events.push('dash-impact');}
        defeatEnemy(enemy); s.score += 250; if(!chargedDashDamage(p))p.vy = -230; p.pound = 0; s.events.push('stomp');
      } else damage(s, l, enemy.x);
    }
    const bite=enemyAttackBox(enemy);
    if(bite && p.x<bite.x+bite.width && p.x+WIDTH>bite.x && box().y<bite.y+bite.height && box().y+box().height>bite.y)damage(s,l,enemy.x);
  }
  for(const shot of s.enemyProjectiles){
    shot.life--;shot.x+=shot.vx*STEP;
    if(collisionCandidates(s.tiles,shot.x,8).some(t=>overlaps(shot.x,shot.y,8,8,t)))shot.life=0;
    if(shot.life>0 && shot.x<p.x+WIDTH && shot.x+8>p.x && shot.y<box().y+box().height && shot.y+8>box().y){shot.life=0;damage(s,l,shot.x);}
  }
  s.enemyProjectiles=s.enemyProjectiles.filter(shot=>shot.life>0&&shot.x>=0&&shot.x<l.width);
  stepBoss(s, l, oldY, damage);
  for (const item of s.pickups) if (!item.collected && !item.blocked && s.ticks >= (item.availableAt ?? 0) && overlaps(p.x, box().y, WIDTH, box().height, item)) {
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
