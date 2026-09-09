import test from 'node:test';
import assert from 'node:assert/strict';
import {stepEnemy, defeatEnemy, stepEnemyDeath, enemyBlocksShot} from '../../app/mariomortille/enemy-behavior.ts';
import {createState} from '../../app/mariomortille/simulation.ts';
import {campaignEnemyKinds} from '../../app/mariomortille/enemy-roster.ts';
import {quartierLevels} from '../../app/mariomortille/levels.ts';
const enemy=(kind)=>({id:'e',kind,x:100,y:100,left:0,right:400,direction:1,defeated:false});
const player={x:200,y:78};
test('three readable enemy roles have different speeds and a locked charge with warning and recovery',()=>{
 const guard=enemy('guard'),pest=enemy('pest');
 for(let i=0;i<30;i++){stepEnemy(guard,{x:1000,y:78},[]);stepEnemy(pest,{x:1000,y:78},[]);}
 assert.ok(pest.x>guard.x);
 const rover=enemy('rover');stepEnemy(rover,player,[]);assert.equal(rover.phase,'warning');assert.equal(rover.x,100);
 for(let i=0;i<30;i++)stepEnemy(rover,{x:0,y:78},[]);
 assert.equal(rover.phase,'charge');assert.equal(rover.x,100);assert.equal(rover.direction,1,'no tracking reversal during warning');
 stepEnemy(rover,player,[]);assert.ok(rover.x>101);
 for(let i=0;i<41;i++)stepEnemy(rover,player,[]);
 assert.equal(rover.phase,'recover');const stopped=rover.x;
 for(let i=0;i<60;i++)stepEnemy(rover,player,[]);
 assert.equal(rover.x,stopped);assert.equal(rover.phase,'patrol');
});
test('rover cannot see through walls or target another floor; charge stops at wall or patrol boundary',()=>{
 const wall=[{x:150,y:96,kind:'brick'}];const a=enemy('rover');stepEnemy(a,player,wall);assert.notEqual(a.phase,'warning');
 const b=enemy('rover');stepEnemy(b,{x:200,y:0},[]);assert.notEqual(b.phase,'warning');
 const c={...enemy('rover'),phase:'charge',phaseTicks:42};
 for(let i=0;i<40;i++)stepEnemy(c,player,wall);
 assert.ok(c.x<=130);assert.equal(c.phase,'recover');
 const d={...enemy('rover'),right:115,phase:'charge',phaseTicks:42};
 for(let i=0;i<15;i++)stepEnemy(d,player,[]);
 assert.equal(d.x,115);assert.equal(d.phase,'recover');
});
test('campaign assigns matching roles deterministically and preserves fixed-step outcomes',()=>{
 for(const level of quartierLevels){
  const a=createState(level),b=createState(level);assert.deepEqual(new Set(a.enemies.map(e=>e.kind)),new Set(campaignEnemyKinds[level.id]));
  for(let i=0;i<90;i++)for(let j=0;j<a.enemies.length;j++){
   const p={x:a.enemies[j].left+60,y:a.enemies[j].y-22};stepEnemy(a.enemies[j],p,a.tiles);stepEnemy(b.enemies[j],p,b.tiles);
  }
  assert.deepEqual(a.enemies,b.enemies);
  for(const e of a.enemies)assert.ok(e.x>=e.left&&e.x<=e.right);
 }
});

test('pest warns, jumps with a bent-leg attack phase, lands and waits before next jump',()=>{
 const e=enemy('pest'); stepEnemy(e,player,[]);
 assert.equal(e.phase,'warning'); assert.equal(e.y,100);
 for(let i=0;i<30;i++)stepEnemy(e,player,[]);
 assert.equal(e.phase,'jump');
 for(let i=0;i<10;i++)stepEnemy(e,player,[]);
 assert.ok(e.y<100);
 for(let i=0;i<30;i++)stepEnemy(e,player,[]);
 assert.equal(e.y,100); assert.equal(e.phase,'recover');
});
test('guard blocks frontal fire only; death is inert and visible for exactly 36 ticks',()=>{
 const e=enemy('guard');assert.equal(enemyBlocksShot(e,119),true);assert.equal(e.phase,'recover');
 assert.equal(enemyBlocksShot(e,99),false);
 assert.equal(defeatEnemy(e),true); assert.equal(e.deathTicks,36);assert.equal(defeatEnemy(e),false);
 const x=e.x;stepEnemy(e,player,[]);assert.equal(e.x,x);
 for(let i=0;i<35;i++)stepEnemyDeath(e);assert.equal(e.deathTicks,1);
 stepEnemyDeath(e);assert.equal(e.deathTicks,0);stepEnemyDeath(e);assert.equal(e.deathTicks,0);
});

test('pest jump hits a ceiling without crossing solid tiles',()=>{
 const e={...enemy('pest'),phase:'jump',vy:-210,homeY:100};
 const roof=Array.from({length:25},(_,i)=>({x:i*16,y:64,kind:'brick'}));
 for(let i=0;i<40;i++){stepEnemy(e,player,roof);assert.ok(e.y>=80);}
 assert.equal(e.y,100);
});
