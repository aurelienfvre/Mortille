import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createState, tick } from '../../app/mariomortille/simulation.ts';
import { calculateResult } from '../../app/mariomortille/scoring.ts';
import { encodeControls, decodeControls, decodeReplay, MAX_REPLAY_TICKS } from '../../app/mariomortille/replay-codec.ts';
const level = { id: 'fixture', width: 640, goal: 520, spawn: { x: 32, y: 230 }, checkpoint: 320, tiles: Array.from({ length: 40 }, (_, x) => ({ x: x * 16, y: 272, kind: 'ground' })), pickups: [{ id: 'coin', x: 100, y: 242, kind: 'coin', collected: false }, { id: 'secret', x: 400, y: 242, kind: 'secret', collected: false }] };
const state = createState(level), inputs = [];
while (!state.won && inputs.length < 1000) { const control = { direction: 1, jump: false, jumpPressed: false, run: true, downPressed: false, powerPressed: false }; inputs.push(encodeControls(control)); tick(state, level, control); }
const base64 = bytes => Buffer.from(bytes).toString('base64');
test('replay validates victory and authoritative collected score, ignoring fake reports', () => {
  assert.ok(state.won);
  assert.deepEqual(calculateResult(level, { inputs: base64(inputs), score: 999999, pickups: ['fake'], ticks: 1 }, 10000), { score: 2100, ticks: state.ticks, secrets: 1 });
});
test('replay rejects unfinished, accelerated, malformed and oversized submissions', () => {
  assert.throws(() => calculateResult(level, { inputs: base64(inputs.slice(0, 20)) }, 10000), /termine pas/);
  assert.throws(() => calculateResult(level, { inputs: base64([...inputs, 0]) }, 10000), /après la fin/);
  assert.throws(() => calculateResult(level, { inputs: base64(inputs) }, -1), /Durée/);
  for (const value of ['', 'abc', '!!!!', base64([128]), base64([3]), 'AB==', base64(new Uint8Array(MAX_REPLAY_TICKS + 1))]) assert.throws(() => decodeReplay(value));
});
test('all valid input combinations round trip without changing control meaning', () => {
  for (let b = 0; b < 128; b++) if ((b & 3) !== 3) assert.equal(encodeControls(decodeControls(b)), b);
});
