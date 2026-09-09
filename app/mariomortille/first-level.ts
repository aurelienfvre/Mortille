import { boxLevelPowers } from './power-blocks';
import { themeEnemies } from './enemy-roster';
import type { Level, Tile, Pickup, Enemy } from './simulation';

/** Distances are authored in 16px columns. The route is continuous, with no timed gates. */
export const gardenSections = [
  { name: 'Le départ', from: 0, to: 184, row: 19, gaps: [[40, 44], [92, 95], [148, 152]], shelves: [[18, 15, 7], [71, 14, 10], [126, 15, 8]] },
  { name: 'Les potagers', from: 184, to: 368, row: 18, gaps: [[212, 215], [263, 267], [330, 333]], shelves: [[196, 14, 9], [240, 13, 7], [297, 14, 11]] },
  { name: 'Le canal', from: 368, to: 552, row: 19, gaps: [[396, 400], [424, 428], [458, 462], [501, 505]], shelves: [[379, 15, 8], [477, 15, 9], [530, 14, 8]] },
  { name: 'Les serres', from: 552, to: 736, row: 18, gaps: [[584, 587], [654, 658], [706, 709]], shelves: [[563, 14, 10], [611, 14, 8], [622, 11, 8], [681, 14, 8]] },
  { name: 'Le verger', from: 736, to: 920, row: 19, gaps: [[774, 778], [831, 834], [879, 883]], shelves: [[748, 15, 9], [807, 14, 8], [855, 15, 9], [900, 14, 9]] },
  { name: 'La place du village', from: 920, to: 1104, row: 19, gaps: [[977, 981], [1064, 1068]], shelves: [[943, 15, 9], [1011, 15, 9], [1022, 12, 8]] },
  { name: 'Les terrasses', from: 1104, to: 1288, row: 18, gaps: [[1140, 1144], [1187, 1190], [1244, 1248]], shelves: [[1118, 14, 9], [1165, 13, 8], [1216, 14, 10], [1266, 13, 8]] },
  { name: 'Le vieux moulin', from: 1288, to: 1472, row: 19, gaps: [[1323, 1326], [1371, 1375], [1438, 1442]], shelves: [[1299, 15, 8], [1350, 14, 7], [1399, 15, 9], [1410, 12, 8]] },
  { name: 'Les jardins suspendus', from: 1472, to: 1656, row: 18, gaps: [[1506, 1510], [1561, 1564], [1620, 1624]], shelves: [[1484, 14, 9], [1535, 13, 10], [1590, 14, 9], [1638, 13, 8]] },
  { name: 'Le belvédère', from: 1656, to: 1848, row: 19, gaps: [[1689, 1693], [1742, 1746], [1789, 1792]], shelves: [[1668, 15, 8], [1717, 14, 9], [1769, 15, 8], [1810, 14, 10]] },
];
const tiles: Tile[] = [], pickups: Pickup[] = [], enemies: Enemy[] = [];
for (const [index, section] of gardenSections.entries()) {
  for (let c = section.from; c < section.to; c++) {
    if (section.gaps.some(([a,b]) => c >= a && c < b)) continue;
    for (let row = section.row; row < 23; row++) tiles.push({ x: c * 16, y: row * 16, kind: 'ground' });
  }
  for (const [shelf, [column, row, length]] of section.shelves.entries()) {
    const kind = index === 3 && shelf === 1 ? 'weak' : 'brick';
    // A full jump rises ~62px: give every elevated shelf a 48px access step.
    // Higher chained shelves already connect to their preceding balcony.
    if (section.row - row > 3 && section.row - row <= 5) {
      for (let c = column - 5; c < column - 2; c++) tiles.push({ x: c * 16, y: (section.row - 3) * 16, kind: 'brick' });
    }
    for (let c = column; c < column + length; c++) tiles.push({ x: c * 16, y: row * 16, kind });
    for (let c = column + 1; c < column + length - 1; c += 2) pickups.push({ id: `garden-${index}-${shelf}-${c}`, x: c * 16, y: (row - 2) * 16, kind: 'coin', collected: false });
  }
  // Coins describe the jump arcs over each short gap, not invisible mandatory waits.
  for (const [gap, [a,b]] of section.gaps.entries()) for (let n = 0; n < 3; n++) pickups.push({ id: `gap-${index}-${gap}-${n}`, x: (a - 1 + n * ((b - a + 2) / 2)) * 16, y: (section.row - (n === 1 ? 4 : 3)) * 16, kind: 'coin', collected: false });
  // Ground-level refills automatically equip turbo; never require menu manipulation.
  pickups.push({ id: `turbo-garden-${index}`, x: (section.from + 8) * 16, y: section.row * 16 - 24, kind: 'turbo', collected: false });
  const left = (section.to - 22) * 16, right = (section.to - 15) * 16;
  enemies.push({ id: `garden-patrol-${index}`, x: left, y: section.row * 16 - 20, left, right, direction: index % 2 ? 1 : -1, defeated: false });

}
/** Jump combinations in the clear lanes; all rises fit the normal jump. */
export const gardenObstacles = [
  { column: 54, heights: [2, 2], kind: 'brick' },
  { column: 112, heights: [1, 1, 1], kind: 'brick' },
  { column: 226, heights: [1, 2, 3], kind: 'brick' },
  { column: 311, heights: [2, 2], kind: 'brick' },
  { column: 440, heights: [3, 3], kind: 'brick' },
  { column: 598, heights: [2, 2], kind: 'brick' },
  { column: 670, heights: [2, 2, 2], kind: 'weak' },
  { column: 789, heights: [2, 2, 2], kind: 'brick' },
  { column: 866, heights: [1, 2, 3], kind: 'brick' },
  { column: 988, heights: [2, 2], kind: 'brick' },
  { column: 1151, heights: [2, 2, 2], kind: 'brick' },
  { column: 1232, heights: [2, 2], kind: 'weak' },
  { column: 1337, heights: [2, 2], kind: 'brick' },
  { column: 1383, heights: [1, 2, 3], kind: 'brick' },
  { column: 1517, heights: [3, 3], kind: 'brick' },
  { column: 1607, heights: [2, 2, 2], kind: 'weak' },
  { column: 1706, heights: [2, 2], kind: 'brick' },
  { column: 1800, heights: [1, 2, 3], kind: 'brick' },
] as const;
for (const obstacle of gardenObstacles) {
  const section = gardenSections.find(s => obstacle.column >= s.from && obstacle.column < s.to)!;
  for (const [offset, height] of obstacle.heights.entries()) for (let rise = 1; rise <= height; rise++) {
    tiles.push({ x: (obstacle.column + offset) * 16, y: (section.row - rise) * 16, kind: obstacle.kind });
  }
}
// Optional ground-pound roofs: coins underneath, solid floor and open side exits.
export const gardenSmashRoofs = [514, 1040];
for (const column of gardenSmashRoofs) {
  const section = gardenSections.find(s => column >= s.from && column < s.to)!;
  for (let offset = 0; offset < 5; offset++) {
    tiles.push({ x: (column + offset) * 16, y: (section.row - 3) * 16, kind: 'weak' });
    pickups.push({ id: `smash-garden-${column}-${offset}`, x: (column + offset) * 16, y: (section.row - 1) * 16, kind: 'coin', collected: false });
  }
  tiles.push({ x: (column - 2) * 16, y: (section.row - 2) * 16, kind: 'brick' });
}
// Exit pairs have a full clear lane between patrols, away from gap landings.
for (const [index, section] of gardenSections.entries()) {
  const left = (section.to - 8) * 16, right = (section.to - 4) * 16;
  enemies.push({ id: `garden-exit-guard-${index}`, x: right, y: section.row * 16 - 20, left, right, direction: -1, defeated: false });
}
for (const [i, [column, row]] of [[76,12], [625,9], [1413,10]].entries()) pickups.push({ id: `secret-${i+1}`, x: column * 16, y: row * 16, kind: 'secret', collected: false });

export const firstLevel: Level = {
  boss: 'pirate', id: 'quartier-01', width: 1848 * 16, spawn: { x: 64, y: 240 }, tiles, pickups, enemies,
  checkpoint: 924 * 16, goal: 1840 * 16,
};

/** Even a hypothetical permanent 320px/s boost cannot cross the route in under 90s. */
export const firstLevelTiming = {
  absoluteSpeedCeiling: 320,
  minimumTravelSeconds: (firstLevel.goal - firstLevel.spawn.x) / 320,
  unobstructedSprintSeconds: (firstLevel.goal - firstLevel.spawn.x) / 180,
};

firstLevel.enemies = themeEnemies(firstLevel);

boxLevelPowers(firstLevel);
