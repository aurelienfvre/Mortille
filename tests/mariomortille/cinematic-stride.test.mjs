import test from 'node:test';
import assert from 'node:assert/strict';
import {companionStoryMotion} from '../../app/mariomortille/companion-story-motion.ts';
import {leadStoryMotion} from '../../app/mariomortille/lead-story-motion.ts';
import {endingActors} from '../../app/mariomortille/ending-motion.ts';

// Equal travel in sprite pixels must display the same leg pose regardless of viewport.
const displays = [[640,96], [1280,96], [1920,192]];
test('prologue gait follows sprite-relative travel on small and large stages',()=>{
 for(const pixels of [5,11,19,27]) {
  for(const id of ['julien','ben']) {
   const walk=[],run=[];
   for(const [width,size] of displays) {
    const percent=pixels*(size/96)/width*100;
    const stride=32*(size/96)/width*100;
    walk.push(companionStoryMotion(id,(id==='ben'?150:0)+percent/10*1700,false,stride).frame);
    run.push(companionStoryMotion(id,(id==='ben'?15500:15000)+percent/48*3000,false,stride).frame);
   }
   assert.equal(new Set(walk).size,1,`${id} walk at ${pixels}px`);
   assert.equal(new Set(run).size,1,`${id} run at ${pixels}px`);
  }
  const lead=displays.map(([width,size])=>{
   const percent=pixels*(size/96)/width*100;
   return leadStoryMotion('aurelien',14400+Math.sqrt(percent/79)*3100,false,54*(size/96)/width*100).frame;
  });
  assert.equal(new Set(lead).size,1);
 }
});

test('reunion human gait scales with the same display measure as Steve',()=>{
 // At the same moment, doubles in both sprite and stage dimensions are equivalent.
 assert.deepEqual(endingActors(5300,false,14*96/96/640*100),endingActors(5300,false,14*192/96/1280*100));
 for(const id of ['julien','ben']) {
  const a=endingActors(5300,false,2).find(x=>x.id===id);
  const b=endingActors(5300,false,4).find(x=>x.id===id);
  assert.equal(a.x,b.x,'display scale must not alter the story blocking');
  assert.notEqual(a.frame,b.frame,'larger sprite covers the same distance in fewer strides');
 }
});
