import type { Level, Tile, Pickup } from './simulation';

export const prologueHints = [
  { fromX: 0, toX: 1536, title: 'Bienvenue, Aurélien', text: '← → ou Q D : marche. Ramasse les pièces devant toi.' },
  { fromX: 1536, toX: 3072, title: 'Un petit saut', text: '↑ ou ESPACE : saute. Maintiens la touche pour monter plus haut.' },
  { fromX: 3072, toX: 4096, title: 'Prends de la vitesse', text: 'Maintiens MAJ en avançant pour courir.' },
  { fromX: 4096, toX: 6144, title: 'Équipe Turbo', text: 'Ramasse Turbo, puis X : fonce à travers les blocs fissurés.' },
  { fromX: 6144, toX: 8192, title: 'Frappe le sol', text: 'Saute au-dessus du plancher fissuré, puis ↓ ou S pour le casser.' },
  { fromX: 8192, toX: 10496, title: 'Les braises', text: 'Ramasse Braise. X fait fondre la glace ; saute et tire pour viser plus haut.' },
  { fromX: 10496, toX: 13312, title: 'Plane avec Nuage', text: 'Ramasse Nuage. Cours, saute et maintiens ↑ ou ESPACE au-dessus du bassin.' },
  { fromX: 13312, toX: 15616, title: 'L’armure Cobalt', text: 'Ramasse Cobalt. Saute, puis ↓ ou S sur le plancher blindé.' },
  { fromX: 15616, toX: 17280, title: 'Tu es prêt !', text: 'Rejoins le drapeau. La campagne t’attend ensuite sur la carte du monde.' },
];
const tiles: Tile[] = [], pickups: Pickup[] = [];
const width = 17280;
// Both breakable tutorial floors have a solid lower landing and a stair exit.
const pits = [{ start: 7168, end: 7488, kind: 'weak' as const }, { start: 14336, end: 14656, kind: 'reinforced' as const }];
for (let x = 0; x < width; x += 16) {
  const pit = pits.find(p => x >= p.start && x < p.end);
  let top = 304;
  if (pit) top = x < pit.start + 176 ? 368 : x < pit.start + 224 ? 352 : x < pit.start + 272 ? 336 : 320;
  // A missed glide lands in a shallow basin, with a stairway back to the path.
  if (x >= 11136 && x < 11328) top = x < 11184 ? 384 : x < 11216 ? 368 : x < 11248 ? 352 : x < 11280 ? 336 : 320;
  for (let y = top; y < 432; y += 16) tiles.push({ x, y, kind: 'ground' });
}
for (const x of [1792, 2240, 2672]) for (let c = 0; c < 3; c++) tiles.push({ x: x + c * 16, y: 288, kind: 'brick' });
for (let y = 176; y < 304; y += 16) tiles.push({ x: 4800, y, kind: 'weak' });
for (const pit of pits) {
  for (let x = pit.start; x < pit.start + 144; x += 16) tiles.push({ x, y: 304, kind: pit.kind });
  // Too high to jump: the safe way onwards is through the taught downward strike.
  for (let y = 160; y < 304; y += 16) tiles.push({ x: pit.start + 144, y, kind: 'brick' });
}
for (let y = 224; y < 304; y += 16) tiles.push({ x: 9024, y, kind: 'ice' });
for (const [kind, positions] of [
  ['turbo', [4256, 4544]], ['none', [6048]], ['ember', [8352, 8832]],
  ['cloud', [10656, 10976]], ['cobalt', [13472, 14048]],
] as const) for (const x of positions) pickups.push({ id: `tutorial-${kind}-${x}`, x, y: 280, kind, collected: false });
for (let x = 192; x < width - 160; x += 240) {
  if (pits.some(p => x >= p.start - 32 && x < p.end + 32) || x >= 11072 && x < 11552 || Math.abs(x - 4800) < 64 || Math.abs(x - 9024) < 64) continue;
  pickups.push({ id: `tutorial-coin-${x}`, x, y: 280, kind: 'coin', collected: false });
}
export const prologueLevel: Level & { title: string } = {
  id: 'prologue', title: 'Premiers pas avec Aurélien', width, spawn: { x: 64, y: 262 },
  tiles, pickups, enemies: [], checkpoint: 8240, goal: width - 96,
};
export const prologueMechanics = { turboWall: 4800, weakFloor: 7168, iceWall: 9024, cloudGap: { from: 11136, to: 11328 }, cobaltFloor: 14336 };
