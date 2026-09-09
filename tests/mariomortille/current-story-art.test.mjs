import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {currentStoryAssets,currentStoryFrame} from '../../app/mariomortille/current-story-art.ts';
test('all new prologue sources exist and remain inside the new story batch',()=>{
 assert.equal(new Set(currentStoryAssets).size,currentStoryAssets.length);
 for(const src of currentStoryAssets)assert.ok(existsSync(new URL('../../public'+src.split('?')[0],import.meta.url)),src);
});
test('Aurel sprint excludes the three stationary source poses and uses the five moving poses',()=>{
 const frames=new Set(Array.from({length:8},(_,i)=>currentStoryFrame('aurelien','run',i+1,16000,0)));
 assert.equal(frames.size,5);for(const src of frames)assert.match(src,/run-0[4-8]\.png/);
});
test('Ben reacts without damage poses while awaiting dialogue, then resumes pursuit',()=>{
 for(const [time,frame] of [[6500,2],[8000,3],[11000,4],[14500,6]])assert.ok(currentStoryFrame('ben','idle',1,time,0).includes(`reaction-0${frame}.png`));
 assert.match(currentStoryFrame('ben','run',1,16000,0),/story\/current\/ben-run-01\.png/);
 assert.ok(currentStoryFrame('julien','idle',1,0,5000,true).includes('idle-01.png'));
 assert.equal(currentStoryFrame('steve','walk',2,3000,0),undefined);
});
