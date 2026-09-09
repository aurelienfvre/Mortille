import test from 'node:test';
import assert from 'node:assert/strict';
import {prologueScenes,sceneStart,tickPrologue,visibleDialogue,prologueActionFinished,prologueDialogueReady} from '../../app/mariomortille/prologue-timeline.ts';
test('each dialogue beat holds before the next abduction event until confirmed',()=>{
 for(let scene=0;scene<5;scene++){
  let t=sceneStart(scene);
  for(let i=0;i<10000;i++)t=tickPrologue(t,scene,16);
  assert.equal(t,prologueScenes[scene].end-1);
  assert.equal(visibleDialogue(t,scene),prologueScenes[scene].text.length);
  assert.equal(tickPrologue(t,scene,0),t);
 }
});
test('dialogue reveals progressively and confirmation can reveal the entire sentence',()=>{
 for(let scene=0;scene<5;scene++){
  const t=sceneStart(scene);
  assert.equal(visibleDialogue(t,scene),0);
  assert.equal(visibleDialogue(t+56,scene),2);
  assert.equal(visibleDialogue(t,scene,true),prologueScenes[scene].text.length);
 }
});

test('revealed dialogue cannot skip pickup or escape before the action ends',()=>{
 for(let scene=0;scene<5;scene++) {
  assert.equal(prologueActionFinished(sceneStart(scene),scene),false);
  assert.equal(prologueActionFinished(prologueScenes[scene].end-2,scene),false);
  assert.equal(prologueActionFinished(prologueScenes[scene].end-1,scene),true);
 }
 assert.equal(prologueActionFinished(6860,2),false,'hands just touched Steve');
 assert.equal(prologueActionFinished(7600,2),false,'pickup must continue into escape');
});

test('speech waits for the arriving actors, including Steve and Mango',()=>{
 assert.equal(prologueDialogueReady(2399,0),false);
 assert.equal(prologueDialogueReady(2400,0),true);
 assert.equal(prologueDialogueReady(5099,1),false);
 assert.equal(prologueDialogueReady(5100,1),true);
 assert.equal(prologueDialogueReady(0,0,true),true);
});
