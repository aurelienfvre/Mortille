import { strict as assert } from 'node:assert';
import { quartierLevels } from '../../app/mariomortille/levels.ts';
import { createState, tick, damage } from '../../app/mariomortille/simulation.ts';
import { stepBoss } from '../../app/mariomortille/boss.ts';
const level = quartierLevels[4];
const input = { direction: 0, jump: false, jumpPressed: false, run: false, downPressed: false, powerPressed: false };
const sleeping = createState(level);
for (let n = 0; n < 400; n++) stepBoss(sleeping, level, sleeping.player.y, damage);
assert.equal(sleeping.boss.timer, 100, 'boss stays inactive during the approach');
assert.equal(sleeping.boss.x, level.width - 1024 + 720, 'boss spawns in the final arena');
const s = createState(level); s.player.x = level.goal; s.player.y = 262;
tick(s, level, input); assert.equal(s.won, false, 'cannot skip boss at exit');
s.player.x = level.width - 1024 + 90;
for (let n=0;n<300 && s.boss.phase !== 'stunned';n++) stepBoss(s, level, s.player.y, damage);
assert.equal(s.boss.phase, 'stunned', 'charge produces punish window');
for (let hit=0;hit<4;hit++) {
  s.boss.phase = 'stunned'; s.boss.y = 256; s.boss.timer = 60;
  s.player.x = s.boss.x; s.player.y = 216; s.player.vy = 120;
  stepBoss(s, level, 210, damage);
  assert.equal(s.boss.health, 3-hit); assert.ok(s.player.vy < 0);
}
assert.equal(s.boss.phase, 'defeated'); assert.equal(s.score, 2500);
stepBoss(s, level, 210, damage); assert.equal(s.score, 2500, 'boss reward once');
s.player.x = level.goal; s.player.y = 262; s.player.vy = 0;
tick(s, level, input); assert.equal(s.won, true);
const reset = createState(level); reset.boss.health = 1; reset.player.y = 550;
tick(reset, level, input); assert.equal(reset.boss.health, 4, 'retry resets encounter');
console.log('Boss: warning/charge/stun, four hit defeat, bounce, exit gate, unique reward and retry reset passed.');

const checkpointRetry = createState(level);
checkpointRetry.player.x = level.checkpoint; checkpointRetry.player.y = 262;
tick(checkpointRetry, level, input);
assert.ok(checkpointRetry.checkpoint);
checkpointRetry.boss.health = 1; checkpointRetry.player.y = 550;
tick(checkpointRetry, level, input);
assert.equal(checkpointRetry.boss.health, 4);
assert.equal(checkpointRetry.boss.x, level.width - 1024 + 720);
assert.ok(checkpointRetry.player.x >= level.checkpoint);
