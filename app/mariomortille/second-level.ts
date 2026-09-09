import { boxLevelPowers } from './power-blocks';
import { themeEnemies } from './enemy-roster';
import type { Level, Tile, Pickup, Enemy } from './simulation';

/** Braises is a fire-power route: thaw gates, cross canals, then climb balconies. */
export const emberSections = [
  { name: 'La ruelle gelée', row: 19, gaps: [44, 108], balconies: [70] },
  { name: 'Les arcades', row: 18, gaps: [38, 92, 136], balconies: [58, 112] },
  { name: 'Les canaux froids', row: 19, gaps: [32, 66, 102, 140], balconies: [80] },
  { name: 'Le marché couvert', row: 19, gaps: [48, 116], balconies: [70, 132] },
  { name: 'Les escaliers de brique', row: 18, gaps: [42, 102, 140], balconies: [60, 120] },
  { name: 'La cour des verriers', row: 19, gaps: [38, 86, 132], balconies: [56, 106] },
  { name: 'Les passerelles', row: 18, gaps: [32, 66, 104, 140], balconies: [80] },
  { name: 'Les ateliers', row: 19, gaps: [44, 118], balconies: [66, 136] },
  { name: 'La promenade', row: 18, gaps: [38, 100, 138], balconies: [58, 116] },
  { name: 'La place des braises', row: 19, gaps: [48, 108], balconies: [70, 128] },
];
const tiles: Tile[] = [], pickups: Pickup[] = [], enemies: Enemy[] = [];
for (const [i, section] of emberSections.entries()) {
  const start = i * 184;
  for (let c = 0; c < 184; c++) {
    if (section.gaps.some(a => c >= a && c < a + 3)) continue;
    for (let row = section.row; row < 23; row++) tiles.push({ x: (start + c) * 16, y: row * 16, kind: 'ground' });
  }
  pickups.push({ id: `ember-refill-${i}`, x: (start + 8) * 16, y: section.row * 16 - 24, kind: 'ember', collected: false });
  // Two low thawable blocks teach fire without creating an unrecoverable power lock.
  for (let row = section.row - 2; row < section.row; row++) tiles.push({ x: (start + 24) * 16, y: row * 16, kind: 'ice' });
  for (const [j, local] of section.balconies.entries()) {
    const col = start + local;
    for (let c = col - 5; c < col - 2; c++) tiles.push({ x: c * 16, y: (section.row - 3) * 16, kind: 'brick' });
    for (let c = col; c < col + 8; c++) tiles.push({ x: c * 16, y: (section.row - 6) * 16, kind: 'brick' });
    for (let n = 1; n < 7; n += 2) pickups.push({ id: `ember-balcony-${i}-${j}-${n}`, x: (col + n) * 16, y: (section.row - 8) * 16, kind: 'coin', collected: false });
    if (j === 0 && [1, 5, 8].includes(i)) pickups.push({ id: `ember-secret-${i}`, x: (col + 4) * 16, y: (section.row - 7) * 16, kind: 'secret', collected: false });
  }
  for (const gap of section.gaps) for (let n = 0; n < 3; n++) pickups.push({ id: `ember-gap-${i}-${gap}-${n}`, x: (start + gap - 1 + n * 2) * 16, y: (section.row - (n === 1 ? 4 : 3)) * 16, kind: 'coin', collected: false });
  const left = (start + 160) * 16, right = (start + 170) * 16;
  enemies.push({ id: `ember-patrol-${i}`, x: left, y: section.row * 16 - 20, left, right, direction: i % 2 ? -1 : 1, defeated: false });
  // Fire encounters before the thaw gate and in the last approach corridor.
  const laneLeft = (start + 148) * 16, laneRight = (start + 152) * 16;
  enemies.push({ id: `ember-lane-${i}`, x: laneRight, y: section.row * 16 - 20, left: laneLeft, right: laneRight, direction: -1, defeated: false });
  const approachLeft = (start + 12) * 16, approachRight = approachLeft + 4 * 16;
  enemies.push({ id: `ember-approach-${i}`, x: approachRight, y: section.row * 16 - 20, left: approachLeft, right: approachRight, direction: -1, defeated: false });
}
export const secondLevel: Level = { boss: 'lola', id: 'quartier-02', width: 1840 * 16, spawn: { x: 64, y: 240 }, tiles, pickups, enemies, checkpoint: 926 * 16, goal: 1834 * 16 };
export const secondLevelTiming = { minimumTravelSeconds: (secondLevel.goal - secondLevel.spawn.x) / 320 };

secondLevel.enemies = themeEnemies(secondLevel);

boxLevelPowers(secondLevel);
