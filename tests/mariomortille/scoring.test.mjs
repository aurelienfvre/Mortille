import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createState, tick } from '../../app/mariomortille/simulation.ts';
import { calculateResult } from '../../app/mariomortille/scoring.ts';
import { encodeReplay, encodeControls, decodeControls, decodeReplay, MAX_REPLAY_TICKS } from '../../app/mariomortille/replay-codec.ts';
const level = { id: 'fixture', width: 640, goal: 520, spawn: { x: 32, y: 230 }, checkpoint: 320, tiles: Array.from({ length: 40 }, (_, x) => ({ x: x * 16, y: 272, kind: 'ground' })), pickups: [{ id: 'coin', x: 100, y: 242, kind: 'coin', collected: false }, { id: 'secret', x: 400, y: 242, kind: 'secret', collected: false }] };
const state = createState(level), inputs = [];
while (!state.won && inputs.length < 1000) { const control = { direction: 1, jump: false, jumpPressed: false, run: true, downPressed: false, powerPressed: false }; inputs.push(encodeControls(control)); tick(state, level, control); }
const base64 = encodeReplay;
test('replay validates victory and authoritative collected score, ignoring fake reports', () => {
  assert.ok(state.won);
  assert.deepEqual(calculateResult(level, { inputs: base64(inputs), score: 999999, pickups: ['fake'], ticks: 1 }, 10000), { score: 2100, ticks: state.ticks, secrets: 1 });
});
test('replay rejects unfinished, accelerated, malformed and oversized submissions', () => {
  assert.throws(() => calculateResult(level, { inputs: base64(inputs.slice(0, 20)) }, 10000), /termine pas/);
  assert.throws(() => calculateResult(level, { inputs: base64([...inputs, 0]) }, 10000), /après la fin/);
  assert.throws(() => calculateResult(level, { inputs: base64(inputs) }, -1), /Durée/);
  for (const value of ['', 'abc', '!!!!', Buffer.from([3,0]).toString('base64'), 'AB==', Buffer.alloc((MAX_REPLAY_TICKS + 1)*2).toString('base64')]) assert.throws(() => decodeReplay(value));
});
test('all valid input combinations round trip without changing control meaning', () => {
  for (let b = 0; b < 4096; b++) if ((b & 3) !== 3) assert.equal(encodeControls(decodeControls(b)), b);
});
test('maximum length replay uses constant-stack validation and preserves every word', () => {
  const words = Array.from({ length: MAX_REPLAY_TICKS }, (_, i) => i % 2 ? 258 : 129);
  const encoded = encodeReplay(words);
  assert.equal(encoded.length, 96000);
  assert.deepEqual([...decodeReplay(encoded)], words);
  for (const value of [encoded.slice(0,-1)+'!', encoded.slice(0,40000)+'='+encoded.slice(40001), encoded+'AAAA', '====', 'A===', 'AA=A', 'AB==']) assert.throws(() => decodeReplay(value));
});

test('switching physical companions survives the encoded ranked replay', async()=>{
 const {createLevelParty,levelCompanions,stepPartyControls}=await import('../../app/mariomortille/party.ts');
 const l={...level,id:'quartier-01'},state=createState(l),party=createLevelParty(state,l,levelCompanions(l)),words=[];
 assert.equal(party.members.length,3);
 while(!state.won && words.length<1000){
  const input={direction:1,jump:false,jumpPressed:false,run:true,downPressed:false,powerPressed:false,...([20,60].includes(words.length)?{switchPressed:true}:{})};
  words.push(encodeControls(input));stepPartyControls(party,state,l,input);
 }
 assert.equal(party.active,'ben');assert.ok(state.won);
 assert.deepEqual(calculateResult(l,{inputs:encodeReplay(words)},100000),{score:state.score,ticks:state.ticks,secrets:state.pickups.filter(x=>x.kind==='secret'&&x.collected).length});
});
