import { strict as assert } from 'node:assert';
import { prologueLevel as level, prologueHints, prologueMechanics as mechanics } from '../../app/mariomortille/prologue-level.ts';
import { createState, tick, HEIGHT, WIDTH } from '../../app/mariomortille/simulation.ts';
assert.equal(level.id, 'prologue');
assert.equal(level.enemies.length, 0);
assert.equal(prologueHints[0].fromX, 0);
assert.equal(prologueHints.at(-1).toX, level.width);
for (let i = 1; i < prologueHints.length; i++) assert.equal(prologueHints[i].fromX, prologueHints[i - 1].toX);
const floor = new Map();
for (const t of level.tiles) if (t.kind === 'ground') floor.set(t.x / 16, Math.min(floor.get(t.x / 16) ?? Infinity, t.y));
function traverse({ missFirstPowers = false, missGlide = false } = {}) {
  const s = createState(level), events = {}, equipped = new Set(), floorsBroken = new Set();
  let glideTicks = 0, walkTicks = 0, sprintTicks = 0, cloudJump = false, basinLanding = false;
  for (let frame = 0; frame < 180 * 60 && !s.won; frame++) {
    const p = s.player, feet = p.y + HEIGHT;
    let direction = 1, run = p.x >= 1536, jumpPressed = false, downPressed = false;
    const step = floor.get(Math.floor((p.x + WIDTH + 24) / 16));
    const obstruction = s.tiles.some(t => (t.kind === 'brick' || t.kind === 'ice') && t.x > p.x + WIDTH && t.x < p.x + WIDTH + 30 && t.y < feet && t.y + 16 > p.y);
    jumpPressed = p.grounded && (step !== undefined && step < feet - 3 || obstruction);
    for (const start of [mechanics.weakFloor, mechanics.cobaltFloor]) {
      if (!floorsBroken.has(start) && p.x > start - 48 && p.x < start + 128) {
        const target = start + 56;
        direction = Math.abs(target - p.x) < 4 ? 0 : Math.sign(target - p.x);
        jumpPressed = p.grounded && Math.abs(target - p.x) < 8;
        downPressed = !p.grounded && p.y < 244 && Math.abs(target - p.x) < 12;
      }
    }
    if (!missGlide && !cloudJump && p.x > mechanics.cloudGap.from - 48 && p.x < mechanics.cloudGap.from && p.grounded) { jumpPressed = true; cloudJump = true; }
    if (missFirstPowers && [4256, 8352, 10656, 13472].some(x => p.x > x - 54 && p.x < x - 26) && p.grounded) jumpPressed = true;
    tick(s, level, { direction, run, jump: true, jumpPressed, downPressed, powerPressed: p.power === 'turbo' || p.power === 'ember' });
    for (const e of s.events) events[e] = (events[e] ?? 0) + 1;
    if (s.events.includes('equip')) equipped.add(p.power);
    for (const start of [mechanics.weakFloor, mechanics.cobaltFloor]) if (!s.tiles.some(t => t.x === start + 64 && t.y === 304)) floorsBroken.add(start);
    if (p.power === 'cloud' && p.x >= mechanics.cloudGap.from && p.x < mechanics.cloudGap.to && p.vy > 0 && p.vy <= 85 && !p.grounded) glideTicks++;
    if (p.x > mechanics.cloudGap.from && p.x < mechanics.cloudGap.to && p.grounded && p.y + HEIGHT > 304) basinLanding = true;
    if (p.grounded && p.vx > 100 && p.vx < 120) walkTicks++;
    if (p.grounded && p.vx === 180) sprintTicks++;
  }
  assert.ok(s.won, `prologue stalled at ${s.player.x},${s.player.y}; events=${JSON.stringify(events)}`);
  assert.equal(events.hurt ?? 0, 0);
  return { s, events, equipped, floorsBroken, glideTicks, walkTicks, sprintTicks, basinLanding };
}
const { s, events, equipped, floorsBroken, glideTicks, walkTicks, sprintTicks } = traverse();
assert.ok(walkTicks > 100 && sprintTicks > 100, 'both ordinary movement and sprint were performed');
assert.ok(events.jump >= 8 && events.boost > 0 && events.fire > 0 && events.pound >= 2);
assert.deepEqual([...equipped].sort(), ['cloud', 'cobalt', 'ember', 'none', 'turbo'].sort());
assert.equal(floorsBroken.size, 2, 'both actual downward gates were broken');
assert.ok(level.tiles.filter(t => t.x === mechanics.turboWall && t.kind === 'weak').length > s.tiles.filter(t => t.x === mechanics.turboWall && t.kind === 'weak').length, 'Turbo opened its wall');
assert.ok(level.tiles.filter(t => t.x === mechanics.iceWall && t.kind === 'ice').length > s.tiles.filter(t => t.x === mechanics.iceWall && t.kind === 'ice').length, 'fire opened the ice wall');
assert.ok(glideTicks > 10, 'the cloud lesson actually glided');
assert.equal(events.checkpoint, 1);
assert.ok(s.ticks / 60 >= 90 && s.ticks / 60 <= 180);
console.log(`Prologue clean route: ${(s.ticks / 60).toFixed(2)}s, ${events.jump} jumps, ${events.pound} downward strikes, ${glideTicks} glide ticks, no hurt.`);
const recovery = traverse({ missFirstPowers: true });
for (const [kind, first, second] of [['turbo',4256,4544], ['ember',8352,8832], ['cloud',10656,10976], ['cobalt',13472,14048]]) {
  assert.equal(recovery.s.pickups.find(p => p.id === `tutorial-${kind}-${first}`).collected, false, `${kind} first intentionally missed`);
  assert.equal(recovery.s.pickups.find(p => p.id === `tutorial-${kind}-${second}`).collected, true, `${kind} backup recovered`);
}
const basin = traverse({ missGlide: true });
assert.ok(basin.basinLanding, 'a missed glide safely lands and climbs out of the basin');
console.log('Prologue recovery: four first power pickups deliberately skipped, all backups collected; missed glide lands safely and still finishes.');
