import {test} from 'node:test';import assert from 'node:assert/strict';
import {markerGround} from '../../app/mariomortille/scenery-placement.ts';
import {stepFeedback} from '../../app/mariomortille/feedback.ts';
test('marker feet follow elevated ground rather than y304 or a floating block',()=>{
 const tiles=[{x:32,y:256,kind:'ground'},{x:32,y:272,kind:'ground'},{x:32,y:160,kind:'brick'}];
 assert.deepEqual(markerGround(tiles,40),{x:40,y:256});assert.deepEqual(markerGround(tiles,48),{x:40,y:256});assert.equal(markerGround([],12),null);
});
test('equipment and pickup no longer emit generic explosion particles',()=>{
 const particles=[{life:10}];stepFeedback(particles,['equip','coin','land','pound'],{},1);assert.deepEqual(particles,[]);
});
