import test from 'node:test';
import assert from 'node:assert/strict';
import { RankedRun } from '../../app/mariomortille/ranked-run.ts';
import { decodeReplay, decodeControls } from '../../app/mariomortille/replay-codec.ts';

test('ranked submission preserves controls, seals at victory and coalesces duplicate saves',async()=>{
 const original=globalThis.fetch;const sent=[];
 globalThis.fetch=async(_url,options)=>{sent.push(JSON.parse(options.body));return Response.json({score:1200,ticks:1,secrets:0});};
 try{
  const run=new RankedRun('test-run');
  const input={direction:-1,jump:true,jumpPressed:true,run:true,downPressed:false,powerPressed:true};
  run.record(input);const a=run.finish(),b=run.finish();assert.equal(a,b);run.record({...input,direction:1});
  await a;assert.equal(sent.length,1);assert.equal(sent[0].runId,'test-run');assert.ok(!('score' in sent[0]));
  const replay=decodeReplay(sent[0].inputs);assert.equal(replay.length,1);assert.deepEqual(decodeControls(replay[0]),input);
 }finally{globalThis.fetch=original;}
});
test('failed saves retry the same sealed trace without claiming success',async()=>{
 const original=globalThis.fetch;const sent=[];
 globalThis.fetch=async(_url,options)=>{sent.push(options.body);return sent.length===1?Response.json({error:'Indisponible'},{status:503}):Response.json({score:1000,ticks:1,secrets:0});};
 try{
  const run=new RankedRun('retry-run');run.record({direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false});
  await assert.rejects(run.finish(),/Indisponible/);const result=await run.finish();assert.equal(result.score,1000);assert.equal(sent[0],sent[1]);
 }finally{globalThis.fetch=original;}
});
