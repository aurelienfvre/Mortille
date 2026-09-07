import { strict as assert } from 'node:assert';
import { secondLevel, secondLevelTiming, emberSections } from '../../app/mariomortille/second-level.ts';
import { createState, tick, WIDTH, HEIGHT } from '../../app/mariomortille/simulation.ts';

assert.ok(secondLevelTiming.minimumTravelSeconds >= 90);
assert.equal(emberSections.length, 10);
assert.equal(secondLevel.pickups.filter(p => p.kind === 'secret').length, 3);

// A real 60 Hz traversal, with no teleportation, invulnerability, removed enemies,
// or changes to physics. This follows the main route, not all optional secrets.
const state = createState(secondLevel);
const floor = new Map();
for (const tile of secondLevel.tiles) if (tile.kind === 'ground') floor.set(tile.x / 16, Math.min(floor.get(tile.x / 16) ?? Infinity, tile.y));
let hurts = 0, jumps = 0, checkpointEvents = 0, breaks = 0, shots = 0;
for (let frame = 0; frame < 180 * 60 && !state.won; frame++) {
  const p = state.player;
  const ahead = Math.floor((p.x + WIDTH + 34) / 16);
  const height = floor.get(ahead);
  const stepAhead = secondLevel.tiles.some(t => t.kind !== 'ground' && t.x > p.x + WIDTH && t.x < p.x + WIDTH + 38 && t.y < p.y + HEIGHT && t.y + 16 > p.y);
  const terrainJump = height === undefined || height < p.y + HEIGHT - 3 || stepAhead;
  const enemyJump = state.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 64 && Math.abs(e.y + 20 - p.y - HEIGHT) < 20);
  tick(state, secondLevel, { direction: 1, run: true, jump: true, jumpPressed: p.grounded && (terrainJump || enemyJump), powerPressed: true, downPressed: false });
  hurts += state.events.includes('hurt') ? 1 : 0;
  breaks += state.events.filter(e => e === 'break').length;
  shots += state.events.filter(e => e === 'fire').length;
  jumps += state.events.includes('jump') ? 1 : 0;
  checkpointEvents += state.events.includes('checkpoint') ? 1 : 0;
}
assert.ok(state.won, `main-route bot did not finish: x=${state.player.x}, y=${state.player.y}, hurts=${hurts}`);
assert.equal(hurts, 0, 'route can be traversed without collisions or falls');
assert.equal(checkpointEvents, 1);
assert.ok(breaks >= 10, `fire melted only ${breaks} blocks`);
assert.ok(shots > 100); 
assert.ok(jumps >= 25, 'main route includes meaningful active jumps');
assert.ok(state.ticks / 60 >= 90 && state.ticks / 60 <= 180);
console.log(`Braises main route: ${(state.ticks / 60).toFixed(2)}s, ${jumps} jumps, ${hurts} hurts, ${breaks} melted blocks, automatic ember; optional three secrets not part of this timing.`);

// Repeat with real steering onto the three two-tier balconies. Pauses here are
// physical landings/turns, not teleportation or artificial changes to game state.
const perfect = createState(secondLevel);
let secretIndex = 0, balconyStep = 0, perfectHurts = 0;
const secrets = secondLevel.pickups.filter(p => p.kind === 'secret');
for (let frame = 0; frame < 180 * 60 && !perfect.won; frame++) {
  const p = perfect.player;
  const secret = secrets[secretIndex];
  if (secret && perfect.pickups.find(item => item.id === secret.id).collected) { secretIndex++; balconyStep = 0; }
  const active = secrets[secretIndex];
  let direction = 1, jumpPressed = false;
  const start = active ? active.x - 128 : Infinity;
  if (active && p.x > start - 90 && p.x < active.x + 100) {
    const targetX = balconyStep === 0 ? start : active.x;
    const targetFeet = balconyStep === 0 ? active.y + 64 : active.y + 16;
    direction = Math.abs(targetX - p.x) < 3 ? 0 : Math.sign(targetX - p.x);
    jumpPressed = p.grounded && p.y + HEIGHT > targetFeet + 2;
    if (p.grounded && p.y + HEIGHT <= targetFeet + 2 && balconyStep === 0) balconyStep = 1;
  } else {
    const height = floor.get(Math.floor((p.x + WIDTH + 34) / 16));
    const stepAhead = secondLevel.tiles.some(t => t.kind !== 'ground' && t.x > p.x + WIDTH && t.x < p.x + WIDTH + 38 && t.y < p.y + HEIGHT && t.y + 16 > p.y);
    const enemyJump = perfect.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 64 && Math.abs(e.y + 20 - p.y - HEIGHT) < 20);
    jumpPressed = p.grounded && (height === undefined || height < p.y + HEIGHT - 3 || stepAhead || enemyJump);
  }
  tick(perfect, secondLevel, { direction, run: true, jump: true, jumpPressed, powerPressed: true, downPressed: false });
  perfectHurts += perfect.events.includes('hurt') ? 1 : 0;
}
assert.ok(perfect.won, `secret route did not finish: x=${perfect.player.x}, y=${perfect.player.y}, secret=${secretIndex}, step=${balconyStep}`);
assert.equal(perfectHurts, 0);
assert.equal(perfect.pickups.filter(p => p.kind === 'secret' && p.collected).length, 3);
console.log(`Braises three-secret route: ${(perfect.ticks / 60).toFixed(2)}s; zero hurt; ordinary coins not all collected.`);
