import test from 'node:test';
import assert from 'node:assert/strict';
import {musicScores,musicStep,encounterMusic} from '../../app/mariomortille/music.ts';
test('each boss has an original distinct minor arrangement and a valid seamless score loop',()=>{
 const themes=['pirate','lola','mango','raphael'];assert.equal(new Set(themes.map(k=>JSON.stringify(musicScores[k].melody))).size,4);
 assert.equal(new Set(themes.map(k=>musicScores[k].bpm)).size,4);
 for(const theme of ['exploration',...themes]){
  const score=musicScores[theme];assert.deepEqual(musicStep(theme,0),musicStep(theme,score.melody.length));
  for(let i=0;i<score.melody.length;i++){
   const step=musicStep(theme,i);assert.ok(step.seconds>0);
   for(const tone of step.tones){assert.ok(Number.isFinite(tone.frequency)&&tone.frequency>0);assert.ok(tone.duration>0&&tone.duration<1);assert.ok(tone.volume<=.2);}
  }
 }
});
test('exploration changes only when combat activates and returns after defeat or respawn',()=>{
 for(const kind of ['pirate','lola','mango','raphael']){
  assert.equal(encounterMusic({kind,activated:false,phase:'tell'}),'exploration');
  assert.equal(encounterMusic({kind,activated:true,phase:'tell'}),kind);
  assert.equal(encounterMusic({kind,activated:true,phase:'stunned'}),kind);
  assert.equal(encounterMusic({kind,activated:true,phase:'defeated'}),'exploration');
 }
 assert.equal(encounterMusic(null),'exploration');
});
