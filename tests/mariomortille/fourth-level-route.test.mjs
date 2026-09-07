import { strict as assert } from 'node:assert';
import { fourthLevel, fourthLevelTiming, cobaltSections } from '../../app/mariomortille/fourth-level.ts';
import { createState, tick, damage, WIDTH, HEIGHT } from '../../app/mariomortille/simulation.ts';

assert.ok(fourthLevelTiming.minimumTravelSeconds >= 90);
assert.equal(cobaltSections.length, 10);
assert.equal(fourthLevel.pickups.filter(p => p.kind === 'secret').length, 3);

// A real 60 Hz traversal, with no teleportation, invulnerability, removed enemies,
// or changes to physics. This follows the main route, not all optional secrets.
const state = createState(fourthLevel);
const floor = new Map();
for (const tile of fourthLevel.tiles) if (tile.kind === 'ground') floor.set(tile.x / 16, Math.min(floor.get(tile.x / 16) ?? Infinity, tile.y));
let hurts = 0, jumps = 0, checkpointEvents = 0;
for (let frame = 0; frame < 180 * 60 && !state.won; frame++) {
  const p = state.player;
  const ahead = Math.floor((p.x + WIDTH + 8) / 16);
  const height = floor.get(ahead);
  const stepAhead = fourthLevel.tiles.some(t => t.kind !== 'ground' && t.x > p.x + WIDTH && t.x < p.x + WIDTH + 38 && t.y < p.y + HEIGHT && t.y + 16 > p.y);
  const terrainJump = height === undefined || height < p.y + HEIGHT - 3 || stepAhead;
  const enemyJump = state.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 64 && Math.abs(e.y + 20 - p.y - HEIGHT) < 20);
  tick(state, fourthLevel, { direction: 1, run: true, jump: true, jumpPressed: p.grounded && (terrainJump || enemyJump), powerPressed: false, downPressed: false });
  hurts += state.events.includes('hurt') ? 1 : 0;
  jumps += state.events.includes('jump') ? 1 : 0;
  checkpointEvents += state.events.includes('checkpoint') ? 1 : 0;
}
assert.ok(state.won, `main-route bot did not finish: x=${state.player.x}, y=${state.player.y}, hurts=${hurts}`);
assert.equal(hurts, 0, 'route can be traversed without collisions or falls');
assert.equal(checkpointEvents, 1);
for (const section of [3, 6, 9]) assert.ok(state.pickups.find(p => p.id === `cobalt-coin-${section}-18`).collected, 'reward above delivery pallets is collected by a real traversal');

assert.ok(jumps >= 20, 'main route includes meaningful active jumps');
assert.ok(state.ticks / 60 >= 90 && state.ticks / 60 <= 180);
console.log(`Cobalt main route: ${(state.ticks / 60).toFixed(2)}s, ${jumps} jumps, ${hurts} hurts; optional three secrets not part of this timing.`);


const perfect = createState(fourthLevel);
const secrets = fourthLevel.pickups.filter(p => p.kind === 'secret');
let secretIndex = 0, stage = 0, perfectHurts = 0, breaks = 0;
for (let frame = 0; frame < 180 * 60 && !perfect.won; frame++) {
  const p = perfect.player;
  if (secrets[secretIndex] && perfect.pickups.find(x => x.id === secrets[secretIndex].id).collected) { secretIndex++; stage = 0; }
  const secret = secrets[secretIndex];
  let direction = 1, jumpPressed = false, downPressed = false;
  if (secret && p.x > secret.x - 240 && p.x < secret.x + 110) {
    const target = stage === 0 ? secret.x - 160 : secret.x;
    direction = Math.abs(target - p.x) < 3 ? 0 : Math.sign(target - p.x);
    const targetFeet = stage === 0 ? secret.y + 16 : secret.y - 32;
    if (stage < 2) {
      jumpPressed = p.grounded && p.y + HEIGHT > targetFeet + 2;
      if (p.grounded && p.y + HEIGHT <= targetFeet + 2) stage++;
    } else {
      jumpPressed = p.grounded;
      downPressed = !p.grounded && p.vy >= 0;
    }
  } else {
    const height = floor.get(Math.floor((p.x + WIDTH + 8) / 16));
    const stepAhead = fourthLevel.tiles.some(t => t.kind !== 'ground' && t.x > p.x + WIDTH && t.x < p.x + WIDTH + 38 && t.y < p.y + HEIGHT && t.y + 16 > p.y);
    const enemyJump = perfect.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 64 && Math.abs(e.y + 20 - p.y - HEIGHT) < 20);
    jumpPressed = p.grounded && (height === undefined || height < p.y + HEIGHT - 3 || stepAhead || enemyJump);
  }
  tick(perfect, fourthLevel, { direction, run: true, jump: true, jumpPressed, powerPressed: false, downPressed });
  perfectHurts += perfect.events.includes('hurt') ? 1 : 0;
  breaks += perfect.events.filter(e => e === 'break').length;
}
assert.ok(perfect.won, `secret route stuck: x=${perfect.player.x}, y=${perfect.player.y}, index=${secretIndex}, stage=${stage}`);
assert.equal(perfectHurts, 0);
assert.equal(perfect.pickups.filter(p => p.kind === 'secret' && p.collected).length, 3);
assert.ok(breaks >= 3, `Cobalt slam must actually break decks: ${breaks}`);
assert.ok(perfect.ticks / 60 >= 90 && perfect.ticks / 60 <= 180);
console.log(`Cobalt three-secret route: ${(perfect.ticks / 60).toFixed(2)}s, ${breaks} reinforced blocks broken, zero hurt. Ordinary coins not all collected.`);

// Fault injection uses the public damage API once, after equipping. Subsequent
// movement is entirely ordinary input; no enemy or terrain is removed for it.
const recovery = createState(fourthLevel);
let injected = false, recovered = false;
for (let frame = 0; frame < 180 * 60 && !recovery.won; frame++) {
  const p = recovery.player;
  if (!injected && p.x > 7300 && p.grounded && p.power === 'cobalt') {
    damage(recovery, fourthLevel, p.x - 40);
    assert.equal(p.power, 'none');
    injected = true;
  }
  if (injected && p.power === 'cobalt') recovered = true;
  const height = floor.get(Math.floor((p.x + WIDTH + 8) / 16));
  const stepAhead = fourthLevel.tiles.some(t => t.kind !== 'ground' && t.x > p.x + WIDTH && t.x < p.x + WIDTH + 38 && t.y < p.y + HEIGHT && t.y + 16 > p.y);
  const enemyJump = recovery.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 64 && Math.abs(e.y + 20 - p.y - HEIGHT) < 20);
  tick(recovery, fourthLevel, { direction: 1, run: true, jump: true, jumpPressed: p.grounded && (height === undefined || height < p.y + HEIGHT - 3 || stepAhead || enemyJump), powerPressed: false, downPressed: false });
}
assert.ok(injected && recovered && recovery.won, 'lost Cobalt must permit an ordinary bypass and a later refill');
console.log(`Cobalt recovery route after forced damage: ${(recovery.ticks / 60).toFixed(2)}s, power reacquired, finish reached.`);
