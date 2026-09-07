import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readProgress, unlockedThrough, completeStage } from '../../app/mariomortille/progress.ts';
const ids=['one','two','three'];
test('campaign saves unlock sequentially and retain replays',()=>{
 let p=readProgress(null,ids);assert.equal(unlockedThrough(p,ids),0);
 assert.equal(completeStage(p,'three',ids),p);
 p=completeStage(p,'one',ids);assert.equal(unlockedThrough(p,ids),1);
 assert.equal(completeStage(p,'one',ids),p);
 p=readProgress(JSON.stringify(p),ids);assert.deepEqual(p.completed,['one']);
 p=completeStage(p,'two',ids);assert.equal(unlockedThrough(p,ids),2);
 p=completeStage(p,'three',ids);assert.equal(unlockedThrough(p,ids),2);assert.equal(p.completed.length,3);
});
test('invalid saves and stale level IDs do not unlock arbitrary stages',()=>{
 for(const raw of ['oops','null','{}','{"version":2,"completed":["one"]}']) assert.deepEqual(readProgress(raw,ids).completed,[]);
 const p=readProgress('{"version":1,"completed":["removed","three","three"]}',ids);
 assert.deepEqual(p.completed,['three']);assert.equal(unlockedThrough(p,ids),0);
});
