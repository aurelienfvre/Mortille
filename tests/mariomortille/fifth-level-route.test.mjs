import {powerBlockControls} from './power-block-controls.mjs';
import { strict as assert } from 'node:assert';
import { fifthLevel as level, fifthLevelTiming, finaleArenaStart } from '../../app/mariomortille/fifth-level.ts';
import { createState, tick, WIDTH, HEIGHT } from '../../app/mariomortille/simulation.ts';
assert.ok(fifthLevelTiming.minimumTravelSeconds >= 90);
const s = createState(level), floor = new Map();
for (const t of level.tiles) if (t.kind === 'ground') floor.set(t.x / 16, Math.min(floor.get(t.x / 16) ?? Infinity, t.y));
let hurts = 0, jumps = 0, arenaTick = 0, secretIndex = 0, stage = 0;
const secrets = level.pickups.filter(p => p.kind === 'secret');
for (let f = 0; f < 180 * 60 && !s.won; f++) {
 const p = s.player, b = s.boss;
 let direction = 1, jumpPressed = false, powerPressed = p.x < finaleArenaStart;
 if (secrets[secretIndex] && s.pickups.find(x => x.id === secrets[secretIndex].id).collected) { secretIndex++; stage = 0; }
 const secret = secrets[secretIndex];
 if (secret && p.x > secret.x - 240 && p.x < secret.x + 100) {
  const target = stage === 0 ? secret.x - 144 : secret.x;
  const targetFeet = secret.y + (stage === 0 ? 80 : 32);
  direction = Math.abs(target - p.x) < 3 ? 0 : Math.sign(target - p.x);
  jumpPressed = p.grounded && p.y + HEIGHT > targetFeet + 2;
  if (p.grounded && p.y + HEIGHT <= targetFeet + 2) stage = 1;
 } else if (p.x < finaleArenaStart + 90) {
  const h = floor.get(Math.floor((p.x + WIDTH + 8) / 16));
  jumpPressed = p.grounded && (h === undefined || h < p.y + HEIGHT - 3 || level.tiles.some(t => t.kind !== 'ground' && t.x > p.x + WIDTH && t.x < p.x + WIDTH + 38 && t.y < p.y + HEIGHT && t.y + 16 > p.y) || s.enemies.some(e => !e.defeated && e.x > p.x && e.x - p.x < 64 && Math.abs(e.y + 20 - p.y - HEIGHT) < 20));
 } else if (!b.activated) {
  direction=1;
 } else if (b.phase !== 'defeated') {
  if (!arenaTick) arenaTick = f;
  // The west alcove is outside the charge lane. Face the boss and fire when
  // its stun window opens; projectiles use normal travel/bounce physics.
  direction = p.x > finaleArenaStart + 100 ? -1 : p.x < finaleArenaStart + 94 ? 1 : 0;
  if (direction === 0 && p.facing !== 1) direction = 1;
  powerPressed = b.phase === 'stunned';
 }
 tick(s, level, powerBlockControls(s,{ direction, run: true, jump: true, jumpPressed, powerPressed, downPressed: false }) ?? { direction, run: true, jump: true, jumpPressed, powerPressed, downPressed: false });
 hurts += s.events.includes('hurt') ? 1 : 0;
 jumps += s.events.includes('jump') ? 1 : 0;
}
assert.ok(s.won, `route stuck x=${s.player.x}, boss=${JSON.stringify(s.boss)}, power=${s.player.power}`);
assert.equal(hurts, 0);
assert.equal(s.pickups.filter(p => p.kind === 'secret' && p.collected).length, 3);
assert.equal(s.boss.hits, 4);
assert.equal(s.boss.phase, 'defeated');
assert.ok(s.checkpoint);
assert.ok(jumps >= 15);
assert.ok(s.ticks / 60 >= 90 && s.ticks / 60 <= 180);
console.log(`Finale real traversal + four-hit combat: ${(s.ticks/60).toFixed(2)}s, ${jumps} jumps, ${hurts} hurts, combat ${(s.ticks/60-arenaTick/60).toFixed(2)}s. All three secrets collected. Ordinary coins not all collected.`);
