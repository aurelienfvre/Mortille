import { companionGaitFrames } from '../../app/mariomortille/companion-story-motion.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { endingActors, ENDING_DURATION_MS } from '../../app/mariomortille/ending-motion.ts';

const byId = (t, id, ...options) => endingActors(t, ...options).find(actor => actor.id === id);

test('reunion starts and ends at fixed positions, in twelve seconds', () => {
  assert.equal(ENDING_DURATION_MS, 12000);
  assert.deepEqual(endingActors(0).map(a => a.x), [40, 78, 12, 3]);
  assert.deepEqual(endingActors(12000).map(a => a.x), [40, 47, 25, 15]);
  assert.equal(byId(1000, 'steve').action, 'idle');
  assert.equal(byId(1001, 'steve').action, 'walk');
  assert.equal(byId(4500, 'steve').action, 'idle');
  for (const id of ['julien', 'ben']) {
    assert.equal(byId(4000, id).action, 'idle');
    assert.equal(byId(4001, id).action, 'walk');
    assert.equal(byId(7000, id).action, 'idle');
  }
});

test('each displacement has locomotion, bounded continuous movement and complete frame ranges', () => {
  let previous = endingActors(0);
  const frames = { steve: new Set(), julien: new Set(), ben: new Set() };
  for (let t = 5; t <= 12000; t += 5) {
    const actors = endingActors(t);
    for (let i = 0; i < actors.length; i++) {
      const a = actors[i], before = previous[i];
      assert.ok(Number.isFinite(a.x));
      assert.ok(Math.abs(a.x - before.x) < .08, 'no position jumps');
      if (a.x !== before.x) assert.ok(a.action !== 'idle' || before.action !== 'idle');
      assert.equal(a.facing, a.id === 'steve' ? -1 : 1);
      if (a.action === 'idle') assert.equal(a.frame, 1);
      else {
        assert.ok(a.frame >= 1 && a.frame <= (a.id === 'steve' ? 12 : companionGaitFrames[a.id]));
        frames[a.id].add(a.frame);
      }
      if (a.id === 'aurelien') assert.equal(a.x, 40);
    }
    previous = actors;
  }
  assert.equal(frames.steve.size, 12);
  assert.equal(frames.julien.size, companionGaitFrames.julien);
  assert.equal(frames.ben.size, companionGaitFrames.ben);
});

test('Steve stride is distance based and accepts a display-scale parameter', () => {
  for (const stride of [2, 4, .1]) {
    const actor = byId(2000, 'steve', false, stride);
    assert.equal(actor.frame, Math.floor((78 - actor.x) / stride * 12) % 12 + 1);
  }
  assert.equal(byId(2000, 'steve', false, 2).x, byId(2000, 'steve', false, 4).x);
  for (const stride of [0, -1, NaN, Infinity]) assert.deepEqual(endingActors(2000, false, stride), endingActors(2000));
});

test('time clamps and reduced motion leaves everyone still at the reunion', () => {
  assert.deepEqual(endingActors(-100), endingActors(0));
  assert.deepEqual(endingActors(NaN), endingActors(0));
  assert.deepEqual(endingActors(-Infinity), endingActors(0));
  assert.deepEqual(endingActors(Infinity), endingActors(12000));
  assert.deepEqual(endingActors(50000), endingActors(12000));
  for (const t of [0, 1000, 3000, 5000, 9000, 12000]) {
    assert.deepEqual(endingActors(t, true), endingActors(12000));
    assert.ok(endingActors(t, true).every(a => a.action === 'idle' && a.frame === 1));
  }
});


test('Steve ending accepts eight poses without changing reunion timing or other actors', () => {
 const frames=new Set();
 for(const reduced of [false,true])for(let t=0;t<=12000;t+=10){
  const old=endingActors(t,reduced);
  const next=endingActors(t,reduced,2,8);
  for(let i=0;i<next.length;i++){
   if(next[i].id!=='steve'){assert.deepEqual(next[i],old[i]);continue;}
   const {frame,...motion}=next[i];const {frame:oldFrame,...before}=old[i];
   assert.deepEqual(motion,before);assert.ok(frame>=1&&frame<=8);
   if(motion.action!=='idle')frames.add(frame);
  }
 }
 assert.equal(frames.size,8);
 for(const count of [0,-1,1.5,NaN,Infinity])assert.deepEqual(endingActors(2000,false,2,count),endingActors(2000));
});
