import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdventureAudio } from '../../app/mariomortille/audio.ts';

test('audio honors pause, mute, independent buses and disposal', async () => {
  const old = globalThis.AudioContext;
  const nodes = [], voices = [];
  const param = () => ({ value: 0, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; } });
  let closed = false;
  globalThis.AudioContext = class {
    currentTime = 0; state = 'suspended'; destination = {};
    createGain() { const n = { gain: param(), connect() {}, disconnect() {} }; nodes.push(n); return n; }
    createDynamicsCompressor() { return { threshold: param(), ratio: param(), connect() {} }; }
    createOscillator() { const n = { frequency: param(), connect() {}, disconnect() {}, start(at) { assert.ok(at >= 0); }, stop() {} }; voices.push(n); return n; }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; closed = true; }
  };
  const audio = new AdventureAudio();
  try {
    audio.mix(false, .2, .7); audio.setPlaying(true); await audio.unlock();
    assert.equal(nodes[0].gain.value, .65);
    assert.equal(nodes[1].gain.value, .2);
    assert.equal(nodes[2].gain.value, .7);
    const originalTrack=audio.track;
    audio.setTheme('pirate');assert.notEqual(audio.track,originalTrack);assert.equal(originalTrack.gain.value,0);assert.equal(audio.track.gain.value,1);
    const pirateTrack=audio.track;audio.setTheme('pirate');assert.equal(audio.track,pirateTrack,'repeated state updates never restart music');
    audio.setTheme('exploration');assert.notEqual(audio.track,pirateTrack,'defeat returns to exploration');
    audio.play('coin'); assert.equal(voices.length, 2);
    audio.mix(true, .2, .7); audio.play('jump'); assert.equal(voices.length, 2);
    assert.equal(nodes[0].gain.value, 0);
    audio.setPlaying(false); assert.equal(nodes[1].gain.value, 0);
    assert.equal(nodes[2].gain.value, .7);
    audio.menu('move'); assert.equal(voices.length, 2, 'muted menu is silent');
    audio.mix(false, .2, .7);
    audio.menu('move'); audio.menu('confirm'); audio.menu('back');
    assert.equal(voices.length, 6, 'menu cues work while gameplay music is paused');
    assert.equal(nodes[1].gain.value, 0, 'menu cues do not restart gameplay music');
    audio.play('step-left'); audio.play('step-right');
    assert.equal(voices.length, 8, 'both foot contacts use the effects bus');
    assert.ok(voices[6].frequency.value !== voices[7].frequency.value, 'feet have subtly distinct tones');
    audio.mix(true, .2, .7); audio.play('step-left'); assert.equal(voices.length, 8, 'muting also silences footsteps');
  } finally { audio.dispose(); globalThis.AudioContext = old; }
  assert.equal(closed, true);
  await audio.unlock(); assert.equal(closed, true);
});
