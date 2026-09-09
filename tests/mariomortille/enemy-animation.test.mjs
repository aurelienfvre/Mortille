import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyVisual} from '../../app/mariomortille/enemy-animation.ts';
import {defeatEnemy,stepEnemyDeath} from '../../app/mariomortille/enemy-behavior.ts';
test('enemy death displays every authored pose once and does not replay saved defeats',()=>{
 const e={id:'e',kind:'pest',x:10,y:20,direction:-1,defeated:false};
 defeatEnemy(e);const poses=[];
 for(let i=0;i<36;i++) {const v=enemyVisual(e);assert.equal(v.visible,true);poses.push(v.frame);stepEnemyDeath(e);}
 assert.deepEqual(poses,Array.from({length:6},(_,i)=>Array(6).fill(i+1)).flat());
 assert.equal(enemyVisual(e).visible,false);
 assert.equal(enemyVisual({...e,deathTicks:undefined}).visible,false);
});

test('every live enemy state resolves to a shipped 48px animation frame', async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const kind of ['guard','pest','rover']) {
  const states=[...Array.from({length:4},(_,i)=>({moving:true,distance:i*4})),{phase:'warning'},{phase:'charge'},...Array.from({length:6},(_,i)=>({defeated:true,deathTicks:36-i*6}))];
  for(const state of states) {
   const visual=enemyVisual({kind,x:0,y:0,direction:1,defeated:false,...state});
   const file=new URL(`../../public/mariomortille/enemies/${kind}-${visual.clip}-${String(visual.frame).padStart(2,'0')}.png`,import.meta.url);
   const png=await readFile(file);
   assert.equal(png.readUInt32BE(16),48);assert.equal(png.readUInt32BE(20),48);
   assert.equal(png[25],6,'PNG must include an alpha channel');
  }
 }
});
