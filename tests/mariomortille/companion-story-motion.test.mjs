import test from 'node:test';
import assert from 'node:assert/strict';
import { companionStoryMotion, companionGaitFrames } from '../../app/mariomortille/companion-story-motion.ts';

test('companions approach, stop for dialogue, then follow Aurel with a complete alternating gait', () => {
  for (const id of ['ben', 'julien']) {
    const seen = new Set();
    let previous = companionStoryMotion(id, 0);
    for (let t = 10; t < 18000; t += 10) {
      const actor = companionStoryMotion(id, t);
      assert.ok(actor.frame >= 1 && actor.frame <= companionGaitFrames[id]);
      if (Math.abs(actor.x - previous.x) > 0.0001) assert.ok(actor.action !== 'idle' || previous.action !== 'idle', `${id} slides at ${t}`);
      if (actor.action === 'run') seen.add(actor.frame);
      previous = actor;
    }
    assert.equal(seen.size, companionGaitFrames[id], 'both halves of the run cycle play');
    assert.equal(companionStoryMotion(id, 8000).action, 'idle');
    assert.equal(companionStoryMotion(id, 17900).action, 'run');
    assert.deepEqual(companionStoryMotion(id, 8000), companionStoryMotion(id, 12000));
    assert.equal(companionStoryMotion(id, 17000, true).action, 'idle');
  }
});

test('Juju briefly recoils during the abduction and returns to the same planted position',()=>{
 for(const [age,frame] of [[0,1],[80,2],[190,3],[280,4]]) {
  const actor=companionStoryMotion('julien',6500+age);
  assert.equal(actor.action,'hurt');assert.equal(actor.frame,frame);assert.equal(actor.x,25);
 }
 assert.equal(companionStoryMotion('julien',6890).action,'idle');
 assert.equal(companionStoryMotion('julien',6550,true).action,'idle');
 assert.equal(companionStoryMotion('ben',6550).action,'idle');
});

 test('Ben reacts just after Juju, returns to rest and keeps his position',()=>{
 assert.equal(companionStoryMotion('ben',6619).action,'idle');
 for(const [age,frame] of [[0,1],[90,2],[220,3],[340,4]]){
  const actor=companionStoryMotion('ben',6620+age);assert.equal(actor.action,'hurt');assert.equal(actor.frame,frame);assert.equal(actor.x,15);
 }
 assert.equal(companionStoryMotion('ben',7080).action,'idle');
 assert.equal(companionStoryMotion('ben',6700,true).action,'idle');
 });

test('each companion gait resolves only existing frames for its own cycle length', async()=>{
 const {existsSync}=await import('node:fs');
 for(const id of ['julien','ben']){
  for(const action of ['walk','run'])for(let frame=1;frame<=companionGaitFrames[id];frame++){
   assert.ok(existsSync(new URL(`../../public/mariomortille/characters/${id}/${action}-${String(frame).padStart(2,'0')}.png`,import.meta.url)));
  }
 }
 assert.equal(companionGaitFrames.julien,8);
});

test('Juju and Ben keep running until both bodies are beyond the screen before the final beat ends',async()=>{
 const {prologueScenes}=await import('../../app/mariomortille/prologue-timeline.ts');
 for(const id of ['ben','julien']){
  assert.equal(companionStoryMotion(id,18500).action,'run');
  assert.ok(companionStoryMotion(id,prologueScenes.at(-1).end-1).x>=112);
 }
});
