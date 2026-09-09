import {minibossControls} from './miniboss-controls.mjs';
import { strict as assert } from 'node:assert';
import { firstLevel, firstLevelTiming, gardenSections, gardenObstacles, gardenSmashRoofs } from '../../app/mariomortille/first-level.ts';
import { createState, tick, WIDTH, HEIGHT } from '../../app/mariomortille/simulation.ts';

assert.ok(firstLevelTiming.minimumTravelSeconds >= 90);
assert.equal(gardenSections.length, 10);
assert.equal(firstLevel.pickups.filter(p => p.kind === 'secret').length, 3);

// A real 60 Hz traversal, with no teleportation, invulnerability, removed enemies,
// or changes to physics. This follows the main route, not all optional secrets.
const state = createState(firstLevel);
const floor = new Map();
for (const tile of firstLevel.tiles) if (tile.kind === 'ground') floor.set(tile.x / 16, Math.min(floor.get(tile.x / 16) ?? Infinity, tile.y));
let hurts = 0, jumps = 0, checkpointEvents = 0;
for (let frame = 0; frame < 180 * 60 && !state.won; frame++) {
  const p = state.player;
  const ahead = Math.floor((p.x + WIDTH + 34) / 16);
  const height = floor.get(ahead);
  const stepAhead = firstLevel.tiles.some(t => t.kind !== 'ground' && t.x >= p.x + WIDTH && t.x < p.x + WIDTH + 38 && t.y < p.y + HEIGHT && t.y + 16 > p.y);
  const terrainJump = height === undefined || height < p.y + HEIGHT - 3 || stepAhead;
  const enemyJump = state.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 64 && Math.abs(e.y + 20 - p.y - HEIGHT) < 20);
  tick(state, firstLevel, minibossControls(state, { direction: 1, run: true, jump: true, jumpPressed: p.grounded && (terrainJump || enemyJump), powerPressed: p.power === 'turbo' && (!state.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 420) || state.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 90)), downPressed: false }));
  hurts += state.events.includes('hurt') ? 1 : 0;
  jumps += state.events.includes('jump') ? 1 : 0;
  checkpointEvents += state.events.includes('checkpoint') ? 1 : 0;
}
assert.ok(state.won, `main-route bot did not finish: x=${state.player.x}, y=${state.player.y}, hurts=${hurts}`);
assert.equal(hurts, 0, 'route can be traversed without collisions or falls');
assert.equal(checkpointEvents, 1);
assert.ok(jumps >= 25, 'main route includes meaningful active jumps');
assert.ok(state.ticks / 60 >= 90 && state.ticks / 60 <= 180);
console.log(`Garden main route: ${(state.ticks / 60).toFixed(2)}s, ${jumps} jumps, ${hurts} hurts, automatic turbo; optional three secrets not part of this timing.`);

// Exercise both optional roofs from the real spawn: approach, jump, slam, collect,
// then leave using ordinary inputs. No position/state injection or disabled enemies.
assert.equal(gardenObstacles.length, 18);
const bonus = createState(firstLevel);
let roofIndex = 0, bonusHurts = 0, pounds = 0;
for (let frame = 0; frame < 180 * 60 && !bonus.won; frame++) {
  const p = bonus.player;
  const ahead = Math.floor((p.x + WIDTH + 34) / 16), height = floor.get(ahead);
  const step = bonus.tiles.some(t => t.kind !== 'ground' && t.x >= p.x + WIDTH && t.x < p.x + WIDTH + 38 && t.y < p.y + HEIGHT && t.y + 16 > p.y);
  const enemy = bonus.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 80 && Math.abs(e.y + 20 - p.y - HEIGHT) < 20);
  const controls = { direction: 1, run: true, jump: true, jumpPressed: p.grounded && (height === undefined || height < p.y + HEIGHT - 3 || step || enemy), powerPressed: p.power === 'turbo' && (!bonus.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 420) || bonus.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 90)), downPressed: false };
  const column = gardenSmashRoofs[roofIndex], x = column * 16, target = x + 24;
  if (column && p.x > x - 180 && p.x < x + 130) {
    controls.powerPressed = false;
    controls.run = false;
    if (bonus.pickups.some(v => v.id.startsWith(`smash-garden-${column}-`) && v.collected)) roofIndex++;
    else if (p.x >= target - 5) {
      controls.direction = p.x > target + 6 ? -1 : 0;
      controls.jumpPressed = p.grounded;
      // Give the wind-up room to finish before contact with the 256px roof.
      controls.downPressed = !p.grounded && p.y + HEIGHT < 224 && p.pound === 0;
    }
  }
  tick(bonus, firstLevel, minibossControls(bonus, controls));
  bonusHurts += bonus.events.includes('hurt') ? 1 : 0;
  pounds += controls.downPressed ? 1 : 0;
}
assert.ok(bonus.won, `both smash routes have usable exits to the goal x=${bonus.player.x} y=${bonus.player.y} roof=${roofIndex} power=${bonus.player.power} hurts=${bonusHurts}`);
assert.equal(bonusHurts, 0);
assert.equal(roofIndex, 2);
assert.equal(pounds, 2);
for (const column of gardenSmashRoofs) {
  assert.ok(bonus.pickups.some(p => p.id.startsWith(`smash-garden-${column}-`) && p.collected), 'reward is actually reachable');
  assert.ok(bonus.tiles.filter(t => t.kind === 'weak' && t.x >= column * 16 && t.x < (column + 5) * 16 && t.y === 256).length < 5, 'ground-pound breaks the roof');
}
assert.ok(bonus.ticks / 60 >= 90 && bonus.ticks / 60 <= 180);
console.log(`Garden optional smash route: ${(bonus.ticks / 60).toFixed(2)}s, ${pounds} targeted slams, ${bonusHurts} hurts; both rewards collected and exits used.`);
