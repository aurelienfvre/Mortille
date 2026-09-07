import type { Level, Tile, Pickup, Enemy } from './simulation';

/** A final promenade through eight distinct courtyards before the rooftop duel. */
export const finaleSections = ['La porte du quartier', 'Les arches', 'Le canal haut', 'Les terrasses', 'Les jardins suspendus', 'La rue des lanternes', 'Le dernier pont', 'La montée du guetteur'];
const tiles: Tile[] = [], pickups: Pickup[] = [], enemies: Enemy[] = [];
for (let i = 0; i < finaleSections.length; i++) {
  const start = i * 128, row = i % 3 === 1 ? 18 : 19;
  for (let c = 0; c < 128; c++) {
    if ((c >= 34 && c < 37) || (i % 2 === 0 && c >= 89 && c < 93)) continue;
    for (let r = row; r < 23; r++) tiles.push({ x: (start + c) * 16, y: r * 16, kind: 'ground' });
  }
  // Optional raised lookout with a safe main route beneath it.
  for (let c = 53; c < 58; c++) tiles.push({ x: (start + c) * 16, y: (row - 3) * 16, kind: 'brick' });
  for (let c = 61; c < 68; c++) tiles.push({ x: (start + c) * 16, y: (row - 6) * 16, kind: 'brick' });
  if ([1, 3, 6].includes(i)) pickups.push({ id: `final-secret-${i}`, x: (start + 64) * 16, y: (row - 8) * 16, kind: 'secret', collected: false });
  for (const c of [16, 28, 43, 76, 100]) pickups.push({ id: `final-coin-${i}-${c}`, x: (start + c) * 16, y: row * 16 - 32, kind: 'coin', collected: false });
  pickups.push({ id: `final-ember-${i}`, x: (start + 8) * 16, y: row * 16 - 24, kind: 'ember', collected: false });
  const left = (start + 110) * 16, right = (start + 119) * 16;
  enemies.push({ id: `final-patrol-${i}`, x: left, y: row * 16 - 20, left, right, direction: i % 2 ? -1 : 1, defeated: false });
  // Two encounters before each courtyard exit, distinct from the final boss.
  for (const [n, [a, b]] of [[14, 21], [72, 79]].entries()) {
    const left = (start + a) * 16, right = (start + b) * 16;
    enemies.push({ id: `final-encounter-${i}-${n}`, x: n ? left : right, y: row * 16 - 20, left, right, direction: n ? 1 : -1, defeated: false });
  }
}
export const finaleArenaStart = 1024 * 16;
for (let c = 1024; c < 1088; c++) for (let r = 19; r < 23; r++) tiles.push({ x: c * 16, y: r * 16, kind: 'ground' });
pickups.push({ id: 'final-arena-ember', x: finaleArenaStart + 32, y: 280, kind: 'ember', collected: false });
export const fifthLevel: Level = { id: 'quartier-05', width: 1088 * 16, spawn: { x: 64, y: 240 }, tiles, pickups, enemies, checkpoint: finaleArenaStart + 64, goal: 1082 * 16, boss: 'raphael' };
export const fifthLevelTiming = { minimumTravelSeconds: (fifthLevel.goal - fifthLevel.spawn.x) / 180 };
