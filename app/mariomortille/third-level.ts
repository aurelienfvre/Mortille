import type { Level, Tile, Pickup, Enemy } from './simulation';

/** Rooftop crossings are spaced for the equipped cloud glide (hold jump).
 * Each district has broad landing roofs, a fresh cloud and an optional balcony. */
export const cloudSections = [
  { name: 'Les premières antennes', row: 19, gaps: [[30, 8], [76, 9]], balcony: 54 },
  { name: 'La passerelle des pigeons', row: 18, gaps: [[28, 9], [78, 10]], balcony: 54 },
  { name: 'Les toits bleus', row: 19, gaps: [[32, 10], [80, 8]], balcony: 58 },
  { name: 'Le jardin suspendu', row: 18, gaps: [[28, 8], [76, 10]], balcony: 52 },
  { name: 'Le grand séchoir', row: 19, gaps: [[32, 9], [80, 10]], balcony: 58 },
  { name: 'Les cheminées blanches', row: 18, gaps: [[28, 10], [78, 9]], balcony: 54 },
  { name: 'Le belvédère du canal', row: 19, gaps: [[30, 8], [78, 10]], balcony: 54 },
  { name: 'Les terrasses fleuries', row: 18, gaps: [[28, 9], [78, 8]], balcony: 54 },
  { name: 'Le relais des nuages', row: 19, gaps: [[30, 10], [80, 10]], balcony: 58 },
  { name: 'Le dernier toit', row: 19, gaps: [[28, 9], [76, 10]], balcony: 54 },
];
const tiles: Tile[] = [], pickups: Pickup[] = [], enemies: Enemy[] = [];
for (const [i, section] of cloudSections.entries()) {
  const start = i * 112;
  for (let c = 0; c < 112; c++) {
    if (section.gaps.some(([a, width]) => c >= a && c < a + width)) continue;
    for (let row = section.row; row < 23; row++) tiles.push({ x: (start + c) * 16, y: row * 16, kind: 'ground' });
  }
  pickups.push({ id: `cloud-refill-${i}`, x: (start + 8) * 16, y: section.row * 16 - 24, kind: 'cloud', collected: false });
  const col = start + section.balcony;
  for (let c = col - 5; c < col - 2; c++) tiles.push({ x: c * 16, y: (section.row - 3) * 16, kind: 'brick' });
  for (let c = col; c < col + 8; c++) tiles.push({ x: c * 16, y: (section.row - 6) * 16, kind: 'brick' });
  for (let n = 1; n < 7; n += 2) pickups.push({ id: `cloud-balcony-${i}-${n}`, x: (col + n) * 16, y: (section.row - 8) * 16, kind: 'coin', collected: false });
  if ([1, 5, 8].includes(i)) pickups.push({ id: `cloud-secret-${i}`, x: (col + 4) * 16, y: (section.row - 7) * 16, kind: 'secret', collected: false });
  for (const [gap, width] of section.gaps) for (let n = 0; n < 3; n++) pickups.push({ id: `cloud-gap-${i}-${gap}-${n}`, x: (start + gap + n * (width / 2 - 1)) * 16, y: (section.row - 3) * 16, kind: 'coin', collected: false });
  const left = (start + 98) * 16, right = (start + 104) * 16;
  enemies.push({ id: `cloud-patrol-${i}`, x: left, y: section.row * 16 - 20, left, right, direction: i % 2 ? -1 : 1, defeated: false });
  // A patrol before take-off requires a jump before committing to the glide.
  const laneLeft = (start + 14) * 16, laneRight = (start + 19) * 16;
  enemies.push({ id: `cloud-takeoff-${i}`, x: laneRight, y: section.row * 16 - 20, left: laneLeft, right: laneRight, direction: -1, defeated: false });
}
export const thirdLevel: Level = { id: 'quartier-03', width: 1120 * 16, spawn: { x: 64, y: 240 }, tiles, pickups, enemies, checkpoint: 566 * 16, goal: 1114 * 16 };
// Cloud is the only available power: the real maximum horizontal speed is 180.
export const thirdLevelTiming = { minimumTravelSeconds: (thirdLevel.goal - thirdLevel.spawn.x) / 180 };
