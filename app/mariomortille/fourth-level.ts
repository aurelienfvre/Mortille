import { boxLevelPowers } from './power-blocks';
import { themeEnemies } from './enemy-roster';
import type { Level, Tile, Pickup, Enemy } from './simulation';

/** Worksite terraces have a walkable lower bypass under every smash deck.
 * Losing Cobalt never traps a player; the next yard offers a fresh pair of boots. */
export const cobaltSections = [
  { name: 'La cour des outils', row: 20, gap: 30 },
  { name: 'Le premier coffrage', row: 20, gap: 78 },
  { name: 'Les palettes du canal', row: 19, gap: 32 },
  { name: 'Les fondations', row: 20, gap: 76 },
  { name: 'Le hangar aux poutres', row: 20, gap: 80 },
  { name: 'Les échafaudages', row: 19, gap: 28 },
  { name: 'La cour de livraison', row: 20, gap: 78 },
  { name: 'La chambre du contremaître', row: 20, gap: 80 },
  { name: 'Le viaduc en chantier', row: 19, gap: 30 },
  { name: 'La passerelle terminée', row: 20, gap: 76 },
];
const tiles: Tile[] = [], pickups: Pickup[] = [], enemies: Enemy[] = [];
for (const [i, section] of cobaltSections.entries()) {
  const start = i * 112, r = section.row;
  for (let c = 0; c < 112; c++) {
    if ((c >= section.gap && c < section.gap + 3) || ([2, 5, 8].includes(i) && c >= 80 && c < 84)) continue;
    for (let row = r; row < 23; row++) tiles.push({ x: (start + c) * 16, y: row * 16, kind: 'ground' });
  }
  // Delivery yards have low pallet stacks; viaduct districts have two crossings.
  if ([3, 6, 9].includes(i)) for (let c = 18; c < 22; c++) tiles.push({ x: (start + c) * 16, y: (r - 2) * 16, kind: 'brick' });
  pickups.push({ id: `cobalt-refill-${i}`, x: (start + 8) * 16, y: r * 16 - 24, kind: 'cobalt', collected: false });
  // Two reachable 48px tiers; a 96px clearance below the smash deck.
  for (let c = 43; c < 47; c++) tiles.push({ x: (start + c) * 16, y: (r - 3) * 16, kind: 'brick' });
  for (let c = 50; c < 58; c++) tiles.push({ x: (start + c) * 16, y: (r - 6) * 16, kind: 'reinforced' });
  for (let c = 60; c < 64; c++) tiles.push({ x: (start + c) * 16, y: (r - 3) * 16, kind: 'brick' });
  if ([1, 4, 7].includes(i)) pickups.push({ id: `cobalt-secret-${i}`, x: (start + 54) * 16, y: (r - 4) * 16, kind: 'secret', collected: false });
  for (const c of [18, 24, 50, 56, 88]) {
    // Keep the first reward above the delivery pallets, not inside their tile.
    const elevation = c >= 50 && c <= 56 ? 8 : c === 18 && [3, 6, 9].includes(i) ? 4 : 2;
    pickups.push({ id: `cobalt-coin-${i}-${c}`, x: (start + c) * 16, y: (r - elevation) * 16, kind: 'coin', collected: false });
  }
  const left = (start + 97) * 16, right = (start + 103) * 16;
  enemies.push({ id: `cobalt-patrol-${i}`, x: left, y: r * 16 - 20, left, right, direction: i % 2 ? -1 : 1, defeated: false });
  // A yard patrol adds a jump before the pallet and smash-deck sequence.
  const yardLeft = (start + 11) * 16, yardRight = (start + 15) * 16;
  enemies.push({ id: `cobalt-yard-${i}`, x: yardRight, y: r * 16 - 20, left: yardLeft, right: yardRight, direction: -1, defeated: false });
}
export const fourthLevel: Level = { boss: 'raphael', id: 'quartier-04', width: 1120 * 16, spawn: { x: 64, y: 250 }, tiles, pickups, enemies, checkpoint: 566 * 16, goal: 1114 * 16 };
export const fourthLevelTiming = { minimumTravelSeconds: (fourthLevel.goal - fourthLevel.spawn.x) / 180 };

fourthLevel.enemies = themeEnemies(fourthLevel);

boxLevelPowers(fourthLevel);
