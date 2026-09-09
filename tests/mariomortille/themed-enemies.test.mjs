import test from 'node:test';
import assert from 'node:assert/strict';
import {stepEnemy,enemyAttackBox,enemyBlocksShot,defeatEnemy} from '../../app/mariomortille/enemy-behavior.ts';
import {createState,tick} from '../../app/mariomortille/simulation.ts';
const enemy=kind=>({id:kind,kind,x:100,y:140,left:80,right:300,direction:1,defeated:false});
const player={x:200,y:118};
const noInput={direction:0,jump:false,jumpPressed:false,run:false,downPressed:false,powerPressed:false};
const level=(enemies=[])=>({id:'themes',width:600,spawn:{x:220,y:118},tiles:Array.from({length:38},(_,i)=>({x:i*16,y:160,kind:'ground'})),pickups:[],enemies,checkpoint:500,goal:580});
test('plant bite has an explicit warning, finite front range and recovery; never moves',()=>{
 const e=enemy('plant');stepEnemy(e,{x:150,y:118},[]);assert.equal(e.phase,'warning');assert.equal(enemyAttackBox(e),null);
 for(let i=0;i<36;i++)stepEnemy(e,{x:150,y:118},[]);
 assert.deepEqual(enemyAttackBox(e),{x:120,y:142,width:8,height:16});assert.equal(e.x,100);
 for(let i=0;i<12;i++)stepEnemy(e,player,[]);assert.equal(e.phase,'recover');assert.equal(enemyAttackBox(e),null);
});
test('armored beetle protects front only; crab and imp have readable attack phases',()=>{
 const b=enemy('beetle');assert.equal(enemyBlocksShot(b,120),true);assert.equal(enemyBlocksShot(b,90),false);
 const c=enemy('crab');stepEnemy(c,player,[]);assert.equal(c.phaseTicks,42);
 for(let i=0;i<42;i++)stepEnemy(c,player,[]);assert.equal(c.phase,'charge');
 const imp=enemy('imp');stepEnemy(imp,player,[]);for(let i=0;i<30;i++)stepEnemy(imp,player,[]);assert.equal(imp.phase,'jump');assert.equal(imp.vy,-250);
});
test('cat fires only after 45 warning ticks; direction locks and death prevents another shot',()=>{
 const e=enemy('cat'),shots=[];stepEnemy(e,player,[],s=>shots.push(s));
 for(let i=0;i<44;i++)stepEnemy(e,{x:0,y:118},[],s=>shots.push(s));assert.equal(shots.length,0);
 stepEnemy(e,player,[],s=>shots.push(s));assert.deepEqual(shots,[{x:120,y:142,vx:110}]);
 defeatEnemy(e);for(let i=0;i<200;i++)stepEnemy(e,player,[],s=>shots.push(s));assert.equal(shots.length,1);
});
test('enemy projectile hits walls before the player and can be avoided by jumping',()=>{
 const l=level(),s=createState(l);s.player.grounded=true;
 s.tiles.push({x:200,y:144,kind:'brick'});s.enemyProjectiles=[{id:0,x:192,y:142,vx:110,life:150}];
 for(let i=0;i<50;i++)tick(s,l,noInput);assert.equal(s.player.health,3);assert.equal(s.enemyProjectiles.length,0);
 const jump=createState(l);jump.player.y=60;jump.player.vy=-100;
 jump.enemyProjectiles=[{id:0,x:220,y:142,vx:110,life:150}];tick(jump,l,noInput);assert.equal(jump.player.health,3);
 const hit=createState(l);hit.enemyProjectiles=[{id:0,x:220,y:142,vx:110,life:150}];tick(hit,l,noInput);assert.equal(hit.player.health,2);assert.equal(hit.enemyProjectiles.length,0);
});
test('themed simulation including projectiles is deterministic and ranged enemies cannot see through walls',()=>{
 const l=level([enemy('cat')]),a=createState(l),b=createState(l);
 for(let i=0;i<200;i++){tick(a,l,noInput);tick(b,l,noInput);}assert.deepEqual(a,b);
 const cat=enemy('cat');stepEnemy(cat,player,[{x:160,y:144,kind:'brick'}]);assert.notEqual(cat.phase,'warning');
});
test('armored beetle remains vulnerable to a real top stomp and awards score once',()=>{
 const l=level([enemy('beetle')]),s=createState(l);s.player.x=100;s.player.y=99;s.player.vy=100;
 tick(s,l,noInput);assert.equal(s.enemies[0].defeated,true);assert.equal(s.enemies[0].deathTicks,36);assert.equal(s.score,250);
 for(let i=0;i<4;i++)tick(s,l,noInput);assert.equal(s.score,250);
});
