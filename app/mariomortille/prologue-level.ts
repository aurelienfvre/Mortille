import type { Level, Tile, Pickup, Enemy } from './simulation';

export const prologueHints = [
  { fromX: 0, toX: 1536, title: 'Bienvenue, Aurélien', text: '← → ou Q D : marche. Ramasse les pièces devant toi.' },
  { fromX: 1536, toX: 3072, title: 'Un petit saut', text: '↑ ou ESPACE : saute. Maintiens la touche pour monter plus haut.' },
  { fromX: 3072, toX: 4096, title: 'Prends de la vitesse', text: 'MAJ : cours. Saute sur le premier garde pour le repousser.' },
  { fromX: 4096, toX: 6144, title: 'Équipe Turbo', text: 'Ramasse Turbo, puis X : fonce à travers les blocs fissurés.' },
  { fromX: 6144, toX: 8192, title: 'Frappe le sol', text: 'Saute au-dessus du plancher fissuré, puis ↓ ou S pour le casser.' },
  { fromX: 8192, toX: 10496, title: 'Les braises', text: 'Ramasse Braise. X fait fondre la glace ; saute et tire pour viser plus haut.' },
  { fromX: 10496, toX: 13312, title: 'Plane avec Nuage', text: 'Ramasse Nuage. Cours, saute et maintiens ↑ ou ESPACE au-dessus du bassin.' },
  { fromX: 13312, toX: 15616, title: 'L’armure Cobalt', text: 'Ramasse Cobalt. Saute, puis ↓ ou S sur le plancher blindé.' },
  { fromX: 15616, toX: 17280, title: 'Tu es prêt !', text: 'Dernier garde : saute sur lui, puis rejoins le drapeau et la carte du monde.' },
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
// Encounters only begin after the initial walking and jumping lessons.
// Each lane is flat with space before and after it, outside mandatory gates.
export const prologueEncounters = [
  { id: 'first-stomp', left: 3456, span: 48 },
  { id: 'turbo-charge', left: 5408, span: 64 },
  { id: 'after-smash', left: 7840, span: 80 },
  { id: 'ember-target', left: 9728, span: 96 },
  { id: 'cloud-landing', left: 12288, span: 80 },
  { id: 'final-guard', left: 16384, span: 96 },
];
const enemies: Enemy[] = prologueEncounters.map((e, i) => ({ kind: (['guard','rover','pest','guard','pest','guard'] as const)[i], id: `tutorial-enemy-${e.id}`, x: e.left + (i % 2 ? e.span : 0), y: 284, left: e.left, right: e.left + e.span, direction: i % 2 ? -1 : 1, defeated: false }));
// Five isolated introductions on long flat lanes, clear of gates and landing zones.
for(const [kind,x] of [['crab',3856],['plant',6304],['cat',10160],['imp',13024],['beetle',15360]] as const)
 enemies.push({kind,id:`tutorial-themed-${kind}`,x,y:284,left:x,right:x+(kind==='plant'||kind==='cat'?0:48),direction:-1,defeated:false});
// Low stacks repeat the jump after it has been taught; no new power locks.
for (const x of [3264, 5664, 11904, 12704, 16064, 16704]) for (let c = 0; c < 2; c++) for (const y of [272, 288]) tiles.push({ x: x + c * 16, y, kind: 'brick' });
// Lift the whole tutorial by32px: even the safe lower basin stays inside the360px camera.
const verticalOffset = 32;
export const prologueLevel: Level & { title: string } = {
  id: 'prologue', title: 'Premiers pas avec Aurélien', width, spawn: { x: 64, y: 262 - verticalOffset },
  tiles: tiles.map(t => ({ ...t, y: t.y - verticalOffset })),
  pickups: pickups.map(p => ({ ...p, y: p.y - verticalOffset })), enemies: enemies.map(e => ({ ...e, y: e.y - verticalOffset })), checkpoint: 8240, goal: width - 96,
};
export const prologueMechanics = { turboWall: 4800, weakFloor: 7168, iceWall: 9024, cloudGap: { from: 11136, to: 11328 }, cobaltFloor: 14336 };
