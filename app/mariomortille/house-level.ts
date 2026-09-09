import type { Level, Player, Tile } from './simulation';
/** Optional interior: its counters are separate and must never feed the outdoor ranking. */
export const houseEntrance = {
 id: 'maison-jardins', levelId: 'quartier-01', x: 504, y: 304, radius: 28,
 bounds: { x: 476, y: 244, width: 56, height: 60 },
 exterior: { x: 416, y: 112, width: 176, height: 192 },
 returnSpawn: { x: 494, y: 262 },
};
export const houseExit = { x: 74, y: 264, radius: 30, bounds: { x: 44, y: 204, width: 60, height: 60 } };
export const houseArt = {
 exterior: '/mariomortille/house/exterior.png', facade: '/mariomortille/house/facade.png',
 roof: '/mariomortille/house/roof.png', door: '/mariomortille/house/door.png',
 opening: '/mariomortille/house/opening.png', interior: '/mariomortille/house/interior.png',
};
const tiles: Tile[] = [];
for (let x = 0; x < 640; x += 16) for (let y = 264; y < 360; y += 16) tiles.push({ x, y, kind: 'ground' });
for (let y = 0; y < 264; y += 16) for (const x of [0,624]) tiles.push({ x, y, kind: 'ground' });
// Match the visible tops of the generated room's two wooden shelves exactly.
export const housePlatforms = [{ x: 232, y: 218, width: 48 }, { x: 288, y: 174, width: 160 }];
for (const shelf of housePlatforms) for (let x = shelf.x; x < shelf.x + shelf.width; x += 16) tiles.push({ x, y: shelf.y, kind: 'brick' });
export const houseLevel: Level & { title: string } = {
 id: houseEntrance.id, title: 'La maison des jardins', width: 640,
 spawn: { x: 64, y: 222 }, tiles, enemies: [],
 pickups: [
  { id: 'house-floor', x: 160, y: 240, kind: 'coin', collected: false },
  { id: 'house-step', x: 248, y: 194, kind: 'coin', collected: false },
  { id: 'house-loft', x: 368, y: 150, kind: 'coin', collected: false },
 ],
 // Finite sentinels keep data serializable; E at the door, not a goal flag, exits.
 checkpoint: 1000000, goal: 1000000,
};
const nearDoor = (p: Pick<Player,'x'|'y'|'grounded'>, door: { x:number; y:number; radius:number }) =>
 p.grounded && Math.abs(p.x + 10 - door.x) <= door.radius && Math.abs(p.y + 42 - door.y) <= 5;
export const canEnterHouse = (p: Pick<Player,'x'|'y'|'grounded'>, levelId: string) => levelId === houseEntrance.levelId && nearDoor(p, houseEntrance);
export const canExitHouse = (p: Pick<Player,'x'|'y'|'grounded'>) => nearDoor(p, houseExit);
export type HouseTransition = { mode: 'outside'|'entering'|'inside'|'leaving'; elapsed:number };
export const createHouseTransition = (): HouseTransition => ({ mode:'outside', elapsed:0 });
/** E must be edge-triggered by the caller, so holding it cannot enter and immediately exit. */
export function requestHouseTransition(s:HouseTransition, player:Pick<Player,'x'|'y'|'grounded'>, levelId:string){
 if(s.mode==='outside'&&canEnterHouse(player,levelId)){s.mode='entering';s.elapsed=0;return true;}
 if(s.mode==='inside'&&canExitHouse(player)){s.mode='leaving';s.elapsed=0;return true;}
 return false;
}
/** Returns one callback event at the midpoint; does not mutate either simulation. */
export function advanceHouseTransition(s:HouseTransition, dt:number):'entered'|'exited'|null{
 if(s.mode!=='entering'&&s.mode!=='leaving')return null;
 s.elapsed+=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;
 if(s.elapsed<.35)return null;
 const entered=s.mode==='entering';s.mode=entered?'inside':'outside';s.elapsed=0;return entered?'entered':'exited';
}
