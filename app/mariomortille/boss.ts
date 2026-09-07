import type { State, Level } from './simulation';
export type Boss = { kind: 'raphael'; x: number; y: number; direction: number; health: number; phase: 'tell' | 'charge' | 'stunned' | 'recover' | 'defeated'; timer: number; hits: number };
export function makeBoss(level?: Level): Boss { return { kind: 'raphael', x: (level ? Math.max(0, level.width - 1024) : 0) + 720, y: 224, direction: -1, health: 4, phase: 'tell', timer: 100, hits: 0 }; }
/** Attacks lock their direction during the tell, leaving room to evade the charge. */
export function stepBoss(s: State, l: Level, oldY: number, hurt: (s: State, l: Level, fromX: number) => void) {
  const b = s.boss; if (!b || b.phase === 'defeated') return;
  const p = s.player;
  const origin = Math.max(0, l.width - 1024);
  if (p.x < origin + 80) return;
  b.timer--;
  if (b.phase === 'tell' && b.timer <= 0) { b.phase = 'charge'; b.timer = 150; }
  else if (b.phase === 'charge') {
    b.x += b.direction * (b.health <= 2 ? 4.6 : 3.6);
    if (b.x < origin + 150 || b.x > origin + 790 || b.timer <= 0) { b.x = Math.max(origin + 150, Math.min(origin + 790, b.x)); b.phase = 'stunned'; b.timer = 105; b.y = 256; }
  } else if (b.phase === 'stunned' && b.timer <= 0) { b.phase = 'recover'; b.timer = 40; b.y = 224; }
  else if (b.phase === 'recover' && b.timer <= 0) { b.phase = 'tell'; b.timer = b.health <= 2 ? 55 : 80; b.direction = p.x < b.x ? -1 : 1; }
  const contact = p.x < b.x + 32 && p.x + 20 > b.x && p.y < 304 && p.y + 42 > b.y;
  const stomp = contact && p.vy > 0 && oldY + 42 <= b.y + 8;
  const fire = s.projectiles.find(shot => shot.x < b.x + 32 && shot.x + 6 > b.x && shot.y < 304 && shot.y + 6 > b.y);
  if (b.phase === 'stunned' && (stomp || fire)) {
    if (fire) fire.life = 0;
    b.health--; b.hits++; s.events.push('stomp');
    if (stomp) { p.vy = -310; p.pound = 0; p.invulnerable = 30; }
    b.y = 224; b.phase = b.health ? 'recover' : 'defeated'; b.timer = 55;
    if (!b.health) s.score += 2500;
  } else if (contact) hurt(s, l, b.x);
}
