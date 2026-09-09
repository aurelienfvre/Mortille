import test from 'node:test';
import assert from 'node:assert/strict';
import {preloadStoryImages} from '../../app/mariomortille/story-assets.ts';

test('cinematic loading waits for the backdrop and every frame, deduplicating requests',async()=>{
 const images=[];let ready=false;
 const done=preloadStoryImages(['frame.png','background.png','frame.png'],()=>{const image={};images.push(image);return image;}).then(()=>{ready=true;});
 assert.equal(images.length,2);
 images[0].onload();await Promise.resolve();assert.equal(ready,false);
 images[1].onload();await done;assert.equal(ready,true);
 assert.ok(images.every(image=>image.onload===null&&image.onerror===null));
});
test('a missing sprite prevents readiness and can be requested again',async()=>{
 const images=[];const factory=()=>{const image={};images.push(image);return image;};
 const failed=preloadStoryImages(['missing.png'],factory);images[0].onerror();await assert.rejects(failed,/failed to load/);
 const retry=preloadStoryImages(['missing.png'],factory);images[1].onload();await retry;
 assert.equal(images[1].src,'missing.png');
});
