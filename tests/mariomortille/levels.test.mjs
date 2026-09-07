import { strict as assert } from 'node:assert';
import { quartierLevels } from '../../app/mariomortille/levels.ts';
import { createState, tick } from '../../app/mariomortille/simulation.ts';
const idle = { direction: 0, jump: false, jumpPressed: false, run: false, downPressed: false, powerPressed: false };
const ids = new Set();
const encounterCounts = [20, 30, 20, 20, 24];
for (const level of quartierLevels) {
  assert.equal(level.enemies.length, encounterCounts[quartierLevels.indexOf(level)], level.id + ': authored encounter population');
  assert.equal(new Set(level.enemies.map(e => e.id)).size, level.enemies.length, level.id + ': unique enemy IDs');
  assert.ok(!ids.has(level.id)); ids.add(level.id);
  assert.equal(level.pickups.filter(p => p.kind === 'secret').length, 3, level.id + ': three secrets');
  assert.equal(new Set(level.tiles.map(t => `${t.x},${t.y}`)).size, level.tiles.length, level.id + ': no overlapping tiles');
  for (const p of level.pickups) assert.ok(!level.tiles.some(t => p.x < t.x + 16 && p.x + 16 > t.x && p.y < t.y + 16 && p.y + 16 > t.y), `${level.id}: pickup ${p.id} not buried`);
  for (const enemy of level.enemies) for (let x = enemy.left; x <= enemy.right; x += 8) assert.ok(level.tiles.some(t => x >= t.x && x < t.x + 16 && t.y === enemy.y + 20), `${enemy.id}: patrol stays on floor`);
  for (const e of level.enemies) for (let x = e.left; x <= e.right; x += 4) assert.ok(!level.tiles.some(t => x < t.x + 16 && x + 20 > t.x && e.y < t.y + 16 && e.y + 20 > t.y), e.id + ': patrol body never crosses an obstacle');
  const state = createState(level);
  for (let frame = 0; frame < 90; frame++) tick(state, level, idle);
  assert.ok(state.player.grounded, level.id + ': spawn lands safely');
  const floor = level.tiles.filter(t => t.x >= level.checkpoint && t.x < level.checkpoint + 16).sort((a,b) => a.y-b.y)[0];
  assert.ok(floor, level.id + ': checkpoint has support');
  state.player.x = floor.x; state.player.y = floor.y - 42; state.player.vy = 0;
  tick(state, level, idle); assert.ok(state.checkpoint);
  state.player.y = 550; tick(state, level, idle);
  for (let frame = 0; frame < 20; frame++) tick(state, level, idle);
  assert.ok(state.player.grounded, level.id + ': checkpoint respawn lands safely');
}
console.log('Five routes: IDs, three secrets each, tile uniqueness, pickup clearance, supported patrols, spawn and elevated checkpoint verified.');
